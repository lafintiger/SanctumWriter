/**
 * Citation Parser
 * Parses [@key] syntax in markdown documents
 */

import { CitationMatch } from '@/types/citation';

// Regex to match citation patterns
// Matches: [@key], [@key, p. 45], [@key; @key2], [see @key], [@key, emphasis added]
const CITATION_REGEX = /\[(?:([^@\]]*?)\s)?@([a-zA-Z][a-zA-Z0-9_-]*)(?:\s*,\s*(?:p\.?\s*)?(\d+(?:-\d+)?))?\s*(?:;[^\]]+)?\]/g;

// Simple single citation pattern
const SINGLE_CITATION_REGEX = /@([a-zA-Z][a-zA-Z0-9_-]*)/g;

/**
 * Parse all citations from text
 */
export function parseCitations(text: string): CitationMatch[] {
  const matches: CitationMatch[] = [];
  let match;

  // Reset regex lastIndex
  CITATION_REGEX.lastIndex = 0;

  while ((match = CITATION_REGEX.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      key: match[2],
      page: match[3],
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    });
  }

  return matches;
}

/**
 * Extract unique citation keys from text
 */
export function extractCitationKeys(text: string): string[] {
  const matches = parseCitations(text);
  const keys = new Set<string>();
  
  for (const match of matches) {
    keys.add(match.key);
  }
  
  return Array.from(keys);
}

/**
 * Get citation keys in order of first appearance
 */
export function getCitationOrder(text: string): string[] {
  const matches = parseCitations(text);
  const seen = new Set<string>();
  const order: string[] = [];
  
  for (const match of matches) {
    if (!seen.has(match.key)) {
      seen.add(match.key);
      order.push(match.key);
    }
  }
  
  return order;
}

/**
 * Replace citation keys with numbered references
 */
export function replaceCitationsWithNumbers(
  text: string,
  keyToNumber: Record<string, number>
): string {
  return text.replace(CITATION_REGEX, (match, prefix, key, page) => {
    const num = keyToNumber[key];
    if (num === undefined) return match;
    
    let result = `[${num}`;
    if (page) {
      result += `, p. ${page}`;
    }
    result += ']';
    
    if (prefix) {
      result = `[${prefix.trim()} ${num}${page ? `, p. ${page}` : ''}]`;
    }
    
    return result;
  });
}

/**
 * Replace citations with formatted inline citations
 * e.g., [@smith2024] -> (Smith, 2024) or (Smith, 2024, p. 45)
 */
export function replaceCitationsWithInline(
  text: string,
  keyToFormatted: Record<string, string>
): string {
  return text.replace(CITATION_REGEX, (match, prefix, key, page) => {
    const formatted = keyToFormatted[key];
    if (!formatted) return match;
    
    // Extract author and year from formatted string
    // This is a simplified version - real implementation would be smarter
    let result = formatted;
    
    if (page) {
      // Insert page before closing paren
      result = result.replace(/\)$/, `, p. ${page})`);
    }
    
    if (prefix) {
      result = `(${prefix.trim()} ${result.slice(1)}`;
    }
    
    return result;
  });
}

/**
 * Check if cursor is inside a citation
 */
export function getCitationAtPosition(text: string, position: number): CitationMatch | null {
  const matches = parseCitations(text);
  
  for (const match of matches) {
    if (position >= match.position.start && position <= match.position.end) {
      return match;
    }
  }
  
  return null;
}

/**
 * Find citations that are used but not defined
 */
export function findUndefinedCitations(
  text: string,
  definedKeys: string[]
): string[] {
  const usedKeys = extractCitationKeys(text);
  const definedSet = new Set(definedKeys);
  
  return usedKeys.filter(key => !definedSet.has(key));
}

/**
 * Find citations that are defined but not used
 */
export function findUnusedCitations(
  text: string,
  definedKeys: string[]
): string[] {
  const usedKeys = new Set(extractCitationKeys(text));
  return definedKeys.filter(key => !usedKeys.has(key));
}

/**
 * Validate citation key format
 */
export function isValidCitationKey(key: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key);
}

/**
 * Create a citation insertion string
 */
export function createCitationString(key: string, page?: string): string {
  if (page) {
    return `[@${key}, p. ${page}]`;
  }
  return `[@${key}]`;
}

/**
 * Create a multi-citation string
 */
export function createMultiCitationString(keys: string[]): string {
  if (keys.length === 0) return '';
  if (keys.length === 1) return `[@${keys[0]}]`;
  
  return `[@${keys.join('; @')}]`;
}














