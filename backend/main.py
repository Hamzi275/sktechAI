import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from routers import analyze, chat
from services.rag import RAGService
from services.docs_loader import load_all_docs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sketchflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        logger.error("GEMINI_API_KEY not set — RAG will not work until a user provides their own key")
    else:
        try:
            rag = RAGService.get_instance(gemini_api_key=gemini_key)
            results = load_all_docs(rag, try_web=False)  # fast, reliable startup
            total = sum(results.values())
            logger.info(f"SketchFlow AI ready — {len(results)} collections, {total} chunks loaded")
        except Exception as e:
            logger.error(f"RAG initialization failed: {e}")

    yield
    # Nothing to clean up — ChromaDB is in-memory


app = FastAPI(title="SketchFlow AI", version="3.0.0", lifespan=lifespan)

# CRITICAL: OPTIONS handler BEFORE CORSMiddleware (fixes preflight 400 bug)
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return JSONResponse(content={}, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    })


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/")
def root():
    rag_status = {}
    try:
        rag = RAGService.get_instance()
        rag_status = rag.get_status()
    except Exception:
        pass
    return {"status": "ok", "service": "SketchFlow AI", "rag": rag_status}
