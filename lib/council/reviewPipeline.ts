/**
 * Review Pipeline - Orchestrates the Council of Writers review process
 * 
 * This module handles:
 * 1. Sending document content to each enabled reviewer model
 * 2. Parsing their feedback into structured comments
 * 3. Coordinating sequential or parallel reviews
 */

import { Reviewer, ReviewComment } from '@/types/council';
import { useCouncilStore } from '@/lib/store/useCouncilStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';

const OLLAMA_URL = 'http://localhost:11434';

interface ParsedFeedback {
  line: number;
  type: 'suggestion' | 'warning' | 'error' | 'praise' | 'question';
  text: string;
  comment: string;
  suggestion?: string;
}

/**
 * Parse the reviewer's response into structured feedback
 */
function parseFeedback(response: string, reviewer: Reviewer): ParsedFeedback[] {
  const feedback: ParsedFeedback[] = [];
  
  // Try to extract JSON array from response
  try {
    // Look for JSON array in the response
    const jsonMatch = response.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          line: item.line || 1,
          type: item.type || 'suggestion',
          text: item.text || '',
          comment: item.comment || '',
          suggestion: item.suggestion,
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to parse JSON feedback from reviewer:', reviewer.name, e);
  }
  
  // Fallback: Try to extract line-based feedback from text
  const linePatterns = [
    /(?:line|Line)\s*(\d+):\s*(.+)/g,
    /(\d+)\.\s*(.+)/g,
    /•\s*(?:Line\s*)?(\d+)?:?\s*(.+)/g,
  ];
  
  for (const pattern of linePatterns) {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      const lineNum = match[1] ? parseInt(match[1], 10) : 1;
      const content = match[2].trim();
      
      if (content.length > 10) {
        feedback.push({
          line: lineNum,
          type: inferCommentType(content),
          text: '',
          comment: content,
        });
      }
    }
    
    if (feedback.length > 0) break;
  }
  
  // If no structured feedback found, create a general comment
  if (feedback.length === 0 && response.trim().length > 20) {
    feedback.push({
      line: 1,
      type: 'suggestion',
      text: '',
      comment: response.trim().slice(0, 500), // Limit length
    });
  }
  
  return feedback;
}

/**
 * Infer comment type from content
 */
function inferCommentType(content: string): ParsedFeedback['type'] {
  const lower = content.toLowerCase();
  
  if (lower.includes('error') || lower.includes('incorrect') || lower.includes('wrong')) {
    return 'error';
  }
  if (lower.includes('warning') || lower.includes('caution') || lower.includes('careful')) {
    return 'warning';
  }
  if (lower.includes('good') || lower.includes('great') || lower.includes('excellent') || lower.includes('well')) {
    return 'praise';
  }
  if (lower.includes('?') || lower.includes('unclear') || lower.includes('clarify')) {
    return 'question';
  }
  return 'suggestion';
}

/**
 * Infer severity from feedback type and content
 */
function inferSeverity(type: string, content: string): 'low' | 'medium' | 'high' {
  if (type === 'error') return 'high';
  if (type === 'warning') return 'medium';
  if (type === 'praise') return 'low';
  
  const lower = content.toLowerCase();
  if (lower.includes('critical') || lower.includes('must') || lower.includes('immediately')) {
    return 'high';
  }
  if (lower.includes('should') || lower.includes('consider') || lower.includes('might')) {
    return 'medium';
  }
  return 'low';
}

/**
 * Get the text at a specific line from the document
 */
function getTextAtLine(content: string, line: number): string {
  const lines = content.split('\n');
  const index = Math.max(0, Math.min(line - 1, lines.length - 1));
  return lines[index] || '';
}

/**
 * Build the prompt for a reviewer
 */
