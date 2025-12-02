/**
 * Writing Statistics Utilities
 * 
 * Provides word count, character count, reading time,
 * and readability metrics for documents.
 */

export interface WritingStats {
  // Basic counts
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  
  // Time estimates
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
  
  // Readability scores
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
}

export interface WritingGoal {
  id: string;
  type: 'words' | 'characters' | 'time';
  target: number;
  current: number;
  sessionStart: number; // Value when session started
  createdAt: Date;
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length <= 3) return 1;
  
  // Remove silent e at end
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

/**
 * Calculate Flesch Reading Ease score
 * Higher = easier to read (0-100 scale)
 * 
 * 90-100: Very Easy (5th grade)
 * 80-89: Easy (6th grade)
 * 70-79: Fairly Easy (7th grade)
 * 60-69: Standard (8th-9th grade)
 * 50-59: Fairly Difficult (10th-12th grade)
 * 30-49: Difficult (College)
 * 0-29: Very Difficult (Graduate)
 */
function calculateFleschReadingEase(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0;
  
  const avgSentenceLength = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;
  
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * Returns US grade level needed to understand the text
 */
function calculateFleschKincaidGrade(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0;
  
  const avgSentenceLength = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;
  
  const grade = (0.39 * avgSentenceLength) + (11.8 * avgSyllablesPerWord) - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

/**
 * Get a human-readable description of the Flesch Reading Ease score
 */
export function getReadabilityLabel(score: number): { label: string; color: string; description: string } {
  if (score >= 90) return { label: 'Very Easy', color: '#22c55e', description: '5th grade level' };
  if (score >= 80) return { label: 'Easy', color: '#84cc16', description: '6th grade level' };
  if (score >= 70) return { label: 'Fairly Easy', color: '#a3e635', description: '7th grade level' };
  if (score >= 60) return { label: 'Standard', color: '#facc15', description: '8th-9th grade' };
  if (score >= 50) return { label: 'Fairly Hard', color: '#fb923c', description: '10th-12th grade' };
  if (score >= 30) return { label: 'Difficult', color: '#f87171', description: 'College level' };
  return { label: 'Very Hard', color: '#ef4444', description: 'Graduate level' };
}

/**
 * Calculate all writing statistics for a text
 */
export function calculateWritingStats(text: string): WritingStats {
  // Basic cleaning
  const cleanText = text.trim();
  
  if (!cleanText) {
    return {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      readingTimeMinutes: 0,
      speakingTimeMinutes: 0,
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0,
    };
  }
  
  // Character counts
  const characters = cleanText.length;
  const charactersNoSpaces = cleanText.replace(/\s/g, '').length;
  
  // Word count
  const words = cleanText
    .split(/\s+/)
    .filter(word => word.length > 0 && /[a-zA-Z0-9]/.test(word));
  const wordCount = words.length;
  
  // Sentence count (approximate)
  const sentences = cleanText
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  
  // Paragraph count
  const paragraphs = cleanText
    .split(/\n\s*\n/)
    .filter(p => p.trim().length > 0);
  const paragraphCount = Math.max(1, paragraphs.length);
  
  // Syllable count
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  // Reading time (average 200-250 words per minute)
  const readingTimeMinutes = wordCount / 225;
  
  // Speaking time (average 125-150 words per minute)
  const speakingTimeMinutes = wordCount / 137;
  
  // Readability scores
  const fleschReadingEase = calculateFleschReadingEase(wordCount, sentenceCount, totalSyllables);
  const fleschKincaidGrade = calculateFleschKincaidGrade(wordCount, sentenceCount, totalSyllables);
  
  // Averages
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;
  
  return {
    characters,
    charactersNoSpaces,
    words: wordCount,
    sentences: sentenceCount,
    paragraphs: paragraphCount,
    readingTimeMinutes: Math.round(readingTimeMinutes * 10) / 10,
    speakingTimeMinutes: Math.round(speakingTimeMinutes * 10) / 10,
    fleschReadingEase,
    fleschKincaidGrade,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
  };
}

/**
 * Format time in minutes to human readable string
 */
export function formatTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format word count with thousands separator
 */
export function formatWordCount(count: number): string {
  return count.toLocaleString();
}

/**
 * Calculate progress towards a goal
 */
export function calculateGoalProgress(goal: WritingGoal): {
  progress: number;
  remaining: number;
  percentComplete: number;
  sessionProgress: number;
} {
  const progress = goal.current - goal.sessionStart;
  const remaining = Math.max(0, goal.target - goal.current);
  const percentComplete = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const sessionProgress = progress;
  
  return { progress, remaining, percentComplete, sessionProgress };
}





