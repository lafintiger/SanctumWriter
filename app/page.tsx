'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EditorView } from '@codemirror/view';
import { Editor, FileTree, Chat, Header, Preview, Toast, Settings, CouncilPanel, ResearchPanel, ImageStudioPanel } from './components';
import { WorkflowPanel } from './components/Workflow/WorkflowPanel';
import { WritingStatsBar } from './components/Editor/WritingStatsBar';
import { OutlinePanel } from './components/Outline/OutlinePanel';
import { PromptLibraryPanel } from './components/PromptLibrary/PromptLibraryPanel';
import { KnowledgeBasePanel } from './components/KnowledgeBase/KnowledgeBasePanel';
import { SessionMemoryPanel } from './components/SessionMemory/SessionMemoryPanel';
import { CitationPanel } from './components/Citations/CitationPanel';
import { ExportModal } from './components/Export/ExportModal';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCouncilStore } from '@/lib/store/useCouncilStore';
import { useSearchStore } from '@/lib/store/useSearchStore';
import { useWorkflowStore } from '@/lib/store/useWorkflowStore';
import { useOutlineStore } from '@/lib/store/useOutlineStore';
import { usePromptLibraryStore } from '@/lib/store/usePromptLibraryStore';
import { useRAGStore } from '@/lib/store/useRAGStore';
import { useCitationStore } from '@/lib/store/useCitationStore';
import { useImageStore } from '@/lib/store/useImageStore';
import { cn } from '@/lib/utils';