function buildReviewPrompt(reviewer: Reviewer, content: string, selection?: { text: string; startLine: number; endLine: number }): string {
  const target = selection
    ? `Selected text (lines ${selection.startLine}-${selection.endLine}):\n\`\`\`\n${selection.text}\n\`\`\``
    : `Full document:\n\`\`\`\n${content}\n\`\`\``;
  
  return `${reviewer.systemPrompt}

Please review the following ${selection ? 'selected text' : 'document'} and provide your feedback.

${target}

Remember to format your feedback as a JSON array with objects containing: line, type, text, comment, and optionally suggestion.
Only report actual issues or opportunities for improvement. Be specific and constructive.`;
}

/**
 * Run a single reviewer on the document
 */
export async function runReviewer(
  reviewer: Reviewer,
  content: string,
  selection?: { text: string; startLine: number; endLine: number },
  onProgress?: (status: string) => void
): Promise<ReviewComment[]> {
  const { setReviewProgress, addComment } = useCouncilStore.getState();
  const { temperature, topP, topK } = useSettingsStore.getState();
  
  setReviewProgress(reviewer.id, 'in_progress');
  onProgress?.(`${reviewer.icon} ${reviewer.name} is reviewing...`);
  
  try {
    const prompt = buildReviewPrompt(reviewer, content, selection);
    
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: reviewer.model,
        prompt,
        stream: false,
        options: {
          temperature: Math.max(0.1, temperature - 0.2), // Slightly lower temp for analysis
          top_p: topP,
          top_k: topK,
          num_predict: 2048, // Limit response length
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Reviewer ${reviewer.name} failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const feedback = parseFeedback(data.response || '', reviewer);
    
    // Convert feedback to ReviewComments
    const comments: ReviewComment[] = feedback.map((f) => {
      const comment: ReviewComment = {
        id: '', // Will be set by addComment
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
        reviewerIcon: reviewer.icon,
        reviewerColor: reviewer.color,
        startLine: f.line,
        endLine: f.line,
        originalText: f.text || getTextAtLine(content, f.line),
        type: f.type,
        severity: inferSeverity(f.type, f.comment),
        comment: f.comment,
        suggestedFix: f.suggestion,
        confidence: 0.8, // Default confidence
        status: 'pending',
        createdAt: new Date(),
      };
      
      // Add to store
      addComment(comment);
      
      return comment;
    });
    
    setReviewProgress(reviewer.id, 'complete');
    onProgress?.(`${reviewer.icon} ${reviewer.name} complete - ${comments.length} comments`);
    
    return comments;
  } catch (error) {
    console.error(`Reviewer ${reviewer.name} error:`, error);
    setReviewProgress(reviewer.id, 'error');
    onProgress?.(`${reviewer.icon} ${reviewer.name} failed`);
    throw error;
  }
}

/**
 * Run all enabled reviewers sequentially
 */
export async function runReviewPipeline(
  content: string,
  reviewerIds: string[],
  selection?: { text: string; startLine: number; endLine: number },
  onProgress?: (status: string) => void
): Promise<void> {
  const { reviewers, completeReview } = useCouncilStore.getState();
  
  const enabledReviewers = reviewers.filter((r) => reviewerIds.includes(r.id));
  
  if (enabledReviewers.length === 0) {
    console.warn('No reviewers enabled');
    return;
  }
  
  onProgress?.(`Starting review with ${enabledReviewers.length} reviewer(s)...`);
  
  const allComments: ReviewComment[] = [];
  const errors: string[] = [];
  
  // Run reviewers sequentially to avoid overloading
  for (const reviewer of enabledReviewers) {
    try {
      const comments = await runReviewer(reviewer, content, selection, onProgress);
      allComments.push(...comments);
    } catch (error) {
      errors.push(`${reviewer.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Generate summary
  const summary = generateReviewSummary(allComments, enabledReviewers.length, errors);
  
  // Complete the review session
  completeReview(summary);
  
  onProgress?.('Review complete!');
}

/**
 * Generate a summary of all review comments
 */
function generateReviewSummary(
  comments: ReviewComment[],
  reviewerCount: number,
  errors: string[]
): string {
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  
  comments.forEach((c) => {
    byType[c.type] = (byType[c.type] || 0) + 1;
    bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
  });
  
  let summary = `${reviewerCount} reviewer(s) found ${comments.length} item(s).`;
  
  if (bySeverity.high) {
    summary += ` ${bySeverity.high} high priority.`;
  }
  if (bySeverity.medium) {
    summary += ` ${bySeverity.medium} medium priority.`;
  }
  
  if (byType.error) {
    summary += ` ${byType.error} error(s).`;
  }
  if (byType.warning) {
    summary += ` ${byType.warning} warning(s).`;
  }
  if (byType.suggestion) {
    summary += ` ${byType.suggestion} suggestion(s).`;
  }
  if (byType.praise) {
    summary += ` ${byType.praise} praise.`;
  }
  
  if (errors.length > 0) {
    summary += ` (${errors.length} reviewer(s) had errors)`;
  }
  
  return summary;
}

/**
 * Run reviewers in parallel (faster but more resource intensive)
 */
export async function runReviewPipelineParallel(
  content: string,
  reviewerIds: string[],
  selection?: { text: string; startLine: number; endLine: number },
  onProgress?: (status: string) => void
): Promise<void> {
  const { reviewers, completeReview } = useCouncilStore.getState();
  
  const enabledReviewers = reviewers.filter((r) => reviewerIds.includes(r.id));
  
  if (enabledReviewers.length === 0) {
    console.warn('No reviewers enabled');
    return;
  }
  
  onProgress?.(`Starting parallel review with ${enabledReviewers.length} reviewer(s)...`);
  
  const results = await Promise.allSettled(
    enabledReviewers.map((reviewer) =>
      runReviewer(reviewer, content, selection, onProgress)
    )
  );
  
  const allComments: ReviewComment[] = [];
  const errors: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allComments.push(...result.value);
    } else {
      errors.push(`${enabledReviewers[index].name}: ${result.reason}`);
    }
  });
  
  const summary = generateReviewSummary(allComments, enabledReviewers.length, errors);
  completeReview(summary);
  
  onProgress?.('Review complete!');
}

/**
 * Run the full council review pipeline with Editor synthesis
 */
export async function runFullCouncilReview(
  content: string,
  documentPath: string,
  reviewerIds: string[],
  selection?: { text: string; startLine: number; endLine: number },
  onProgress?: (status: string) => void
): Promise<void> {
  const { 
    reviewers, 
    getEditorReviewer,
    getCouncilReviewers,
    initReviewDocument,
    addCouncilFeedback,
    setEditorSynthesis,
    setReviewPhase,
    currentSession,
  } = useCouncilStore.getState();
  
  // Get council members (non-editor reviewers)
  const councilReviewers = reviewers.filter(
    (r) => reviewerIds.includes(r.id) && !r.isEditor
  );
  
  const editor = getEditorReviewer();
  
  if (councilReviewers.length === 0) {
    console.warn('No council reviewers enabled');
    return;
  }
  
  // Initialize review document
  const sessionId = currentSession?.id || 'manual';
  initReviewDocument(sessionId, documentPath, content);
  
  onProgress?.(`📋 Council convened with ${councilReviewers.length} reviewer(s)...`);
  
  // Phase 1: Council Reviews
  setReviewPhase('council_reviewing');
  
  for (const reviewer of councilReviewers) {
    try {
      onProgress?.(`${reviewer.icon} ${reviewer.name} is reviewing...`);
      const comments = await runReviewer(reviewer, content, selection, onProgress);
      
      // Create summary for this reviewer
      const reviewerSummary = `${reviewer.name} found ${comments.length} item(s): ${
        comments.filter(c => c.type === 'error').length
      } errors, ${
        comments.filter(c => c.type === 'warning').length
      } warnings, ${
        comments.filter(c => c.type === 'suggestion').length
      } suggestions.`;
      
      addCouncilFeedback(reviewer.id, comments, reviewerSummary);
      onProgress?.(`${reviewer.icon} ${reviewer.name} complete`);
    } catch (error) {
      console.error(`Council reviewer ${reviewer.name} failed:`, error);
      onProgress?.(`${reviewer.icon} ${reviewer.name} failed`);
    }
  }
  
  // Phase 2: Editor Synthesis
  if (editor) {
    setReviewPhase('editor_synthesizing');
    onProgress?.(`${editor.icon} ${editor.name} is synthesizing feedback...`);
    
    try {
      const synthesis = await runEditorSynthesis(editor, content, documentPath);
      setEditorSynthesis(synthesis);
      onProgress?.(`${editor.icon} Editor synthesis complete`);
    } catch (error) {
      console.error('Editor synthesis failed:', error);
      onProgress?.(`${editor.icon} Editor synthesis failed`);
    }
  } else {
    onProgress?.('⚠️ No Editor configured - skipping synthesis');
  }
  
  // Phase 3: User Decision (handled in UI)
  setReviewPhase('user_deciding');
  onProgress?.('✅ Ready for your review!');
}

/**
 * Run the Editor to synthesize council feedback
 */
async function runEditorSynthesis(
  editor: Reviewer,
  originalContent: string,
  documentPath: string
): Promise<NonNullable<import('@/types/council').ReviewDocument['editorSynthesis']>> {
  const { currentReviewDocument } = useCouncilStore.getState();
  const { temperature, topP, topK } = useSettingsStore.getState();
  
  if (!currentReviewDocument) {
    throw new Error('No review document found');
  }
  
  // Build prompt with all council feedback
  const feedbackSummary = currentReviewDocument.councilFeedback
    .map((f) => {
      const commentsList = f.comments
        .map((c) => `  - Line ${c.startLine}: [${c.type}] ${c.comment}${c.suggestedFix ? ` → "${c.suggestedFix}"` : ''}`)
        .join('\n');
      return `### ${f.reviewerIcon} ${f.reviewerName} (${f.model}):\n${f.summary}\n${commentsList}`;
    })
    .join('\n\n');
  
  const prompt = `${editor.systemPrompt}

## Document Being Reviewed
Path: ${documentPath}

\`\`\`
${originalContent.slice(0, 3000)}${originalContent.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

## Council Feedback
${feedbackSummary}

## Your Task
As the Editor, synthesize all council feedback and provide:
1. An overall assessment of the document
2. Prioritized list of recommended changes
3. Any conflicting feedback that needs the user's decision
4. What the user should focus on first

Respond in JSON format:
{
  "overallAssessment": "Brief summary of the document's current state and quality",
  "prioritizedChanges": [
    {"priority": "high", "description": "what to change", "reason": "why this is important"},
    {"priority": "medium", "description": "...", "reason": "..."},
    {"priority": "low", "description": "...", "reason": "..."}
  ],
  "conflictingFeedback": ["any disagreements between reviewers that need user input"],
  "recommendedFocus": "what the user should work on first"
}`;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: editor.model,
      prompt,
      stream: false,
      options: {
        temperature: Math.max(0.1, temperature - 0.1),
        top_p: topP,
        top_k: topK,
        num_predict: 2048,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Editor synthesis failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  const responseText = data.response || '';
  
  // Parse the Editor's response
  let synthesis;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      synthesis = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Failed to parse Editor JSON response');
  }
  
  // Build the synthesis object
  return {
    reviewerId: editor.id,
    model: editor.model,
    overallAssessment: synthesis?.overallAssessment || responseText.slice(0, 500),
    prioritizedChanges: (synthesis?.prioritizedChanges || []).map((c: { priority?: string; description?: string; relatedComments?: string[] }) => ({
      priority: (c.priority as 'high' | 'medium' | 'low') || 'medium',
      description: c.description || '',
      relatedComments: c.relatedComments || [],
    })),
    timestamp: new Date(),
  };
}

