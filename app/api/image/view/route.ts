import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, isAbsolute } from 'path';
import { existsSync } from 'fs';

const DEFAULT_WORKSPACE_PATH = process.env.WORKSPACE_PATH || './documents';

/**
 * GET /api/image/view
 * Serve an image from the workspace
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path');
    const workspace = searchParams.get('workspace') || DEFAULT_WORKSPACE_PATH;

    if (!relativePath) {
      return NextResponse.json(
        { error: 'path parameter is required' },
        { status: 400 }
      );
    }

    // Security: prevent directory traversal
    if (relativePath.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    // Determine the full path
    let basePath: string;
    if (isAbsolute(workspace)) {
      basePath = workspace;
    } else {
      basePath = join(process.cwd(), workspace);
    }

    const filePath = join(basePath, relativePath);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Read the file
    const imageBuffer = await readFile(filePath);

    // Determine content type based on extension
    const ext = relativePath.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
    };

    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to serve image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}

