/**
 * Search Store - State management for research/search functionality
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  SearchResult, 
  SearchResponse, 
  SearchEngine,
  checkSearchEngineStatus,
} from '@/lib/search/searchService';

interface SearchState {
  // Search state
  isSearching: boolean;
  currentQuery: string;
  lastSearchQuery: string; // The query that was used for current results
  results: SearchResult[];
  aiSummary: string | null;
  error: string | null;
  
  // Engine status
  engineStatus: {
    perplexica: boolean;
    searxng: boolean;
  };
  preferredEngine: SearchEngine;
  
  // History
  searchHistory: Array<{
    query: string;
    timestamp: Date;
    resultCount: number;
  }>;
  
  // Saved results for citations
  savedResults: SearchResult[];
  
  // UI state
  showResearchPanel: boolean;
  focusMode: 'webSearch' | 'academicSearch' | 'writingAssistant';
  
  // Actions
  setSearching: (isSearching: boolean) => void;
  setQuery: (query: string) => void;
  setResults: (response: SearchResponse) => void;
  setError: (error: string | null) => void;
  setEngineStatus: (status: { perplexica: boolean; searxng: boolean }) => void;
  setPreferredEngine: (engine: SearchEngine) => void;
  setFocusMode: (mode: 'webSearch' | 'academicSearch' | 'writingAssistant') => void;
  
  // Panel
  toggleResearchPanel: () => void;
  setShowResearchPanel: (show: boolean) => void;
  
  // Saved results
  saveResult: (result: SearchResult) => void;
  removeResult: (url: string) => void;
  clearSavedResults: () => void;
  
  // History
  addToHistory: (query: string, resultCount: number) => void;
  clearHistory: () => void;
  
  // Utilities
  checkEngines: () => Promise<void>;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      isSearching: false,
      currentQuery: '',
      lastSearchQuery: '',
      results: [],
      aiSummary: null,
      error: null,
      
      engineStatus: {
        perplexica: false,
        searxng: false,
      },
      preferredEngine: 'perplexica',
      
      searchHistory: [],
      savedResults: [],
      
      showResearchPanel: false,
      focusMode: 'webSearch',
      
      // Actions
      setSearching: (isSearching) => set({ isSearching }),
      
      setQuery: (query) => set({ currentQuery: query }),
      
      setResults: (response) => set({
        results: response.results,
        aiSummary: response.aiSummary || null,
        error: response.error || null,
        lastSearchQuery: response.query || '', // Store the query used for these results
        isSearching: false,
      }),
      
      setError: (error) => set({ error, isSearching: false }),
      
      setEngineStatus: (status) => set({ engineStatus: status }),
      
      setPreferredEngine: (engine) => set({ preferredEngine: engine }),
      
      setFocusMode: (mode) => set({ focusMode: mode }),
      
      // Panel
      toggleResearchPanel: () => set((state) => ({ 
        showResearchPanel: !state.showResearchPanel 
      })),
      
      setShowResearchPanel: (show) => set({ showResearchPanel: show }),
      
      // Saved results
      saveResult: (result) => set((state) => {
        if (state.savedResults.some((r) => r.url === result.url)) {
          return state; // Already saved
        }
        return {
          savedResults: [...state.savedResults, result],
        };
      }),
      
      removeResult: (url) => set((state) => ({
        savedResults: state.savedResults.filter((r) => r.url !== url),
      })),
      
      clearSavedResults: () => set({ savedResults: [] }),
      
      // History
      addToHistory: (query, resultCount) => set((state) => ({
        searchHistory: [
          { query, timestamp: new Date(), resultCount },
          ...state.searchHistory.slice(0, 49), // Keep last 50
        ],
      })),
      
      clearHistory: () => set({ searchHistory: [] }),
      
      // Utilities
      checkEngines: async () => {
        const status = await checkSearchEngineStatus();
        set({ engineStatus: status });
        
        // Auto-select available engine if preferred is unavailable
        const { preferredEngine } = get();
        if (preferredEngine === 'perplexica' && !status.perplexica && status.searxng) {
          set({ preferredEngine: 'searxng' });
        } else if (preferredEngine === 'searxng' && !status.searxng && status.perplexica) {
          set({ preferredEngine: 'perplexica' });
        }
      },
      
      clearSearch: () => set({
        currentQuery: '',
        lastSearchQuery: '',
        results: [],
        aiSummary: null,
        error: null,
        isSearching: false,
      }),
    }),
    {
      name: 'sanctum-writer-search',
      partialize: (state) => ({
        preferredEngine: state.preferredEngine,
        focusMode: state.focusMode,
        searchHistory: state.searchHistory,
        savedResults: state.savedResults,
      }),
    }
  )
);





