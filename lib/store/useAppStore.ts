import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Document, FileNode, Selection } from '@/types';

interface AppState {
  // Workspace
  workspacePath: string;
  files: FileNode[];
  setWorkspacePath: (path: string) => void;
  setFiles: (files: FileNode[]) => void;
  
  // Current document
  currentDocument: Document | null;
  openDocuments: Document[];
  selection: Selection | null;
  cursorPosition: { line: number; col: number };
  
  setCurrentDocument: (doc: Document | null) => void;
  updateDocumentContent: (content: string) => void;
  setSelection: (selection: Selection | null) => void;
  setCursorPosition: (pos: { line: number; col: number }) => void;
  markDocumentDirty: (isDirty: boolean) => void;
  
  openDocument: (doc: Document) => void;
  closeDocument: (path: string) => void;
  
  // UI State
  sidebarWidth: number;
  chatPanelWidth: number;
  showPreview: boolean;
  showChat: boolean;
  focusMode: boolean;
  
  setSidebarWidth: (width: number) => void;
  setChatPanelWidth: (width: number) => void;
  togglePreview: () => void;
  toggleChat: () => void;
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;
  
  // LLM Settings
  provider: 'ollama' | 'lmstudio';
  model: string;
  availableModels: Array<{ id: string; name: string; provider: string }>;
  
  setProvider: (provider: 'ollama' | 'lmstudio') => void;
  setModel: (model: string) => void;
  setAvailableModels: (models: Array<{ id: string; name: string; provider: string }>) => void;
  
  // Notifications
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Workspace
      workspacePath: './documents',
      files: [],
      setWorkspacePath: (path) => set({ workspacePath: path }),
      setFiles: (files) => set({ files }),
      
      // Current document
      currentDocument: null,
      openDocuments: [],
      selection: null,
      cursorPosition: { line: 1, col: 1 },
      
      setCurrentDocument: (doc) => set({ currentDocument: doc }),
      updateDocumentContent: (content) => {
        const { currentDocument } = get();
        if (currentDocument) {
          set({
            currentDocument: { ...currentDocument, content, isDirty: true },
            openDocuments: get().openDocuments.map((d) =>
              d.path === currentDocument.path ? { ...d, content, isDirty: true } : d
            ),
          });
        }
      },
      setSelection: (selection) => set({ selection }),
      setCursorPosition: (pos) => set({ cursorPosition: pos }),
      markDocumentDirty: (isDirty) => {
        const { currentDocument } = get();
        if (currentDocument) {
          set({
            currentDocument: { ...currentDocument, isDirty },
            openDocuments: get().openDocuments.map((d) =>
              d.path === currentDocument.path ? { ...d, isDirty } : d
            ),
          });
        }
      },
      
      openDocument: (doc) => {
        const { openDocuments } = get();
        const existing = openDocuments.find((d) => d.path === doc.path);
        if (!existing) {
          set({ openDocuments: [...openDocuments, doc], currentDocument: doc });
        } else {
          set({ currentDocument: existing });
        }
      },
      closeDocument: (path) => {
        const { openDocuments, currentDocument } = get();
        const newDocs = openDocuments.filter((d) => d.path !== path);
        const newCurrent = currentDocument?.path === path
          ? newDocs[newDocs.length - 1] || null
          : currentDocument;
        set({ openDocuments: newDocs, currentDocument: newCurrent });
      },
      
      // UI State
      sidebarWidth: 240,
      chatPanelWidth: 360,
      showPreview: false,
      showChat: true,
      focusMode: false,
      
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setChatPanelWidth: (width) => set({ chatPanelWidth: width }),
      togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
      toggleChat: () => set((state) => ({ showChat: !state.showChat })),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      setFocusMode: (enabled) => set({ focusMode: enabled }),
      
      // LLM Settings - Default to qwen3:latest
      provider: 'ollama',
      model: 'qwen3:latest',
      availableModels: [],
      
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      setAvailableModels: (models) => set({ availableModels: models }),
      
      // Notifications
      toast: null,
      showToast: (message, type) => {
        set({ toast: { message, type } });
        setTimeout(() => {
          set({ toast: null });
        }, 3000);
      },
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'sanctum-writer-app', // localStorage key
      partialize: (state) => ({
        // Only persist these values
        provider: state.provider,
        model: state.model,
        sidebarWidth: state.sidebarWidth,
        chatPanelWidth: state.chatPanelWidth,
        showPreview: state.showPreview,
        showChat: state.showChat,
      }),
    }
  )
);

