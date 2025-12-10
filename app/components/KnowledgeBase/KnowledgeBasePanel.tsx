'use client';

import React, { useState, useCallback } from 'react';
import {
  Database,
  Plus,
  Trash2,
  FileText,
  Globe,
  Clock,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2,
  Download,
  Upload,
  RefreshCw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRAGStore } from '@/lib/store/useRAGStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import {
  indexMarkdownDocument,
  deleteBySource,
  getCollectionStats,
  exportStore,
  importStore,
  checkEmbeddingModel,
  pullEmbeddingModel,
  EMBEDDING_MODELS,
  CollectionName,
} from '@/lib/rag';

const COLLECTION_LABELS: Record<CollectionName, { label: string; icon: React.ReactNode }> = {
  references: { label: 'Reference Documents', icon: <FileText className="w-4 h-4" /> },
  sessions: { label: 'Session Memory', icon: <Clock className="w-4 h-4" /> },
  preferences: { label: 'Preferences', icon: <Settings className="w-4 h-4" /> },
  web_research: { label: 'Web Research', icon: <Globe className="w-4 h-4" /> },
};

export function KnowledgeBasePanel() {
  const [activeTab, setActiveTab] = useState<'documents' | 'settings'>('documents');
  const [expandedCollections, setExpandedCollections] = useState<Set<CollectionName>>(new Set(['references']));
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [modelStatus, setModelStatus] = useState<'checking' | 'available' | 'pulling' | 'error'>('checking');
  const [pullProgress, setPullProgress] = useState('');

  const {
    ragSettings,
    indexedDocuments,
    isIndexing,
    indexingProgress,
    setRAGEnabled,
    setEmbeddingModel,
    setMaxRetrievedChunks,
    setMinSimilarityScore,
    setMaxTokensForContext,
    addIndexedDocument,
    removeIndexedDocument,
    setIsIndexing,
    setIndexingProgress,
    toggleKnowledgeBasePanel,
    clearCollectionData,
  } = useRAGStore();

  // Check embedding model on mount
  React.useEffect(() => {
    checkModel();
  }, [ragSettings.embeddingModel]);

  const checkModel = async () => {
    setModelStatus('checking');
    const available = await checkEmbeddingModel(ragSettings.embeddingModel);
    setModelStatus(available ? 'available' : 'error');
  };

  const handlePullModel = async () => {
    setModelStatus('pulling');
    const success = await pullEmbeddingModel(ragSettings.embeddingModel, (status) => {
      setPullProgress(status);
    });
    setModelStatus(success ? 'available' : 'error');
    setPullProgress('');
  };

  const toggleCollection = (collection: CollectionName) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(collection)) {
        next.delete(collection);
      } else {
        next.add(collection);
      }
      return next;
    });
  };

  const handleAddDocument = async () => {
    if (!newDocContent.trim() || !newDocName.trim()) return;

    setIsIndexing(true);
    
    try {
      const result = await indexMarkdownDocument(
        newDocContent,
        newDocName,
        'references',
        ragSettings.embeddingModel,
        (progress) => {
          setIndexingProgress({
            source: newDocName,
            stage: progress.stage,
            current: progress.current,
            total: progress.total,
          });
        }
      );

      if (result.success) {
        addIndexedDocument({
          source: newDocName,
          collection: 'references',
          chunksCount: result.chunksCreated,
        });
        setNewDocContent('');
        setNewDocName('');
        setIsAddingDocument(false);
      }
    } catch (error) {
      console.error('Indexing failed:', error);
    } finally {
      setIsIndexing(false);
      setIndexingProgress(null);
    }
  };

  const handleDeleteDocument = (source: string, collection: CollectionName) => {
    deleteBySource(collection, source);
    removeIndexedDocument(source);
  };

  const handleExport = () => {
    const data = exportStore();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanctumwriter-knowledge-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const content = await file.text();
      const success = importStore(content);
      if (success) {
        // Refresh the UI
        window.location.reload();
      }
    };
    input.click();
  };

  const getCollectionDocs = (collection: CollectionName) => {
    return indexedDocuments.filter(d => d.collection === collection);
  };

  return (
    <div className="h-full flex flex-col bg-sidebar-bg border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Knowledge Base</span>
        </div>
        <button
          onClick={toggleKnowledgeBasePanel}
          className="p-1 hover:bg-border rounded"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('documents')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'documents'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'settings'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'documents' && (
          <div className="p-3 space-y-3">
            {/* Indexing Progress */}
            {isIndexing && indexingProgress && (
              <div className="bg-accent/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span className="text-sm text-text-primary">
                    Indexing: {indexingProgress.source}
                  </span>
                </div>
                <div className="text-xs text-text-secondary">
                  {indexingProgress.stage}: {indexingProgress.current}/{indexingProgress.total}
                </div>
                <div className="w-full bg-border rounded-full h-1.5 mt-2">
                  <div
                    className="bg-accent rounded-full h-1.5 transition-all"
                    style={{
                      width: `${(indexingProgress.current / indexingProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Add Document */}
            {isAddingDocument ? (
              <div className="bg-chat-bg rounded-lg p-3 space-y-2">
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Document name..."
                  className="w-full px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
                />
                <textarea
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="Paste document content here..."
                  className="w-full h-32 px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddDocument}
                    disabled={!newDocContent.trim() || !newDocName.trim() || isIndexing}
                    className="flex-1 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-hover disabled:opacity-50"
                  >
                    {isIndexing ? 'Indexing...' : 'Add to Knowledge Base'}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingDocument(false);
                      setNewDocContent('');
                      setNewDocName('');
                    }}
                    className="px-3 py-1.5 bg-border text-text-secondary rounded text-sm hover:bg-border/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingDocument(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Document</span>
              </button>
            )}

            {/* Collections */}
            {(Object.keys(COLLECTION_LABELS) as CollectionName[]).map((collection) => {
              const docs = getCollectionDocs(collection);
              const stats = getCollectionStats(collection);
              const isExpanded = expandedCollections.has(collection);
              const { label, icon } = COLLECTION_LABELS[collection];

              return (
                <div key={collection} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCollection(collection)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-border/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-text-secondary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-secondary" />
                    )}
                    {icon}
                    <span className="text-sm text-text-primary flex-1 text-left">{label}</span>
                    <span className="text-xs text-text-secondary bg-border px-2 py-0.5 rounded">
                      {stats.count} chunks
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border">
                      {docs.length === 0 ? (
                        <div className="px-3 py-4 text-center text-text-secondary text-sm">
                          No documents indexed
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {docs.map((doc) => (
                            <div
                              key={doc.source}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-border/30"
                            >
                              <FileText className="w-4 h-4 text-text-secondary" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-text-primary truncate">
                                  {doc.source}
                                </div>
                                <div className="text-xs text-text-secondary">
                                  {doc.chunksCount} chunks • {new Date(doc.indexedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteDocument(doc.source, collection)}
                                className="p-1 hover:bg-red-500/10 rounded text-text-secondary hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Import/Export */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border rounded text-sm text-text-secondary hover:bg-border/50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border rounded text-sm text-text-secondary hover:bg-border/50"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-3 space-y-4">
            {/* RAG Enabled */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-primary">Enable RAG</div>
                <div className="text-xs text-text-secondary">
                  Retrieve context from knowledge base
                </div>
              </div>
              <button
                onClick={() => setRAGEnabled(!ragSettings.enabled)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative',
                  ragSettings.enabled ? 'bg-accent' : 'bg-border'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    ragSettings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {/* Embedding Model */}
            <div>
              <div className="text-sm text-text-primary mb-2">Embedding Model</div>
              <select
                value={ragSettings.embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
              >
                {EMBEDDING_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.size})
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 mt-2">
                {modelStatus === 'checking' && (
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking model...
                  </span>
                )}
                {modelStatus === 'available' && (
                  <span className="text-xs text-green-500">✓ Model available</span>
                )}
                {modelStatus === 'pulling' && (
                  <span className="text-xs text-yellow-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {pullProgress || 'Pulling model...'}
                  </span>
                )}
                {modelStatus === 'error' && (
                  <button
                    onClick={handlePullModel}
                    className="text-xs text-accent hover:underline"
                  >
                    Pull model from Ollama
                  </button>
                )}
              </div>
            </div>

            {/* Max Retrieved Chunks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-text-primary">Max Retrieved Chunks</div>
                <span className="text-sm text-accent">{ragSettings.maxRetrievedChunks}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={ragSettings.maxRetrievedChunks}
                onChange={(e) => setMaxRetrievedChunks(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Min Similarity Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-text-primary">Min Similarity Score</div>
                <span className="text-sm text-accent">{ragSettings.minSimilarityScore.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={ragSettings.minSimilarityScore}
                onChange={(e) => setMinSimilarityScore(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Max Tokens for Context */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-text-primary">Max Context Tokens</div>
                <span className="text-sm text-accent">{ragSettings.maxTokensForContext}</span>
              </div>
              <input
                type="range"
                min="500"
                max="4000"
                step="100"
                value={ragSettings.maxTokensForContext}
                onChange={(e) => setMaxTokensForContext(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}














