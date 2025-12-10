/**
 * Project Types
 * Defines the structure for multi-document projects
 */

export type ProjectType = 'book' | 'thesis' | 'article-series' | 'documentation' | 'research' | 'custom';

export interface ProjectDocument {
  path: string;           // Relative path within project folder
  title?: string;         // Optional display title
  order: number;          // Sort order
  wordCount?: number;     // Cached word count
  type?: 'chapter' | 'appendix' | 'frontmatter' | 'backmatter';
}

export interface ProjectConfig {
  title: string;
  type: ProjectType;
  order: string[];              // Ordered list of document filenames
  citationFormat?: string;      // Default citation format
  wordGoal?: number;            // Target word count
  author?: string;
  date?: string;
  version?: string;
  description?: string;
  sharedCitations?: boolean;    // Use folder-level citations
}

export interface Project {
  // Core
  folderPath: string;           // Path to project folder
  indexPath: string;            // Path to index.md
  config: ProjectConfig;
  
  // Documents
  documents: ProjectDocument[];
  
  // Stats
  totalWordCount: number;
  documentCount: number;
  
  // State
  isLoaded: boolean;
  lastUpdated: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const yamlContent = match[1];
  const body = match[2];
  
  // Simple YAML parser for our use case
  const frontmatter: Record<string, any> = {};
  const lines = yamlContent.split('\n');
  let currentKey = '';
  let currentArray: string[] | null = null;
  
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Check for array item
    if (line.match(/^\s+-\s+/)) {
      const value = line.replace(/^\s+-\s+/, '').trim();
      if (currentArray !== null) {
        currentArray.push(value);
      }
      continue;
    }
    
    // Check for key: value
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      // Save previous array if exists
      if (currentArray !== null && currentKey) {
        frontmatter[currentKey] = currentArray;
        currentArray = null;
      }
      
      currentKey = keyMatch[1];
      const value = keyMatch[2].trim();
      
      if (value === '') {
        // This might be an array
        currentArray = [];
      } else {
        // Simple value
        frontmatter[currentKey] = parseValue(value);
      }
    }
  }
  
  // Save last array if exists
  if (currentArray !== null && currentKey) {
    frontmatter[currentKey] = currentArray;
  }
  
  return { frontmatter, body };
}

/**
 * Parse a YAML value
 */
function parseValue(value: string): string | number | boolean {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Number
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;
  
  // String (remove quotes if present)
  return value.replace(/^["']|["']$/g, '');
}

/**
 * Check if frontmatter indicates a project
 */
export function isProjectConfig(frontmatter: Record<string, any>): boolean {
  return frontmatter.type === 'project' && Array.isArray(frontmatter.order);
}

/**
 * Extract project config from frontmatter
 */
export function extractProjectConfig(frontmatter: Record<string, any>): ProjectConfig | null {
  if (!isProjectConfig(frontmatter)) {
    return null;
  }
  
  return {
    title: frontmatter.title || 'Untitled Project',
    type: frontmatter.project_type || 'custom',
    order: frontmatter.order || [],
    citationFormat: frontmatter.citation_format,
    wordGoal: frontmatter.word_goal,
    author: frontmatter.author,
    date: frontmatter.date,
    version: frontmatter.version,
    description: frontmatter.description,
    sharedCitations: frontmatter.shared_citations !== false, // Default true
  };
}

/**
 * Generate frontmatter string from config
 */
export function generateFrontmatter(config: ProjectConfig): string {
  let yaml = '---\n';
  yaml += `title: ${config.title}\n`;
  yaml += `type: project\n`;
  if (config.type !== 'custom') {
    yaml += `project_type: ${config.type}\n`;
  }
  if (config.author) {
    yaml += `author: ${config.author}\n`;
  }
  if (config.wordGoal) {
    yaml += `word_goal: ${config.wordGoal}\n`;
  }
  if (config.citationFormat) {
    yaml += `citation_format: ${config.citationFormat}\n`;
  }
  yaml += `order:\n`;
  for (const doc of config.order) {
    yaml += `  - ${doc}\n`;
  }
  yaml += '---\n';
  return yaml;
}

/**
 * Parse wikilinks from content
 */
export function parseWikilinks(content: string): Array<{ match: string; target: string; alias?: string }> {
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const links: Array<{ match: string; target: string; alias?: string }> = [];
  let match;
  
  while ((match = wikilinkRegex.exec(content)) !== null) {
    links.push({
      match: match[0],
      target: match[1],
      alias: match[2],
    });
  }
  
  return links;
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '')        // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text
    .replace(/[#*_~`]/g, '')        // Remove markdown chars
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}














