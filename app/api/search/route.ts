/**
 * Search API Proxy - Bypasses CORS for Perplexica and SearXNG
 * 
 * URLs can be customized via:
 * 1. Environment variables (PERPLEXICA_URL, SEARXNG_URL)
 * 2. Request headers (X-Perplexica-URL, X-SearXNG-URL)
 * 3. Request body (perplexicaUrl, searxngUrl)
 */

import { NextRequest, NextResponse } from 'next/server';

// Default URLs - can be overridden by env vars, headers, or request body
const DEFAULT_PERPLEXICA_URL = 'http://localhost:3000';
const DEFAULT_SEARXNG_URL = 'http://localhost:4000';

function getServiceURLs(request: NextRequest, body?: any): { perplexicaUrl: string; searxngUrl: string } {
  // Priority: Request body > Headers > Environment variables > Defaults
  const perplexicaUrl = 
    body?.perplexicaUrl ||
    request.headers.get('X-Perplexica-URL') ||
    process.env.PERPLEXICA_URL ||
    DEFAULT_PERPLEXICA_URL;
    
  const searxngUrl = 
    body?.searxngUrl ||
    request.headers.get('X-SearXNG-URL') ||
    process.env.SEARXNG_URL ||
    DEFAULT_SEARXNG_URL;
    
  return { perplexicaUrl, searxngUrl };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { engine, query, focusMode, optimizationMode, generateSummary = true } = body;
    const { perplexicaUrl, searxngUrl } = getServiceURLs(request, body);
    
    if (engine === 'perplexica') {
      return await searchPerplexica(query, focusMode, optimizationMode, perplexicaUrl, searxngUrl);
    } else if (engine === 'searxng') {
      return await searchSearXNG(query, body.categories, generateSummary, searxngUrl);
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
    const { perplexicaUrl, searxngUrl } = getServiceURLs(request);
    return await checkStatus(perplexicaUrl, searxngUrl);
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

async function checkStatus(perplexicaUrl: string, searxngUrl: string) {
  const status = { perplexica: false, searxng: false };
  
  // Check Perplexica
  try {
    const response = await fetch(`${perplexicaUrl}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    status.perplexica = response.ok || response.status === 200;
  } catch (error) {
    console.log('Perplexica not available:', error);
  }
  
  // Check SearXNG
  try {
    const response = await fetch(`${searxngUrl}/`, {
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

// Perplexica provider/model configuration
interface PerplexicaModelConfig {
  chatModel: { provider: string; model: string } | null;
  embeddingModel: { provider: string; model: string } | null;
}

// Fetch Perplexica's configured providers and models
async function getPerplexicaConfig(perplexicaUrl: string): Promise<PerplexicaModelConfig> {
  try {
    // PRIORITY: Try the config endpoint first - it has the modelProviders with UUIDs
    const configResponse = await fetch(`${perplexicaUrl}/api/config`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('Perplexica config keys:', Object.keys(config));
      
      // Check for values.modelProviders (newer Perplexica format)
      const modelProviders = config.values?.modelProviders || config.modelProviders;
      
      if (modelProviders && Array.isArray(modelProviders)) {
        console.log('Found modelProviders:', modelProviders.length);
        
        // Find Ollama provider - it has type: "ollama" and an id (UUID)
        const ollamaProvider = modelProviders.find((p: any) => 
          p.type === 'ollama' || 
          p.name?.toLowerCase() === 'ollama'
        );
        
        // Find Transformers provider for embeddings (preferred for embedding)
        const transformersProvider = modelProviders.find((p: any) => 
          p.type === 'transformers' || 
          p.name?.toLowerCase() === 'transformers'
        );
        
        if (ollamaProvider) {
          console.log('Found Ollama provider with UUID:', ollamaProvider.id);
          
          // Get available chat models (prefer non-vision models)
          const chatModels = ollamaProvider.chatModels || [];
          
          // Try to find a good chat model (prefer qwen3:latest, avoid vision models)
          let chatModelName = '';
          let foundPreferred = false;
          
          // First, look for exact match of preferred models
          const preferredModels = ['qwen3:latest', 'qwen3:8b', 'llama3.2:latest', 'gemma3:4b', 'llama3:latest'];
          
          for (const preferred of preferredModels) {
            const found = chatModels.find((m: any) => 
              m.key === preferred || m.name === preferred
            );
            if (found) {
              chatModelName = found.key || found.name;
              foundPreferred = true;
              console.log(`Found preferred model: ${chatModelName}`);
              break;
            }
          }
          
          // If no exact match, look for partial matches (avoiding vision models)
          if (!foundPreferred) {
            const nonVisionModel = chatModels.find((m: any) => {
              const key = m.key?.toLowerCase() || '';
              const name = m.name?.toLowerCase() || '';
              // Skip vision models
              if (key.includes('-vision') || key.includes('-vl') || 
                  name.includes('-vision') || name.includes('-vl') ||
                  key.includes('ocr')) {
                return false;
              }
              return true;
            });
            if (nonVisionModel) {
              chatModelName = nonVisionModel.key || nonVisionModel.name;
              console.log(`Using non-vision model: ${chatModelName}`);
            } else if (chatModels.length > 0) {
              chatModelName = chatModels[0].key || chatModels[0].name;
              console.log(`Using first available model: ${chatModelName}`);
            } else {
              chatModelName = 'qwen3:latest'; // fallback default
            }
          }
          
          // For embeddings, prefer Transformers provider if available
          let embeddingProviderId = ollamaProvider.id;
          let embeddingModelName = 'nomic-embed-text';
          
          if (transformersProvider && transformersProvider.embeddingModels?.length > 0) {
            embeddingProviderId = transformersProvider.id;
            embeddingModelName = transformersProvider.embeddingModels[0]?.key || 
                                 transformersProvider.embeddingModels[0]?.name || 
                                 'Xenova/nomic-embed-text-v1';
            console.log('Using Transformers for embeddings:', embeddingProviderId);
          } else if (ollamaProvider.embeddingModels?.length > 0) {
            embeddingModelName = ollamaProvider.embeddingModels[0]?.key || 
                                 ollamaProvider.embeddingModels[0]?.name;
          }
          
          console.log(`Using Ollama UUID: ${ollamaProvider.id}, chat: ${chatModelName}`);
          console.log(`Using Embedding provider: ${embeddingProviderId}, model: ${embeddingModelName}`);
          
          return {
            chatModel: {
              provider: ollamaProvider.id,
              model: chatModelName,
            },
            embeddingModel: {
              provider: embeddingProviderId,
              model: embeddingModelName,
            },
          };
        }
        
        // Fallback: use first provider with chatModels
        const firstProviderWithModels = modelProviders.find((p: any) => 
          p.chatModels && p.chatModels.length > 0
        );
        
        if (firstProviderWithModels) {
          console.log('Using first available provider:', firstProviderWithModels.id);
          
          // Find embedding provider
          const embeddingProvider = modelProviders.find((p: any) => 
            p.embeddingModels && p.embeddingModels.length > 0
          ) || firstProviderWithModels;
          
          return {
            chatModel: {
              provider: firstProviderWithModels.id,
              model: firstProviderWithModels.chatModels[0]?.key || 'llama3.2',
            },
            embeddingModel: {
              provider: embeddingProvider.id,
              model: embeddingProvider.embeddingModels?.[0]?.key || 'nomic-embed-text',
            },
          };
        }
      }
      
      // Legacy config format
      const chatProvider = config.chatModelProvider || config.selectedChatModelProvider;
      const embeddingProvider = config.embeddingModelProvider || config.selectedEmbeddingModelProvider || chatProvider;
      
      if (chatProvider) {
        return {
          chatModel: {
            provider: chatProvider,
            model: config.chatModel || config.selectedChatModel || 'llama3.2',
          },
          embeddingModel: {
            provider: embeddingProvider,
            model: config.embeddingModel || config.selectedEmbeddingModel || 'nomic-embed-text',
          },
        };
      }
    }
    
    // Fallback: Try /api/models endpoint
    const modelsResponse = await fetch(`${perplexicaUrl}/api/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      console.log('Perplexica models response:', JSON.stringify(modelsData).slice(0, 1000));
      
      if (modelsData.chatModelProviders && Array.isArray(modelsData.chatModelProviders)) {
        const ollamaProvider = modelsData.chatModelProviders.find((p: any) => 
          p.provider === 'ollama' || p.name?.toLowerCase().includes('ollama')
        );
        
        if (ollamaProvider) {
          return {
            chatModel: {
              provider: ollamaProvider.id || ollamaProvider.provider || 'ollama',
              model: ollamaProvider.models?.[0] || 'llama3.2',
            },
            embeddingModel: {
              provider: ollamaProvider.id || ollamaProvider.provider || 'ollama',
              model: 'nomic-embed-text',
            },
          };
        }
      }
    }
  } catch (error) {
    console.log('Could not fetch Perplexica config:', error);
  }
  
  console.log('No Perplexica config found, using defaults');
  return { 
    chatModel: { provider: 'ollama', model: 'llama3.2' },
    embeddingModel: { provider: 'ollama', model: 'nomic-embed-text' },
  };
}

// Helper function to make Perplexica API request
async function tryPerplexicaRequest(
  perplexicaUrl: string, 
  requestBody: Record<string, any>
): Promise<Response> {
  return fetch(`${perplexicaUrl}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream, application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(180000), // 3 minutes - model loading + search can take time
  });
}

async function searchPerplexica(
  query: string,
  focusMode?: string,
  optimizationMode?: string,
  perplexicaUrl: string = DEFAULT_PERPLEXICA_URL,
  searxngUrl: string = DEFAULT_SEARXNG_URL
) {
  // Perplexica uses Server-Sent Events (SSE) streaming for its API
  // Perplexica REQUIRES provider UUIDs - we must fetch config first
  
  // Get the provider configuration with UUIDs
  const { chatModel, embeddingModel } = await getPerplexicaConfig(perplexicaUrl);
  
  // Build request with provider UUIDs using correct Perplexica API field names
  // See: https://github.com/ItzCrazyKns/Perplexica/blob/master/docs/API/SEARCH.md
  const requestBody: Record<string, any> = {
    query: query,
    focusMode: focusMode || 'webSearch',
    optimizationMode: optimizationMode || 'balanced',
    history: [],
    chatModel: {
      providerId: chatModel.provider,  // Must be "providerId" not "provider"
      key: chatModel.model,            // Must be "key" not "model"
    },
    embeddingModel: {
      providerId: embeddingModel.provider,  // Must be "providerId" not "provider"
      key: embeddingModel.model,            // Must be "key" not "model"
    },
  };
  
  console.log('Perplexica request:', JSON.stringify(requestBody));
  
  const response = await tryPerplexicaRequest(perplexicaUrl, requestBody);
  
  try {
    console.log('Perplexica response status:', response.status);
    
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
      const searxngResult = await searchSearXNGDirect(query, searxngUrl);
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
async function searchSearXNGDirect(query: string, searxngUrl: string = DEFAULT_SEARXNG_URL) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    language: 'en',
  });
  
  const response = await fetch(`${searxngUrl}/search?${params}`, {
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

// Default Ollama URL - can be overridden
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

// Generate AI summary of search results using Ollama
async function generateSearchSummary(
  query: string,
  results: Array<{ title: string; url: string; snippet: string; source: string }>,
  ollamaUrl: string = DEFAULT_OLLAMA_URL
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
    
    const response = await fetch(`${ollamaUrl}/api/generate`, {
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

async function searchSearXNG(
  query: string, 
  categories?: string[], 
  generateSummary: boolean = true,
  searxngUrl: string = DEFAULT_SEARXNG_URL
) {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      language: 'en',
    });
    
    if (categories?.length) {
      params.set('categories', categories.join(','));
    }
    
    const response = await fetch(`${searxngUrl}/search?${params}`, {
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

