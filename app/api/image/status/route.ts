import { NextResponse } from 'next/server';

const DEFAULT_COMFYUI_URL = 'http://127.0.0.1:8188';

/**
 * GET /api/image/status
 * Check the status of a generation and get results
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get('promptId');
    const comfyuiUrl = searchParams.get('comfyuiUrl') || DEFAULT_COMFYUI_URL;

    if (!promptId) {
      return NextResponse.json(
        { error: 'promptId is required' },
        { status: 400 }
      );
    }

    // Check history for completion
    const historyResponse = await fetch(`${comfyuiUrl}/history/${promptId}`);
    
    if (!historyResponse.ok) {
      // Not found in history - might still be processing
      // Check queue status
      const queueResponse = await fetch(`${comfyuiUrl}/queue`);
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        
        // Check if in running queue
        const running = queueData.queue_running || [];
        const pending = queueData.queue_pending || [];
        
        const isRunning = running.some((item: unknown[]) => item[1] === promptId);
        const isPending = pending.some((item: unknown[]) => item[1] === promptId);
        
        if (isRunning) {
          return NextResponse.json({
            status: 'running',
            completed: false,
            position: 0,
          });
        }
        
        if (isPending) {
          const position = pending.findIndex((item: unknown[]) => item[1] === promptId);
          return NextResponse.json({
            status: 'pending',
            completed: false,
            position: position + 1,
          });
        }
      }
      
      return NextResponse.json({
        status: 'unknown',
        completed: false,
      });
    }

    const historyData = await historyResponse.json();
    const promptHistory = historyData[promptId];

    if (!promptHistory) {
      return NextResponse.json({
        status: 'processing',
        completed: false,
      });
    }

    // Check if completed
    const status = promptHistory.status;
    const outputs = promptHistory.outputs;

    if (status?.completed) {
      // Find the SaveImage output (node 9 in our workflow)
      const images: Array<{ filename: string; subfolder: string; type: string }> = [];
      
      for (const nodeId in outputs) {
        const nodeOutput = outputs[nodeId];
        if (nodeOutput.images) {
          images.push(...nodeOutput.images);
        }
      }

      // Generate image URLs
      const imageUrls = images.map(img => ({
        filename: img.filename,
        url: `${comfyuiUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`,
      }));

      return NextResponse.json({
        status: 'completed',
        completed: true,
        images: imageUrls,
      });
    }

    // Check for errors
    if (status?.status_str === 'error') {
      return NextResponse.json({
        status: 'error',
        completed: false,
        error: 'Generation failed',
        messages: status.messages,
      });
    }

    return NextResponse.json({
      status: 'processing',
      completed: false,
    });
  } catch (error) {
    console.error('Failed to check status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/image/status
 * Check ComfyUI connection
 */
export async function POST(request: Request) {
  try {
    const { comfyuiUrl = DEFAULT_COMFYUI_URL } = await request.json();

    const response = await fetch(`${comfyuiUrl}/system_stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        connected: false,
        error: 'ComfyUI not responding',
      });
    }

    const stats = await response.json();

    return NextResponse.json({
      connected: true,
      stats,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    });
  }
}

