"""
Multi-provider diagram code generation with automatic fallback chain.
Provider order: Groq -> OpenRouter (deepseek-r1:free -> llama-3.3-70b:free -> mistral-7b:free)

Groq/OpenAI SDKs are synchronous, so every call here runs inside
loop.run_in_executor to stay safe in an async FastAPI app.
"""
import json
import asyncio
import logging
from typing import AsyncGenerator, Optional, List, Dict

from groq import Groq
from openai import OpenAI

logger = logging.getLogger(__name__)

OPENROUTER_FREE_MODELS = [
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
]

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_HEADERS = {
    "HTTP-Referer": "https://sketchflow.ai",
    "X-Title": "SketchFlow AI"
}


def _build_codegen_prompt(
    elements: dict,
    syntax_rules: str,
    diagram_type: str,
    output_format: str,
    user_prompt: str = "",
    chat_history: Optional[List[Dict]] = None
) -> str:
    history_text = ""
    if chat_history:
        recent = chat_history[-6:]
        joined = "\n".join([f"{m['role'].upper()}: {m['content'][:200]}" for m in recent])
        history_text = f"\nCONVERSATION CONTEXT:\n{joined}\n"

    user_instruction = f"\nUSER INSTRUCTION: {user_prompt}" if user_prompt else ""

    return f"""You are a diagram code generator. Generate ONLY valid {output_format} diagram code.

DIAGRAM TYPE: {diagram_type}
OUTPUT FORMAT: {output_format}
{user_instruction}
{history_text}
EXTRACTED ELEMENTS:
{json.dumps(elements, indent=2)}

SYNTAX RULES (follow exactly):
{syntax_rules}

CRITICAL RULES:
- Output ONLY the diagram code, nothing else
- No markdown fences, no explanation, no comments outside the diagram
- Every element from the input MUST appear in the output
- Follow syntax rules EXACTLY — do not invent syntax
- For Mermaid: start with correct keyword (graph TD, sequenceDiagram, classDiagram, erDiagram)
- For PlantUML: wrap in @startuml ... @enduml
- If user gave instructions, apply them while keeping all elements
"""


def _build_text_only_prompt(
    user_prompt: str,
    syntax_rules: str,
    diagram_type: str,
    output_format: str,
    chat_history: Optional[List[Dict]] = None
) -> str:
    history_text = ""
    if chat_history:
        recent = chat_history[-6:]
        joined = "\n".join([f"{m['role'].upper()}: {m['content'][:200]}" for m in recent])
        history_text = f"\nCONVERSATION CONTEXT:\n{joined}\n"

    return f"""You are a diagram code generator. Generate ONLY valid {output_format} diagram code.

DIAGRAM TYPE: {diagram_type}
OUTPUT FORMAT: {output_format}
{history_text}
USER REQUEST: {user_prompt}

SYNTAX RULES (follow exactly):
{syntax_rules}

CRITICAL RULES:
- Output ONLY the diagram code, nothing else
- No markdown fences, no explanation
- Follow syntax rules EXACTLY
- For Mermaid: start with correct keyword
- For PlantUML: wrap in @startuml ... @enduml
"""


def _call_groq_sync(prompt: str, groq_api_key: str) -> str:
    client = Groq(api_key=groq_api_key)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2048
    )
    return response.choices[0].message.content.strip()


def _call_openrouter_sync(prompt: str, openrouter_api_key: str, model: str) -> str:
    client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=openrouter_api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2048,
        extra_headers=OPENROUTER_HEADERS
    )
    return response.choices[0].message.content.strip()


async def generate_code(
    prompt: str,
    groq_api_key: Optional[str] = None,
    openrouter_api_key: Optional[str] = None
) -> str:
    """
    Generate code with an automatic fallback chain: Groq first, then each
    free OpenRouter model in turn. Raises RuntimeError only if every
    provider fails.
    """
    loop = asyncio.get_event_loop()
    errors = []

    if groq_api_key:
        try:
            result = await loop.run_in_executor(None, _call_groq_sync, prompt, groq_api_key)
            logger.info("Code generated via Groq")
            return result
        except Exception as e:
            errors.append(f"Groq: {e}")
            logger.warning(f"Groq failed: {e}")

    if openrouter_api_key:
        for model in OPENROUTER_FREE_MODELS:
            try:
                result = await loop.run_in_executor(
                    None, _call_openrouter_sync, prompt, openrouter_api_key, model
                )
                logger.info(f"Code generated via OpenRouter ({model})")
                return result
            except Exception as e:
                errors.append(f"OpenRouter/{model}: {e}")
                logger.warning(f"OpenRouter {model} failed: {e}")
                continue

    raise RuntimeError(
        f"All providers failed. Please check your API keys in Settings. Errors: {'; '.join(errors)}"
    )


