<div align="center">

<br/>

<img src="https://img.shields.io/badge/⚡-SketchFlow_AI-7c3aed?style=for-the-badge&labelColor=0a0a0a&color=7c3aed" alt="SketchFlow AI" height="45"/>

<br/><br/>

# SketchFlow AI

### *Sketch it. Code it. Ship it.*

**Transform whiteboard photos, hand-drawn sketches, and plain-English descriptions**
**into production-ready Mermaid and PlantUML diagram code — instantly.**

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-sktech--ai.vercel.app-7c3aed?style=for-the-badge&labelColor=13131f)](https://sktech-ai.vercel.app)
[![Backend API](https://img.shields.io/badge/⚙️_Backend-sktechai.onrender.com-46E3B7?style=for-the-badge&labelColor=13131f)](https://sktechai.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge&labelColor=13131f)](LICENSE)

<br/>

![Python](https://img.shields.io/badge/Python_3.11-3776ab?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_18-61dafb?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_5-646cff?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-RAG-ff6b35?style=flat-square)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black)

<br/>

> ⚡ **Try it live** — no signup, no credit card, no install.
> Upload a whiteboard photo or type a description and watch it generate Mermaid + PlantUML code in seconds.

</div>

---

## 📸 What It Does

<table>
<tr>
<th align="center">📸 Upload a Photo</th>
<th align="center">✍️ Describe in Text</th>
<th align="center">💬 Chat to Refine</th>
</tr>
<tr>
<td>Drop any whiteboard, napkin sketch, or diagram screenshot</td>
<td>Type what you need in plain English — no diagram knowledge required</td>
<td>Ask the AI to modify, convert, or extend — it remembers context</td>
</tr>
<tr>
<td>Gemini Vision extracts every element and relationship</td>
<td>LLM understands your intent and generates clean code</td>
<td>Code updates live in the result panel as you chat</td>
</tr>
<tr>
<td colspan="3" align="center">RAG pipeline retrieves exact syntax rules from official docs before every generation — no invented syntax, ever</td>
</tr>
<tr>
<td colspan="3" align="center"><strong>Output: Valid Mermaid + PlantUML code with live whiteboard-style preview</strong></td>
</tr>
</table>

---

## ✨ Feature Highlights

<table>
<tr>
<td width="50%" valign="top">

### 🎯 Core Intelligence
- **Multimodal Input** — images, text, or both simultaneously
- **RAG Pipeline** — ChromaDB + Gemini embeddings retrieve diagram-specific syntax rules before every generation — the LLM never invents invalid syntax
- **Context-Aware Chat** — AI sees your uploaded image, current diagram code, and full conversation history in every message
- **Auto Code Sync** — when chat generates updated code, the result panel updates automatically without any clicks

</td>
<td width="50%" valign="top">

### 🛡️ Built for Reliability
- **Vision Fallback Chain** — Gemini 2.5 → 2.0 → 1.5 Flash → 3 OpenRouter vision models
- **Text Fallback Chain** — Groq LLaMA 3.3 70B → DeepSeek R1 → LLaMA 3.3 70B → Mistral 7B (all via OpenRouter free tier)
- **Zero Hard Crashes** — every provider failure degrades gracefully with a clear user message, never a raw 500 error
- **Quota Resilience** — hitting rate limits on one model silently falls through to the next

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🎨 Developer Experience
- **Live Editable Code** — edit Mermaid or PlantUML directly in the browser; preview debounces 800ms and re-renders
- **Reset to AI** — one click to restore the original generated code after manual edits
- **Edit Indicator** — amber dot on the tab shows which formats have unsaved manual changes
- **Whiteboard Preview** — dot-grid canvas, violet-tinted boxes, dark text — actually readable class diagrams

</td>
<td width="50%" valign="top">

### 🔒 Privacy First
- **Client-Side Chat Memory** — conversation history lives in browser `localStorage`, never on the server, never shared across devices
- **BYOK (Bring Your Own Keys)** — paste Gemini / Groq / OpenRouter keys in Settings; they go directly to the provider, never stored server-side
- **In-Memory Vector DB** — ChromaDB runs without writing to disk on the server
- **No Ads. No Tracking.** — pure utility tool

</td>
</tr>
</table>

---

## 🏗️ System Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║                     BROWSER — Vercel CDN                         ║
║                                                                  ║
║  ┌──────────────────────┐     ┌───────────────────────────────┐  ║
║  │    Upload Panel       │     │        Result Panel           │  ║
║  │                       │     │                               │  ║
║  │  Image Drop Zone      │     │  Live Mermaid Preview         │  ║
║  │  Text Prompt          │     │  (dot-grid whiteboard theme)  │  ║
║  │  Type + Format Select │     │                               │  ║
║  │  Generate Button      │     │  Editable Code Editor         │  ║
║  │                       │     │  (800ms debounce preview)     │  ║
║  │  AI Chat Panel        │     │                               │  ║
║  │  (localStorage mem)   │     │  Elements Inspector           │  ║
║  └──────────┬────────────┘     └───────────────────────────────┘  ║
║             │  React 18 + Vite 5 + Tailwind CSS                   ║
╚═════════════╪════════════════════════════════════════════════════╝
              │
              │  REST  ──→  POST /api/analyze
              │  SSE   ──→  POST /api/chat  (streaming tokens)
              ▼
╔══════════════════════════════════════════════════════════════════╗
║                  FASTAPI BACKEND — Render                        ║
║                                                                  ║
║  /api/analyze                      /api/chat                     ║
║       │                                 │                        ║
║       ▼                                 ▼                        ║
║  Vision Service                   stream_chat_with_context()     ║
║  Gemini 2.5 → 2.0 → 1.5           System prompt includes:       ║
║  → OpenRouter vision x3            current code + image          ║
║                                    + chat history + syntax rules  ║
║       │                                 │                        ║
║       └────────────┬────────────────────┘                        ║
║                    ▼                                             ║
║             RAG Service (Singleton)                              ║
║             ChromaDB in-memory — 6 collections                   ║
║             mermaid_flowchart  mermaid_sequence                  ║
║             mermaid_class      mermaid_er                        ║
║             plantuml_class     plantuml_sequence                 ║
║             gemini-embedding-001 → cosine similarity search      ║
║             Top-k syntax chunks injected into LLM prompt         ║
║                    │                                             ║
║                    ▼                                             ║
║             Code Generation (Fallback Chain)                     ║
║             Groq LLaMA 3.3 70B                                   ║
║             → DeepSeek R1 free                                   ║
║             → LLaMA 3.3 70B free                                 ║
║             → Mistral 7B free                                    ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **FastAPI** | Latest | REST API + SSE streaming |
| Vision AI | **Google Gemini** | `gemini-2.5-flash` | Primary image analysis |
| Embeddings | **Google Gemini** | `gemini-embedding-001` | RAG vector embeddings |
| Text Generation | **Groq** | `llama-3.3-70b-versatile` | Primary code generation |
| Fallback | **OpenRouter** | Multiple free models | Vision + text fallback chain |
| Vector DB | **ChromaDB** | Latest | In-memory RAG — 6 collections |
| Runtime | **Python** | 3.11+ | |

### Frontend
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| UI Framework | **React** | 18 | Component-based UI |
| Build Tool | **Vite** | 5 | Dev server + production build |
| Styling | **Tailwind CSS** | 3.4 | Utility-first CSS |
| Diagram Render | **Mermaid.js** | 10.6 | Live whiteboard-style preview |
| HTTP Client | **Axios** | 1.7 | REST API calls |
| Persistence | **localStorage** | Browser API | Client-side chat memory |

### Infrastructure
| Service | Provider | Tier | Notes |
|---|---|---|---|
| Frontend Hosting | **Vercel** | Free | Auto-deploy on push |
| Backend Hosting | **Render** | Free | Auto-deploy on push |
| CI/CD | **GitHub Actions** | Free | Push → deploy |

---

## 📂 Project Structure

```
sktechAI/
├── backend/
│   ├── main.py                    # FastAPI app + lifespan + CORS
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── analyze.py             # POST /api/analyze
│   │   └── chat.py                # POST /api/chat (SSE streaming)
│   └── services/
│       ├── vision.py              # Gemini Vision + OpenRouter fallback
│       ├── rag.py                 # ChromaDB singleton (6 collections)
│       ├── codegen.py             # generate_code() + stream_chat_with_context()
│       ├── docs_loader.py         # Hardcoded diagram syntax docs
│       └── memory.py              # Legacy compatibility
│
├── frontend/
│   ├── index.html                 # Inline SVG favicon
│   ├── vite.config.js             # Dev proxy /api → localhost:8000
│   ├── tailwind.config.js         # Violet/graphite design tokens
│   └── src/
│       ├── App.jsx                # Root — lifted state (image, code, format)
│       ├── config.js              # API base URL (env-aware)
│       ├── index.css              # Tailwind + scrollbar + whiteboard mixin
│       ├── hooks/
│       │   └── useChatMemory.js   # localStorage chat history hook
│       └── components/
│           ├── UploadPanel.jsx    # Left panel — upload, prompt, chat
│           ├── ResultPanel.jsx    # Right panel — preview, editor, elements
│           ├── MermaidPreview.jsx # Whiteboard-style Mermaid renderer
│           └── SettingsPanel.jsx  # API key modal — localStorage only
│
├── .gitignore
├── frontend/.env.production       # VITE_API_URL=https://sktechai.onrender.com
└── README.md
```

---

## 🚀 Quick Start — Local Development

### Step 1 — Clone

```bash
git clone https://github.com/Hamzi275/sktechAI.git
cd sktechAI
```

### Step 2 — Get Free API Keys (no credit card)

| Provider | Link | Free Tier |
|---|---|---|
| **Gemini** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | 1500 req/day |
| **Groq** | [console.groq.com/keys](https://console.groq.com/keys) | 30 req/min |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | Free models available |

### Step 3 — Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
```

```bash
uvicorn main:app --reload --port 8000
```

Success output:
```
INFO: SketchFlow AI ready — 6 collections, 16 chunks loaded
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Step 4 — Frontend Setup

```bash
# New terminal
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 🌍 Production Deployment

### Backend → Render

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Environment | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Environment Variables:
```
GEMINI_API_KEY      = your_key
GROQ_API_KEY        = your_key
OPENROUTER_API_KEY  = your_key
FRONTEND_URL        = https://your-app.vercel.app
```

### Frontend → Vercel

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Environment Variable:
```
VITE_API_URL = https://sktechai.onrender.com
```

### Auto-Deploy

```
git push origin main
       │
       ├── Vercel detects push → builds frontend → live in ~2 min
       └── Render detects push → installs deps → live in ~3 min
```

---

## 🔌 API Reference

### `POST /api/analyze`

```json
{
  "image_base64": "string | null",
  "filename": "diagram.jpg",
  "diagram_type": "auto | flowchart | sequence | class | er | architecture",
  "output_format": "auto | mermaid | plantuml",
  "user_prompt": "optional instructions"
}
```

Response:
```json
{
  "detected_type": "flowchart",
  "description": "A user authentication flow",
  "mode": "image | text",
  "outputs": [
    { "format": "mermaid", "code": "graph TD...", "preview_supported": true },
    { "format": "plantuml", "code": "@startuml...", "preview_supported": false }
  ],
  "elements": [{ "name": "User", "type": "actor" }],
  "citations": [{ "title": "Mermaid Flowchart", "url": "https://mermaid.js.org/..." }]
}
```

### `POST /api/chat` — SSE Streaming

```json
{
  "message": "Make it a sequence diagram",
  "current_code": "graph TD...",
  "current_format": "mermaid",
  "diagram_type": "auto",
  "image_base64": "base64_or_empty",
  "image_filename": "sketch.png",
  "chat_history": [{ "role": "user", "content": "..." }]
}
```

Optional headers:
```
X-User-Gemini-Key:     AIza...
X-User-Groq-Key:       gsk_...
X-User-Openrouter-Key: sk-or-...
```

---

## 🔄 Fallback Chains

```
Image Analysis (Vision)
  1. gemini-2.5-flash          Google AI Studio
  2. gemini-2.0-flash          Google AI Studio
  3. gemini-1.5-flash          Google AI Studio
  4. google/gemini-flash-1.5   OpenRouter
  5. llama-3.2-11b-vision:free OpenRouter
  6. qwen-2-vl-7b:free         OpenRouter

Code Generation and Chat (Text)
  1. llama-3.3-70b-versatile       Groq (primary)
  2. deepseek/deepseek-r1:free     OpenRouter
  3. llama-3.3-70b-instruct:free   OpenRouter
  4. mistral-7b-instruct:free      OpenRouter

Embeddings (RAG)
  1. gemini-embedding-001          Required for RAG pipeline
```

---

## 🧠 How the RAG Pipeline Works

```
Startup — runs once
  6 diagram syntax docs loaded into ChromaDB
  Each doc chunked (~400 chars, 50 char overlap)
  Each chunk embedded via gemini-embedding-001
  Stored in 6 in-memory ChromaDB collections

Per Request — runs every time
  User prompt embedded with Gemini
  Cosine similarity search across relevant collections
  Top-k syntax chunks retrieved
  Chunks injected as SYNTAX RULES in LLM prompt
  LLM generates standards-compliant code
  No invented syntax — rules are always grounded in docs
```

---

## 🔒 Security Model

**API Keys**
- Entered in Settings modal
- Stored in browser `localStorage` only
- Sent as `X-User-*-Key` request headers
- Backend forwards to provider directly
- Never stored in any database
- Never logged server-side

**Chat History**
- Stored in browser `localStorage` only
- Sent to backend per-request in request body
- Backend does not persist it anywhere
- Automatically cleared on new image upload

---

## 🐛 Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| First request takes 30-60s | Render free tier cold start | Wait — subsequent requests are fast |
| "All providers failed" | No API keys configured | Add keys in Settings or backend `.env` |
| Preview shows syntax error | LLM generated slightly invalid syntax | Edit code manually or ask chat to fix it |
| PlantUML has no preview | Requires Java server | Copy code → paste at [plantuml.com](https://www.plantuml.com/plantuml) |
| Chat does not see image | Image not attached | Ensure thumbnail is still visible in upload panel |
| Words joined in chat reply | SSE parsing bug (pre-v4) | Update to latest version |
| CORS error in console | FRONTEND_URL not set | Add your Vercel URL to Render environment variables |

---

## 🗺️ Roadmap

- [ ] Export to PNG/SVG — download rendered diagrams as image files
- [ ] Diagram History — save and revisit previously generated diagrams
- [ ] Share Link — generate shareable URL for a diagram
- [ ] PlantUML Live Preview — render PlantUML in-browser without Java server
- [ ] Multi-diagram Canvas — work on multiple diagrams side by side
- [ ] VS Code Extension — generate diagrams directly from your editor
- [ ] GitHub Integration — auto-generate architecture diagrams from repos

---

## 🤝 Contributing

```bash
git clone https://github.com/YOUR_USERNAME/sktechAI.git
cd sktechAI
git checkout -b feature/your-feature-name
git commit -m "feat: describe your change clearly"
git push origin feature/your-feature-name
```

Open a Pull Request on GitHub. Keep PRs focused — one feature or fix per PR.

---

## 📄 License

MIT License — Copyright (c) 2025 Hamzi275

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

---

<div align="center">

**Built by [Hamzi275](https://github.com/Hamzi275)**

*Powered by Google Gemini · Groq · OpenRouter · FastAPI · React*

<br/>

[![GitHub stars](https://img.shields.io/github/stars/Hamzi275/sktechAI?style=social)](https://github.com/Hamzi275/sktechAI)
[![Live Demo](https://img.shields.io/badge/Try_It-Live-7c3aed?style=flat-square)](https://sktech-ai.vercel.app)

</div>
