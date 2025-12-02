/**
 * Citation Types
 * Defines the structure for citations and bibliography management
 */

export type CitationType = 
  | 'article'      // Journal article
  | 'book'         // Book
  | 'chapter'      // Book chapter
  | 'conference'   // Conference paper
  | 'website'      // Web page
  | 'report'       // Technical report
  | 'thesis'       // Thesis/dissertation
  | 'video'        // Video/documentary
  | 'podcast'      // Podcast episode
  | 'other';       // Other/misc

export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee' | 'numeric';

export interface Author {
  firstName: string;
  lastName: string;
  middleName?: string;
}

export interface Citation {
  // Core fields
  id: string;           // Unique key like "smith2024"
  type: CitationType;
  
  // Common fields
  authors: Author[];
  title: string;
  year: number | string;
  
  // Publication details
  journal?: string;         // For articles
  volume?: string;
  issue?: string;
  pages?: string;           // e.g., "123-145"
  
  // Book details
  publisher?: string;
  publisherLocation?: string;
  edition?: string;
  editors?: Author[];
  bookTitle?: string;       // For chapters
  
  // Digital
  url?: string;
  doi?: string;
  accessDate?: string;      // For websites
  
  // Other
  institution?: string;     // For reports/theses
  conferenceTitle?: string; // For conference papers
  
  // Metadata
  abstract?: string;
  keywords?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InTextCitation {
  key: string;              // The citation key like "smith2024"
  prefix?: string;          // Text before, e.g., "see"
  suffix?: string;          // Text after, e.g., ", p. 45"
  page?: string;            // Specific page
  suppressAuthor?: boolean; // Only show year
}

export interface CitationMatch {
  fullMatch: string;        // The full matched text like "[@smith2024, p. 45]"
  key: string;              // Just the key
  page?: string;            // Page if specified
  position: {
    start: number;
    end: number;
  };
}

export interface BibliographyEntry {
  citation: Citation;
  number: number;           // Assigned number based on order of appearance
  formatted: {
    apa: string;
    mla: string;
    chicago: string;
    harvard: string;
    ieee: string;
    numeric: string;
  };
}

export interface CitationDocument {
  documentPath: string;
  citations: Record<string, Citation>;  // key -> Citation
  defaultFormat: CitationFormat;
}

// Helper to generate citation key
export function generateCitationKey(author: Author, year: number | string): string {
  const lastName = author.lastName.toLowerCase().replace(/[^a-z]/g, '');
  return `${lastName}${year}`;
}

// Helper to format author name
export function formatAuthorName(author: Author, format: 'full' | 'lastFirst' | 'firstLast' | 'initials'): string {
  switch (format) {
    case 'full':
      return `${author.firstName}${author.middleName ? ' ' + author.middleName : ''} ${author.lastName}`;
    case 'lastFirst':
      return `${author.lastName}, ${author.firstName}${author.middleName ? ' ' + author.middleName.charAt(0) + '.' : ''}`;
    case 'firstLast':
      return `${author.firstName} ${author.lastName}`;
    case 'initials':
      return `${author.lastName}, ${author.firstName.charAt(0)}.${author.middleName ? ' ' + author.middleName.charAt(0) + '.' : ''}`;
    default:
      return `${author.firstName} ${author.lastName}`;
  }
}

// Default empty citation
export const DEFAULT_CITATION: Omit<Citation, 'id' | 'createdAt' | 'updatedAt'> = {
  type: 'article',
  authors: [{ firstName: '', lastName: '' }],
  title: '',
  year: new Date().getFullYear(),
};





