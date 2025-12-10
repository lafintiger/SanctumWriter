'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Trash2,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Settings,
  Save,
  X,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRAGStore } from '@/lib/store/useRAGStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { useChatStore } from '@/lib/store/useChatStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import {
  getDocumentMemories,
  saveConversationMemory,
  summarizeConversation,
  deleteMemory,
  clearDocumentMemories,
  savePreference,
  ConversationSummary,
} from '@/lib/rag';

export function SessionMemoryPanel() {
  const [activeTab, setActiveTab] = useState<'memories' | 'settings'>('memories');
  const [memories, setMemories] = useState<ConversationSummary[]>([]);
  const [expandedMemories, setExpandedMemories] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [newPreferenceKey, setNewPreferenceKey] = useState('');
  const [newPreferenceValue, setNewPreferenceValue] = useState('');

  const { currentDocument, model } = useAppStore();
  const { messages } = useChatStore();
  const { serviceURLs } = useSettingsStore();
  const {
    ragSettings,
    sessionMemorySettings,
    setSessionMemoryEnabled,
    setAutoSave,
    setAutoSaveThreshold,
    toggleSessionMemoryPanel,
  } = useRAGStore();

  // Load memories for current document
  useEffect(() => {
    if (currentDocument) {
      const docMemories = getDocumentMemories(currentDocument.path);
      setMemories(docMemories);
    } else {
      setMemories([]);
    }
  }, [currentDocument]);

  const toggleMemory = (id: string) => {
    setExpandedMemories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveCurrentSession = async () => {
    if (!currentDocument || messages.length < 4) return;

    setIsSaving(true);
    try {
      const ollamaUrl = serviceURLs?.ollama || 'http://localhost:11434';
      
      // Summarize the conversation
      const { summary, keyPoints, decisions } = await summarizeConversation(
        messages.map(m => ({ role: m.role, content: m.content })),
        ollamaUrl,
        model
      );

      // Save to memory
      await saveConversationMemory(
        currentDocument.path,
        summary,
        keyPoints,
        decisions,
        ragSettings.embeddingModel
      );

      // Refresh memories list
      const docMemories = getDocumentMemories(currentDocument.path);
      setMemories(docMemories);
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMemory = (id: string) => {
    deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClearAllMemories = () => {
    if (!currentDocument) return;
    if (!confirm('Are you sure you want to clear all memories for this document?')) return;

    clearDocumentMemories(currentDocument.path);
    setMemories([]);
  };

  const handleSavePreference = async () => {
    if (!newPreferenceKey.trim() || !newPreferenceValue.trim()) return;

    await savePreference(
      newPreferenceKey,
      newPreferenceValue,
      currentDocument?.path,
      ragSettings.embeddingModel
    );

    setNewPreferenceKey('');
    setNewPreferenceValue('');
  };

  return (
    <div className="h-full flex flex-col bg-sidebar-bg border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-text-primary">Session Memory</span>
        </div>
        <button
          onClick={toggleSessionMemoryPanel}
          className="p-1 hover:bg-border rounded"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Document Info */}
      {currentDocument && (
        <div className="px-3 py-2 border-b border-border bg-chat-bg">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <FileText className="w-4 h-4" />
            <span className="truncate">{currentDocument.name}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('memories')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'memories'
              ? 'text-purple-500 border-b-2 border-purple-500'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Memories
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'settings'
              ? 'text-purple-500 border-b-2 border-purple-500'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'memories' && (
          <div className="p-3 space-y-3">
            {/* Save Current Session */}
            {messages.length >= 4 && (
              <button
                onClick={handleSaveCurrentSession}
                disabled={isSaving || !currentDocument}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span className="text-sm">
                  {isSaving ? 'Saving...' : 'Save Current Session'}
                </span>
              </button>
            )}

            {/* Memories List */}
            {memories.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-10 h-10 mx-auto mb-3 text-purple-500 opacity-30" />
                <p className="text-sm text-text-secondary">
                  No memories for this document yet
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Conversations are saved automatically or manually
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleMemory(memory.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-border/50 transition-colors"
                    >
                      {expandedMemories.has(memory.id) ? (
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                      )}
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="flex-1 text-sm text-text-primary text-left truncate">
                        {new Date(memory.timestamp).toLocaleString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMemory(memory.id);
                        }}
                        className="p-1 hover:bg-red-500/10 rounded text-text-secondary hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </button>

                    {expandedMemories.has(memory.id) && (
                      <div className="px-3 py-2 border-t border-border bg-chat-bg space-y-2">
                        {/* Summary */}
                        <div>
                          <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                            <MessageSquare className="w-3 h-3" />
                            Summary
                          </div>
                          <p className="text-sm text-text-primary">{memory.summary}</p>
                        </div>

                        {/* Key Points */}
                        {memory.keyPoints.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                              <Lightbulb className="w-3 h-3" />
                              Key Points
                            </div>
                            <ul className="list-disc list-inside text-sm text-text-primary space-y-0.5">
                              {memory.keyPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Decisions */}
                        {memory.decisions.length > 0 && (
                          <div>
                            <div className="text-xs text-text-secondary mb-1">Decisions Made</div>
                            <ul className="list-disc list-inside text-sm text-text-primary space-y-0.5">
                              {memory.decisions.map((decision, i) => (
                                <li key={i}>{decision}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Clear All */}
                {memories.length > 0 && (
                  <button
                    onClick={handleClearAllMemories}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All Memories
                  </button>
                )}
              </div>
            )}

            {/* Add Preference */}
            <div className="border-t border-border pt-3 mt-3">
              <div className="text-sm text-text-primary mb-2">Save a Preference</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newPreferenceKey}
                  onChange={(e) => setNewPreferenceKey(e.target.value)}
                  placeholder="Preference name (e.g., Writing Style)"
                  className="w-full px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
                />
                <input
                  type="text"
                  value={newPreferenceValue}
                  onChange={(e) => setNewPreferenceValue(e.target.value)}
                  placeholder="Value (e.g., Academic, formal)"
                  className="w-full px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
                />
                <button
                  onClick={handleSavePreference}
                  disabled={!newPreferenceKey.trim() || !newPreferenceValue.trim()}
                  className="w-full px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                >
                  Save Preference
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-3 space-y-4">
            {/* Session Memory Enabled */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-primary">Enable Session Memory</div>
                <div className="text-xs text-text-secondary">
                  Remember conversations across sessions
                </div>
              </div>
              <button
                onClick={() => setSessionMemoryEnabled(!sessionMemorySettings.enabled)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative',
                  sessionMemorySettings.enabled ? 'bg-purple-500' : 'bg-border'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    sessionMemorySettings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-primary">Auto-Save Sessions</div>
                <div className="text-xs text-text-secondary">
                  Automatically save after threshold
                </div>
              </div>
              <button
                onClick={() => setAutoSave(!sessionMemorySettings.autoSave)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative',
                  sessionMemorySettings.autoSave ? 'bg-purple-500' : 'bg-border'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    sessionMemorySettings.autoSave ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {/* Auto Save Threshold */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-text-primary">Auto-Save Threshold</div>
                <span className="text-sm text-purple-500">
                  {sessionMemorySettings.autoSaveThreshold} messages
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="20"
                value={sessionMemorySettings.autoSaveThreshold}
                onChange={(e) => setAutoSaveThreshold(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-text-secondary mt-1">
                Session will be saved after this many messages
              </div>
            </div>

            {/* Info */}
            <div className="bg-purple-500/10 rounded-lg p-3 text-sm">
              <div className="font-medium text-purple-500 mb-1">How Session Memory Works</div>
              <ul className="text-text-secondary text-xs space-y-1">
                <li>• Conversations are summarized and stored</li>
                <li>• Past context is retrieved for new conversations</li>
                <li>• Decisions and preferences are remembered</li>
                <li>• Each document has its own memory</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}














