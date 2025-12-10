# SanctumWriter ✍️

> **Your private sanctuary for writing with AI — 100% Local, 100% Yours**

A local-first markdown editor that uses your own LLMs (Ollama/LM Studio) as a collaborative writing companion. Like Cursor for code, but for prose.

![SanctumWriter](https://img.shields.io/badge/Status-Beta-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Local](https://img.shields.io/badge/100%25-Local-purple) ![Privacy](https://img.shields.io/badge/Privacy-First-orange)

---

## 🔐 Why SanctumWriter?

| Feature | SanctumWriter | Other AI Writers |
|---------|---------------|------------------|
| **Privacy** | ✅ 100% local - nothing leaves your machine | ❌ Data sent to cloud servers |
| **Cost** | ✅ Free forever (uses your local LLMs) | ❌ Monthly subscriptions |
| **Internet** | ✅ Works offline | ❌ Requires connection |
| **Your Data** | ✅ Stored locally, you control it | ❌ Stored on company servers |
| **Open Source** | ✅ MIT License | ❌ Usually closed source |

---

## 🆚 SanctumWriter vs SanctumWriter Pro

| Feature | SanctumWriter | [SanctumWriter Pro](https://github.com/lafintiger/SanctumWriterPro) |
|---------|---------------|---------------------|
| **LLM Providers** | Ollama, LM Studio (local only) | Local + OpenRouter, OpenAI, Anthropic, Google, xAI |
| **Privacy** | 100% Local | Choice of local or cloud |
| **Cost** | Free | Free + API costs |
| **Best For** | Privacy-focused writers | Writers wanting access to frontier models |
| **Port** | `localhost:3125` | `localhost:3130` |

> 💡 **Choose SanctumWriter** if privacy is paramount and you're happy with local models.  
> 💡 **Choose [Pro](https://github.com/lafintiger/SanctumWriterPro)** if you need GPT-4, Claude, or other cloud models.

---

## ✨ Features

### Core Writing
- 📝 **Rich Markdown Editor** — Full-featured editor with syntax highlighting (CodeMirror 6)
- 👁️ **Live Preview** — See rendered markdown as you type
- 📁 **Workspace Browser** — Navigate and manage your documents (Obsidian-compatible!)
- 💾 **Auto-Save** — Never lose your work

### AI Writing Companion
- 🤖 **Agentic Editing** — AI directly modifies your document (no copy/paste!)
- 🎯 **Selection-Aware** — Highlight text and ask the AI to rewrite just that section
- 💬 **Contextual Chat** — AI sees your full document and selection
- 🔧 **Hardware Optimization** — Auto-detects your GPU and optimizes settings

### Advanced Features
- 👥 **Council of Writers** — Multiple AI reviewers analyze your work
- 🔍 **Research Integration** — Search with SearXNG for fact-checking
- 📊 **Quality Assurance** — Hallucination detection, fact verification, AI artifact removal
- 📋 **Writing Workflow** — Guided checklist from outline to polish
- 📈 **Readability Metrics** — Flesch-Kincaid and other scores
- 🎯 **Focus Mode** — Distraction-free writing
- 📚 **Citations & Bibliography** — Key-based citation management
- 📤 **Export** — PDF, DOCX, HTML, TXT formats
- 🧠 **RAG Knowledge Base** — Use your documents as AI context
- 💭 **Session Memory** — AI remembers your writing preferences

---

## 🚀 Quick Start

### Prerequisites & Dependencies

SanctumWriter integrates with several local services. Here's what you need:

#### System Requirements

| Requirement | Version | Install Link |
|-------------|---------|--------------|
| **[Node.js](https://nodejs.org)** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | Included with Node.js | — |

#### LLM Backend (Pick One)

| # | Service | Purpose | Install Link |
|---|---------|---------|--------------|
| 1 | **[Ollama](https://ollama.ai)** ⭐ | Local LLM inference (recommended) | [ollama.ai](https://ollama.ai) |
| — | *OR* **[LM Studio](https://lmstudio.ai)** | Alternative local LLM with GUI | [lmstudio.ai](https://lmstudio.ai) |

#### Optional (For Advanced Features)

| # | Service | Purpose | Install Link | Requires |
|---|---------|---------|--------------|----------|
| 2 | **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** | Container runtime for search services | [docker.com](https://www.docker.com/products/docker-desktop/) | — |
| 3 | **[SearXNG](https://github.com/searxng/searxng)** | Privacy-focused web search | [GitHub](https://github.com/searxng/searxng) | Docker |
| 4 | **[Perplexica](https://github.com/ItzCrazyKns/Perplexica)** | AI-powered search with summaries | [GitHub](https://github.com/ItzCrazyKns/Perplexica) | Docker + Ollama |

#### Installation Order

```
REQUIRED (Native Install):
─────────────────────────
1. Node.js (for SanctumWriter)
2. Ollama OR LM Studio (for AI) ← Install directly, NOT in Docker

OPTIONAL (Docker-based):
────────────────────────
3. Docker Desktop (only if using search features below)
4. SearXNG (privacy search - runs in Docker)
5. Perplexica (AI search - runs in Docker)

FINALLY:
────────
6. SanctumWriter
```

> ⚠️ **Note**: Install Ollama/LM Studio natively on your machine (not in Docker). While Docker versions exist, native installation gives better performance and GPU access.

---

### Setting Up Ollama (Recommended)

```bash
# 1. Install Ollama from https://ollama.ai

# 2. Pull a writing-focused model
ollama pull qwen3:latest

# 3. Start the server (runs on port 11434)
ollama serve
```

### Setting Up LM Studio (Alternative)

1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Load a model (e.g., Llama 3, Mistral, Qwen)
3. Go to **Local Server** tab → **Start Server** (runs on port 1234)

### Setting Up Search Services (Optional)

**SearXNG** (Privacy-focused search):
```bash
# Using Docker
docker run -d --name searxng -p 4000:8080 searxng/searxng
```

**Perplexica** (AI-powered search):
```bash
# Clone and follow setup instructions
git clone https://github.com/ItzCrazyKns/Perplexica.git
cd Perplexica
# See their README for Docker setup (runs on port 3000)
```

---

### Installing SanctumWriter

#### Option A: Standard Installation (npm)

```bash
# Clone the repo
git clone https://github.com/lafintiger/SanctumWriter.git
cd SanctumWriter

# Install dependencies
npm install

# Start the app
npm run dev
```

Open **http://localhost:3125** in your browser.

#### Option B: Docker Installation 🐳

**Quick Start (uses Ollama on your host machine):**
```bash
# Clone the repo
git clone https://github.com/lafintiger/SanctumWriter.git
cd SanctumWriter

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

**With Ollama in Docker (no local Ollama needed):**
```bash
# Start app + Ollama container
docker-compose --profile ollama up -d

# Pull a model into the container
docker exec sanctum-ollama ollama pull qwen3:latest
```

**Development with hot-reloading:**
```bash
docker-compose -f docker-compose.dev.yml up
```

| Docker Command | Description |
|----------------|-------------|
| `docker-compose up -d` | Start app (connects to host Ollama) |
| `docker-compose --profile ollama up -d` | Start app + Ollama container |
| `docker-compose down` | Stop all services |
| `docker-compose logs -f` | View live logs |
| `docker-compose build --no-cache` | Rebuild after code changes |

**Environment Variables:**
```bash
# Create .env file for custom settings
OLLAMA_URL=http://host.docker.internal:11434
LMSTUDIO_URL=http://host.docker.internal:1234
DEFAULT_PROVIDER=ollama
DEFAULT_MODEL=llama3
```

> 💡 **Tip**: Your documents are persisted in `./documents` folder and LanceDB data in a Docker volume.

---

## 📖 Usage

### Basic Editing
1. Click **+** to create a new document
2. Write markdown in the editor
3. Documents auto-save as you type

### AI Assistance
1. Type a message in the chat panel
2. The AI sees your document and any selected text
3. Ask for help: *"Make this more engaging"* or *"Expand this section"*

### Selection-Based Editing
1. **Highlight text** in the editor
2. Chat shows "Selection active"
3. Ask: *"Rewrite this"* or *"Make it more concise"*
4. AI directly modifies just the selected text

### Council of Writers (Multi-Model Review)
1. Open Settings → Council Configuration
2. Enable reviewers (Style, Clarity, Fact-checker, etc.)
3. Click **Start Council Review**
4. Review suggestions in the Review Document

---

## ⚙️ Configuration

### Service URLs (Settings Panel)

Configure your local services in the Settings modal. All URLs are customizable if you use non-default ports:

| Service | Default URL | Purpose | Project |
|---------|-------------|---------|---------|
| Ollama | `http://localhost:11434` | Local LLM inference | [ollama.ai](https://ollama.ai) |
| LM Studio | `http://localhost:1234` | Alternative local LLM | [lmstudio.ai](https://lmstudio.ai) |
| SearXNG | `http://localhost:4000` | Privacy-focused search | [GitHub](https://github.com/searxng/searxng) |
| Perplexica | `http://localhost:3000` | AI-powered search | [GitHub](https://github.com/ItzCrazyKns/Perplexica) |

> 💡 **Tip**: If running services in Docker, use `localhost:PORT` — SanctumWriter runs on your host machine and can reach Docker containers via localhost.

### Workspace Folder

Set your working directory in Settings → Workspace. Works great with **Obsidian vaults**!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save document |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + F` | Find in document |
| `Escape` | Toggle Focus Mode |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Editor**: CodeMirror 6
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Vector DB**: LanceDB (for RAG)
- **LLM**: Ollama / LM Studio

---

## 🐛 Troubleshooting

### "Ollama not available"
```bash
# Make sure Ollama is running
ollama serve

# Check it's accessible
curl http://localhost:11434/api/tags
```

### Models not showing
```bash
# Pull a model first
ollama pull qwen3:latest

# Or for a smaller model
ollama pull gemma3:4b
```

### Port conflict
The app runs on port **3125** by default. If you need a different port, modify `package.json`.

---

## 📄 License

MIT - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with ❤️ for writers who value their **privacy**.

---

<div align="center">

**SanctumWriter** — *Your words. Your sanctuary. Your privacy.*

[Report Bug](https://github.com/lafintiger/SanctumWriter/issues) · [Request Feature](https://github.com/lafintiger/SanctumWriter/issues)

</div>
