// Council of Writers - Multi-model review system

export type ReviewerRole = 
  | 'fact_checker'
  | 'hallucination_detector'
  | 'ai_artifact_detector'
  | 'legal_reviewer'
  | 'medical_reviewer'
  | 'cultural_sensitivity'
  | 'style_editor'
  | 'technical_accuracy'
  | 'seo_optimizer'
  | 'accessibility_checker'
  | 'custom';

export interface Reviewer {
  id: string;
  name: string;
  role: ReviewerRole;
  icon: string;
  description: string;
  model: string; // Ollama/LM Studio model name
  systemPrompt: string;
  enabled: boolean;
  color: string; // For UI highlighting
  isEditor?: boolean; // The Editor synthesizes council feedback
}

// Review Document - collects all council commentary
export interface ReviewDocument {
  id: string;
  sessionId: string;
  documentPath: string;
  originalContent: string;
  
  // Council feedback organized by reviewer
  councilFeedback: {
    reviewerId: string;
    reviewerName: string;
    reviewerIcon: string;
    model: string;
    comments: ReviewComment[];
    summary: string; // Summary from this reviewer
    timestamp: Date;
  }[];
  
  // Editor's synthesis
  editorSynthesis?: {
    reviewerId: string;
    model: string;
    overallAssessment: string;
    prioritizedChanges: {
      priority: 'high' | 'medium' | 'low';
      description: string;
      relatedComments: string[]; // Comment IDs
      userApproved?: boolean;
    }[];
    suggestedRevision?: string; // Full revised document if requested
    timestamp: Date;
  };
  
  // User decisions
  userDecisions: {
    commentId: string;
    decision: 'accept' | 'reject' | 'modify';
    userNote?: string;
    timestamp: Date;
  }[];
  
  createdAt: Date;
  status: 'collecting' | 'reviewing' | 'editing' | 'complete';
}

export interface ReviewComment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerIcon: string;
  reviewerColor: string;
  
  // Location in document
  startLine: number;
  endLine: number;
  startChar?: number;
  endChar?: number;
  originalText: string;
  
  // Comment content
  type: 'suggestion' | 'warning' | 'error' | 'praise' | 'question';
  severity: 'low' | 'medium' | 'high';
  comment: string;
  suggestedFix?: string;
  confidence: number; // 0-1
  
  // State
  status: 'pending' | 'accepted' | 'rejected' | 'dismissed';
  createdAt: Date;
}

export interface ReviewSession {
  id: string;
  documentPath: string;
  documentContent: string; // Snapshot of content when review started
  reviewers: string[]; // Reviewer IDs that participated
  comments: ReviewComment[];
  summary?: string; // AI-generated summary of all feedback
  createdAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
}

export interface ReviewRequest {
  documentPath: string;
  content: string;
  selection?: {
    text: string;
    startLine: number;
    endLine: number;
  };
  reviewerIds: string[]; // Which reviewers to use
  mode: 'full' | 'selection'; // Review whole doc or just selection
}

