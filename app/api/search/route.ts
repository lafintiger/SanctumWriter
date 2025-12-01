/**
 * Search API Proxy - Bypasses CORS for Perplexica and SearXNG
 */

import { NextRequest, NextResponse } from 'next/server';

const PERPLEXICA_URL = process.env.PERPLEXICA_URL || 'http://localhost:3000';
const SEARXNG_URL = process.env.SEARXNG_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { engine, query, focusMode, optimizationMode } = body;
    
    if (engine === 'perplexica') {
      return await searchPerplexica(query, focusMode, optimizationMode);
    } else if (engine === 'searxng') {
      return await searchSearXNG(query, body.categories);
    }
    
    return NextResponse.json({ error: 'Invalid engine' }, { status: 400 });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'status') {
    return await checkStatus();
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

async function checkStatus() {
  const status = { perplexica: false, searxng: false };
  
  // Check Perplexica
  try {
    const response = await fetch(`${PERPLEXICA_URL}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    status.perplexica = response.ok || response.status === 200;
  } catch (error) {
    console.log('Perplexica not available:', error);
  }
  
  // Check SearXNG
  try {
    const response = await fetch(`${SEARXNG_URL}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    status.searxng = response.ok || response.status === 200;
  } catch (error) {
    console.log('SearXNG not available:', error);
  }
  
  console.log('Search engine status:', status);
  return NextResponse.json(status);
}

async function searchPerplexica(
  query: string,
  focusMode?: string,
  optimizationMode?: string
) {
  // Perplexica API formats to try
  const requestFormats = [
    // Format 1: Standard search endpoint
    {
      endpoint: '/api/search',
      body: {
        query,
        focusMode: focusMode || 'webSearch',
        optimizationMode: optimizationMode || 'balanced',
      },
    },
    // Format 2: With chat/embedding model config
    {
      endpoint: '/api/search',
      body: {
        query,
        chatModel: { provider: 'ollama', model: 'qwen3:latest' },
        embeddingModel: { provider: 'ollama', model: 'nomic-embed-text' },
        focusMode: focusMode || 'webSearch',
        optimizationMode: optimizationMode || 'balanced',
      },
    },
    // Format 3: Chat-style format
    {
      endpoint: '/api/chat',
      body: {
        message: query,
        focus: focusMode || 'webSearch',
        mode: optimizationMode || 'balanced',
      },
    },
    // Format 4: Simple query format
    {
      endpoint: '/api/search',
      body: { q: query },
    },
  ];
  
  for (const { endpoint, body } of requestFormats) {
    try {
      console.log(`Trying Perplexica ${endpoint} with:`, JSON.stringify(body).slice(0, 200));
      
      const response = await fetch(`${PERPLEXICA_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      
      const responseText = await response.text();
      console.log(`Perplexica ${endpoint} returned ${response.status}:`, responseText.slice(0, 500));
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          
          // Parse response - handle various formats
          const sources = data.sources || data.results || data.context || data.documents || [];
          const results = sources.map((s: any) => ({
            title: s.title || s.name || s.metadata?.title || 'Untitled',
            url: s.url || s.link || s.metadata?.url || s.metadata?.source || '',
            snippet: s.snippet || s.content || s.description || s.pageContent || s.text || '',
            source: 'perplexica',
            relevanceScore: s.score,
          }));
          
          return NextResponse.json({
            query,
            results,
            totalResults: results.length,
            searchEngine: 'perplexica',
            aiSummary: data.answer || data.response || data.message || data.content || data.text,
          });
        } catch (parseError) {
          console.error('Failed to parse Perplexica response:', parseError);
        }
      }
    } catch (error) {
      console.error(`Perplexica ${endpoint} error:`, error);
    }
  }
  
  // Fallback: Try SearXNG instead
  console.log('Perplexica failed, falling back to SearXNG...');
  try {
    const searxngResponse = await searchSearXNGDirect(query);
    if (searxngResponse) {
      const data = await searxngResponse.json();
      return NextResponse.json({
        ...data,
        searchEngine: 'searxng',
        aiSummary: undefined,
        error: 'Perplexica unavailable, used SearXNG',
      });
    }
  } catch (e) {
    console.error('SearXNG fallback also failed:', e);
  }
  
  return NextResponse.json({
    query,
    results: [],
    totalResults: 0,
    searchEngine: 'perplexica',
    error: 'Perplexica search failed - check if it is properly configured',
  });
}

// Direct SearXNG search for fallback
async function searchSearXNGDirect(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    language: 'en',
  });
  
  const response = await fetch(`${SEARXNG_URL}/search?${params}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  const results = (data.results || []).map((r: any) => ({
    title: r.title || 'Untitled',
    url: r.url || '',
    snippet: r.content || r.description || '',
    source: r.engine || 'searxng',
    publishedDate: r.publishedDate,
    relevanceScore: r.score,
  }));
  
  return new Response(JSON.stringify({
    query,
    results,
    totalResults: data.number_of_results || results.length,
    searchEngine: 'searxng',
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function searchSearXNG(query: string, categories?: string[]) {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      language: 'en',
    });
    
    if (categories?.length) {
      params.set('categories', categories.join(','));
    }
    
    const response = await fetch(`${SEARXNG_URL}/search?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      throw new Error(`SearXNG error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const results = (data.results || []).map((r: any) => ({
      title: r.title || 'Untitled',
      url: r.url || '',
      snippet: r.content || r.description || '',
      source: r.engine || 'searxng',
      publishedDate: r.publishedDate,
      relevanceScore: r.score,
    }));
    
    return NextResponse.json({
      query,
      results,
      totalResults: data.number_of_results || results.length,
      searchEngine: 'searxng',
    });
  } catch (error) {
    console.error('SearXNG search error:', error);
    return NextResponse.json({
      query,
      results: [],
      totalResults: 0,
      searchEngine: 'searxng',
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
}

