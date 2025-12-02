'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Target,
  BarChart3,
  Settings,
  FolderOpen,
  Download,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import { ProjectDocument, countWords } from '@/types/project';

interface ProjectViewProps {
  onOpenDocument: (path: string) => void;
  onExportProject: () => void;
}

export function ProjectView({ onOpenDocument, onExportProject }: ProjectViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['chapters']));
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const { activeProject, updateDocumentStats, reorderDocuments, setActiveProject } = useProjectStore();
  const { currentDocument } = useAppStore();
  const { workspacePath } = useSettingsStore();

  // Update word counts when documents change
  useEffect(() => {
    if (!activeProject) return;

    const updateCounts = async () => {
      for (const doc of activeProject.documents) {
        try {
          const response = await fetch(`/api/files/${doc.path}?workspace=${encodeURIComponent(workspacePath)}`);
          if (response.ok) {
            const data = await response.json();
            const words = countWords(data.content || '');
            updateDocumentStats(doc.path, words);
          }
        } catch (error) {
          console.error('Failed to get word count for', doc.path);
        }
      }
    };

    updateCounts();
  }, [activeProject?.documents.length, workspacePath]);

  if (!activeProject) {
    return (
      <div className="p-4 text-center text-text-secondary">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No project loaded</p>
        <p className="text-xs mt-1">Open a folder with an index.md file</p>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, path: string) => {
    setDraggedItem(path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetPath) {
      setDraggedItem(null);
      return;
    }

    const currentOrder = activeProject.documents.map(d => d.path);
    const fromIndex = currentOrder.indexOf(draggedItem);
    const toIndex = currentOrder.indexOf(targetPath);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Reorder
    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedItem);

    reorderDocuments(newOrder);
    setDraggedItem(null);
  };

  const progress = activeProject.config.wordGoal 
    ? Math.min(100, Math.round((activeProject.totalWordCount / activeProject.config.wordGoal) * 100))
    : null;

  const isCurrentDoc = (path: string) => {
    return currentDocument?.path.endsWith(path);
  };

  return (
    <div className="h-full flex flex-col bg-sidebar-bg">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary truncate flex-1">
            {activeProject.config.title}
          </span>
          <button
            onClick={() => setActiveProject(null)}
            className="p-1 hover:bg-border rounded text-text-secondary"
            title="Close project"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {activeProject.documentCount} docs
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            {activeProject.totalWordCount.toLocaleString()} words
          </div>
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                Goal: {activeProject.config.wordGoal?.toLocaleString()}
              </span>
              <span className={cn(
                progress >= 100 ? 'text-green-500' : 'text-accent'
              )}>
                {progress}%
              </span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5">
              <div
                className={cn(
                  'rounded-full h-1.5 transition-all',
                  progress >= 100 ? 'bg-green-500' : 'bg-accent'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="flex-1 overflow-auto p-2">
        {/* Chapters/Documents Section */}
        <div className="mb-2">
          <button
            onClick={() => toggleSection('chapters')}
            className="w-full flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
          >
            {expandedSections.has('chapters') ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="uppercase tracking-wider">Documents</span>
          </button>

          {expandedSections.has('chapters') && (
            <div className="mt-1 space-y-0.5">
              {activeProject.documents.map((doc, index) => (
                <div
                  key={doc.path}
                  draggable
                  onDragStart={(e) => handleDragStart(e, doc.path)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, doc.path)}
                  className={cn(
                    'group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors',
                    isCurrentDoc(doc.path)
                      ? 'bg-accent/20 text-accent'
                      : 'hover:bg-border/50 text-text-primary',
                    draggedItem === doc.path && 'opacity-50'
                  )}
                  onClick={() => onOpenDocument(doc.path)}
                >
                  <GripVertical className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 cursor-grab" />
                  <span className="text-xs text-text-secondary w-4">
                    {index + 1}.
                  </span>
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">
                    {doc.title || doc.path.replace(/\.md$/, '')}
                  </span>
                  {doc.wordCount !== undefined && (
                    <span className="text-xs text-text-secondary">
                      {doc.wordCount.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={onExportProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent/10 text-accent rounded text-sm hover:bg-accent/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Project
        </button>
      </div>
    </div>
  );
}





