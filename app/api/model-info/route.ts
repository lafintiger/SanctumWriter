import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';

interface OllamaModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

interface OllamaShowResponse {
  modelfile: string;
  parameters: string;
  template: string;
  details: OllamaModelDetails;
  model_info?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider') || 'ollama';
  const model = searchParams.get('model');

  if (!model) {
    return NextResponse.json({ error: 'Model name required' }, { status: 400 });
  }

  try {
    if (provider === 'ollama') {
      // Get detailed model info from Ollama
      const showResponse = await fetch(`${OLLAMA_URL}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });

      if (!showResponse.ok) {
        throw new Error(`Ollama API error: ${showResponse.status}`);
      }

      const showData: OllamaShowResponse = await showResponse.json();
      
      // Parse context length from parameters or model_info
      let contextLength = 4096; // Default
      if (showData.parameters) {
        const numCtxMatch = showData.parameters.match(/num_ctx\s+(\d+)/);
        if (numCtxMatch) {
          contextLength = parseInt(numCtxMatch[1], 10);
        }
      }
      
      // Check model_info for context length
      const modelInfo = showData.model_info as Record<string, unknown> | undefined;
      if (modelInfo) {
        // Different models store this in different keys
        const contextKeys = [
          'context_length',
          'llama.context_length', 
          'qwen2.context_length',
          'gemma.context_length'
        ];
        for (const key of contextKeys) {
          if (typeof modelInfo[key] === 'number') {
            contextLength = modelInfo[key] as number;
            break;
          }
        }
      }

      // Get model size from API
      const tagsResponse = await fetch(`${OLLAMA_URL}/api/tags`);
      let modelSize = 0;
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json();
        const modelEntry = tagsData.models?.find((m: { name: string; size: number }) => 
          m.name === model || m.name.startsWith(model + ':')
        );
        if (modelEntry) {
          modelSize = modelEntry.size || 0;
        }
      }

      return NextResponse.json({
        name: model,
        size: modelSize,
        parameterSize: showData.details?.parameter_size || 'Unknown',
        quantization: showData.details?.quantization_level || 'Unknown',
        contextLength,
        family: showData.details?.family || 'Unknown',
        format: showData.details?.format || 'Unknown',
      });
    } else {
      // LM Studio - limited info available
      const response = await fetch(`${LMSTUDIO_URL}/v1/models`);
      if (!response.ok) {
        throw new Error('LM Studio not available');
      }
      
      const data = await response.json();
      const modelData = data.data?.find((m: { id: string }) => m.id === model);
      
      return NextResponse.json({
        name: model,
        size: 0, // Not available from LM Studio API
        parameterSize: 'Unknown',
        quantization: 'Unknown',
        contextLength: 4096, // Default, LM Studio doesn't expose this
        family: 'Unknown',
      });
    }
  } catch (error) {
    console.error('Error fetching model info:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch model info' },
      { status: 500 }
    );
  }
}





