<div align="center">

<img src="https://raw.githubusercontent.com/Hamzi275/sktechAI/main/frontend/public/1.png" alt="SketchFlow AI" width="100%" style="border-radius:12px" />

# âš¡ SketchFlow AI

### *Sketch it. Code it. Ship it.*

**Multimodal AI diagram generation â€” upload a whiteboard photo or type a description, get production-ready Mermaid & PlantUML instantly.**

<br/>

[![Live Demo](https://img.shields.io/badge/ðŸš€%20Live%20Demo-sktech--ai.vercel.app-6d28d9?style=for-the-badge)](https://sktech-ai.vercel.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini-Vision-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=for-the-badge)](https://groq.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-RAG-FF6F00?style=for-the-badge)](https://www.trychroma.com)

**[â†’ Try it live â€” no sign-up needed](https://sktech-ai.vercel.app)**

</div>

---

## What is SketchFlow AI?

SketchFlow AI converts rough ideas into clean, structured diagrams â€” in seconds. Drop a whiteboard photo or describe a system in plain English, and get executable **Mermaid** or **PlantUML** code with a live visual preview and a streaming chat interface to keep refining it.

Built to demonstrate end-to-end AI engineering: multimodal vision pipelines, RAG-augmented code generation, SSE streaming chat, and a production-grade React frontend â€” all deployed and publicly accessible.

---

## âœ¨ Features

### ðŸ–¼ï¸ Multimodal Diagram Generation
Upload any whiteboard photo, hand-drawn sketch, or architecture image. Gemini Vision analyzes it and generates accurate Mermaid or PlantUML code. Supports flowcharts, sequence diagrams, class diagrams, ER diagrams, and more â€” straight from a photo.

### ðŸ” Multi-Provider AI Fallback Chain
No single point of failure. The pipeline cascades through **Gemini 2.5 Flash â†’ Gemini 2.0 Flash â†’ Gemini 1.5 Flash â†’ OpenRouter (3 vision models)** for image analysis, and **Groq LLaMA 3.3 70B â†’ OpenRouter free text models** for code generation. If one provider is down or rate-limited, the next kicks in automatically.

### ðŸ§  RAG-Augmented Code Quality
ChromaDB stores Mermaid and PlantUML syntax rules as vector embeddings via `gemini-embedding-001`. Every generation request retrieves the most relevant syntax context first â€” dramatically reducing hallucinated or invalid diagram code.

### ðŸ’¬ Streaming Diagram Chat
Refine diagrams in a dedicated chat panel. The assistant sees your current diagram code *and* the original image, streams replies token-by-token via SSE, and automatically updates the live preview when it returns new code. No manual copy-paste needed.

### ðŸ“± Fully Responsive â€” Mobile to Desktop
Panels stack vertically on phone screens and go side-by-side from the `md` breakpoint up. Every button meets the 44px touch-target minimum. Built to actually work on phones, not just pass DevTools resize.

### ðŸ”‘ Bring Your Own API Keys
Enter your Gemini, Groq, or OpenRouter keys via an in-app settings panel. Sent as request headers and override server-side keys â€” no account or sign-up required to use the full feature set.

### ðŸŽ¨ Colored Live Preview
Diagrams render with a violet/blue/green-tinted color scheme on a dot-grid canvas. Class diagrams, flowcharts, and sequence diagrams all look visually distinct and readable â€” not washed-out white-on-white.

---

## ðŸ—ï¸ Architecture

```
User Input (image / text)
        â”‚
        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              FastAPI Backend                      â”‚
â”‚                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  Vision     â”‚     â”‚   RAG (ChromaDB)      â”‚   â”‚
â”‚  â”‚  Service    â”‚     â”‚   Syntax Retrieval    â”‚   â”‚
â”‚  â”‚  Gemini â”€â”€â–º â”‚     â”‚   gemini-embedding    â”‚   â”‚
â”‚  â”‚  OpenRouter â”‚     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜                â”‚                â”‚
â”‚         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–ºâ”Œâ”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚                        â”‚   CodeGen Service  â”‚    â”‚
â”‚                        â”‚   Groq / OpenRouterâ”‚    â”‚
â”‚                        â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚                    â”‚   Chat Service (SSE)     â”‚   â”‚
â”‚                    â”‚   Memory + History       â”‚   â”‚
â”‚                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚           React Frontend (Vite + Tailwind)        â”‚
â”‚   Upload Panel â”‚ Result Panel â”‚ Chat Panel        â”‚
â”‚   Mermaid.js Live Preview â”‚ Settings Modal        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ› ï¸ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI Â· Python 3.11+ |
| **Vision AI** | Gemini 2.5 / 2.0 / 1.5 Flash â†’ OpenRouter (3 vision models) |
| **Code Generation** | Groq LLaMA-3.3-70B â†’ OpenRouter free text models |
| **RAG / Embeddings** | ChromaDB (in-memory) Â· `gemini-embedding-001` |
| **Frontend** | React 18 Â· Vite Â· Tailwind CSS |
| **Diagram Rendering** | Mermaid.js Â· PlantUML |
| **Streaming** | Server-Sent Events (SSE) |
| **Deployment** | Render (backend) Â· Vercel (frontend) |

---

## ðŸ“ Project Structure

```
sketchflow-ai/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ main.py                  # FastAPI app, lifespan startup, CORS
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â”œâ”€â”€ routers/
â”‚   â”‚   â”œâ”€â”€ analyze.py           # POST /api/analyze
â”‚   â”‚   â””â”€â”€ chat.py              # POST /api/chat, /api/chat/history
â”‚   â””â”€â”€ services/
â”‚       â”œâ”€â”€ vision.py            # Gemini â†’ OpenRouter vision fallback chain
â”‚       â”œâ”€â”€ rag.py               # ChromaDB in-memory RAG
â”‚       â”œâ”€â”€ docs_loader.py       # Syntax docs + optional web fetch
â”‚       â”œâ”€â”€ codegen.py           # Groq â†’ OpenRouter text fallback chain
â”‚       â””â”€â”€ memory.py            # Image-scoped chat history
â””â”€â”€ frontend/
    â”œâ”€â”€ vite.config.js           # Proxy /api â†’ :8000
    â”œâ”€â”€ tailwind.config.js       # Violet/graphite SketchFlow palette
    â””â”€â”€ src/
        â”œâ”€â”€ App.jsx
        â””â”€â”€ components/
            â”œâ”€â”€ UploadPanel.jsx       # Image drop, text prompt, chat
            â”œâ”€â”€ ResultPanel.jsx       # Pill tabs, terminal-style code blocks
            â”œâ”€â”€ MermaidPreview.jsx    # Dot-grid canvas, colored previews
            â”œâ”€â”€ SettingsPanel.jsx     # User API key modal
            â””â”€â”€ ChatHistory.jsx       # Streamed chat + citations
```

---

## ðŸ”Œ API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Image and/or text â†’ diagram code |
| `POST` | `/api/chat` | Follow-up message, streamed via SSE |
| `GET` | `/api/chat/history` | Current session's chat log |
| `DELETE` | `/api/chat/history` | Clear chat memory |

**Optional user key headers** (override server `.env`):
`X-User-Gemini-Key` Â· `X-User-Groq-Key` Â· `X-User-Openrouter-Key`

---

## ðŸš€ Live Demo

ðŸ‘‰ **[https://sktech-ai.vercel.app](https://sktech-ai.vercel.app)**

No sign-up, no installation. Use the built-in server keys or drop in your own.

---

<div align="center">

**Built by [Ameer Hamza](https://github.com/Hamzi275) Â· MS Artificial Intelligence Â· Beykoz University**

*If this project helped you, drop a â­*
<div></div>
