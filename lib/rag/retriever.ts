/**
 * Retriever Service
 * Handles semantic search and context retrieval for RAG
 */

import { generateEmbedding } from './embeddings';
import { searchSimilar, searchMultipleCollections, CollectionName, SearchResult } from './vectorStore';

export interface RetrievalResult {
  query: string;
  results: SearchResult[];
  context: string;
  tokensEstimate: number;
}

export interface RetrievalOptions {
  collections: CollectionName[];
  maxResults: number;
  minScore: number;
  maxTokens: number;
  includeMetadata: boolean;
}

const DEFAULT_OPTIONS: RetrievalOptions = {
  collections: ['references', 'sessions', 'web_research'],
  maxResults: 5,
  minScore: 0.5,
  maxTokens: 2000,
  includeMetadata: true,
};

/**
 * Estimate tokens in text (rough approximation)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Retrieve relevant context for a query
 */
export async function retrieveContext(
  query: string,
  options: Partial<RetrievalOptions> = {},
  embeddingModel: string = 'nomic-embed-text'
): Promise<RetrievalResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query, embeddingModel);

  // Search across specified collections
  const results = searchMultipleCollections(
    opts.collections,
    queryEmbedding.embedding,
    opts.maxResults * 2, // Get more than needed to allow for token limit filtering
    opts.minScore
  );

  // Build context string, respecting token limit
  let context = '';
  let tokensUsed = 0;
  const includedResults: SearchResult[] = [];

  for (const result of results) {
    const resultText = formatResultForContext(result, opts.includeMetadata);
    const resultTokens = estimateTokens(resultText);

    if (tokensUsed + resultTokens > opts.maxTokens) {
      break;
    }

    context += resultText + '\n\n---\n\n';
    tokensUsed += resultTokens;
    includedResults.push(result);

    if (includedResults.length >= opts.maxResults) {
      break;
    }
  }

  return {
    query,
    results: includedResults,
    context: context.trim(),
    tokensEstimate: tokensUsed,
  };
}

/**
 * Format a search result for inclusion in context
 */
function formatResultForContext(result: SearchResult, includeMetadata: boolean): string {
  let formatted = result.content;

  if (includeMetadata) {
    const meta: string[] = [];
    
    if (result.metadata.source) {
      meta.push(`Source: ${result.metadata.source}`);
    }
    if (result.metadata.heading) {
      meta.push(`Section: ${result.metadata.heading}`);
    }
    if (result.metadata.title) {
      meta.push(`Title: ${result.metadata.title}`);
    }
    if (result.metadata.url) {
      meta.push(`URL: ${result.metadata.url}`);
    }

    if (meta.length > 0) {
      formatted = `[${meta.join(' | ')}]\n${formatted}`;
    }
  }

  return formatted;
}

/**
 * Retrieve context from a specific collection only
 */
export async function retrieveFromCollection(
  query: string,
  collection: CollectionName,
  maxResults: number = 5,
  embeddingModel: string = 'nomic-embed-text'
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query, embeddingModel);
  return searchSimilar(collection, queryEmbedding.embedding, maxResults);
}

/**
 * Build a RAG-enhanced prompt
 */
export async function buildRAGPrompt(
  userMessage: string,
  systemPrompt: string,
  documentContent: string,
  options: Partial<RetrievalOptions> = {}
): Promise<{
  enhancedSystemPrompt: string;
  retrievalInfo: RetrievalResult | null;
}> {
  // Try to retrieve relevant context
  let retrievalInfo: RetrievalResult | null = null;

  try {
    retrievalInfo = await retrieveContext(userMessage, options);
  } catch (error) {
    console.warn('RAG retrieval failed, continuing without context:', error);
  }

  // Build enhanced system prompt
  let enhancedSystemPrompt = systemPrompt;

  if (retrievalInfo && retrievalInfo.results.length > 0) {
    enhancedSystemPrompt += `

## Retrieved Context from Knowledge Base

The following information was retrieved from the user's knowledge base and may be relevant to their request:

${retrievalInfo.context}

## Instructions for Using Retrieved Context

- Use this context to inform your response when relevant
- Cite sources when referencing specific information (e.g., "According to [source]...")
- If the context contradicts information in the document, point this out
- Don't make up citations - only reference what's provided above
`;
  }

  return {
    enhancedSystemPrompt,
    retrievalInfo,
  };
}

/**
 * Find similar documents to a given text
 */
export async function findSimilarDocuments(
  text: string,
  collection: CollectionName = 'references',
  limit: number = 5,
  embeddingModel: string = 'nomic-embed-text'
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(text, embeddingModel);
  return searchSimilar(collection, embedding.embedding, limit);
}

/**
 * Check if a claim might have supporting evidence in the knowledge base
 */
export async function findSupportingEvidence(
  claim: string,
  embeddingModel: string = 'nomic-embed-text'
): Promise<{
  hasEvidence: boolean;
  confidence: number;
  sources: SearchResult[];
}> {
  const results = await retrieveContext(claim, {
    collections: ['references', 'web_research'],
    maxResults: 3,
    minScore: 0.7,
  }, embeddingModel);

  return {
    hasEvidence: results.results.length > 0,
    confidence: results.results.length > 0 ? results.results[0].score : 0,
    sources: results.results,
  };
}





