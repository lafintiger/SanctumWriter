'use client';

import React, { useState, useMemo } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  Trash2,
  Edit,
  Copy,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  BookOpen,
  GraduationCap,
  Download,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCitationStore } from '@/lib/store/useCitationStore';
import { 
  Citation, 
  CitationType, 
  CitationFormat,
  Author,
  DEFAULT_CITATION,
} from '@/types/citation';
import { formatCitation, formatInTextCitation } from '@/lib/citations/formatter';
import { createCitationString } from '@/lib/citations/parser';

const CITATION_TYPES: { value: CitationType; label: string; icon: React.ReactNode }[] = [
  { value: 'article', label: 'Journal Article', icon: <FileText className="w-4 h-4" /> },
  { value: 'book', label: 'Book', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'chapter', label: 'Book Chapter', icon: <BookMarked className="w-4 h-4" /> },
  { value: 'website', label: 'Website', icon: <Globe className="w-4 h-4" /> },
  { value: 'conference', label: 'Conference Paper', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'thesis', label: 'Thesis', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'report', label: 'Report', icon: <FileText className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <FileText className="w-4 h-4" /> },
];

const FORMAT_OPTIONS: { value: CitationFormat; label: string }[] = [
  { value: 'apa', label: 'APA (7th)' },
  { value: 'mla', label: 'MLA (9th)' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'numeric', label: 'Numeric [1]' },
];

