/**
 * Model Manager - VRAM-aware model loading/unloading for Ollama
 * 
 * Handles:
 * - Checking which models are currently loaded
 * - Unloading models to free VRAM
 * - Loading models and waiting for them to be ready
 * - Tracking model states across the app
 */

import { useCouncilStore } from '@/lib/store/useCouncilStore';

const OLLAMA_URL = 'http://localhost:11434';

export interface LoadedModel {
  name: string;
  size: number; // in bytes
  sizeVram: number; // VRAM used in bytes
  digest: string;
  expiresAt: string;
}

export interface ModelLoadingState {
  status: 'idle' | 'unloading' | 'loading' | 'ready' | 'error';
  currentModel: string | null;
  progress?: string;
  error?: string;
}

/**
 * Get list of currently loaded models from Ollama
 */
export async function getLoadedModels(): Promise<LoadedModel[]> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/ps`);
    if (!response.ok) {
      throw new Error(`Failed to get loaded models: ${response.statusText}`);
    }
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Error getting loaded models:', error);
    return [];
  }
}

/**
 * Check if a specific model is currently loaded
 */
export async function isModelLoaded(modelName: string): Promise<boolean> {
  const loaded = await getLoadedModels();
  return loaded.some((m) => m.name === modelName || m.name.startsWith(`${modelName}:`));
}

/**
 * Unload a model from VRAM
 * Uses keep_alive=0 to immediately unload
 */
export async function unloadModel(
  modelName: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  const { setModelLoading } = useCouncilStore.getState();
  
  try {
    onProgress?.(`📤 Unloading ${modelName}...`);
    setModelLoading(modelName, 'unloading');
    
    // Send a request with keep_alive: 0 to unload
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: '',
        keep_alive: 0, // Immediately unload
      }),
    });
    
    if (!response.ok) {
      // Model might already be unloaded, which is fine
      console.warn(`Unload response not ok: ${response.status}`);
    }
    
    // Wait a moment for VRAM to be freed
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Verify it's unloaded
    const stillLoaded = await isModelLoaded(modelName);
    if (stillLoaded) {
      console.warn(`Model ${modelName} still appears loaded after unload request`);
    }
    
    setModelLoading(modelName, 'loading'); // Clear status
    onProgress?.(`✅ ${modelName} unloaded`);
    return true;
  } catch (error) {
    console.error(`Error unloading model ${modelName}:`, error);
    setModelLoading(modelName, 'error');
    return false;
  }
}

/**
 * Unload ALL currently loaded models
 */
export async function unloadAllModels(
  onProgress?: (status: string) => void
): Promise<void> {
  const loaded = await getLoadedModels();
  
  if (loaded.length === 0) {
    onProgress?.('No models to unload');
    return;
  }
  
  onProgress?.(`📤 Unloading ${loaded.length} model(s)...`);
  
  for (const model of loaded) {
    await unloadModel(model.name, onProgress);
  }
  
  onProgress?.('✅ All models unloaded');
}

/**
 * Load a model and wait for it to be ready
 * Sends a small prompt to trigger loading
 */
export async function loadModel(
  modelName: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  const { setModelLoading, setLoadedModels } = useCouncilStore.getState();
  
  try {
    onProgress?.(`📥 Loading ${modelName}...`);
    setModelLoading(modelName, 'loading');
    
    // Check if already loaded
    if (await isModelLoaded(modelName)) {
      onProgress?.(`✅ ${modelName} already loaded`);
      setModelLoading(modelName, 'loaded');
      return true;
    }
    
    // Send a minimal prompt to trigger model loading
    // Using stream: true so we can detect when it starts responding
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: 'Hi', // Minimal prompt
        stream: false,
        options: {
          num_predict: 1, // Generate just 1 token to verify it's working
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }
    
    // Model is now loaded and responding
    setModelLoading(modelName, 'loaded');
    
    // Update loaded models list
    const loaded = await getLoadedModels();
    setLoadedModels(loaded.map((m) => m.name));
    
    onProgress?.(`✅ ${modelName} loaded and ready`);
    return true;
  } catch (error) {
    console.error(`Error loading model ${modelName}:`, error);
    setModelLoading(modelName, 'error');
    onProgress?.(`❌ Failed to load ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Switch from one model to another
 * Unloads the current model first to free VRAM, then loads the new one
 */
export async function switchModel(
  fromModel: string | null,
  toModel: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  // If switching to the same model, just verify it's loaded
  if (fromModel === toModel) {
    return await loadModel(toModel, onProgress);
  }
  
  // Unload the previous model if there is one
  if (fromModel) {
    onProgress?.(`🔄 Switching from ${fromModel} to ${toModel}...`);
    await unloadModel(fromModel, onProgress);
  }
  
  // Load the new model
  const success = await loadModel(toModel, onProgress);
  
  if (success) {
    onProgress?.(`✅ Switched to ${toModel}`);
  }
  
  return success;
}

/**
 * Get VRAM usage information
 */
export async function getVRAMUsage(): Promise<{
  totalUsed: number;
  models: { name: string; vram: number }[];
}> {
  const loaded = await getLoadedModels();
  
  const models = loaded.map((m) => ({
    name: m.name,
    vram: m.sizeVram,
  }));
  
  const totalUsed = models.reduce((sum, m) => sum + m.vram, 0);
  
  return { totalUsed, models };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Ensure a model is loaded, unloading others if necessary
 * This is the main function to use before running inference
 */
export async function ensureModelLoaded(
  modelName: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  const loaded = await getLoadedModels();
  
  // Check if our target model is already loaded
  const targetLoaded = loaded.find(
    (m) => m.name === modelName || m.name.startsWith(`${modelName}:`)
  );
  
  if (targetLoaded) {
    onProgress?.(`✅ ${modelName} already loaded (${formatBytes(targetLoaded.sizeVram)} VRAM)`);
    return true;
  }
  
  // Unload other models to make room
  if (loaded.length > 0) {
    onProgress?.(`📤 Freeing VRAM (${loaded.length} model(s) loaded)...`);
    for (const model of loaded) {
      await unloadModel(model.name, onProgress);
    }
    // Wait a bit for VRAM to be fully freed
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  // Load the target model
  return await loadModel(modelName, onProgress);
}














