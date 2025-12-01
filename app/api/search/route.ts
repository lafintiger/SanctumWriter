/**
 * Search API Proxy - Bypasses CORS for Perplexica and SearXNG
 */

import { NextRequest, NextResponse } from 'next/server';

const PERPLEXICA_URL = process.env.PERPLEXICA_URL || 'http://localhost:3000';
const SEARXNG_URL = process.env.SEARXNG_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { engine, query, focusMode, optimizationMode, generateSummary = true } = body;
    
    if (engine === 'perplexica') {
      return await searchPerplexica(query, focusMode, optimizationMode);
    } else if (engine === 'searxng') {
      return await searchSearXNG(query, body.categories, generateSummary);
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

// Fetch Perplexica's configured providers and models
async function getPerplexicaConfig(): Promise<{
  chatModel: { providerId: string; model: string } | null;
  embeddingModel: { providerId: string; model: string } | null;
}> {
  try {
    // Try to get providers from Perplexica
    const providersResponse = await fetch(`${PERPLEXICA_URL}/api/providers`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (providersResponse.ok) {
      const providers = await providersResponse.json();
      console.log('Perplexica providers:', JSON.stringify(providers).slice(0, 1000));
      
      // Find Ollama provider
      const ollamaProvider = providers.find?.((p: any) => 
        p.type === 'ollama' || p.provider === 'ollama' || p.name?.toLowerCase().includes('ollama')
      );
      
      if (ollamaProvider) {
        console.log('Found Ollama provider:', JSON.stringify(ollamaProvider));
        return {
          chatModel: {
            providerId: ollamaProvider.id || ollamaProvider.providerId,
            model: ollamaProvider.chatModel || ollamaProvider.defaultModel || 'llama3.2:latest',
          },
          embeddingModel: {
            providerId: ollamaProvider.id || ollamaProvider.providerId,
            model: ollamaProvider.embeddingModel || 'nomic-embed-text:latest',
          },
        };
      }
    }
    
    // Also try the config endpoint
    const configResponse = await fetch(`${PERPLEXICA_URL}/api/config`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('Perplexica config:', JSON.stringify(config).slice(0, 1000));
      
      // Extract provider IDs from config
      const chatProviderId = config.chatModelProviderId || config.chatModelProvider?.id || config.selectedChatModelProviderId;
      const embeddingProviderId = config.embeddingModelProviderId || config.embeddingModelProvider?.id || config.selectedEmbeddingModelProviderId;
      
      if (chatProviderId) {
        return {
          chatModel: {
            providerId: chatProviderId,
            model: config.chatModel || config.selectedChatModel || 'llama3.2:latest',
          },
          embeddingModel: {
            providerId: embeddingProviderId || chatProviderId,
            model: config.embeddingModel || config.selectedEmbeddingModel || 'nomic-embed-text:latest',
          },
        };
      }
    }
  } catch (error) {
    console.log('Could not fetch Perplexica config:', error);
  }
  
  console.log('No Perplexica config found, returning null');
  return { chatModel: null, embeddingModel: null };
}

async function searchPerplexica(
  query: string,
  focusMode?: string,
  optimizationMode?: string
) {
  // Perplexica uses Server-Sent Events (SSE) streaming for its API
  // We need to handle the stream and collect the full response
  
  // First, try to get Perplexica's configured providers/models
  const { chatModel, embeddingModel } = await getPerplexicaConfig();
  
  // Build request - newer Perplexica requires providerId
  const requestBody: Record<string, any> = {
    query: query,
    focusMode: focusMode || 'webSearch',
    optimizationMode: optimizationMode || 'balanced',
    history: [],
  };
  
  // Add models with providerId (required by newer Perplexica versions)
  if (chatModel) {
    requestBody.chatModel = {
      providerId: chatModel.providerId,
      model: chatModel.model,
    };
  }
  if (embeddingModel) {
    requestBody.embeddingModel = {
      providerId: embeddingModel.providerId,
      model: embeddingModel.model,
    };
  }
  
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
    
    // Fallback to SearXNG with AI summary
    console.log('Falling back to SearXNG with AI summary...');
    try {
      const searxngResult = await searchSearXNGDirect(query);
      if (searxngResult) {
        const data = await searxngResult.json();
        
        // Generate AI summary for the fallback results too!
        let aiSummary: string | null = null;
        if (data.results && data.results.length > 0) {
          console.log('Generating AI summary for SearXNG fallback results...');
          aiSummary = await generateSearchSummary(query, data.results);
        }
        
        return NextResponse.json({
          ...data,
          aiSummary,
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

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Generate AI summary of search results using Ollama
async function generateSearchSummary(
  query: string,
  results: Array<{ title: string; url: string; snippet: string; source: string }>
): Promise<string | null> {
  if (results.length === 0) return null;
  
  // Build context from search results
  const sourcesContext = results.slice(0, 10).map((r, i) => 
    `[${i + 1}] "${r.title}"\nURL: ${r.url}\nContent: ${r.snippet}\n`
  ).join('\n');
  
  const prompt = `You are a research assistant. Based on the following search results for the query "${query}", provide a comprehensive summary that:
1. Synthesizes the key information from multiple sources
2. Uses inline citations like [1], [2], etc. to reference specific sources
3. Is well-organized and easy to read
4. Highlights any conflicting information between sources
5. Is 2-3 paragraphs long

Search Results:
${sourcesContext}

Write your summary now, using [1], [2], etc. to cite sources:`;

  try {
    console.log('Generating AI summary with Ollama...');
    
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:latest', // Use the default model
        prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower for more factual responses
          num_predict: 1024,
        },
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout for AI generation
    });
    
    if (!response.ok) {
      console.error('Ollama summary generation failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    const summary = data.response?.trim();
    
    if (summary) {
      console.log('AI summary generated successfully');
      return summary;
    }
  } catch (error) {
    console.error('Error generating AI summary:', error);
  }
  
  return null;
}

async function searchSearXNG(query: string, categories?: string[], generateSummary: boolean = true) {
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
    
    // Generate AI summary if requested and we have results
    let aiSummary: string | null = null;
    if (generateSummary && results.length > 0) {
      aiSummary = await generateSearchSummary(query, results);
    }
    
    return NextResponse.json({
      query,
      results,
      totalResults: data.number_of_results || results.length,
      searchEngine: 'searxng',
      aiSummary, // Include AI-generated summary with citations!
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