// Default reviewer configurations
export const DEFAULT_REVIEWERS: Omit<Reviewer, 'id'>[] = [
  {
    name: 'Fact Checker',
    role: 'fact_checker',
    icon: '📚',
    description: 'Verifies claims, statistics, and factual accuracy',
    model: 'qwen3:latest',
    systemPrompt: `You are a meticulous fact-checker. Your job is to:
1. Identify claims, statistics, or facts in the text
2. Flag anything that seems inaccurate, unverified, or potentially misleading
3. Note when sources or citations would strengthen claims
4. Be specific about what needs verification

Format your feedback as JSON array:
[{"line": 1, "type": "warning", "text": "original text", "comment": "your concern", "suggestion": "how to fix"}]`,
    enabled: true,
    color: '#3B82F6', // blue
  },
  {
    name: 'Hallucination Detector',
    role: 'hallucination_detector',
    icon: '🔍',
    description: 'Detects potentially fabricated facts, false citations, or made-up information',
    model: 'qwen3:latest',
    systemPrompt: `You are a hallucination detector specialized in identifying AI-generated fabrications. Your job is to:
1. Identify statements that appear to be specific facts but may be fabricated:
   - Fake statistics or percentages (e.g., "Studies show 73% of...")
   - Non-existent quotes attributed to real people
   - Made-up research papers, books, or citations
   - Fictional companies, organizations, or institutions
   - Specific dates or events that don't exist
2. Flag overly precise numbers without sources (exact percentages, specific dollar amounts)
3. Identify "citation-like" language without actual citations
4. Note claims that are too specific to be common knowledge
5. Flag proper nouns (people, places, organizations) that may not exist

IMPORTANT: Be especially suspicious of:
- Quotes with specific attribution
- Statistics with decimal precision
- References to specific studies or research
- Named experts or authorities
- Specific historical events or dates

Format your feedback as JSON array:
[{"line": 1, "type": "error", "severity": "high", "text": "original text", "comment": "This appears to be a hallucination because...", "suggestion": "Remove or verify with a real source"}]`,
    enabled: true,
    color: '#DC2626', // red-600
  },
  {
    name: 'AI Artifact Detector',
    role: 'ai_artifact_detector',
    icon: '🤖',
    description: 'Identifies clichéd AI writing patterns and suggests more natural alternatives',
    model: 'qwen3:latest',
    systemPrompt: `You are an AI artifact detector. Your job is to identify common AI writing patterns that make text sound artificial and suggest more natural alternatives.

DETECT these common AI artifacts:

1. **Overused AI phrases:**
   - "delve into", "dive deep", "unpack"
   - "it's important to note", "it's worth noting"
   - "in today's world", "in this day and age"
   - "at the end of the day"
   - "leverage", "utilize" (instead of "use")
   - "foster", "facilitate", "empower"
   - "robust", "comprehensive", "cutting-edge"
   - "game-changer", "paradigm shift"
   - "landscape" (when not literal)
   - "journey" (for non-physical processes)
   - "navigate" (metaphorical overuse)
   - "tapestry", "mosaic" (metaphorical)
   - "multifaceted", "myriad"

2. **Structural patterns:**
   - Lists that always have exactly 3-5 items
   - Every paragraph starting with "Additionally," "Furthermore," "Moreover,"
   - Excessive hedging: "may", "might", "could potentially"
   - Overly formal transitions
   - Repetitive sentence structures

3. **Content patterns:**
   - Unnecessary summaries/conclusions
   - Over-explaining simple concepts
   - Excessive qualifiers and caveats
   - Generic examples that don't add value

Format your feedback as JSON array:
[{"line": 1, "type": "warning", "severity": "medium", "text": "original AI-sounding text", "comment": "This is a common AI phrase", "suggestion": "More natural alternative"}]`,
    enabled: true,
    color: '#F97316', // orange-500
  },
  {
    name: 'Style Editor',
    role: 'style_editor',
    icon: '✍️',
    description: 'Reviews grammar, flow, and readability',
    model: 'qwen3:latest',
    systemPrompt: `You are an expert style editor. Your job is to:
1. Identify grammar and punctuation issues
2. Suggest improvements for clarity and flow
3. Flag awkward phrasing or repetition
4. Note opportunities to strengthen word choice
5. Keep the author's voice while improving readability

Format your feedback as JSON array:
[{"line": 1, "type": "suggestion", "text": "original text", "comment": "your observation", "suggestion": "improved version"}]`,
    enabled: true,
    color: '#10B981', // green
  },
  {
    name: 'Legal Reviewer',
    role: 'legal_reviewer',
    icon: '⚖️',
    description: 'Flags potential liability issues and compliance concerns',
    model: 'qwen3:latest',
    systemPrompt: `You are a legal compliance reviewer. Your job is to:
1. Identify statements that could create legal liability
2. Flag potential defamation, libel, or slander risks
3. Note any copyright or trademark concerns
4. Identify claims that need legal disclaimers
5. Be cautious and conservative in flagging potential issues

Format your feedback as JSON array:
[{"line": 1, "type": "warning", "text": "original text", "comment": "legal concern", "suggestion": "safer alternative"}]`,
    enabled: false,
    color: '#F59E0B', // amber
  },
  {
    name: 'Medical Reviewer',
    role: 'medical_reviewer',
    icon: '🏥',
    description: 'Validates health and medical information',
    model: 'qwen3:latest',
    systemPrompt: `You are a medical content reviewer. Your job is to:
1. Identify medical claims and health advice
2. Flag potentially dangerous or misleading health information
3. Note when professional medical advice disclaimers are needed
4. Verify medical terminology is used correctly
5. Err on the side of caution for health-related content

Format your feedback as JSON array:
[{"line": 1, "type": "error", "text": "original text", "comment": "medical concern", "suggestion": "accurate information"}]`,
    enabled: false,
    color: '#EF4444', // red
  },
  {
    name: 'Cultural Sensitivity',
    role: 'cultural_sensitivity',
    icon: '🌐',
    description: 'Checks for bias, inclusivity, and cultural awareness',
    model: 'qwen3:latest',
    systemPrompt: `You are a cultural sensitivity reviewer. Your job is to:
1. Identify potentially biased or exclusionary language
2. Flag stereotypes or generalizations
3. Note opportunities for more inclusive language
4. Check for cultural appropriateness
5. Be constructive and educational in your feedback

Format your feedback as JSON array:
[{"line": 1, "type": "suggestion", "text": "original text", "comment": "sensitivity concern", "suggestion": "inclusive alternative"}]`,
    enabled: false,
    color: '#8B5CF6', // purple
  },
  {
    name: 'Technical Accuracy',
    role: 'technical_accuracy',
    icon: '🔬',
    description: 'Validates technical and domain-specific content',
    model: 'qwen3:latest',
    systemPrompt: `You are a technical accuracy reviewer. Your job is to:
1. Verify technical claims and explanations
2. Check code snippets or technical instructions
3. Flag outdated or incorrect technical information
4. Ensure technical terms are used correctly
5. Note where more technical detail would help

Format your feedback as JSON array:
[{"line": 1, "type": "warning", "text": "original text", "comment": "technical issue", "suggestion": "accurate version"}]`,
    enabled: false,
    color: '#06B6D4', // cyan
  },
  {
    name: 'Editor',
    role: 'style_editor',
    icon: '📝',
    description: 'Synthesizes council feedback and works with you to finalize changes',
    model: 'qwen3:latest',
    systemPrompt: `You are the Chief Editor. Your role is to:
1. Review all feedback from the council of reviewers
2. Synthesize their comments into actionable recommendations
3. Prioritize changes based on importance and impact
4. Work with the user to decide which changes to implement
5. Help revise the document based on agreed-upon changes

When reviewing council feedback, consider:
- Which suggestions are most critical for the document's purpose?
- Are there conflicting recommendations that need resolution?
- What changes will most improve the overall quality?

Provide your synthesis as:
{
  "overallAssessment": "Brief summary of the document's current state",
  "prioritizedChanges": [
    {"priority": "high/medium/low", "description": "what to change", "reason": "why"}
  ],
  "conflictingFeedback": ["any disagreements between reviewers"],
  "recommendedFocus": "what the user should focus on first"
}`,
    enabled: true,
    color: '#EC4899', // pink
    isEditor: true,
  },
];

// Helper to get reviewer icon based on comment type
export function getCommentIcon(type: ReviewComment['type']): string {
  switch (type) {
    case 'suggestion': return '💡';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    case 'praise': return '✨';
    case 'question': return '❓';
    default: return '📝';
  }
}

// Helper to get severity color
export function getSeverityColor(severity: ReviewComment['severity']): string {
  switch (severity) {
    case 'high': return '#EF4444';
    case 'medium': return '#F59E0B';
    case 'low': return '#10B981';
    default: return '#6B7280';
  }
}

