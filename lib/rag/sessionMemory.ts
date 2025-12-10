/**
 * Session Memory Service
 * Handles conversation persistence and retrieval across sessions
 */

import { generateEmbedding } from './embeddings';
import { addDocument, searchSimilar, getAllDocuments, deleteDocument, deleteBySource, CollectionName } from './vectorStore';

export interface ConversationSummary {
  id: string;
  documentPath: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  timestamp: string;
}

export interface SessionMemory {
  documentPath: string;
  summaries: ConversationSummary[];
  preferences: Record<string, string>;
  lastAccessed: string;
}

const MEMORY_COLLECTION: CollectionName = 'sessions';
const PREFERENCES_COLLECTION: CollectionName = 'preferences';

/**
 * Generate a summary of a conversation using the LLM
 */
export async function summarizeConversation(
  messages: Array<{ role: string; content: string }>,
  ollamaUrl: string = 'http://localhost:11434',
  model: string = 'qwen3:latest'
): Promise<{
  summary: string;
  keyPoints: string[];
  decisions: string[];
}> {
  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');

  const prompt = `Analyze this conversation and provide:
1. A brief summary (2-3 sentences)
2. Key points discussed (bullet points)
3. Any decisions or agreements made

Conversation:
${conversationText}

Respond in JSON format:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "decisions": ["...", "..."]
}`;

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.response);

    return {
      summary: result.summary || 'No summary available',
      keyPoints: result.keyPoints || [],
      decisions: result.decisions || [],
    };
  } catch (error) {
    console.error('Failed to summarize conversation:', error);
    
    // Fallback: create a simple summary
    const lastMessages = messages.slice(-4);
    return {
      summary: `Conversation with ${messages.length} messages`,
      keyPoints: lastMessages
        .filter(m => m.role === 'user')
        .map(m => m.content.slice(0, 100)),
      decisions: [],
    };
  }
}

/**
 * Save a conversation summary to memory
 */
export async function saveConversationMemory(
  documentPath: string,
  summary: string,
  keyPoints: string[],
  decisions: string[],
  embeddingModel: string = 'nomic-embed-text'
): Promise<ConversationSummary> {
  const id = `session_${documentPath}_${Date.now()}`;
  const timestamp = new Date().toISOString();

  // Create content for embedding
  const content = [
    `Document: ${documentPath}`,
    `Summary: ${summary}`,
    `Key Points: ${keyPoints.join('; ')}`,
    `Decisions: ${decisions.join('; ')}`,
  ].join('\n');

  // Generate embedding
  const embedding = await generateEmbedding(content, embeddingModel);

  // Store in vector database
  addDocument(MEMORY_COLLECTION, id, content, embedding.embedding, {
    documentPath,
    summary,
    keyPoints,
    decisions,
    timestamp,
    type: 'conversation_summary',
  });

  return {
    id,
    documentPath,
    summary,
    keyPoints,
    decisions,
    timestamp,
  };
}

/**
 * Retrieve relevant memories for a document and query
 */
export async function retrieveRelevantMemories(
  documentPath: string,
  query: string,
  maxResults: number = 3,
  embeddingModel: string = 'nomic-embed-text'
): Promise<ConversationSummary[]> {
  // Combine document path and query for better retrieval
  const searchQuery = `Document: ${documentPath}\nQuery: ${query}`;
  
  const embedding = await generateEmbedding(searchQuery, embeddingModel);
  const results = searchSimilar(MEMORY_COLLECTION, embedding.embedding, maxResults * 2, 0.4);

  // Filter to only include results for this document or highly relevant ones
  const filtered = results.filter(r => 
    r.metadata.documentPath === documentPath || r.score > 0.7
  );

  return filtered.slice(0, maxResults).map(r => ({
    id: r.id,
    documentPath: r.metadata.documentPath,
    summary: r.metadata.summary,
    keyPoints: r.metadata.keyPoints || [],
    decisions: r.metadata.decisions || [],
    timestamp: r.metadata.timestamp,
  }));
}

/**
 * Get all memories for a specific document
 */
