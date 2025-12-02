/**
 * RAG Store
 * Manages RAG (Retrieval Augmented Generation) state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CollectionName, getCollectionStats, clearCollection } from '../rag/vectorStore';
import { EMBEDDING_MODELS } from '../rag/embeddings';

export interface RAGSettings {
  enabled: boolean;
  embeddingModel: string;
  maxRetrievedChunks: number;
  minSimilarityScore: number;
  maxTokensForContext: number;
  collections: CollectionName[];
}

export interface SessionMemorySettings {
  enabled: boolean;
  autoSave: boolean;
  autoSaveThreshold: number; // Number of messages before auto-save
}

export interface IndexedDocument {
  source: string;
  collection: CollectionName;
  chunksCount: number;
  indexedAt: string;
}

interface RAGState {
  // Settings
  ragSettings: RAGSettings;
  sessionMemorySettings: SessionMemorySettings;
  
  // UI State
  showKnowledgeBasePanel: boolean;
  showSessionMemoryPanel: boolean;
  
  // Indexed documents tracking
  indexedDocuments: IndexedDocument[];
  
  // Status
  isIndexing: boolean;
  indexingProgress: {
    source: string;
    stage: string;
    current: number;
    total: number;
  } | null;
  
  // Actions
  setRAGEnabled: (enabled: boolean) => void;
  setEmbeddingModel: (model: string) => void;
  setMaxRetrievedChunks: (count: number) => void;
  setMinSimilarityScore: (score: number) => void;
  setMaxTokensForContext: (tokens: number) => void;
  setCollections: (collections: CollectionName[]) => void;
  
  setSessionMemoryEnabled: (enabled: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveThreshold: (threshold: number) => void;
  
  toggleKnowledgeBasePanel: () => void;
  toggleSessionMemoryPanel: () => void;
  
  addIndexedDocument: (doc: Omit<IndexedDocument, 'indexedAt'>) => void;
  removeIndexedDocument: (source: string) => void;
  
  setIsIndexing: (isIndexing: boolean) => void;
  setIndexingProgress: (progress: RAGState['indexingProgress']) => void;
  
  clearCollectionData: (collection: CollectionName) => void;
}

export const useRAGStore = create<RAGState>()(
  persist(
    (set, get) => ({
      // Default settings
      ragSettings: {
        enabled: true,
        embeddingModel: 'nomic-embed-text',
        maxRetrievedChunks: 5,
        minSimilarityScore: 0.5,
        maxTokensForContext: 2000,
        collections: ['references', 'sessions', 'web_research'],
      },
      
      sessionMemorySettings: {
        enabled: true,
        autoSave: true,
        autoSaveThreshold: 8,
      },
      
      // UI state
      showKnowledgeBasePanel: false,
      showSessionMemoryPanel: false,
      
      // Indexed documents
      indexedDocuments: [],
      
      // Status
      isIndexing: false,
      indexingProgress: null,
      
      // RAG Settings actions
      setRAGEnabled: (enabled) => set((state) => ({
        ragSettings: { ...state.ragSettings, enabled },
      })),
      
      setEmbeddingModel: (model) => set((state) => ({
        ragSettings: { ...state.ragSettings, embeddingModel: model },
      })),
      
      setMaxRetrievedChunks: (count) => set((state) => ({
        ragSettings: { ...state.ragSettings, maxRetrievedChunks: count },
      })),
      
      setMinSimilarityScore: (score) => set((state) => ({
        ragSettings: { ...state.ragSettings, minSimilarityScore: score },
      })),
      
      setMaxTokensForContext: (tokens) => set((state) => ({
        ragSettings: { ...state.ragSettings, maxTokensForContext: tokens },
      })),
      
      setCollections: (collections) => set((state) => ({
        ragSettings: { ...state.ragSettings, collections },
      })),
      
      // Session Memory settings actions
      setSessionMemoryEnabled: (enabled) => set((state) => ({
        sessionMemorySettings: { ...state.sessionMemorySettings, enabled },
      })),
      
      setAutoSave: (enabled) => set((state) => ({
        sessionMemorySettings: { ...state.sessionMemorySettings, autoSave: enabled },
      })),
      
      setAutoSaveThreshold: (threshold) => set((state) => ({
        sessionMemorySettings: { ...state.sessionMemorySettings, autoSaveThreshold: threshold },
      })),
      
      // UI actions
      toggleKnowledgeBasePanel: () => set((state) => ({
        showKnowledgeBasePanel: !state.showKnowledgeBasePanel,
      })),
      
      toggleSessionMemoryPanel: () => set((state) => ({
        showSessionMemoryPanel: !state.showSessionMemoryPanel,
      })),
      
      // Document tracking
      addIndexedDocument: (doc) => set((state) => {
        const existing = state.indexedDocuments.findIndex(d => d.source === doc.source);
        const newDoc = { ...doc, indexedAt: new Date().toISOString() };
        
        if (existing >= 0) {
          const updated = [...state.indexedDocuments];
          updated[existing] = newDoc;
          return { indexedDocuments: updated };
        }
        
        return { indexedDocuments: [...state.indexedDocuments, newDoc] };
      }),
      
      removeIndexedDocument: (source) => set((state) => ({
        indexedDocuments: state.indexedDocuments.filter(d => d.source !== source),
      })),
      
      // Status actions
      setIsIndexing: (isIndexing) => set({ isIndexing }),
      
      setIndexingProgress: (progress) => set({ indexingProgress: progress }),
      
      clearCollectionData: (collection) => {
        clearCollection(collection);
        set((state) => ({
          indexedDocuments: state.indexedDocuments.filter(d => d.collection !== collection),
        }));
      },
    }),
    {
      name: 'sanctumwriter-rag',
      partialize: (state) => ({
        ragSettings: state.ragSettings,
        sessionMemorySettings: state.sessionMemorySettings,
        indexedDocuments: state.indexedDocuments,
      }),
    }
  )
);

// Selector hooks for convenience
export const useRAGEnabled = () => useRAGStore((state) => state.ragSettings.enabled);
export const useSessionMemoryEnabled = () => useRAGStore((state) => state.sessionMemorySettings.enabled);
export const useEmbeddingModel = () => useRAGStore((state) => state.ragSettings.embeddingModel);





