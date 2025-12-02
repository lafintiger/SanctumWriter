import { EditorView } from '@codemirror/view';

export interface DocumentOperation {
  type: 'replace_selection' | 'insert_at_cursor' | 'edit_lines' | 'append_to_document' | 'search_replace' | 'insert_heading';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
}

export interface OperationResult {
  success: boolean;
  message: string;
  changes?: {
    from: number;
    to: number;
    newText: string;
  };
}

export function executeOperation(
  view: EditorView,
  operation: DocumentOperation
): OperationResult {
  const doc = view.state.doc;

  switch (operation.type) {
    case 'replace_selection': {
      const { new_text } = operation.params;
      const selection = view.state.selection.main;
      
      if (selection.from === selection.to) {
        return { success: false, message: 'No text selected to replace' };
      }

      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: new_text },
        selection: { anchor: selection.from + new_text.length },
      });

      return {
        success: true,
        message: `Replaced ${selection.to - selection.from} characters`,
        changes: { from: selection.from, to: selection.to, newText: new_text },
      };
    }

    case 'insert_at_cursor': {
      const { text } = operation.params;
      const cursor = view.state.selection.main.head;

      view.dispatch({
        changes: { from: cursor, to: cursor, insert: text },
        selection: { anchor: cursor + text.length },
      });

      return {
        success: true,
        message: `Inserted ${text.length} characters at cursor`,
        changes: { from: cursor, to: cursor, newText: text },
      };
    }

    case 'edit_lines': {
      const { start_line, end_line, new_text } = operation.params;
      
      // Convert 1-indexed lines to 0-indexed
      const startLineNum = Math.max(1, Math.min(start_line, doc.lines)) - 1;
      const endLineNum = Math.max(1, Math.min(end_line, doc.lines)) - 1;

      const startLine = doc.line(startLineNum + 1);
      const endLine = doc.line(endLineNum + 1);
      
      const from = startLine.from;
      const to = endLine.to;

      view.dispatch({
        changes: { from, to, insert: new_text },
      });

      return {
        success: true,
        message: `Replaced lines ${start_line}-${end_line}`,
        changes: { from, to, newText: new_text },
      };
    }

    case 'append_to_document': {
      const { text } = operation.params;
      const docLength = doc.length;
      const insertText = docLength > 0 && !doc.sliceString(docLength - 1).endsWith('\n')
        ? '\n\n' + text
        : '\n' + text;

      view.dispatch({
        changes: { from: docLength, to: docLength, insert: insertText },
      });

      return {
        success: true,
        message: `Appended ${text.length} characters to document`,
        changes: { from: docLength, to: docLength, newText: insertText },
      };
    }

    case 'search_replace': {
      const { find, replace, replace_all } = operation.params;
      const content = doc.toString();
      
      if (!content.includes(find)) {
        return { success: false, message: `Text "${find}" not found in document` };
      }

      let newContent: string;
      let count: number;

      if (replace_all) {
        const regex = new RegExp(escapeRegExp(find), 'g');
        const matches = content.match(regex);
        count = matches ? matches.length : 0;
        newContent = content.replace(regex, replace);
      } else {
        count = 1;
        newContent = content.replace(find, replace);
      }

      view.dispatch({
        changes: { from: 0, to: doc.length, insert: newContent },
      });

      return {
        success: true,
        message: `Replaced ${count} occurrence(s) of "${find}"`,
        changes: { from: 0, to: doc.length, newText: newContent },
      };
    }

    case 'insert_heading': {
      const { level, text, after_line } = operation.params;
      const headingPrefix = '#'.repeat(Math.min(6, Math.max(1, level)));
      const headingText = `\n\n${headingPrefix} ${text}\n`;

      let insertPos: number;
      if (after_line <= 0) {
        insertPos = 0;
      } else if (after_line >= doc.lines) {
        insertPos = doc.length;
      } else {
        const line = doc.line(after_line);
        insertPos = line.to;
      }

      view.dispatch({
        changes: { from: insertPos, to: insertPos, insert: headingText },
      });

      return {
        success: true,
        message: `Inserted heading "${text}" at line ${after_line}`,
        changes: { from: insertPos, to: insertPos, newText: headingText },
      };
    }

    default:
      return { success: false, message: `Unknown operation type: ${operation.type}` };
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseToolCallToOperation(
  name: string,
  args: Record<string, unknown>
): DocumentOperation {
  return {
    type: name as DocumentOperation['type'],
    params: args,
  };
}

export function getDocumentWithLineNumbers(content: string): string {
  const lines = content.split('\n');
  return lines.map((line, i) => `${(i + 1).toString().padStart(4, ' ')} | ${line}`).join('\n');
}





