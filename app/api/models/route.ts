import { NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'ollama';

  try {
    if (provider === 'ollama') {
      const response = await fetch(`${OLLAMA_URL}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Ollama not available', models: [] },
          { status: 503 }
        );
      }

      const data = await response.json();
      const models = (data.models || []).map((m: { name: string; size: number; modified_at: string }) => ({
        id: m.name,
        name: m.name,
        size: m.size,
        modified: m.modified_at,
        provider: 'ollama',
      }));

      return NextResponse.json({ models, provider: 'ollama', available: true });
    } else {
      const response = await fetch(`${LMSTUDIO_URL}/v1/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'LM Studio not available', models: [] },
          { status: 503 }
        );
      }

      const data = await response.json();
      const models = (data.data || []).map((m: { id: string }) => ({
        id: m.id,
        name: m.id,
        provider: 'lmstudio',
      }));

      return NextResponse.json({ models, provider: 'lmstudio', available: true });
    }
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: `${provider} not available`, models: [], available: false },
      { status: 503 }
    );
  }
}














