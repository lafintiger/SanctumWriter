'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { 
  FileText, 
  PanelLeftClose, 
  PanelLeft,
  MessageSquare,
  Eye,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
  ChevronDown,
  Users,
  Search,
  ListChecks,
  Focus,
  List,
  BookOpen,
  Download,
  FileUp,
  Database,
  Brain,
  BookMarked,
  Image,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/useAppStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import { useCouncilStore } from '@/lib/store/useCouncilStore';
import { useSearchStore } from '@/lib/store/useSearchStore';
import { useWorkflowStore } from '@/lib/store/useWorkflowStore';
import { useOutlineStore } from '@/lib/store/useOutlineStore';
import { usePromptLibraryStore } from '@/lib/store/usePromptLibraryStore';
import { useRAGStore } from '@/lib/store/useRAGStore';
import { useCitationStore } from '@/lib/store/useCitationStore';
import { useImageStore } from '@/lib/store/useImageStore';
import { ExportModal } from '../Export/ExportModal';
import { ConvertPanel } from '../Convert/ConvertPanel';

export function Header() {
  const {
    currentDocument,
    cursorPosition,
    showChat,
    showPreview,
    toggleChat,
    togglePreview,
    provider,
    setProvider,
    model,
    setModel,
    availableModels,
    setAvailableModels,
    sidebarWidth,
    setSidebarWidth,
    focusMode,
    toggleFocusMode,
  } = useAppStore();

  const { toggleSettings, writingPreset, contextLength, contextUsed } = useSettingsStore();
  const { showCouncilPanel, toggleCouncilPanel, getEnabledReviewers } = useCouncilStore();
  const { showResearchPanel, toggleResearchPanel, engineStatus } = useSearchStore();
  const { showWorkflowPanel, toggleWorkflowPanel, getProgress } = useWorkflowStore();
  const { showOutlinePanel, toggleOutlinePanel, outline } = useOutlineStore();
  const { showPromptLibrary, togglePromptLibrary } = usePromptLibraryStore();
  const { 
    showKnowledgeBasePanel, 
    toggleKnowledgeBasePanel, 
    showSessionMemoryPanel, 
    toggleSessionMemoryPanel,
    ragSettings,
    sessionMemorySettings,
    indexedDocuments,
  } = useRAGStore();
  
  const {
    showCitationPanel,
    toggleCitationPanel,
    getAllCitations,
  } = useCitationStore();
  
  const {
    showImageStudioPanel,
    toggleImageStudioPanel,
    status: imageStatus,
  } = useImageStore();
  
  const citationCount = currentDocument ? getAllCitations(currentDocument.path).length : 0;
  const enabledReviewersCount = getEnabledReviewers().length;
  const workflowProgress = currentDocument ? getProgress(currentDocument.path) : null;
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConvertPanel, setShowConvertPanel] = useState(false);
  
  const [providerStatus, setProviderStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  const checkProviderStatus = useCallback(async () => {
    setProviderStatus('checking');
    try {
      const response = await fetch(`/api/models?provider=${provider}`);
      const data = await response.json();
      
      if (data.available) {
        setProviderStatus('connected');
        setAvailableModels(data.models);
        
        // Set default model if current model not available
        if (data.models.length > 0 && !data.models.find((m: { id: string }) => m.id === model)) {
          setModel(data.models[0].id);
        }
      } else {
        setProviderStatus('disconnected');
        setAvailableModels([]);
      }
    } catch {
      setProviderStatus('disconnected');
      setAvailableModels([]);
    }
  }, [provider, model, setAvailableModels, setModel]);

  useEffect(() => {
    checkProviderStatus();
    const interval = setInterval(checkProviderStatus, 30000);
    return () => clearInterval(interval);
  }, [checkProviderStatus]);

  const toggleSidebar = () => {
    setSidebarWidth(sidebarWidth > 0 ? 0 : 240);
  };

  return (
    <header className="h-12 bg-sidebar-bg border-b border-border flex items-center justify-between px-3">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary"
          title={sidebarWidth > 0 ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarWidth > 0 ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeft className="w-5 h-5" />
          )}
        </button>
        
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          <span className="font-semibold text-text-primary">SanctumWriter</span>
        </div>

        {currentDocument && (
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-text-secondary">{currentDocument.name}</span>
            {currentDocument.isDirty && (
              <span className="w-2 h-2 rounded-full bg-accent" title="Unsaved changes" />
            )}
          </div>
        )}
      </div>

      {/* Center section - Provider & Model */}
      <div className="flex items-center gap-2">
        {/* Provider selector */}
        <div className="relative">
          <button
            onClick={() => setShowProviderMenu(!showProviderMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-editor-bg border border-border rounded hover:border-accent text-sm"
          >
            {providerStatus === 'connected' ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : providerStatus === 'disconnected' ? (
              <WifiOff className="w-4 h-4 text-red-500" />
            ) : (
              <Wifi className="w-4 h-4 text-text-secondary animate-pulse" />
            )}
            <span className="text-text-primary capitalize">{provider}</span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>

          {showProviderMenu && (
            <div className="absolute top-full left-0 mt-1 bg-sidebar-bg border border-border rounded shadow-lg z-50">
              {(['ollama', 'lmstudio'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setProvider(p);
                    setShowProviderMenu(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-border capitalize',
                    provider === p ? 'text-accent' : 'text-text-primary'
                  )}
                >
                  {p === 'lmstudio' ? 'LM Studio' : p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            disabled={availableModels.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-editor-bg border border-border rounded hover:border-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-text-primary max-w-[150px] truncate">
              {availableModels.length > 0 ? model : 'No models'}
            </span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>

          {showModelMenu && availableModels.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-sidebar-bg border border-border rounded shadow-lg z-50 max-h-60 overflow-auto min-w-[200px]">
              {availableModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setModel(m.id);
                    setShowModelMenu(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-border truncate',
                    model === m.id ? 'text-accent' : 'text-text-primary'
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {currentDocument && (
          <span className="text-xs text-text-secondary mr-2">
            Ln {cursorPosition.line}, Col {cursorPosition.col}
          </span>
        )}
        
        <button
          onClick={togglePreview}
          className={cn(
            'p-1.5 rounded',
            showPreview
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Toggle preview"
        >
          <Eye className="w-5 h-5" />
        </button>
        
        <button
          onClick={toggleChat}
          className={cn(
            'p-1.5 rounded',
            showChat
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Toggle chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        
        <button
          onClick={toggleCouncilPanel}
          className={cn(
            'p-1.5 rounded relative',
            showCouncilPanel
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Council of Writers"
        >
          <Users className="w-5 h-5" />
          {enabledReviewersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] rounded-full flex items-center justify-center">
              {enabledReviewersCount}
            </span>
          )}
        </button>
        
        <button
          onClick={toggleResearchPanel}
          className={cn(
            'p-1.5 rounded relative',
            showResearchPanel
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Research"
        >
          <Search className="w-5 h-5" />
          {(engineStatus.perplexica || engineStatus.searxng) && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </button>
        
        <button
          onClick={toggleWorkflowPanel}
          className={cn(
            'p-1.5 rounded relative',
            showWorkflowPanel
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Writing Workflow"
        >
          <ListChecks className="w-5 h-5" />
          {workflowProgress && workflowProgress.percentage > 0 && workflowProgress.percentage < 100 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] rounded-full flex items-center justify-center">
              {workflowProgress.percentage}%
            </span>
          )}
          {workflowProgress && workflowProgress.percentage === 100 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </button>
        
        <button
          onClick={toggleOutlinePanel}
          className={cn(
            'p-1.5 rounded relative',
            showOutlinePanel
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Document Outline"
        >
          <List className="w-5 h-5" />
          {outline.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
          )}
        </button>
        
        <button
          onClick={togglePromptLibrary}
          className={cn(
            'p-1.5 rounded',
            showPromptLibrary
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Prompt Library"
        >
          <BookOpen className="w-5 h-5" />
        </button>
        
        <button
          onClick={toggleKnowledgeBasePanel}
          className={cn(
            'p-1.5 rounded relative',
            showKnowledgeBasePanel
              ? 'bg-green-500/20 text-green-500'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Knowledge Base (RAG)"
        >
          <Database className="w-5 h-5" />
          {ragSettings.enabled && indexedDocuments.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </button>
        
        <button
          onClick={toggleSessionMemoryPanel}
          className={cn(
            'p-1.5 rounded relative',
            showSessionMemoryPanel
              ? 'bg-purple-500/20 text-purple-500'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Session Memory"
        >
          <Brain className="w-5 h-5" />
          {sessionMemorySettings.enabled && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full" />
          )}
        </button>
        
        <button
          onClick={toggleCitationPanel}
          className={cn(
            'p-1.5 rounded relative',
            showCitationPanel
              ? 'bg-amber-500/20 text-amber-500'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Citations & Bibliography"
        >
          <BookMarked className="w-5 h-5" />
          {citationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {citationCount}
            </span>
          )}
        </button>
        
        <button
          onClick={toggleImageStudioPanel}
          className={cn(
            'p-1.5 rounded relative',
            showImageStudioPanel
              ? 'bg-pink-500/20 text-pink-500'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Image Studio (ComfyUI)"
        >
          <Image className="w-5 h-5" />
          {imageStatus.isGenerating && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
          )}
        </button>
        
        <button
          onClick={() => setShowExportModal(true)}
          disabled={!currentDocument}
          className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export Document"
        >
          <Download className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => setShowConvertPanel(true)}
          className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary"
          title="Convert PDF to Markdown"
        >
          <FileUp className="w-5 h-5" />
        </button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <button
          onClick={toggleFocusMode}
          className={cn(
            'p-1.5 rounded',
            focusMode
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-border text-text-secondary hover:text-text-primary'
          )}
          title="Focus Mode (F11)"
        >
          <Focus className="w-5 h-5" />
        </button>

        <button
          onClick={toggleSettings}
          className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary"
          title="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
        
        {/* Context usage indicator */}
        <div className="flex items-center gap-1.5 ml-2 px-2 py-1 bg-editor-bg rounded text-xs">
          <span className="text-text-secondary capitalize">{writingPreset}</span>
          <span className="text-border">|</span>
          <span className="text-text-secondary">
            {contextUsed > 0 ? `${Math.round(contextUsed / 1000)}k` : '0'}/{Math.round(contextLength / 1000)}k
          </span>
        </div>
      </div>

      {/* Click outside handler */}
      {(showProviderMenu || showModelMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowProviderMenu(false);
            setShowModelMenu(false);
          }}
        />
      )}
      
      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
      />
      
      {/* Convert Panel */}
      {showConvertPanel && (
        <ConvertPanel onClose={() => setShowConvertPanel(false)} />
      )}
    </header>
  );
}

