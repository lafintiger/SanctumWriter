import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WritingPreset = 'academic' | 'creative' | 'business' | 'journalism' | 'technical' | 'casual' | 'custom';

export interface ModelInfo {
  name: string;
  size: number; // in bytes
  parameterSize: string; // e.g., "7B", "13B"
  quantization: string; // e.g., "Q4_0", "Q8_0", "F16"
  contextLength: number;
  family: string;
}

export interface WritingPresetConfig {
  name: string;
  description: string;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
}

// GPU Presets for manual selection
export interface GPUPreset {
  id: string;
  name: string;
  vendor: 'nvidia' | 'amd' | 'apple' | 'intel' | 'other';
  vramMB: number;
  tier: 'low' | 'medium' | 'high' | 'ultra';
}

export const GPU_PRESETS: GPUPreset[] = [
  // NVIDIA RTX 50 Series (Latest)
  { id: 'rtx5090', name: 'NVIDIA RTX 5090', vendor: 'nvidia', vramMB: 32768, tier: 'ultra' },
  { id: 'rtx5090-laptop', name: 'NVIDIA RTX 5090 Laptop', vendor: 'nvidia', vramMB: 24576, tier: 'ultra' },
  { id: 'rtx5080', name: 'NVIDIA RTX 5080', vendor: 'nvidia', vramMB: 16384, tier: 'high' },
  { id: 'rtx5070ti', name: 'NVIDIA RTX 5070 Ti', vendor: 'nvidia', vramMB: 16384, tier: 'high' },
  { id: 'rtx5070', name: 'NVIDIA RTX 5070', vendor: 'nvidia', vramMB: 12288, tier: 'high' },
  
  // NVIDIA RTX 40 Series
  { id: 'rtx4090', name: 'NVIDIA RTX 4090', vendor: 'nvidia', vramMB: 24576, tier: 'ultra' },
  { id: 'rtx4080super', name: 'NVIDIA RTX 4080 Super', vendor: 'nvidia', vramMB: 16384, tier: 'high' },
  { id: 'rtx4080', name: 'NVIDIA RTX 4080', vendor: 'nvidia', vramMB: 16384, tier: 'high' },
  { id: 'rtx4070tisuper', name: 'NVIDIA RTX 4070 Ti Super', vendor: 'nvidia', vramMB: 16384, tier: 'high' },
  { id: 'rtx4070ti', name: 'NVIDIA RTX 4070 Ti', vendor: 'nvidia', vramMB: 12288, tier: 'high' },
  { id: 'rtx4070super', name: 'NVIDIA RTX 4070 Super', vendor: 'nvidia', vramMB: 12288, tier: 'high' },
  { id: 'rtx4070', name: 'NVIDIA RTX 4070', vendor: 'nvidia', vramMB: 12288, tier: 'high' },
  { id: 'rtx4060ti', name: 'NVIDIA RTX 4060 Ti', vendor: 'nvidia', vramMB: 8192, tier: 'medium' },
  { id: 'rtx4060', name: 'NVIDIA RTX 4060', vendor: 'nvidia', vramMB: 8192, tier: 'medium' },
  
  // NVIDIA RTX 30 Series
  { id: 'rtx3090ti', name: 'NVIDIA RTX 3090 Ti', vendor: 'nvidia', vramMB: 24576, tier: 'ultra' },
  { id: 'rtx3090', name: 'NVIDIA RTX 3090', vendor: 'nvidia', vramMB: 24576, tier: 'ultra' },
  { id: 'rtx3080ti', name: 'NVIDIA RTX 3080 Ti', vendor: 'nvidia', vramMB: 12288, tier: 'high' },
  { id: 'rtx3080', name: 'NVIDIA RTX 3080', vendor: 'nvidia', vramMB: 10240, tier: 'high' },
  { id: 'rtx3070ti', name: 'NVIDIA RTX 3070 Ti', vendor: 'nvidia', vramMB: 8192, tier: 'medium' },
  { id: 'rtx3070', name: 'NVIDIA RTX 3070', vendor: 'nvidia', vramMB: 8192, tier: 'medium' },
  { id: 'rtx3060', name: 'NVIDIA RTX 3060', vendor: 'nvidia', vramMB: 12288, tier: 'high' },
  { id: 'rtx3060ti', name: 'NVIDIA RTX 3060 Ti', vendor: 'nvidia', vramMB: 8192, tier: 'medium' },
  
  // AMD Radeon RX 7000 Series
  { id: 'rx7900xtx', name: 'AMD RX 7900 XTX', vendor: 'amd', vramMB: 24576, tier: 'ultra' },
  { id: 'rx7900xt', name: 'AMD RX 7900 XT', vendor: 'amd', vramMB: 20480, tier: 'ultra' },
  { id: 'rx7900gre', name: 'AMD RX 7900 GRE', vendor: 'amd', vramMB: 16384, tier: 'high' },
  { id: 'rx7800xt', name: 'AMD RX 7800 XT', vendor: 'amd', vramMB: 16384, tier: 'high' },
  { id: 'rx7700xt', name: 'AMD RX 7700 XT', vendor: 'amd', vramMB: 12288, tier: 'high' },
  { id: 'rx7600', name: 'AMD RX 7600', vendor: 'amd', vramMB: 8192, tier: 'medium' },
  
  // Apple Silicon (unified memory - values are max configurable memory)
  // M4 Series
  { id: 'm4ultra', name: 'Apple M4 Ultra (512GB)', vendor: 'apple', vramMB: 524288, tier: 'ultra' },
  { id: 'm4max', name: 'Apple M4 Max (128GB)', vendor: 'apple', vramMB: 131072, tier: 'ultra' },
  { id: 'm4pro', name: 'Apple M4 Pro (64GB)', vendor: 'apple', vramMB: 65536, tier: 'ultra' },
  { id: 'm4', name: 'Apple M4 (32GB)', vendor: 'apple', vramMB: 32768, tier: 'ultra' },
  
  // M3 Series
  { id: 'm3ultra512', name: 'Apple M3 Ultra (512GB)', vendor: 'apple', vramMB: 524288, tier: 'ultra' },
  { id: 'm3ultra256', name: 'Apple M3 Ultra (256GB)', vendor: 'apple', vramMB: 262144, tier: 'ultra' },
  { id: 'm3ultra192', name: 'Apple M3 Ultra (192GB)', vendor: 'apple', vramMB: 196608, tier: 'ultra' },
  { id: 'm3max128', name: 'Apple M3 Max (128GB)', vendor: 'apple', vramMB: 131072, tier: 'ultra' },
  { id: 'm3max96', name: 'Apple M3 Max (96GB)', vendor: 'apple', vramMB: 98304, tier: 'ultra' },
  { id: 'm3max64', name: 'Apple M3 Max (64GB)', vendor: 'apple', vramMB: 65536, tier: 'ultra' },
  { id: 'm3pro36', name: 'Apple M3 Pro (36GB)', vendor: 'apple', vramMB: 36864, tier: 'ultra' },
  { id: 'm3pro18', name: 'Apple M3 Pro (18GB)', vendor: 'apple', vramMB: 18432, tier: 'high' },
  { id: 'm3', name: 'Apple M3 (24GB)', vendor: 'apple', vramMB: 24576, tier: 'high' },
  
  // M2 Series
  { id: 'm2ultra192', name: 'Apple M2 Ultra (192GB)', vendor: 'apple', vramMB: 196608, tier: 'ultra' },
  { id: 'm2ultra128', name: 'Apple M2 Ultra (128GB)', vendor: 'apple', vramMB: 131072, tier: 'ultra' },
  { id: 'm2max96', name: 'Apple M2 Max (96GB)', vendor: 'apple', vramMB: 98304, tier: 'ultra' },
  { id: 'm2max64', name: 'Apple M2 Max (64GB)', vendor: 'apple', vramMB: 65536, tier: 'ultra' },
  { id: 'm2pro32', name: 'Apple M2 Pro (32GB)', vendor: 'apple', vramMB: 32768, tier: 'ultra' },
  { id: 'm2pro16', name: 'Apple M2 Pro (16GB)', vendor: 'apple', vramMB: 16384, tier: 'high' },
  { id: 'm2', name: 'Apple M2 (24GB)', vendor: 'apple', vramMB: 24576, tier: 'high' },
  
  // M1 Series
  { id: 'm1ultra128', name: 'Apple M1 Ultra (128GB)', vendor: 'apple', vramMB: 131072, tier: 'ultra' },
  { id: 'm1ultra64', name: 'Apple M1 Ultra (64GB)', vendor: 'apple', vramMB: 65536, tier: 'ultra' },
  { id: 'm1max64', name: 'Apple M1 Max (64GB)', vendor: 'apple', vramMB: 65536, tier: 'ultra' },
  { id: 'm1max32', name: 'Apple M1 Max (32GB)', vendor: 'apple', vramMB: 32768, tier: 'ultra' },
  { id: 'm1pro32', name: 'Apple M1 Pro (32GB)', vendor: 'apple', vramMB: 32768, tier: 'ultra' },
  { id: 'm1pro16', name: 'Apple M1 Pro (16GB)', vendor: 'apple', vramMB: 16384, tier: 'high' },
  { id: 'm1', name: 'Apple M1 (16GB)', vendor: 'apple', vramMB: 16384, tier: 'high' },
  
  // Intel Arc
  { id: 'arca770', name: 'Intel Arc A770', vendor: 'intel', vramMB: 16384, tier: 'high' },
  { id: 'arca750', name: 'Intel Arc A750', vendor: 'intel', vramMB: 8192, tier: 'medium' },
  
  // Generic tiers for custom
  { id: 'generic-ultra', name: 'Generic 24GB+ GPU', vendor: 'other', vramMB: 24576, tier: 'ultra' },
  { id: 'generic-high', name: 'Generic 12-16GB GPU', vendor: 'other', vramMB: 12288, tier: 'high' },
  { id: 'generic-medium', name: 'Generic 8GB GPU', vendor: 'other', vramMB: 8192, tier: 'medium' },
  { id: 'generic-low', name: 'Generic 4GB GPU', vendor: 'other', vramMB: 4096, tier: 'low' },
  { id: 'cpu-only', name: 'CPU Only (No GPU)', vendor: 'other', vramMB: 0, tier: 'low' },
];

