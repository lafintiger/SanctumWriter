import { create } from 'zustand';
import { ChatMessage, ToolCall } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStreamingMessage: string;
  
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, content: string) => void;
  addToolCallToMessage: (messageId: string, toolCall: ToolCall) => void;
  updateToolCallResult: (messageId: string, toolCallId: string, result: ToolCall['result']) => void;
  
  setIsStreaming: (isStreaming: boolean) => void;
  setCurrentStreamingMessage: (content: string) => void;
  appendToStreamingMessage: (content: string) => void;
  
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentStreamingMessage: '',
  
  addMessage: (message) => {
    const id = uuidv4();
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
    return id;
  },
  
  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },
  
  appendToMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      ),
    }));
  },
  
  addToolCallToMessage: (messageId, toolCall) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, toolCalls: [...(m.toolCalls || []), toolCall] }
          : m
      ),
    }));
  },
  
  updateToolCallResult: (messageId, toolCallId, result) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              toolCalls: m.toolCalls?.map((tc) =>
                tc.id === toolCallId ? { ...tc, result } : tc
              ),
            }
          : m
      ),
    }));
  },
  
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setCurrentStreamingMessage: (content) => set({ currentStreamingMessage: content }),
  appendToStreamingMessage: (content) => {
    set((state) => ({
      currentStreamingMessage: state.currentStreamingMessage + content,
    }));
  },
  
  clearMessages: () => set({ messages: [], currentStreamingMessage: '' }),
}));