export function getDocumentMemories(documentPath: string): ConversationSummary[] {
  const allDocs = getAllDocuments(MEMORY_COLLECTION);
  
  return allDocs
    .filter(d => d.metadata.documentPath === documentPath)
    .map(d => ({
      id: d.id,
      documentPath: d.metadata.documentPath,
      summary: d.metadata.summary,
      keyPoints: d.metadata.keyPoints || [],
      decisions: d.metadata.decisions || [],
      timestamp: d.metadata.timestamp,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Save a user preference
 */
export async function savePreference(
  key: string,
  value: string,
  documentPath?: string,
  embeddingModel: string = 'nomic-embed-text'
): Promise<void> {
  const id = documentPath ? `pref_${documentPath}_${key}` : `pref_global_${key}`;
  const content = `Preference: ${key} = ${value}${documentPath ? ` (for ${documentPath})` : ''}`;

  const embedding = await generateEmbedding(content, embeddingModel);

  addDocument(PREFERENCES_COLLECTION, id, content, embedding.embedding, {
    key,
    value,
    documentPath,
    type: 'preference',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Retrieve relevant preferences
 */
export async function retrievePreferences(
  context: string,
  documentPath?: string,
  embeddingModel: string = 'nomic-embed-text'
): Promise<Array<{ key: string; value: string }>> {
  const searchQuery = documentPath 
    ? `Preferences for document: ${documentPath}\nContext: ${context}`
    : `General preferences\nContext: ${context}`;

  const embedding = await generateEmbedding(searchQuery, embeddingModel);
  const results = searchSimilar(PREFERENCES_COLLECTION, embedding.embedding, 5, 0.4);

  // Filter by document if specified
  const filtered = documentPath
    ? results.filter(r => !r.metadata.documentPath || r.metadata.documentPath === documentPath)
    : results;

  return filtered.map(r => ({
    key: r.metadata.key,
    value: r.metadata.value,
  }));
}

/**
 * Delete a memory
 */
export function deleteMemory(id: string): boolean {
  return deleteDocument(MEMORY_COLLECTION, id);
}

/**
 * Clear all memories for a document
 */
export function clearDocumentMemories(documentPath: string): number {
  return deleteBySource(MEMORY_COLLECTION, documentPath);
}

/**
 * Build memory context for chat
 */
export async function buildMemoryContext(
  documentPath: string,
  currentQuery: string,
  embeddingModel: string = 'nomic-embed-text'
): Promise<string> {
  // Retrieve relevant past conversations
  const memories = await retrieveRelevantMemories(documentPath, currentQuery, 3, embeddingModel);
  
  // Retrieve relevant preferences
  const preferences = await retrievePreferences(currentQuery, documentPath, embeddingModel);

  if (memories.length === 0 && preferences.length === 0) {
    return '';
  }

  let context = '## Session Memory\n\n';

  if (preferences.length > 0) {
    context += '### User Preferences\n';
    for (const pref of preferences) {
      context += `- ${pref.key}: ${pref.value}\n`;
    }
    context += '\n';
  }

  if (memories.length > 0) {
    context += '### Previous Conversations\n';
    for (const memory of memories) {
      context += `**${new Date(memory.timestamp).toLocaleDateString()}**: ${memory.summary}\n`;
      if (memory.decisions.length > 0) {
        context += `  - Decisions: ${memory.decisions.join(', ')}\n`;
      }
    }
    context += '\n';
  }

  return context;
}

/**
 * Auto-save session when conversation reaches a certain length
 */
export async function autoSaveSession(
  documentPath: string,
  messages: Array<{ role: string; content: string }>,
  ollamaUrl: string,
  model: string,
  embeddingModel: string = 'nomic-embed-text',
  minMessages: number = 6
): Promise<ConversationSummary | null> {
  if (messages.length < minMessages) {
    return null;
  }

  // Only save if we have substantial content
  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length < 3) {
    return null;
  }

  try {
    const { summary, keyPoints, decisions } = await summarizeConversation(
      messages,
      ollamaUrl,
      model
    );

    return await saveConversationMemory(
      documentPath,
      summary,
      keyPoints,
      decisions,
      embeddingModel
    );
  } catch (error) {
    console.error('Auto-save session failed:', error);
    return null;
  }
}














