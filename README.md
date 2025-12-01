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

### Prerequisites

You need one of the following running locally:

**Option 1: Ollama** (Recommended)
```bash
# Install from https://ollama.ai
ollama pull qwen3:latest    # Recommended for writing
ollama serve
```

**Option 2: LM Studio**
1. Download from https://lmstudio.ai
2. Load a model
3. Start the local server

### Installation

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

Configure your local services in the Settings modal:

| Service | Default URL | Purpose |
|---------|-------------|---------|
| Ollama | `http://localhost:11434` | Local LLM inference |
| LM Studio | `http://localhost:1234` | Alternative local LLM |
| SearXNG | `http://localhost:4000` | Privacy-focused search |
| Perplexica | `http://localhost:3000` | AI-powered search |

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
