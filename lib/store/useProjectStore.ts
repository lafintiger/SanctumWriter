/**
 * Project Store
 * Manages multi-document project state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Project,
  ProjectConfig,
  ProjectDocument,
  parseFrontmatter,
  extractProjectConfig,
  countWords,
} from '@/types/project';

interface ProjectState {
  // Current project
  activeProject: Project | null;
  
  // UI state
  showProjectView: boolean;
  
  // Actions
  setActiveProject: (project: Project | null) => void;
  toggleProjectView: () => void;
  
  // Project operations
  loadProject: (folderPath: string, indexContent: string) => Project | null;
  updateDocumentStats: (path: string, wordCount: number) => void;
  reorderDocuments: (newOrder: string[]) => void;
  
  // Helpers
  isInProject: (filePath: string) => boolean;
  getDocumentByPath: (path: string) => ProjectDocument | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      activeProject: null,
      showProjectView: false,
      
      setActiveProject: (project) => set({ activeProject: project }),
      
      toggleProjectView: () => set((state) => ({
        showProjectView: !state.showProjectView,
      })),
      
      loadProject: (folderPath, indexContent) => {
        const { frontmatter, body } = parseFrontmatter(indexContent);
        const config = extractProjectConfig(frontmatter);
        
        if (!config) {
          return null;
        }
        
        // Build document list from order
        const documents: ProjectDocument[] = config.order.map((path, index) => ({
          path,
          order: index,
          title: path.replace(/^\d+-/, '').replace(/\.md$/, '').replace(/-/g, ' '),
        }));
        
        const project: Project = {
          folderPath,
          indexPath: `${folderPath}/index.md`,
          config,
          documents,
          totalWordCount: 0,
          documentCount: documents.length,
          isLoaded: true,
          lastUpdated: new Date().toISOString(),
        };
        
        set({ activeProject: project, showProjectView: true });
        return project;
      },
      
      updateDocumentStats: (path, wordCount) => {
        const { activeProject } = get();
        if (!activeProject) return;
        
        const documents = activeProject.documents.map(doc => 
          doc.path === path ? { ...doc, wordCount } : doc
        );
        
        const totalWordCount = documents.reduce((sum, doc) => sum + (doc.wordCount || 0), 0);
        
        set({
          activeProject: {
            ...activeProject,
            documents,
            totalWordCount,
          },
        });
      },
      
      reorderDocuments: (newOrder) => {
        const { activeProject } = get();
        if (!activeProject) return;
        
        const documents = newOrder.map((path, index) => {
          const existing = activeProject.documents.find(d => d.path === path);
          return existing 
            ? { ...existing, order: index }
            : { path, order: index, title: path.replace(/\.md$/, '') };
        });
        
        set({
          activeProject: {
            ...activeProject,
            documents,
            config: {
              ...activeProject.config,
              order: newOrder,
            },
          },
        });
      },
      
      isInProject: (filePath) => {
        const { activeProject } = get();
        if (!activeProject) return false;
        return filePath.startsWith(activeProject.folderPath);
      },
      
      getDocumentByPath: (path) => {
        const { activeProject } = get();
        if (!activeProject) return undefined;
        return activeProject.documents.find(d => d.path === path);
      },
    }),
    {
      name: 'sanctumwriter-project',
      partialize: (state) => ({
        showProjectView: state.showProjectView,
      }),
    }
  )
);

// Selector hooks
export const useActiveProject = () => useProjectStore((state) => state.activeProject);
export const useShowProjectView = () => useProjectStore((state) => state.showProjectView);