// Optimal settings based on hardware tier for MAXIMUM writing performance
export interface OptimalSettings {
  contextLength: number;
  maxContextPotential: number; // What this tier CAN handle
  suggestedModelSize: string;
  description: string;
}

export function getOptimalSettingsForTier(tier: 'low' | 'medium' | 'high' | 'ultra' | 'unknown', modelMaxContext?: number): OptimalSettings {
  // These are the TIER capabilities - what your hardware can handle
  // The actual context used may be limited by the model you choose
  switch (tier) {
    case 'ultra':
      return {
        contextLength: modelMaxContext ? Math.min(131072, modelMaxContext) : 32768,
        maxContextPotential: 131072, // 128k - ULTRA tier can handle massive context
        suggestedModelSize: '70B+ or multiple 13B models',
        description: 'Maximum power! Use largest models (Llama 70B, Qwen 72B, Mixtral 8x22B) with full context. Perfect for long-form writing, novel chapters, and complex analysis.',
      };
    case 'high':
      return {
        contextLength: modelMaxContext ? Math.min(32768, modelMaxContext) : 16384,
        maxContextPotential: 32768, // 32k context
        suggestedModelSize: '13B-34B models',
        description: 'Excellent for serious writing. Run Llama 13B, Qwen 14B, Mixtral 8x7B with generous context.',
      };
    case 'medium':
      return {
        contextLength: modelMaxContext ? Math.min(16384, modelMaxContext) : 8192,
        maxContextPotential: 16384, // 16k context
        suggestedModelSize: '7B-13B models',
        description: 'Good balance of quality and speed. Llama 7B, Mistral 7B, Qwen 7B work great.',
      };
    case 'low':
    case 'unknown':
    default:
      return {
        contextLength: modelMaxContext ? Math.min(8192, modelMaxContext) : 4096,
        maxContextPotential: 8192, // 8k context
        suggestedModelSize: '3B-7B models',
        description: 'Focus on efficient models like Phi-3, Gemma 2B, Llama 3.2 1B/3B.',
      };
  }
}

