'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, CheckCircle, XCircle, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/useAppStore';
import { useChatStore } from '@/lib/store/useChatStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import { useWorkflowStore, STAGE_LABELS } from '@/lib/store/useWorkflowStore';
import { streamChat, estimateMessagesTokens, LLMOptions } from '@/lib/llm/client';
import { getSystemPrompt, WorkflowContext } from '@/lib/llm/tools';
import { parseToolCallToOperation, executeOperation } from '@/lib/editor/operations';
import { ChatMessage, LLMMessage } from '@/types';
import { EditorView } from '@codemirror/view';
import { v4 as uuidv4 } from 'uuid';

interface ChatProps {
  editorView: EditorView | null;
}

function MessageContent({ message }: { message: ChatMessage }) {
  return (
    <div
      className={cn(
        'chat-message rounded-lg px-3 py-2 max-w-full',
        message.role === 'user' ? 'bg-user-message' : 'bg-ai-message'
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          message.role === 'user' ? 'bg-border' : 'bg-accent/20'
        )}>
          {message.role === 'user' ? (
            <User className="w-3.5 h-3.5 text-text-secondary" />
          ) : (
            <Bot className="w-3.5 h-3.5 text-accent" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary whitespace-pre-wrap break-words">
            {message.content}
            {message.status === 'streaming' && (
              <span className="inline-block w-2 h-4 bg-accent ml-0.5 animate-pulse" />
            )}
          </div>
          
          {/* Tool calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.toolCalls.map((tc) => (
                <div
                  key={tc.id}
                  className="flex items-center gap-2 text-xs bg-sidebar-bg rounded px-2 py-1"
                >
                  <Wand2 className="w-3 h-3 text-accent" />
                  <span className="text-text-secondary">{tc.name}</span>
                  {tc.result && (
                    tc.result.success ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Chat({ editorView }: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { currentDocument, selection, provider, model, showToast } = useAppStore();
  const {
    messages,
    isStreaming,
    addMessage,
    updateMessage,
    appendToMessage,
    addToolCallToMessage,
    updateToolCallResult,
    setIsStreaming,
  } = useChatStore();
  const { 
    temperature, 
    topP, 
    topK, 
    repeatPenalty, 
    contextLength,
    setContextUsed,
  } = useSettingsStore();
  
  const { getWorkflow, getProgress } = useWorkflowStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    if (!currentDocument) {
      showToast('Open a document first', 'info');
      return;
    }

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addMessage({ role: 'user', content: userMessage, status: 'complete' });

    // Create assistant message placeholder
    const assistantId = addMessage({
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    setIsStreaming(true);

    // Get workflow context if available
    let workflowContext: WorkflowContext | undefined;
    const workflow = getWorkflow(currentDocument.path);
    if (workflow) {
      const progress = getProgress(currentDocument.path);
      const pendingItems = workflow.checklist
        .filter(item => item.stage === workflow.currentStage && !item.completed)
        .map(item => item.label);
      
      workflowContext = {
        currentStage: workflow.currentStage,
        stageLabel: STAGE_LABELS[workflow.currentStage],
        progress,
        pendingItems,
        notes: workflow.notes,
      };
    }

    // Build messages array with context
    const systemPrompt = getSystemPrompt(
      currentDocument.content,
      currentDocument.path,
      selection ? {
        text: selection.text,
        fromLine: selection.fromLine,
        toLine: selection.toLine,
      } : undefined,
      workflowContext
    );

    const llmMessages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      // Include recent conversation history
      ...messages.slice(-6).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    // Track context usage
    const contextUsed = estimateMessagesTokens(llmMessages);
    setContextUsed(contextUsed);

    // Build options from settings
    const llmOptions: LLMOptions = {
      temperature,
      topP,
      topK,
      repeatPenalty,
      contextLength,
    };

    try {
      await streamChat(
        provider,
        model,
        llmMessages,
        {
          onToken: (token) => {
            appendToMessage(assistantId, token);
          },
          onToolCall: (toolCall) => {
            const toolCallId = uuidv4();
            addToolCallToMessage(assistantId, {
              id: toolCallId,
              name: toolCall.name,
              arguments: toolCall.arguments,
            });

            // Execute the tool call
            if (editorView) {
              const operation = parseToolCallToOperation(toolCall.name, toolCall.arguments);
              const result = executeOperation(editorView, operation);
              
              updateToolCallResult(assistantId, toolCallId, {
                success: result.success,
                message: result.message,
              });

              if (result.success) {
                showToast(result.message, 'success');
              } else {
                showToast(result.message, 'error');
              }
            }
          },
          onComplete: () => {
            updateMessage(assistantId, { status: 'complete' });
            setIsStreaming(false);
          },
          onError: (error) => {
            updateMessage(assistantId, {
              status: 'error',
              content: `Error: ${error.message}`,
            });
            setIsStreaming(false);
            showToast(`Chat error: ${error.message}`, 'error');
          },
        },
        true, // Use tools
        llmOptions
      );
    } catch (error) {
      updateMessage(assistantId, {
        status: 'error',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setIsStreaming(false);
    }
  }, [
    input,
    isStreaming,
    currentDocument,
    selection,
    provider,
    model,
    messages,
    editorView,
    addMessage,
    appendToMessage,
    addToolCallToMessage,
    updateToolCallResult,
    updateMessage,
    setIsStreaming,
    showToast,
    temperature,
    topP,
    topK,
    repeatPenalty,
    contextLength,
    setContextUsed,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col bg-chat-bg">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Bot className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-text-primary">Assistant</span>
        {selection && (
          <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
            Selection active
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary text-sm py-8">
            <Bot className="w-10 h-10 mx-auto mb-3 text-accent opacity-50" />
            <p>Ask me to help with your document</p>
            <p className="text-xs mt-2">
              Select text and ask me to rewrite it,<br />
              or ask for any writing assistance
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageContent key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selection
                ? 'Ask about the selected text...'
                : 'Ask for writing help...'
            }
            className="flex-1 px-3 py-2 bg-sidebar-bg border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary resize-none focus:outline-none focus:border-accent min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={isStreaming}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className={cn(
              'p-2 rounded-lg transition-colors',
              input.trim() && !isStreaming
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-border text-text-secondary cursor-not-allowed'
            )}
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

