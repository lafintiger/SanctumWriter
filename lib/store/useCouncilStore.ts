import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { 
  Reviewer, 
  ReviewComment, 
  ReviewSession, 
  ReviewDocument,
  DEFAULT_REVIEWERS 
} from '@/types/council';

interface CouncilState {
  // Reviewers configuration
  reviewers: Reviewer[];
  
  // Model loading state (tracks which models are currently loaded in Ollama)
  loadedModels: string[];
  modelLoadingStatus: { [model: string]: 'loading' | 'loaded' | 'unloading' | 'error' };
  
  // Current review session
  currentSession: ReviewSession | null;
  isReviewing: boolean;
  reviewProgress: { [reviewerId: string]: 'pending' | 'in_progress' | 'complete' | 'error' };
  
  // Review document (council commentary)
  currentReviewDocument: ReviewDocument | null;
  reviewPhase: 'idle' | 'council_reviewing' | 'editor_synthesizing' | 'user_deciding' | 'complete';
  
  // Review history
  pastSessions: ReviewSession[];
  
  // UI state
  showCouncilPanel: boolean;
  selectedReviewerId: string | null;
  filterByReviewer: string | null;
  filterByType: ReviewComment['type'] | null;
  
  // Actions - Reviewers
  addReviewer: (reviewer: Omit<Reviewer, 'id'>) => void;
  updateReviewer: (id: string, updates: Partial<Reviewer>) => void;
  removeReviewer: (id: string) => void;
  toggleReviewer: (id: string) => void;
  setEditorReviewer: (id: string) => void;
  resetToDefaults: () => void;
  
  // Actions - Model Loading
  setModelLoading: (model: string, status: 'loading' | 'loaded' | 'unloading' | 'error') => void;
  setLoadedModels: (models: string[]) => void;
  
  // Actions - Review Session
  startReview: (documentPath: string, content: string, reviewerIds: string[]) => void;
  addComment: (comment: Omit<ReviewComment, 'id' | 'createdAt'>) => void;
  updateCommentStatus: (commentId: string, status: ReviewComment['status']) => void;
  setReviewProgress: (reviewerId: string, status: 'pending' | 'in_progress' | 'complete' | 'error') => void;
  completeReview: (summary?: string) => void;
  cancelReview: () => void;
  clearSession: () => void;
  
  // Actions - Review Document & Editor
  initReviewDocument: (sessionId: string, documentPath: string, content: string) => void;
  addCouncilFeedback: (reviewerId: string, comments: ReviewComment[], summary: string) => void;
  setEditorSynthesis: (synthesis: ReviewDocument['editorSynthesis']) => void;
  addUserDecision: (commentId: string, decision: 'accept' | 'reject' | 'modify', note?: string) => void;
  setReviewPhase: (phase: CouncilState['reviewPhase']) => void;
  
  // Actions - UI
  toggleCouncilPanel: () => void;
  setSelectedReviewer: (id: string | null) => void;
  setFilterByReviewer: (id: string | null) => void;
  setFilterByType: (type: ReviewComment['type'] | null) => void;
  
  // Getters
  getEnabledReviewers: () => Reviewer[];
  getEditorReviewer: () => Reviewer | undefined;
  getCouncilReviewers: () => Reviewer[]; // All enabled reviewers except Editor
  getCommentsForLine: (line: number) => ReviewComment[];
  getCommentsByReviewer: (reviewerId: string) => ReviewComment[];
  getCommentStats: () => { total: number; byType: Record<string, number>; byReviewer: Record<string, number> };
}

// Initialize reviewers with UUIDs
const initializeReviewers = (): Reviewer[] => {
  return DEFAULT_REVIEWERS.map((r) => ({
    ...r,
    id: uuidv4(),
  }));
};

