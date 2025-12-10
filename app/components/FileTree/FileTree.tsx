'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  FolderPlus,
  Plus,
  RefreshCw,
  FileText,
  BookOpen,
  List,
  Pencil,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/useAppStore';
import { useSettingsStore } from '@/lib/store/useSettingsStore';
import { useProjectStore } from '@/lib/store/useProjectStore';
import { FileNode, Document } from '@/types';
import { parseFrontmatter, isProjectConfig } from '@/types/project';
import { ProjectView } from '@/app/components/Project/ProjectView';

interface FileItemProps {
  node: FileNode;
  depth: number;
  onSelect: (node: FileNode) => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onMove: (sourcePath: string, destinationPath: string) => void;
  selectedPath: string | null;
  renamingPath: string | null;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  draggedPath: string | null;
  onDragStart: (path: string) => void;
  onDragEnd: () => void;
}

function FileItem({ 
  node, 
  depth, 
  onSelect, 
  onRename,
  onDelete,
  onMove,
  selectedPath,
  renamingPath,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  draggedPath,
  onDragStart,
  onDragEnd
}: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelected = selectedPath === node.path;
  const isDirectory = node.type === 'directory';
  const isRenaming = renamingPath === node.path;
  const isDragging = draggedPath === node.path;
  const canDrop = isDirectory && draggedPath && draggedPath !== node.path && !draggedPath.startsWith(node.path + '/');

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      // Select filename without extension for files
      if (!isDirectory) {
        const lastDot = renameValue.lastIndexOf('.');
        if (lastDot > 0) {
          inputRef.current.setSelectionRange(0, lastDot);
        } else {
          inputRef.current.select();
        }
      } else {
        inputRef.current.select();
      }
    }
  }, [isRenaming, isDirectory, renameValue]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContextMenu]);

  const handleClick = () => {
    if (isRenaming) return;
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(node);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContextMenu(false);
    onRename(node);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContextMenu(false);
    onDelete(node);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRenaming) {
      onRename(node);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(node.path);
  };

  const handleDragEnd = () => {
    onDragEnd();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (canDrop) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (canDrop && draggedPath) {
      onMove(draggedPath, node.path);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'file-item flex items-center gap-1 px-2 py-1 cursor-pointer text-sm group relative',
          isSelected && !isDirectory && 'active',
          isDragging && 'opacity-50',
          isDragOver && canDrop && 'bg-accent/20 ring-1 ring-accent ring-inset'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-secondary flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-accent flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-accent flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            <FileText className="w-4 h-4 text-text-secondary flex-shrink-0" />
          </>
        )}
        
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit();
              if (e.key === 'Escape') onRenameCancel();
            }}
            onBlur={onRenameSubmit}
            className="flex-1 px-1 py-0 text-sm bg-editor-bg border border-accent rounded focus:outline-none min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            className={cn(
              'truncate flex-1',
              isSelected && !isDirectory ? 'text-text-primary' : 'text-text-secondary'
            )}
            onDoubleClick={handleDoubleClick}
          >
            {node.name}
          </span>
        )}

        {/* Context menu trigger */}
        {!isRenaming && (
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-border rounded text-text-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(!showContextMenu);
            }}
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        )}

        {/* Context menu */}
        {showContextMenu && (
          <div 
            ref={contextMenuRef}
            className="absolute right-0 top-full mt-1 z-50 bg-sidebar-bg border border-border rounded shadow-lg py-1 min-w-[120px]"
          >
            <button
              className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-border hover:text-text-primary flex items-center gap-2"
              onClick={handleRenameClick}
            >
              <Pencil className="w-3 h-3" />
              Rename
            </button>
            <button
              className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-border flex items-center gap-2"
              onClick={handleDeleteClick}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>
      
      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
              selectedPath={selectedPath}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
              draggedPath={draggedPath}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { files, setFiles, currentDocument, openDocument, closeDocument, showToast } = useAppStore();
  const { workspacePath } = useSettingsStore();
  const { activeProject, loadProject, showProjectView, toggleProjectView, setActiveProject } = useProjectStore();
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasProject, setHasProject] = useState(false);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

  // Check for project in workspace
  const checkForProject = useCallback(async () => {
    try {
      const url = workspacePath 
        ? `/api/files/index.md?workspace=${encodeURIComponent(workspacePath)}`
        : '/api/files/index.md';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const { frontmatter } = parseFrontmatter(data.content || '');
        if (isProjectConfig(frontmatter)) {
          setHasProject(true);
          // Load project if not already loaded
          if (!activeProject) {
            loadProject(workspacePath || '.', data.content);
          }
          return;
        }
      }
    } catch (error) {
      // No index.md or not a project - that's fine
    }
    setHasProject(false);
    if (activeProject) {
      setActiveProject(null);
    }
  }, [workspacePath, activeProject, loadProject, setActiveProject]);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = workspacePath 
        ? `/api/files?workspace=${encodeURIComponent(workspacePath)}`
        : '/api/files';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files);
      }
      // Check for project after loading files
      await checkForProject();
    } catch (error) {
      console.error('Failed to load files:', error);
      showToast('Failed to load files', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [setFiles, showToast, workspacePath, checkForProject]);

  // Reload files when workspace changes
  useEffect(() => {
    loadFiles();
  }, [loadFiles, workspacePath]);

  const handleSelectFile = useCallback(async (node: FileNode) => {
    if (node.type === 'directory') return;

    try {
      const url = workspacePath
        ? `/api/files/${node.path}?workspace=${encodeURIComponent(workspacePath)}`
        : `/api/files/${node.path}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const doc: Document = {
          path: data.path,
          name: data.name,
          content: data.content,
          isDirty: false,
        };
        openDocument(doc);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      showToast('Failed to open file', 'error');
    }
  }, [openDocument, showToast, workspacePath]);

  const handleCreateFile = useCallback(async () => {
    if (!newItemName.trim()) {
      setIsCreatingFile(false);
      setNewItemName('');
      return;
    }

    const fileName = newItemName.endsWith('.md') ? newItemName : `${newItemName}.md`;

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fileName, workspace: workspacePath, type: 'file' }),
      });

      if (response.ok) {
        const data = await response.json();
        await loadFiles();
        
        const doc: Document = {
          path: data.path,
          name: data.name,
          content: data.content,
          isDirty: false,
        };
        openDocument(doc);
        showToast(`Created ${fileName}`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create file', 'error');
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      showToast('Failed to create file', 'error');
    }

    setIsCreatingFile(false);
    setNewItemName('');
  }, [newItemName, loadFiles, openDocument, showToast, workspacePath]);

  const handleCreateFolder = useCallback(async () => {
    if (!newItemName.trim()) {
      setIsCreatingFolder(false);
      setNewItemName('');
      return;
    }

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName.trim(), workspace: workspacePath, type: 'folder' }),
      });

      if (response.ok) {
        await loadFiles();
        showToast(`Created folder "${newItemName.trim()}"`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create folder', 'error');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      showToast('Failed to create folder', 'error');
    }

    setIsCreatingFolder(false);
    setNewItemName('');
  }, [newItemName, loadFiles, showToast, workspacePath]);

  const handleStartRename = useCallback((node: FileNode) => {
    setRenamingPath(node.path);
    setRenameValue(node.name);
  }, []);

  const handleRenameSubmit = useCallback(async () => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      setRenameValue('');
      return;
    }

    // Get the original name from the path
    const originalName = renamingPath.split('/').pop() || '';
    if (renameValue.trim() === originalName) {
      setRenamingPath(null);
      setRenameValue('');
      return;
    }

    try {
      const url = workspacePath
        ? `/api/files/${renamingPath}?workspace=${encodeURIComponent(workspacePath)}`
        : `/api/files/${renamingPath}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: renameValue.trim(), workspace: workspacePath }),
      });

      if (response.ok) {
        const data = await response.json();
        await loadFiles();
        
        // Update current document if it was renamed
        if (currentDocument?.path === renamingPath) {
          const updatedDoc: Document = {
            ...currentDocument,
            path: data.newPath,
            name: renameValue.trim(),
          };
          openDocument(updatedDoc);
        }
        
        showToast(`Renamed to "${renameValue.trim()}"`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to rename', 'error');
      }
    } catch (error) {
      console.error('Failed to rename:', error);
      showToast('Failed to rename', 'error');
    }

    setRenamingPath(null);
    setRenameValue('');
  }, [renamingPath, renameValue, workspacePath, loadFiles, currentDocument, openDocument, showToast]);

  const handleRenameCancel = useCallback(() => {
    setRenamingPath(null);
    setRenameValue('');
  }, []);

  const handleDelete = useCallback(async (node: FileNode) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${node.name}"?`);
    if (!confirmDelete) return;

    try {
      const url = workspacePath
        ? `/api/files/${node.path}?workspace=${encodeURIComponent(workspacePath)}`
        : `/api/files/${node.path}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadFiles();
        
        // Close document if it was deleted
        if (currentDocument?.path === node.path) {
          closeDocument(node.path);
        }
        
        showToast(`Deleted "${node.name}"`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to delete', 'error');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      showToast('Failed to delete', 'error');
    }
  }, [workspacePath, loadFiles, currentDocument, closeDocument, showToast]);

  const handleMove = useCallback(async (sourcePath: string, destinationPath: string) => {
    try {
      const url = workspacePath
        ? `/api/files/${sourcePath}?workspace=${encodeURIComponent(workspacePath)}`
        : `/api/files/${sourcePath}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationPath, workspace: workspacePath }),
      });

      if (response.ok) {
        const data = await response.json();
        await loadFiles();
        
        // Update current document path if it was moved
        if (currentDocument?.path === sourcePath) {
          const doc: Document = {
            ...currentDocument,
            path: data.newPath,
          };
          openDocument(doc);
        }
        
        const fileName = sourcePath.split('/').pop();
        showToast(`Moved "${fileName}" to ${destinationPath || 'root'}`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to move file', 'error');
      }
    } catch (error) {
      console.error('Failed to move file:', error);
      showToast('Failed to move file', 'error');
    }
    
    setDraggedPath(null);
  }, [workspacePath, loadFiles, currentDocument, openDocument, showToast]);

  const handleDragStart = useCallback((path: string) => {
    setDraggedPath(path);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedPath(null);
    setIsDragOverRoot(false);
  }, []);

  // Root drop zone handlers (for moving to root)
  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    if (draggedPath) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOverRoot(true);
    }
  }, [draggedPath]);

  const handleRootDragLeave = useCallback(() => {
    setIsDragOverRoot(false);
  }, []);

  const handleRootDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRoot(false);
    
    if (draggedPath) {
      // Move to root (empty string)
      handleMove(draggedPath, '');
    }
  }, [draggedPath, handleMove]);

  // Open document from project view
  const handleOpenProjectDocument = useCallback(async (path: string) => {
    try {
      const url = workspacePath
        ? `/api/files/${path}?workspace=${encodeURIComponent(workspacePath)}`
        : `/api/files/${path}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const doc: Document = {
          path: data.path,
          name: data.name,
          content: data.content,
          isDirty: false,
        };
        openDocument(doc);
      }
    } catch (error) {
      console.error('Failed to open project document:', error);
      showToast('Failed to open document', 'error');
    }
  }, [openDocument, showToast, workspacePath]);

  // Export project
  const handleExportProject = useCallback(() => {
    // Trigger export modal with project mode
    const event = new CustomEvent('sanctum-export-project');
    window.dispatchEvent(event);
  }, []);

  // If project view is active, show project view instead
  if (showProjectView && activeProject) {
    return (
      <ProjectView 
        onOpenDocument={handleOpenProjectDocument}
        onExportProject={handleExportProject}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-sidebar-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Files
          </span>
          {hasProject && (
            <button
              onClick={toggleProjectView}
              className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30"
              title="Switch to Project View"
            >
              <BookOpen className="w-3 h-3 inline-block mr-1" />
              Project
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
              setNewItemName('');
            }}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="New File"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
              setNewItemName('');
            }}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={loadFiles}
            className={cn(
              'p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary',
              isLoading && 'animate-spin'
            )}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New file input */}
      {isCreatingFile && (
        <div className="px-2 py-2 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3 h-3 text-text-secondary" />
            <span className="text-xs text-text-secondary">New file</span>
          </div>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile();
              if (e.key === 'Escape') {
                setIsCreatingFile(false);
                setNewItemName('');
              }
            }}
            onBlur={handleCreateFile}
            placeholder="filename.md"
            className="w-full px-2 py-1 text-sm bg-editor-bg border border-border rounded focus:border-accent focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* New folder input */}
      {isCreatingFolder && (
        <div className="px-2 py-2 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Folder className="w-3 h-3 text-accent" />
            <span className="text-xs text-text-secondary">New folder</span>
          </div>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') {
                setIsCreatingFolder(false);
                setNewItemName('');
              }
            }}
            onBlur={handleCreateFolder}
            placeholder="folder-name"
            className="w-full px-2 py-1 text-sm bg-editor-bg border border-border rounded focus:border-accent focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* File list */}
      <div 
        className={cn(
          "flex-1 overflow-auto py-1",
          isDragOverRoot && "bg-accent/10 ring-1 ring-accent ring-inset"
        )}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {files.length === 0 ? (
          <div className="px-3 py-4 text-sm text-text-secondary text-center">
            <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No files yet</p>
            <p className="text-xs mt-1">Click + to create one</p>
          </div>
        ) : (
          files.map((node) => (
            <FileItem
              key={node.path}
              node={node}
              depth={0}
              onSelect={handleSelectFile}
              onRename={handleStartRename}
              onDelete={handleDelete}
              onMove={handleMove}
              selectedPath={currentDocument?.path || null}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={handleRenameCancel}
              draggedPath={draggedPath}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
        
        {/* Drop hint when dragging */}
        {draggedPath && (
          <div className="px-3 py-2 text-xs text-text-secondary border-t border-border mt-2">
            <span className="opacity-60">Drop here to move to root, or drop on a folder</span>
          </div>
        )}
      </div>
    </div>
  );
}

