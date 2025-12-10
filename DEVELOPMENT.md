# SanctumWriter - Development Documentation

> **Last Updated:** December 7, 2025  
> **Version:** 1.3.0  
> **Repository:** https://github.com/lafintiger/SanctumWriter

---

## 🤖 Agent Handoff Guide

**For AI agents picking up development**: This document explains everything you need to continue development on SanctumWriter. Read this thoroughly before making changes.

### Quick Context
- **What it is**: Local-first AI writing app using Ollama/LM Studio
- **Stack**: Next.js 14 + React + TypeScript + Tailwind + Zustand + CodeMirror 6 + LanceDB
- **Key files**: `app/page.tsx` (main), `lib/store/` (state), `lib/llm/` (AI), `lib/rag/` (knowledge base)
- **Port**: 3125

### Critical Patterns
1. **State**: All state in Zustand stores (`lib/store/use*Store.ts`), persisted to localStorage
2. **AI Tools**: AI edits documents via JSON tool calls, not copy/paste (see `lib/llm/tools.ts`)
3. **API Routes**: All backend in `app/api/` - file ops, LLM proxy, conversions
4. **Styling**: Tailwind CSS, dark theme, CSS variables in `globals.css`

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Philosophy & Design Principles](#philosophy--design-principles)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Architecture Deep Dive](#architecture-deep-dive)
6. [RAG & Knowledge Base System](#rag--knowledge-base-system)
7. [Citations System](#citations-system)
8. [Features Implemented](#features-implemented)
9. [Current State](#current-state)
10. [Future Roadmap](#future-roadmap)
11. [Known Issues & Limitations](#known-issues--limitations)
12. [Development Setup](#development-setup)
13. [Docker Deployment](#docker-deployment)
14. [Key Code Patterns](#key-code-patterns)

---

## Project Overview

**SanctumWriter** is a local-first, AI-powered markdown editor designed for writers who want to collaborate with Large Language Models (LLMs) while maintaining complete privacy and control over their data.

### Core Value Proposition

- **Safe**: All data stays local - no cloud dependencies
- **Local**: Uses local LLMs via Ollama or LM Studio
- **Open Source**: Fully transparent and extensible
- **Personal**: Your writing companion, not a corporate tool

### What Makes It Different

Unlike cloud-based AI writing tools, SanctumWriter:
1. Runs entirely on your machine
2. Uses your own local LLM models
3. Never sends your writing to external servers
4. Allows complete customization of AI behavior
5. Works offline (once models are downloaded)

---

## Philosophy & Design Principles

### 1. Agentic AI Behavior
The AI doesn't just suggest - it can directly manipulate documents through structured tool calls. When you ask the AI to "rewrite paragraph 3," it actually edits the document rather than outputting text for you to copy-paste.

### 2. Writer-Centric Design
Every feature is designed around the writing workflow:
- The editor is central, not the AI
- AI assists, doesn't take over
- Settings optimize for writing quality, not just speed

### 3. Hardware-Aware
The app detects and adapts to your hardware:
- GPU VRAM detection for optimal model selection
- Context length recommendations based on available memory
- VRAM-aware model loading/unloading for the Council feature

### 4. Privacy First
- No analytics or telemetry
- No external API calls (except to your local services)
- All settings stored in browser localStorage

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.x | React framework with App Router |
| **React** | 18.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Styling |
| **CodeMirror 6** | 6.x | Markdown editor |
| **Zustand** | 4.x | State management |
| **Lucide React** | Latest | Icons |
| **react-markdown** | Latest | Markdown preview |
| **marked** | Latest | Markdown to HTML conversion |

### Backend (API Routes)
| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | File operations, LLM proxy, search proxy, document conversion |
| **Node.js fs module** | Local file system access |
| **Python (optional)** | Docling document conversion |

### External Services (Local)
| Service | Default Port | Purpose |
|---------|--------------|---------|
| **Ollama** | 11434 | Primary LLM inference |
| **LM Studio** | 1234 | Alternative LLM server |
| **Perplexica** | 3000 | AI-powered search (optional) |
| **SearXNG** | 4000 | Privacy-focused search (optional) |

---

## Project Structure

```
SanctumWriter/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── files/               # File system operations
│   │   │   ├── route.ts         # List files, create new files
│   │   │   └── [...path]/       # Read, write, delete specific files
│   │   │       └── route.ts
│   │   ├── models/              # LLM model listing
│   │   │   └── route.ts         # Get available models from Ollama/LM Studio
│   │   ├── model-info/          # Model metadata
│   │   │   └── route.ts         # Get model details (size, context, etc.)
│   │   ├── search/              # Search proxy
│   │   │   └── route.ts         # Proxy for Perplexica/SearXNG (CORS bypass)
│   │   ├── workspace/           # Workspace management
│   │   │   └── route.ts         # Get/set workspace folder path
│   │   └── convert/             # Document conversion
│   │       └── route.ts         # Docling PDF/DOCX to Markdown
│   ├── components/              # React components
│   │   ├── Chat/                # AI chat interface
│   │   │   └── Chat.tsx         # Main chat component with streaming
│   │   ├── Citations/           # Citation management
│   │   │   └── CitationPanel.tsx # Add/edit citations, bibliography
│   │   ├── Council/             # Council of Writers feature
│   │   │   └── CouncilPanel.tsx # Multi-model review interface
│   │   ├── Convert/             # Document conversion
│   │   │   └── ConvertPanel.tsx # Docling conversion UI
│   │   ├── Editor/              # Document editor
│   │   │   ├── Editor.tsx       # CodeMirror wrapper
│   │   │   └── WritingStatsBar.tsx # Word count, readability metrics
│   │   ├── Export/              # Export functionality
│   │   │   └── ExportModal.tsx  # PDF/DOCX/HTML export
│   │   ├── FileTree/            # File browser
│   │   │   └── FileTree.tsx     # Sidebar file list
│   │   ├── Header/              # App header
│   │   │   └── Header.tsx       # Model selector, settings, toggles
│   │   ├── KnowledgeBase/       # RAG knowledge base
│   │   │   └── KnowledgeBasePanel.tsx # Index documents, manage vectors
│   │   ├── Outline/             # Document outline
│   │   │   └── OutlinePanel.tsx # Heading navigation
│   │   ├── Preview/             # Markdown preview
│   │   │   └── Preview.tsx      # Live rendered preview
│   │   ├── Project/             # Project management
│   │   │   └── ProjectView.tsx  # Project organization UI
│   │   ├── PromptLibrary/       # Prompt management
│   │   │   └── PromptLibraryPanel.tsx # Save/reuse prompts
│   │   ├── Research/            # Search/research panel
│   │   │   └── ResearchPanel.tsx # SearXNG/Perplexica integration
│   │   ├── SessionMemory/       # Conversation memory
│   │   │   └── SessionMemoryPanel.tsx # View/manage memories
│   │   ├── Settings/            # Settings modal
│   │   │   └── Settings.tsx     # All settings tabs
│   │   ├── Toast/               # Notifications
│   │   │   └── Toast.tsx        # Toast notification component
│   │   └── Workflow/            # Writing workflow
│   │       └── WorkflowPanel.tsx # Checklist/progress tracker
│   ├── globals.css              # Global styles & CSS variables
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main page component
├── lib/                         # Shared utilities & logic
│   ├── citations/               # Citation management
│   │   ├── formatter.ts         # Format citations (APA, MLA, etc.)
│   │   ├── parser.ts            # Parse [@key] citations from markdown
│   │   └── index.ts             # Module exports
│   ├── council/                 # Council of Writers logic
│   │   └── reviewPipeline.ts    # Review orchestration, model management
│   ├── editor/                  # Editor utilities
│   │   ├── operations.ts        # Document manipulation operations
│   │   └── reviewAnnotations.ts # Review comment annotations
│   ├── hardware/                # Hardware detection
│   │   └── detect.ts            # GPU/VRAM detection via WebGL
│   ├── llm/                     # LLM utilities
│   │   ├── client.ts            # Ollama/LM Studio API client
│   │   ├── modelManager.ts      # Model loading/unloading for VRAM management
│   │   └── tools.ts             # Document operation tools for AI
│   ├── rag/                     # RAG (Retrieval Augmented Generation)
│   │   ├── chunker.ts           # Split documents into chunks
│   │   ├── embeddings.ts        # Generate embeddings via Ollama
│   │   ├── indexer.ts           # Orchestrate document indexing
│   │   ├── retriever.ts         # Query vectors, build RAG prompts
│   │   ├── sessionMemory.ts     # Conversation memory management
│   │   ├── vectorStore.ts       # LanceDB vector storage
│   │   └── index.ts             # Module exports
│   ├── search/                  # Search integration
│   │   └── searchService.ts     # Perplexica/SearXNG client
│   ├── store/                   # Zustand stores
│   │   ├── useAppStore.ts       # Main app state (documents, UI, focus mode)
│   │   ├── useChatStore.ts      # Chat messages and state
│   │   ├── useCitationStore.ts  # Citations and bibliography
│   │   ├── useCouncilStore.ts   # Council of Writers state
│   │   ├── useOutlineStore.ts   # Document outline state
│   │   ├── useProjectStore.ts   # Project management state
│   │   ├── usePromptLibraryStore.ts # Prompt library state
│   │   ├── useRAGStore.ts       # RAG and session memory settings
│   │   ├── useSearchStore.ts    # Research panel state
│   │   ├── useSettingsStore.ts  # Settings, hardware, services, workspace
│   │   └── useWorkflowStore.ts  # Writing workflow state
│   ├── utils/                   # Utility functions
│   │   ├── exportDocument.ts    # PDF/DOCX/HTML export logic
│   │   └── writingStats.ts      # Word count, readability calculations
│   └── utils.ts                 # General utilities (cn, etc.)
├── scripts/                     # Helper scripts
│   └── convert_document.py      # Docling conversion script
├── types/                       # TypeScript type definitions
│   └── council.ts               # Council types, reviewer configs
├── public/                      # Static assets
├── documents/                   # Default workspace folder
├── Dockerfile                   # Production Docker build
├── Dockerfile.dev               # Development Docker build
├── docker-compose.yml           # Production orchestration
├── docker-compose.dev.yml       # Development orchestration
├── .dockerignore                # Docker build exclusions
├── package.json                 # Dependencies & scripts
├── requirements.txt             # Python dependencies (Docling)
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── next.config.js               # Next.js config (includes standalone output)
├── env.example                  # Environment variable template
├── DEVELOPMENT.md               # This file (agent handoff document)
├── ROADMAP.md                   # Feature roadmap and status
└── WRITING_WORKFLOW.md          # User workflow guide
```

---

## Architecture Deep Dive

### State Management (Zustand Stores)

#### `useAppStore.ts` - Main Application State
```typescript
// Key state:
- provider: 'ollama' | 'lmstudio'      // Current LLM provider
- model: string                         // Current model name
- availableModels: Model[]              // List of available models
- currentDocument: Document | null      // Active document
- documents: Document[]                 // Open documents
- selection: Selection | null           // Editor text selection
- cursorPosition: { line, col }         // Editor cursor
- chatMessages: Message[]               // Chat history
- isGenerating: boolean                 // AI generation in progress
- isFocusMode: boolean                  // Focus mode active

// Key actions:
- setModel(model)                       // Change active model
- loadDocument(path)                    // Load file from disk
- updateDocumentContent(content)        // Update editor content
- sendMessage(message)                  // Send chat message to AI
- toggleFocusMode()                     // Toggle distraction-free mode
```

#### `useSettingsStore.ts` - Settings & Hardware
```typescript
// Key state:
- writingPreset: WritingPreset          // academic, creative, etc.
- temperature, topP, topK, repeatPenalty // LLM parameters
- contextLength: number                  // Active context window
- hardwareInfo: HardwareInfo            // GPU detection results
- serviceURLs: ServiceURLs              // Custom service endpoints
- workspacePath: string                 // User-selected workspace folder

// Key actions:
- setWritingPreset(preset)              // Apply preset parameters
- selectGPU(gpuId)                      // Manual GPU selection
- optimizeForWriting()                  // Auto-optimize settings
- setServiceURL(service, url)           // Custom port configuration
- setWorkspacePath(path)                // Set workspace folder
```

#### `useCouncilStore.ts` - Council of Writers
```typescript
// Key state:
- reviewers: Reviewer[]                 // Configured reviewers
- currentSession: ReviewSession | null  // Active review
- reviewDocument: ReviewDocument | null // Collected feedback
- reviewPhase: ReviewPhase              // council_reviewing | editor_synthesizing | user_deciding
- modelLoadingStatus: Map<string, status> // VRAM management feedback

// Key actions:
- startReview(documentContent)          // Begin review process
- addComment(comment)                   // Add reviewer feedback
- setEditorSynthesis(synthesis)         // Editor's summary
- completeReview()                      // Finish review session
```

#### `useWorkflowStore.ts` - Writing Workflow
```typescript
// Key state:
- workflows: Record<string, Workflow>   // Per-document workflows
- showWorkflowPanel: boolean            // Panel visibility

// Key actions:
- initializeWorkflow(documentPath)      // Create workflow for document
- toggleTask(docPath, stageId, taskId)  // Mark task complete/incomplete
- getProgress(documentPath)             // Get completion percentage
- getCurrentStage(documentPath)         // Get active workflow stage
```

#### `useOutlineStore.ts` - Document Outline
```typescript
// Key state:
- outline: Heading[]                    // Parsed markdown headings
- showOutlinePanel: boolean             // Panel visibility

// Key actions:
- setOutline(headings)                  // Update outline from document
- toggleOutlinePanel()                  // Show/hide panel
```

#### `usePromptLibraryStore.ts` - Prompt Library
```typescript
// Key state:
- prompts: Prompt[]                     // Saved prompts
- showPromptLibraryPanel: boolean       // Panel visibility

// Key actions:
- addPrompt(prompt)                     // Save new prompt
- editPrompt(id, updates)               // Modify existing prompt
- deletePrompt(id)                      // Remove prompt
```

#### `useRAGStore.ts` - RAG & Knowledge Base
```typescript
// Key state:
- ragSettings: RAGSettings              // Embedding model, chunk counts, etc.
- sessionMemorySettings: SessionMemorySettings  // Auto-save, thresholds
- indexedDocuments: IndexedDocument[]   // Tracked indexed files
- isIndexing: boolean                   // Indexing in progress
- showKnowledgeBasePanel: boolean       // Panel visibility
- showSessionMemoryPanel: boolean       // Panel visibility

// Key actions:
- setRAGEnabled(enabled)                // Toggle RAG
- setEmbeddingModel(model)              // Change embedding model
- addIndexedDocument(doc)               // Track indexed file
- clearCollectionData(collection)       // Clear vector collection
```

#### `useChatStore.ts` - Chat State
```typescript
// Key state:
- messages: ChatMessage[]               // Chat history per document
- isGenerating: boolean                 // AI response in progress
- activeDocumentPath: string | null     // Current document context

// Key actions:
- addMessage(message)                   // Add to chat
- clearMessages()                       // Clear chat history
- setGenerating(status)                 // Update generation state
```

#### `useCitationStore.ts` - Citations
```typescript
// Key state:
- citations: Citation[]                 // All saved citations
- showCitationPanel: boolean            // Panel visibility
- citationStyle: 'apa' | 'mla' | 'chicago' | 'harvard'

// Key actions:
- addCitation(citation)                 // Add new citation
- updateCitation(key, updates)          // Modify citation
- deleteCitation(key)                   // Remove citation
- formatBibliography()                  // Generate formatted references
```

#### `useProjectStore.ts` - Project Management
```typescript
// Key state:
- currentProject: Project | null        // Active project
- projects: Project[]                   // All projects
- projectDocuments: Document[]          // Documents in current project

// Key actions:
- createProject(name)                   // New project
- setCurrentProject(id)                 // Switch projects
- addDocumentToProject(path)            // Link document to project
```

### LLM Integration

#### Chat Flow (Chat.tsx → Ollama)
```
1. User types message
2. Chat calls sendMessage()
3. Build prompt with system message + workflow context + history + document context
4. POST to Ollama /api/chat with stream: true
5. Parse SSE stream, update UI token-by-token
6. Detect tool calls in response (JSON blocks)
7. Execute tool calls (edit document, etc.)
8. Add response to chat history
```

#### Tool Calling System (lib/llm/tools.ts)
The AI can execute document operations via structured JSON responses:

```typescript
// Available tools:
- replace_selection    // Replace highlighted text
- insert_at_cursor     // Insert at current position
- edit_range          // Edit specific line range
- append_to_document  // Add to end of document
- prepend_to_document // Add to beginning
```

Example AI response with tool call:
```json
{
  "tool": "replace_selection",
  "params": {
    "new_text": "The revised paragraph..."
  }
}
```

### Council of Writers Pipeline (lib/council/reviewPipeline.ts)

#### 3-Phase Review Workflow
```
Phase 1: Council Reviewing
├── Group reviewers by model (minimize VRAM swaps)
├── For each model group:
│   ├── Unload current model from VRAM
│   ├── Load required model
│   ├── Run all reviewers using that model
│   └── Collect feedback
└── Store all comments in ReviewDocument

Phase 2: Editor Synthesizing
├── Load Editor's model
├── Send all council feedback to Editor
├── Editor generates prioritized recommendations
└── Store synthesis in ReviewDocument

Phase 3: User Deciding
├── Display Editor's recommendations
├── User accepts/rejects each suggestion
└── Apply approved changes to document
```

#### VRAM Management (lib/llm/modelManager.ts)
```typescript
// Key functions:
getLoadedModels()      // Query Ollama for loaded models
unloadModel(name)      // Send keep_alive: 0 to free VRAM
loadModel(name)        // Warm up model with dummy prompt
ensureModelLoaded(name) // Orchestrate load/unload as needed
```

### Search Integration (lib/search/searchService.ts)

#### Architecture
```
Frontend (ResearchPanel)
    ↓
API Route (/api/search) - CORS proxy
    ↓
┌─────────────────┬─────────────────┐
│   Perplexica    │    SearXNG      │
│   (AI search)   │  (meta-search)  │
└─────────────────┴─────────────────┘
         ↓                ↓
         └───── Results ──┘
                  ↓
         AI Summary Generation
         (via Ollama if SearXNG)
                  ↓
         Display in Panel
```

### Writing Stats (lib/utils/writingStats.ts)

#### Metrics Calculated
```typescript
countWords(text)              // Word count
countCharacters(text)         // Character count
countSentences(text)          // Sentence count
countParagraphs(text)         // Paragraph count
calculateFleschKincaid(text)  // Readability grade level
calculateReadabilityScores(text) // Combined metrics
```

---

## RAG & Knowledge Base System

The RAG (Retrieval Augmented Generation) system allows the AI to reference your documents and remember conversations.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG Pipeline                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Document Input          Embedding              Storage      │
│  ┌───────────┐          ┌─────────┐          ┌─────────┐   │
│  │ Markdown  │──chunk──▶│ Ollama  │──embed──▶│ LanceDB │   │
│  │ PDF/DOCX  │          │ nomic   │          │ Vector  │   │
│  │ Web Pages │          │ embed   │          │ Store   │   │
│  └───────────┘          └─────────┘          └─────────┘   │
│                                                    │         │
│  ┌─────────────────────────────────────────────────┘         │
│  │                                                           │
│  ▼  Retrieval                                               │
│  ┌─────────────┐     ┌──────────────┐     ┌────────────┐   │
│  │ User Query  │────▶│ Similarity   │────▶│ Top K      │   │
│  │             │     │ Search       │     │ Results    │   │
│  └─────────────┘     └──────────────┘     └────────────┘   │
│                                                    │         │
│                                                    ▼         │
│                                           ┌────────────┐    │
│                                           │ Inject to  │    │
│                                           │ LLM Prompt │    │
│                                           └────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Components (lib/rag/)

| File | Purpose |
|------|---------|
| `chunker.ts` | Split documents into semantic chunks for embedding |
| `embeddings.ts` | Generate embeddings via Ollama (nomic-embed-text) |
| `vectorStore.ts` | LanceDB wrapper for storing/searching vectors |
| `indexer.ts` | Orchestrate document indexing |
| `retriever.ts` | Query vectors and build RAG prompts |
| `sessionMemory.ts` | Save/retrieve conversation memories |

### Collections

```typescript
type CollectionName = 'references' | 'sessions' | 'web_research';

// references - User's knowledge base documents
// sessions   - Conversation summaries & preferences
// web_research - Indexed web search results
```

### Embedding Models

```typescript
const EMBEDDING_MODELS = {
  'nomic-embed-text': { dimensions: 768, size: '274MB' },  // Default
  'mxbai-embed-large': { dimensions: 1024, size: '670MB' },
  'all-minilm': { dimensions: 384, size: '23MB' },        // Lightweight
};
```

### Store: useRAGStore.ts

```typescript
interface RAGSettings {
  enabled: boolean;               // Master toggle for RAG
  embeddingModel: string;         // Which embedding model to use
  maxRetrievedChunks: number;     // How many chunks to retrieve (default: 5)
  minSimilarityScore: number;     // Threshold for relevance (default: 0.5)
  maxTokensForContext: number;    // Token budget for context (default: 2000)
  collections: CollectionName[];  // Which collections to search
}

interface SessionMemorySettings {
  enabled: boolean;               // Enable conversation memory
  autoSave: boolean;              // Auto-save conversation summaries
  autoSaveThreshold: number;      // Messages before auto-save (default: 8)
}
```

### Session Memory Flow

```
1. User has conversation about their document
2. After N messages, system auto-summarizes conversation
3. Summary embedded and stored in 'sessions' collection
4. On next session, relevant memories retrieved
5. AI has context about previous discussions
```

---

## Citations System

Manage references and generate bibliographies in multiple formats.

### Components (lib/citations/)

| File | Purpose |
|------|---------|
| `parser.ts` | Parse citation keys from markdown `[@key]` |
| `formatter.ts` | Format citations as APA, MLA, Chicago, etc. |

### Citation Format

```markdown
As noted by Smith [@smith2023], the phenomenon...

## References
<!-- Citations will be rendered here -->
```

### Store: useCitationStore.ts

```typescript
interface Citation {
  key: string;          // Unique identifier [@smith2023]
  type: 'book' | 'article' | 'website' | 'journal';
  title: string;
  authors: string[];
  year: number;
  url?: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  pages?: string;
}
```

### Supported Formats

| Format | Output Example |
|--------|----------------|
| APA | Smith, J. (2023). *Title*. Publisher. |
| MLA | Smith, John. *Title*. Publisher, 2023. |
| Chicago | Smith, John. *Title*. Location: Publisher, 2023. |
| Harvard | Smith, J., 2023. *Title*. Publisher. |

---

### Export System (lib/utils/exportDocument.ts)

#### Supported Formats
```typescript
exportToPdf(content, filename)   // PDF via browser print
exportToDocx(content, filename)  // DOCX via docx library
exportToHtml(content, filename)  // HTML with styling
exportToTxt(content, filename)   // Plain text
exportToMd(content, filename)    // Raw markdown
```

---

## Features Implemented

### Phase 1: Writer Optimization ✅
- [x] WebGL-based GPU/VRAM detection
- [x] Manual GPU selection from preset list (50+ GPUs)
- [x] Hardware tier classification (low/medium/high/ultra)
- [x] Context length recommendations per tier
- [x] Writing presets (academic, creative, business, etc.)
- [x] LLM parameter controls (temperature, top_p, top_k, repeat_penalty)
- [x] Model persistence (remembers last used model)
- [x] Optimized defaults for each hardware tier

### Phase 2: Council of Writers ✅
- [x] Multi-model review system
- [x] Configurable reviewers with custom prompts
- [x] Default reviewers (Fact Checker, Style Editor, Legal, Medical, etc.)
- [x] Editor role for synthesizing feedback
- [x] VRAM-aware model swapping (sequential loading)
- [x] Model grouping to minimize VRAM swaps
- [x] Review document for collecting all feedback
- [x] 3-phase workflow (Council → Editor → User)
- [x] UI for reviewer configuration in Settings

### Phase 3: Quality Assurance ✅
- [x] Hallucination Detector reviewer
  - Detects fake statistics, made-up quotes, non-existent citations
  - Flags overly precise numbers without sources
- [x] AI Artifact Detector reviewer
  - Detects clichéd AI phrases ("delve into", "it's important to note")
  - Flags overused metaphors ("landscape", "journey", "tapestry")
  - Identifies structural AI patterns
- [x] Enhanced Fact Checker with search verification capability
- [x] Claim extraction for automatic verification

### Search Integration ✅
- [x] SearXNG integration with AI summaries
- [x] Perplexica integration (partial - configuration dependent)
- [x] CORS proxy via Next.js API routes
- [x] AI summary generation for search results (via Ollama)
- [x] Citation generation (APA, MLA, Chicago, simple)
- [x] Search history and saved results
- [x] Insert research into documents with sources

### Configurable Services ✅
- [x] Custom URLs for Ollama, LM Studio, Perplexica, SearXNG
- [x] Connection testing for each service
- [x] Quick-apply presets (local, Docker, remote)
- [x] Settings persistence in localStorage

### Workflow System ✅
- [x] Interactive writing workflow checklist
- [x] Per-document progress tracking
- [x] Stage-based task organization
- [x] Notes section for each document
- [x] AI workflow awareness (system prompt integration)
- [x] Toggleable workflow panel

### Focus Mode ✅
- [x] Distraction-free writing mode
- [x] Hides sidebar, chat, panels when active
- [x] Quick toggle from header

### Writing Stats ✅
- [x] Real-time word count
- [x] Character count
- [x] Sentence count
- [x] Paragraph count
- [x] Stats bar in editor footer

### Readability Metrics ✅
- [x] Flesch-Kincaid Grade Level
- [x] Real-time updates as you type
- [x] Display in stats bar

### Outline View ✅
- [x] Auto-generated from markdown headings
- [x] Collapsible tree structure
- [x] Click to navigate to heading
- [x] Toggleable panel

### PDF/DOCX Export ✅
- [x] Export to PDF (via browser print)
- [x] Export to DOCX
- [x] Export to HTML
- [x] Export to TXT
- [x] Export raw Markdown
- [x] Export modal with options

### Prompt Library ✅
- [x] Save custom prompts
- [x] Built-in prompts for common tasks
- [x] Category organization
- [x] Search prompts
- [x] Insert prompts into chat
- [x] Edit and delete prompts

### Configurable Workspace ✅
- [x] Choose any local folder as workspace
- [x] Obsidian vault compatibility
- [x] Folder browser in settings
- [x] Persistent workspace path

### Document Conversion (Docling) ✅
- [x] Convert PDF to Markdown
- [x] Convert DOCX to Markdown
- [x] Convert PPTX to Markdown
- [x] Python script integration
- [x] Conversion panel UI

### RAG / Knowledge Base ✅
- [x] Document indexing with chunking
- [x] Embedding generation via Ollama (nomic-embed-text)
- [x] LanceDB vector storage
- [x] Semantic similarity search
- [x] Multiple collections (references, sessions, web_research)
- [x] Context injection into AI prompts
- [x] Knowledge Base management panel
- [x] Configurable chunk count and similarity threshold

### Session Memory ✅
- [x] Conversation summarization
- [x] Memory storage in vector DB
- [x] Relevant memory retrieval
- [x] Auto-save conversations
- [x] Per-document memory tracking
- [x] Preference learning
- [x] Session Memory panel

### Citations & Bibliography ✅
- [x] Citation key parsing ([@key] format)
- [x] Multiple citation styles (APA, MLA, Chicago, Harvard)
- [x] Citation management panel
- [x] Auto-formatted bibliography generation
- [x] Citation metadata storage

### Docker Deployment ✅
- [x] Production Dockerfile (multi-stage, optimized)
- [x] Development Dockerfile (hot-reload)
- [x] docker-compose.yml with Ollama profile
- [x] Volume persistence for documents and vectors
- [x] GPU support configuration
- [x] Health checks

### Core Editor Features ✅
- [x] CodeMirror 6 markdown editor
- [x] Syntax highlighting
- [x] Live markdown preview
- [x] File browser sidebar
- [x] Document tabs
- [x] Selection-aware AI commands
- [x] Streaming AI responses
- [x] Tool-based document editing

---

## Current State

### What Works Well
1. **Core Writing Experience** - Editor, file management, AI chat
2. **Local LLM Integration** - Ollama models work reliably
3. **Hardware Optimization** - GPU detection and settings optimization
4. **Council Reviews** - Multi-model review with VRAM management
5. **Search with AI Summaries** - SearXNG + Ollama summarization
6. **Customizable Services** - Works with different port configurations
7. **Writing Workflow** - Guided checklist with AI awareness
8. **Focus Mode** - Clean distraction-free writing
9. **Writing Stats** - Real-time metrics and readability
10. **Document Export** - Multiple format support
11. **Prompt Library** - Reusable prompt management
12. **Workspace Selection** - Obsidian compatibility
13. **RAG Knowledge Base** - Document indexing and retrieval
14. **Session Memory** - AI remembers conversations
15. **Citations** - Bibliography management with multiple styles
16. **Docker Deployment** - Containerized for easy deployment

### What Needs Attention
1. **Perplexica Integration** - Works but depends on Perplexica's configuration
   - Provider ID system in newer versions causes issues
   - Falls back to SearXNG + Ollama summary gracefully
2. **Large Document Handling** - Context limits with very long documents
3. **Error Recovery** - Some edge cases in streaming could be more robust

### Technical Debt
- Some components are large and could be split (Settings.tsx, CouncilPanel.tsx)
- Test coverage is minimal
- No error boundary components yet

---

## Future Roadmap

### Recently Completed ✅
| Feature | Description | Status |
|---------|-------------|--------|
| **Session Memory** | AI remembers context across sessions | ✅ Complete |
| **Citation Formats** | APA, MLA, Chicago style management | ✅ Complete |
| **Bibliography Generation** | Automatic reference list | ✅ Complete |
| **RAG Knowledge Base** | Document retrieval for AI context | ✅ Complete |
| **Docker Deployment** | Containerized deployment | ✅ Complete |

### Medium Priority (Next Up)
| Feature | Description | Complexity |
|---------|-------------|------------|
| **Custom Personas** | AI writing styles/voices (editor, coach, critic) | Medium |
| **Version History** | Local version snapshots with diff view | Medium |
| **Multi-Document Projects** | Project-level organization | High |

### Lower Priority
| Feature | Description | Complexity |
|---------|-------------|------------|
| **LaTeX Export** | Academic publishing format | Medium |
| **ePub Export** | E-book format | Medium |
| **Writing Goals** | Word count targets, session timers | Low |

### Deferred
| Feature | Description | Notes |
|---------|-------------|-------|
| **Perplexica Integration** | Full AI-powered search | Depends on Perplexica API stability |

---

## Known Issues & Limitations

### Browser Limitations
1. **WebGL VRAM Detection** - Not always accurate, hence manual GPU selection
2. **localStorage Size** - Large documents in history could hit limits
3. **File System Access** - Limited to configured workspace directory

### LLM Limitations
1. **Context Window** - Documents larger than context are truncated
2. **Tool Calling** - Depends on model's ability to output valid JSON
3. **VRAM Management** - Ollama's model unloading can be slow

### Service Dependencies
1. **Ollama Required** - Core functionality needs Ollama running
2. **Search Optional** - Research features need Perplexica or SearXNG
3. **Port Conflicts** - Default ports may conflict with other apps
4. **Docling Optional** - PDF conversion needs Python + docling installed

---

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Ollama installed and running
- (Optional) Python 3.10+ for Docling conversion
- (Optional) SearXNG for search features
- (Optional) Perplexica for AI-powered search

### Installation
```bash
# Clone repository
git clone https://github.com/lafintiger/SanctumWriter.git
cd SanctumWriter

# Install Node dependencies
npm install

# (Optional) Install Python dependencies for Docling
pip install -r requirements.txt

# Start development server
npm run dev

# App runs on http://localhost:3125
```

### Environment Variables (Optional)
Create `.env.local` for custom defaults:
```env
OLLAMA_URL=http://localhost:11434
LMSTUDIO_URL=http://localhost:1234
PERPLEXICA_URL=http://localhost:3000
SEARXNG_URL=http://localhost:4000
```

### Running with Docker Services
If your search services run in Docker:
```bash
# SearXNG on port 8080
docker run -d -p 8080:8080 searxng/searxng

# Then configure in Settings → Services → SearXNG URL
# http://localhost:8080
```

---

## Docker Deployment

SanctumWriter can be fully containerized for easy deployment.

### Docker Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Production multi-stage build (~150MB) |
| `Dockerfile.dev` | Development with hot-reload |
| `docker-compose.yml` | Production orchestration |
| `docker-compose.dev.yml` | Development with source mounting |
| `.dockerignore` | Excludes node_modules, .next, etc. |

### Quick Start

```bash
# Production (uses Ollama on host)
docker-compose up -d

# Production with Ollama in container
docker-compose --profile ollama up -d
docker exec sanctum-ollama ollama pull qwen3:latest

# Development with hot-reload
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose build --no-cache
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Docker Compose                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │ sanctum-writer   │      │ sanctum-ollama   │        │
│  │ (Next.js App)    │◄────▶│ (Optional)       │        │
│  │ Port: 3125       │      │ Port: 11434      │        │
│  └──────────────────┘      └──────────────────┘        │
│          │                                              │
│          │ Volume Mounts                                │
│          │                                              │
│  ┌───────▼────────┐  ┌────────────────┐               │
│  │ ./documents    │  │ sanctum-lancedb│               │
│  │ (Workspace)    │  │ (Vector Data)  │               │
│  └────────────────┘  └────────────────┘               │
│                                                         │
│  Connection to Host:                                    │
│  - host.docker.internal:11434 (Ollama on host)         │
│  - host.docker.internal:1234  (LM Studio on host)      │
└─────────────────────────────────────────────────────────┘
```

### Environment Variables

```env
# .env file for Docker
OLLAMA_URL=http://host.docker.internal:11434
LMSTUDIO_URL=http://host.docker.internal:1234
DEFAULT_PROVIDER=ollama
DEFAULT_MODEL=llama3
WORKSPACE_PATH=/app/documents
```

### Production Dockerfile Stages

1. **deps** - Install npm dependencies (cached layer)
2. **builder** - Build Next.js standalone output
3. **runner** - Minimal runtime with Python for conversions

### Key Configuration

```javascript
// next.config.js must include:
output: 'standalone'  // Required for Docker
```

### GPU Support (NVIDIA)

Uncomment in `docker-compose.yml`:
```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

---

## Key Code Patterns

### Adding a New Reviewer
1. Add role to `ReviewerRole` type in `types/council.ts`
2. Add default config to `DEFAULT_REVIEWERS` array
3. (Optional) Add role-specific icon options in Settings

### Adding a New Setting
1. Add to interface in `useSettingsStore.ts`
2. Add default value in store initialization
3. Add to `partialize` for persistence
4. Add UI in `Settings.tsx`

### Adding a New API Route
1. Create `app/api/[route]/route.ts`
2. Export `GET`, `POST`, etc. handlers
3. Handle errors with try/catch and NextResponse.json()

### Adding a New Tool for AI
1. Add tool definition in `lib/llm/tools.ts`
2. Add handler in `Chat.tsx` tool execution
3. Update system prompt to describe the tool

### Adding a New Zustand Store
1. Create `lib/store/use[Name]Store.ts`
2. Define interface with state and actions
3. Use `persist` middleware if needed for localStorage
4. Import and use in components

### Adding a New Panel
1. Create component in `app/components/[Panel]/`
2. Add visibility state to appropriate store
3. Add toggle button in Header
4. Add conditional render in `page.tsx`

---

## Quick Reference: File Locations

| Feature | Key Files |
|---------|-----------|
| **Main Layout** | `app/page.tsx` |
| **AI Chat** | `app/components/Chat/Chat.tsx`, `lib/llm/tools.ts`, `lib/store/useChatStore.ts` |
| **Council** | `app/components/Council/CouncilPanel.tsx`, `lib/council/reviewPipeline.ts` |
| **Editor** | `app/components/Editor/Editor.tsx` |
| **Settings** | `app/components/Settings/Settings.tsx`, `lib/store/useSettingsStore.ts` |
| **Workflow** | `app/components/Workflow/WorkflowPanel.tsx`, `lib/store/useWorkflowStore.ts` |
| **Search** | `app/components/Research/ResearchPanel.tsx`, `lib/search/searchService.ts` |
| **Export** | `app/components/Export/ExportModal.tsx`, `lib/utils/exportDocument.ts` |
| **Stats** | `app/components/Editor/WritingStatsBar.tsx`, `lib/utils/writingStats.ts` |
| **Docling** | `app/components/Convert/ConvertPanel.tsx`, `scripts/convert_document.py` |
| **RAG/Knowledge** | `app/components/KnowledgeBase/KnowledgeBasePanel.tsx`, `lib/rag/*`, `lib/store/useRAGStore.ts` |
| **Session Memory** | `app/components/SessionMemory/SessionMemoryPanel.tsx`, `lib/rag/sessionMemory.ts` |
| **Citations** | `app/components/Citations/CitationPanel.tsx`, `lib/citations/*`, `lib/store/useCitationStore.ts` |
| **Projects** | `app/components/Project/ProjectView.tsx`, `lib/store/useProjectStore.ts` |
| **Docker** | `Dockerfile`, `docker-compose.yml`, `.dockerignore` |

---

## Common Development Tasks

### Adding a New Feature Panel

1. Create component: `app/components/[FeatureName]/[FeatureName]Panel.tsx`
2. Create store if needed: `lib/store/use[FeatureName]Store.ts`
3. Add toggle state to store: `show[FeatureName]Panel: boolean`
4. Add toggle button in `Header.tsx`
5. Add panel rendering in `page.tsx`
6. Export from `app/components/index.ts`

### Adding API Functionality

1. Create route: `app/api/[endpoint]/route.ts`
2. Export handlers: `GET`, `POST`, `PUT`, `DELETE`
3. Use `NextResponse.json()` for responses
4. Handle errors with try/catch

### Modifying AI Behavior

1. System prompts: `app/components/Chat/Chat.tsx` (buildSystemPrompt)
2. Tool definitions: `lib/llm/tools.ts`
3. Tool execution: `Chat.tsx` (executeToolCall)

### Working with RAG

1. Indexing: Use functions from `lib/rag/indexer.ts`
2. Retrieval: Use `retrieveContext()` from `lib/rag/retriever.ts`
3. Store: `useRAGStore` for settings and state

---

## Troubleshooting for Developers

| Issue | Solution |
|-------|----------|
| **Build fails with LanceDB** | Ensure Node 18+, may need `npm rebuild` |
| **Embeddings fail** | Check Ollama is running, model pulled: `ollama pull nomic-embed-text` |
| **CORS errors** | All external calls should go through `/api/` routes |
| **State not persisting** | Check `partialize` in store's persist config |
| **Docker can't connect to Ollama** | Use `host.docker.internal:11434` not `localhost` |
| **Hot reload not working** | Use `docker-compose.dev.yml` with mounted volumes |

---

## Contact & Contributing

This is a personal project. Feel free to fork and modify for your own use.

**Repository:** https://github.com/lafintiger/SanctumWriter

---

*Last updated: December 7, 2025*  
*This document should be updated whenever significant changes are made to the architecture or features.*
