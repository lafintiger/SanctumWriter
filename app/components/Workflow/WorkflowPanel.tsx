'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Lightbulb,
  BookOpen,
  FileText,
  Sparkles,
  Target,
  Clock,
  StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/useAppStore';
import {
  useWorkflowStore,
  WorkflowStage,
  STAGE_LABELS,
  STAGE_ORDER,
  WorkflowChecklistItem,
} from '@/lib/store/useWorkflowStore';

// Stage icons
const STAGE_ICONS: Record<WorkflowStage, React.ReactNode> = {
  setup: '🚀',
  outline: '📋',
  drafting: '✍️',
  draft_complete: '📝',
  self_review: '👀',
  council_review: '👥',
  revisions: '🔧',
  fact_check: '🔍',
  final_polish: '✨',
  complete: '✅',
};

export function WorkflowPanel() {
  const {
    showWorkflowPanel,
    toggleWorkflowPanel,
    workflowPanelWidth,
    initWorkflow,
    getWorkflow,
    getProgress,
    toggleChecklistItem,
    setCurrentStage,
    setNotes,
    resetWorkflow,
  } = useWorkflowStore();
  
  const { currentDocument } = useAppStore();
  const [expandedStages, setExpandedStages] = useState<Set<WorkflowStage>>(new Set(['setup']));
  const [showNotes, setShowNotes] = useState(false);
  
  const documentPath = currentDocument?.path || '';
  const workflow = getWorkflow(documentPath);
  const progress = getProgress(documentPath);
  
  // Initialize workflow when document changes
  useEffect(() => {
    if (currentDocument?.path && showWorkflowPanel) {
      initWorkflow(currentDocument.path);
      // Expand current stage
      const wf = getWorkflow(currentDocument.path);
      if (wf) {
        setExpandedStages(new Set([wf.currentStage]));
      }
    }
  }, [currentDocument?.path, showWorkflowPanel, initWorkflow, getWorkflow]);
  
  if (!showWorkflowPanel) return null;
  
  const toggleStageExpanded = (stage: WorkflowStage) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };
  
  const handleCheckItem = (itemId: string) => {
    if (documentPath) {
      toggleChecklistItem(documentPath, itemId);
    }
  };
  
  const handleResetWorkflow = () => {
    if (documentPath && confirm('Reset all workflow progress for this document?')) {
      resetWorkflow(documentPath);
    }
  };
  
  const handleJumpToStage = (stage: WorkflowStage) => {
    if (documentPath) {
      setCurrentStage(documentPath, stage);
      setExpandedStages(new Set([stage]));
    }
  };
  
  // Group checklist items by stage
  const itemsByStage: Record<WorkflowStage, WorkflowChecklistItem[]> = {} as any;
  STAGE_ORDER.forEach(stage => {
    itemsByStage[stage] = workflow?.checklist.filter(i => i.stage === stage) || [];
  });
  
  // Calculate stage completion
  const getStageProgress = (stage: WorkflowStage) => {
    const items = itemsByStage[stage];
    const completed = items.filter(i => i.completed).length;
    return { completed, total: items.length, percentage: items.length > 0 ? Math.round((completed / items.length) * 100) : 0 };
  };
  
  return (
    <div
      className="h-full bg-sidebar-bg border-l border-border flex flex-col"
      style={{ width: workflowPanelWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-text-primary">Workflow</h2>
        </div>
        <button
          onClick={toggleWorkflowPanel}
          className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* No document message */}
      {!currentDocument && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-text-secondary">
            <FileText className="w-12 h-12 mx-auto opacity-50 mb-3" />
            <p>Open a document to track your writing workflow</p>
          </div>
        </div>
      )}
      
      {/* Workflow content */}
      {currentDocument && workflow && (
        <div className="flex-1 overflow-y-auto">
          {/* Progress overview */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Overall Progress</span>
              <span className="text-sm font-medium text-accent">{progress.percentage}%</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
              <span>{progress.completed} of {progress.total} items</span>
              <span>Stage: {STAGE_LABELS[workflow.currentStage]}</span>
            </div>
          </div>
          
          {/* Current stage highlight */}
          <div className="p-4 bg-accent/5 border-b border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{STAGE_ICONS[workflow.currentStage]}</span>
              <span className="font-medium text-text-primary">
                Current: {STAGE_LABELS[workflow.currentStage].replace(/^[^\s]+\s/, '')}
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              {getStageHint(workflow.currentStage)}
            </p>
          </div>
          
          {/* Checklist by stage */}
          <div className="divide-y divide-border">
            {STAGE_ORDER.map((stage) => {
              const stageProgress = getStageProgress(stage);
              const isExpanded = expandedStages.has(stage);
              const isCurrent = workflow.currentStage === stage;
              const isComplete = stageProgress.percentage === 100;
              const stageIndex = STAGE_ORDER.indexOf(stage);
              const currentIndex = STAGE_ORDER.indexOf(workflow.currentStage);
              const isPast = stageIndex < currentIndex;
              
              return (
                <div key={stage} className={cn(isCurrent && 'bg-accent/5')}>
                  {/* Stage header */}
                  <button
                    onClick={() => toggleStageExpanded(stage)}
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-border/50 transition-colors',
                      isCurrent && 'hover:bg-accent/10'
                    )}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-text-tertiary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    )}
                    
                    <span className="text-lg">{STAGE_ICONS[stage]}</span>
                    
                    <span className={cn(
                      'flex-1 text-sm font-medium',
                      isComplete ? 'text-green-400' : 
                      isCurrent ? 'text-accent' : 
                      isPast ? 'text-text-secondary' : 'text-text-tertiary'
                    )}>
                      {STAGE_LABELS[stage].replace(/^[^\s]+\s/, '')}
                    </span>
                    
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      isComplete ? 'bg-green-500/20 text-green-400' :
                      stageProgress.completed > 0 ? 'bg-accent/20 text-accent' :
                      'bg-border text-text-tertiary'
                    )}>
                      {stageProgress.completed}/{stageProgress.total}
                    </span>
                  </button>
                  
                  {/* Stage items */}
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-1">
                      {itemsByStage[stage].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleCheckItem(item.id)}
                          className={cn(
                            'w-full flex items-start gap-2 px-2 py-1.5 rounded text-left transition-colors',
                            item.completed 
                              ? 'hover:bg-green-500/10' 
                              : 'hover:bg-border'
                          )}
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 mt-0.5 text-text-tertiary flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              'text-sm',
                              item.completed ? 'text-text-secondary line-through' : 'text-text-primary'
                            )}>
                              {item.label}
                            </span>
                            {item.description && (
                              <p className="text-xs text-text-tertiary truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                      
                      {/* Jump to stage button */}
                      {!isCurrent && (
                        <button
                          onClick={() => handleJumpToStage(stage)}
                          className="w-full text-xs text-accent hover:underline py-1"
                        >
                          Jump to this stage
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Notes section */}
          <div className="border-t border-border">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-border/50"
            >
              <StickyNote className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">Notes</span>
              {workflow.notes && <span className="text-xs text-accent">•</span>}
            </button>
            
            {showNotes && (
              <div className="px-4 pb-4">
                <textarea
                  value={workflow.notes}
                  onChange={(e) => setNotes(documentPath, e.target.value)}
                  placeholder="Add notes about your progress..."
                  className="w-full h-24 px-3 py-2 bg-editor-bg border border-border rounded text-sm text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none resize-none"
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Footer actions */}
      {currentDocument && workflow && (
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={handleResetWorkflow}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Workflow
          </button>
          
          {/* AI tip */}
          <div className="flex items-start gap-2 p-2 bg-accent/5 rounded text-xs">
            <Lightbulb className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-text-secondary">
              <span className="text-accent">Tip:</span> The AI is aware of your workflow progress and can help guide you through each stage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for stage hints
function getStageHint(stage: WorkflowStage): string {
  switch (stage) {
    case 'setup':
      return 'Configure your model and settings for this writing task.';
    case 'outline':
      return 'Plan your document structure before diving into writing.';
    case 'drafting':
      return 'Focus on getting ideas down. Don\'t worry about perfection yet.';
    case 'draft_complete':
      return 'Great progress! Your main content is captured.';
    case 'self_review':
      return 'Read through and note obvious issues before AI review.';
    case 'council_review':
      return 'Let the Council of Writers analyze your document.';
    case 'revisions':
      return 'Address the feedback from your review.';
    case 'fact_check':
      return 'Verify claims, statistics, and references.';
    case 'final_polish':
      return 'Last touches before your document is complete.';
    case 'complete':
      return 'Congratulations! Your document is ready. 🎉';
    default:
      return '';
  }
}














