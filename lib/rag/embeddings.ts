/**
 * Embedding Service
 * Generates embeddings using Ollama's embedding models
 */

import { useSettingsStore } from '../store/useSettingsStore';

// Default embedding model - nomic-embed-text is small and effective
const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  promptTokens?: number;
}

/**
 * Generate embeddings for a single text using Ollama
 */
export async function generateEmbedding(
  text: string,
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<EmbeddingResult> {
  const settings = useSettingsStore.getState();
  const ollamaUrl = settings.serviceURLs?.ollama || 'http://localhost:11434';

  try {
    const response = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      embedding: data.embedding,
      model,
      promptTokens: data.prompt_eval_count,
    };
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[],
  model: string = DEFAULT_EMBEDDING_MODEL,
  onProgress?: (current: number, total: number) => void
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i++) {
    const result = await generateEmbedding(texts[i], model);
    results.push(result);
    onProgress?.(i + 1, texts.length);
  }

  return results;
}

/**
 * Check if embedding model is available
 */
export async function checkEmbeddingModel(
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<boolean> {
  const settings = useSettingsStore.getState();
  const ollamaUrl = settings.serviceURLs?.ollama || 'http://localhost:11434';

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) return false;

    const data = await response.json();
    const models = data.models || [];
    
    return models.some((m: any) => m.name === model || m.name.startsWith(`${model}:`));
  } catch {
    return false;
  }
}

/**
 * Pull embedding model if not available
 */
export async function pullEmbeddingModel(
  model: string = DEFAULT_EMBEDDING_MODEL,
  onProgress?: (status: string) => void
): Promise<boolean> {
  const settings = useSettingsStore.getState();
  const ollamaUrl = settings.serviceURLs?.ollama || 'http://localhost:11434';

  try {
    onProgress?.(`Pulling ${model}...`);
    
    const response = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });

    if (!response.ok) {
      throw new Error(`Pull failed: ${response.statusText}`);
    }

    // Stream the response to track progress
    const reader = response.body?.getReader();
    if (!reader) return false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = new TextDecoder().decode(value);
      const lines = text.split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.status) {
            onProgress?.(json.status);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    onProgress?.('Model ready');
    return true;
  } catch (error) {
    console.error('Pull error:', error);
    return false;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const EMBEDDING_MODELS = [
  { id: 'nomic-embed-text', name: 'Nomic Embed Text', size: '274M', description: 'General purpose, good balance' },
  { id: 'mxbai-embed-large', name: 'MixedBread Large', size: '335M', description: 'High quality English' },
  { id: 'all-minilm', name: 'All MiniLM', size: '23M', description: 'Fast and lightweight' },
  { id: 'bge-m3', name: 'BGE M3', size: '568M', description: 'Multilingual support' },
];














