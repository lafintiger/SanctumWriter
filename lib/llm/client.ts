import { LLMMessage, LLMProviderType, StreamCallbacks } from '@/types';
import { documentTools, formatToolsForOllama, formatToolsForLMStudio, getAvailableTools } from './tools';

const OLLAMA_URL = 'http://localhost:11434';
const LMSTUDIO_URL = 'http://localhost:1234';

export interface LLMOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  contextLength?: number;
  enableWebSearch?: boolean;
}

// Rough token estimation (4 chars per token on average)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: LLMMessage[]): number {
  return messages.reduce((total, msg) => total + estimateTokens(msg.content), 0);
}

export async function getAvailableModels(provider: LLMProviderType): Promise<Array<{ id: string; name: string }>> {
  try {
    if (provider === 'ollama') {
      const response = await fetch(`${OLLAMA_URL}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch Ollama models');
      const data = await response.json();
      return (data.models || []).map((m: { name: string }) => ({
        id: m.name,
        name: m.name,
      }));
    } else {
      const response = await fetch(`${LMSTUDIO_URL}/v1/models`);
      if (!response.ok) throw new Error('Failed to fetch LM Studio models');
      const data = await response.json();
      return (data.data || []).map((m: { id: string }) => ({
        id: m.id,
        name: m.id,
      }));
    }
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

export async function checkProviderHealth(provider: LLMProviderType): Promise<boolean> {
  try {
    const url = provider === 'ollama' ? `${OLLAMA_URL}/api/tags` : `${LMSTUDIO_URL}/v1/models`;
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function streamChat(
  provider: LLMProviderType,
  model: string,
  messages: LLMMessage[],
  callbacks: StreamCallbacks,
  useTools: boolean = true,
  options: LLMOptions = {}
): Promise<void> {
  try {
    if (provider === 'ollama') {
      await streamOllamaChat(model, messages, callbacks, useTools, options);
    } else {
      await streamLMStudioChat(model, messages, callbacks, useTools, options);
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}

async function streamOllamaChat(
  model: string,
  messages: LLMMessage[],
  callbacks: StreamCallbacks,
  useTools: boolean,
  options: LLMOptions = {}
): Promise<void> {
  // Try with tools first, fall back to without if model doesn't support it
  let response = await tryOllamaRequest(model, messages, useTools, options);
  
  // If 400 error and we were using tools, retry without tools
  if (!response.ok && response.status === 400 && useTools) {
    console.log('Model does not support tools, retrying without...');
    response = await tryOllamaRequest(model, messages, false, options);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const data = JSON.parse(line);
        
        if (data.message?.content) {
          callbacks.onToken(data.message.content);
        }
        
        if (data.message?.tool_calls) {
          for (const toolCall of data.message.tool_calls) {
            callbacks.onToolCall({
              name: toolCall.function.name,
              arguments: typeof toolCall.function.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments,
            });
          }
        }
        
        if (data.done) {
          callbacks.onComplete();
        }
      } catch (e) {
        console.error('Error parsing Ollama response:', e);
      }
    }
  }
}

async function tryOllamaRequest(
  model: string,
  messages: LLMMessage[],
  useTools: boolean,
  options: LLMOptions = {}
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    options: {
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.9,
      top_k: options.topK ?? 40,
      repeat_penalty: options.repeatPenalty ?? 1.1,
      num_ctx: options.contextLength ?? 4096,
    },
  };

  if (useTools) {
    // Include web search tool if enabled
    const tools = getAvailableTools(options.enableWebSearch ?? false);
    body.tools = formatToolsForOllama(tools);
  }

  return fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function streamLMStudioChat(
  model: string,
  messages: LLMMessage[],
  callbacks: StreamCallbacks,
  useTools: boolean,
  options: LLMOptions = {}
): Promise<void> {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature: options.temperature ?? 0.7,
    top_p: options.topP ?? 0.9,
    max_tokens: options.contextLength ?? 4096,
    frequency_penalty: (options.repeatPenalty ?? 1.1) - 1, // Convert to OpenAI format
  };

  // LM Studio may not support tools, so we'll try without them by default
  // and only add them if explicitly requested and the model supports it
  if (useTools) {
    const tools = getAvailableTools(options.enableWebSearch ?? false);
    body.tools = formatToolsForLMStudio(tools);
    body.tool_choice = 'auto';
  }

  let response = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Retry without tools if error
  if (!response.ok && useTools) {
    const retryBody = { model, messages, stream: true };
    response = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(retryBody),
    });
  }

  if (!response.ok) {
    throw new Error(`LM Studio error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let toolCallBuffer: { name: string; arguments: string } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim() || line.startsWith(':')) continue;
      if (line === 'data: [DONE]') {
        if (toolCallBuffer && toolCallBuffer.arguments) {
          try {
            callbacks.onToolCall({
              name: toolCallBuffer.name,
              arguments: JSON.parse(toolCallBuffer.arguments),
            });
          } catch (e) {
            console.error('Error parsing tool arguments:', e);
          }
        }
        callbacks.onComplete();
        return;
      }

      const data = line.replace(/^data: /, '');
      if (!data) continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;

        if (delta?.content) {
          callbacks.onToken(delta.content);
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name) {
              toolCallBuffer = { name: tc.function.name, arguments: '' };
            }
            if (tc.function?.arguments && toolCallBuffer) {
              toolCallBuffer.arguments += tc.function.arguments;
            }
          }
        }

        if (parsed.choices?.[0]?.finish_reason === 'stop') {
          callbacks.onComplete();
        }
      } catch {
        // Skip invalid JSON chunks
      }
    }
  }
}

export async function nonStreamingChat(
  provider: LLMProviderType,
  model: string,
  messages: LLMMessage[],
  useTools: boolean = false
): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }> }> {
  if (provider === 'ollama') {
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: false,
    };
    if (useTools) {
      body.tools = formatToolsForOllama(documentTools);
    }

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data = await response.json();
    
    return {
      content: data.message?.content || '',
      toolCalls: data.message?.tool_calls?.map((tc: { function: { name: string; arguments: string | Record<string, unknown> } }) => ({
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
      })),
    };
  } else {
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: false,
    };
    if (useTools) {
      body.tools = formatToolsForLMStudio(documentTools);
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`LM Studio error: ${response.statusText}`);
    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      toolCalls: choice?.message?.tool_calls?.map((tc: { function: { name: string; arguments: string | Record<string, unknown> } }) => ({
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
      })),
    };
  }
}