export default function Home() {
  const {
    sidebarWidth,
    chatPanelWidth,
    showChat,
    showPreview,
    setSidebarWidth,
    setChatPanelWidth,
    focusMode,
    toggleFocusMode,
  } = useAppStore();
  
  const { showCouncilPanel } = useCouncilStore();
  const { showResearchPanel } = useSearchStore();
  const { showWorkflowPanel } = useWorkflowStore();
  const { showOutlinePanel } = useOutlineStore();
  const { showPromptLibrary } = usePromptLibraryStore();
  const { showKnowledgeBasePanel, showSessionMemoryPanel } = useRAGStore();
  const { showCitationPanel } = useCitationStore();
  const { showImageStudioPanel } = useImageStore();
  
  // Keyboard shortcuts for focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 or Cmd/Ctrl+Shift+F for focus mode
      if (e.key === 'F11' || (e.key === 'f' && (e.metaKey || e.ctrlKey) && e.shiftKey)) {
        e.preventDefault();
        toggleFocusMode();
      }
      // Escape to exit focus mode
      if (e.key === 'Escape' && focusMode) {
        toggleFocusMode();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, toggleFocusMode]);

  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isProjectExport, setIsProjectExport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Listen for project export event
  useEffect(() => {
    const handleProjectExport = () => {
      setIsProjectExport(true);
      setShowExportModal(true);
    };
    
    window.addEventListener('sanctum-export-project', handleProjectExport);
    return () => window.removeEventListener('sanctum-export-project', handleProjectExport);
  }, []);

  const handleEditorReady = useCallback((view: EditorView) => {
    setEditorView(view);
  }, []);

  // Navigate to a specific line in the editor (for outline)
  const handleNavigateToLine = useCallback((line: number) => {
    if (editorView) {
      const doc = editorView.state.doc;
      if (line >= 1 && line <= doc.lines) {
        const lineInfo = doc.line(line);
        editorView.dispatch({
          selection: { anchor: lineInfo.from },
          scrollIntoView: true,
        });
        editorView.focus();
      }
    }
  }, [editorView]);

  // Handle prompt selection from library
  const handlePromptSelect = useCallback((promptContent: string) => {
    // Dispatch custom event for Chat component to receive
    const event = new CustomEvent('sanctum-insert-prompt', {
      detail: { content: promptContent }
    });
    window.dispatchEvent(event);
  }, []);

  // Handle sidebar resize
  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  // Handle chat panel resize
  const handleChatMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChat(true);
  }, []);

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isResizingSidebar) {
        const newWidth = Math.max(160, Math.min(400, e.clientX));
        setSidebarWidth(newWidth);
      }

      if (isResizingChat) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(280, Math.min(500, containerRect.right - e.clientX));
        setChatPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingChat(false);
    };

    if (isResizingSidebar || isResizingChat) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, isResizingChat, setSidebarWidth, setChatPanelWidth]);

  return (
    <div className={cn(
      "h-screen flex flex-col overflow-hidden",
      focusMode && "focus-mode"
    )} ref={containerRef}>
      {/* Header - hidden in focus mode */}
      {!focusMode && <Header />}

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar - hidden in focus mode */}
        {sidebarWidth > 0 && !focusMode && (
          <>
            <div
              className="flex-shrink-0"
              style={{ width: sidebarWidth }}
            >
              <FileTree />
            </div>
            <div
              className={cn(
                "resize-handle resize-handle-vertical",
                isResizingSidebar && "active"
              )}
              onMouseDown={handleSidebarMouseDown}
            />
          </>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor row */}
          <div className="flex-1 flex min-h-0">
            {/* Editor */}
            <div className={cn(
              'flex-1 flex flex-col min-w-0',
              showPreview && !focusMode && 'border-r border-border'
            )}>
              <Editor onEditorReady={handleEditorReady} />
            </div>

            {/* Preview - hidden in focus mode */}
            {showPreview && !focusMode && (
              <div className="flex-1 min-w-0">
                <Preview />
              </div>
            )}
          </div>
          
          {/* Writing Stats Bar */}
          <WritingStatsBar />
        </div>

        {/* Council Panel - hidden in focus mode */}
        {showCouncilPanel && !focusMode && (
          <div className="flex-shrink-0 w-80">
            <CouncilPanel />
          </div>
        )}
        
        {/* Research Panel - hidden in focus mode */}
        {showResearchPanel && !focusMode && (
          <div className="flex-shrink-0">
            <ResearchPanel />
          </div>
        )}
        
        {/* Workflow Panel - hidden in focus mode */}
        {showWorkflowPanel && !focusMode && (
          <div className="flex-shrink-0">
            <WorkflowPanel />
          </div>
        )}
        
        {/* Outline Panel - hidden in focus mode */}
        {showOutlinePanel && !focusMode && (
          <div className="flex-shrink-0">
            <OutlinePanel onNavigateToLine={handleNavigateToLine} />
          </div>
        )}
        
        {/* Prompt Library - hidden in focus mode */}
        {showPromptLibrary && !focusMode && (
          <div className="flex-shrink-0">
            <PromptLibraryPanel onSelectPrompt={handlePromptSelect} />
          </div>
        )}
        
        {/* Knowledge Base Panel - hidden in focus mode */}
        {showKnowledgeBasePanel && !focusMode && (
          <div className="flex-shrink-0 w-80">
            <KnowledgeBasePanel />
          </div>
        )}
        
        {/* Session Memory Panel - hidden in focus mode */}
        {showSessionMemoryPanel && !focusMode && (
          <div className="flex-shrink-0 w-80">
            <SessionMemoryPanel />
          </div>
        )}
        
        {/* Citation Panel - hidden in focus mode */}
        {showCitationPanel && !focusMode && (
          <div className="flex-shrink-0">
            <CitationPanel />
          </div>
        )}
        
        {/* Image Studio Panel - hidden in focus mode */}
        {showImageStudioPanel && !focusMode && (
          <div className="flex-shrink-0">
            <ImageStudioPanel />
          </div>
        )}

        {/* Chat panel - hidden in focus mode */}
        {showChat && !focusMode && (
          <>
            <div
              className={cn(
                "resize-handle resize-handle-vertical",
                isResizingChat && "active"
              )}
              onMouseDown={handleChatMouseDown}
            />
            <div
              className="flex-shrink-0"
              style={{ width: chatPanelWidth }}
            >
              <Chat editorView={editorView} />
            </div>
          </>
        )}
      </div>

      {/* Focus mode exit hint */}
      {focusMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-sidebar-bg/90 backdrop-blur border border-border rounded-full text-xs text-text-secondary opacity-0 hover:opacity-100 transition-opacity">
          Press <kbd className="px-1.5 py-0.5 bg-border rounded mx-1">Esc</kbd> or <kbd className="px-1.5 py-0.5 bg-border rounded mx-1">F11</kbd> to exit focus mode
        </div>
      )}

      {/* Toast notifications */}
      <Toast />
      
      {/* Settings modal */}
      <Settings />
      
      {/* Export modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setIsProjectExport(false);
        }}
        isProjectExport={isProjectExport}
      />
    </div>
  );
}

