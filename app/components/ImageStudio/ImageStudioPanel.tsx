'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Image,
  Sparkles,
  FileText,
  Play,
  Square,
  Copy,
  FolderOpen,
  Trash2,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ImagePlus,
  Maximize2,
  ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useImageStore, 
  AspectRatio, 
  ASPECT_RATIOS,
  GeneratedImage,
} from '@/lib/store/useImageStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import { 
  loadWorkflow, 
  prepareWorkflow, 
  workflowToPrompt,
  generateFilename,
} from '@/lib/image/comfyClient';

export function ImageStudioPanel() {
  const {
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    aiEnhanceEnabled,
    setAiEnhanceEnabled,
    status,
    setStatus,
    resetStatus,
    history,
    addToHistory,
    removeFromHistory,
    selectedImageId,
    setSelectedImageId,
    settings,
    toggleImageStudioPanel,
  } = useImageStore();

  const { currentDocument, updateDocumentContent, selection, showToast } = useAppStore();
  const { workspacePath } = useSettingsStore();
  
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [showEnhancedPreview, setShowEnhancedPreview] = useState(false);
  const [aspectDropdownOpen, setAspectDropdownOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check ComfyUI connection on mount
  useEffect(() => {
    checkConnection();
  }, [settings.comfyuiUrl]);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/image/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comfyuiUrl: settings.comfyuiUrl }),
      });
      const data = await response.json();
      setIsConnected(data.connected);
    } catch {
      setIsConnected(false);
    }
  };

  // Extract visual elements from selection
  const handleFromSelection = useCallback(() => {
    if (selection?.text) {
      setPrompt(selection.text);
      showToast('Extracted text from selection', 'success');
    } else if (currentDocument?.content) {
      // Use first paragraph or summary
      const lines = currentDocument.content.split('\n').filter(l => l.trim());
      const firstContent = lines.find(l => !l.startsWith('#')) || lines[0] || '';
      setPrompt(firstContent.slice(0, 500));
      showToast('Extracted from document', 'success');
    }
  }, [selection, currentDocument, setPrompt, showToast]);

  // AI Enhancement (uses Ollama)
  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setStatus({ isGenerating: true, error: null });
    
    try {
      const response = await fetch(`http://localhost:11434/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3', // Will use whatever model is loaded
          prompt: `You are an expert at writing prompts for Z-Image, an AI image generation model. 

Your task is to expand a simple prompt into a detailed, descriptive prompt following this structure:
1. Subject & Action - who/what, doing what
2. Environment & Context - where, surrounding elements  
3. Lighting & Atmosphere - time of day, mood, weather, colors
4. Style & Technical Details - realism vs illustration, camera info

Important rules:
- Write in natural language sentences, NOT keyword tags
- Be specific and descriptive
- Keep it under 150 words
- Do NOT include any explanations, just output the enhanced prompt

User's simple prompt: "${prompt}"

Enhanced prompt:`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance prompt');
      }

      const data = await response.json();
      const enhanced = data.response.trim();
      setEnhancedPrompt(enhanced);
      setShowEnhancedPreview(true);
    } catch (error) {
      showToast('Failed to enhance prompt. Is Ollama running?', 'error');
    } finally {
      setStatus({ isGenerating: false });
    }
  }, [prompt, setStatus, showToast]);

  // Use enhanced prompt
  const handleUseEnhanced = useCallback(() => {
    if (enhancedPrompt) {
      setPrompt(enhancedPrompt);
      setShowEnhancedPreview(false);
      setEnhancedPrompt(null);
    }
  }, [enhancedPrompt, setPrompt]);

  // Generate image
  const handleGenerate = useCallback(async () => {
    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      showToast('Please enter a prompt', 'error');
      return;
    }

    if (!isConnected) {
      showToast('ComfyUI is not connected', 'error');
      return;
    }

    setStatus({
      isGenerating: true,
      error: null,
      progress: 0,
      currentStep: 0,
    });

    try {
      // Load and prepare workflow
      const workflow = await loadWorkflow();
      const filenamePrefix = generateFilename(finalPrompt);
      
      const preparedWorkflow = prepareWorkflow(workflow, {
        prompt: finalPrompt,
        aspectRatio,
        filenamePrefix,
      });

      const promptPayload = workflowToPrompt(preparedWorkflow);

      // Queue the generation
      const queueResponse = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptPayload,
          comfyuiUrl: settings.comfyuiUrl,
        }),
      });

      if (!queueResponse.ok) {
        const error = await queueResponse.json();
        throw new Error(error.error || 'Failed to queue generation');
      }

      const { prompt_id } = await queueResponse.json();
      setStatus({ promptId: prompt_id });

      // Start polling for status
      pollStatus(prompt_id, finalPrompt, filenamePrefix);
    } catch (error) {
      console.error('Generation error:', error);
      setStatus({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      });
      showToast('Generation failed', 'error');
    }
  }, [prompt, aspectRatio, isConnected, settings.comfyuiUrl, setStatus, showToast]);

  // Poll for generation status
  const pollStatus = useCallback((promptId: string, originalPrompt: string, filenamePrefix: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    let pollCount = 0;
    const maxPolls = 120; // 2 minutes max

    pollingRef.current = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        clearInterval(pollingRef.current!);
        setStatus({
          isGenerating: false,
          error: 'Generation timed out',
        });
        return;
      }

      try {
        const response = await fetch(
          `/api/image/status?promptId=${promptId}&comfyuiUrl=${encodeURIComponent(settings.comfyuiUrl)}`
        );
        const data = await response.json();

        if (data.completed && data.images?.length > 0) {
          clearInterval(pollingRef.current!);
          
          // Save the first image
          const imageData = data.images[0];
          const saveResponse = await fetch('/api/image', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: imageData.url,
              filename: `${filenamePrefix}.png`,
              outputFolder: settings.outputFolder,
              workspace: workspacePath || './documents',
            }),
          });

          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            
            const { width, height } = ASPECT_RATIOS[aspectRatio];
            const newImage: GeneratedImage = {
              id: promptId,
              prompt: originalPrompt,
              aspectRatio,
              width,
              height,
              filename: saveData.filename,
              relativePath: saveData.relativePath,
              timestamp: Date.now(),
            };

            addToHistory(newImage);
            setSelectedImageId(promptId);
            showToast('Image generated successfully!', 'success');
          }

          setStatus({
            isGenerating: false,
            progress: 100,
            currentStep: 9,
          });
        } else if (data.status === 'error') {
          clearInterval(pollingRef.current!);
          setStatus({
            isGenerating: false,
            error: data.error || 'Generation failed',
          });
        } else if (data.status === 'running') {
          // Estimate progress based on poll count (rough estimate)
          const estimatedProgress = Math.min(90, pollCount * 10);
          setStatus({ progress: estimatedProgress });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);
  }, [settings.comfyuiUrl, settings.outputFolder, workspacePath, aspectRatio, addToHistory, setSelectedImageId, setStatus, showToast]);

  // Cancel generation
  const handleCancel = useCallback(async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Try to interrupt ComfyUI
    try {
      await fetch(`${settings.comfyuiUrl}/interrupt`, { method: 'POST' });
    } catch {
      // Ignore errors
    }
    
    resetStatus();
    showToast('Generation cancelled', 'info');
  }, [settings.comfyuiUrl, resetStatus, showToast]);

  // Insert image into document
  const handleInsert = useCallback((image: GeneratedImage) => {
    if (!currentDocument) {
      showToast('No document open', 'error');
      return;
    }

    const markdown = `![](${image.relativePath})`;
    const content = currentDocument.content;
    
    // Insert at cursor or end
    const newContent = selection?.from !== undefined
      ? content.slice(0, selection.from) + markdown + content.slice(selection.to || selection.from)
      : content + '\n\n' + markdown;

    updateDocumentContent(newContent);
    showToast('Image inserted', 'success');
  }, [currentDocument, selection, updateDocumentContent, showToast]);

  // Copy path to clipboard
  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path);
    showToast('Path copied to clipboard', 'success');
  }, [showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const selectedImage = history.find(img => img.id === selectedImageId);

  return (
    <div className="h-full flex flex-col bg-sidebar-bg border-l border-border w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Image Studio</span>
        </div>
        <div className="flex items-center gap-1">
          {isConnected === true && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
            </span>
          )}
          {isConnected === false && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="w-3 h-3" />
            </span>
          )}
          <button
            onClick={toggleImageStudioPanel}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Prompt
          </label>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create..."
            className="w-full h-24 px-3 py-2 text-sm bg-editor-bg border border-border rounded-lg focus:border-accent focus:outline-none resize-none"
            disabled={status.isGenerating}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFromSelection}
              disabled={status.isGenerating}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-border hover:bg-border/80 rounded text-text-secondary hover:text-text-primary disabled:opacity-50"
            >
              <FileText className="w-3 h-3" />
              From Selection
            </button>
            
            <button
              onClick={() => setAiEnhanceEnabled(!aiEnhanceEnabled)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs rounded",
                aiEnhanceEnabled
                  ? "bg-accent/20 text-accent"
                  : "bg-border text-text-secondary hover:text-text-primary"
              )}
            >
              <Sparkles className="w-3 h-3" />
              AI Enhance: {aiEnhanceEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* AI Enhance Preview */}
          {aiEnhanceEnabled && prompt.trim() && !showEnhancedPreview && (
            <button
              onClick={handleEnhancePrompt}
              disabled={status.isGenerating}
              className="w-full py-1.5 text-xs bg-accent/10 hover:bg-accent/20 text-accent rounded disabled:opacity-50"
            >
              ✨ Preview Enhanced Prompt
            </button>
          )}

          {showEnhancedPreview && enhancedPrompt && (
            <div className="p-2 bg-accent/10 border border-accent/30 rounded-lg space-y-2">
              <p className="text-xs text-text-secondary">Enhanced:</p>
              <p className="text-xs text-text-primary leading-relaxed">{enhancedPrompt}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleUseEnhanced}
                  className="flex-1 py-1 text-xs bg-accent text-white rounded hover:bg-accent/80"
                >
                  Use This
                </button>
                <button
                  onClick={() => {
                    setShowEnhancedPreview(false);
                    setEnhancedPrompt(null);
                  }}
                  className="px-2 py-1 text-xs bg-border text-text-secondary rounded hover:bg-border/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Aspect Ratio
          </label>
          <div className="relative">
            <button
              onClick={() => setAspectDropdownOpen(!aspectDropdownOpen)}
              disabled={status.isGenerating}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-editor-bg border border-border rounded-lg hover:border-accent disabled:opacity-50"
            >
              <span>{ASPECT_RATIOS[aspectRatio].label}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", aspectDropdownOpen && "rotate-180")} />
            </button>
            
            {aspectDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-sidebar-bg border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                {(Object.entries(ASPECT_RATIOS) as [AspectRatio, typeof ASPECT_RATIOS[AspectRatio]][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setAspectRatio(key);
                      setAspectDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-border",
                      aspectRatio === key && "bg-accent/10 text-accent"
                    )}
                  >
                    <span>{config.label}</span>
                    <span className="text-xs text-text-secondary">{config.width}×{config.height}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            {ASPECT_RATIOS[aspectRatio].description} • {ASPECT_RATIOS[aspectRatio].width}×{ASPECT_RATIOS[aspectRatio].height}
          </p>
        </div>

        {/* Generate Button */}
        <div className="space-y-2">
          {status.isGenerating ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary">{status.progress}%</span>
              </div>
              <button
                onClick={handleCancel}
                className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
              >
                <Square className="w-4 h-4" />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !isConnected}
              className="w-full flex items-center justify-center gap-2 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Generate
            </button>
          )}
          
          {status.error && (
            <p className="text-xs text-red-400">{status.error}</p>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Recent Generations
            </label>
            <div className="grid grid-cols-3 gap-2">
              {history.slice(0, 9).map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageId(image.id)}
                  onDoubleClick={() => setPreviewImage(image)}
                  className={cn(
                    "aspect-square bg-editor-bg border rounded-lg overflow-hidden hover:border-accent transition-colors relative group",
                    selectedImageId === image.id ? "border-accent ring-1 ring-accent" : "border-border"
                  )}
                  title="Click to select, double-click to preview"
                >
                  <img
                    src={`/api/image/view?path=${encodeURIComponent(image.relativePath)}&workspace=${encodeURIComponent(workspacePath || './documents')}`}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><rect width="24" height="24" fill="%23222"/><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="w-4 h-4 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Image Actions */}
        {selectedImage && (
          <div className="p-3 bg-editor-bg border border-border rounded-lg space-y-2">
            <p className="text-xs text-text-secondary truncate" title={selectedImage.prompt}>
              {selectedImage.prompt}
            </p>
            <p className="text-xs text-text-secondary">
              {selectedImage.relativePath}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleInsert(selectedImage)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80"
              >
                <ImagePlus className="w-3 h-3" />
                Insert
              </button>
              <button
                onClick={() => setPreviewImage(selectedImage)}
                className="p-1.5 bg-border text-text-secondary rounded hover:bg-border/80"
                title="Preview full size"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleCopyPath(selectedImage.relativePath)}
                className="p-1.5 bg-border text-text-secondary rounded hover:bg-border/80"
                title="Copy path"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => removeFromHistory(selectedImage.id)}
                className="p-1.5 bg-border text-red-400 rounded hover:bg-red-500/20"
                title="Remove from history"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Connection Info */}
        {!isConnected && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">
              ComfyUI is not connected. Make sure it's running at:
            </p>
            <p className="text-xs text-text-secondary mt-1 font-mono">
              {settings.comfyuiUrl}
            </p>
            <button
              onClick={checkConnection}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Retry connection
            </button>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-sidebar-bg rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image */}
            <div className="relative">
              <img
                src={`/api/image/view?path=${encodeURIComponent(previewImage.relativePath)}&workspace=${encodeURIComponent(workspacePath || './documents')}`}
                alt={previewImage.prompt}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>

            {/* Info bar */}
            <div className="p-4 border-t border-border">
              <p className="text-sm text-text-primary mb-2 line-clamp-2">
                {previewImage.prompt}
              </p>
              <div className="flex items-center justify-between">
                <div className="text-xs text-text-secondary">
                  {previewImage.width}×{previewImage.height} • {ASPECT_RATIOS[previewImage.aspectRatio].label}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleInsert(previewImage);
                      setPreviewImage(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80"
                  >
                    <ImagePlus className="w-3 h-3" />
                    Insert
                  </button>
                  <button
                    onClick={() => handleCopyPath(previewImage.relativePath)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-border text-text-secondary rounded hover:bg-border/80"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Path
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

