// Document export utilities
// Export to PDF and DOCX formats

import { marked } from 'marked';

export interface ExportOptions {
  title: string;
  author?: string;
  includeTitle?: boolean;
  includeTableOfContents?: boolean;
  pageSize?: 'A4' | 'Letter';
  margin?: number;
}

// Generate table of contents from markdown headings
function generateTableOfContents(markdown: string): string {
  const lines = markdown.split('\n');
  const tocItems: { level: number; text: string; slug: string }[] = [];
  
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      tocItems.push({ level, text, slug });
    }
  }
  
  if (tocItems.length === 0) return '';
  
  let tocHtml = '<div class="table-of-contents"><h2>Table of Contents</h2><ul>';
  
  for (const item of tocItems) {
    const indent = '  '.repeat(item.level - 1);
    tocHtml += `${indent}<li style="margin-left: ${(item.level - 1) * 1.5}em"><a href="#${item.slug}">${item.text}</a></li>\n`;
  }
  
  tocHtml += '</ul></div><hr>';
  return tocHtml;
}

// Convert markdown to HTML for export
export function markdownToHtml(markdown: string): string {
  // Configure marked for clean output
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  
  return marked.parse(markdown) as string;
}

// Export as HTML (basic export, works everywhere)
export function exportAsHtml(content: string, options: ExportOptions): void {
  const html = markdownToHtml(content);
  
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    p { margin: 1em 0; }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
    }
    code {
      background: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f5f5f5;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    ul, ol { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.5em 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5em;
      text-align: left;
    }
    th { background: #f5f5f5; }
    img { max-width: 100%; height: auto; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
    @media print {
      body { max-width: none; margin: 0; padding: 1cm; }
    }
  </style>
</head>
<body>
  ${options.includeTitle !== false ? `<h1>${options.title}</h1>` : ''}
  ${options.author ? `<p><em>By ${options.author}</em></p>` : ''}
  ${html}
</body>
</html>`;

  downloadFile(fullHtml, `${sanitizeFilename(options.title)}.html`, 'text/html');
}

// Export as PDF using browser print
export function exportAsPdf(content: string, options: ExportOptions): void {
  const html = markdownToHtml(content);
  const toc = options.includeTableOfContents ? generateTableOfContents(content) : '';
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }
  
  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${options.title}</title>
  <style>
    @page {
      size: ${options.pageSize || 'A4'};
      margin: ${options.margin || 2}cm;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      line-height: 1.6;
      color: #000;
      font-size: 12pt;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    h1 { font-size: 24pt; }
    h2 { font-size: 18pt; }
    h3 { font-size: 14pt; }
    p { margin: 1em 0; orphans: 3; widows: 3; }
    blockquote {
      border-left: 3pt solid #999;
      margin: 1em 0;
      padding-left: 1em;
      color: #333;
    }
    code {
      background: #f0f0f0;
      padding: 0.15em 0.3em;
      border-radius: 2pt;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 10pt;
    }
    pre {
      background: #f0f0f0;
      padding: 1em;
      border-radius: 3pt;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    pre code { background: none; padding: 0; }
    ul, ol { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.3em 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1pt solid #999;
      padding: 0.5em;
      text-align: left;
    }
    th { background: #f0f0f0; }
    img { max-width: 100%; height: auto; }
    hr { border: none; border-top: 1pt solid #999; margin: 2em 0; }
    .title-page { text-align: center; padding-top: 30%; page-break-after: always; }
    .title-page h1 { border: none; }
    .table-of-contents { page-break-after: always; }
    .table-of-contents h2 { font-size: 18pt; margin-bottom: 1em; }
    .table-of-contents ul { list-style: none; padding-left: 0; }
    .table-of-contents li { margin: 0.5em 0; }
    .table-of-contents a { text-decoration: none; color: #333; }
    .table-of-contents a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${options.includeTitle !== false ? `
  <div class="title-page">
    <h1>${options.title}</h1>
    ${options.author ? `<p><em>By ${options.author}</em></p>` : ''}
  </div>
  ` : ''}
  ${toc}
  ${html}
</body>
</html>`);
  
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

// Export as plain text
export function exportAsText(content: string, options: ExportOptions): void {
  const text = options.includeTitle !== false 
    ? `${options.title}\n${'='.repeat(options.title.length)}\n${options.author ? `By ${options.author}\n` : ''}\n${content}`
    : content;
  
  downloadFile(text, `${sanitizeFilename(options.title)}.txt`, 'text/plain');
}

// Export as Markdown (preserves original format)
export function exportAsMarkdown(content: string, options: ExportOptions): void {
  const text = options.includeTitle !== false
    ? `# ${options.title}\n${options.author ? `*By ${options.author}*\n` : ''}\n---\n\n${content}`
    : content;
  
  downloadFile(text, `${sanitizeFilename(options.title)}.md`, 'text/markdown');
}

// Export as DOCX using a simple approach
export async function exportAsDocx(content: string, options: ExportOptions): Promise<void> {
  // For DOCX, we'll create a simple Word-compatible HTML file
  // that Word can open and convert
  const html = markdownToHtml(content);
  
  const docContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>${options.title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
    }
    h1 { font-size: 16pt; font-weight: bold; }
    h2 { font-size: 14pt; font-weight: bold; }
    h3 { font-size: 12pt; font-weight: bold; }
    p { margin: 0 0 10pt 0; }
    ul, ol { margin: 0 0 10pt 0; }
    blockquote { margin-left: 0.5in; font-style: italic; }
    code { font-family: 'Consolas', monospace; background: #f0f0f0; }
    pre { font-family: 'Consolas', monospace; background: #f0f0f0; padding: 10pt; }
  </style>
</head>
<body>
  ${options.includeTitle !== false ? `<h1>${options.title}</h1>` : ''}
  ${options.author ? `<p><em>By ${options.author}</em></p>` : ''}
  ${html}
</body>
</html>`;

  // Download as .doc (Word will open HTML as DOC)
  downloadFile(docContent, `${sanitizeFilename(options.title)}.doc`, 'application/msword');
}

// Helper to download a file
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Sanitize filename
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

// All export formats
export type ExportFormat = 'pdf' | 'docx' | 'html' | 'txt' | 'md';

export const EXPORT_FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'pdf', label: 'PDF', description: 'Print-ready document' },
  { value: 'docx', label: 'Word (.doc)', description: 'Microsoft Word compatible' },
  { value: 'html', label: 'HTML', description: 'Web page format' },
  { value: 'txt', label: 'Plain Text', description: 'Simple text file' },
  { value: 'md', label: 'Markdown', description: 'Keep original format' },
];

export async function exportDocument(
  content: string, 
  format: ExportFormat, 
  options: ExportOptions
): Promise<void> {
  switch (format) {
    case 'pdf':
      exportAsPdf(content, options);
      break;
    case 'docx':
      await exportAsDocx(content, options);
      break;
    case 'html':
      exportAsHtml(content, options);
      break;
    case 'txt':
      exportAsText(content, options);
      break;
    case 'md':
      exportAsMarkdown(content, options);
      break;
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

