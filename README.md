# ⚡ SketchFlow AI

**Sketch it. Code it. Ship it.**

Upload a whiteboard photo, or just type a description — either way you get Mermaid and/or PlantUML diagram code, a live preview, and a chat thread to keep refining it. Works on your phone as well as your desktop.

## v4 — chat bug fixes

Two real, separate bugs are fixed in this round:

**1. Word-joining in chat replies** (`"Thereisnoimageprovided."`)

The actual cause was a stray `.trim()` in the frontend's SSE parser. Groq/OpenRouter stream replies one word-token at a time, like `"There "`, `"is "`, `"no "` — the leading/trailing spaces *are* the word separators. The old code did `const line = part.trim()` before reading the payload, which stripped those spaces off every single token before concatenation, joining all the words together. Fixed by only checking/stripping the literal `"data: "` SSE prefix, never calling `.trim()` on the token itself. Verified by reproducing the exact bug, then confirming the fix output matches a normal sentence again — see the code comments in `UploadPanel.jsx` for the verified before/after.

As a related edge case, a token that legitimately contains a real newline (e.g. the model streaming a multi-line code block) is escaped on the backend as a literal `\n` two-character sequence so it can't be mistaken for the SSE frame delimiter (`\n\n`), and unescaped on the frontend — but *only* that one substitution, never a blanket trim or strip.

**2. Chat couldn't see the uploaded image or the generated code**

`UploadPanel`'s chat had no access to the image, the diagram code on screen, or its format — they were local state, never passed anywhere. Asking "make a use case diagram from the image" always got "there is no image provided," regardless of what was actually uploaded. Fixed by lifting `imageBase64`, `imageFilename`, `diagramType`, and the active output (code + format) up to `App.jsx` as the single source of truth, with `ResultPanel` reporting which tab is active and `UploadPanel` sending all of it on every chat request. The backend's `/api/chat` now accepts `current_format`, `image_base64`, and `image_filename`, and routes image-referencing messages straight to Gemini vision when an image and a Gemini key are both present.

When the chat reply contains a fenced ` ```mermaid ` or ` ```plantuml ` block, it's extracted and written back into the result panel automatically, so asking the chat to change the diagram actually updates what's on screen.


## What's new in v3

