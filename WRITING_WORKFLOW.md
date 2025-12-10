# SanctumWriter - Writing Workflow Checklist

A step-by-step guide to get the most out of your AI writing companion.

---

## 🚀 Initial Setup (One-Time)

- [ ] **Ollama Running** - Ensure Ollama is running (`ollama serve`)
- [ ] **Models Downloaded** - Download your preferred models (`ollama pull qwen3:latest`)
- [ ] **Hardware Configured** - Go to Settings → Hardware → Select your GPU
- [ ] **Service URLs Set** - If using custom ports, configure in Settings → Services
- [ ] **Search Services** (Optional) - Start SearXNG/Perplexica if using research features

---

## 📝 Starting a New Document

### 1. Environment Check
- [ ] Ollama connected (green indicator in header)
- [ ] Correct model selected for your task
- [ ] Workspace folder set (contains your markdown files)

### 2. Choose Your Model
| Task Type | Recommended Model Size | Why |
|-----------|----------------------|-----|
| Quick notes, brainstorming | 7B (Mistral, Llama 3.2) | Fast responses |
| Standard writing | 7B-13B (Qwen 14B, Llama 13B) | Good balance |
| Complex/technical writing | 13B-70B | Better reasoning |
| Long documents | Models with 32k+ context | More document awareness |

- [ ] Model selected based on task requirements

### 3. Configure Writing Settings
Go to **Settings → Writing Style**:

- [ ] Choose appropriate preset:
  - [ ] **Academic** - Formal, precise (research papers, essays)
  - [ ] **Creative** - Expressive, varied (fiction, poetry)
  - [ ] **Business** - Professional, clear (reports, proposals)
  - [ ] **Journalism** - Factual, engaging (articles, news)
  - [ ] **Technical** - Precise, structured (documentation)
  - [ ] **Casual** - Conversational (blogs, personal)

- [ ] Verify context length is appropriate for document size
- [ ] Temperature set appropriately (lower = focused, higher = creative)

---

## ✍️ Writing Phase

### 4. Outline Stage
- [ ] Create new document or open existing
- [ ] Ask AI to help brainstorm structure:
  > "Help me outline an article about [topic]"
- [ ] Review and refine outline
- [ ] Save outline as reference

### 5. First Draft
- [ ] Write section by section
- [ ] Use AI for assistance:
  - [ ] "Expand this point: [text]"
  - [ ] "Continue writing from here"
  - [ ] "Suggest a better way to phrase: [text]"
- [ ] Don't worry about perfection - focus on getting ideas down
- [ ] Save frequently

### 6. Draft Complete Checkpoint
- [ ] All sections have content
- [ ] Main arguments/points are present
- [ ] Document flows logically
- [ ] Ready for review phase

---

## 🔍 Review Phase

### 7. Self-Review First
Before AI review:
- [ ] Read through entire document
- [ ] Note obvious issues
- [ ] Check for completeness
- [ ] Verify tone matches intent

### 8. Council of Writers Review
Go to **Council Panel** (Users icon in header):

#### Enable Appropriate Reviewers:
- [ ] **Style Editor** - Grammar, flow, readability
- [ ] **Fact Checker** - Claims, statistics, accuracy
- [ ] **Hallucination Detector** - Fabricated facts, fake citations
- [ ] **AI Artifact Detector** - Clichéd AI phrases

#### Optional Specialized Reviewers (enable if relevant):
- [ ] **Legal Reviewer** - Liability concerns (for published content)
- [ ] **Medical Reviewer** - Health claims (for health content)
- [ ] **Cultural Sensitivity** - Bias, inclusivity (for diverse audiences)
- [ ] **Technical Accuracy** - Technical claims (for technical content)

#### Run the Review:
- [ ] Click "Start Review"
- [ ] Wait for all reviewers to complete
- [ ] Review Editor's synthesis
- [ ] Go through each suggestion

### 9. Address Review Feedback

#### Style Issues:
- [ ] Fix grammar and punctuation
- [ ] Improve awkward phrasing
- [ ] Reduce repetition
- [ ] Strengthen word choice

