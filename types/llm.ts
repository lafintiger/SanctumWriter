export type LLMProviderType = 'ollama' | 'lmstudio';

export interface LLMProvider {
  type: LLMProviderType;
  baseUrl: string;
  model: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProviderType;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { 
      type: string; 
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  done: boolean;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall: (toolCall: { name: string; arguments: Record<string, unknown> }) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}














