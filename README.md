<div align="center">

# ⚡ SketchFlow AI

### *Sketch it. Code it. Ship it.*

**Multimodal AI diagram generation — upload a whiteboard photo or type a description, get production-ready Mermaid & PlantUML instantly.**

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
<img src="https://raw.githubusercontent.com/Hamzi275/sktechAI/main/frontend/public/1.png" alt="SketchFlow AI Screenshot" width="90%" />
</div>

---

## What is SketchFlow AI?

SketchFlow AI converts rough ideas into clean, structured diagrams — in seconds. Drop a whiteboard photo or describe a system in plain English, and get executable **Mermaid** or **PlantUML** code with a live visual preview and a streaming chat interface to keep refining it.

Built to demonstrate end-to-end AI engineering: multimodal vision pipelines, RAG-augmented code generation, SSE streaming chat, and a production-grade React frontend — all deployed and publicly accessible.

---

## ✨ Features

### 🖼️ Multimodal Diagram Generation
Upload any whiteboard photo, hand-drawn sketch, or architecture image. Gemini Vision analyzes it and generates accurate Mermaid or PlantUML code. Supports flowcharts, sequence diagrams, class diagrams, ER diagrams, and more — straight from a photo.

### 🔁 Multi-Provider AI Fallback Chain
No single point of failure. The pipeline cascades through **Gemini 2.5 Flash → Gemini 2.0 Flash → Gemini 1.5 Flash → OpenRouter (3 vision models)** for image analysis, and **Groq LLaMA 3.3 70B → OpenRouter free text models** for code generation. If one provider is down or rate-limited, the next kicks in automatically.

### 🧠 RAG-Augmented Code Quality
ChromaDB stores Mermaid and PlantUML syntax rules as vector embeddings via `gemini-embedding-001`. Every generation request retrieves the most relevant syntax context first — dramatically reducing hallucinated or invalid diagram code.

### 💬 Streaming Diagram Chat
Refine diagrams in a dedicated chat panel. The assistant sees your current diagram code *and* the original image, streams replies token-by-token via SSE, and automatically updates the live preview when it returns new code. No manual copy-paste needed.

### 📱 Fully Responsive — Mobile to Desktop
Panels stack vertically on phone screens and go side-by-side from the `md` breakpoint up. Every button meets the 44px touch-target minimum. Built to actually work on phones, not just pass DevTools resize.

### 🔑 Bring Your Own API Keys
Enter your Gemini, Groq, or OpenRouter keys via an in-app settings panel. Sent as request headers and override server-side keys — no account or sign-up required to use the full feature set.

### 🎨 Colored Live Preview
Diagrams render with a violet/blue/green-tinted color scheme on a dot-grid canvas. Class diagrams, flowcharts, and sequence diagrams all look visually distinct and readable — not washed-out white-on-white.

---

## 🏗️ Architecture
