'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Copy,
  Check,
  Tag,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePromptLibraryStore, Prompt } from '@/lib/store/usePromptLibraryStore';

interface PromptCardProps {
  prompt: Prompt;
  onUse: (content: string) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
}

function PromptCard({ prompt, onUse, onEdit, onDelete }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const { incrementUsage } = usePromptLibraryStore();
  
  const handleUse = () => {
    incrementUsage(prompt.id);
    onUse(prompt.content);
  };
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="p-3 bg-editor-bg border border-border rounded-lg hover:border-accent/50 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-primary truncate">
            {prompt.name}
          </h4>
          <p className="text-xs text-text-secondary line-clamp-1">
            {prompt.description}
          </p>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(prompt)}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {!prompt.id.startsWith('default-') && (
            <button
              onClick={() => onDelete(prompt.id)}
              className="p-1 hover:bg-border rounded text-text-secondary hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      <p className="text-xs text-text-secondary line-clamp-2 mb-2">
        {prompt.content}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded">
            {prompt.category}
          </span>
          {prompt.usageCount > 0 && (
            <span className="text-[10px] text-text-secondary">
              Used {prompt.usageCount}x
            </span>
          )}
        </div>
        
        <button
          onClick={handleUse}
          className="px-2 py-1 text-xs bg-accent hover:bg-accent/80 text-white rounded transition-colors"
        >
          Use
        </button>
      </div>
    </div>
  );
}

interface EditPromptModalProps {
  prompt: Prompt | null;
  isNew: boolean;
  onSave: (prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  onClose: () => void;
}

function EditPromptModal({ prompt, isNew, onSave, onClose }: EditPromptModalProps) {
  const { categories } = usePromptLibraryStore();
  const [name, setName] = useState(prompt?.name || '');
  const [description, setDescription] = useState(prompt?.description || '');
  const [content, setContent] = useState(prompt?.content || '');
  const [category, setCategory] = useState(prompt?.category || 'Custom');
  const [tagsInput, setTagsInput] = useState(prompt?.tags.join(', ') || '');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      content,
      category,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-sidebar-bg border border-border rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">
            {isNew ? 'New Prompt' : 'Edit Prompt'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-editor-bg border border-border rounded text-text-primary focus:outline-none focus:border-accent"
              placeholder="e.g., Expand this section"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-editor-bg border border-border rounded text-text-primary focus:outline-none focus:border-accent"
              placeholder="Brief description of what this prompt does"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Prompt Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-editor-bg border border-border rounded text-text-primary focus:outline-none focus:border-accent min-h-[100px]"
              placeholder="The actual prompt text that will be sent to the AI..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-editor-bg border border-border rounded text-text-primary focus:outline-none focus:border-accent"
            >
              {categories.filter(c => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 bg-editor-bg border border-border rounded text-text-primary focus:outline-none focus:border-accent"
              placeholder="expand, elaborate, detail"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded hover:bg-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-accent hover:bg-accent/80 text-white rounded transition-colors"
            >
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PromptLibraryPanelProps {
  onSelectPrompt: (content: string) => void;
}

export function PromptLibraryPanel({ onSelectPrompt }: PromptLibraryPanelProps) {
  const {
    togglePromptLibrary,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    getFilteredPrompts,
    addPrompt,
    updatePrompt,
    deletePrompt,
  } = usePromptLibraryStore();
  
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const filteredPrompts = getFilteredPrompts();
  
  const handleSavePrompt = (promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    if (isCreating) {
      addPrompt(promptData);
    } else if (editingPrompt) {
      updatePrompt(editingPrompt.id, promptData);
    }
    setEditingPrompt(null);
    setIsCreating(false);
  };
  
  return (
    <div className="h-full flex flex-col bg-sidebar-bg border-l border-border w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Prompt Library</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="Add new prompt"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={togglePromptLibrary}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full pl-8 pr-3 py-1.5 bg-editor-bg border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
          />
        </div>
      </div>
      
      {/* Categories */}
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto border-b border-border">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
            className={cn(
              'px-2 py-1 text-xs rounded whitespace-nowrap transition-colors',
              (selectedCategory === cat || (cat === 'All' && !selectedCategory))
                ? 'bg-accent text-white'
                : 'bg-border text-text-secondary hover:text-text-primary'
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* Prompts list */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {filteredPrompts.length === 0 ? (
          <div className="text-center py-8">
            <Tag className="w-8 h-8 text-text-secondary mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No prompts found</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-sm text-accent hover:underline"
            >
              Create a new prompt
            </button>
          </div>
        ) : (
          filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onUse={onSelectPrompt}
              onEdit={setEditingPrompt}
              onDelete={deletePrompt}
            />
          ))
        )}
      </div>
      
      {/* Footer */}
      <div className="px-3 py-2 border-t border-border text-xs text-text-secondary">
        {filteredPrompts.length} prompts
      </div>
      
      {/* Edit modal */}
      {(editingPrompt || isCreating) && (
        <EditPromptModal
          prompt={editingPrompt}
          isNew={isCreating}
          onSave={handleSavePrompt}
          onClose={() => {
            setEditingPrompt(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}





