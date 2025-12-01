/**
 * Search Service - Integration with local search engines
 * 
 * Supports:
 * - Perplexica (localhost:3000) - AI-powered search like Perplexity
 * - SearXNG (localhost:4000) - Privacy-focused meta-search
 * 
 * All requests go through our API proxy to avoid CORS issues
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
  relevanceScore?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchEngine: 'perplexica' | 'searxng';
  aiSummary?: string; // Perplexica can provide AI summaries
  error?: string;
}

export type SearchEngine = 'perplexica' | 'searxng' | 'both';

/**
 * Check if a search engine is available (via API proxy)
 */
export async function checkSearchEngineStatus(): Promise<{
  perplexica: boolean;
  searxng: boolean;
}> {
  try {
    const response = await fetch('/api/search?action=status', {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    
    if (response.ok) {
      const status = await response.json();
      console.log('Search engine status:', status);
      return status;
    }
  } catch (error) {
    console.error('Failed to check search engine status:', error);
  }
  
  return { perplexica: false, searxng: false };
}

/**
 * Search using SearXNG (via API proxy)
 */
export async function searchSearXNG(
  query: string,
  options?: {
    categories?: string[];
    engines?: string[];
    language?: string;
    pageNo?: number;
  }
): Promise<SearchResponse> {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        engine: 'searxng',
        query,
        categories: options?.categories,
      }),
      signal: AbortSignal.timeout(90000), // 90 seconds - AI summary takes time
    });
    
    if (!response.ok) {
      throw new Error(`SearXNG error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('SearXNG search error:', error);
    return {
      query,
      results: [],
      totalResults: 0,
      searchEngine: 'searxng',
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Search using Perplexica (via API proxy)
 * Perplexica provides AI-enhanced search with summaries
 */
export async function searchPerplexica(
  query: string,
  options?: {
    focusMode?: 'webSearch' | 'academicSearch' | 'writingAssistant' | 'wolframAlphaSearch' | 'youtubeSearch' | 'redditSearch';
    optimizationMode?: 'speed' | 'balanced' | 'quality';
  }
): Promise<SearchResponse> {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        engine: 'perplexica',
        query,
        focusMode: options?.focusMode || 'webSearch',
        optimizationMode: options?.optimizationMode || 'balanced',
      }),
      signal: AbortSignal.timeout(60000), // Perplexica can take longer due to AI processing
    });
    
    if (!response.ok) {
      throw new Error(`Perplexica error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Perplexica search error:', error);
    return {
      query,
      results: [],
      totalResults: 0,
      searchEngine: 'perplexica',
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Search using both engines and merge results
 */
export async function searchBoth(
  query: string
): Promise<{
  perplexica: SearchResponse;
  searxng: SearchResponse;
  merged: SearchResult[];
}> {
  const [perplexica, searxng] = await Promise.all([
    searchPerplexica(query),
    searchSearXNG(query),
  ]);
  
  // Merge and deduplicate results
  const urlSet = new Set<string>();
  const merged: SearchResult[] = [];
  
  // Prioritize Perplexica results (AI-curated)
  for (const result of perplexica.results) {
    if (!urlSet.has(result.url)) {
      urlSet.add(result.url);
      merged.push(result);
    }
  }
  
  // Add SearXNG results that aren't duplicates
  for (const result of searxng.results) {
    if (!urlSet.has(result.url)) {
      urlSet.add(result.url);
      merged.push(result);
    }
  }
  
  return { perplexica, searxng, merged };
}

/**
 * Main search function - uses the preferred engine
 */
export async function search(
  query: string,
  engine: SearchEngine = 'perplexica',
  options?: {
    focusMode?: 'webSearch' | 'academicSearch' | 'writingAssistant';
    categories?: string[];
  }
): Promise<SearchResponse> {
  if (engine === 'both') {
    const { perplexica, searxng, merged } = await searchBoth(query);
    return {
      query,
      results: merged,
      totalResults: merged.length,
      searchEngine: 'perplexica', // Primary
      aiSummary: perplexica.aiSummary,
      error: perplexica.error || searxng.error,
    };
  }
  
  if (engine === 'perplexica') {
    return searchPerplexica(query, options);
  }
  
  return searchSearXNG(query, { categories: options?.categories });
}

/**
 * Format search results as markdown for insertion into documents
 */
export function formatResultsAsMarkdown(
  response: SearchResponse,
  options?: {
    includeAiSummary?: boolean;
    maxResults?: number;
    includeUrls?: boolean;
  }
): string {
  const lines: string[] = [];
  const maxResults = options?.maxResults || 100; // Default to all results
  
  // Add AI summary if available
  if (options?.includeAiSummary && response.aiSummary) {
    lines.push('## Summary\n');
    lines.push(response.aiSummary);
    lines.push('\n');
  }
  
  // Add sources
  if (response.results.length > 0) {
    lines.push('## Sources\n');
    
    response.results.slice(0, maxResults).forEach((result, index) => {
      lines.push(`${index + 1}. **${result.title}**`);
      if (result.snippet) {
        lines.push(`   ${result.snippet.slice(0, 200)}${result.snippet.length > 200 ? '...' : ''}`);
      }
      if (options?.includeUrls) {
        lines.push(`   [Link](${result.url})`);
      }
      lines.push('');
    });
  }
  
  return lines.join('\n');
}

/**
 * Generate a citation from a search result
 */
export function generateCitation(
  result: SearchResult,
  format: 'apa' | 'mla' | 'chicago' | 'simple' = 'simple'
): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Extract domain from URL
  let domain = '';
  try {
    domain = new URL(result.url).hostname.replace('www.', '');
  } catch {
    domain = result.source;
  }
  
  switch (format) {
    case 'apa':
      return `${result.title}. (${result.publishedDate || 'n.d.'}). ${domain}. Retrieved ${today}, from ${result.url}`;
    
    case 'mla':
      return `"${result.title}." ${domain}, ${result.publishedDate || 'n.d.'}, ${result.url}. Accessed ${today}.`;
    
    case 'chicago':
      return `"${result.title}." ${domain}. ${result.publishedDate || 'n.d.'}. ${result.url}.`;
    
    case 'simple':
    default:
      return `[${result.title}](${result.url})`;
  }
}

