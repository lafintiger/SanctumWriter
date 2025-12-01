'use client';

import React, { useState } from 'react';
import {
  Users,
  Play,
  Square,
  Settings,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  AlertCircle,
  MessageSquare,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCouncilStore } from '@/lib/store/useCouncilStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { ReviewComment, getCommentIcon, getSeverityColor } from '@/types/council';

export function CouncilPanel() {
  const [activeTab, setActiveTab] = useState<'reviewers' | 'results'>('reviewers');
  const [expandedReviewer, setExpandedReviewer] = useState<string | null>(null);
  
  const {
    reviewers,
    currentSession,
    isReviewing,
    reviewProgress,
    toggleReviewer,
    getEnabledReviewers,
    getCommentStats,
    filterByReviewer,
    setFilterByReviewer,
    filterByType,
    setFilterByType,
    updateCommentStatus,
  } = useCouncilStore();
  
  const { currentDocument } = useAppStore();
  
  const enabledReviewers = getEnabledReviewers();
  const stats = getCommentStats();
  
  return (
    <div className="h-full flex flex-col bg-sidebar-bg border-l border-border">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-text-primary">Council of Writers</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-editor-bg rounded-lg">
          <button
            onClick={() => setActiveTab('reviewers')}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors',
              activeTab === 'reviewers'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Reviewers
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors relative',
              activeTab === 'results'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Results
            {stats.total > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.total}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'reviewers' ? (
          <ReviewersTab
            reviewers={reviewers}
            reviewProgress={reviewProgress}
            isReviewing={isReviewing}
            expandedReviewer={expandedReviewer}
            setExpandedReviewer={setExpandedReviewer}
            toggleReviewer={toggleReviewer}
          />
        ) : (
          <ResultsTab
            session={currentSession}
            reviewers={reviewers}
            filterByReviewer={filterByReviewer}
            setFilterByReviewer={setFilterByReviewer}
            filterByType={filterByType}
            setFilterByType={setFilterByType}
            updateCommentStatus={updateCommentStatus}
          />
        )}
      </div>
      
      {/* Footer - Start Review Button */}
      <div className="p-3 border-t border-border">
        <StartReviewButton
          enabledReviewers={enabledReviewers}
          currentDocument={currentDocument}
          isReviewing={isReviewing}
        />
      </div>
    </div>
  );
}

// Reviewers Tab Component
interface ReviewersTabProps {
  reviewers: ReturnType<typeof useCouncilStore.getState>['reviewers'];
  reviewProgress: ReturnType<typeof useCouncilStore.getState>['reviewProgress'];
  isReviewing: boolean;
  expandedReviewer: string | null;
  setExpandedReviewer: (id: string | null) => void;
  toggleReviewer: (id: string) => void;
}

