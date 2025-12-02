/**
 * CodeMirror extension for displaying review comment annotations in the editor gutter
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, gutter, GutterMarker } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { ReviewComment } from '@/types/council';

// Effect to update review comments
export const setReviewComments = StateEffect.define<ReviewComment[]>();

// Custom gutter marker for review comments
class ReviewMarker extends GutterMarker {
  comments: ReviewComment[];
  
  constructor(comments: ReviewComment[]) {
    super();
    this.comments = comments;
  }
  
  toDOM() {
    const wrapper = document.createElement('div');
    wrapper.className = 'review-marker';
    wrapper.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 100%;
      cursor: pointer;
    `;
    
    // Get the most severe comment type
    const hasError = this.comments.some(c => c.type === 'error');
    const hasWarning = this.comments.some(c => c.type === 'warning');
    const hasSuggestion = this.comments.some(c => c.type === 'suggestion');
    
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${hasError ? '#EF4444' : hasWarning ? '#F59E0B' : hasSuggestion ? '#3B82F6' : '#10B981'};
      box-shadow: 0 0 4px ${hasError ? '#EF4444' : hasWarning ? '#F59E0B' : hasSuggestion ? '#3B82F6' : '#10B981'};
    `;
    
    // Add count badge if multiple comments
    if (this.comments.length > 1) {
      const badge = document.createElement('span');
      badge.style.cssText = `
        position: absolute;
        font-size: 9px;
        color: white;
        background: #374151;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 8px;
        margin-top: -8px;
      `;
      badge.textContent = this.comments.length.toString();
      wrapper.appendChild(badge);
    }
    
    wrapper.appendChild(dot);
    
    // Tooltip with comment summary
    wrapper.title = this.comments.map(c => `${c.reviewerIcon} ${c.reviewerName}: ${c.comment.slice(0, 100)}...`).join('\n');
    
    return wrapper;
  }
}

// State field to track review comments
const reviewCommentsField = StateField.define<ReviewComment[]>({
  create() {
    return [];
  },
  update(comments, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setReviewComments)) {
        return effect.value;
      }
    }
    return comments;
  },
});

// Gutter that shows review markers
const reviewGutter = gutter({
  class: 'cm-review-gutter',
  markers: (view) => {
    const comments = view.state.field(reviewCommentsField);
    const markers: { line: number; marker: ReviewMarker }[] = [];
    
    // Group comments by line
    const byLine = new Map<number, ReviewComment[]>();
    for (const comment of comments) {
      for (let line = comment.startLine; line <= comment.endLine; line++) {
        const existing = byLine.get(line) || [];
        existing.push(comment);
        byLine.set(line, existing);
      }
    }
    
    // Create markers for each line
    const builder = new RangeSetBuilder<GutterMarker>();
    
    for (const [lineNum, lineComments] of byLine) {
      try {
        if (lineNum <= view.state.doc.lines) {
          const line = view.state.doc.line(lineNum);
          builder.add(line.from, line.from, new ReviewMarker(lineComments));
        }
      } catch (e) {
        // Line might be out of bounds if document changed
      }
    }
    
    return builder.finish();
  },
  initialSpacer: () => new ReviewMarker([]),
});

// Line highlighting for lines with comments
const reviewLineHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || 
          update.transactions.some(tr => tr.effects.some(e => e.is(setReviewComments)))) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
    
    buildDecorations(view: EditorView) {
      const comments = view.state.field(reviewCommentsField);
      const builder = new RangeSetBuilder<Decoration>();
      
      // Get unique lines with comments
      const linesWithComments = new Set<number>();
      for (const comment of comments) {
        for (let line = comment.startLine; line <= comment.endLine; line++) {
          linesWithComments.add(line);
        }
      }
      
      // Add decorations for each line
      const sortedLines = Array.from(linesWithComments).sort((a, b) => a - b);
      
      for (const lineNum of sortedLines) {
        try {
          if (lineNum <= view.state.doc.lines) {
            const line = view.state.doc.line(lineNum);
            
            // Find the most severe comment for this line
            const lineComments = comments.filter(c => lineNum >= c.startLine && lineNum <= c.endLine);
            const hasError = lineComments.some(c => c.type === 'error');
            const hasWarning = lineComments.some(c => c.type === 'warning');
            
            const className = hasError 
              ? 'cm-review-line-error' 
              : hasWarning 
                ? 'cm-review-line-warning' 
                : 'cm-review-line-info';
            
            builder.add(
              line.from,
              line.from,
              Decoration.line({ class: className })
            );
          }
        } catch (e) {
          // Line might be out of bounds
        }
      }
      
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// CSS theme for review annotations
const reviewTheme = EditorView.baseTheme({
  '.cm-review-gutter': {
    width: '24px',
    backgroundColor: 'transparent',
  },
  '.cm-review-line-error': {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeft: '3px solid #EF4444',
  },
  '.cm-review-line-warning': {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderLeft: '3px solid #F59E0B',
  },
  '.cm-review-line-info': {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeft: '3px solid #3B82F6',
  },
  '.review-marker': {
    position: 'relative',
  },
});

// Export the full extension
export const reviewAnnotationsExtension = [
  reviewCommentsField,
  reviewGutter,
  reviewLineHighlight,
  reviewTheme,
];

// Helper to update comments in an editor view
export function updateReviewComments(view: EditorView, comments: ReviewComment[]) {
  view.dispatch({
    effects: setReviewComments.of(comments),
  });
}





