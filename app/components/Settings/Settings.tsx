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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore, WRITING_PRESETS, WritingPreset, GPU_PRESETS, getOptimalSettingsForTier } from '@/lib/store/useSettingsStore';
import { useAppStore } from '@/lib/store/useAppStore';
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
    autoConfigureForModel,
    autoConfigureForHardware,
    selectGPU,
    optimizeForWriting,
  } = useSettingsStore();

  const { provider, model } = useAppStore();
  const [activeTab, setActiveTab] = useState<'writing' | 'model' | 'hardware'>('writing');
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isDetectingHardware, setIsDetectingHardware] = useState(false);

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
        <div className="flex border-b border-border">
          {[
            { id: 'writing', label: 'Writing Style', icon: BookOpen },
            { id: 'model', label: 'Model Settings', icon: Sliders },
            { id: 'hardware', label: 'Hardware', icon: Cpu },
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
            Your RTX 5090 can handle up to {hardwareTierMax.toLocaleString()} tokens! 
            Set this based on your needs. Higher = more document context, but may slow generation.
          </p>
        </div>
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

