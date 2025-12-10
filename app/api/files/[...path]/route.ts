import { NextResponse } from 'next/server';
import { readFile, writeFile, unlink, rename } from 'fs/promises';
import { join, dirname, basename, isAbsolute } from 'path';
import { existsSync } from 'fs';

const DEFAULT_WORKSPACE_PATH = process.env.WORKSPACE_PATH || './documents';

function getWorkspacePath(customPath?: string): string {
  if (customPath) {
    if (isAbsolute(customPath)) {
      return customPath;
    }
    return join(process.cwd(), customPath);
  }
  return join(process.cwd(), DEFAULT_WORKSPACE_PATH);
}

function getFullPath(pathSegments: string[], workspace?: string): string {
  const relativePath = pathSegments.join('/');
  return join(getWorkspacePath(workspace), relativePath);
}

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || undefined;
    const filePath = getFullPath(params.path, workspace);
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const content = await readFile(filePath, 'utf-8');
    const path = params.path.join('/');
    
    return NextResponse.json({
      content,
      path,
      name: basename(filePath),
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const { content, workspace } = await request.json();
    const filePath = getFullPath(params.path, workspace);
    
    // Ensure the directory exists
    const { mkdir } = await import('fs/promises');
    await mkdir(dirname(filePath), { recursive: true });
    
    await writeFile(filePath, content, 'utf-8');
    
    return NextResponse.json({
      success: true,
      path: params.path.join('/'),
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || undefined;
    const filePath = getFullPath(params.path, workspace);
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    await unlink(filePath);
    
    return NextResponse.json({
      success: true,
      path: params.path.join('/'),
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const { newName, destinationPath, workspace } = await request.json();
    const oldPath = getFullPath(params.path, workspace);
    
    if (!existsSync(oldPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    let newPath: string;
    let newRelativePath: string[];

    // If destinationPath is provided, this is a move operation
    if (destinationPath !== undefined) {
      const { mkdir } = await import('fs/promises');
      const fileName = basename(oldPath);
      
      // destinationPath is relative to workspace - empty string means root
      const destDir = destinationPath 
        ? join(getWorkspacePath(workspace), destinationPath)
        : getWorkspacePath(workspace);
      
      // Ensure destination directory exists
      await mkdir(destDir, { recursive: true });
      
      newPath = join(destDir, fileName);
      newRelativePath = destinationPath 
        ? [...destinationPath.split('/').filter(Boolean), fileName]
        : [fileName];
      
      // Check if source and destination are the same
      if (oldPath === newPath) {
        return NextResponse.json({
          success: true,
          oldPath: params.path.join('/'),
          newPath: newRelativePath.join('/'),
          message: 'File is already in this location'
        });
      }
    } else if (newName) {
      // This is a rename operation (existing behavior)
      newPath = join(dirname(oldPath), newName);
      const pathParts = [...params.path];
      pathParts[pathParts.length - 1] = newName;
      newRelativePath = pathParts;
    } else {
      return NextResponse.json(
        { error: 'Must provide either newName or destinationPath' },
        { status: 400 }
      );
    }
    
    if (existsSync(newPath)) {
      return NextResponse.json(
        { error: 'A file with that name already exists in the destination' },
        { status: 409 }
      );
    }

    await rename(oldPath, newPath);
    
    return NextResponse.json({
      success: true,
      oldPath: params.path.join('/'),
      newPath: newRelativePath.join('/'),
    });
  } catch (error) {
    console.error('Error moving/renaming file:', error);
    return NextResponse.json(
      { error: 'Failed to move/rename file' },
      { status: 500 }
    );
  }
}

