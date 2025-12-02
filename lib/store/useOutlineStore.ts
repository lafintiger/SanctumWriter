import { create } from 'zustand';

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  line: number;
  children: OutlineItem[];
}

interface OutlineState {
  showOutlinePanel: boolean;
  outline: OutlineItem[];
  expandedItems: Set<string>;
  
  toggleOutlinePanel: () => void;
  setOutline: (outline: OutlineItem[]) => void;
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

// Parse markdown headings into an outline tree
export function parseOutline(content: string): OutlineItem[] {
  const lines = content.split('\n');
  const items: OutlineItem[] = [];
  const stack: { level: number; item: OutlineItem }[] = [];
  
  let itemId = 0;
  
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      
      const item: OutlineItem = {
        id: `outline-${itemId++}`,
        level,
        text,
        line: index + 1, // 1-indexed
        children: [],
      };
      
      // Find parent
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      
      if (stack.length === 0) {
        items.push(item);
      } else {
        stack[stack.length - 1].item.children.push(item);
      }
      
      stack.push({ level, item });
    }
  });
  
  return items;
}

// Flatten outline for expanded items calculation
function getAllIds(items: OutlineItem[]): string[] {
  const ids: string[] = [];
  const traverse = (item: OutlineItem) => {
    ids.push(item.id);
    item.children.forEach(traverse);
  };
  items.forEach(traverse);
  return ids;
}

export const useOutlineStore = create<OutlineState>((set, get) => ({
  showOutlinePanel: false,
  outline: [],
  expandedItems: new Set<string>(),
  
  toggleOutlinePanel: () => set((state) => ({ showOutlinePanel: !state.showOutlinePanel })),
  
  setOutline: (outline) => {
    // Auto-expand all items by default
    const allIds = getAllIds(outline);
    set({ outline, expandedItems: new Set(allIds) });
  },
  
  toggleExpanded: (id) => set((state) => {
    const newExpanded = new Set(state.expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    return { expandedItems: newExpanded };
  }),
  
  expandAll: () => {
    const allIds = getAllIds(get().outline);
    set({ expandedItems: new Set(allIds) });
  },
  
  collapseAll: () => set({ expandedItems: new Set() }),
}));