interface CitationFormProps {
  citation?: Citation;
  onSave: (citation: Omit<Citation, 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  existingKeys: string[];
}

function CitationForm({ citation, onSave, onCancel, existingKeys }: CitationFormProps) {
  const [formData, setFormData] = useState({
    id: citation?.id || '',
    type: citation?.type || DEFAULT_CITATION.type,
    authors: citation?.authors || [{ firstName: '', lastName: '' }],
    title: citation?.title || '',
    year: citation?.year || new Date().getFullYear(),
    journal: citation?.journal || '',
    volume: citation?.volume || '',
    issue: citation?.issue || '',
    pages: citation?.pages || '',
    publisher: citation?.publisher || '',
    publisherLocation: citation?.publisherLocation || '',
    url: citation?.url || '',
    doi: citation?.doi || '',
    accessDate: citation?.accessDate || '',
    bookTitle: citation?.bookTitle || '',
    conferenceTitle: citation?.conferenceTitle || '',
  });
  
  const [keyError, setKeyError] = useState('');

  const handleAuthorChange = (index: number, field: keyof Author, value: string) => {
    const newAuthors = [...formData.authors];
    newAuthors[index] = { ...newAuthors[index], [field]: value };
    setFormData({ ...formData, authors: newAuthors });
    
    // Auto-generate key from first author
    if (index === 0 && field === 'lastName' && !citation) {
      const key = `${value.toLowerCase().replace(/[^a-z]/g, '')}${formData.year}`;
      setFormData(prev => ({ ...prev, id: key }));
    }
  };

  const addAuthor = () => {
    setFormData({
      ...formData,
      authors: [...formData.authors, { firstName: '', lastName: '' }],
    });
  };

  const removeAuthor = (index: number) => {
    if (formData.authors.length > 1) {
      setFormData({
        ...formData,
        authors: formData.authors.filter((_, i) => i !== index),
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate key
    if (!formData.id) {
      setKeyError('Citation key is required');
      return;
    }
    
    if (!citation && existingKeys.includes(formData.id)) {
      setKeyError('This key already exists');
      return;
    }
    
    onSave(formData as Omit<Citation, 'createdAt' | 'updatedAt'>);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-3">
      {/* Citation Key */}
      <div>
        <label className="block text-sm text-text-primary mb-1">Citation Key *</label>
        <input
          type="text"
          value={formData.id}
          onChange={(e) => {
            setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') });
            setKeyError('');
          }}
          disabled={!!citation}
          placeholder="e.g., smith2024"
          className={cn(
            "w-full px-3 py-2 bg-sidebar-bg border rounded text-sm text-text-primary",
            keyError ? 'border-red-500' : 'border-border'
          )}
        />
        {keyError && <span className="text-xs text-red-500">{keyError}</span>}
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm text-text-primary mb-1">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as CitationType })}
          className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
        >
          {CITATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Authors */}
      <div>
        <label className="block text-sm text-text-primary mb-1">Authors *</label>
        {formData.authors.map((author, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={author.firstName}
              onChange={(e) => handleAuthorChange(index, 'firstName', e.target.value)}
              placeholder="First name"
              className="flex-1 px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
            />
            <input
              type="text"
              value={author.lastName}
              onChange={(e) => handleAuthorChange(index, 'lastName', e.target.value)}
              placeholder="Last name"
              className="flex-1 px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
            />
            {formData.authors.length > 1 && (
              <button
                type="button"
                onClick={() => removeAuthor(index)}
                className="p-1.5 hover:bg-red-500/10 rounded text-text-secondary hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addAuthor}
          className="text-xs text-accent hover:underline"
        >
          + Add another author
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm text-text-primary mb-1">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
        />
      </div>

      {/* Year */}
      <div>
        <label className="block text-sm text-text-primary mb-1">Year *</label>
        <input
          type="number"
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
          className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
        />
      </div>

      {/* Type-specific fields */}
      {(formData.type === 'article' || formData.type === 'conference') && (
        <>
          <div>
            <label className="block text-sm text-text-primary mb-1">
              {formData.type === 'article' ? 'Journal' : 'Conference'}
            </label>
            <input
              type="text"
              value={formData.type === 'article' ? formData.journal : formData.conferenceTitle}
              onChange={(e) => setFormData({ 
                ...formData, 
                [formData.type === 'article' ? 'journal' : 'conferenceTitle']: e.target.value 
              })}
              className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Volume</label>
              <input
                type="text"
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                className="w-full px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Issue</label>
              <input
                type="text"
                value={formData.issue}
                onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                className="w-full px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Pages</label>
              <input
                type="text"
                value={formData.pages}
                onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                placeholder="e.g., 1-15"
                className="w-full px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
              />
            </div>
          </div>
        </>
      )}

      {(formData.type === 'book' || formData.type === 'chapter') && (
        <>
          {formData.type === 'chapter' && (
            <div>
              <label className="block text-sm text-text-primary mb-1">Book Title</label>
              <input
                type="text"
                value={formData.bookTitle}
                onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })}
                className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Publisher</label>
              <input
                type="text"
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                className="w-full px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Location</label>
              <input
                type="text"
                value={formData.publisherLocation}
                onChange={(e) => setFormData({ ...formData, publisherLocation: e.target.value })}
                className="w-full px-2 py-1.5 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
              />
            </div>
          </div>
        </>
      )}

      {formData.type === 'website' && (
        <>
          <div>
            <label className="block text-sm text-text-primary mb-1">URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-primary mb-1">Access Date</label>
            <input
              type="date"
              value={formData.accessDate}
              onChange={(e) => setFormData({ ...formData, accessDate: e.target.value })}
              className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
            />
          </div>
        </>
      )}

      {/* DOI (for articles) */}
      {formData.type === 'article' && (
        <div>
          <label className="block text-sm text-text-primary mb-1">DOI</label>
          <input
            type="text"
            value={formData.doi}
            onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
            placeholder="e.g., 10.1234/example"
            className="w-full px-3 py-2 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent-hover"
        >
          {citation ? 'Update Citation' : 'Add Citation'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 bg-border text-text-secondary rounded text-sm hover:bg-border/80"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CitationPanel() {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCitation, setEditingCitation] = useState<Citation | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<CitationFormat>('apa');
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());

  const { currentDocument, showToast } = useAppStore();
  const {
    defaultFormat,
    showCitationPanel,
    toggleCitationPanel,
    addCitation,
    updateCitation,
    deleteCitation,
    getAllCitations,
    exportCitations,
    importCitations,
  } = useCitationStore();

  const citations = currentDocument ? getAllCitations(currentDocument.path) : [];
  const existingKeys = citations.map(c => c.id);

  const filteredCitations = useMemo(() => {
    if (!searchQuery) return citations;
    const query = searchQuery.toLowerCase();
    return citations.filter(c => 
      c.id.toLowerCase().includes(query) ||
      c.title.toLowerCase().includes(query) ||
      c.authors.some(a => 
        a.lastName.toLowerCase().includes(query) ||
        a.firstName.toLowerCase().includes(query)
      )
    );
  }, [citations, searchQuery]);

  const handleAddCitation = (citationData: Omit<Citation, 'createdAt' | 'updatedAt'>) => {
    if (!currentDocument) return;
    addCitation(currentDocument.path, citationData);
    setActiveTab('list');
    showToast('Citation added', 'success');
  };

  const handleUpdateCitation = (citationData: Omit<Citation, 'createdAt' | 'updatedAt'>) => {
    if (!currentDocument || !editingCitation) return;
    updateCitation(currentDocument.path, editingCitation.id, citationData);
    setEditingCitation(null);
    setActiveTab('list');
    showToast('Citation updated', 'success');
  };

  const handleDeleteCitation = (id: string) => {
    if (!currentDocument) return;
    if (!confirm('Delete this citation?')) return;
    deleteCitation(currentDocument.path, id);
    showToast('Citation deleted', 'success');
  };

  const handleInsertCitation = (key: string) => {
    const citationString = createCitationString(key);
    // Dispatch custom event for editor to receive
    const event = new CustomEvent('sanctum-insert-citation', {
      detail: { citation: citationString }
    });
    window.dispatchEvent(event);
    showToast(`Inserted ${citationString}`, 'success');
  };

  const handleCopyKey = (key: string) => {
    const citationString = createCitationString(key);
    navigator.clipboard.writeText(citationString);
    showToast('Copied to clipboard', 'success');
  };

  const toggleCitation = (id: string) => {
    setExpandedCitations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExport = () => {
    if (!currentDocument) return;
    const data = exportCitations(currentDocument.path);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citations-${currentDocument.name.replace('.md', '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!currentDocument) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const content = await file.text();
        const data = JSON.parse(content) as Citation[];
        importCitations(currentDocument.path, data);
        showToast(`Imported ${data.length} citations`, 'success');
      } catch {
        showToast('Invalid citation file', 'error');
      }
    };
    input.click();
  };

  if (!showCitationPanel) return null;

  return (
    <div className="h-full flex flex-col bg-sidebar-bg border-l border-border w-96">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-text-primary">Citations</span>
          <span className="text-xs text-text-secondary bg-border px-1.5 py-0.5 rounded">
            {citations.length}
          </span>
        </div>
        <button
          onClick={toggleCitationPanel}
          className="p-1 hover:bg-border rounded"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab('list'); setEditingCitation(null); }}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'list'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Sources
        </button>
        <button
          onClick={() => { setActiveTab('add'); setEditingCitation(null); }}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'add'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          + Add
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'list' && (
          <div className="p-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search citations..."
                className="w-full pl-8 pr-3 py-2 bg-chat-bg border border-border rounded text-sm text-text-primary"
              />
            </div>

            {/* Format selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Preview as:</span>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as CitationFormat)}
                className="flex-1 px-2 py-1 bg-chat-bg border border-border rounded text-xs text-text-primary"
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Citations list */}
            {filteredCitations.length === 0 ? (
              <div className="text-center py-8">
                <BookMarked className="w-10 h-10 mx-auto mb-3 text-amber-500 opacity-30" />
                <p className="text-sm text-text-secondary">
                  {citations.length === 0 ? 'No citations yet' : 'No matches found'}
                </p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  Add your first citation
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCitations.map((citation) => (
                  <div
                    key={citation.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCitation(citation.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-border/50 transition-colors"
                    >
                      {expandedCitations.has(citation.id) ? (
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                      )}
                      <span className="text-xs text-amber-500 font-mono">@{citation.id}</span>
                      <span className="flex-1 text-sm text-text-primary text-left truncate">
                        {citation.authors[0]?.lastName || 'Unknown'} ({citation.year})
                      </span>
                    </button>

                    {expandedCitations.has(citation.id) && (
                      <div className="px-3 py-2 border-t border-border bg-chat-bg space-y-2">
                        {/* Formatted citation */}
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {formatCitation(citation, selectedFormat)}
                        </p>

                        {/* In-text preview */}
                        <div className="text-xs text-text-secondary">
                          In-text: <code className="bg-border px-1 rounded">
                            {formatInTextCitation(citation, selectedFormat)}
                          </code>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 pt-1">
                          <button
                            onClick={() => handleInsertCitation(citation.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-accent text-white rounded text-xs hover:bg-accent-hover"
                          >
                            <Plus className="w-3 h-3" />
                            Insert
                          </button>
                          <button
                            onClick={() => handleCopyKey(citation.id)}
                            className="p-1.5 hover:bg-border rounded text-text-secondary"
                            title="Copy citation"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCitation(citation);
                              setActiveTab('edit');
                            }}
                            className="p-1.5 hover:bg-border rounded text-text-secondary"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCitation(citation.id)}
                            className="p-1.5 hover:bg-red-500/10 rounded text-text-secondary hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Import/Export */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                onClick={handleExport}
                disabled={citations.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border rounded text-sm text-text-secondary hover:bg-border/50 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border rounded text-sm text-text-secondary hover:bg-border/50"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
            </div>
          </div>
        )}

        {(activeTab === 'add' || activeTab === 'edit') && (
          <CitationForm
            citation={editingCitation || undefined}
            onSave={editingCitation ? handleUpdateCitation : handleAddCitation}
            onCancel={() => {
              setActiveTab('list');
              setEditingCitation(null);
            }}
            existingKeys={existingKeys}
          />
        )}
      </div>
    </div>
  );
}