export const useCouncilStore = create<CouncilState>()(
  persist(
    (set, get) => ({
      // Initial state
      reviewers: initializeReviewers(),
      loadedModels: [],
      modelLoadingStatus: {},
      currentSession: null,
      isReviewing: false,
      reviewProgress: {},
      currentReviewDocument: null,
      reviewPhase: 'idle',
      pastSessions: [],
      showCouncilPanel: false,
      selectedReviewerId: null,
      filterByReviewer: null,
      filterByType: null,
      
      // Reviewer management
      addReviewer: (reviewer) => {
        const newReviewer: Reviewer = {
          ...reviewer,
          id: uuidv4(),
        };
        set((state) => ({
          reviewers: [...state.reviewers, newReviewer],
        }));
      },
      
      updateReviewer: (id, updates) => {
        set((state) => ({
          reviewers: state.reviewers.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },
      
      removeReviewer: (id) => {
        set((state) => ({
          reviewers: state.reviewers.filter((r) => r.id !== id),
        }));
      },
      
      toggleReviewer: (id) => {
        set((state) => ({
          reviewers: state.reviewers.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
          ),
        }));
      },
      
      resetToDefaults: () => {
        set({ reviewers: initializeReviewers() });
      },
      
      setEditorReviewer: (id) => {
        set((state) => ({
          reviewers: state.reviewers.map((r) => ({
            ...r,
            isEditor: r.id === id,
          })),
        }));
      },
      
      // Model loading management
      setModelLoading: (model, status) => {
        set((state) => ({
          modelLoadingStatus: {
            ...state.modelLoadingStatus,
            [model]: status,
          },
          loadedModels: status === 'loaded' 
            ? [...new Set([...state.loadedModels, model])]
            : status === 'unloading' || status === 'error'
              ? state.loadedModels.filter((m) => m !== model)
              : state.loadedModels,
        }));
      },
      
      setLoadedModels: (models) => {
        set({ loadedModels: models });
      },
      
      // Review session management
      startReview: (documentPath, content, reviewerIds) => {
        const session: ReviewSession = {
          id: uuidv4(),
          documentPath,
          documentContent: content,
          reviewers: reviewerIds,
          comments: [],
          createdAt: new Date(),
          status: 'in_progress',
        };
        
        const progress: { [key: string]: 'pending' | 'in_progress' | 'complete' | 'error' } = {};
        reviewerIds.forEach((id) => {
          progress[id] = 'pending';
        });
        
        set({
          currentSession: session,
          isReviewing: true,
          reviewProgress: progress,
          showCouncilPanel: true,
        });
      },
      
      addComment: (comment) => {
        const newComment: ReviewComment = {
          ...comment,
          id: uuidv4(),
          createdAt: new Date(),
        };
        
        set((state) => {
          if (!state.currentSession) return state;
          return {
            currentSession: {
              ...state.currentSession,
              comments: [...state.currentSession.comments, newComment],
            },
          };
        });
      },
      
      updateCommentStatus: (commentId, status) => {
        set((state) => {
          if (!state.currentSession) return state;
          return {
            currentSession: {
              ...state.currentSession,
              comments: state.currentSession.comments.map((c) =>
                c.id === commentId ? { ...c, status } : c
              ),
            },
          };
        });
      },
      
      setReviewProgress: (reviewerId, status) => {
        set((state) => ({
          reviewProgress: {
            ...state.reviewProgress,
            [reviewerId]: status,
          },
        }));
      },
      
      completeReview: (summary) => {
        set((state) => {
          if (!state.currentSession) return state;
          
          const completedSession: ReviewSession = {
            ...state.currentSession,
            summary,
            completedAt: new Date(),
            status: 'completed',
          };
          
          return {
            currentSession: completedSession,
            isReviewing: false,
            pastSessions: [completedSession, ...state.pastSessions].slice(0, 50), // Keep last 50
          };
        });
      },
      
      cancelReview: () => {
        set((state) => {
          if (!state.currentSession) return state;
          return {
            currentSession: {
              ...state.currentSession,
              status: 'cancelled',
            },
            isReviewing: false,
          };
        });
      },
      
      clearSession: () => {
        set({
          currentSession: null,
          isReviewing: false,
          reviewProgress: {},
          currentReviewDocument: null,
          reviewPhase: 'idle',
        });
      },
      
      // Review Document & Editor actions
      initReviewDocument: (sessionId, documentPath, content) => {
        const doc: ReviewDocument = {
          id: uuidv4(),
          sessionId,
          documentPath,
          originalContent: content,
          councilFeedback: [],
          userDecisions: [],
          createdAt: new Date(),
          status: 'collecting',
        };
        set({ 
          currentReviewDocument: doc,
          reviewPhase: 'council_reviewing',
        });
      },
      
      addCouncilFeedback: (reviewerId, comments, summary) => {
        const reviewer = get().reviewers.find((r) => r.id === reviewerId);
        if (!reviewer) return;
        
        set((state) => {
          if (!state.currentReviewDocument) return state;
          return {
            currentReviewDocument: {
              ...state.currentReviewDocument,
              councilFeedback: [
                ...state.currentReviewDocument.councilFeedback,
                {
                  reviewerId,
                  reviewerName: reviewer.name,
                  reviewerIcon: reviewer.icon,
                  model: reviewer.model,
                  comments,
                  summary,
                  timestamp: new Date(),
                },
              ],
            },
          };
        });
      },
      
      setEditorSynthesis: (synthesis) => {
        set((state) => {
          if (!state.currentReviewDocument) return state;
          return {
            currentReviewDocument: {
              ...state.currentReviewDocument,
              editorSynthesis: synthesis,
              status: 'editing',
            },
            reviewPhase: 'user_deciding',
          };
        });
      },
      
      addUserDecision: (commentId, decision, note) => {
        set((state) => {
          if (!state.currentReviewDocument) return state;
          return {
            currentReviewDocument: {
              ...state.currentReviewDocument,
              userDecisions: [
                ...state.currentReviewDocument.userDecisions,
                {
                  commentId,
                  decision,
                  userNote: note,
                  timestamp: new Date(),
                },
              ],
            },
          };
        });
      },
      
      setReviewPhase: (phase) => {
        set({ reviewPhase: phase });
        if (phase === 'complete') {
          set((state) => {
            if (!state.currentReviewDocument) return state;
            return {
              currentReviewDocument: {
                ...state.currentReviewDocument,
                status: 'complete',
              },
            };
          });
        }
      },
      
      // UI actions
      toggleCouncilPanel: () => {
        set((state) => ({ showCouncilPanel: !state.showCouncilPanel }));
      },
      
      setSelectedReviewer: (id) => {
        set({ selectedReviewerId: id });
      },
      
      setFilterByReviewer: (id) => {
        set({ filterByReviewer: id });
      },
      
      setFilterByType: (type) => {
        set({ filterByType: type });
      },
      
      // Getters
      getEnabledReviewers: () => {
        return get().reviewers.filter((r) => r.enabled);
      },
      
      getEditorReviewer: () => {
        return get().reviewers.find((r) => r.isEditor && r.enabled);
      },
      
      getCouncilReviewers: () => {
        return get().reviewers.filter((r) => r.enabled && !r.isEditor);
      },
      
      getCommentsForLine: (line) => {
        const session = get().currentSession;
        if (!session) return [];
        return session.comments.filter(
          (c) => line >= c.startLine && line <= c.endLine
        );
      },
      
      getCommentsByReviewer: (reviewerId) => {
        const session = get().currentSession;
        if (!session) return [];
        return session.comments.filter((c) => c.reviewerId === reviewerId);
      },
      
      getCommentStats: () => {
        const session = get().currentSession;
        if (!session) {
          return { total: 0, byType: {}, byReviewer: {} };
        }
        
        const byType: Record<string, number> = {};
        const byReviewer: Record<string, number> = {};
        
        session.comments.forEach((c) => {
          byType[c.type] = (byType[c.type] || 0) + 1;
          byReviewer[c.reviewerId] = (byReviewer[c.reviewerId] || 0) + 1;
        });
        
        return {
          total: session.comments.length,
          byType,
          byReviewer,
        };
      },
    }),
    {
      name: 'sanctum-writer-council',
      partialize: (state) => ({
        // Only persist reviewers configuration, not active sessions
        reviewers: state.reviewers,
        pastSessions: state.pastSessions.slice(0, 10), // Keep last 10 sessions
      }),
    }
  )
);

