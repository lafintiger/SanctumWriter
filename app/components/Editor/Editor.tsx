'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCouncilStore } from '@/lib/store/useCouncilStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import { debounce } from '@/lib/utils';
import { Selection } from '@/types';
import { reviewAnnotationsExtension, updateReviewComments } from '@/lib/editor/reviewAnnotations';

interface EditorProps {
  onEditorReady?: (view: EditorView) => void;
}

export function Editor({ onEditorReady }: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const {
    currentDocument,
    updateDocumentContent,
    setSelection,
    setCursorPosition,
    showToast,
  } = useAppStore();
  
  const { currentSession } = useCouncilStore();
  const { workspacePath } = useSettingsStore();

  // Expose editor view to parent
  useEffect(() => {
    if (editorRef.current?.view && onEditorReady) {
      onEditorReady(editorRef.current.view);
    }
  }, [editorRef.current?.view, onEditorReady]);
  
  // Update review annotations when comments change
  useEffect(() => {
    if (editorRef.current?.view && currentSession?.comments) {
      updateReviewComments(editorRef.current.view, currentSession.comments);
    } else if (editorRef.current?.view) {
      updateReviewComments(editorRef.current.view, []);
    }
  }, [currentSession?.comments]);
  
  // Listen for citation insertions
  useEffect(() => {
    const handleCitationInsert = (e: CustomEvent<{ citation: string }>) => {
      const view = editorRef.current?.view;
      if (!view) return;
      
      const { from } = view.state.selection.main;
      view.dispatch({
        changes: { from, insert: e.detail.citation },
        selection: { anchor: from + e.detail.citation.length },
      });
      view.focus();
    };
    
    window.addEventListener('sanctum-insert-citation', handleCitationInsert as EventListener);
    return () => {
      window.removeEventListener('sanctum-insert-citation', handleCitationInsert as EventListener);
    };
  }, []);

  // Auto-save with debounce
  const saveDocument = useCallback(
    debounce(async (content: string, path: string) => {
      try {
        const workspace = useSettingsStore.getState().workspacePath;
        const response = await fetch(`/api/files/${path}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, workspace }),
        });
        
        if (response.ok) {
          useAppStore.getState().markDocumentDirty(false);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000),
    []
  );

  const handleChange = useCallback((value: string) => {
    updateDocumentContent(value);
    
    if (currentDocument?.path) {
      saveDocument(value, currentDocument.path);
    }
  }, [currentDocument?.path, updateDocumentContent, saveDocument]);

  const handleSelectionChange = useCallback((view: EditorView) => {
    const selection = view.state.selection.main;
    const doc = view.state.doc;
    
    // Update cursor position
    const line = doc.lineAt(selection.head);
    setCursorPosition({
      line: line.number,
      col: selection.head - line.from + 1,
    });

    // Update selection if there is one
    if (selection.from !== selection.to) {
      const fromLine = doc.lineAt(selection.from);
      const toLine = doc.lineAt(selection.to);
      const selectedText = doc.sliceString(selection.from, selection.to);

      const sel: Selection = {
        from: selection.from,
        to: selection.to,
        fromLine: fromLine.number,
        toLine: toLine.number,
        text: selectedText,
      };
      setSelection(sel);
    } else {
      setSelection(null);
    }
  }, [setCursorPosition, setSelection]);

  // Manual save handler
  const handleSave = useCallback(async () => {
    if (!currentDocument) return;
    
    try {
      const response = await fetch(`/api/files/${currentDocument.path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentDocument.content, workspace: workspacePath }),
      });
      
      if (response.ok) {
        useAppStore.getState().markDocumentDirty(false);
        showToast('Document saved', 'success');
      } else {
        showToast('Failed to save document', 'error');
      }
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save document', 'error');
    }
  }, [currentDocument, showToast, workspacePath]);

  // Custom keymap for save
  const customKeymap = keymap.of([
    {
      key: 'Mod-s',
      run: () => {
        handleSave();
        return true;
      },
    },
  ]);

  if (!currentDocument) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg text-text-secondary">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-lg">Select a file to start editing</p>
          <p className="text-sm mt-2">or create a new document</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-editor-bg">
      <CodeMirror
        ref={editorRef}
        value={currentDocument.content}
        onChange={handleChange}
        theme={oneDark}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          customKeymap,
          EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
              handleSelectionChange(update.view);
            }
          }),
          EditorView.lineWrapping,
          ...reviewAnnotationsExtension,
        ]}
        className="flex-1 min-h-0 overflow-auto"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightSelectionMatches: true,
        }}
      />
    </div>
  );
}

