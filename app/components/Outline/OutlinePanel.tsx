'use client';

import React, { useEffect, useCallback } from 'react';
import { 
  List, 
  ChevronRight, 
  ChevronDown, 
  Expand, 
  Shrink,
  X,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOutlineStore, parseOutline, OutlineItem } from '@/lib/store/useOutlineStore';
import { useAppStore } from '@/lib/store/useAppStore';

interface OutlineItemComponentProps {
  item: OutlineItem;
  onNavigate: (line: number) => void;
}

function OutlineItemComponent({ item, onNavigate }: OutlineItemComponentProps) {
  const { expandedItems, toggleExpanded } = useOutlineStore();
  const isExpanded = expandedItems.has(item.id);
  const hasChildren = item.children.length > 0;
  
  // Indent based on level
  const paddingLeft = (item.level - 1) * 16 + 8;
  
  return (
    <div>
      <div 
        className="flex items-center gap-1 py-1 px-2 hover:bg-border/50 rounded cursor-pointer group"
        style={{ paddingLeft }}
        onClick={() => onNavigate(item.line)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(item.id);
            }}
            className="p-0.5 hover:bg-border rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-text-secondary" />
            ) : (
              <ChevronRight className="w-3 h-3 text-text-secondary" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        
        <span className={cn(
          'text-sm truncate flex-1',
          item.level === 1 && 'font-semibold text-text-primary',
          item.level === 2 && 'font-medium text-text-primary',
          item.level >= 3 && 'text-text-secondary'
        )}>
          {item.text}
        </span>
        
        <span className="text-[10px] text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
          L{item.line}
        </span>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {item.children.map((child) => (
            <OutlineItemComponent key={child.id} item={child} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

interface OutlinePanelProps {
  onNavigateToLine?: (line: number) => void;
}

export function OutlinePanel({ onNavigateToLine }: OutlinePanelProps) {
  const { currentDocument } = useAppStore();
  const { 
    outline, 
    setOutline, 
    toggleOutlinePanel, 
    expandAll, 
    collapseAll 
  } = useOutlineStore();
  
  // Update outline when document changes
  useEffect(() => {
    if (currentDocument?.content) {
      const parsedOutline = parseOutline(currentDocument.content);
      setOutline(parsedOutline);
    } else {
      setOutline([]);
    }
  }, [currentDocument?.content, setOutline]);
  
  const handleNavigate = useCallback((line: number) => {
    if (onNavigateToLine) {
      onNavigateToLine(line);
    }
  }, [onNavigateToLine]);
  
  // Count total headings
  const countHeadings = (items: OutlineItem[]): number => {
    let count = items.length;
    items.forEach(item => {
      count += countHeadings(item.children);
    });
    return count;
  };
  const totalHeadings = countHeadings(outline);
  
  return (
    <div className="h-full flex flex-col bg-sidebar-bg border-l border-border w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Outline</span>
          {totalHeadings > 0 && (
            <span className="text-xs text-text-secondary bg-border px-1.5 py-0.5 rounded">
              {totalHeadings}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={expandAll}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="Expand all"
          >
            <Expand className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={collapseAll}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="Collapse all"
          >
            <Shrink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleOutlinePanel}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="Close outline"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto py-2">
        {outline.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <FileText className="w-8 h-8 text-text-secondary mb-2" />
            <p className="text-sm text-text-secondary">
              No headings found
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Add markdown headings (# H1, ## H2, etc.) to see the document outline
            </p>
          </div>
        ) : (
          <div>
            {outline.map((item) => (
              <OutlineItemComponent 
                key={item.id} 
                item={item} 
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with stats */}
      {outline.length > 0 && (
        <div className="px-3 py-2 border-t border-border text-xs text-text-secondary">
          <div className="flex items-center justify-between">
            <span>Document structure</span>
            <span>
              {outline.filter(i => i.level === 1).length} sections
            </span>
          </div>
        </div>
      )}
    </div>
  );
}





