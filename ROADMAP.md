# SanctumWriter Roadmap 🗺️

> Your private sanctuary for writing with AI

## Vision

A local-first, privacy-focused writing environment that combines the power of local LLMs with intelligent review, research capabilities, and professional publishing tools.

---

## Feature Backlog

### Phase 1: Writer Optimization 🎛️
**Goal**: Optimize LLM settings based on hardware and use case

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **VRAM Detection** | Detect available GPU memory on the machine | P0 | 🔲 |
| **Model Size Analysis** | Query Ollama/LM Studio for model parameter count & quantization | P0 | 🔲 |
| **Auto-Configuration** | Suggest optimal context length based on VRAM/model | P0 | 🔲 |
| **Writing Presets** | Pre-configured settings for different writing styles | P1 | 🔲 |
| **Temperature Control** | Adjustable creativity slider (conservative → creative) | P1 | 🔲 |
| **Top-P / Top-K Controls** | Advanced sampling parameters in settings | P2 | 🔲 |
| **Context Window Display** | Show how much context is being used vs available | P1 | 🔲 |
| **Memory Management** | Warn when approaching context limits | P1 | 🔲 |
| **Streaming Speed Control** | Adjust token generation speed for readability | P2 | 🔲 |

**Technical Notes**:
- Query Ollama `/api/show` for model details
- Use WebGL/navigator.gpu for VRAM detection
- Create writing presets: Academic, Creative, Business, Technical, Journalism

---

### Phase 2: Council of Writers 👥 ✅
**Goal**: Multi-model review system with specialized experts

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **Model Roster** | Define multiple models with specializations | P0 | ✅ |
| **Review Pipeline** | Sequential or parallel review by multiple models | P0 | ✅ |
| **Specialized Reviewers** | Configure models for Medical, Legal, Social, Technical | P0 | ✅ |
| **Review Comments** | Inline annotations from each reviewer | P1 | ✅ |
| **Consensus View** | Aggregate feedback from all reviewers | P1 | ✅ |
| **Custom Reviewer Prompts** | Define system prompts for each reviewer role | P1 | ✅ |
| **Review History** | Track what each model suggested | P2 | 🔲 |
| **Accept/Reject Suggestions** | Per-reviewer suggestion management | P1 | ✅ |
| **Reviewer Confidence Scores** | Each reviewer rates their confidence | P2 | 🔲 |
| **Batch Review** | Review entire document or selected sections | P1 | ✅ |

**Suggested Reviewer Roles**:
| Role | Icon | Purpose | Suggested Models |
|------|------|---------|------------------|
| **Fact Checker** | 📚 | Verify claims and statistics | llama3, qwen |
| **Legal Reviewer** | ⚖️ | Flag liability issues, compliance | legal-specific fine-tunes |
| **Medical Reviewer** | 🏥 | Validate health information | medllama, meditron |
| **Cultural Sensitivity** | 🌐 | Check for bias, inclusivity | general purpose |
| **Style Editor** | ✍️ | Grammar, flow, readability | writing-focused models |
| **Technical Accuracy** | 🔬 | Domain-specific validation | domain-specific models |
| **SEO Optimizer** | 🔍 | Search engine optimization | general purpose |
| **Accessibility Checker** | ♿ | Plain language, readability | general purpose |

---

### Phase 3: Quality Assurance 🔍
**Goal**: Detect and fix AI artifacts and accuracy issues

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **AI Artifact Removal** | Detect and remove em-dashes, "delve", "I cannot", etc. | P0 | 🔲 |
| **Hallucination Detection** | Cross-reference claims against source docs | P1 | 🔲 |
| **Consistency Checker** | Detect contradictions within document | P1 | 🔲 |
| **Citation Verification** | Validate that citations exist and are accurate | P2 | 🔲 |
| **Confidence Scoring** | Rate how confident the AI is in its statements | P2 | 🔲 |
| **Source Attribution** | Track which parts came from AI vs human | P1 | 🔲 |
| **Readability Metrics** | Flesch-Kincaid, grade level scoring | P1 | 🔲 |
| **Tone Analysis** | Formal/informal, positive/negative sentiment | P2 | 🔲 |
| **Plagiarism Detection** | Check against known sources (local) | P2 | 🔲 |
| **Grammar & Style Check** | Beyond basic spell-check | P1 | 🔲 |