function ReviewersTab({
  reviewers,
  reviewProgress,
  isReviewing,
  expandedReviewer,
  setExpandedReviewer,
  toggleReviewer,
}: ReviewersTabProps) {
  return (
    <div className="p-2 space-y-1">
      {reviewers.map((reviewer) => {
        const isExpanded = expandedReviewer === reviewer.id;
        const progress = reviewProgress[reviewer.id];
        
        return (
          <div
            key={reviewer.id}
            className={cn(
              'rounded-lg border transition-colors',
              reviewer.enabled
                ? 'border-accent/30 bg-accent/5'
                : 'border-border bg-editor-bg'
            )}
          >
            {/* Reviewer Header */}
            <div
              className="flex items-center gap-2 p-2 cursor-pointer"
              onClick={() => setExpandedReviewer(isExpanded ? null : reviewer.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleReviewer(reviewer.id);
                }}
                disabled={isReviewing}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  reviewer.enabled
                    ? 'bg-accent border-accent text-white'
                    : 'border-border hover:border-accent'
                )}
              >
                {reviewer.enabled && <Check className="w-3 h-3" />}
              </button>
              
              <span className="text-lg">{reviewer.icon}</span>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {reviewer.name}
                </div>
              </div>
              
              {/* Progress indicator */}
              {progress && (
                <div className="flex items-center">
                  {progress === 'in_progress' && (
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  )}
                  {progress === 'complete' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {progress === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
              
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-secondary" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              )}
            </div>
            
            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-3 pb-3 text-xs space-y-2">
                <p className="text-text-secondary">{reviewer.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">Model:</span>
                  <span className="text-text-primary font-mono">{reviewer.model}</span>
                </div>
                <div
                  className="w-full h-1 rounded"
                  style={{ backgroundColor: reviewer.color }}
                />
              </div>
            )}
          </div>
        );
      })}
      
      {/* Add custom reviewer hint */}
      <div className="p-3 text-center">
        <button className="text-xs text-text-secondary hover:text-accent transition-colors flex items-center gap-1 mx-auto">
          <Settings className="w-3 h-3" />
          Configure reviewers in Settings
        </button>
      </div>
    </div>
  );
}

// Results Tab Component
interface ResultsTabProps {
  session: ReturnType<typeof useCouncilStore.getState>['currentSession'];
  reviewers: ReturnType<typeof useCouncilStore.getState>['reviewers'];
  filterByReviewer: string | null;
  setFilterByReviewer: (id: string | null) => void;
  filterByType: ReviewComment['type'] | null;
  setFilterByType: (type: ReviewComment['type'] | null) => void;
  updateCommentStatus: (id: string, status: ReviewComment['status']) => void;
}

function ResultsTab({
  session,
  reviewers,
  filterByReviewer,
  setFilterByReviewer,
  filterByType,
  setFilterByType,
  updateCommentStatus,
}: ResultsTabProps) {
  if (!session) {
    return (
      <div className="p-6 text-center">
        <MessageSquare className="w-12 h-12 mx-auto text-text-secondary opacity-50 mb-3" />
        <p className="text-text-secondary text-sm">No review session active</p>
        <p className="text-text-secondary text-xs mt-1">
          Enable reviewers and click &quot;Start Review&quot;
        </p>
      </div>
    );
  }
  
  // Filter comments
  let comments = session.comments;
  if (filterByReviewer) {
    comments = comments.filter((c) => c.reviewerId === filterByReviewer);
  }
  if (filterByType) {
    comments = comments.filter((c) => c.type === filterByType);
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-2 border-b border-border flex gap-2">
        <select
          value={filterByReviewer || ''}
          onChange={(e) => setFilterByReviewer(e.target.value || null)}
          className="flex-1 text-xs bg-editor-bg border border-border rounded px-2 py-1 text-text-primary"
        >
          <option value="">All Reviewers</option>
          {reviewers.filter((r) => r.enabled).map((r) => (
            <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
          ))}
        </select>
        
        <select
          value={filterByType || ''}
          onChange={(e) => setFilterByType(e.target.value as ReviewComment['type'] || null)}
          className="flex-1 text-xs bg-editor-bg border border-border rounded px-2 py-1 text-text-primary"
        >
          <option value="">All Types</option>
          <option value="suggestion">💡 Suggestions</option>
          <option value="warning">⚠️ Warnings</option>
          <option value="error">❌ Errors</option>
          <option value="praise">✨ Praise</option>
          <option value="question">❓ Questions</option>
        </select>
      </div>
      
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {comments.length === 0 ? (
          <div className="text-center py-6 text-text-secondary text-sm">
            {session.status === 'in_progress' ? (
              <>
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                <p>Reviewing document...</p>
              </>
            ) : (
              <p>No comments found</p>
            )}
          </div>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onAccept={() => updateCommentStatus(comment.id, 'accepted')}
              onReject={() => updateCommentStatus(comment.id, 'rejected')}
              onDismiss={() => updateCommentStatus(comment.id, 'dismissed')}
            />
          ))
        )}
      </div>
      
      {/* Summary */}
      {session.summary && (
        <div className="p-3 border-t border-border bg-accent/5">
          <h4 className="text-xs font-medium text-text-primary mb-1">Summary</h4>
          <p className="text-xs text-text-secondary">{session.summary}</p>
        </div>
      )}
    </div>
  );
}

