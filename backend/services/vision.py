"""
Vision service: extracts structured diagram elements from an image.

Primary path: Gemini Vision via the `google-genai` SDK, trying multiple
models in order so a quota limit on one doesn't take down the feature.

Fallback path: OpenRouter vision-capable models (including Gemini routed
through OpenRouter, plus two free vision models), used only if every
Gemini model attempt fails. This keeps image analysis alive even if a
user has no Gemini key at all, or their Gemini quota is fully exhausted.
"""
import base64
import hashlib
import json
import logging
from typing import Dict, Optional

from google import genai
from google.genai import types
from openai import OpenAI

logger = logging.getLogger(__name__)

# Tried in order — first success wins. Keeps the app alive if one model's
# free-tier quota is exhausted.
GEMINI_VISION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

OPENROUTER_VISION_MODELS = [
    "google/gemini-flash-1.5",                          # Gemini via OpenRouter
    "meta-llama/llama-3.2-11b-vision-instruct:free",     # free vision model
    "qwen/qwen-2-vl-7b-instruct:free",                   # free vision model
]

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_HEADERS = {
    "HTTP-Referer": "https://sketchflow.ai",
    "X-Title": "SketchFlow AI"
}


def get_image_hash(image_base64: str) -> str:
    """Generate a short hash of the image for memory scoping."""
    return hashlib.md5(image_base64[:1000].encode()).hexdigest()[:8]


def get_mime_type(filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    return {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "gif": "image/gif", "webp": "image/webp"
    }.get(ext, "image/jpeg")


def _strip_markdown_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        body = lines[1:]
        if body and body[-1].strip() == "```":
            body = body[:-1]
        text = "\n".join(body).strip()
    return text


def _normalize_result(data: dict, diagram_type: str) -> dict:
    data.setdefault("elements", [])
    data.setdefault("connections", [])
    data.setdefault("detected_type", diagram_type if diagram_type != "auto" else "flowchart")
    data.setdefault("description", "")
    data.setdefault("confidence", 0.8)
    return data


def build_vision_prompt(diagram_type: str, user_prompt: str = "") -> str:
    type_hint = f"The user says this is a {diagram_type} diagram." if diagram_type != "auto" else ""
    user_context = f"Additional user instructions: {user_prompt}" if user_prompt else ""

    return f"""Analyze this diagram image carefully.
{type_hint}
{user_context}

Identify the diagram type:
- flowchart: boxes with decision diamonds and arrows
- sequence: vertical lifelines with horizontal messages
- class: boxes with attributes and methods sections
- er: entity boxes with relationship lines
- architecture: system components and connections

Extract ALL visible elements. Be thorough.

Return ONLY valid JSON, no markdown, no explanation:
{{
  "detected_type": "flowchart|sequence|class|er|architecture",
  "confidence": 0.0-1.0,
  "description": "Brief description of what this diagram shows",
  "elements": [
    {{"name": "ElementName", "type": "box|diamond|actor|class|entity|component",
      "label": "text inside the element", "attributes": [], "methods": []}}
  ],
  "connections": [
    {{"from": "ElementA", "to": "ElementB", "label": "arrow label or empty string",
      "type": "solid|dashed|thick"}}
  ]
}}"""


def extract_with_gemini(
    image_base64: str,
    filename: str,
    prompt: str,
    diagram_type: str,
    gemini_api_key: str
) -> dict:
    """
    Try every Gemini vision model in order. Returns on first success.
    Raises ValueError only once every model has been tried and failed.
    """
    client = genai.Client(api_key=gemini_api_key)
    image_bytes = base64.b64decode(image_base64)
    mime_type = get_mime_type(filename)

    last_error: Optional[Exception] = None

    for model_name in GEMINI_VISION_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt,
                ]
            )
            text = _strip_markdown_fence(response.text)
            data = json.loads(text)
            logger.info(f"Vision extraction succeeded via Gemini ({model_name})")
            return _normalize_result(data, diagram_type)

        except json.JSONDecodeError as e:
            last_error = e
            logger.warning(f"Gemini {model_name} returned unparseable JSON, trying next model")
            continue
        except Exception as e:
            err_str = str(e)
            last_error = e
            if "API_KEY" in err_str.upper() or "API key not valid" in err_str:
                # An invalid key will fail identically on every model — no
                # point burning through the rest of the list.
                raise ValueError("Invalid Gemini API key. Please check your key in Settings.")
            logger.warning(f"Gemini {model_name} failed ({e}), trying next model")
            continue

    raise ValueError(f"All Gemini vision models failed. Last error: {last_error}")


def extract_with_openrouter(
    image_base64: str,
    filename: str,
    prompt: str,
    diagram_type: str,
    openrouter_api_key: str
) -> dict:
    """
    Try OpenRouter vision-capable models in order. Returns on first success.
    Raises ValueError only once every model has been tried and failed.
    """
    client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=openrouter_api_key)
    mime_type = get_mime_type(filename)
    image_url = f"data:{mime_type};base64,{image_base64}"

    last_error: Optional[Exception] = None

    for model in OPENROUTER_VISION_MODELS:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}}
                    ]
                }],
                max_tokens=1500,
                extra_headers=OPENROUTER_HEADERS
            )
            text = _strip_markdown_fence(response.choices[0].message.content.strip())
            data = json.loads(text)
            logger.info(f"Vision extraction succeeded via OpenRouter ({model})")
            return _normalize_result(data, diagram_type)

        except Exception as e:
            last_error = e
            logger.warning(f"OpenRouter vision model {model} failed: {e}")
            continue

    raise ValueError(f"All OpenRouter vision models failed. Last error: {last_error}")


def extract_diagram_elements(
    image_base64: str,
    filename: str,
    diagram_type: str,
    user_prompt: str = "",
    gemini_api_key: Optional[str] = None,
    openrouter_api_key: Optional[str] = None
) -> dict:
    """
    Analyze an image and return a structured dict with detected_type,
    elements, and connections.

    Tries Gemini first (across its model fallback chain), then OpenRouter
    vision models (across its own fallback chain) if Gemini is unavailable
    or fails entirely. Only raises ValueError if no provider is configured,
    or every configured provider's every model has failed.
    """
    prompt = build_vision_prompt(diagram_type, user_prompt)
    errors = []

    if gemini_api_key:
        try:
            return extract_with_gemini(image_base64, filename, prompt, diagram_type, gemini_api_key)
        except ValueError as e:
            if "Invalid Gemini API key" in str(e):
                # Surface this immediately rather than masking it behind a
                # generic "all providers failed" — it's actionable on its own.
                if not openrouter_api_key:
                    raise
            errors.append(f"Gemini: {e}")
            logger.warning(f"Gemini vision failed entirely ({e}), trying OpenRouter...")

    if openrouter_api_key:
        try:
            return extract_with_openrouter(image_base64, filename, prompt, diagram_type, openrouter_api_key)
        except ValueError as e:
            errors.append(f"OpenRouter: {e}")

    if not gemini_api_key and not openrouter_api_key:
        raise ValueError(
            "No vision API available. Please add a Gemini or OpenRouter API key in Settings."
        )

    raise ValueError(
        "Image analysis failed with all providers. "
        "Please try a clearer image or describe the diagram in the chat instead. "
        f"Details: {'; '.join(errors)}"
    )