**AI Artifact Patterns to Detect & Fix**:
```
Common Artifacts:
├── Em-dashes (—) → regular dashes or restructure
├── "Delve into" → "explore" or "examine"
├── "It's important to note" → remove or rephrase
├── "I cannot/I'm unable" → rephrase without AI voice
├── "As an AI" → remove entirely
├── "Certainly!" / "Absolutely!" → remove
├── "In conclusion" (overused) → vary conclusions
├── Excessive hedging language
├── Repetitive transition phrases
├── "Let me explain" → just explain
└── "Great question!" → remove
```

---

### Phase 4: RAG & Research 📚
**Goal**: Reference documents and maintain accuracy with retrieval

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **Document Ingestion** | Upload PDFs, DOCX, TXT as reference material | P0 | 🔲 |
| **Embedding Generation** | Use local embedding models (nomic, bge-m3) | P0 | 🔲 |
| **Vector Storage** | Local vector DB (sqlite-vec or ChromaDB) | P0 | 🔲 |
| **Semantic Search** | Query reference docs during writing | P1 | 🔲 |
| **Auto-Citation** | Automatically cite sources when referencing | P1 | 🔲 |
| **Context Injection** | Automatically include relevant snippets in prompts | P1 | 🔲 |
| **Source Panel** | View retrieved sources alongside editor | P1 | 🔲 |
| **Knowledge Base Management** | Organize, tag, and manage reference documents | P2 | 🔲 |
| **Chunk Visualization** | See how documents are chunked | P2 | 🔲 |
| **Relevance Tuning** | Adjust how many/which sources are included | P2 | 🔲 |

**Embedding Model Options**:
| Model | Size | Best For |
|-------|------|----------|
| `nomic-embed-text` | 274M | General purpose, good balance |
| `bge-m3` | 568M | Multilingual support |
| `mxbai-embed-large` | 335M | High quality English |
| `all-minilm` | 23M | Fast, lightweight |

---

### Phase 5: Online Research 🌐
**Goal**: Privacy-respecting web search via Perplexity/SearXNG

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **Perplexity Integration** | Search the web via Perplexity API | P0 | 🔲 |
| **Research Mode** | Dedicated mode for fact-finding | P0 | 🔲 |
| **Search Panel** | View search results alongside editor | P1 | 🔲 |
| **Source Import** | Pull search results into RAG knowledge base | P1 | 🔲 |
| **Fact Verification** | Cross-reference claims against web sources | P1 | 🔲 |
| **Citation Generation** | Auto-generate citations from web sources | P1 | 🔲 |
| **Search History** | Track research queries and results | P2 | 🔲 |
| **Summarize Sources** | AI summarizes search results | P1 | 🔲 |
| **Deep Research Mode** | Multi-query comprehensive research | P2 | 🔲 |

**Privacy Architecture**:
```
User Query
    ↓
SanctumWriter (Local)
    ↓
Perplexity API
    ↓
SearXNG (Meta-search)
    ↓
Multiple Search Engines
    
Benefits:
✓ No direct connection to Google/Bing
✓ Query aggregation masks individual searches
✓ Results processed locally
✓ No tracking cookies
```

---

### Phase 6: Writing Enhancement ✍️
**Goal**: Professional writing tools and workflows

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **Writing Modes** | Academic, Creative Fiction, Business, Journalism, Technical | P0 | 🔲 |
| **Template Library** | Pre-built document templates | P1 | 🔲 |
| **Outline View** | Hierarchical document structure navigation | P0 | 🔲 |
| **Focus Mode** | Distraction-free full-screen writing | P1 | 🔲 |
| **Writing Goals** | Word count targets, session timers | P1 | 🔲 |
| **Version History** | Local version snapshots with diff view | P0 | 🔲 |
| **Session Memory** | AI remembers context across writing sessions | P1 | 🔲 |
| **Writing Statistics** | Words, sentences, paragraphs, reading time | P1 | 🔲 |
| **Daily Writing Streak** | Gamification for consistency | P2 | 🔲 |
| **Pomodoro Timer** | Built-in focus timer | P2 | 🔲 |

