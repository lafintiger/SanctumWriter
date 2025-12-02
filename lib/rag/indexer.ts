/**
 * Document Indexer
 * Handles document ingestion, chunking, and embedding storage
 */

import { generateEmbedding, generateEmbeddings } from './embeddings';
import { chunkMarkdown, chunkPlainText, Chunk } from './chunker';
import { addDocuments, deleteBySource, CollectionName, getCollectionStats } from './vectorStore';

export interface IndexingResult {
  source: string;
  chunksCreated: number;
  embeddingsGenerated: number;
  success: boolean;
  error?: string;
}

export interface IndexingProgress {
  stage: 'chunking' | 'embedding' | 'storing' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

/**
 * Index a markdown document
 */
export async function indexMarkdownDocument(
  content: string,
  source: string,
  collection: CollectionName = 'references',
  embeddingModel: string = 'nomic-embed-text',
  onProgress?: (progress: IndexingProgress) => void
): Promise<IndexingResult> {
  try {
    // Step 1: Chunk the document
    onProgress?.({
      stage: 'chunking',
      current: 0,
      total: 1,
      message: 'Splitting document into chunks...',
    });

    const chunks = chunkMarkdown(content, source);
    
    if (chunks.length === 0) {
      return {
        source,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        success: true,
      };
    }

    onProgress?.({
      stage: 'chunking',
      current: 1,
      total: 1,
      message: `Created ${chunks.length} chunks`,
    });

    // Step 2: Generate embeddings for each chunk
    const embeddings: number[][] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.({
        stage: 'embedding',
        current: i + 1,
        total: chunks.length,
        message: `Generating embedding ${i + 1}/${chunks.length}...`,
      });

      const result = await generateEmbedding(chunks[i].content, embeddingModel);
      embeddings.push(result.embedding);
    }

    // Step 3: Store in vector database
    onProgress?.({
      stage: 'storing',
      current: 0,
      total: 1,
      message: 'Storing in knowledge base...',
    });

    // First, remove any existing chunks from this source
    deleteBySource(collection, source);

    // Add new chunks
    const documents = chunks.map((chunk, i) => ({
      id: chunk.id,
      content: chunk.content,
      embedding: embeddings[i],
      metadata: {
        ...chunk.metadata,
        embeddingModel,
      },
    }));

    addDocuments(collection, documents);

    onProgress?.({
      stage: 'complete',
      current: 1,
      total: 1,
      message: `Indexed ${chunks.length} chunks`,
    });

    return {
      source,
      chunksCreated: chunks.length,
      embeddingsGenerated: embeddings.length,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    onProgress?.({
      stage: 'error',
      current: 0,
      total: 0,
      message: errorMessage,
    });

    return {
      source,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Index plain text content
 */
export async function indexPlainText(
  content: string,
  source: string,
  collection: CollectionName = 'references',
  embeddingModel: string = 'nomic-embed-text',
  onProgress?: (progress: IndexingProgress) => void
): Promise<IndexingResult> {
  try {
    onProgress?.({
      stage: 'chunking',
      current: 0,
      total: 1,
      message: 'Splitting text into chunks...',
    });

    const chunks = chunkPlainText(content, source);

    if (chunks.length === 0) {
      return {
        source,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        success: true,
      };
    }

    // Generate embeddings
    const embeddings: number[][] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.({
        stage: 'embedding',
        current: i + 1,
        total: chunks.length,
        message: `Generating embedding ${i + 1}/${chunks.length}...`,
      });

      const result = await generateEmbedding(chunks[i].content, embeddingModel);
      embeddings.push(result.embedding);
    }

    // Store
    onProgress?.({
      stage: 'storing',
      current: 0,
      total: 1,
      message: 'Storing in knowledge base...',
    });

    deleteBySource(collection, source);

    const documents = chunks.map((chunk, i) => ({
      id: chunk.id,
      content: chunk.content,
      embedding: embeddings[i],
      metadata: {
        ...chunk.metadata,
        embeddingModel,
      },
    }));

    addDocuments(collection, documents);

    onProgress?.({
      stage: 'complete',
      current: 1,
      total: 1,
      message: `Indexed ${chunks.length} chunks`,
    });

    return {
      source,
      chunksCreated: chunks.length,
      embeddingsGenerated: embeddings.length,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      source,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Index web research results
 */
export async function indexWebResearch(
  query: string,
  results: Array<{ title: string; url: string; snippet: string }>,
  summary?: string,
  embeddingModel: string = 'nomic-embed-text',
  onProgress?: (progress: IndexingProgress) => void
): Promise<IndexingResult> {
  try {
    const source = `web_search:${query}`;
    
    // Create content from results
    const contents: Array<{ id: string; content: string; metadata: Record<string, any> }> = [];

    // Add summary if available
    if (summary) {
      contents.push({
        id: `${source}:summary`,
        content: `Search Query: ${query}\n\nSummary: ${summary}`,
        metadata: {
          source,
          type: 'summary',
          query,
        },
      });
    }

    // Add each result
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      contents.push({
        id: `${source}:result:${i}`,
        content: `Title: ${result.title}\nURL: ${result.url}\n\n${result.snippet}`,
        metadata: {
          source,
          type: 'result',
          title: result.title,
          url: result.url,
          query,
        },
      });
    }

    if (contents.length === 0) {
      return {
        source,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        success: true,
      };
    }

    // Generate embeddings
    const embeddings: number[][] = [];
    
    for (let i = 0; i < contents.length; i++) {
      onProgress?.({
        stage: 'embedding',
        current: i + 1,
        total: contents.length,
        message: `Embedding research result ${i + 1}/${contents.length}...`,
      });

      const result = await generateEmbedding(contents[i].content, embeddingModel);
      embeddings.push(result.embedding);
    }

    // Store
    deleteBySource('web_research', source);

    const documents = contents.map((c, i) => ({
      id: c.id,
      content: c.content,
      embedding: embeddings[i],
      metadata: c.metadata,
    }));

    addDocuments('web_research', documents);

    return {
      source,
      chunksCreated: contents.length,
      embeddingsGenerated: embeddings.length,
      success: true,
    };
  } catch (error) {
    return {
      source: `web_search:${query}`,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Re-index all documents in a collection with a different embedding model
 */
export async function reindexCollection(
  collection: CollectionName,
  newModel: string,
  onProgress?: (progress: IndexingProgress) => void
): Promise<{ success: number; failed: number }> {
  const stats = getCollectionStats(collection);
  let success = 0;
  let failed = 0;

  // This would require storing the original content
  // For now, we just report that re-indexing requires the original documents
  
  onProgress?.({
    stage: 'error',
    current: 0,
    total: 0,
    message: 'Re-indexing requires original documents. Please re-add documents to the knowledge base.',
  });

  return { success, failed };
}





