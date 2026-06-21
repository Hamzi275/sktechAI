"""
POST /api/analyze — main diagram analysis endpoint.
Handles both image+prompt and text-only modes.
"""
import os
import logging
from typing import Optional, List

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from services.vision import extract_diagram_elements, get_image_hash
from services.rag import RAGService
from services.codegen import generate_code, _build_codegen_prompt, _build_text_only_prompt
from services.memory import session_memory
from services.docs_loader import HARDCODED_DOCS

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyze"])


class AnalyzeRequest(BaseModel):
    image_base64: Optional[str] = None      # None = text-only mode
    filename: Optional[str] = "diagram.jpg"
    diagram_type: str = "auto"              # auto, flowchart, sequence, class, er, architecture
    output_format: str = "auto"             # auto=both, mermaid, plantuml
    user_prompt: str = ""                   # user's text instruction


class DiagramOutput(BaseModel):
    format: str
    code: str
    preview_supported: bool  # True only for mermaid


class AnalyzeResponse(BaseModel):
    detected_type: str
    description: str
    outputs: List[DiagramOutput]
    elements: List[dict]
    citations: List[dict]
    mode: str  # "image" or "text"


def _get_api_keys(
    x_user_gemini_key: Optional[str],
    x_user_groq_key: Optional[str],
    x_user_openrouter_key: Optional[str]
):
    gemini_key = x_user_gemini_key or os.getenv("GEMINI_API_KEY", "")
    groq_key = x_user_groq_key or os.getenv("GROQ_API_KEY", "")
    openrouter_key = x_user_openrouter_key or os.getenv("OPENROUTER_API_KEY", "")
    return gemini_key, groq_key, openrouter_key


def _determine_formats(output_format: str) -> List[str]:
    if output_format == "mermaid":
        return ["mermaid"]
    if output_format == "plantuml":
        return ["plantuml"]
    return ["mermaid", "plantuml"]  # auto = both


MERMAID_TYPE_MAP = {
    "flowchart": "mermaid_flowchart",
    "sequence": "mermaid_sequence",
    "class": "mermaid_class",
    "er": "mermaid_er",
    "architecture": "mermaid_flowchart",
}

PLANTUML_TYPE_MAP = {
    "class": "plantuml_class",
    "sequence": "plantuml_sequence",
}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    x_user_gemini_key: Optional[str] = Header(None),
    x_user_groq_key: Optional[str] = Header(None),
    x_user_openrouter_key: Optional[str] = Header(None)
):
    gemini_key, groq_key, openrouter_key = _get_api_keys(
        x_user_gemini_key, x_user_groq_key, x_user_openrouter_key
    )

    if not request.image_base64 and not request.user_prompt.strip():
        raise HTTPException(status_code=400, detail="Please upload an image or describe a diagram.")

    rag: Optional[RAGService] = None
    try:
        rag = RAGService.get_instance(gemini_api_key=gemini_key or None)
    except ValueError:
        # No Gemini key anywhere yet — RAG-backed syntax lookups will be
        # skipped below and the hardcoded docs fallback is used instead.
        # This must NOT block the request: a user with only an OpenRouter
        # key can still get vision analysis and code generation.
        logger.info("RAG unavailable (no Gemini key yet) — using hardcoded syntax docs only")
    chat_history = session_memory.get_history_for_llm()

    elements_data: dict = {}
    detected_type = request.diagram_type if request.diagram_type != "auto" else "flowchart"
    description = ""
    mode = "text"

    # IMAGE MODE
    if request.image_base64:
        mode = "image"
        image_id = get_image_hash(request.image_base64)
        session_memory.new_image(image_id)  # clears history if this is a new image
        chat_history = []

        try:
            elements_data = extract_diagram_elements(
                image_base64=request.image_base64,
                filename=request.filename or "diagram.jpg",
                diagram_type=request.diagram_type,
                user_prompt=request.user_prompt,
                gemini_api_key=gemini_key,
                openrouter_api_key=openrouter_key
            )
            detected_type = elements_data.get("detected_type", "flowchart")
            description = elements_data.get("description", "")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    formats_to_generate = _determine_formats(request.output_format)

    outputs: List[DiagramOutput] = []
    all_citations: List[dict] = []

    for fmt in formats_to_generate:
        if fmt == "mermaid":
            col_name = MERMAID_TYPE_MAP.get(detected_type, "mermaid_flowchart")
        else:
            col_name = PLANTUML_TYPE_MAP.get(detected_type, "plantuml_class")

        fmt_syntax, fmt_citations = ("", [])
        if rag is not None:
            fmt_syntax, fmt_citations = rag.query(
                detected_type, f"{fmt} {detected_type} syntax", top_k=2, api_key=gemini_key or None
            )
        if not fmt_syntax:
            fmt_syntax = HARDCODED_DOCS.get(col_name, {}).get("content", "")

        if mode == "image":
            prompt = _build_codegen_prompt(
                elements=elements_data,
                syntax_rules=fmt_syntax,
                diagram_type=detected_type,
                output_format=fmt,
                user_prompt=request.user_prompt,
                chat_history=chat_history
            )
        else:
            prompt = _build_text_only_prompt(
                user_prompt=request.user_prompt,
                syntax_rules=fmt_syntax,
                diagram_type=detected_type,
                output_format=fmt,
                chat_history=chat_history
            )

        try:
            code = await generate_code(prompt, groq_key, openrouter_key)
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

        # Strip any accidental markdown fences
        code = code.strip()
        if code.startswith("```"):
            lines = code.split("\n")
            body = lines[1:]
            if body and body[-1].strip() == "```":
                body = body[:-1]
            code = "\n".join(body).strip()

        outputs.append(DiagramOutput(
            format=fmt,
            code=code,
            preview_supported=(fmt == "mermaid")
        ))

        for c in fmt_citations:
            if not any(existing["url"] == c["url"] for existing in all_citations):
                all_citations.append(c)

    user_msg = request.user_prompt or f"Generate {detected_type} diagram"
    if mode == "image":
        user_msg = f"[Image uploaded] {user_msg}"
    session_memory.add_user_message(user_msg, has_image=(mode == "image"))

    codes_summary = "; ".join([f"{o.format}: {len(o.code)} chars" for o in outputs])
    session_memory.add_assistant_message(
        f"Generated {detected_type} diagram ({codes_summary})",
        citations=all_citations
    )

    return AnalyzeResponse(
        detected_type=detected_type,
        description=description,
        outputs=outputs,
        elements=elements_data.get("elements", []),
        citations=all_citations,
        mode=mode
    )
