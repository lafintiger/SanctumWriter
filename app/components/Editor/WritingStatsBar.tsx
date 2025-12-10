'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Clock,
  BookOpen,
  Target,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/useAppStore';
import {
  calculateWritingStats,
  getReadabilityLabel,
  formatTime,
  formatWordCount,
  WritingStats,
  WritingGoal,
  calculateGoalProgress,
} from '@/lib/utils/writingStats';

interface WritingStatsBarProps {
  compact?: boolean;
}

export function WritingStatsBar({ compact = false }: WritingStatsBarProps) {
  const { currentDocument, focusMode } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalType, setGoalType] = useState<'words' | 'time'>('words');
  const [goalTarget, setGoalTarget] = useState('1000');
  const [goals, setGoals] = useState<WritingGoal[]>([]);
  const [sessionStartStats, setSessionStartStats] = useState<WritingStats | null>(null);
  
  // Calculate stats
  const stats = useMemo(() => {
    if (!currentDocument?.content) {
      return calculateWritingStats('');
    }
    return calculateWritingStats(currentDocument.content);
  }, [currentDocument?.content]);
  
  // Set session start stats on mount
  useEffect(() => {
    if (stats && !sessionStartStats) {
      setSessionStartStats(stats);
    }
  }, [stats, sessionStartStats]);
  
  // Calculate session progress
  const sessionWords = sessionStartStats ? stats.words - sessionStartStats.words : 0;
  
  // Load goals from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sanctum-writer-goals');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGoals(parsed);
      } catch (e) {
        console.error('Failed to load goals:', e);
      }
    }
  }, []);
  
  // Save goals to localStorage
  useEffect(() => {
    localStorage.setItem('sanctum-writer-goals', JSON.stringify(goals));
  }, [goals]);
  
  const readability = getReadabilityLabel(stats.fleschReadingEase);
  
  const addGoal = () => {
    const target = parseInt(goalTarget, 10);
    if (isNaN(target) || target <= 0) return;
    
    const newGoal: WritingGoal = {
      id: Date.now().toString(),
      type: goalType,
      target,
      current: goalType === 'words' ? stats.words : Math.round(stats.readingTimeMinutes),
      sessionStart: goalType === 'words' ? stats.words : Math.round(stats.readingTimeMinutes),
      createdAt: new Date(),
    };
    
    setGoals([...goals, newGoal]);
    setShowGoalInput(false);
    setGoalTarget('1000');
  };
  
  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };
  
  const updateGoalProgress = (goal: WritingGoal): WritingGoal => {
    return {
      ...goal,
      current: goal.type === 'words' ? stats.words : Math.round(stats.readingTimeMinutes),
    };
  };
  
  // Don't show in focus mode (unless user wants minimal stats)
  if (focusMode && !expanded) {
    return (
      <div className="absolute bottom-4 right-4 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={() => setExpanded(true)}
          className="px-3 py-1.5 bg-sidebar-bg/80 backdrop-blur border border-border rounded-full text-xs text-text-secondary hover:text-text-primary"
        >
          {formatWordCount(stats.words)} words
        </button>
      </div>
    );
  }
  
  if (!currentDocument) return null;
  
  return (
    <div className={cn(
      'border-t border-border bg-sidebar-bg transition-all',
      expanded ? 'py-3' : 'py-1'
    )}>
      {/* Compact bar */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4 text-xs">
          {/* Word count */}
          <div className="flex items-center gap-1.5 text-text-secondary">
            <FileText className="w-3.5 h-3.5" />
            <span><strong className="text-text-primary">{formatWordCount(stats.words)}</strong> words</span>
          </div>
          
          {/* Character count */}
          <div className="hidden sm:flex items-center gap-1.5 text-text-secondary">
            <span>{formatWordCount(stats.characters)} chars</span>
          </div>
          
          {/* Reading time */}
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(stats.readingTimeMinutes)} read</span>
          </div>
          
          {/* Readability */}
          <div className="hidden md:flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-text-secondary" />
            <span 
              className="font-medium"
              style={{ color: readability.color }}
              title={`Flesch Reading Ease: ${stats.fleschReadingEase} (${readability.description})`}
            >
              {readability.label}
            </span>
          </div>
          
          {/* Session progress */}
          {sessionWords !== 0 && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
              sessionWords > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            )}>
              <TrendingUp className="w-3 h-3" />
              <span>{sessionWords > 0 ? '+' : ''}{formatWordCount(sessionWords)} session</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Active goals indicator */}
          {goals.length > 0 && !expanded && (
            <div className="flex items-center gap-1 text-xs">
              <Target className="w-3.5 h-3.5 text-accent" />
              <span className="text-text-secondary">{goals.length} goal{goals.length > 1 ? 's' : ''}</span>
            </div>
          )}
          
          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-border rounded text-text-secondary hover:text-text-primary"
            title={expanded ? 'Collapse' : 'Expand for more stats'}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Expanded section */}
      {expanded && (
        <div className="mt-3 px-4 space-y-4">
          {/* Detailed stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <StatCard
              label="Words"
              value={formatWordCount(stats.words)}
              subtext={`${stats.sentences} sentences`}
            />
            <StatCard
              label="Characters"
              value={formatWordCount(stats.charactersNoSpaces)}
              subtext={`${formatWordCount(stats.characters)} with spaces`}
            />
            <StatCard
              label="Reading Time"
              value={formatTime(stats.readingTimeMinutes)}
              subtext={`${formatTime(stats.speakingTimeMinutes)} speaking`}
            />
            <StatCard
              label="Readability"
              value={`${stats.fleschReadingEase}`}
              valueColor={readability.color}
              subtext={`Grade ${stats.fleschKincaidGrade} (${readability.label})`}
            />
          </div>
          
          {/* Readability details */}
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span>Avg {stats.avgWordsPerSentence} words/sentence</span>
            <span>•</span>
            <span>Avg {stats.avgSyllablesPerWord} syllables/word</span>
            <span>•</span>
            <span>{stats.paragraphs} paragraphs</span>
          </div>
          
          {/* Writing goals */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                Writing Goals
              </h4>
              <button
                onClick={() => setShowGoalInput(!showGoalInput)}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Goal
              </button>
            </div>
            
            {/* Add goal form */}
            {showGoalInput && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-editor-bg rounded">
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as 'words' | 'time')}
                  className="px-2 py-1 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
                >
                  <option value="words">Words</option>
                  <option value="time">Minutes</option>
                </select>
                <input
                  type="number"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="Target"
                  className="w-24 px-2 py-1 bg-sidebar-bg border border-border rounded text-sm text-text-primary"
                />
                <button
                  onClick={addGoal}
                  className="px-3 py-1 bg-accent text-white text-sm rounded hover:bg-accent-hover"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowGoalInput(false)}
                  className="p-1 text-text-secondary hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Goals list */}
            {goals.length > 0 ? (
              <div className="space-y-2">
                {goals.map((goal) => {
                  const updated = updateGoalProgress(goal);
                  const progress = calculateGoalProgress(updated);
                  const isComplete = progress.percentComplete >= 100;
                  
                  return (
                    <div
                      key={goal.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded',
                        isComplete ? 'bg-green-500/10' : 'bg-editor-bg'
                      )}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Target className="w-4 h-4 text-text-secondary" />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={cn(
                            'font-medium',
                            isComplete ? 'text-green-400' : 'text-text-primary'
                          )}>
                            {formatWordCount(updated.current)} / {formatWordCount(goal.target)} {goal.type}
                          </span>
                          <span className="text-text-secondary text-xs">
                            {progress.sessionProgress > 0 ? `+${progress.sessionProgress} this session` : ''}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              isComplete ? 'bg-green-500' : 'bg-accent'
                            )}
                            style={{ width: `${progress.percentComplete}%` }}
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeGoal(goal.id)}
                        className="p-1 text-text-tertiary hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">
                No goals set. Add a word count or time goal to track your progress.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  valueColor,
}: {
  label: string;
  value: string;
  subtext: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-editor-bg rounded p-2">
      <div className="text-xs text-text-secondary">{label}</div>
      <div 
        className="text-lg font-semibold"
        style={{ color: valueColor || 'var(--text-primary)' }}
      >
        {value}
      </div>
      <div className="text-xs text-text-tertiary">{subtext}</div>
    </div>
  );
}














