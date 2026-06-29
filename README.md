<div align="center">

# ⚡ SketchFlow AI

### *Sketch it. Code it. Ship it.*

**Multimodal AI diagram generation upload a whiteboard photo or type a description, get production-ready Mermaid & PlantUML instantly.**

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-sktech--ai.vercel.app-6d28d9?style=for-the-badge)](https://sktech-ai.vercel.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini-Vision-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=for-the-badge)](https://groq.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-RAG-FF6F00?style=for-the-badge)](https://www.trychroma.com)

**[→ Try it live — no sign-up needed](https://sktech-ai.vercel.app)**

</div>

---

## 🖥️ App Preview

<div align="center">
<img src="https://raw.githubusercontent.com/Hamzi275/sktechAI/blob/main/1.png" alt="SketchFlow AI Screenshot" width="90%" />
</div>

---

## What is SketchFlow AI?

SketchFlow AI converts rough ideas into clean, structured diagrams in seconds. Drop a whiteboard photo or describe a system in plain English, and get executable **Mermaid** or **PlantUML** code with a live visual preview and a streaming chat interface to keep refining it.

This isn't just a wrapper around a vision model. Under the hood, SketchFlow runs a verified generation loop: every diagram gets checked against real Mermaid and PlantUML syntax documentation (via ChromaDB RAG) before it ever reaches the user. If a provider is down, the pipeline cascades automatically to the next. If the syntax check fails, it retries with a tighter prompt not a different guess.

Built to demonstrate end-to-end production AI engineering: multimodal vision pipelines, RAG-augmented code generation, verified output loops, SSE streaming, and a deployed React frontend.

---

## ✨ Features

### 🖼️ Multimodal Diagram Generation
Upload any whiteboard photo, hand-drawn sketch, or architecture image. Gemini Vision analyzes the image and generates accurate Mermaid or PlantUML code flowcharts, sequence diagrams, class diagrams, ER diagrams, state machines, and more. Works from photos taken on a phone, not just clean digitized input.

### 🔁 Multi-Provider AI Fallback Chain
No single point of failure. The vision pipeline cascades through **Gemini 2.5 Flash → Gemini 2.0 Flash → Gemini 1.5 Flash → OpenRouter (3 vision models)**. Code generation falls through **Groq LLaMA 3.3 70B → OpenRouter free text models**. If a provider is rate-limited, down, or times out, the next one kicks in automatically with a hard stop condition so the loop never spins indefinitely.

### 🧠 RAG-Augmented Code Quality
ChromaDB stores the full Mermaid and PlantUML syntax documentation as vector embeddings via `gemini-embedding-001`. Every generation request retrieves the most relevant syntax rules before the model writes a single line grounding the output in what actually compiles, not what the model guesses compiles.

### ✅ Syntax Verification Loop
Generated diagram code is validated against the retrieved documentation before it reaches the frontend. This is the architectural decision that eliminated hallucinated node types and nonexistent connectors. The verifier is a separate source of truth not another LLM opinion on top of the first one.

### 💬 Streaming Diagram Chat
Refine diagrams in a dedicated chat panel. The assistant sees your current diagram code *and* the original image, streams replies token-by-token via SSE, and automatically updates the live preview when it returns corrected or extended code. No copy-paste, no page reload.

### 📱 Fully Responsive — Mobile to Desktop
Panels stack vertically on phone screens and go side-by-side from the `md` breakpoint up. Every interactive element meets the 44px touch-target minimum. Tested on actual phone screens, not just DevTools resize.

### 🔑 Bring Your Own API Keys
Users can enter their own Gemini, Groq, or OpenRouter keys via an in-app settings panel. Keys are sent as request headers and override server-side defaults — no account or sign-up required to use the full feature set.

### 🎨 Colored Live Preview
Diagrams render with a violet/blue/green-tinted color scheme on a dot-grid canvas. Each diagram type renders visually distinct class diagrams, flowcharts, and sequence diagrams all look different from each other, not uniformly washed-out.

---

## 🏗️ Architecture


---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI · Python 3.11+ |
| **Vision AI** | Gemini 2.5 / 2.0 / 1.5 Flash → OpenRouter (3 vision models) |
| **Code Generation** | Groq LLaMA-3.3-70B → OpenRouter free text models |
| **RAG / Embeddings** | ChromaDB (in-memory) · `gemini-embedding-001` |
| **Frontend** | React 18 · Vite · Tailwind CSS |
| **Diagram Rendering** | Mermaid.js · PlantUML |
| **Streaming** | Server-Sent Events (SSE) |
| **Deployment** | Render (backend) · Vercel (frontend) |

---

## 📁 Project Structure

```
sketchflow-ai/
├── backend/
│   ├── main.py                  # FastAPI app, lifespan startup, CORS
│   ├── requirements.txt
│   ├── routers/
│   │   ├── analyze.py           # POST /api/analyze
│   │   └── chat.py              # POST /api/chat, /api/chat/history
│   └── services/
│       ├── vision.py            # Gemini → OpenRouter vision fallback chain
│       ├── rag.py               # ChromaDB in-memory RAG
│       ├── docs_loader.py       # Syntax docs + optional web fetch
│       ├── codegen.py           # Groq → OpenRouter text fallback chain
│       └── memory.py            # Image-scoped chat history
└── frontend/
    ├── vite.config.js           # Proxy /api → :8000
    ├── tailwind.config.js       # Violet/graphite SketchFlow palette
    └── src/
        ├── App.jsx
        └── components/
            ├── UploadPanel.jsx       # Image drop, text prompt, chat
            ├── ResultPanel.jsx       # Pill tabs, terminal-style code blocks
            ├── MermaidPreview.jsx    # Dot-grid canvas, colored previews
            ├── SettingsPanel.jsx     # User API key modal
            └── ChatHistory.jsx       # Streamed chat + citations
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Image and/or text → diagram code |
| `POST` | `/api/chat` | Follow-up message, streamed via SSE |
| `GET` | `/api/chat/history` | Current session's chat log |
| `DELETE` | `/api/chat/history` | Clear chat memory |

**Optional user key headers** (override server `.env`):  
`X-User-Gemini-Key` · `X-User-Groq-Key` · `X-User-Openrouter-Key`

---

## 📝 Behind the Build — Loop Engineering

While building SketchFlow, I ran into a problem that better prompting couldn't fix: Gemini Vision would read a whiteboard sketch accurately, then the code generation model would return diagram syntax that *looked* valid but wasn't — nonexistent node types, connectors that PlantUML doesn't support. Every prompt tweak fixed one case and broke another.

The fix wasn't a better prompt. It was adding a verifier — a ChromaDB RAG layer grounded in real Mermaid and PlantUML documentation — so generated code had to pass a syntax check against an external source of truth before reaching the user. That single architectural decision eliminated the hallucinations.

I wrote about the broader pattern this represents designing verified feedback loops instead of chasing perfect prompts — in a piece published on Medium:

> **[Loop Engineering: Why I Stopped Prompting My RAG Pipelines and Started Designing Loops](https://medium.com/@a275hamza/loop-engineering-why-i-stopped-prompting-my-rag-pipelines-and-started-designing-loops-e2b56ab4abf4)**  
> *On triggers, verifiers, exit conditions, and why the real skill in 2026 is knowing what "done" means — and making the system know it too.*

---

## 🚀 Live Demo

👉 **[https://sktech-ai.vercel.app](https://sktech-ai.vercel.app)**

No sign-up, no installation. Use the built-in server keys or drop in your own.

---

<div align="center">

**Built by [Ameer Hamza](https://github.com/Hamzi275) · MS Artificial Intelligence · Beykoz University**  
*AI Engineer · RAG Pipelines · Multimodal Systems · Open to remote EU/UK roles*

*If this project helped you, drop a ⭐*

</div>
