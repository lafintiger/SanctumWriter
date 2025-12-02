/**
 * Bibliography Formatter
 * Generates formatted citations in various academic styles
 */

import { Citation, Author, CitationFormat, BibliographyEntry, formatAuthorName } from '@/types/citation';

/**
 * Format authors for different citation styles
 */
function formatAuthors(authors: Author[], style: CitationFormat, maxAuthors: number = 7): string {
  if (!authors || authors.length === 0) return '';
  
  switch (style) {
    case 'apa':
      return formatAuthorsAPA(authors, maxAuthors);
    case 'mla':
      return formatAuthorsMLA(authors);
    case 'chicago':
      return formatAuthorsChicago(authors);
    case 'harvard':
      return formatAuthorsHarvard(authors, maxAuthors);
    case 'ieee':
      return formatAuthorsIEEE(authors);
    default:
      return authors.map(a => `${a.firstName} ${a.lastName}`).join(', ');
  }
}

function formatAuthorsAPA(authors: Author[], maxAuthors: number): string {
  if (authors.length === 1) {
    return formatAuthorName(authors[0], 'initials');
  }
  
  if (authors.length === 2) {
    return `${formatAuthorName(authors[0], 'initials')} & ${formatAuthorName(authors[1], 'initials')}`;
  }
  
  if (authors.length <= maxAuthors) {
    const allButLast = authors.slice(0, -1).map(a => formatAuthorName(a, 'initials')).join(', ');
    const last = formatAuthorName(authors[authors.length - 1], 'initials');
    return `${allButLast}, & ${last}`;
  }
  
  // More than max authors
  const first = authors.slice(0, maxAuthors - 1).map(a => formatAuthorName(a, 'initials')).join(', ');
  return `${first}, ... ${formatAuthorName(authors[authors.length - 1], 'initials')}`;
}

function formatAuthorsMLA(authors: Author[]): string {
  if (authors.length === 1) {
    return formatAuthorName(authors[0], 'lastFirst');
  }
  
  if (authors.length === 2) {
    return `${formatAuthorName(authors[0], 'lastFirst')}, and ${formatAuthorName(authors[1], 'firstLast')}`;
  }
  
  return `${formatAuthorName(authors[0], 'lastFirst')}, et al.`;
}

function formatAuthorsChicago(authors: Author[]): string {
  if (authors.length === 1) {
    return formatAuthorName(authors[0], 'lastFirst');
  }
  
  if (authors.length <= 3) {
    const allButLast = authors.slice(0, -1).map((a, i) => 
      i === 0 ? formatAuthorName(a, 'lastFirst') : formatAuthorName(a, 'firstLast')
    ).join(', ');
    return `${allButLast}, and ${formatAuthorName(authors[authors.length - 1], 'firstLast')}`;
  }
  
  return `${formatAuthorName(authors[0], 'lastFirst')}, et al.`;
}

function formatAuthorsHarvard(authors: Author[], maxAuthors: number): string {
  if (authors.length === 1) {
    return formatAuthorName(authors[0], 'lastFirst');
  }
  
  if (authors.length === 2) {
    return `${formatAuthorName(authors[0], 'lastFirst')} and ${formatAuthorName(authors[1], 'lastFirst')}`;
  }
  
  if (authors.length <= maxAuthors) {
    const allButLast = authors.slice(0, -1).map(a => formatAuthorName(a, 'lastFirst')).join(', ');
    return `${allButLast} and ${formatAuthorName(authors[authors.length - 1], 'lastFirst')}`;
  }
  
  return `${formatAuthorName(authors[0], 'lastFirst')} et al.`;
}

