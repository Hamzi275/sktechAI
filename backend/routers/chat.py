"""
POST /api/chat — follow-up chat for iterating on a diagram.
Streams a Server-Sent Events response.

Accepts the image and currently-displayed diagram code as context, so the
assistant can actually answer questions like "make a use case diagram from
the image I uploaded" instead of saying no image was provided.
"""
import os
from typing import Optional, List, Dict

from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.codegen import stream_chat_with_context
from services.rag import RAGService
from services.memory import session_memory

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    current_code: str = ""
    current_format: str = "mermaid"
    diagram_type: str = "auto"
    image_base64: str = ""
    image_filename: str = "diagram.jpg"


class ChatHistoryResponse(BaseModel):
    history: List[Dict]


@router.post("/chat")
async def chat(
    request: ChatRequest,
    x_user_gemini_key: Optional[str] = Header(None),
    x_user_groq_key: Optional[str] = Header(None),
    x_user_openrouter_key: Optional[str] = Header(None)
):
    gemini_key = x_user_gemini_key or os.getenv("GEMINI_API_KEY", "")
    groq_key = x_user_groq_key or os.getenv("GROQ_API_KEY", "")
    openrouter_key = x_user_openrouter_key or os.getenv("OPENROUTER_API_KEY", "")

    try:
        rag = RAGService.get_instance(gemini_api_key=gemini_key or None)
        syntax_rules, _ = rag.query(
            request.diagram_type, request.message, top_k=2, api_key=gemini_key or None
        )
    except ValueError:
        syntax_rules = ""
    chat_history = session_memory.get_history_for_llm()

    session_memory.add_user_message(request.message, has_image=bool(request.image_base64))

    collected_response: List[str] = []

    async def generate_and_collect():
        async for chunk in stream_chat_with_context(
            message=request.message,
            current_code=request.current_code,
            current_format=request.current_format,
            syntax_rules=syntax_rules,
            chat_history=chat_history,
            image_base64=request.image_base64,
            image_filename=request.image_filename,
            gemini_key=gemini_key,
            groq_key=groq_key,
            openrouter_key=openrouter_key
        ):
            if chunk != "data: [DONE]\n\n":
                # Strip only the SSE framing ("data: " prefix + the trailing
                # "\n\n" delimiter), never the payload's own content — the
                # payload may legitimately start/end with a space (it's a
                # word-boundary) or contain real newlines (a multi-line code
                # block), and either would be corrupted by a blind strip.
                if chunk.startswith("data: ") and chunk.endswith("\n\n"):
                    text = chunk[len("data: "):-2]
                    if text:
                        collected_response.append(text)
            yield chunk

        full_response = "".join(collected_response)
        if full_response:
            session_memory.add_assistant_message(full_response)

    return StreamingResponse(
        generate_and_collect(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


@router.get("/chat/history", response_model=ChatHistoryResponse)
async def get_history():
    return ChatHistoryResponse(history=session_memory.get_display_history())


@router.delete("/chat/history")
async def clear_history():
    session_memory.clear()
    return {"status": "cleared"}