#### Fact Checking:
- [ ] Verify flagged claims
- [ ] Add sources where needed
- [ ] Remove unverifiable statements
- [ ] Correct any inaccuracies

#### Hallucination Check:
- [ ] Verify all statistics have sources
- [ ] Confirm quoted individuals exist and said what's attributed
- [ ] Check cited studies/papers are real
- [ ] Remove or source specific numbers

#### AI Artifact Removal:
- [ ] Replace "delve into" → "explore", "examine"
- [ ] Replace "it's important to note" → remove or rephrase
- [ ] Replace "leverage" → "use"
- [ ] Replace "landscape" (metaphorical) → specific term
- [ ] Fix repetitive transition words
- [ ] Vary sentence structures

---

## 🔬 Research & Verification

### 10. Fact Verification (if needed)
Use **Research Panel** (beaker icon):

- [ ] Search for claims that need verification
- [ ] Review AI-generated summary
- [ ] Check original sources
- [ ] Insert citations where appropriate
- [ ] Save important sources

### 11. Final Accuracy Check
- [ ] All statistics sourced
- [ ] All quotes verified
- [ ] No made-up references
- [ ] Technical terms used correctly

---

## ✅ Final Polish

### 12. Final Read-Through
- [ ] Read document aloud (catches awkward phrasing)
- [ ] Check formatting consistency
- [ ] Verify all links work
- [ ] Confirm images/media are correct

### 13. Pre-Publication Checklist
- [ ] Title is compelling and accurate
- [ ] Opening hooks the reader
- [ ] Conclusion is satisfying
- [ ] Call-to-action clear (if applicable)
- [ ] Metadata complete (tags, description, etc.)

### 14. Export/Publish
- [ ] Save final version
- [ ] Export if needed (copy markdown, future: PDF/DOCX)
- [ ] Back up document
- [ ] Publish/share

---

## 🔄 Quick Reference Cards

### AI Commands Cheat Sheet
```
"Rewrite this paragraph to be more [formal/casual/concise]"
"Expand on this point: [text]"
"Suggest 5 alternative headlines for this"
"Make this section more engaging"
"Simplify this for a general audience"
"Add more specific examples to this"
"Check this for logical consistency"
"What's missing from this argument?"
```

### Council Reviewer Quick Guide
| Reviewer | Use When |
|----------|----------|
| Style Editor | Always - catches grammar/flow issues |
| Fact Checker | Content has claims or statistics |
| Hallucination Detector | AI helped write significant portions |
| AI Artifact Detector | AI helped write; want natural voice |
| Legal Reviewer | Publishing publicly, making claims about people/companies |
| Medical Reviewer | Health, wellness, medical topics |
| Cultural Sensitivity | Diverse audience, sensitive topics |
| Technical Accuracy | Technical, scientific, or specialized content |

### Common AI Artifacts to Watch For
| Instead of... | Try... |
|---------------|--------|
| "delve into" | explore, examine, look at |
| "it's important to note" | [just state the thing] |
| "in today's world" | now, currently, today |
| "leverage" | use |
| "utilize" | use |
| "facilitate" | help, enable |
| "robust" | strong, reliable |
| "landscape" | field, area, market |
| "journey" | process, experience |
| "multifaceted" | complex, varied |

---

## 📊 Progress Tracker

Use this to track your document's progress:

```
Document: _______________________
Date Started: ___________________

[ ] Setup complete
[ ] Outline done
[ ] First draft complete
[ ] Self-review done
[ ] Council review done
[ ] Style issues fixed
[ ] Facts verified
[ ] Hallucinations removed
[ ] AI artifacts cleaned
[ ] Final polish done
[ ] Ready to publish
```

---

## 💡 Tips for Best Results

1. **Start with the right model** - Bigger isn't always better; match model to task
2. **Use presets** - They're tuned for specific writing styles
3. **Review in stages** - Don't try to fix everything at once
4. **Trust but verify** - AI is a tool, not an authority
5. **Keep your voice** - Use AI to enhance, not replace, your style
6. **Save often** - Document your progress
7. **Take breaks** - Fresh eyes catch more issues

---

*Print this checklist or keep it open alongside SanctumWriter for reference!*