- **Rebrand**: DiagramAI → SketchFlow AI, with a new violet identity and an inline SVG lightning-bolt favicon (no separate image file needed)
- **The page actually scrolls** — v2's root layout used `h-screen overflow-hidden`, which clipped content on smaller screens. Fixed to `min-h-screen` with independently scrollable panels
- **Responsive down to phone width** — panels stack vertically on mobile and sit side-by-side from the `md` breakpoint up; every button and input meets the 44px touch-target minimum
- **Vision fallback chain extended to OpenRouter** — if every Gemini vision model fails (or there's no Gemini key at all), image analysis now retries through three OpenRouter vision models before giving up
- **Colored diagram previews** — class diagrams (and everything else) now render with violet/blue/green-tinted boxes on a dot-grid canvas, instead of the old white-on-white look that made class diagrams hard to read
- **Visual refresh** — glowing gradient CTA button, pill-style tabs, terminal-style code blocks with traffic-light dots

## A bug found and fixed while wiring up the OpenRouter vision fallback

Adding an OpenRouter-only vision path exposed a real blocker: the `/api/analyze` endpoint was initializing the RAG service (used only for *syntax-rule lookups*, unrelated to vision) before checking anything else, and it hard-failed the entire request with a 400 if no Gemini key was present — even for a user who only wanted to use OpenRouter. That would have silently defeated the whole point of the new vision fallback. Fixed so RAG failures fall back to the hardcoded syntax docs instead of blocking the request; only the parts of the pipeline that genuinely need a missing key now fail.

## Tech Stack

- **Backend**: FastAPI · `google-genai` (Gemini 2.5/2.0/1.5 Flash vision, with fallback between them) · OpenRouter vision models (Gemini-via-OpenRouter, Llama 3.2 Vision, Qwen2-VL) as a second fallback tier · `gemini-embedding-001` for RAG embeddings · Groq llama-3.3-70b → OpenRouter free text models for code generation · ChromaDB (in-memory)
- **Frontend**: React 18 · Vite · Tailwind CSS · Mermaid.js · lucide-react

## Quick Start (Windows 11 / VS Code)

No new packages are needed beyond what v2 already required — `openai` was already in `requirements.txt` for the text-generation fallback, and it's reused here for vision.

### Step 1 — Get API keys (all free)

- **Gemini**: https://aistudio.google.com/app/apikey
- **Groq**: https://console.groq.com/keys
- **OpenRouter**: https://openrouter.ai/keys — now does double duty as both a text and a vision fallback

### Step 2 — Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
```

Run:
```bash
uvicorn main:app --reload --port 8000
```

Expected: `SketchFlow AI ready — 6 collections, NN chunks loaded`

### Step 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — try resizing the window or opening it on your phone to see the responsive layout.

### Step 4 — Try it

- **Text-only**: type "a login flow with retry on failure," tap **Generate Diagram**
- **Image mode**: drop a whiteboard photo
- **Chat**: after generating, type a follow-up like "make it a sequence diagram instead" — you'll see a typing indicator, then the streamed reply
- **No Gemini key?** Add only an OpenRouter key in Settings — image analysis will route through OpenRouter's vision models instead

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `GEMINI_API_KEY not set` at startup | Create `backend/.env` with at least one key — the app degrades gracefully without Gemini if you've added an OpenRouter key instead |
| Image analysis fails on every provider | Both Gemini's three models and OpenRouter's three vision models failed — check your keys, try a clearer photo, or describe the diagram in chat instead |
| Class diagram preview looks washed out | Already fixed in v3 — boxes now render with a violet tint. If you still see plain white, hard-refresh so the new Mermaid theme variables take effect |
| Layout looks cut off on a small laptop | Already fixed — the root layout no longer uses `overflow-hidden`. If you still see clipping, clear your browser cache |
| Chat shows nothing after sending | Check that `uvicorn` is running and the response status was 200 — the UI now throws and displays an explicit error if the `/api/chat` call itself fails, rather than hanging silently |
| Port 8000 already in use | `uvicorn main:app --reload --port 8001`, then update `vite.config.js`'s proxy target to match |

---

## Project Structure

```
sketchflow-ai/
├── backend/
│   ├── main.py                  # FastAPI app, lifespan startup, CORS
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── analyze.py           # POST /api/analyze
│   │   └── chat.py              # POST /api/chat, /api/chat/history
│   └── services/
│       ├── vision.py            # Gemini -> OpenRouter vision fallback chain
│       ├── rag.py                # ChromaDB in-memory RAG (gemini-embedding-001)
│       ├── docs_loader.py       # Hardcoded syntax docs + optional web fetch
│       ├── codegen.py           # Groq -> OpenRouter text fallback chain
│       └── memory.py            # Image-scoped chat history
└── frontend/
    ├── package.json
    ├── vite.config.js           # Proxy /api -> :8000
    ├── tailwind.config.js       # Violet/graphite SketchFlow palette
    └── src/
        ├── App.jsx              # min-h-screen, mobile-first stacking
        └── components/
            ├── UploadPanel.jsx       # Image drop, text prompt, selectors, chat
            ├── ResultPanel.jsx       # Pill tabs, terminal-style code blocks
            ├── MermaidPreview.jsx    # Dot-grid canvas, colored diagram boxes
            ├── SettingsPanel.jsx     # User API key modal (mobile-sized)
            └── ChatHistory.jsx       # Streamed chat messages + citations
```

## API Reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/analyze` | Image and/or text → diagram code |
| POST | `/api/chat` | Follow-up message, streamed (SSE) |
| GET | `/api/chat/history` | Current session's chat log |
| DELETE | `/api/chat/history` | Clear chat memory |

User key headers (all optional, all override the server's `.env` key):
`X-User-Gemini-Key`, `X-User-Groq-Key`, `X-User-Openrouter-Key`