**Writing Mode Presets**:
| Mode | Temperature | Style | Use Case |
|------|-------------|-------|----------|
| Academic | 0.3 | Formal, precise | Research papers, dissertations |
| Creative | 0.8 | Expressive, varied | Fiction, poetry, scripts |
| Business | 0.4 | Professional, clear | Reports, proposals, emails |
| Journalism | 0.5 | Factual, engaging | Articles, news, features |
| Technical | 0.2 | Precise, structured | Documentation, manuals |
| Casual | 0.7 | Conversational | Blogs, social, personal |

---

### Phase 7: Export & Publishing 📤
**Goal**: Professional output formats and publishing workflows

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **PDF Export** | Beautiful PDF generation with styles | P0 | 🔲 |
| **DOCX Export** | Microsoft Word compatible | P0 | 🔲 |
| **HTML Export** | Web-ready output | P1 | 🔲 |
| **ePub Export** | E-book format | P2 | 🔲 |
| **LaTeX Export** | Academic publishing format | P2 | 🔲 |
| **Citation Formats** | APA, MLA, Chicago, Harvard auto-formatting | P1 | 🔲 |
| **Bibliography Generation** | Auto-generate works cited from sources | P1 | 🔲 |
| **Custom Themes** | Export styling templates | P2 | 🔲 |
| **Print Optimization** | Print-ready layouts | P2 | 🔲 |
| **Table of Contents** | Auto-generated from headings | P1 | 🔲 |

---

### Phase 8: Organization & Projects 📁
**Goal**: Manage complex writing projects

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **Multi-Document Projects** | Workspaces for books, research papers | P0 | 🔲 |
| **Project Templates** | Novel, Research Paper, Blog Series, etc. | P1 | 🔲 |
| **Note Cards** | Collect snippets, ideas, research notes | P1 | 🔲 |
| **Mind Mapping** | Visual idea organization | P2 | 🔲 |
| **Document Linking** | Wiki-style links between documents | P1 | 🔲 |
| **Tags & Categories** | Organize documents with metadata | P1 | 🔲 |
| **Search Across Projects** | Find content in any document | P1 | 🔲 |
| **Archive & Trash** | Soft delete with recovery | P1 | 🔲 |
| **Import from Other Apps** | Obsidian, Notion, Google Docs import | P2 | 🔲 |
| **Backup & Sync** | Local backup, optional cloud sync | P2 | 🔲 |

---

### Phase 9: AI Customization 🤖
**Goal**: Personalize AI behavior and capabilities

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **Custom Personas** | Define AI writing voices and styles | P0 | 🔲 |
| **Prompt Library** | Save and reuse effective prompts | P0 | 🔲 |
| **Writing Style Learning** | AI learns your writing patterns | P1 | 🔲 |
| **Custom Tools** | Define new document operations | P2 | 🔲 |
| **Fine-tuning Integration** | Use custom fine-tuned models | P3 | 🔲 |
| **Persona Marketplace** | Share/download community personas | P3 | 🔲 |
| **Context Templates** | Pre-built context for specific domains | P1 | 🔲 |
| **Memory Management** | What AI remembers about your style | P1 | 🔲 |

---

### Phase 10: Image Studio 🎨 ✅
**Goal**: Generate images for writing using local Stable Diffusion

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| **ComfyUI Integration** | Connect to local ComfyUI instance | P0 | ✅ |
| **Prompt Input** | Natural language image descriptions | P0 | ✅ |
| **From Selection** | Extract prompts from document text | P0 | ✅ |
| **AI Enhance** | LLM-powered prompt expansion | P0 | ✅ |
| **Aspect Ratio Presets** | Square, Blog Header, Portrait, Book Cover, Photo, Cinematic | P0 | ✅ |
| **Generation Progress** | Real-time status and progress indicator | P1 | ✅ |
| **Cancel Generation** | Interrupt running generations | P1 | ✅ |
| **Save to Workspace** | Save images to workspace folder | P0 | ✅ |
| **Generation History** | Persistent history of generated images | P1 | ✅ |
| **Thumbnail Gallery** | Visual gallery of past generations | P1 | ✅ |
| **Full-Size Preview** | Modal preview with metadata | P1 | ✅ |
| **Insert to Document** | Add image markdown to document | P0 | ✅ |
| **Copy Path** | Copy image path to clipboard | P1 | ✅ |
| **Connection Status** | Show ComfyUI connection state | P1 | ✅ |
| **Custom Workflow** | Support for custom ComfyUI workflows | P2 | 🔲 |
| **LoRA Support** | Select LoRA models for generation | P2 | 🔲 |
| **Image-to-Image** | Use existing images as input | P2 | 🔲 |

