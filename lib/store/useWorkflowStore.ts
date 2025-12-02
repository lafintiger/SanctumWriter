import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Workflow Store - Tracks writing workflow progress per document
 * 
 * Each document has its own progress state that persists across sessions.
 * The AI can read this state to provide contextual guidance.
 */

export type WorkflowStage = 
  | 'setup'
  | 'outline'
  | 'drafting'
  | 'draft_complete'
  | 'self_review'
  | 'council_review'
  | 'revisions'
  | 'fact_check'
  | 'final_polish'
  | 'complete';

export interface WorkflowChecklistItem {
  id: string;
  label: string;
  description?: string;
  stage: WorkflowStage;
  completed: boolean;
  completedAt?: Date;
}

export interface DocumentWorkflow {
  documentPath: string;
  currentStage: WorkflowStage;
  checklist: WorkflowChecklistItem[];
  startedAt: Date;
  lastUpdated: Date;
  notes: string; // User notes about progress
}

// Default checklist items
export const DEFAULT_CHECKLIST: Omit<WorkflowChecklistItem, 'completed' | 'completedAt'>[] = [
  // Setup
  { id: 'setup-model', label: 'Model selected', description: 'Choose appropriate model for your task', stage: 'setup' },
  { id: 'setup-preset', label: 'Writing preset configured', description: 'Academic, creative, business, etc.', stage: 'setup' },
  { id: 'setup-context', label: 'Context length verified', description: 'Appropriate for document size', stage: 'setup' },
  
  // Outline
  { id: 'outline-structure', label: 'Document structure outlined', description: 'Main sections and flow planned', stage: 'outline' },
  { id: 'outline-reviewed', label: 'Outline reviewed', description: 'Structure makes sense', stage: 'outline' },
  
  // Drafting
  { id: 'draft-started', label: 'First draft started', stage: 'drafting' },
  { id: 'draft-sections', label: 'All sections have content', stage: 'drafting' },
  { id: 'draft-complete', label: 'Draft complete', description: 'Main ideas are captured', stage: 'draft_complete' },
  
  // Self Review
  { id: 'review-read', label: 'Read through document', description: 'Initial self-review done', stage: 'self_review' },
  { id: 'review-notes', label: 'Noted obvious issues', stage: 'self_review' },
  
  // Council Review
  { id: 'council-style', label: 'Style Editor review', description: 'Grammar, flow, readability', stage: 'council_review' },
  { id: 'council-facts', label: 'Fact Checker review', description: 'Claims and statistics verified', stage: 'council_review' },
  { id: 'council-hallucination', label: 'Hallucination check', description: 'No fabricated facts', stage: 'council_review' },
  { id: 'council-artifacts', label: 'AI Artifact check', description: 'Natural voice, no clichés', stage: 'council_review' },
  
  // Revisions
  { id: 'revisions-style', label: 'Style issues fixed', stage: 'revisions' },
  { id: 'revisions-facts', label: 'Facts corrected/sourced', stage: 'revisions' },
  { id: 'revisions-hallucinations', label: 'Hallucinations removed', stage: 'revisions' },
  { id: 'revisions-artifacts', label: 'AI artifacts cleaned', stage: 'revisions' },
  
  // Fact Check
  { id: 'factcheck-stats', label: 'Statistics sourced', stage: 'fact_check' },
  { id: 'factcheck-quotes', label: 'Quotes verified', stage: 'fact_check' },
  { id: 'factcheck-refs', label: 'References are real', stage: 'fact_check' },
  
  // Final Polish
  { id: 'polish-read', label: 'Final read-through', description: 'Read aloud if possible', stage: 'final_polish' },
  { id: 'polish-format', label: 'Formatting consistent', stage: 'final_polish' },
  { id: 'polish-title', label: 'Title is compelling', stage: 'final_polish' },
  { id: 'polish-opening', label: 'Opening hooks reader', stage: 'final_polish' },
  { id: 'polish-conclusion', label: 'Conclusion is satisfying', stage: 'final_polish' },
  
  // Complete
  { id: 'complete-saved', label: 'Final version saved', stage: 'complete' },
  { id: 'complete-backed', label: 'Document backed up', stage: 'complete' },
];

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  setup: '🚀 Setup',
  outline: '📋 Outline',
  drafting: '✍️ Drafting',
  draft_complete: '📝 Draft Complete',
  self_review: '👀 Self Review',
  council_review: '👥 Council Review',
  revisions: '🔧 Revisions',
  fact_check: '🔍 Fact Check',
  final_polish: '✨ Final Polish',
  complete: '✅ Complete',
};

export const STAGE_ORDER: WorkflowStage[] = [
  'setup',
  'outline',
  'drafting',
  'draft_complete',
  'self_review',
  'council_review',
  'revisions',
  'fact_check',
  'final_polish',
  'complete',
];

interface WorkflowState {
  // UI State
  showWorkflowPanel: boolean;
  workflowPanelWidth: number;
  
  // Workflow data per document
  documentWorkflows: Record<string, DocumentWorkflow>;
  
  // Actions
  toggleWorkflowPanel: () => void;
  setWorkflowPanelWidth: (width: number) => void;
  
  // Document workflow actions
  initWorkflow: (documentPath: string) => void;
  toggleChecklistItem: (documentPath: string, itemId: string) => void;
  setCurrentStage: (documentPath: string, stage: WorkflowStage) => void;
  setNotes: (documentPath: string, notes: string) => void;
  resetWorkflow: (documentPath: string) => void;
  
