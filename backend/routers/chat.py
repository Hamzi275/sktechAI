import os
from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import logging

from services.rag import RAGService
from services.codegen import stream_chat_with_context

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    current_code: str = ""
    current_format: str = "mermaid"
    diagram_type: str = "auto"
    image_base64: str = ""
    image_filename: str = "diagram.jpg"
    chat_history: List[dict] = []


@router.post("/chat")
async def chat(
    request: ChatRequest,
    x_user_gemini_key: Optional[str] = Header(None),
    x_user_groq_key: Optional[str] = Header(None),
    x_user_openrouter_key: Optional[str] = Header(None),
):
    gemini_key = x_user_gemini_key or os.getenv("GEMINI_API_KEY", "")
    groq_key = x_user_groq_key or os.getenv("GROQ_API_KEY", "")
    openrouter_key = x_user_openrouter_key or os.getenv("OPENROUTER_API_KEY", "")

    try:
        rag = RAGService.get_instance(gemini_api_key=gemini_key or None)
        syntax_rules, _ = rag.query(
            request.diagram_type, request.message, top_k=2, api_key=gemini_key or None
        )
    except Exception:
        syntax_rules = ""

    clean_history = [
        {"role": m["role"], "content": m["content"]}
        for m in request.chat_history
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]

    return StreamingResponse(
        stream_chat_with_context(
            message=request.message,
            current_code=request.current_code,
            current_format=request.current_format,
            syntax_rules=syntax_rules,
            chat_history=clean_history,
            image_base64=request.image_base64,
            image_filename=request.image_filename,
            gemini_key=gemini_key,
            groq_key=groq_key,
            openrouter_key=openrouter_key,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.delete("/chat/history")
async def clear_history():
    return {"status": "ok", "message": "History is stored client-side in localStorage"}