export const WRITING_PRESETS: Record<WritingPreset, WritingPresetConfig> = {
  academic: {
    name: 'Academic',
    description: 'Formal, precise writing for research and scholarly work',
    temperature: 0.3,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
  },
  creative: {
    name: 'Creative',
    description: 'Expressive, varied writing for fiction and poetry',
    temperature: 0.85,
    topP: 0.95,
    topK: 80,
    repeatPenalty: 1.05,
  },
  business: {
    name: 'Business',
    description: 'Professional, clear writing for reports and proposals',
    temperature: 0.4,
    topP: 0.9,
    topK: 50,
    repeatPenalty: 1.1,
  },
  journalism: {
    name: 'Journalism',
    description: 'Factual, engaging writing for articles and news',
    temperature: 0.5,
    topP: 0.9,
    topK: 60,
    repeatPenalty: 1.1,
  },
  technical: {
    name: 'Technical',
    description: 'Precise, structured writing for documentation',
    temperature: 0.2,
    topP: 0.85,
    topK: 30,
    repeatPenalty: 1.15,
  },
  casual: {
    name: 'Casual',
    description: 'Conversational writing for blogs and personal content',
    temperature: 0.7,
    topP: 0.95,
    topK: 70,
    repeatPenalty: 1.0,
  },
  custom: {
    name: 'Custom',
    description: 'Your own settings',
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
  },
};