function formatAuthorsIEEE(authors: Author[]): string {
  if (authors.length === 1) {
    const a = authors[0];
    return `${a.firstName.charAt(0)}. ${a.middleName ? a.middleName.charAt(0) + '. ' : ''}${a.lastName}`;
  }
  
  if (authors.length <= 6) {
    const allButLast = authors.slice(0, -1).map(a => 
      `${a.firstName.charAt(0)}. ${a.middleName ? a.middleName.charAt(0) + '. ' : ''}${a.lastName}`
    ).join(', ');
    const last = authors[authors.length - 1];
    return `${allButLast}, and ${last.firstName.charAt(0)}. ${last.middleName ? last.middleName.charAt(0) + '. ' : ''}${last.lastName}`;
  }
  
  const first = authors[0];
  return `${first.firstName.charAt(0)}. ${first.middleName ? first.middleName.charAt(0) + '. ' : ''}${first.lastName} et al.`;
}

/**
 * Format a single citation in APA style
 */
function formatAPA(citation: Citation): string {
  const authors = formatAuthors(citation.authors, 'apa');
  const year = `(${citation.year}).`;
  const title = citation.title;
  
  switch (citation.type) {
    case 'article':
      const journal = citation.journal ? `*${citation.journal}*` : '';
      const volume = citation.volume ? `, *${citation.volume}*` : '';
      const issue = citation.issue ? `(${citation.issue})` : '';
      const pages = citation.pages ? `, ${citation.pages}` : '';
      const doi = citation.doi ? ` https://doi.org/${citation.doi}` : '';
      return `${authors} ${year} ${title}. ${journal}${volume}${issue}${pages}.${doi}`;
      
    case 'book':
      const edition = citation.edition ? ` (${citation.edition} ed.).` : '.';
      const publisher = citation.publisher || '';
      return `${authors} ${year} *${title}*${edition} ${publisher}.`;
      
    case 'chapter':
      const editors = citation.editors ? `In ${formatAuthors(citation.editors, 'apa')} (Eds.), ` : 'In ';
      const bookTitle = citation.bookTitle ? `*${citation.bookTitle}*` : '';
      const chapterPages = citation.pages ? ` (pp. ${citation.pages})` : '';
      const chapterPublisher = citation.publisher || '';
      return `${authors} ${year} ${title}. ${editors}${bookTitle}${chapterPages}. ${chapterPublisher}.`;
      
    case 'website':
      const accessDate = citation.accessDate ? ` Retrieved ${citation.accessDate}, from` : '';
      const url = citation.url || '';
      return `${authors} ${year} *${title}*.${accessDate} ${url}`;
      
    case 'conference':
      const conf = citation.conferenceTitle ? `*${citation.conferenceTitle}*` : '';
      return `${authors} ${year} ${title}. ${conf}.`;
      
    default:
      return `${authors} ${year} ${title}.`;
  }
}

/**
 * Format a single citation in MLA style
 */
function formatMLA(citation: Citation): string {
  const authors = formatAuthors(citation.authors, 'mla');
  const title = `"${citation.title}."`;
  
  switch (citation.type) {
    case 'article':
      const journal = citation.journal ? `*${citation.journal}*,` : '';
      const volIssue = citation.volume 
        ? `vol. ${citation.volume}${citation.issue ? `, no. ${citation.issue}` : ''},`
        : '';
      const year = `${citation.year},`;
      const pages = citation.pages ? `pp. ${citation.pages}.` : '';
      const doi = citation.doi ? ` doi:${citation.doi}.` : '';
      return `${authors}. ${title} ${journal} ${volIssue} ${year} ${pages}${doi}`;
      
    case 'book':
      const publisher = citation.publisher || '';
      const bookYear = citation.year;
      return `${authors}. *${citation.title}*. ${publisher}, ${bookYear}.`;
      
    case 'website':
      const siteName = citation.publisher || '';
      const webYear = citation.year;
      const url = citation.url || '';
      const access = citation.accessDate ? `Accessed ${citation.accessDate}.` : '';
      return `${authors}. ${title} *${siteName}*, ${webYear}, ${url}. ${access}`;
      
    default:
      return `${authors}. ${title} ${citation.year}.`;
  }
}

/**
 * Format a single citation in Chicago style
 */
