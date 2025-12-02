'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Cpu,
  Sliders,
  Gauge,
  BookOpen,
  Zap,
  Info,
  RefreshCw,
  Check,
  ChevronDown,
  Users,
  Trash2,
  Plus,
  Edit3,
  Server,
  RotateCcw,
  FolderOpen,
  Folder,
  ChevronUp,
  FileText,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore, WRITING_PRESETS, WritingPreset, GPU_PRESETS, getOptimalSettingsForTier, DEFAULT_SERVICE_URLS, ServiceURLs, WebSearchSettings } from '@/lib/store/useSettingsStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCouncilStore } from '@/lib/store/useCouncilStore';
import { Reviewer, DEFAULT_REVIEWERS, ReviewerRole } from '@/types/council';
import { detectGPU, formatVRAM, getVRAMTierDescription } from '@/lib/hardware/detect';

export function Settings() {
  const {
    showSettings,
    setShowSettings,
    writingPreset,
    setWritingPreset,
    temperature,
    setTemperature,
    topP,
    setTopP,
    topK,
    setTopK,
    repeatPenalty,
    setRepeatPenalty,
    contextLength,
    setContextLength,
    maxContextLength,
    currentModelInfo,
    setCurrentModelInfo,
    hardwareInfo,
    setHardwareInfo,
    serviceURLs,
    setServiceURL,
    resetServiceURLs,
    autoConfigureForModel,
    autoConfigureForHardware,
    selectGPU,
    optimizeForWriting,
    workspacePath,
    setWorkspacePath,
    webSearchSettings,
    setWebSearchEnabled,
    setWebSearchAutoSearch,
    setWebSearchPreferredEngine,
  } = useSettingsStore();

  const { provider, model } = useAppStore();
  const [activeTab, setActiveTab] = useState<'writing' | 'model' | 'hardware' | 'council' | 'services' | 'workspace'>('writing');
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isDetectingHardware, setIsDetectingHardware] = useState(false);
  
  // Workspace browser state
  const [browsePath, setBrowsePath] = useState('');
  const [directories, setDirectories] = useState<Array<{ name: string; path: string }>>([]);
  const [canGoUp, setCanGoUp] = useState(false);
  const [parentPath, setParentPath] = useState('');
  const [workspaceValidation, setWorkspaceValidation] = useState<{ valid: boolean; markdownFiles?: number } | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [manualPath, setManualPath] = useState(workspacePath);

  // Detect hardware on mount
  useEffect(() => {
    if (showSettings && hardwareInfo.vram === null) {
      detectHardware();
    }
  }, [showSettings]);

  // Fetch model info when model changes
  useEffect(() => {
    if (showSettings && model) {
      fetchModelInfo();
    }
  }, [showSettings, model, provider]);

  const detectHardware = async () => {
    setIsDetectingHardware(true);
    try {
      const gpuInfo = await detectGPU();
      const info = {
        vram: gpuInfo.vram,
        vramTier: 'unknown' as 'low' | 'medium' | 'high' | 'ultra' | 'unknown',
        renderer: gpuInfo.renderer,
        vendor: gpuInfo.vendor,
        selectedGPU: null,
        isManualSelection: false,
      };
      autoConfigureForHardware(info);
    } catch (error) {
      console.error('Hardware detection failed:', error);
    } finally {
      setIsDetectingHardware(false);
    }
  };

  const fetchModelInfo = useCallback(async () => {
    if (!model) return;
    
    setIsLoadingModel(true);
    try {
      const response = await fetch(`/api/model-info?provider=${provider}&model=${model}`);
      if (response.ok) {
        const data = await response.json();
        autoConfigureForModel(data);
      }
    } catch (error) {
      console.error('Failed to fetch model info:', error);
    } finally {
      setIsLoadingModel(false);
    }
  }, [model, provider, autoConfigureForModel]);

  // Workspace browsing functions
  const browseDirectory = useCallback(async (path?: string) => {
    setIsBrowsing(true);
    try {
      const url = path ? `/api/workspace?path=${encodeURIComponent(path)}` : '/api/workspace';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setBrowsePath(data.currentPath);
        setDirectories(data.entries);
        setCanGoUp(data.canGoUp);
        setParentPath(data.parentPath);
      }
    } catch (error) {
      console.error('Failed to browse directory:', error);
    } finally {
      setIsBrowsing(false);
    }
  }, []);

  const validateWorkspace = useCallback(async (path: string) => {
    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (response.ok) {
        const data = await response.json();
        setWorkspaceValidation(data);
        return data.valid;
      }
    } catch (error) {
      console.error('Failed to validate workspace:', error);
    }
    return false;
  }, []);

  const selectWorkspace = useCallback(async (path: string) => {
    const valid = await validateWorkspace(path);
    if (valid) {
      setWorkspacePath(path);
      setManualPath(path);
    }
  }, [validateWorkspace, setWorkspacePath]);

  // Initialize workspace browser when tab opens
  useEffect(() => {
    if (activeTab === 'workspace' && !browsePath) {
      browseDirectory();
    }
  }, [activeTab, browsePath, browseDirectory]);

  // Update manual path when workspace path changes
  useEffect(() => {
    setManualPath(workspacePath);
  }, [workspacePath]);

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowSettings(false)}
      />

      {/* Modal */}
      <div className="relative bg-sidebar-bg border border-border rounded-lg shadow-2xl w-[700px] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto">
          {[
            { id: 'workspace', label: 'Workspace', icon: FolderOpen },
            { id: 'writing', label: 'Writing Style', icon: BookOpen },
            { id: 'model', label: 'Model', icon: Sliders },
            { id: 'hardware', label: 'Hardware', icon: Cpu },
            { id: 'council', label: 'Council', icon: Users },
            { id: 'services', label: 'Services', icon: Server },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {activeTab === 'workspace' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-accent" />
                  Workspace Folder
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Choose the folder where your markdown documents are stored. 
                  This works great with Obsidian vaults or any folder containing .md files.
                </p>
              </div>
              
              {/* Current Workspace */}
              <div className="p-4 bg-editor-bg rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Current Workspace</span>
                  {workspaceValidation?.valid && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {workspaceValidation.markdownFiles} markdown files
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    placeholder="Enter folder path..."
                    className="flex-1 px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => selectWorkspace(manualPath)}
                    disabled={!manualPath || manualPath === workspacePath}
                    className="px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              </div>
              
              {/* Folder Browser */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-editor-bg border-b border-border">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Folder className="w-4 h-4 text-accent flex-shrink-0" />
                    <span className="text-sm text-text-primary truncate">{browsePath || 'Loading...'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => browseDirectory(parentPath)}
                      disabled={!canGoUp || isBrowsing}
                      className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Go up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => browseDirectory(browsePath)}
                      disabled={isBrowsing}
                      className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary"
                      title="Refresh"
                    >
                      <RefreshCw className={cn("w-4 h-4", isBrowsing && "animate-spin")} />
                    </button>
                    <button
                      onClick={() => selectWorkspace(browsePath)}
                      disabled={!browsePath}
                      className="px-3 py-1.5 bg-accent text-white rounded text-xs hover:bg-accent/80 disabled:opacity-50"
                    >
                      Select This Folder
                    </button>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {directories.length === 0 ? (
                    <div className="p-4 text-center text-sm text-text-secondary">
                      {isBrowsing ? 'Loading...' : 'No subfolders found'}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {directories.map((dir) => (
                        <button
                          key={dir.path}
                          onClick={() => browseDirectory(dir.path)}
                          onDoubleClick={() => selectWorkspace(dir.path)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-border/50 transition-colors"
                        >
                          <Folder className="w-4 h-4 text-accent" />
                          <span className="text-sm text-text-primary">{dir.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Quick Tips */}
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <h4 className="text-sm font-medium text-accent mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Tips
                </h4>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li>• <strong>Obsidian:</strong> Navigate to your vault folder and select it</li>
                  <li>• <strong>Click</strong> a folder to navigate into it</li>
                  <li>• <strong>Double-click</strong> to select and set as workspace</li>
                  <li>• All .md, .markdown, .mdx, and .txt files will be shown</li>
                  <li>• Your selection is saved and will persist across sessions</li>
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'writing' && (
            <WritingStyleTab
              writingPreset={writingPreset}
              setWritingPreset={setWritingPreset}
              temperature={temperature}
              setTemperature={setTemperature}
              topP={topP}
              setTopP={setTopP}
              topK={topK}
              setTopK={setTopK}
              repeatPenalty={repeatPenalty}
              setRepeatPenalty={setRepeatPenalty}
            />
          )}

          {activeTab === 'model' && (
            <ModelSettingsTab
              currentModelInfo={currentModelInfo}
              isLoading={isLoadingModel}
              contextLength={contextLength}
              setContextLength={setContextLength}
              maxContextLength={maxContextLength}
              hardwareTierMax={getOptimalSettingsForTier(hardwareInfo.vramTier).maxContextPotential}
              onRefresh={fetchModelInfo}
            />
          )}

          {activeTab === 'hardware' && (
            <HardwareTab
              hardwareInfo={hardwareInfo}
              isDetecting={isDetectingHardware}
              onDetect={detectHardware}
              onSelectGPU={selectGPU}
              onOptimize={optimizeForWriting}
              maxContextLength={maxContextLength}
            />
          )}

          {activeTab === 'council' && (
            <CouncilTab />
          )}

          {activeTab === 'services' && (
            <ServicesTab
              serviceURLs={serviceURLs}
              onSetServiceURL={setServiceURL}
              onResetServiceURLs={resetServiceURLs}
              webSearchSettings={webSearchSettings}
              onSetWebSearchEnabled={setWebSearchEnabled}
              onSetWebSearchAutoSearch={setWebSearchAutoSearch}
              onSetWebSearchPreferredEngine={setWebSearchPreferredEngine}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface WritingStyleTabProps {
  writingPreset: WritingPreset;
  setWritingPreset: (preset: WritingPreset) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  topP: number;
  setTopP: (topP: number) => void;
  topK: number;
  setTopK: (topK: number) => void;
  repeatPenalty: number;
  setRepeatPenalty: (penalty: number) => void;
}

function WritingStyleTab({
  writingPreset,
  setWritingPreset,
  temperature,
  setTemperature,
  topP,
  setTopP,
  topK,
  setTopK,
  repeatPenalty,
  setRepeatPenalty,
}: WritingStyleTabProps) {
  return (
    <div className="space-y-6">
      {/* Preset selector */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Writing Preset
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(WRITING_PRESETS) as WritingPreset[]).map((preset) => {
            const config = WRITING_PRESETS[preset];
            return (
              <button
                key={preset}
                onClick={() => setWritingPreset(preset)}
                className={cn(
                  'relative p-3 rounded-lg border text-left transition-all',
                  writingPreset === preset
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-text-secondary'
                )}
              >
                {writingPreset === preset && (
                  <Check className="absolute top-2 right-2 w-4 h-4 text-accent" />
                )}
                <div className="font-medium text-text-primary text-sm">
                  {config.name}
                </div>
                <div className="text-xs text-text-secondary mt-1 line-clamp-2">
                  {config.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parameter sliders */}
      <div className="space-y-5 pt-4 border-t border-border">
        <SliderControl
          label="Temperature"
          description="Higher values = more creative, lower = more focused"
          value={temperature}
          onChange={setTemperature}
          min={0}
          max={2}
          step={0.05}
          displayValue={temperature.toFixed(2)}
        />

        <SliderControl
          label="Top P (Nucleus Sampling)"
          description="Cumulative probability cutoff for token selection"
          value={topP}
          onChange={setTopP}
          min={0}
          max={1}
          step={0.05}
          displayValue={topP.toFixed(2)}
        />

        <SliderControl
          label="Top K"
          description="Number of top tokens to consider"
          value={topK}
          onChange={setTopK}
          min={1}
          max={100}
          step={1}
          displayValue={topK.toString()}
        />

        <SliderControl
          label="Repeat Penalty"
          description="Discourages repetition (1.0 = no penalty)"
          value={repeatPenalty}
          onChange={setRepeatPenalty}
          min={1}
          max={2}
          step={0.05}
          displayValue={repeatPenalty.toFixed(2)}
        />
      </div>
    </div>
  );
}

interface ModelSettingsTabProps {
  currentModelInfo: {
    name: string;
    size: number;
    parameterSize: string;
    quantization: string;
    contextLength: number;
    family: string;
  } | null;
  isLoading: boolean;
  contextLength: number;
  setContextLength: (length: number) => void;
  maxContextLength: number;
  hardwareTierMax: number; // Max context your hardware can handle
  onRefresh: () => void;
}

function ModelSettingsTab({
  currentModelInfo,
  isLoading,
  contextLength,
  setContextLength,
  maxContextLength,
  hardwareTierMax,
  onRefresh,
}: ModelSettingsTabProps) {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return 'Unknown';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="space-y-6">
      {/* Model info card */}
      <div className="bg-editor-bg rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-text-primary">Current Model</h3>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {isLoading ? (
          <div className="text-text-secondary text-sm">Loading model info...</div>
        ) : currentModelInfo ? (
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Name" value={currentModelInfo.name} />
            <InfoItem label="Size" value={formatSize(currentModelInfo.size)} />
            <InfoItem label="Parameters" value={currentModelInfo.parameterSize} />
            <InfoItem label="Quantization" value={currentModelInfo.quantization} />
            <InfoItem label="Family" value={currentModelInfo.family} />
            <InfoItem label="Max Context" value={`${currentModelInfo.contextLength.toLocaleString()} tokens`} />
          </div>
        ) : (
          <div className="text-text-secondary text-sm">
            No model info available. Make sure a model is selected.
          </div>
        )}
      </div>

      {/* Context length slider */}
      <div>
        <SliderControl
          label="Context Length"
          description="Maximum tokens for conversation history + document context"
          value={contextLength}
          onChange={setContextLength}
          min={1024}
          max={hardwareTierMax} // Use hardware tier max, not model limit
          step={1024}
          displayValue={`${contextLength.toLocaleString()} tokens`}
        />
        
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-sidebar-bg rounded">
            <span className="text-text-secondary">Model&apos;s Default: </span>
            <span className="text-text-primary font-mono">{maxContextLength.toLocaleString()}</span>
          </div>
          <div className="p-2 bg-accent/10 rounded">
            <span className="text-text-secondary">Your HW Max: </span>
            <span className="text-accent font-mono">{hardwareTierMax.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="mt-3 flex items-start gap-2 text-xs text-text-secondary">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Higher context = more document content but slower generation and more VRAM usage.
          </p>
        </div>
        
        {contextLength > 32768 && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            ⚠️ <strong>Warning:</strong> Context above 32k may cause GPU memory issues and very slow generation. 
            Recommended: 8k-16k for most writing, 32k max for long documents.
          </div>
        )}
        
        {contextLength > maxContextLength && (
          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
            💡 You&apos;ve set context higher than the model&apos;s native {maxContextLength.toLocaleString()} limit. 
            This works but may affect quality. Consider a model with native high-context support.
          </div>
        )}
      </div>
    </div>
  );
}

interface HardwareTabProps {
  hardwareInfo: {
    vram: number | null;
    vramTier: 'low' | 'medium' | 'high' | 'ultra' | 'unknown';
    renderer: string;
    vendor: string;
    selectedGPU: string | null;
    isManualSelection: boolean;
  };
  isDetecting: boolean;
  onDetect: () => void;
  onSelectGPU: (gpuId: string) => void;
  onOptimize: () => void;
  maxContextLength: number;
}

function HardwareTab({ hardwareInfo, isDetecting, onDetect, onSelectGPU, onOptimize, maxContextLength }: HardwareTabProps) {
  const [showGPUList, setShowGPUList] = useState(false);
  const [gpuFilter, setGpuFilter] = useState<'all' | 'nvidia' | 'amd' | 'apple' | 'intel'>('all');
  
  const filteredGPUs = GPU_PRESETS.filter(gpu => 
    gpuFilter === 'all' || gpu.vendor === gpuFilter
  );
  
  const selectedGPU = GPU_PRESETS.find(g => g.id === hardwareInfo.selectedGPU);
  const optimalSettings = getOptimalSettingsForTier(hardwareInfo.vramTier, maxContextLength);
  
  return (
    <div className="space-y-6">
      {/* GPU Selection */}
      <div className="bg-editor-bg rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-text-primary">Select Your GPU</h3>
          <button
            onClick={onDetect}
            disabled={isDetecting}
            className="flex items-center gap-2 px-3 py-1.5 bg-border hover:bg-border/80 text-text-secondary text-sm rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isDetecting && 'animate-spin')} />
            {isDetecting ? 'Detecting...' : 'Auto-detect'}
          </button>
        </div>
        
        {/* Current selection */}
        <div className="mb-4 p-3 bg-sidebar-bg rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-secondary">Selected GPU</div>
              <div className="text-sm text-text-primary font-medium">
                {selectedGPU?.name || hardwareInfo.renderer || 'Not selected'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-secondary">VRAM</div>
              <div className="text-sm text-accent font-medium">
                {formatVRAM(hardwareInfo.vram)}
              </div>
            </div>
          </div>
        </div>
        
        {/* GPU list toggle */}
        <button
          onClick={() => setShowGPUList(!showGPUList)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors"
        >
          <span className="font-medium">
            {showGPUList ? 'Hide GPU List' : 'Select from GPU List'}
          </span>
          <ChevronDown className={cn('w-5 h-5 transition-transform', showGPUList && 'rotate-180')} />
        </button>
        
        {/* GPU list */}
        {showGPUList && (
          <div className="mt-4 space-y-3">
            {/* Filter tabs */}
            <div className="flex gap-1 p-1 bg-sidebar-bg rounded-lg">
              {(['all', 'nvidia', 'amd', 'apple', 'intel'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setGpuFilter(filter)}
                  className={cn(
                    'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors capitalize',
                    gpuFilter === filter
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
            
            {/* GPU options */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredGPUs.map((gpu) => (
                <button
                  key={gpu.id}
                  onClick={() => {
                    onSelectGPU(gpu.id);
                    setShowGPUList(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors',
                    hardwareInfo.selectedGPU === gpu.id
                      ? 'bg-accent/20 border border-accent'
                      : 'bg-sidebar-bg hover:bg-border'
                  )}
                >
                  <div>
                    <div className="text-sm text-text-primary font-medium">{gpu.name}</div>
                    <div className="text-xs text-text-secondary">{formatVRAM(gpu.vramMB)}</div>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded',
                    gpu.tier === 'ultra' && 'bg-purple-500/20 text-purple-400',
                    gpu.tier === 'high' && 'bg-green-500/20 text-green-400',
                    gpu.tier === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                    gpu.tier === 'low' && 'bg-red-500/20 text-red-400'
                  )}>
                    {gpu.tier.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tier info and recommendations */}
      <div className="bg-editor-bg rounded-lg p-4 border border-border">
        <h3 className="font-medium text-text-primary mb-3">Hardware Tier: {hardwareInfo.vramTier.toUpperCase()}</h3>
        
        <div className="space-y-3 text-sm">
          <TierItem
            tier="ULTRA"
            description="20GB+ - Run largest models (70B+) with maximum context"
            isActive={hardwareInfo.vramTier === 'ultra'}
          />
          <TierItem
            tier="HIGH"
            description="12-20GB - Large models (13B-34B) with generous context"
            isActive={hardwareInfo.vramTier === 'high'}
          />
          <TierItem
            tier="MEDIUM"
            description="4-12GB - Best with 7B models, moderate context"
            isActive={hardwareInfo.vramTier === 'medium'}
          />
          <TierItem
            tier="LOW"
            description="< 4GB - Use smaller models (3B) and reduced context"
            isActive={hardwareInfo.vramTier === 'low'}
          />
        </div>
      </div>

      {/* Optimal settings for this tier */}
      <div className="bg-editor-bg rounded-lg p-4 border border-border">
        <h3 className="font-medium text-text-primary mb-3">Recommended Settings</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Your Tier&apos;s Max Context</span>
            <span className="text-accent font-mono">{optimalSettings.maxContextPotential.toLocaleString()} tokens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Current Model Limit</span>
            <span className="text-text-primary font-mono">{maxContextLength.toLocaleString()} tokens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Suggested Models</span>
            <span className="text-text-primary">{optimalSettings.suggestedModelSize}</span>
          </div>
          <p className="text-xs text-text-secondary mt-2 p-2 bg-sidebar-bg rounded">
            {optimalSettings.description}
          </p>
          {maxContextLength < optimalSettings.maxContextPotential && (
            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
              💡 Your hardware can handle {optimalSettings.maxContextPotential.toLocaleString()} tokens! 
              Choose a model with higher context (like Llama 3.1 128k, Qwen 2.5 32k, or Command-R 128k) to unlock your GPU&apos;s full potential.
            </div>
          )}
        </div>
      </div>

      {/* Optimize button */}
      <button
        onClick={onOptimize}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
      >
        <Zap className="w-5 h-5" />
        Optimize Settings for Writing
      </button>
      
      <p className="text-xs text-center text-text-secondary">
        This will configure optimal temperature, context, and sampling settings for your hardware tier.
      </p>
    </div>
  );
}

// Helper components
function SliderControl({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  displayValue,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  displayValue: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        <span className="text-sm text-accent font-mono">{displayValue}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
      />
      <p className="text-xs text-text-secondary mt-1">{description}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-secondary">{label}</div>
      <div className="text-sm text-text-primary font-medium truncate">{value}</div>
    </div>
  );
}

function TierItem({
  tier,
  description,
  isActive,
}: {
  tier: string;
  description: string;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded',
        isActive && 'bg-accent/10 border border-accent/30'
      )}
    >
      <Gauge className={cn('w-4 h-4', isActive ? 'text-accent' : 'text-text-secondary')} />
      <div>
        <span className={cn('font-medium', isActive ? 'text-accent' : 'text-text-primary')}>
          {tier}
        </span>
        <span className="text-text-secondary ml-2">{description}</span>
      </div>
    </div>
  );
}

// Council Tab - Configure reviewers
function CouncilTab() {
  const {
    reviewers,
    addReviewer,
    updateReviewer,
    removeReviewer,
    toggleReviewer,
    setEditorReviewer,
    resetToDefaults,
    getEditorReviewer,
    getCouncilReviewers,
  } = useCouncilStore();
  
  const { availableModels } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const editor = getEditorReviewer();
  const councilMembers = getCouncilReviewers();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-text-primary">Council of Writers</h3>
          <p className="text-sm text-text-secondary mt-1">
            Configure AI reviewers to analyze your writing
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent/10 text-accent hover:bg-accent/20 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Reviewer
          </button>
          <button
            onClick={resetToDefaults}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-border rounded transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
      
      {/* Workflow Explanation */}
      <div className="bg-editor-bg rounded-lg p-4 border border-border">
        <h4 className="font-medium text-text-primary mb-2">📋 Review Workflow</h4>
        <div className="text-sm text-text-secondary space-y-1">
          <p>1. <strong>Council Reviews</strong> - Each enabled reviewer analyzes your document</p>
          <p>2. <strong>Editor Synthesizes</strong> - The Editor combines all feedback</p>
          <p>3. <strong>You Decide</strong> - Review suggestions and approve changes</p>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-text-secondary">Current Editor:</span>
          {editor ? (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded">
              {editor.icon} {editor.name}
            </span>
          ) : (
            <span className="text-yellow-400">⚠️ No editor selected</span>
          )}
        </div>
      </div>
      
      {/* Add Reviewer Form */}
      {showAddForm && (
        <ReviewerForm
          onSave={(reviewer) => {
            addReviewer(reviewer);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          availableModels={availableModels}
        />
      )}
      
      {/* Editor Section */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
          📝 Editor <span className="text-xs text-text-secondary font-normal">(synthesizes council feedback)</span>
        </h4>
        {reviewers.filter(r => r.isEditor).map((reviewer) => (
          <div key={reviewer.id}>
            {editingId === reviewer.id ? (
              <ReviewerForm
                reviewer={reviewer}
                onSave={(updated) => {
                  updateReviewer(reviewer.id, updated);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                availableModels={availableModels}
              />
            ) : (
              <ReviewerCard
                reviewer={reviewer}
                onToggle={() => toggleReviewer(reviewer.id)}
                onEdit={() => setEditingId(reviewer.id)}
                onDelete={() => removeReviewer(reviewer.id)}
                onSetEditor={() => setEditorReviewer(reviewer.id)}
                isEditor={true}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Council Members Section */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
          👥 Council Members <span className="text-xs text-text-secondary font-normal">({councilMembers.length} active)</span>
        </h4>
        <div className="space-y-3">
          {reviewers.filter(r => !r.isEditor).map((reviewer) => (
            <div key={reviewer.id}>
              {editingId === reviewer.id ? (
                <ReviewerForm
                  reviewer={reviewer}
                  onSave={(updated) => {
                    updateReviewer(reviewer.id, updated);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                  availableModels={availableModels}
                />
              ) : (
                <ReviewerCard
                  reviewer={reviewer}
                  onToggle={() => toggleReviewer(reviewer.id)}
                  onEdit={() => setEditingId(reviewer.id)}
                  onDelete={() => removeReviewer(reviewer.id)}
                  onSetEditor={() => setEditorReviewer(reviewer.id)}
                  isEditor={false}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {reviewers.length === 0 && (
        <div className="text-center py-8 text-text-secondary">
          <Users className="w-12 h-12 mx-auto opacity-50 mb-3" />
          <p>No reviewers configured</p>
          <button
            onClick={resetToDefaults}
            className="mt-2 text-accent hover:underline"
          >
            Add default reviewers
          </button>
        </div>
      )}
    </div>
  );
}

// Reviewer Card Component
interface ReviewerCardProps {
  reviewer: Reviewer;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetEditor: () => void;
  isEditor: boolean;
}

function ReviewerCard({ reviewer, onToggle, onEdit, onDelete, onSetEditor, isEditor }: ReviewerCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-colors',
        reviewer.enabled
          ? isEditor 
            ? 'bg-pink-500/5 border-pink-500/30'
            : 'bg-accent/5 border-accent/30'
          : 'bg-editor-bg border-border'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className={cn(
              'mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              reviewer.enabled
                ? 'bg-accent border-accent text-white'
                : 'border-border hover:border-accent'
            )}
          >
            {reviewer.enabled && <Check className="w-3 h-3" />}
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{reviewer.icon}</span>
              <span className="font-medium text-text-primary">{reviewer.name}</span>
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: reviewer.color }}
              />
            </div>
            <p className="text-sm text-text-secondary mt-1">{reviewer.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
              <span>Model: <code className="bg-sidebar-bg px-1 rounded">{reviewer.model}</code></span>
              <span>Role: {reviewer.role}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {!isEditor && (
            <button
              onClick={onSetEditor}
              className="p-1.5 text-text-secondary hover:text-pink-400 hover:bg-pink-400/10 rounded transition-colors"
              title="Make this the Editor"
            >
              📝
            </button>
          )}
          {isEditor && (
            <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-400 rounded">
              Editor
            </span>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded transition-colors"
            title="Edit reviewer"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="Delete reviewer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Services Tab - Configure service URLs
interface ServicesTabProps {
  serviceURLs: ServiceURLs;
  onSetServiceURL: (service: keyof ServiceURLs, url: string) => void;
  onResetServiceURLs: () => void;
  webSearchSettings: WebSearchSettings;
  onSetWebSearchEnabled: (enabled: boolean) => void;
  onSetWebSearchAutoSearch: (auto: boolean) => void;
  onSetWebSearchPreferredEngine: (engine: 'searxng' | 'perplexica') => void;
}

function ServicesTab({ 
  serviceURLs, 
  onSetServiceURL, 
  onResetServiceURLs,
  webSearchSettings,
  onSetWebSearchEnabled,
  onSetWebSearchAutoSearch,
  onSetWebSearchPreferredEngine,
}: ServicesTabProps) {
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error' | null>>({});
  
  const services: { key: keyof ServiceURLs; name: string; description: string; defaultPort: number; healthEndpoint: string }[] = [
    {
      key: 'ollama',
      name: 'Ollama',
      description: 'Local LLM inference server',
      defaultPort: 11434,
      healthEndpoint: '/api/tags',
    },
    {
      key: 'lmstudio',
      name: 'LM Studio',
      description: 'Alternative local LLM server',
      defaultPort: 1234,
      healthEndpoint: '/v1/models',
    },
    {
      key: 'perplexica',
      name: 'Perplexica',
      description: 'AI-powered search with summaries',
      defaultPort: 3000,
      healthEndpoint: '/api/health',
    },
    {
      key: 'searxng',
      name: 'SearXNG',
      description: 'Privacy-respecting search engine',
      defaultPort: 4000,
      healthEndpoint: '/healthz',
    },
  ];
  
  const testConnection = async (key: keyof ServiceURLs, url: string, healthEndpoint: string) => {
    setTestResults(prev => ({ ...prev, [key]: 'testing' }));
    
    try {
      // Use the search API proxy for Perplexica and SearXNG
      if (key === 'perplexica' || key === 'searxng') {
        const response = await fetch(`/api/search?action=status`);
        const data = await response.json();
        const isOnline = key === 'perplexica' ? data.perplexica : data.searxng;
        setTestResults(prev => ({ ...prev, [key]: isOnline ? 'success' : 'error' }));
      } else {
        // Direct test for Ollama and LM Studio
        const response = await fetch(`${url}${healthEndpoint}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        setTestResults(prev => ({ ...prev, [key]: response.ok ? 'success' : 'error' }));
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [key]: 'error' }));
    }
  };
  
  const testAllConnections = () => {
    services.forEach(service => {
      testConnection(service.key, serviceURLs[service.key], service.healthEndpoint);
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-text-primary">Service URLs</h3>
          <p className="text-sm text-text-secondary mt-1">
            Configure URLs for Ollama, LM Studio, and search services
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={testAllConnections}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent/10 text-accent hover:bg-accent/20 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Test All
          </button>
          <button
            onClick={onResetServiceURLs}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-border rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>
      
      {/* Info box */}
      <div className="flex items-start gap-2 p-3 bg-accent/5 border border-accent/20 rounded-lg text-sm">
        <Info className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
        <div className="text-text-secondary">
          <p>If your services run on different ports or machines, update the URLs here.</p>
          <p className="mt-1">For Docker services, you may need to use <code className="bg-sidebar-bg px-1 rounded">host.docker.internal</code> as the hostname.</p>
        </div>
      </div>
      
      {/* Service list */}
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.key} className="bg-editor-bg rounded-lg p-4 border border-border">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-text-primary">{service.name}</h4>
                  {testResults[service.key] === 'testing' && (
                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                  )}
                  {testResults[service.key] === 'success' && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  )}
                  {testResults[service.key] === 'error' && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <X className="w-3 h-3" /> Failed
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">{service.description}</p>
              </div>
              <button
                onClick={() => testConnection(service.key, serviceURLs[service.key], service.healthEndpoint)}
                className="px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-accent/10 rounded transition-colors"
              >
                Test
              </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={serviceURLs[service.key]}
                onChange={(e) => onSetServiceURL(service.key, e.target.value)}
                placeholder={DEFAULT_SERVICE_URLS[service.key]}
                className="flex-1 px-3 py-2 bg-sidebar-bg border border-border rounded text-text-primary text-sm focus:border-accent focus:outline-none font-mono"
              />
            </div>
            
            <div className="mt-2 text-xs text-text-secondary">
              Default: <code className="bg-sidebar-bg px-1 rounded">{DEFAULT_SERVICE_URLS[service.key]}</code>
            </div>
          </div>
        ))}
      </div>
      
      {/* Common configurations */}
      <div className="bg-editor-bg rounded-lg p-4 border border-border">
        <h4 className="font-medium text-text-primary mb-3">Common Configurations</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-sidebar-bg rounded">
            <span className="text-text-secondary">Standard local setup</span>
            <button
              onClick={() => {
                onSetServiceURL('ollama', 'http://localhost:11434');
                onSetServiceURL('lmstudio', 'http://localhost:1234');
                onSetServiceURL('perplexica', 'http://localhost:3000');
                onSetServiceURL('searxng', 'http://localhost:4000');
              }}
              className="px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded"
            >
              Apply
            </button>
          </div>
          <div className="flex items-center justify-between p-2 bg-sidebar-bg rounded">
            <span className="text-text-secondary">Docker host access (from container)</span>
            <button
              onClick={() => {
                onSetServiceURL('ollama', 'http://host.docker.internal:11434');
                onSetServiceURL('lmstudio', 'http://host.docker.internal:1234');
                onSetServiceURL('perplexica', 'http://host.docker.internal:3000');
                onSetServiceURL('searxng', 'http://host.docker.internal:4000');
              }}
              className="px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded"
            >
              Apply
            </button>
          </div>
          <div className="flex items-center justify-between p-2 bg-sidebar-bg rounded">
            <span className="text-text-secondary">Remote server (edit URLs after applying)</span>
            <button
              onClick={() => {
                const host = 'http://192.168.1.100';
                onSetServiceURL('ollama', `${host}:11434`);
                onSetServiceURL('lmstudio', `${host}:1234`);
                onSetServiceURL('perplexica', `${host}:3000`);
                onSetServiceURL('searxng', `${host}:4000`);
              }}
              className="px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
      
      {/* AI Web Search Settings */}
      <div className="bg-editor-bg rounded-lg p-4 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-blue-500" />
          <h4 className="font-medium text-text-primary">AI Web Search</h4>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Allow the AI assistant to search the web for facts, statistics, and current information while helping you write.
        </p>
        
        <div className="space-y-4">
          {/* Enable Web Search */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-primary">Enable Web Search</div>
              <div className="text-xs text-text-secondary">AI can search the web to find information</div>
            </div>
            <button
              onClick={() => onSetWebSearchEnabled(!webSearchSettings.enabled)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                webSearchSettings.enabled ? 'bg-blue-500' : 'bg-border'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  webSearchSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          
          {/* Auto Search */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-primary">Auto Search</div>
              <div className="text-xs text-text-secondary">Automatically search when facts are needed</div>
            </div>
            <button
              onClick={() => onSetWebSearchAutoSearch(!webSearchSettings.autoSearch)}
              disabled={!webSearchSettings.enabled}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                !webSearchSettings.enabled && 'opacity-50',
                webSearchSettings.autoSearch && webSearchSettings.enabled ? 'bg-blue-500' : 'bg-border'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  webSearchSettings.autoSearch && webSearchSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          
          {/* Preferred Engine */}
          <div>
            <div className="text-sm text-text-primary mb-2">Preferred Search Engine</div>
            <div className="flex gap-2">
              <button
                onClick={() => onSetWebSearchPreferredEngine('searxng')}
                disabled={!webSearchSettings.enabled}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border text-sm transition-all',
                  !webSearchSettings.enabled && 'opacity-50',
                  webSearchSettings.preferredEngine === 'searxng' && webSearchSettings.enabled
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : 'border-border text-text-secondary hover:border-text-secondary'
                )}
              >
                <div className="font-medium">SearXNG</div>
                <div className="text-xs mt-0.5 opacity-70">Privacy-focused, fast</div>
              </button>
              <button
                onClick={() => onSetWebSearchPreferredEngine('perplexica')}
                disabled={!webSearchSettings.enabled}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border text-sm transition-all',
                  !webSearchSettings.enabled && 'opacity-50',
                  webSearchSettings.preferredEngine === 'perplexica' && webSearchSettings.enabled
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : 'border-border text-text-secondary hover:border-text-secondary'
                )}
              >
                <div className="font-medium">Perplexica</div>
                <div className="text-xs mt-0.5 opacity-70">AI-powered summaries</div>
              </button>
            </div>
          </div>
          
          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-text-secondary">
            <Info className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
            <div>
              When enabled, the AI can search the web during conversations to find up-to-date information, verify facts, and provide better assistance. You'll see a <span className="text-blue-500">Web</span> indicator in the chat when this is active.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reviewer Form Component
interface ReviewerFormProps {
  reviewer?: Reviewer;
  onSave: (reviewer: Omit<Reviewer, 'id'>) => void;
  onCancel: () => void;
  availableModels: Array<{ id: string; name: string; provider: string }>;
}

function ReviewerForm({ reviewer, onSave, onCancel, availableModels }: ReviewerFormProps) {
  const [name, setName] = useState(reviewer?.name || '');
  const [icon, setIcon] = useState(reviewer?.icon || '📝');
  const [description, setDescription] = useState(reviewer?.description || '');
  const [model, setModel] = useState(reviewer?.model || 'qwen3:latest');
  const [role, setRole] = useState<ReviewerRole>(reviewer?.role || 'custom');
  const [systemPrompt, setSystemPrompt] = useState(reviewer?.systemPrompt || DEFAULT_REVIEWERS[0].systemPrompt);
  const [color, setColor] = useState(reviewer?.color || '#3B82F6');
  const [enabled, setEnabled] = useState(reviewer?.enabled ?? true);
  
  const handleSave = () => {
    if (!name.trim()) return;
    
    onSave({
      name: name.trim(),
      icon,
      description: description.trim(),
      model,
      role,
      systemPrompt,
      color,
      enabled,
    });
  };
  
  const roleOptions: { value: ReviewerRole; label: string }[] = [
    { value: 'fact_checker', label: 'Fact Checker' },
    { value: 'style_editor', label: 'Style Editor' },
    { value: 'legal_reviewer', label: 'Legal Reviewer' },
    { value: 'medical_reviewer', label: 'Medical Reviewer' },
    { value: 'cultural_sensitivity', label: 'Cultural Sensitivity' },
    { value: 'technical_accuracy', label: 'Technical Accuracy' },
    { value: 'seo_optimizer', label: 'SEO Optimizer' },
    { value: 'accessibility_checker', label: 'Accessibility' },
    { value: 'custom', label: 'Custom' },
  ];
  
  const iconOptions = ['📚', '✍️', '⚖️', '🏥', '🌐', '🔬', '🔍', '♿', '📝', '🎯', '💡', '🔒', '📊', '🎨'];
  
  return (
    <div className="bg-editor-bg border border-border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Reviewer name"
            className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-text-primary text-sm focus:border-accent focus:outline-none"
          />
        </div>
        
        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Icon</label>
          <div className="flex flex-wrap gap-1">
            {iconOptions.map((i) => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={cn(
                  'w-8 h-8 rounded hover:bg-border transition-colors',
                  icon === i && 'bg-accent/20 ring-1 ring-accent'
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this reviewer do?"
          className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-text-primary text-sm focus:border-accent focus:outline-none"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-text-primary text-sm focus:border-accent focus:outline-none"
          >
            {availableModels.length > 0 ? (
              availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))
            ) : (
              <>
                <option value="qwen3:latest">qwen3:latest</option>
                <option value="llama3:latest">llama3:latest</option>
                <option value="mistral:latest">mistral:latest</option>
              </>
            )}
          </select>
        </div>
        
        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ReviewerRole)}
            className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-text-primary text-sm focus:border-accent focus:outline-none"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Highlight Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-12 h-8 rounded cursor-pointer"
        />
      </div>
      
      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          placeholder="Instructions for the reviewer..."
          className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-text-primary text-sm focus:border-accent focus:outline-none resize-none font-mono"
        />
        <p className="text-xs text-text-secondary mt-1">
          Tip: Include instructions to return feedback as JSON: [{'{'}line, type, text, comment, suggestion{'}'}]
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-border rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reviewer ? 'Save Changes' : 'Add Reviewer'}
        </button>
      </div>
    </div>
  );
}

