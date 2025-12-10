'use client';

import React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/useAppStore';

export function Toast() {
  const { toast, clearToast } = useAppStore();

  if (!toast) return null;

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-accent',
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in',
        colors[toast.type]
      )}
    >
      <Icon className="w-5 h-5 text-white" />
      <span className="text-white text-sm">{toast.message}</span>
      <button
        onClick={clearToast}
        className="p-1 hover:bg-white/20 rounded"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}