**Technical Notes**:
- Uses ComfyUI API for image generation
- Default workflow: Z-Image Turbo (GGUF quantized)
- Images saved to workspace `./images/generated/`
- AI Enhance uses active Ollama model for prompt expansion

**Example Personas**:
```yaml
Ernest Hemingway:
  style: "Short, punchy sentences. Strong verbs. No adverbs."
  temperature: 0.4
  instructions: "Write with economy. Every word must earn its place."

Academic Researcher:
  style: "Formal, evidence-based, hedged appropriately"
  temperature: 0.3
  instructions: "Cite sources. Use passive voice sparingly. Be precise."

Creative Storyteller:
  style: "Vivid imagery, varied sentence structure, emotional"
  temperature: 0.8
  instructions: "Show don't tell. Create atmosphere. Surprise the reader."
```

---

## Priority Legend

| Priority | Meaning | Timeline |
|----------|---------|----------|
| **P0** | Core feature, blocks phase completion | This phase |
| **P1** | Important, significant value add | This phase |
| **P2** | Nice to have, enhances experience | Next phase |
| **P3** | Future consideration, advanced feature | Backlog |

## Status Legend

| Icon | Meaning |
|------|---------|
| 🔲 | Not started |
| 🔶 | In progress |
| ✅ | Complete |
| ❌ | Blocked/Cancelled |

---

## Development Phases

```
Phase 1: Writer Optimization     ██████████  [COMPLETE ✅]
Phase 2: Council of Writers      ██████████  [COMPLETE ✅]
Phase 3: Quality Assurance       ░░░░░░░░░░  [NEXT UP]
Phase 4: RAG & Research          ░░░░░░░░░░  [PLANNED]
Phase 5: Online Research         ░░░░░░░░░░  [PLANNED]
Phase 6: Writing Enhancement     ░░░░░░░░░░  [PLANNED]
Phase 7: Export & Publishing     ░░░░░░░░░░  [PLANNED]
Phase 8: Organization            ░░░░░░░░░░  [PLANNED]
Phase 9: AI Customization        ░░░░░░░░░░  [PLANNED]
Phase 10: Image Studio           ██████████  [COMPLETE ✅]
```

---

## Core Principles

1. **Local-First**: All core functionality works offline
2. **Privacy-Respecting**: Data stays on user's machine
3. **Model Agnostic**: Works with any Ollama/LM Studio model
4. **Non-Destructive**: Never lose user's work
5. **Transparent**: User always knows what AI is doing
6. **Extensible**: Easy to add new features and integrations

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SanctumWriter                            │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Next.js + React)                                 │
│  ├── Editor (CodeMirror)                                    │
│  ├── Chat Panel                                             │
│  ├── File Browser                                           │
│  ├── Review Panel (Council)                                 │
│  ├── Research Panel (Perplexity)                           │
│  └── Settings                                               │
├─────────────────────────────────────────────────────────────┤
│  State Management (Zustand)                                 │
│  ├── Document State                                         │
│  ├── Chat History                                           │
│  ├── Review State                                           │
│  └── Settings                                               │
├─────────────────────────────────────────────────────────────┤
│  AI Services                                                │
│  ├── LLM Client (Ollama/LM Studio)                         │
│  ├── Embedding Service                                      │
│  ├── Review Pipeline                                        │
│  └── Quality Checker                                        │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── File System (Documents)                                │
│  ├── Vector DB (RAG)                                        │
│  ├── Settings Store                                         │
│  └── Version History                                        │
├─────────────────────────────────────────────────────────────┤
│  External Services (Optional)                               │
│  ├── Perplexity API (Research)                             │
│  └── Future integrations                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Contributing

Features are developed one phase at a time. Each phase builds on the previous.

To contribute:
1. Pick an unassigned feature from the current phase
2. Create a feature branch
3. Implement with tests
4. Submit PR

---

*Last Updated: December 2025*
*Version: 1.4.0*