// Comment Card Component
interface CommentCardProps {
  comment: ReviewComment;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

function CommentCard({ comment, onAccept, onReject, onDismiss }: CommentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div
      className={cn(
        'rounded-lg border p-2 text-xs transition-all',
        comment.status === 'accepted' && 'border-green-500/30 bg-green-500/5',
        comment.status === 'rejected' && 'border-red-500/30 bg-red-500/5 opacity-50',
        comment.status === 'dismissed' && 'opacity-30',
        comment.status === 'pending' && 'border-border bg-editor-bg'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <span className="text-base">{comment.reviewerIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{comment.reviewerName}</span>
            <span>{getCommentIcon(comment.type)}</span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getSeverityColor(comment.severity) }}
            />
          </div>
          <div className="text-text-secondary">Line {comment.startLine}</div>
        </div>
      </div>
      
      {/* Comment */}
      <p className="mt-2 text-text-primary">{comment.comment}</p>
      
      {/* Original text */}
      {comment.originalText && (
        <div
          className="mt-2 p-2 bg-sidebar-bg rounded border-l-2 cursor-pointer"
          style={{ borderColor: comment.reviewerColor }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <p className={cn('text-text-secondary', !isExpanded && 'truncate')}>
            &quot;{comment.originalText}&quot;
          </p>
        </div>
      )}
      
      {/* Suggested fix */}
      {comment.suggestedFix && isExpanded && (
        <div className="mt-2 p-2 bg-green-500/10 rounded">
          <span className="text-green-400">Suggested: </span>
          <span className="text-text-primary">&quot;{comment.suggestedFix}&quot;</span>
        </div>
      )}
      
      {/* Actions */}
      {comment.status === 'pending' && (
        <div className="mt-2 flex gap-1">
          <button
            onClick={onAccept}
            className="flex-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors flex items-center justify-center gap-1"
          >
            <Check className="w-3 h-3" /> Accept
          </button>
          <button
            onClick={onReject}
            className="flex-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors flex items-center justify-center gap-1"
          >
            <X className="w-3 h-3" /> Reject
          </button>
          <button
            onClick={onDismiss}
            className="px-2 py-1 bg-border hover:bg-border/80 text-text-secondary rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Status badge */}
      {comment.status !== 'pending' && (
        <div className="mt-2 text-xs">
          <span className={cn(
            'px-2 py-0.5 rounded',
            comment.status === 'accepted' && 'bg-green-500/20 text-green-400',
            comment.status === 'rejected' && 'bg-red-500/20 text-red-400',
            comment.status === 'dismissed' && 'bg-border text-text-secondary'
          )}>
            {comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
          </span>
        </div>
      )}
    </div>
  );
}

// Start Review Button Component
interface StartReviewButtonProps {
  enabledReviewers: ReturnType<typeof useCouncilStore.getState>['reviewers'];
  currentDocument: ReturnType<typeof useAppStore.getState>['currentDocument'];
  isReviewing: boolean;
}

function StartReviewButton({ enabledReviewers, currentDocument, isReviewing }: StartReviewButtonProps) {
  const { startReview, cancelReview } = useCouncilStore();
  const [reviewStatus, setReviewStatus] = useState('');
  
  const handleStartReview = async () => {
    if (!currentDocument) return;
    
    const reviewerIds = enabledReviewers.map((r) => r.id);
    startReview(currentDocument.path, currentDocument.content, reviewerIds);
    
    // Dynamically import to avoid SSR issues
    const { runReviewPipeline } = await import('@/lib/council/reviewPipeline');
    
    try {
      await runReviewPipeline(
        currentDocument.content,
        reviewerIds,
        undefined, // No selection for full document review
        (status) => setReviewStatus(status)
      );
    } catch (error) {
      console.error('Review pipeline error:', error);
      setReviewStatus('Review failed');
    }
  };
  
  if (isReviewing) {
    return (
      <div className="space-y-2">
        {reviewStatus && (
          <div className="text-xs text-text-secondary text-center py-1">
            {reviewStatus}
          </div>
        )}
        <button
          onClick={cancelReview}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors"
        >
          <Square className="w-4 h-4" />
          Cancel Review
        </button>
      </div>
    );
  }
  
  const canReview = enabledReviewers.length > 0 && currentDocument;
  
  return (
    <button
      onClick={handleStartReview}
      disabled={!canReview}
      className={cn(
        'w-full flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-colors',
        canReview
          ? 'bg-accent hover:bg-accent-hover text-white'
          : 'bg-border text-text-secondary cursor-not-allowed'
      )}
    >
      <Play className="w-4 h-4" />
      Start Review ({enabledReviewers.length} reviewers)
    </button>
  );
}

