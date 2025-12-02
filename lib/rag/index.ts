/**
 * RAG Module Exports
 * Central export point for all RAG functionality
 */

// Embeddings
export {
  generateEmbedding,
  generateEmbeddings,
  checkEmbeddingModel,
  pullEmbeddingModel,
  cosineSimilarity,
  EMBEDDING_MODELS,
} from './embeddings';

// Chunking
export {
  chunkMarkdown,
  chunkPlainText,
  estimateTokens,
  getOptimalChunkSize,
  type Chunk,
  type ChunkingOptions,
} from './chunker';

// Vector Store
export {
  addDocument,
  addDocuments,
  searchSimilar,
  searchMultipleCollections,
  getDocument,
  deleteDocument,
  deleteBySource,
  getAllDocuments,
  getCollectionStats,
  clearCollection,
  clearAllCollections,
  exportStore,
  importStore,
  type VectorDocument,
  type SearchResult,
  type CollectionName,
} from './vectorStore';

// Indexer
export {
  indexMarkdownDocument,
  indexPlainText,
  indexWebResearch,
  type IndexingResult,
  type IndexingProgress,
} from './indexer';

// Retriever
export {
  retrieveContext,
  retrieveFromCollection,
  buildRAGPrompt,
  findSimilarDocuments,
  findSupportingEvidence,
  type RetrievalResult,
  type RetrievalOptions,
} from './retriever';

// Session Memory
export {
  summarizeConversation,
  saveConversationMemory,
  retrieveRelevantMemories,
  getDocumentMemories,
  savePreference,
  retrievePreferences,
  deleteMemory,
  clearDocumentMemories,
  buildMemoryContext,
  autoSaveSession,
  type ConversationSummary,
  type SessionMemory,
} from './sessionMemory';





