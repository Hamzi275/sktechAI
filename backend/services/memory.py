"""
In-memory chat history manager. Scoped to current image session.
New image upload clears history. Text-only prompts use the same history.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict

MAX_HISTORY = 12  # keep last 12 exchanges


@dataclass
class ChatMessage:
    role: str  # "user" or "assistant"
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    has_image: bool = False
    citations: List[Dict] = field(default_factory=list)


class SessionMemory:
    """Singleton managing chat history per session."""
    _instance: Optional["SessionMemory"] = None

    def __init__(self):
        self.messages: List[ChatMessage] = []
        self.current_image_id: Optional[str] = None

    @classmethod
    def get_instance(cls) -> "SessionMemory":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def new_image(self, image_id: str):
        """Call when user uploads new image. Clears history if it's a different image."""
        if self.current_image_id != image_id:
            self.messages = []
            self.current_image_id = image_id

    def add_user_message(self, content: str, has_image: bool = False):
        self.messages.append(ChatMessage(role="user", content=content, has_image=has_image))
        self._trim()

    def add_assistant_message(self, content: str, citations: Optional[List[Dict]] = None):
        self.messages.append(ChatMessage(
            role="assistant", content=content, citations=citations or []
        ))
        self._trim()

    def get_history_for_llm(self) -> List[Dict]:
        """Return last MAX_HISTORY messages in LLM format."""
        return [{"role": m.role, "content": m.content} for m in self.messages[-MAX_HISTORY:]]

    def get_display_history(self) -> List[Dict]:
        """Return full message list for frontend display."""
        return [
            {"role": m.role, "content": m.content,
             "timestamp": m.timestamp, "citations": m.citations}
            for m in self.messages
        ]

    def _trim(self):
        if len(self.messages) > MAX_HISTORY * 2:
            self.messages = self.messages[-(MAX_HISTORY * 2):]

    def clear(self):
        self.messages = []
        self.current_image_id = None


session_memory = SessionMemory.get_instance()
