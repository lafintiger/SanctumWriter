export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  status?: 'pending' | 'streaming' | 'complete' | 'error';
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: { 
    success: boolean; 
    message?: string;
  };
}

export interface ChatContext {
  documentContent: string;
  documentPath: string;
  selection?: {
    text: string;
    fromLine: number;
    toLine: number;
  };
}