interface HardwareInfo {
  vram: number | null; // in MB, null if unknown
  vramTier: 'low' | 'medium' | 'high' | 'ultra' | 'unknown';
  renderer: string;
  vendor: string;
  selectedGPU: string | null; // GPU preset ID
  isManualSelection: boolean;
}

// Service URLs configuration
export interface ServiceURLs {
  ollama: string;
  lmstudio: string;
  perplexica: string;
  searxng: string;
}

export const DEFAULT_SERVICE_URLS: ServiceURLs = {
  ollama: 'http://localhost:11434',
  lmstudio: 'http://localhost:1234',
  perplexica: 'http://localhost:3000',
  searxng: 'http://localhost:4000',
};

// Web search settings
export interface WebSearchSettings {
  enabled: boolean;       // Whether AI can use web search
  autoSearch: boolean;    // Automatically search when facts are needed
  preferredEngine: 'searxng' | 'perplexica';
}

interface SettingsState {
  // Writing settings
  writingPreset: WritingPreset;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  contextLength: number;
  maxContextLength: number;
  
  // Model info
  currentModelInfo: ModelInfo | null;
  
  // Hardware info
  hardwareInfo: HardwareInfo;
  
  // Service URLs
  serviceURLs: ServiceURLs;
  
  // Web search settings
  webSearchSettings: WebSearchSettings;
  
  // Workspace
  workspacePath: string;
  
  // Context tracking
  contextUsed: number; // tokens used
  
  // Settings modal
  showSettings: boolean;
  
  // Actions
  setWritingPreset: (preset: WritingPreset) => void;
  setTemperature: (temp: number) => void;
  setTopP: (topP: number) => void;
  setTopK: (topK: number) => void;
  setRepeatPenalty: (penalty: number) => void;
  setContextLength: (length: number) => void;
  setMaxContextLength: (length: number) => void;
  setCurrentModelInfo: (info: ModelInfo | null) => void;
  setHardwareInfo: (info: HardwareInfo) => void;
  setServiceURL: (service: keyof ServiceURLs, url: string) => void;
  resetServiceURLs: () => void;
  setWorkspacePath: (path: string) => void;
  setContextUsed: (used: number) => void;
  toggleSettings: () => void;
  setShowSettings: (show: boolean) => void;
  
  // Web search settings
  setWebSearchEnabled: (enabled: boolean) => void;
  setWebSearchAutoSearch: (auto: boolean) => void;
  setWebSearchPreferredEngine: (engine: 'searxng' | 'perplexica') => void;
  