async def stream_chat_with_context(
    message: str,
    current_code: str,
    current_format: str,
    syntax_rules: str,
    chat_history: List[Dict],
    image_base64: str = "",
    image_filename: str = "diagram.jpg",
    gemini_key: str = "",
    groq_key: str = "",
    openrouter_key: str = ""
) -> AsyncGenerator[str, None]:
    """
    Stream a conversational response about the current diagram via SSE.

    Carries real context with it: the diagram code currently on screen, its
    format, and — if the person has an image uploaded — the image itself,
    so a message like "make a use case diagram from the image" can actually
    be answered instead of getting "no image was provided".

    SSE framing note: each token is sent as exactly `data: {token}\\n\\n`.
    The frontend must only strip that literal framing (the "data: " prefix
    and the trailing blank line) and must never call .trim() on the payload,
    since real word-boundary spaces live inside the token itself. If a
    token happens to contain a real newline (e.g. mid-way through a
    multi-line code block), we escape just that newline so it can't be
    misread as a frame boundary; the frontend reverses only that one
    substitution, nothing else.
    """
    history_text = "\n".join([
        f"{m['role'].upper()}: {m['content'][:300]}"
        for m in chat_history[-8:]
    ])

    has_image = bool(image_base64)
    has_code = bool(current_code.strip())

    system_prompt = f"""You are SketchFlow AI — an expert diagram assistant.

CURRENT CONTEXT:
- Image uploaded: {"YES — the user has a diagram/sketch image available" if has_image else "NO — no image uploaded"}
- Current diagram code format: {current_format if has_code else "none generated yet"}
- Current diagram code:
{current_code[:1500] if has_code else "No diagram code generated yet."}

SYNTAX REFERENCE:
{syntax_rules[:800] if syntax_rules else "Use standard Mermaid or PlantUML syntax."}

CONVERSATION HISTORY:
{history_text if history_text else "No previous messages."}

YOUR BEHAVIOR:
1. If the user asks to modify the diagram, output the COMPLETE updated {current_format} code.
2. If the user asks to convert format, output complete code in the requested format.
3. If the user describes a new diagram, generate complete code for it.
4. When outputting code, wrap it in triple backticks with the format name:
   ```mermaid
   [code here]
   ```
   or
   ```plantuml
   [code here]
   ```
5. If the user asks about the image and an image is available, you can see it directly.
6. Be concise. Always produce working, valid diagram code.
7. Your name is SketchFlow AI."""

    # A message that references the image, while an image is actually
    # present, gets routed to Gemini vision so it can see the picture
    # instead of guessing from text alone.
    image_keywords = ["image", "diagram", "sketch", "picture", "photo", "drawing", "whiteboard"]
    is_image_request = has_image and any(kw in message.lower() for kw in image_keywords)

    loop = asyncio.get_event_loop()
    errors: List[str] = []

    if is_image_request and gemini_key:
        try:
            from google import genai
            from google.genai import types
            import base64 as b64

            client = genai.Client(api_key=gemini_key)
            image_bytes = b64.b64decode(image_base64)

            mime_type = "image/jpeg"
            lower_name = image_filename.lower()
            if lower_name.endswith(".png"):
                mime_type = "image/png"
            elif lower_name.endswith(".webp"):
                mime_type = "image/webp"
            elif lower_name.endswith(".gif"):
                mime_type = "image/gif"

            full_prompt = f"""{system_prompt}

USER MESSAGE: {message}

Look at the provided image carefully and respond accordingly.
If asked to generate diagram code from the image, output complete valid code
in a fenced ```mermaid or ```plantuml block."""

            def gemini_stream_call():
                return client.models.generate_content_stream(
                    model="gemini-2.5-flash",
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        full_prompt,
                    ]
                )

            stream = await loop.run_in_executor(None, gemini_stream_call)
            got_any = False
            for chunk in stream:
                text = chunk.text or ""
                if text:
                    got_any = True
                    yield f"data: {text.replace(chr(10), chr(92) + 'n')}\n\n"
            if got_any:
                yield "data: [DONE]\n\n"
                return
            errors.append("Gemini vision: empty response")
        except Exception as e:
            errors.append(f"Gemini vision: {e}")
            logger.warning(f"Gemini image chat failed ({e}), falling back to text providers")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message}
    ]

    def groq_stream():
        client = Groq(api_key=groq_key)
        return client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True,
            max_tokens=2048,
            temperature=0.2
        )

    def openrouter_stream(model: str):
        client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=openrouter_key)
        return client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=2048,
            extra_headers=OPENROUTER_HEADERS
        )

    if groq_key:
        try:
            stream = await loop.run_in_executor(None, groq_stream)
            for chunk in stream:
                text = chunk.choices[0].delta.content or ""
                if text:
                    # Escape only a literal embedded newline so it can never
                    # be mistaken for the "\n\n" frame delimiter. This is the
                    # ONLY character touched — spaces are sent through as-is,
                    # which is what keeps word boundaries intact end to end.
                    yield f"data: {text.replace(chr(10), chr(92) + 'n')}\n\n"
            yield "data: [DONE]\n\n"
            return
        except Exception as e:
            errors.append(f"Groq: {e}")
            logger.warning(f"Groq stream failed: {e}")

    if openrouter_key:
        for model in OPENROUTER_FREE_MODELS:
            try:
                stream = await loop.run_in_executor(None, openrouter_stream, model)
                for chunk in stream:
                    text = chunk.choices[0].delta.content or ""
                    if text:
                        yield f"data: {text.replace(chr(10), chr(92) + 'n')}\n\n"
                yield "data: [DONE]\n\n"
                return
            except Exception as e:
                errors.append(f"OpenRouter/{model}: {e}")
                continue

    logger.warning(f"All chat providers failed: {'; '.join(errors)}")
    yield "data: Sorry, all AI providers are currently unavailable. Please check your API keys in Settings.\n\n"
    yield "data: [DONE]\n\n"