function formatChicago(citation: Citation): string {
  const authors = formatAuthors(citation.authors, 'chicago');
  const title = `"${citation.title}."`;
  
  switch (citation.type) {
    case 'article':
      const journal = citation.journal ? `*${citation.journal}*` : '';
      const volume = citation.volume || '';
      const issue = citation.issue ? `, no. ${citation.issue}` : '';
      const year = `(${citation.year})`;
      const pages = citation.pages ? `: ${citation.pages}` : '';
      const doi = citation.doi ? ` https://doi.org/${citation.doi}.` : '.';
      return `${authors}. ${title} ${journal} ${volume}${issue} ${year}${pages}${doi}`;
      
    case 'book':
      const location = citation.publisherLocation || '';
      const publisher = citation.publisher || '';
      const bookYear = citation.year;
      return `${authors}. *${citation.title}*. ${location}: ${publisher}, ${bookYear}.`;
      
    default:
      return `${authors}. ${title} ${citation.year}.`;
  }
}

/**
 * Format a single citation in Harvard style
 */
function formatHarvard(citation: Citation): string {
  const authors = formatAuthors(citation.authors, 'harvard');
  const year = `(${citation.year})`;
  
  switch (citation.type) {
    case 'article':
      const journal = citation.journal ? `*${citation.journal}*` : '';
      const volume = citation.volume ? `, ${citation.volume}` : '';
      const issue = citation.issue ? `(${citation.issue})` : '';
      const pages = citation.pages ? `, pp. ${citation.pages}` : '';
      return `${authors} ${year} '${citation.title}', ${journal}${volume}${issue}${pages}.`;
      
    case 'book':
      const edition = citation.edition ? `, ${citation.edition} edn` : '';
      const publisher = citation.publisher || '';
      const location = citation.publisherLocation || '';
      return `${authors} ${year} *${citation.title}*${edition}, ${publisher}, ${location}.`;
      
    default:
      return `${authors} ${year} '${citation.title}'.`;
  }
}

/**
 * Format a single citation in IEEE style
 */
function formatIEEE(citation: Citation, number: number): string {
  const authors = formatAuthors(citation.authors, 'ieee');
  
  switch (citation.type) {
    case 'article':
      const journal = citation.journal ? `*${citation.journal}*` : '';
      const volume = citation.volume ? `, vol. ${citation.volume}` : '';
      const issue = citation.issue ? `, no. ${citation.issue}` : '';
      const pages = citation.pages ? `, pp. ${citation.pages}` : '';
      const month = '';  // Would need month field
      const year = citation.year;
      return `[${number}] ${authors}, "${citation.title}," ${journal}${volume}${issue}${pages}, ${month}${year}.`;
      
    case 'book':
      const publisher = citation.publisher || '';
      const location = citation.publisherLocation || '';
      const bookYear = citation.year;
      return `[${number}] ${authors}, *${citation.title}*. ${location}: ${publisher}, ${bookYear}.`;
      
    case 'conference':
      const conf = citation.conferenceTitle ? `in *${citation.conferenceTitle}*` : '';
      const confYear = citation.year;
      return `[${number}] ${authors}, "${citation.title}," ${conf}, ${confYear}.`;
      
    default:
      return `[${number}] ${authors}, "${citation.title}," ${citation.year}.`;
  }
}

/**
 * Format citation with number prefix
 */
function formatNumeric(citation: Citation, number: number): string {
  const authors = formatAuthors(citation.authors, 'apa');
  const year = `(${citation.year}).`;
  return `[${number}] ${authors} ${year} ${citation.title}.`;
}

/**
 * Format a citation in the specified style
 */
export function formatCitation(citation: Citation, style: CitationFormat, number?: number): string {
  switch (style) {
    case 'apa':
      return formatAPA(citation);
    case 'mla':
      return formatMLA(citation);
    case 'chicago':
      return formatChicago(citation);
    case 'harvard':
      return formatHarvard(citation);
    case 'ieee':
      return formatIEEE(citation, number || 1);
    case 'numeric':
      return formatNumeric(citation, number || 1);
    default:
      return formatAPA(citation);
  }
}

/**
 * Format an in-text citation
 */
