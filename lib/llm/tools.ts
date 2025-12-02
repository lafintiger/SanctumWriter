import { ToolDefinition } from '@/types';

// Web search tool - allows AI to search the web for information
export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web for current information, facts, statistics, or research to help with writing. Use this when you need up-to-date information, need to verify facts, or when the user asks about current events or topics you\'re unsure about.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant information',
      },
      reason: {
        type: 'string',
        description: 'Brief explanation of why this search is needed',
      },
    },
    required: ['query'],
  },
};

export const documentTools: ToolDefinition[] = [
  {
    name: 'replace_selection',
    description: 'Replace the currently selected text in the document with new text. Use this when the user wants to rewrite, improve, or change selected content.',
    parameters: {
      type: 'object',
      properties: {
        new_text: {
          type: 'string',
          description: 'The new text to replace the selection with',
        },
      },
      required: ['new_text'],
    },
  },
  {
    name: 'insert_at_cursor',
    description: 'Insert text at the current cursor position. Use this to add new content where the cursor is placed.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to insert at the cursor position',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'edit_lines',
    description: 'Replace content between specific line numbers. Use this for targeted edits when you know exactly which lines to modify.',
    parameters: {
      type: 'object',
      properties: {
        start_line: {
          type: 'number',
          description: 'The starting line number (1-indexed)',
        },
        end_line: {
          type: 'number',
          description: 'The ending line number (1-indexed, inclusive)',
        },
        new_text: {
          type: 'string',
          description: 'The new text to replace the lines with',
        },
      },
      required: ['start_line', 'end_line', 'new_text'],
    },
  },
  {
    name: 'append_to_document',
    description: 'Add text at the end of the document. Use this to add new sections or content at the bottom.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to append to the document',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'search_replace',
    description: 'Find and replace text throughout the document. Use this for consistent changes across the entire document.',
    parameters: {
      type: 'object',
      properties: {
        find: {
          type: 'string',
          description: 'The text to search for',
        },
        replace: {
          type: 'string',
          description: 'The text to replace matches with',
        },
        replace_all: {
          type: 'boolean',
          description: 'Whether to replace all occurrences (true) or just the first one (false)',
        },
      },
      required: ['find', 'replace'],
    },
  },
  {
    name: 'insert_heading',
    description: 'Insert a new heading at a specific location in the document.',
    parameters: {
      type: 'object',
      properties: {
        level: {
          type: 'number',
          description: 'The heading level (1-6)',
          enum: ['1', '2', '3', '4', '5', '6'],
        },
        text: {
          type: 'string',
          description: 'The heading text',
        },
        after_line: {
          type: 'number',
          description: 'Insert the heading after this line number (0 to insert at beginning)',
        },
      },
      required: ['level', 'text', 'after_line'],
    },
  },
];

export function formatToolsForOllama(tools: ToolDefinition[]) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function formatToolsForLMStudio(tools: ToolDefinition[]) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// All tools including web search
export const allTools: ToolDefinition[] = [...documentTools, webSearchTool];

// Get tools based on whether web search is enabled
export function getAvailableTools(enableWebSearch: boolean = false): ToolDefinition[] {
  return enableWebSearch ? allTools : documentTools;
}

export interface WorkflowContext {
  currentStage: string;
  stageLabel: string;
  progress: { completed: number; total: number; percentage: number };
  pendingItems: string[];
  notes: string;
}

export interface WebSearchConfig {
  enabled: boolean;
  autoSearch: boolean; // Automatically search when facts are needed
}

export function getSystemPrompt(
  documentContent: string, 
  documentPath: string, 
  selection?: { text: string; fromLine: number; toLine: number },
  workflowContext?: WorkflowContext,
  webSearchConfig?: WebSearchConfig
): string {
  let prompt = `You are an AI writing assistant helping to edit and improve documents. You have direct access to modify the document through tool calls.

Current document: ${documentPath}

DOCUMENT CONTENT:
\`\`\`
${documentContent}
\`\`\`

AVAILABLE ACTIONS:
- replace_selection: Replace currently selected text
- insert_at_cursor: Insert text at cursor position  
- edit_lines: Replace specific lines by number
- append_to_document: Add content at the end
- search_replace: Find and replace throughout document
- insert_heading: Add a new heading`;

  // Add web search instructions if enabled
  if (webSearchConfig?.enabled) {
    prompt += `
- web_search: Search the web for current information (USE THIS TO FIND FACTS!)

WEB SEARCH GUIDANCE:
You have the ability to search the web for information. USE IT when:
1. The user asks about current events, statistics, or recent developments
2. You need to verify facts, dates, or claims
3. You need specific information about people, places, organizations
4. The user explicitly asks you to research or look something up
5. You're writing content that requires accurate, up-to-date information
6. You're unsure about a factual claim

When you search:
- Use clear, specific search queries
- After receiving results, incorporate the information naturally into your response
- Cite sources when providing factual information
- You can search multiple times if needed for different aspects

DO NOT be hesitant to search - it's better to look up information than to guess or provide outdated facts!`;
  }

  prompt += `

GUIDELINES:
1. When the user asks to modify text, use the appropriate tool to make the change directly
2. Always provide a brief explanation of what you're doing along with the tool call
3. Preserve the document's existing style and formatting
4. For small changes, prefer targeted edits over rewriting large sections
5. If unsure what to change, ask for clarification instead of guessing`;

  if (selection) {
    prompt += `

CURRENT SELECTION (Lines ${selection.fromLine}-${selection.toLine}):
\`\`\`
${selection.text}
\`\`\`

When the user refers to "this", "the selected text", or similar, they mean the text above.`;
  }

  // Add workflow context if available
  if (workflowContext) {
    prompt += `

WRITING WORKFLOW STATUS:
The user is following a structured writing workflow for this document.

Current Stage: ${workflowContext.stageLabel}
Overall Progress: ${workflowContext.progress.percentage}% (${workflowContext.progress.completed}/${workflowContext.progress.total} items)

${workflowContext.pendingItems.length > 0 ? `Pending in current stage:
${workflowContext.pendingItems.map(item => `- ${item}`).join('\n')}` : 'All items in current stage are complete!'}

${workflowContext.notes ? `User notes: ${workflowContext.notes}` : ''}

WORKFLOW-AWARE ASSISTANCE:
- Be aware of the user's current writing stage and tailor your help accordingly
- During "Setup" stage: Help with model selection, settings, and preparation
- During "Outline" stage: Help brainstorm structure, suggest sections
- During "Drafting" stage: Help write content, expand ideas, continue sections
- During "Self Review" / "Council Review" stages: Focus on reviewing, not adding new content
- During "Revisions" stage: Help implement feedback and fixes
- During "Fact Check" stage: Help verify claims and suggest sources
- During "Final Polish" stage: Focus on minor refinements, not major changes

If appropriate, proactively suggest next steps based on the workflow stage.
Example: If draft is complete, suggest "Ready for the Council review? Open the Council panel to get feedback."`;
  }

  return prompt;
}

