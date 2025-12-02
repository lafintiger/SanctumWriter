import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

interface PromptLibraryState {
  showPromptLibrary: boolean;
  prompts: Prompt[];
  categories: string[];
  selectedCategory: string | null;
  searchQuery: string;
  
  togglePromptLibrary: () => void;
  addPrompt: (prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  updatePrompt: (id: string, updates: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  incrementUsage: (id: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  getFilteredPrompts: () => Prompt[];
}

// Default prompts to get users started
const defaultPrompts: Prompt[] = [
  {
    id: 'default-1',
    name: 'Expand this section',
    description: 'Ask the AI to elaborate on selected text',
    content: 'Please expand on this section with more detail, examples, and explanations while maintaining the existing tone and style.',
    category: 'Writing',
    tags: ['expand', 'elaborate', 'detail'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-2',
    name: 'Make it concise',
    description: 'Shorten text while keeping key points',
    content: 'Please make this text more concise. Keep the essential information but remove any redundancy or unnecessary words.',
    category: 'Editing',
    tags: ['concise', 'shorten', 'trim'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-3',
    name: 'Improve clarity',
    description: 'Make text clearer and easier to understand',
    content: 'Please rewrite this to improve clarity. Make it easier to understand while preserving the original meaning.',
    category: 'Editing',
    tags: ['clarity', 'clear', 'simplify'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-4',
    name: 'Fix grammar',
    description: 'Correct grammatical errors',
    content: 'Please fix any grammatical errors, punctuation issues, and spelling mistakes in this text. Keep the original style intact.',
    category: 'Editing',
    tags: ['grammar', 'spelling', 'punctuation'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-5',
    name: 'Change tone - Professional',
    description: 'Rewrite in a professional tone',
    content: 'Please rewrite this text in a professional, formal tone suitable for business communication.',
    category: 'Tone',
    tags: ['professional', 'formal', 'business'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-6',
    name: 'Change tone - Casual',
    description: 'Rewrite in a casual, friendly tone',
    content: 'Please rewrite this text in a casual, friendly, conversational tone.',
    category: 'Tone',
    tags: ['casual', 'friendly', 'conversational'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-7',
    name: 'Add transitions',
    description: 'Add transition sentences between paragraphs',
    content: 'Please add appropriate transition sentences to improve the flow between paragraphs and sections.',
    category: 'Writing',
    tags: ['transitions', 'flow', 'structure'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-8',
    name: 'Generate outline',
    description: 'Create an outline for a topic',
    content: 'Please create a detailed outline for this topic. Include main sections, subsections, and key points to cover.',
    category: 'Planning',
    tags: ['outline', 'structure', 'planning'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-9',
    name: 'Summarize',
    description: 'Create a summary of the content',
    content: 'Please provide a concise summary of this content, highlighting the main points and key takeaways.',
    category: 'Analysis',
    tags: ['summary', 'summarize', 'overview'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'default-10',
    name: 'Devil\'s advocate',
    description: 'Challenge the arguments presented',
    content: 'Please play devil\'s advocate and present counterarguments or alternative perspectives to the points made in this text.',
    category: 'Analysis',
    tags: ['critique', 'counterargument', 'analysis'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
];

const defaultCategories = ['All', 'Writing', 'Editing', 'Tone', 'Planning', 'Analysis', 'Custom'];

export const usePromptLibraryStore = create<PromptLibraryState>()(
  persist(
    (set, get) => ({
      showPromptLibrary: false,
      prompts: defaultPrompts,
      categories: defaultCategories,
      selectedCategory: null,
      searchQuery: '',
      
      togglePromptLibrary: () => set((state) => ({ showPromptLibrary: !state.showPromptLibrary })),
      
      addPrompt: (prompt) => {
        const newPrompt: Prompt = {
          ...prompt,
          id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0,
        };
        
        // Add new category if needed
        const { categories } = get();
        const newCategories = categories.includes(prompt.category) 
          ? categories 
          : [...categories.filter(c => c !== 'Custom'), prompt.category, 'Custom'];
        
        set((state) => ({ 
          prompts: [...state.prompts, newPrompt],
          categories: newCategories,
        }));
      },
      
      updatePrompt: (id, updates) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        }));
      },
      
      deletePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        }));
      },
      
      incrementUsage: (id) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p
          ),
        }));
      },
      
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      getFilteredPrompts: () => {
        const { prompts, selectedCategory, searchQuery } = get();
        
        return prompts.filter((prompt) => {
          // Category filter
          if (selectedCategory && selectedCategory !== 'All' && prompt.category !== selectedCategory) {
            return false;
          }
          
          // Search filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
              prompt.name.toLowerCase().includes(query) ||
              prompt.description.toLowerCase().includes(query) ||
              prompt.content.toLowerCase().includes(query) ||
              prompt.tags.some((tag) => tag.toLowerCase().includes(query))
            );
          }
          
          return true;
        }).sort((a, b) => b.usageCount - a.usageCount); // Most used first
      },
    }),
    {
      name: 'sanctum-writer-prompts',
      partialize: (state) => ({
        prompts: state.prompts,
        categories: state.categories,
      }),
    }
  )
);





