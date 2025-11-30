'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EditorView } from '@codemirror/view';
import { Editor, FileTree, Chat, Header, Preview, Toast, Settings, CouncilPanel } from './components';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCouncilStore } from '@/lib/store/useCouncilStore';
import { cn } from '@/lib/utils';

export default function Home() {
  const {
    sidebarWidth,
    chatPanelWidth,
    showChat,
    showPreview,
    setSidebarWidth,
    setChatPanelWidth,
  } = useAppStore();
  
  const { showCouncilPanel } = useCouncilStore();

  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEditorReady = useCallback((view: EditorView) => {
    setEditorView(view);
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
    <div className="h-screen flex flex-col overflow-hidden" ref={containerRef}>
      {/* Header */}
      <Header />

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        {sidebarWidth > 0 && (
          <>
            <div
              className="flex-shrink-0 border-r border-border"
              style={{ width: sidebarWidth }}
            >
              <FileTree />
            </div>
            <div
              className="resize-handle resize-handle-vertical right-0"
              onMouseDown={handleSidebarMouseDown}
            />
          </>
        )}

        {/* Editor area */}
        <div className="flex-1 flex min-w-0">
          {/* Editor */}
          <div className={cn(
            'flex-1 flex flex-col min-w-0',
            showPreview && 'border-r border-border'
          )}>
            <Editor onEditorReady={handleEditorReady} />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="flex-1 min-w-0">
              <Preview />
            </div>
          )}
        </div>

        {/* Council Panel */}
        {showCouncilPanel && (
          <div className="flex-shrink-0 w-80">
            <CouncilPanel />
          </div>
        )}

        {/* Chat panel */}
        {showChat && (
          <>
            <div
              className="resize-handle resize-handle-vertical left-0"
              onMouseDown={handleChatMouseDown}
            />
            <div
              className="flex-shrink-0 border-l border-border"
              style={{ width: chatPanelWidth }}
            >
              <Chat editorView={editorView} />
            </div>
          </>
        )}
      </div>

      {/* Toast notifications */}
      <Toast />
      
      {/* Settings modal */}
      <Settings />
    </div>
  );
}

