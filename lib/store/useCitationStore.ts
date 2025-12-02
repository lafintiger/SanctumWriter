/**
 * Citation Store
 * Manages citations and bibliography for documents
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Citation, 
  CitationFormat, 
  CitationDocument, 
  Author,
  generateCitationKey 
} from '@/types/citation';

interface CitationState {
  // Per-document citations
  documents: Record<string, CitationDocument>;
  
  // Project/folder-level shared citations (key is folder path)
  sharedCitations: Record<string, Record<string, Citation>>;
  
  // Global settings
  defaultFormat: CitationFormat;
  
  // UI state
  showCitationPanel: boolean;
  
  // Actions
  toggleCitationPanel: () => void;
  setDefaultFormat: (format: CitationFormat) => void;
  
  // Document-level actions
  initializeDocument: (documentPath: string) => void;
  
  // Citation CRUD
  addCitation: (documentPath: string, citation: Omit<Citation, 'createdAt' | 'updatedAt'>) => Citation;
  updateCitation: (documentPath: string, id: string, updates: Partial<Citation>) => void;
  deleteCitation: (documentPath: string, id: string) => void;
  getCitation: (documentPath: string, id: string) => Citation | undefined;
  getAllCitations: (documentPath: string) => Citation[];
  
  // Shared/Project citations
  addSharedCitation: (folderPath: string, citation: Omit<Citation, 'createdAt' | 'updatedAt'>) => Citation;
  updateSharedCitation: (folderPath: string, id: string, updates: Partial<Citation>) => void;
  deleteSharedCitation: (folderPath: string, id: string) => void;
  getSharedCitation: (folderPath: string, id: string) => Citation | undefined;
  getAllSharedCitations: (folderPath: string) => Citation[];
  
  // Combined getter (document + shared)
  getEffectiveCitations: (documentPath: string, folderPath?: string) => Citation[];
  
  // Utility
  generateKey: (documentPath: string, author: Author, year: number | string) => string;
  importCitations: (documentPath: string, citations: Citation[]) => void;
  exportCitations: (documentPath: string) => Citation[];
}

export const useCitationStore = create<CitationState>()(
  persist(
    (set, get) => ({
      documents: {},
      sharedCitations: {},
      defaultFormat: 'apa',
      showCitationPanel: false,
      
      toggleCitationPanel: () => set((state) => ({
        showCitationPanel: !state.showCitationPanel,
      })),
      
      setDefaultFormat: (format) => set({ defaultFormat: format }),
      
      initializeDocument: (documentPath) => {
        const { documents, defaultFormat } = get();
        if (!documents[documentPath]) {
          set({
            documents: {
              ...documents,
              [documentPath]: {
                documentPath,
                citations: {},
                defaultFormat,
              },
            },
          });
        }
      },
      
      addCitation: (documentPath, citation) => {
        const { documents, defaultFormat } = get();
        const now = new Date().toISOString();
        
        // Ensure document exists
        if (!documents[documentPath]) {
          documents[documentPath] = {
            documentPath,
            citations: {},
            defaultFormat,
          };
        }
        
        const fullCitation: Citation = {
          ...citation,
          createdAt: now,
          updatedAt: now,
        };
        
        set({
          documents: {
            ...documents,
            [documentPath]: {
              ...documents[documentPath],
              citations: {
                ...documents[documentPath].citations,
                [citation.id]: fullCitation,
              },
            },
          },
        });
        
        return fullCitation;
      },
      
      updateCitation: (documentPath, id, updates) => {
        const { documents } = get();
        const doc = documents[documentPath];
        if (!doc || !doc.citations[id]) return;
        
        set({
          documents: {
            ...documents,
            [documentPath]: {
              ...doc,
              citations: {
                ...doc.citations,
                [id]: {
                  ...doc.citations[id],
                  ...updates,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          },
        });
      },
      
      deleteCitation: (documentPath, id) => {
        const { documents } = get();
        const doc = documents[documentPath];
        if (!doc) return;
        
        const { [id]: removed, ...remaining } = doc.citations;
        
        set({
          documents: {
            ...documents,
            [documentPath]: {
              ...doc,
              citations: remaining,
            },
          },
        });
      },
      
      getCitation: (documentPath, id) => {
        const { documents } = get();
        return documents[documentPath]?.citations[id];
      },
      
      getAllCitations: (documentPath) => {
        const { documents } = get();
        const doc = documents[documentPath];
        if (!doc) return [];
        return Object.values(doc.citations);
      },
      
      generateKey: (documentPath, author, year) => {
        const { documents } = get();
        const doc = documents[documentPath];
        const existingKeys = doc ? Object.keys(doc.citations) : [];
        
        let baseKey = generateCitationKey(author, year);
        let key = baseKey;
        let suffix = 'a';
        
        // If key exists, add letter suffix (smith2024a, smith2024b, etc.)
        while (existingKeys.includes(key)) {
          key = `${baseKey}${suffix}`;
          suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
        }
        
        return key;
      },
      
      importCitations: (documentPath, citations) => {
        const { documents, defaultFormat } = get();
        
        if (!documents[documentPath]) {
          documents[documentPath] = {
            documentPath,
            citations: {},
            defaultFormat,
          };
        }
        
        const citationsMap: Record<string, Citation> = {};
        for (const citation of citations) {
          citationsMap[citation.id] = citation;
        }
        
        set({
          documents: {
            ...documents,
            [documentPath]: {
              ...documents[documentPath],
              citations: {
                ...documents[documentPath].citations,
                ...citationsMap,
              },
            },
          },
        });
      },
      
      exportCitations: (documentPath) => {
        const { documents } = get();
        const doc = documents[documentPath];
        if (!doc) return [];
        return Object.values(doc.citations);
      },
      
      // Shared citations (project/folder level)
      addSharedCitation: (folderPath, citation) => {
        const { sharedCitations } = get();
        const now = new Date().toISOString();
        
        const fullCitation: Citation = {
          ...citation,
          createdAt: now,
          updatedAt: now,
        };
        
        set({
          sharedCitations: {
            ...sharedCitations,
            [folderPath]: {
              ...sharedCitations[folderPath],
              [citation.id]: fullCitation,
            },
          },
        });
        
        return fullCitation;
      },
      
      updateSharedCitation: (folderPath, id, updates) => {
        const { sharedCitations } = get();
        const folder = sharedCitations[folderPath];
        if (!folder || !folder[id]) return;
        
        set({
          sharedCitations: {
            ...sharedCitations,
            [folderPath]: {
              ...folder,
              [id]: {
                ...folder[id],
                ...updates,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        });
      },
      
      deleteSharedCitation: (folderPath, id) => {
        const { sharedCitations } = get();
        const folder = sharedCitations[folderPath];
        if (!folder) return;
        
        const { [id]: removed, ...remaining } = folder;
        
        set({
          sharedCitations: {
            ...sharedCitations,
            [folderPath]: remaining,
          },
        });
      },
      
      getSharedCitation: (folderPath, id) => {
        const { sharedCitations } = get();
        return sharedCitations[folderPath]?.[id];
      },
      
      getAllSharedCitations: (folderPath) => {
        const { sharedCitations } = get();
        const folder = sharedCitations[folderPath];
        if (!folder) return [];
        return Object.values(folder);
      },
      
      // Get all effective citations for a document (document-level + shared)
      getEffectiveCitations: (documentPath, folderPath) => {
        const { documents, sharedCitations } = get();
        const docCitations = documents[documentPath]?.citations || {};
        const sharedCits = folderPath ? (sharedCitations[folderPath] || {}) : {};
        
        // Merge, document-level overrides shared
        const merged: Record<string, Citation> = { ...sharedCits, ...docCitations };
        return Object.values(merged);
      },
    }),
    {
      name: 'sanctumwriter-citations',
      partialize: (state) => ({
        documents: state.documents,
        sharedCitations: state.sharedCitations,
        defaultFormat: state.defaultFormat,
      }),
    }
  )
);

