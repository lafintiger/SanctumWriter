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
  // Perplexica uses Server-Sent Events (SSE) streaming for its API
  // We need to handle the stream and collect the full response
  
  // Don't specify models - let Perplexica use its own configured defaults
  // If we need models, Perplexica will use what's set in its config.toml
  const requestBody: Record<string, any> = {
    query: query,
    focusMode: focusMode || 'webSearch',
    optimizationMode: optimizationMode || 'balanced',
    history: [],
  };
  
  console.log('Perplexica request:', JSON.stringify(requestBody));
  
  try {
    const response = await fetch(`${PERPLEXICA_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(90000), // 90 seconds for AI processing
    });
    
    console.log('Perplexica response status:', response.status);
    console.log('Perplexica response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexica error:', response.status, errorText);
      throw new Error(`Perplexica returned ${response.status}: ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Handle SSE streaming response
    if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
      return await handlePerplexicaStream(response, query);
    }
    
    // Handle JSON response
    const data = await response.json();
    return parsePerplexicaResponse(data, query);
    
  } catch (error) {
    console.error('Perplexica search error:', error);
    
    // Fallback to SearXNG
    console.log('Falling back to SearXNG...');
    try {
      const searxngResult = await searchSearXNGDirect(query);
      if (searxngResult) {
        const data = await searxngResult.json();
        return NextResponse.json({
          ...data,
          error: `Perplexica failed: ${error instanceof Error ? error.message : 'Unknown error'}. Used SearXNG instead.`,
        });
      }
    } catch (fallbackError) {
      console.error('SearXNG fallback failed:', fallbackError);
    }
    
    return NextResponse.json({
      query,
      results: [],
      totalResults: 0,
      searchEngine: 'perplexica',
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
}

// Handle Perplexica's SSE streaming response
async function handlePerplexicaStream(response: Response, query: string) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }
  
  const decoder = new TextDecoder();
  let fullText = '';
  let sources: any[] = [];
  let answer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      
      // Parse SSE events
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            
            // Handle different event types from Perplexica
            if (eventData.type === 'sources' && eventData.data) {
              sources = eventData.data;
            } else if (eventData.type === 'response' || eventData.type === 'message') {
              answer += eventData.data || eventData.message || '';
            } else if (eventData.sources) {
              sources = eventData.sources;
            } else if (eventData.answer || eventData.response) {
              answer = eventData.answer || eventData.response;
            }
          } catch {
            // Not valid JSON, might be partial data
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  console.log('Perplexica stream complete. Sources:', sources.length, 'Answer length:', answer.length);
  
  // Parse the collected data
  const results = sources.map((s: any) => ({
    title: s.title || s.metadata?.title || 'Untitled',
    url: s.url || s.metadata?.url || s.metadata?.source || '',
    snippet: s.content || s.pageContent || s.description || '',
    source: 'perplexica',
  }));
  
  return NextResponse.json({
    query,
    results,
    totalResults: results.length,
    searchEngine: 'perplexica',
    aiSummary: answer || undefined,
  });
}

// Parse standard Perplexica JSON response
function parsePerplexicaResponse(data: any, query: string) {
  const sources = data.sources || data.results || data.context || data.documents || [];
  
  const results = sources.map((s: any) => ({
    title: s.title || s.metadata?.title || 'Untitled',
    url: s.url || s.metadata?.url || s.metadata?.source || '',
    snippet: s.content || s.pageContent || s.description || s.snippet || '',
    source: 'perplexica',
    relevanceScore: s.score,
  }));
  
  return NextResponse.json({
    query,
    results,
    totalResults: results.length,
    searchEngine: 'perplexica',
    aiSummary: data.answer || data.response || data.message || data.text,
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

