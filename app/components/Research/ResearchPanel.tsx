'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Globe,
  BookOpen,
  Sparkles,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  History,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  GraduationCap,
  PenTool,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/lib/store/useSearchStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import {
  search,
  checkSearchEngineStatus,
  SearchResult,
  SearchEngine,
  formatResultsAsMarkdown,
  generateCitation,
} from '@/lib/search/searchService';

// Focus mode options
const FOCUS_MODES = [
  { id: 'webSearch', label: 'Web', icon: Globe, description: 'General web search' },
  { id: 'academicSearch', label: 'Academic', icon: GraduationCap, description: 'Scholarly articles' },
  { id: 'writingAssistant', label: 'Writing', icon: PenTool, description: 'Writing assistance' },
] as const;

// Search engine options
const ENGINES = [
  { id: 'perplexica', label: 'Perplexica', description: 'AI-powered search' },
  { id: 'searxng', label: 'SearXNG', description: 'Privacy-focused' },
  { id: 'both', label: 'Both', description: 'Combined results' },
] as const;

interface ResultCardProps {
  result: SearchResult;
  isSaved: boolean;
  onSave: () => void;
  onInsert: () => void;
  onCopyCitation: (format: 'apa' | 'mla' | 'chicago' | 'simple') => void;
}

function ResultCard({ result, isSaved, onSave, onInsert, onCopyCitation }: ResultCardProps) {
  const [showCitationMenu, setShowCitationMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleCopyCitation = (format: 'apa' | 'mla' | 'chicago' | 'simple') => {
    onCopyCitation(format);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowCitationMenu(false);
  };
  
  return (
    <div className="p-3 bg-editor-bg rounded-lg border border-border hover:border-accent/30 transition-colors">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent hover:underline flex items-center gap-1"
          >
            <span className="truncate">{result.title}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          
          {result.snippet && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {result.snippet}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-text-tertiary">
            <span>{result.source}</span>
            {result.publishedDate && (
              <>
                <span>•</span>
                <span>{result.publishedDate}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onSave}
            className={cn(
              'p-1.5 rounded transition-colors',
              isSaved
                ? 'text-accent bg-accent/10'
                : 'text-text-secondary hover:text-accent hover:bg-accent/10'
            )}
            title={isSaved ? 'Saved' : 'Save for later'}
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowCitationMenu(!showCitationMenu)}
              className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded transition-colors"
              title="Copy citation"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            
            {showCitationMenu && (
              <div className="absolute right-0 top-full mt-1 bg-panel-bg border border-border rounded-lg shadow-lg z-10 py-1 min-w-[100px]">
                {(['simple', 'apa', 'mla', 'chicago'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => handleCopyCitation(format)}
                    className="w-full px-3 py-1.5 text-xs text-left text-text-primary hover:bg-accent/10 transition-colors"
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={onInsert}
            className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded transition-colors"
            title="Insert into document"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResearchPanel() {
  const {
    showResearchPanel,
    setShowResearchPanel,
    isSearching,
    setSearching,
    currentQuery,
    lastSearchQuery,
    setQuery,
    results,
    setResults,
    aiSummary,
    error,
    setError,
    engineStatus,
    setEngineStatus,
    preferredEngine,
    setPreferredEngine,
    focusMode,
    setFocusMode,
    searchHistory,
    addToHistory,
    clearHistory,
    savedResults,
    saveResult,
    removeResult,
    clearSearch,
  } = useSearchStore();
  
  const { selection, currentDocument, updateDocumentContent, cursorPosition, showToast } = useAppStore();
  const { serviceURLs } = useSettingsStore();
  
  const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'history'>('search');
  const [showEngineDropdown, setShowEngineDropdown] = useState(false);
  
  // Check engine status on mount and when serviceURLs change
  const checkEnginesWithURLs = useCallback(async () => {
    const status = await checkSearchEngineStatus({
      perplexica: serviceURLs.perplexica,
      searxng: serviceURLs.searxng,
    });
    setEngineStatus(status);
  }, [serviceURLs.perplexica, serviceURLs.searxng, setEngineStatus]);
  
  useEffect(() => {
    if (showResearchPanel) {
      checkEnginesWithURLs();
    }
  }, [showResearchPanel, checkEnginesWithURLs]);
  
  // Pre-fill search with selected text
  useEffect(() => {
    if (showResearchPanel && selection && selection.text.length > 0 && selection.text.length < 200) {
      setQuery(selection.text);
    }
  }, [showResearchPanel, selection, setQuery]);
  
  const handleSearch = useCallback(async () => {
    if (!currentQuery.trim()) return;
    
    setSearching(true);
    setError(null);
    
    try {
      const response = await search(currentQuery, preferredEngine, { 
        focusMode,
        serviceURLs: {
          perplexica: serviceURLs.perplexica,
          searxng: serviceURLs.searxng,
        }
      });
      setResults(response);
      addToHistory(currentQuery, response.results.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  }, [currentQuery, preferredEngine, focusMode, serviceURLs.perplexica, serviceURLs.searxng, setSearching, setError, setResults, addToHistory]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };
  
  const handleInsertResult = async (result: SearchResult) => {
    const citation = generateCitation(result, 'simple');
    
    if (currentDocument) {
      // Insert at cursor position
      const lines = currentDocument.content.split('\n');
      const lineIndex = Math.max(0, cursorPosition.line - 1);
      const colIndex = Math.max(0, cursorPosition.col - 1);
      
      const line = lines[lineIndex] || '';
      lines[lineIndex] = line.slice(0, colIndex) + citation + line.slice(colIndex);
      
      updateDocumentContent(lines.join('\n'));
      showToast('Citation inserted', 'success');
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(citation);
      showToast('Citation copied to clipboard', 'info');
    }
  };
  
  const handleCopyCitation = async (result: SearchResult, format: 'apa' | 'mla' | 'chicago' | 'simple') => {
    const citation = generateCitation(result, format);
    await navigator.clipboard.writeText(citation);
    showToast('Citation copied', 'success');
  };
  
  const handleInsertSummary = async () => {
    if (aiSummary) {
      // Use lastSearchQuery to ensure we have the query that produced these results
      const queryToUse = lastSearchQuery || currentQuery;
      const markdown = formatResultsAsMarkdown(
        { query: queryToUse, results, totalResults: results.length, searchEngine: preferredEngine, aiSummary },
        { includeAiSummary: true, maxResults: 100, includeUrls: true, includeQuery: true }
      );
      
      if (currentDocument) {
        // Insert at end of document
        const newContent = currentDocument.content + '\n\n' + markdown;
        updateDocumentContent(newContent);
        showToast('Research inserted', 'success');
      } else {
        await navigator.clipboard.writeText(markdown);
        showToast('Research copied to clipboard', 'info');
      }
    }
  };
  
  if (!showResearchPanel) return null;
  
  const hasAnyEngine = engineStatus.perplexica || engineStatus.searxng;
  
  return (
    <div className="h-full flex flex-col bg-sidebar-bg border-l border-border w-80">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-text-primary">Research</h2>
          </div>
          <button
            onClick={() => setShowResearchPanel(false)}
            className="p-1 text-text-secondary hover:text-text-primary rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-editor-bg rounded-lg">
          {[
            { id: 'search', label: 'Search', icon: Search },
            { id: 'saved', label: 'Saved', icon: Bookmark, count: savedResults.length },
            { id: 'history', label: 'History', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-border'
              )}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1 bg-accent/20 rounded text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'search' && (
          <div className="p-3 space-y-3">
            {/* Engine Status */}
            {!hasAnyEngine && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>No search engines available</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Start Perplexica (port 3000) or SearXNG (port 4000)
                </p>
                <button
                  onClick={checkEnginesWithURLs}
                  className="mt-2 text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Check again
                </button>
              </div>
            )}
            
            {/* Search Input */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={currentQuery}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Research a topic..."
                  className="w-full bg-editor-bg border border-border rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                  disabled={!hasAnyEngine}
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !hasAnyEngine || !currentQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {/* Options Row */}
              <div className="flex items-center gap-2">
                {/* Focus Mode */}
                <div className="flex gap-1 p-0.5 bg-editor-bg rounded">
                  {FOCUS_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setFocusMode(mode.id)}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        focusMode === mode.id
                          ? 'bg-accent text-white'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                      title={mode.description}
                    >
                      <mode.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
                
                {/* Engine Selector */}
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowEngineDropdown(!showEngineDropdown)}
                    className="w-full flex items-center justify-between px-2 py-1 bg-editor-bg border border-border rounded text-xs text-text-primary"
                  >
                    <span className="flex items-center gap-1">
                      {preferredEngine === 'perplexica' && <Sparkles className="w-3 h-3 text-accent" />}
                      {preferredEngine === 'searxng' && <Globe className="w-3 h-3 text-green-500" />}
                      {preferredEngine === 'both' && <BookOpen className="w-3 h-3 text-blue-500" />}
                      {ENGINES.find((e) => e.id === preferredEngine)?.label}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showEngineDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-panel-bg border border-border rounded-lg shadow-lg z-10 py-1">
                      {ENGINES.map((engine) => {
                        const isAvailable = 
                          engine.id === 'both' 
                            ? engineStatus.perplexica || engineStatus.searxng
                            : engineStatus[engine.id as keyof typeof engineStatus];
                        
                        return (
                          <button
                            key={engine.id}
                            onClick={() => {
                              setPreferredEngine(engine.id as SearchEngine);
                              setShowEngineDropdown(false);
                            }}
                            disabled={!isAvailable}
                            className={cn(
                              'w-full px-3 py-1.5 text-left text-xs transition-colors',
                              isAvailable
                                ? 'text-text-primary hover:bg-accent/10'
                                : 'text-text-tertiary cursor-not-allowed',
                              preferredEngine === engine.id && 'bg-accent/10'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{engine.label}</span>
                              {!isAvailable && (
                                <span className="text-red-400 text-[10px]">offline</span>
                              )}
                              {isAvailable && engine.id !== 'both' && (
                                <span className="text-green-400 text-[10px]">●</span>
                              )}
                            </div>
                            <div className="text-text-tertiary text-[10px]">
                              {engine.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Error */}
            {error && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                {error}
              </div>
            )}
            
            {/* AI Summary */}
            {aiSummary && (
              <div className="p-3 bg-accent/5 border border-accent/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-xs font-medium text-accent">
                    <Sparkles className="w-3 h-3" />
                    AI Summary
                  </div>
                  <button
                    onClick={handleInsertSummary}
                    className="text-xs text-text-secondary hover:text-accent flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    Insert
                  </button>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {aiSummary.length > 500 ? `${aiSummary.slice(0, 500)}...` : aiSummary}
                </p>
              </div>
            )}
            
            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-text-secondary">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </div>
                {results.map((result, index) => (
                  <ResultCard
                    key={`${result.url}-${index}`}
                    result={result}
                    isSaved={savedResults.some((r) => r.url === result.url)}
                    onSave={() => {
                      if (savedResults.some((r) => r.url === result.url)) {
                        removeResult(result.url);
                      } else {
                        saveResult(result);
                      }
                    }}
                    onInsert={() => handleInsertResult(result)}
                    onCopyCitation={(format) => handleCopyCitation(result, format)}
                  />
                ))}
              </div>
            )}
            
            {/* Empty state */}
            {!isSearching && !error && results.length === 0 && currentQuery && (
              <div className="text-center py-6 text-text-secondary text-sm">
                No results found
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'saved' && (
          <div className="p-3 space-y-2">
            {savedResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{savedResults.length} saved source{savedResults.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => {
                      if (confirm('Clear all saved results?')) {
                        useSearchStore.getState().clearSavedResults();
                      }
                    }}
                    className="text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                {savedResults.map((result, index) => (
                  <ResultCard
                    key={`${result.url}-${index}`}
                    result={result}
                    isSaved={true}
                    onSave={() => removeResult(result.url)}
                    onInsert={() => handleInsertResult(result)}
                    onCopyCitation={(format) => handleCopyCitation(result, format)}
                  />
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <Bookmark className="w-8 h-8 mx-auto opacity-50 mb-2" />
                <p className="text-sm">No saved sources</p>
                <p className="text-xs mt-1">Save results to reference later</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="p-3 space-y-2">
            {searchHistory.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Recent searches</span>
                  <button
                    onClick={() => {
                      if (confirm('Clear search history?')) {
                        clearHistory();
                      }
                    }}
                    className="text-red-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(item.query);
                      setActiveTab('search');
                    }}
                    className="w-full p-2 bg-editor-bg rounded-lg border border-border hover:border-accent/30 transition-colors text-left"
                  >
                    <div className="text-sm text-text-primary truncate">
                      {item.query}
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      {item.resultCount} results • {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <History className="w-8 h-8 mx-auto opacity-50 mb-2" />
                <p className="text-sm">No search history</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

