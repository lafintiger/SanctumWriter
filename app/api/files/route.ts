import { NextResponse } from 'next/server';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, relative, isAbsolute } from 'path';
import { existsSync } from 'fs';

const DEFAULT_WORKSPACE_PATH = process.env.WORKSPACE_PATH || './documents';

function getWorkspacePath(customPath?: string): string {
  if (customPath) {
    // If it's an absolute path, use it directly
    if (isAbsolute(customPath)) {
      return customPath;
    }
    // Otherwise, resolve relative to cwd
    return join(process.cwd(), customPath);
  }
  return join(process.cwd(), DEFAULT_WORKSPACE_PATH);
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

async function getFileTree(dirPath: string, basePath: string): Promise<FileNode[]> {
  const items = await readdir(dirPath);
  const nodes: FileNode[] = [];

  for (const item of items) {
    // Skip hidden files and common non-document files
    if (item.startsWith('.') || item === 'node_modules') continue;

    const fullPath = join(dirPath, item);
    const relativePath = relative(basePath, fullPath);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      const children = await getFileTree(fullPath, basePath);
      nodes.push({
        name: item,
        path: relativePath.replace(/\\/g, '/'),
        type: 'directory',
        children,
      });
    } else {
      // Only include markdown and text files
      const ext = item.split('.').pop()?.toLowerCase();
      if (['md', 'markdown', 'mdx', 'txt'].includes(ext || '')) {
        nodes.push({
          name: item,
          path: relativePath.replace(/\\/g, '/'),
          type: 'file',
        });
      }
    }
  }

  // Sort: directories first, then files, alphabetically
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customWorkspace = searchParams.get('workspace');
    const workspacePath = getWorkspacePath(customWorkspace || undefined);
    
    // Create workspace directory if it doesn't exist
    if (!existsSync(workspacePath)) {
      await mkdir(workspacePath, { recursive: true });
    }

    const files = await getFileTree(workspacePath, workspacePath);
    
    return NextResponse.json({ files, workspacePath });
  } catch (error) {
    console.error('Error reading files:', error);
    return NextResponse.json(
      { error: 'Failed to read files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, parentPath, workspace, type = 'file' } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const workspacePath = getWorkspacePath(workspace);
    const targetPath = parentPath 
      ? join(workspacePath, parentPath, name)
      : join(workspacePath, name);

    // Check if already exists
    if (existsSync(targetPath)) {
      return NextResponse.json(
        { error: `${type === 'folder' ? 'Folder' : 'File'} already exists` },
        { status: 409 }
      );
    }

    const relativePath = relative(workspacePath, targetPath).replace(/\\/g, '/');

    if (type === 'folder') {
      // Create folder
      await mkdir(targetPath, { recursive: true });
      
      return NextResponse.json({
        success: true,
        path: relativePath,
        name,
        type: 'folder',
      });
    } else {
      // Create file with default content
      const { writeFile } = await import('fs/promises');
      const defaultContent = `# ${name.replace(/\.(md|markdown|mdx)$/i, '')}\n\nStart writing here...\n`;
      await writeFile(targetPath, defaultContent, 'utf-8');
      
      return NextResponse.json({
        success: true,
        path: relativePath,
        name,
        content: defaultContent,
        type: 'file',
      });
    }
  } catch (error) {
    console.error('Error creating:', error);
    return NextResponse.json(
      { error: 'Failed to create' },
      { status: 500 }
    );
  }
}

