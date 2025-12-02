'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '@/lib/store/useAppStore';

export function Preview() {
  const { currentDocument } = useAppStore();

  if (!currentDocument) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg text-text-secondary">
        <p>No document to preview</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-editor-bg p-6">
      <div className="max-w-3xl mx-auto markdown-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {currentDocument.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}