  // Getters
  getWorkflow: (documentPath: string) => DocumentWorkflow | null;
  getProgress: (documentPath: string) => { completed: number; total: number; percentage: number };
  getCurrentStageItems: (documentPath: string) => WorkflowChecklistItem[];
  getWorkflowSummary: (documentPath: string) => string; // For AI context
}

function createDefaultChecklist(): WorkflowChecklistItem[] {
  return DEFAULT_CHECKLIST.map(item => ({
    ...item,
    completed: false,
  }));
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Initial state
      showWorkflowPanel: false,
      workflowPanelWidth: 320,
      documentWorkflows: {},
      
      // UI Actions
      toggleWorkflowPanel: () => set((state) => ({ showWorkflowPanel: !state.showWorkflowPanel })),
      setWorkflowPanelWidth: (width) => set({ workflowPanelWidth: width }),
      
      // Document workflow actions
      initWorkflow: (documentPath) => {
        const existing = get().documentWorkflows[documentPath];
        if (existing) return; // Already initialized
        
        set((state) => ({
          documentWorkflows: {
            ...state.documentWorkflows,
            [documentPath]: {
              documentPath,
              currentStage: 'setup',
              checklist: createDefaultChecklist(),
              startedAt: new Date(),
              lastUpdated: new Date(),
              notes: '',
            },
          },
        }));
      },
      
      toggleChecklistItem: (documentPath, itemId) => {
        set((state) => {
          const workflow = state.documentWorkflows[documentPath];
          if (!workflow) return state;
          
          const updatedChecklist = workflow.checklist.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                completed: !item.completed,
                completedAt: !item.completed ? new Date() : undefined,
              };
            }
            return item;
          });
          
          // Auto-advance stage if all items in current stage are complete
          const currentStageItems = updatedChecklist.filter(i => i.stage === workflow.currentStage);
          const allCurrentComplete = currentStageItems.every(i => i.completed);
          let newStage = workflow.currentStage;
          
          if (allCurrentComplete) {
            const currentIndex = STAGE_ORDER.indexOf(workflow.currentStage);
            if (currentIndex < STAGE_ORDER.length - 1) {
              newStage = STAGE_ORDER[currentIndex + 1];
            }
          }
          
          return {
            documentWorkflows: {
              ...state.documentWorkflows,
              [documentPath]: {
                ...workflow,
                checklist: updatedChecklist,
                currentStage: newStage,
                lastUpdated: new Date(),
              },
            },
          };
        });
      },
      
      setCurrentStage: (documentPath, stage) => {
        set((state) => {
          const workflow = state.documentWorkflows[documentPath];
          if (!workflow) return state;
          
          return {
            documentWorkflows: {
              ...state.documentWorkflows,
              [documentPath]: {
                ...workflow,
                currentStage: stage,
                lastUpdated: new Date(),
              },
            },
          };
        });
      },
      
      setNotes: (documentPath, notes) => {
        set((state) => {
          const workflow = state.documentWorkflows[documentPath];
          if (!workflow) return state;
          
          return {
            documentWorkflows: {
              ...state.documentWorkflows,
              [documentPath]: {
                ...workflow,
                notes,
                lastUpdated: new Date(),
              },
            },
          };
        });
      },
      
      resetWorkflow: (documentPath) => {
        set((state) => ({
          documentWorkflows: {
            ...state.documentWorkflows,
            [documentPath]: {
              documentPath,
              currentStage: 'setup',
              checklist: createDefaultChecklist(),
              startedAt: new Date(),
              lastUpdated: new Date(),
              notes: '',
            },
          },
        }));
      },
      
      // Getters
      getWorkflow: (documentPath) => {
        return get().documentWorkflows[documentPath] || null;
      },
      
      getProgress: (documentPath) => {
        const workflow = get().documentWorkflows[documentPath];
        if (!workflow) return { completed: 0, total: 0, percentage: 0 };
        
        const completed = workflow.checklist.filter(i => i.completed).length;
        const total = workflow.checklist.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return { completed, total, percentage };
      },
      
      getCurrentStageItems: (documentPath) => {
        const workflow = get().documentWorkflows[documentPath];
        if (!workflow) return [];
        
        return workflow.checklist.filter(i => i.stage === workflow.currentStage);
      },
      
      getWorkflowSummary: (documentPath) => {
        const workflow = get().documentWorkflows[documentPath];
        if (!workflow) return 'No workflow started for this document.';
        
        const progress = get().getProgress(documentPath);
        const stageLabel = STAGE_LABELS[workflow.currentStage];
        
        const completedItems = workflow.checklist.filter(i => i.completed).map(i => i.label);
        const pendingInStage = workflow.checklist
          .filter(i => i.stage === workflow.currentStage && !i.completed)
          .map(i => i.label);
        
        let summary = `Document Workflow Status:
- Current Stage: ${stageLabel}
- Overall Progress: ${progress.percentage}% (${progress.completed}/${progress.total} items)
`;
        
        if (pendingInStage.length > 0) {
          summary += `\nPending in current stage:\n${pendingInStage.map(i => `- [ ] ${i}`).join('\n')}`;
        }
        
        if (completedItems.length > 0 && completedItems.length <= 10) {
          summary += `\n\nRecently completed:\n${completedItems.slice(-5).map(i => `- [x] ${i}`).join('\n')}`;
        }
        
        if (workflow.notes) {
          summary += `\n\nUser notes: ${workflow.notes}`;
        }
        
        return summary;
      },
    }),
    {
      name: 'sanctum-writer-workflow',
      partialize: (state) => ({
        showWorkflowPanel: state.showWorkflowPanel,
        workflowPanelWidth: state.workflowPanelWidth,
        documentWorkflows: state.documentWorkflows,
      }),
    }
  )
);