  // Auto-configuration
  autoConfigureForModel: (modelInfo: ModelInfo) => void;
  autoConfigureForHardware: (hardwareInfo: HardwareInfo) => void;
  
  // Manual GPU selection
  selectGPU: (gpuId: string) => void;
  optimizeForWriting: () => void;
}

function getVRAMTier(vramMB: number | null): 'low' | 'medium' | 'high' | 'ultra' | 'unknown' {
  if (vramMB === null) return 'unknown';
  if (vramMB < 4000) return 'low';      // < 4GB
  if (vramMB < 12000) return 'medium';  // 4-12GB
  if (vramMB < 20000) return 'high';    // 12-20GB
  return 'ultra';                        // 20GB+
}

function suggestContextLength(vramMB: number | null, modelSize: number, maxContext: number): number {
  if (vramMB === null) return Math.min(4096, maxContext);
  
  // For high-VRAM systems, be more generous with context
  const tier = getVRAMTier(vramMB);
  const optimal = getOptimalSettingsForTier(tier, maxContext);
  
  // If model size is known, do a more precise calculation
  if (modelSize > 0) {
    const modelMemoryMB = modelSize / (1024 * 1024);
    const availableForContext = vramMB - modelMemoryMB - 1000; // 1GB buffer for system
    
    if (availableForContext > 16000) {
      return Math.min(32768, maxContext);
    } else if (availableForContext > 8000) {
      return Math.min(16384, maxContext);
    } else if (availableForContext > 4000) {
      return Math.min(8192, maxContext);
    } else if (availableForContext > 2000) {
      return Math.min(4096, maxContext);
    }
  }
  
  return optimal.contextLength;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Default values
      writingPreset: 'casual',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      contextLength: 4096,
      maxContextLength: 128000,
      
      currentModelInfo: null,
      
      hardwareInfo: {
        vram: null,
        vramTier: 'unknown',
        renderer: '',
        vendor: '',
        selectedGPU: null,
        isManualSelection: false,
      },
      
      serviceURLs: { ...DEFAULT_SERVICE_URLS },
      
      webSearchSettings: {
        enabled: true,  // Enable by default since user requested this feature
        autoSearch: true,
        preferredEngine: 'searxng',
      },
      
      workspacePath: './documents',
      
      contextUsed: 0,
      showSettings: false,
      
      // Actions
      setWritingPreset: (preset) => {
        const config = WRITING_PRESETS[preset];
        set({
          writingPreset: preset,
          temperature: config.temperature,
          topP: config.topP,
          topK: config.topK,
          repeatPenalty: config.repeatPenalty,
        });
      },
      
      setTemperature: (temperature) => set({ temperature, writingPreset: 'custom' }),
      setTopP: (topP) => set({ topP, writingPreset: 'custom' }),
      setTopK: (topK) => set({ topK, writingPreset: 'custom' }),
      setRepeatPenalty: (repeatPenalty) => set({ repeatPenalty, writingPreset: 'custom' }),
      setContextLength: (contextLength) => set({ contextLength }),
      setMaxContextLength: (maxContextLength) => set({ maxContextLength }),
      setCurrentModelInfo: (currentModelInfo) => set({ currentModelInfo }),
      setHardwareInfo: (hardwareInfo) => set({ hardwareInfo }),
      setServiceURL: (service, url) => set((state) => ({
        serviceURLs: { ...state.serviceURLs, [service]: url },
      })),
      resetServiceURLs: () => set({ serviceURLs: { ...DEFAULT_SERVICE_URLS } }),
      setWorkspacePath: (workspacePath) => set({ workspacePath }),
      setContextUsed: (contextUsed) => set({ contextUsed }),
      toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
      setShowSettings: (showSettings) => set({ showSettings }),
      
      // Web search settings
      setWebSearchEnabled: (enabled) => set((state) => ({
        webSearchSettings: { ...state.webSearchSettings, enabled },
      })),
      setWebSearchAutoSearch: (autoSearch) => set((state) => ({
        webSearchSettings: { ...state.webSearchSettings, autoSearch },
      })),
      setWebSearchPreferredEngine: (preferredEngine) => set((state) => ({
        webSearchSettings: { ...state.webSearchSettings, preferredEngine },
      })),
      
      autoConfigureForModel: (modelInfo) => {
        const { hardwareInfo } = get();
        const suggestedContext = suggestContextLength(
          hardwareInfo.vram,
          modelInfo.size,
          modelInfo.contextLength
        );
        
        set({
          currentModelInfo: modelInfo,
          maxContextLength: modelInfo.contextLength,
          contextLength: suggestedContext,
        });
      },
      
      autoConfigureForHardware: (hardwareInfo) => {
        const vramTier = getVRAMTier(hardwareInfo.vram);
        set({
          hardwareInfo: { ...hardwareInfo, vramTier },
        });
        
        // Adjust context based on VRAM tier if we have model info
        const { currentModelInfo } = get();
        if (currentModelInfo) {
          const suggestedContext = suggestContextLength(
            hardwareInfo.vram,
            currentModelInfo.size,
            currentModelInfo.contextLength
          );
          set({ contextLength: suggestedContext });
        }
      },
      
      selectGPU: (gpuId) => {
        const gpu = GPU_PRESETS.find(g => g.id === gpuId);
        if (!gpu) return;
        
        const vramTier = gpu.tier === 'ultra' ? 'ultra' : 
                         gpu.tier === 'high' ? 'high' : 
                         gpu.tier === 'medium' ? 'medium' : 'low';
        
        set({
          hardwareInfo: {
            vram: gpu.vramMB,
            vramTier,
            renderer: gpu.name,
            vendor: gpu.vendor,
            selectedGPU: gpuId,
            isManualSelection: true,
          },
        });
        
        // Set context based on tier's full potential (not limited by current model)
        const optimal = getOptimalSettingsForTier(vramTier);
        const { currentModelInfo } = get();
        
        if (currentModelInfo && currentModelInfo.contextLength > 0) {
          // If model has a limit, use the minimum of tier potential and model limit
          const suggestedContext = Math.min(optimal.maxContextPotential, currentModelInfo.contextLength);
          set({ contextLength: suggestedContext });
        } else {
          // No model info - use tier's default
          set({ contextLength: optimal.contextLength });
        }
      },
      
      optimizeForWriting: () => {
        const { hardwareInfo, maxContextLength } = get();
        const optimal = getOptimalSettingsForTier(hardwareInfo.vramTier);
        
        // Set context to the maximum available (tier potential or model limit, whichever is lower)
        const optimalContext = maxContextLength > 0 
          ? Math.min(optimal.maxContextPotential, maxContextLength)
          : optimal.contextLength;
        
        set({ contextLength: optimalContext });
        
        // For writing, we want a balanced preset - not too conservative, not too wild
        // "Creative" is good for most writing, with adjustments for tier
        if (hardwareInfo.vramTier === 'ultra') {
          // For ultra tier, maximize settings for the richest output
          set({
            writingPreset: 'creative',
            temperature: 0.75,
            topP: 0.95,
            topK: 80,
            repeatPenalty: 1.05,
          });
        } else if (hardwareInfo.vramTier === 'high') {
          set({
            writingPreset: 'creative',
            temperature: 0.72,
            topP: 0.92,
            topK: 70,
            repeatPenalty: 1.08,
          });
        } else {
          set({
            writingPreset: 'creative',
            temperature: 0.7,
            topP: 0.9,
            topK: 60,
            repeatPenalty: 1.1,
          });
        }
      },
    }),
    {
      name: 'sanctum-writer-settings',
      partialize: (state) => ({
        writingPreset: state.writingPreset,
        temperature: state.temperature,
        topP: state.topP,
        topK: state.topK,
        repeatPenalty: state.repeatPenalty,
        contextLength: state.contextLength,
        hardwareInfo: state.hardwareInfo, // Persist hardware selection
        serviceURLs: state.serviceURLs, // Persist service URLs
        webSearchSettings: state.webSearchSettings, // Persist web search settings
        workspacePath: state.workspacePath, // Persist workspace path
      }),
    }
  )
);

