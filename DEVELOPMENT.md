# SanctumWriter - Development Documentation

> **Last Updated:** December 1, 2025  
> **Version:** 1.0.0  
> **Repository:** https://github.com/lafintiger/SanctumWriter

## Table of Contents

1. [Project Overview](#project-overview)
2. [Philosophy & Design Principles](#philosophy--design-principles)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Architecture Deep Dive](#architecture-deep-dive)
6. [Features Implemented](#features-implemented)
7. [Current State](#current-state)
8. [Future Roadmap](#future-roadmap)
9. [Known Issues & Limitations](#known-issues--limitations)
10. [Development Setup](#development-setup)
11. [Key Code Patterns](#key-code-patterns)

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

### Backend (API Routes)
| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | File operations, LLM proxy, search proxy |
| **Node.js fs module** | Local file system access |

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
│   │   │   └── route.ts         # List, read, write, delete files
│   │   ├── models/              # LLM model listing
│   │   │   └── route.ts         # Get available models from Ollama/LM Studio
│   │   ├── model-info/          # Model metadata
│   │   │   └── route.ts         # Get model details (size, context, etc.)
│   │   └── search/              # Search proxy
│   │       └── route.ts         # Proxy for Perplexica/SearXNG (CORS bypass)
│   ├── components/              # React components
│   │   ├── Chat/                # AI chat interface
│   │   │   └── ChatPanel.tsx    # Main chat component with streaming
│   │   ├── Council/             # Council of Writers feature
│   │   │   └── CouncilPanel.tsx # Multi-model review interface
│   │   ├── Editor/              # Document editor
│   │   │   ├── MarkdownEditor.tsx    # CodeMirror wrapper
│   │   │   └── EditorToolbar.tsx     # Formatting toolbar
│   │   ├── FileTree/            # File browser
│   │   │   └── FileTree.tsx     # Sidebar file list
│   │   ├── Header/              # App header
│   │   │   └── Header.tsx       # Model selector, settings, etc.
│   │   ├── Research/            # Search/research panel
│   │   │   └── ResearchPanel.tsx # SearXNG/Perplexica integration
│   │   └── Settings/            # Settings modal
│   │       └── Settings.tsx     # All settings tabs
│   ├── globals.css              # Global styles & CSS variables
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main page component
├── lib/                         # Shared utilities & logic
│   ├── council/                 # Council of Writers logic
│   │   └── reviewPipeline.ts    # Review orchestration, model management
│   ├── hardware/                # Hardware detection
│   │   └── detect.ts            # GPU/VRAM detection via WebGL
│   ├── llm/                     # LLM utilities
│   │   ├── modelManager.ts      # Model loading/unloading for VRAM management
│   │   └── tools.ts             # Document operation tools for AI
│   ├── search/                  # Search integration
│   │   └── searchService.ts     # Perplexica/SearXNG client
│   ├── store/                   # Zustand stores
│   │   ├── useAppStore.ts       # Main app state (documents, UI)
│   │   ├── useCouncilStore.ts   # Council of Writers state
│   │   ├── useSearchStore.ts    # Research panel state
│   │   └── useSettingsStore.ts  # Settings & hardware state
│   └── utils.ts                 # Utility functions (cn, etc.)
├── types/                       # TypeScript type definitions
│   └── council.ts               # Council types, reviewer configs
├── public/                      # Static assets
├── package.json                 # Dependencies & scripts
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── DEVELOPMENT.md               # This file
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

// Key actions:
- setModel(model)                       // Change active model
- loadDocument(path)                    // Load file from disk
- updateDocumentContent(content)        // Update editor content
- sendMessage(message)                  // Send chat message to AI
```

#### `useSettingsStore.ts` - Settings & Hardware
```typescript
// Key state:
- writingPreset: WritingPreset          // academic, creative, etc.
- temperature, topP, topK, repeatPenalty // LLM parameters
- contextLength: number                  // Active context window
- hardwareInfo: HardwareInfo            // GPU detection results
- serviceURLs: ServiceURLs              // Custom service endpoints

// Key actions:
- setWritingPreset(preset)              // Apply preset parameters
- selectGPU(gpuId)                      // Manual GPU selection
- optimizeForWriting()                  // Auto-optimize settings
- setServiceURL(service, url)           // Custom port configuration
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

### LLM Integration

#### Chat Flow (ChatPanel.tsx → Ollama)
```
1. User types message
2. ChatPanel calls sendMessage()
3. Build prompt with system message + history + document context
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

### High Priority (Next Up)
| Feature | Description | Complexity |
|---------|-------------|------------|
| **Version History** | Track document revisions, diff view, rollback | Medium |
| **Focus Mode** | Distraction-free writing, hide UI elements | Low |
| **Writing Goals** | Word count targets, session tracking | Low |
| **Readability Metrics** | Flesch-Kincaid, sentence complexity | Low |

### Medium Priority
| Feature | Description | Complexity |
|---------|-------------|------------|
| **Session Memory** | Remember context across browser sessions | Medium |
| **Custom Personas** | AI writing styles/voices | Medium |
| **Prompt Library** | Saved prompts for reuse | Low |
| **Outline View** | Document structure, heading navigation | Medium |
| **PDF Export** | Export documents as PDF | Medium |
| **DOCX Export** | Export as Word documents | Medium |

### Lower Priority
| Feature | Description | Complexity |
|---------|-------------|------------|
| **Bibliography Generation** | Automatic reference list | High |
| **Multi-Document Projects** | Project-level organization | High |
| **Citation Formats** | Academic citation management | Medium |
| **Collaboration** | Multi-user editing (complex, may conflict with "local" philosophy) | Very High |

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

---

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Ollama installed and running
- (Optional) SearXNG for search features
- (Optional) Perplexica for AI-powered search

### Installation
```bash
# Clone repository
git clone https://github.com/lafintiger/SanctumWriter.git
cd SanctumWriter

# Install dependencies
npm install

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
2. Add handler in `ChatPanel.tsx` tool execution
3. Update system prompt to describe the tool

---

## Contact & Contributing

This is a personal project. Feel free to fork and modify for your own use.

**Repository:** https://github.com/lafintiger/SanctumWriter

---

*This document should be updated whenever significant changes are made to the architecture or features.*

