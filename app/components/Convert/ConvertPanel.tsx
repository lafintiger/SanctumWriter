'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  FileUp, 
  FileText, 
  Loader2, 
  Check, 
  X, 
  Download,
  AlertCircle,
  RefreshCw,
  Link,
  FileType,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import { useAppStore } from '@/lib/store/useAppStore';

interface ConversionResult {
  success: boolean;
  markdown: string;
  metadata: {
    title: string;
    pages?: number;
    source_file?: string;
    source_url?: string;
  };
  saved_path?: string;
  character_count: number;
  word_count: number;
}

interface ConvertPanelProps {
  onClose: () => void;
}

export function ConvertPanel({ onClose }: ConvertPanelProps) {
  const { workspacePath } = useSettingsStore();
  const { showToast, openDocument } = useAppStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doclingAvailable, setDoclingAvailable] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [customFilename, setCustomFilename] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check Docling availability
  const checkDocling = useCallback(async () => {
    try {
      const response = await fetch('/api/convert');
      const data = await response.json();
      setDoclingAvailable(data.available);
    } catch {
      setDoclingAvailable(false);
    }
  }, []);
  
  React.useEffect(() => {
    checkDocling();
  }, [checkDocling]);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };
  
  const handleFileSelect = (file: File) => {
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/html',
    ];
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const supportedExts = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'html', 'htm'];
    
    if (!supportedTypes.includes(file.type) && !supportedExts.includes(ext || '')) {
      setError(`Unsupported file type. Supported: ${supportedExts.join(', ')}`);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setResult(null);
    setCustomFilename(file.name.replace(/\.[^/.]+$/, ''));
  };
  
  const handleConvert = async () => {
    if (!selectedFile && !urlInput) {
      setError('Please select a file or enter a URL');
      return;
    }
    
    setIsConverting(true);
    setError(null);
    setResult(null);
    
    try {
      const formData = new FormData();
      
      if (activeTab === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      }
      
      // Include workspace path for saving
      if (workspacePath) {
        formData.append('outputPath', workspacePath);
      }
      
      if (customFilename) {
        formData.append('filename', `${customFilename}.md`);
      }
      
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed');
      }
      
      setResult(data);
      showToast('Document converted successfully!', 'success');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Conversion failed';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsConverting(false);
    }
  };
  
  const handleOpenInEditor = () => {
    if (!result) return;
    
    const doc = {
      path: result.saved_path || `${customFilename || 'converted'}.md`,
      name: `${customFilename || result.metadata.title || 'converted'}.md`,
      content: result.markdown,
      isDirty: !result.saved_path,
    };
    
    openDocument(doc);
    showToast('Document opened in editor', 'success');
    onClose();
  };
  
  const handleDownload = () => {
    if (!result) return;
    
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customFilename || result.metadata.title || 'converted'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-sidebar-bg border border-border rounded-lg shadow-2xl w-[600px] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Convert to Markdown</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* Docling Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg mb-4",
            doclingAvailable === true && "bg-green-500/10 text-green-500",
            doclingAvailable === false && "bg-red-500/10 text-red-500",
            doclingAvailable === null && "bg-border text-text-secondary"
          )}>
            {doclingAvailable === null && (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Checking Docling...</span>
              </>
            )}
            {doclingAvailable === true && (
              <>
                <Check className="w-4 h-4" />
                <span className="text-sm">Docling is installed and ready</span>
              </>
            )}
            {doclingAvailable === false && (
              <>
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Docling not installed</span>
                <button
                  onClick={checkDocling}
                  className="ml-auto p-1 hover:bg-border rounded"
                  title="Recheck"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          
          {doclingAvailable === false && (
            <div className="mb-4 p-4 bg-editor-bg rounded-lg border border-border">
              <p className="text-sm text-text-primary mb-2">To enable PDF conversion, install Docling:</p>
              <div className="bg-sidebar-bg p-3 rounded font-mono text-xs text-text-secondary">
                <p className="text-accent">pip install -r requirements.txt</p>
                <p className="mt-2 text-text-secondary">or</p>
                <p className="text-accent mt-1">pip install docling</p>
              </div>
            </div>
          )}
          
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('file')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'file'
                  ? 'bg-accent text-white'
                  : 'bg-border text-text-secondary hover:text-text-primary'
              )}
            >
              <FileType className="w-4 h-4" />
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'url'
                  ? 'bg-accent text-white'
                  : 'bg-border text-text-secondary hover:text-text-primary'
              )}
              disabled
              title="Coming soon"
            >
              <Link className="w-4 h-4" />
              From URL
            </button>
          </div>
          
          {/* File Upload */}
          {activeTab === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/50',
                selectedFile && 'border-accent bg-accent/5'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.html,.htm"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12 text-accent" />
                  <p className="text-sm font-medium text-text-primary">{selectedFile.name}</p>
                  <p className="text-xs text-text-secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileUp className="w-12 h-12 text-text-secondary" />
                  <p className="text-sm text-text-primary">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-text-secondary">
                    Supports: PDF, DOCX, PPTX, XLSX, HTML
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Output filename */}
          {selectedFile && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Output filename
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="flex-1 px-3 py-2 bg-editor-bg border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent"
                  placeholder="Document name"
                />
                <span className="text-sm text-text-secondary">.md</span>
              </div>
            </div>
          )}
          
          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          
          {/* Convert Button */}
          {selectedFile && !result && (
            <button
              onClick={handleConvert}
              disabled={isConverting || !doclingAvailable}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Convert to Markdown
                </>
              )}
            </button>
          )}
          
          {/* Result */}
          {result && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-500">Conversion successful!</span>
                </div>
                <div className="text-sm text-text-secondary space-y-1">
                  <p>Title: {result.metadata.title}</p>
                  {result.metadata.pages && <p>Pages: {result.metadata.pages}</p>}
                  <p>Words: {result.word_count.toLocaleString()}</p>
                  <p>Characters: {result.character_count.toLocaleString()}</p>
                </div>
              </div>
              
              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Preview
                </label>
                <div className="bg-editor-bg border border-border rounded-lg p-3 max-h-48 overflow-auto">
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                    {result.markdown.slice(0, 1000)}
                    {result.markdown.length > 1000 && '...'}
                  </pre>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleOpenInEditor}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Open in Editor
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-border hover:bg-border text-text-primary rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

