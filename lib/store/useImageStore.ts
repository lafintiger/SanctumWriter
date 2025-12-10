'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AspectRatio = 
  | 'square'        // 1024×1024
  | 'blog-header'   // 1920×1088  
  | 'portrait'      // 1088×1920
  | 'book-cover'    // 1024×1536
  | 'photo'         // 1536×1024
  | 'cinematic';    // 2016×864

export interface AspectRatioConfig {
  label: string;
  width: number;
  height: number;
  description: string;
}

export const ASPECT_RATIOS: Record<AspectRatio, AspectRatioConfig> = {
  'square': { label: 'Square 1:1', width: 1024, height: 1024, description: 'Social posts' },
  'blog-header': { label: 'Blog Header 16:9', width: 1920, height: 1088, description: 'Article heroes' },
  'portrait': { label: 'Portrait 9:16', width: 1088, height: 1920, description: 'Mobile/Stories' },
  'book-cover': { label: 'Book Cover 2:3', width: 1024, height: 1536, description: 'Publishing' },
  'photo': { label: 'Photo 3:2', width: 1536, height: 1024, description: 'Standard photo' },
  'cinematic': { label: 'Cinematic 21:9', width: 2016, height: 864, description: 'Wide scenes' },
};

export interface GeneratedImage {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  filename: string;
  relativePath: string;
  timestamp: number;
  seed?: number;
}

export interface GenerationStatus {
  isGenerating: boolean;
  promptId: string | null;
  progress: number; // 0-100
  currentStep: number;
  totalSteps: number;
  error: string | null;
}

interface ImageState {
  // Panel visibility
  showImageStudioPanel: boolean;
  toggleImageStudioPanel: () => void;
  
  // Current generation inputs
  prompt: string;
  setPrompt: (prompt: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  aiEnhanceEnabled: boolean;
  setAiEnhanceEnabled: (enabled: boolean) => void;
  
  // Generation status
  status: GenerationStatus;
  setStatus: (status: Partial<GenerationStatus>) => void;
  resetStatus: () => void;
  
  // History
  history: GeneratedImage[];
  addToHistory: (image: GeneratedImage) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  // Selected image (for preview/insertion)
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  
  // Settings
  settings: {
    comfyuiUrl: string;
    outputFolder: string;
    filmGrainEnabled: boolean;
    sharpeningEnabled: boolean;
    showEnhancedPreview: boolean;
  };
  updateSettings: (settings: Partial<ImageState['settings']>) => void;
}

const initialStatus: GenerationStatus = {
  isGenerating: false,
  promptId: null,
  progress: 0,
  currentStep: 0,
  totalSteps: 9,
  error: null,
};

export const useImageStore = create<ImageState>()(
  persist(
    (set, get) => ({
      // Panel visibility
      showImageStudioPanel: false,
      toggleImageStudioPanel: () => set((state) => ({ 
        showImageStudioPanel: !state.showImageStudioPanel 
      })),
      
      // Current generation inputs
      prompt: '',
      setPrompt: (prompt) => set({ prompt }),
      aspectRatio: 'blog-header',
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      aiEnhanceEnabled: true,
      setAiEnhanceEnabled: (aiEnhanceEnabled) => set({ aiEnhanceEnabled }),
      
      // Generation status
      status: initialStatus,
      setStatus: (status) => set((state) => ({ 
        status: { ...state.status, ...status } 
      })),
      resetStatus: () => set({ status: initialStatus }),
      
      // History
      history: [],
      addToHistory: (image) => set((state) => ({ 
        history: [image, ...state.history].slice(0, 50) // Keep last 50
      })),
      removeFromHistory: (id) => set((state) => ({
        history: state.history.filter((img) => img.id !== id)
      })),
      clearHistory: () => set({ history: [] }),
      
      // Selected image
      selectedImageId: null,
      setSelectedImageId: (selectedImageId) => set({ selectedImageId }),
      
      // Settings
      settings: {
        comfyuiUrl: 'http://127.0.0.1:8188',
        outputFolder: './images/generated',
        filmGrainEnabled: true,
        sharpeningEnabled: true,
        showEnhancedPreview: true,
      },
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: 'sanctum-image-store',
      partialize: (state) => ({
        history: state.history,
        aspectRatio: state.aspectRatio,
        aiEnhanceEnabled: state.aiEnhanceEnabled,
        settings: state.settings,
      }),
    }
  )
);

