export interface Document {
  path: string;
  name: string;
  content: string;
  lastModified?: Date;
  isDirty: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface Selection {
  from: number;      // Character offset
  to: number;        // Character offset
  fromLine: number;  // Line number (1-indexed)
  toLine: number;    // Line number (1-indexed)
  text: string;      // Selected text
}

export interface EditorState {
  document: Document | null;
  selection: Selection | null;
  cursorPosition: { line: number; col: number };
}