export function formatInTextCitation(
  citation: Citation,
  style: CitationFormat,
  options: { page?: string; number?: number; suppressAuthor?: boolean } = {}
): string {
  const { page, number, suppressAuthor } = options;
  const firstAuthor = citation.authors[0];
  const lastName = firstAuthor?.lastName || 'Unknown';
  const year = citation.year;
  
  let result: string;
  
  switch (style) {
    case 'apa':
    case 'harvard':
      if (suppressAuthor) {
        result = `(${year}${page ? `, p. ${page}` : ''})`;
      } else if (citation.authors.length === 1) {
        result = `(${lastName}, ${year}${page ? `, p. ${page}` : ''})`;
      } else if (citation.authors.length === 2) {
        result = `(${lastName} & ${citation.authors[1].lastName}, ${year}${page ? `, p. ${page}` : ''})`;
      } else {
        result = `(${lastName} et al., ${year}${page ? `, p. ${page}` : ''})`;
      }
      break;
      
    case 'mla':
      if (suppressAuthor) {
        result = `(${page || ''})`;
      } else if (citation.authors.length <= 2) {
        const names = citation.authors.map(a => a.lastName).join(' and ');
        result = `(${names}${page ? ` ${page}` : ''})`;
      } else {
        result = `(${lastName} et al.${page ? ` ${page}` : ''})`;
      }
      break;
      
    case 'chicago':
      if (suppressAuthor) {
        result = `(${year}${page ? `, ${page}` : ''})`;
      } else {
        result = `(${lastName} ${year}${page ? `, ${page}` : ''})`;
      }
      break;
      
    case 'ieee':
    case 'numeric':
      result = `[${number || '?'}${page ? `, p. ${page}` : ''}]`;
      break;
      
    default:
      result = `(${lastName}, ${year})`;
  }
  
  return result;
}

/**
 * Generate a full bibliography from citations
 */
export function generateBibliography(
  citations: Citation[],
  style: CitationFormat,
  orderOfAppearance?: string[]
): BibliographyEntry[] {
  // Sort citations based on style
  let sortedCitations: Citation[];
  let numberMap: Map<string, number>;
  
  if (style === 'ieee' || style === 'numeric') {
    // Order by appearance in document
    if (orderOfAppearance && orderOfAppearance.length > 0) {
      const orderMap = new Map(orderOfAppearance.map((key, i) => [key, i]));
      sortedCitations = [...citations].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
    } else {
      sortedCitations = citations;
    }
    numberMap = new Map(sortedCitations.map((c, i) => [c.id, i + 1]));
  } else {
    // Alphabetical by author
    sortedCitations = [...citations].sort((a, b) => {
      const authorA = a.authors[0]?.lastName || '';
      const authorB = b.authors[0]?.lastName || '';
      if (authorA !== authorB) return authorA.localeCompare(authorB);
      return (a.year || 0) < (b.year || 0) ? -1 : 1;
    });
    numberMap = new Map(sortedCitations.map((c, i) => [c.id, i + 1]));
  }
  
  return sortedCitations.map((citation, index) => ({
    citation,
    number: numberMap.get(citation.id) || index + 1,
    formatted: {
      apa: formatCitation(citation, 'apa'),
      mla: formatCitation(citation, 'mla'),
      chicago: formatCitation(citation, 'chicago'),
      harvard: formatCitation(citation, 'harvard'),
      ieee: formatCitation(citation, 'ieee', numberMap.get(citation.id)),
      numeric: formatCitation(citation, 'numeric', numberMap.get(citation.id)),
    },
  }));
}

/**
 * Generate bibliography as markdown
 */
export function generateBibliographyMarkdown(
  citations: Citation[],
  style: CitationFormat,
  orderOfAppearance?: string[],
  title: string = 'References'
): string {
  const entries = generateBibliography(citations, style, orderOfAppearance);
  
  let markdown = `## ${title}\n\n`;
  
  for (const entry of entries) {
    markdown += `${entry.formatted[style]}\n\n`;
  }
  
  return markdown;
}





