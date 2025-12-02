/**
 * Document Chunker
 * Splits documents into semantic chunks for embedding
 */

export interface Chunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    startLine?: number;
    endLine?: number;
    heading?: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface ChunkingOptions {
  maxChunkSize: number;      // Max characters per chunk
  chunkOverlap: number;      // Overlap between chunks
  respectHeadings: boolean;  // Try to keep headings with their content
  respectParagraphs: boolean; // Try not to split paragraphs
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkSize: 1000,
  chunkOverlap: 100,
  respectHeadings: true,
  respectParagraphs: true,
};

/**
 * Generate a unique chunk ID
 */
function generateChunkId(source: string, index: number): string {
  const hash = source.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `chunk_${Math.abs(hash).toString(36)}_${index}`;
}

/**
 * Extract headings from markdown text
 */
function extractHeadings(text: string): Array<{ level: number; text: string; position: number }> {
  const headings: Array<{ level: number; text: string; position: number }> = [];
  const lines = text.split('\n');
  let position = 0;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        position,
      });
    }
    position += line.length + 1;
  }

  return headings;
}

/**
 * Find the current heading for a position in the document
 */
function findCurrentHeading(
  position: number,
  headings: Array<{ level: number; text: string; position: number }>
): string | undefined {
  let currentHeading: string | undefined;
  
  for (const heading of headings) {
    if (heading.position <= position) {
      currentHeading = heading.text;
    } else {
      break;
    }
  }
  
  return currentHeading;
}

/**
 * Split text by paragraphs
 */
function splitByParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
}

/**
 * Chunk a markdown document intelligently
 */
export function chunkMarkdown(
  content: string,
  source: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];
  const headings = opts.respectHeadings ? extractHeadings(content) : [];
  
  // Split into paragraphs first
  const paragraphs = opts.respectParagraphs ? splitByParagraphs(content) : [content];
  
  let currentChunk = '';
  let currentPosition = 0;
  let chunkStartPosition = 0;

  const flushChunk = () => {
    if (currentChunk.trim().length > 0) {
      const heading = findCurrentHeading(chunkStartPosition, headings);
      chunks.push({
        id: generateChunkId(source, chunks.length),
        content: currentChunk.trim(),
        metadata: {
          source,
          heading,
          chunkIndex: chunks.length,
          totalChunks: 0, // Will be updated later
        },
      });
    }
    
    // Keep overlap from current chunk
    if (opts.chunkOverlap > 0 && currentChunk.length > opts.chunkOverlap) {
      currentChunk = currentChunk.slice(-opts.chunkOverlap);
    } else {
      currentChunk = '';
    }
    chunkStartPosition = currentPosition;
  };

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max size, flush first
    if (currentChunk.length + paragraph.length > opts.maxChunkSize && currentChunk.length > 0) {
      flushChunk();
    }

    // If the paragraph itself is too large, split it
    if (paragraph.length > opts.maxChunkSize) {
      // Flush what we have
      if (currentChunk.length > 0) {
        flushChunk();
      }

      // Split large paragraph by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > opts.maxChunkSize && currentChunk.length > 0) {
          flushChunk();
        }
        currentChunk += sentence;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }

    currentPosition += paragraph.length + 2; // +2 for paragraph separator
  }

  // Flush remaining content
  flushChunk();

  // Update total chunks count
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length;
  }

  return chunks;
}

/**
 * Chunk plain text (non-markdown)
 */
export function chunkPlainText(
  content: string,
  source: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options, respectHeadings: false };
  return chunkMarkdown(content, source, opts);
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Get optimal chunk size based on model context
 */
export function getOptimalChunkSize(contextLength: number): number {
  // Aim for chunks that use about 10-15% of context
  // This allows multiple chunks + conversation in context
  return Math.min(Math.floor(contextLength * 0.1 * 4), 2000); // Convert tokens to chars
}





