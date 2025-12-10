import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

// Get list of directories for folder browser
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || homedir();
  
  try {
    // Validate path exists
    if (!existsSync(path)) {
      return NextResponse.json(
        { error: 'Path does not exist', path },
        { status: 404 }
      );
    }
    
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Path is not a directory', path },
        { status: 400 }
      );
    }
    
    const items = await readdir(path);
    const entries: DirectoryEntry[] = [];
    
    for (const item of items) {
      // Skip hidden files/folders on Windows and Unix
      if (item.startsWith('.') || item.startsWith('$')) continue;
      
      try {
        const fullPath = join(path, item);
        const itemStats = await stat(fullPath);
        
        // Only include directories
        if (itemStats.isDirectory()) {
          entries.push({
            name: item,
            path: fullPath,
            type: 'directory',
          });
        }
      } catch {
        // Skip items we can't access
        continue;
      }
    }
    
    // Sort alphabetically
    entries.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({
      currentPath: path,
      parentPath: dirname(path),
      entries,
      canGoUp: path !== dirname(path), // Can't go up from root
    });
  } catch (error) {
    console.error('Error browsing directory:', error);
    return NextResponse.json(
      { error: 'Failed to browse directory' },
      { status: 500 }
    );
  }
}

// Validate a workspace path
export async function POST(request: Request) {
  try {
    const { path } = await request.json();
    
    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }
    
    // Check if path exists
    if (!existsSync(path)) {
      return NextResponse.json({
        valid: false,
        error: 'Path does not exist',
        path,
      });
    }
    
    // Check if it's a directory
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      return NextResponse.json({
        valid: false,
        error: 'Path is not a directory',
        path,
      });
    }
    
    // Count markdown files
    let markdownCount = 0;
    const countMarkdown = async (dir: string, depth = 0) => {
      if (depth > 3) return; // Don't go too deep
      
      try {
        const items = await readdir(dir);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules') continue;
          
          const fullPath = join(dir, item);
          try {
            const itemStats = await stat(fullPath);
            if (itemStats.isDirectory()) {
              await countMarkdown(fullPath, depth + 1);
            } else if (item.match(/\.(md|markdown|mdx|txt)$/i)) {
              markdownCount++;
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Ignore errors
      }
    };
    
    await countMarkdown(path);
    
    return NextResponse.json({
      valid: true,
      path,
      name: basename(path),
      markdownFiles: markdownCount,
    });
  } catch (error) {
    console.error('Error validating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to validate workspace' },
      { status: 500 }
    );
  }
}














