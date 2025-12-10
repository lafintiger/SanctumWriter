/**
 * Vector Store Service
 * Manages vector embeddings storage using a simple JSON-based approach
 * (LanceDB has issues with Next.js, so we use a simpler approach)
 */

import { cosineSimilarity } from './embeddings';

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export type CollectionName = 'references' | 'sessions' | 'preferences' | 'web_research';

interface VectorStore {
  references: VectorDocument[];
  sessions: VectorDocument[];
  preferences: VectorDocument[];
  web_research: VectorDocument[];
}

const STORAGE_KEY = 'sanctumwriter_vectorstore';

/**
 * Load vector store from localStorage
 */
function loadStore(): VectorStore {
  if (typeof window === 'undefined') {
    return { references: [], sessions: [], preferences: [], web_research: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load vector store:', error);
  }

  return { references: [], sessions: [], preferences: [], web_research: [] };
}

/**
 * Save vector store to localStorage
 */
function saveStore(store: VectorStore): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Failed to save vector store:', error);
    // If storage is full, try to clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, clearing old entries...');
      // Keep only most recent 100 entries per collection
      for (const key of Object.keys(store) as CollectionName[]) {
        store[key] = store[key]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 100);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  }
}

/**
 * Add a document to a collection
 */
export function addDocument(
  collection: CollectionName,
  id: string,
  content: string,
  embedding: number[],
  metadata: Record<string, any> = {}
): VectorDocument {
  const store = loadStore();
  const now = new Date().toISOString();

  // Check if document already exists
  const existingIndex = store[collection].findIndex(d => d.id === id);

  const doc: VectorDocument = {
    id,
    content,
    embedding,
    metadata,
    createdAt: existingIndex >= 0 ? store[collection][existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    store[collection][existingIndex] = doc;
  } else {
    store[collection].push(doc);
  }

  saveStore(store);
  return doc;
}

/**
 * Add multiple documents to a collection
 */
export function addDocuments(
  collection: CollectionName,
  documents: Array<{ id: string; content: string; embedding: number[]; metadata?: Record<string, any> }>
): VectorDocument[] {
  const store = loadStore();
  const now = new Date().toISOString();
  const results: VectorDocument[] = [];

  for (const doc of documents) {
    const existingIndex = store[collection].findIndex(d => d.id === doc.id);

    const vectorDoc: VectorDocument = {
      id: doc.id,
      content: doc.content,
      embedding: doc.embedding,
      metadata: doc.metadata || {},
      createdAt: existingIndex >= 0 ? store[collection][existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      store[collection][existingIndex] = vectorDoc;
    } else {
      store[collection].push(vectorDoc);
    }

    results.push(vectorDoc);
  }

  saveStore(store);
  return results;
}

/**
 * Search for similar documents using cosine similarity
 */
export function searchSimilar(
  collection: CollectionName,
  queryEmbedding: number[],
  limit: number = 5,
  minScore: number = 0.5
): SearchResult[] {
  const store = loadStore();
  const documents = store[collection];

  if (documents.length === 0) {
    return [];
  }

  // Calculate similarity scores
  const scored = documents.map(doc => ({
    id: doc.id,
    content: doc.content,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
    metadata: doc.metadata,
  }));

  // Sort by score and filter by minimum
  return scored
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search across multiple collections
 */
export function searchMultipleCollections(
  collections: CollectionName[],
  queryEmbedding: number[],
  limit: number = 5,
  minScore: number = 0.5
): SearchResult[] {
  const allResults: SearchResult[] = [];

  for (const collection of collections) {
    const results = searchSimilar(collection, queryEmbedding, limit, minScore);
    allResults.push(...results.map(r => ({ ...r, metadata: { ...r.metadata, collection } })));
  }

  // Sort all results by score and return top N
  return allResults
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get a document by ID
 */
export function getDocument(collection: CollectionName, id: string): VectorDocument | null {
  const store = loadStore();
  return store[collection].find(d => d.id === id) || null;
}

/**
 * Delete a document by ID
 */
export function deleteDocument(collection: CollectionName, id: string): boolean {
  const store = loadStore();
  const index = store[collection].findIndex(d => d.id === id);

  if (index >= 0) {
    store[collection].splice(index, 1);
    saveStore(store);
    return true;
  }

  return false;
}

/**
 * Delete documents by source
 */
export function deleteBySource(collection: CollectionName, source: string): number {
  const store = loadStore();
  const before = store[collection].length;
  store[collection] = store[collection].filter(d => d.metadata.source !== source);
  const deleted = before - store[collection].length;
  
  if (deleted > 0) {
    saveStore(store);
  }
  
  return deleted;
}

/**
 * Get all documents in a collection
 */
export function getAllDocuments(collection: CollectionName): VectorDocument[] {
  const store = loadStore();
  return store[collection];
}

/**
 * Get collection statistics
 */
export function getCollectionStats(collection: CollectionName): {
  count: number;
  sources: string[];
  oldestEntry: string | null;
  newestEntry: string | null;
} {
  const store = loadStore();
  const docs = store[collection];

  if (docs.length === 0) {
    return { count: 0, sources: [], oldestEntry: null, newestEntry: null };
  }

  const sources = [...new Set(docs.map(d => d.metadata.source).filter(Boolean))];
  const sorted = [...docs].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    count: docs.length,
    sources,
    oldestEntry: sorted[0]?.createdAt || null,
    newestEntry: sorted[sorted.length - 1]?.createdAt || null,
  };
}

/**
 * Clear a collection
 */
export function clearCollection(collection: CollectionName): void {
  const store = loadStore();
  store[collection] = [];
  saveStore(store);
}

/**
 * Clear all collections
 */
export function clearAllCollections(): void {
  const store: VectorStore = {
    references: [],
    sessions: [],
    preferences: [],
    web_research: [],
  };
  saveStore(store);
}

/**
 * Export store for backup
 */
export function exportStore(): string {
  const store = loadStore();
  return JSON.stringify(store, null, 2);
}

/**
 * Import store from backup
 */
export function importStore(json: string): boolean {
  try {
    const store = JSON.parse(json) as VectorStore;
    // Validate structure
    if (!store.references || !store.sessions || !store.preferences || !store.web_research) {
      throw new Error('Invalid store structure');
    }
    saveStore(store);
    return true;
  } catch (error) {
    console.error('Failed to import store:', error);
    return false;
  }
}














