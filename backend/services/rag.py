"""
ChromaDB in-memory RAG service.
Uses the new `google-genai` SDK (NOT the deprecated `google-generativeai`)
with the gemini-embedding-001 model, which is the current generally-available
embedding model as of this build.
"""
import logging
from typing import Optional, List, Dict, Tuple, Any

import chromadb
from google import genai

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "gemini-embedding-001"

# Diagram type -> collection names to query
DIAGRAM_TYPE_TO_COLLECTIONS = {
    "flowchart": ["mermaid_flowchart"],
    "sequence": ["mermaid_sequence", "plantuml_sequence"],
    "class": ["mermaid_class", "plantuml_class"],
    "er": ["mermaid_er"],
    "architecture": ["mermaid_flowchart"],
    "auto": ["mermaid_flowchart", "mermaid_sequence", "mermaid_class",
             "mermaid_er", "plantuml_class", "plantuml_sequence"],
}


class RAGService:
    _instance: Optional["RAGService"] = None

    def __init__(self, gemini_api_key: str):
        # In-memory only — Render safe, no filesystem permissions needed
        self.client = chromadb.Client()
        self._default_api_key = gemini_api_key
        self.collections: Dict[str, Any] = {}
        self._chunk_counts: Dict[str, int] = {}
        self._source_urls: Dict[str, str] = {}

    @classmethod
    def get_instance(cls, gemini_api_key: Optional[str] = None) -> "RAGService":
        """
        The ChromaDB collections (parsed syntax docs) are shared, server-owned
        content — they only need to be built once. The embedding client used
        for a given call is resolved separately in _embed() so a per-request
        user-supplied key is always honored, even after the singleton has
        already been created with the server's key.
        """
        if cls._instance is None:
            if not gemini_api_key:
                raise ValueError("gemini_api_key required for first initialization")
            cls._instance = cls(gemini_api_key)
        elif gemini_api_key:
            # FIX (Bug 2): always honor an explicitly-passed key instead of
            # only filling it in when the stored key was empty. This allows
            # key rotation / refresh instead of permanently sticking to the
            # first key ever seen.
            cls._instance._default_api_key = gemini_api_key
        return cls._instance

    @classmethod
    def reset_instance(cls):
        """Mainly useful for tests."""
        cls._instance = None

    def _get_or_create_collection(self, name: str):
        if name not in self.collections:
            # embedding_function=None — we always pass embeddings manually
            self.collections[name] = self.client.get_or_create_collection(
                name=name,
                embedding_function=None
            )
        return self.collections[name]

    def _embed(self, text: str, api_key: Optional[str] = None) -> List[float]:
        """Embed text with Gemini. Returns a flat list of floats.
        Uses api_key if given (per-request user key), else the default
        key the service was initialized with."""
        key = api_key or self._default_api_key
        client = genai.Client(api_key=key)
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        return response.embeddings[0].values

    def _chunk_text(self, text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks on newline boundaries."""
        if len(text) <= chunk_size:
            stripped = text.strip()
            return [stripped] if stripped else []

        chunks = []
        lines = text.split("\n")
        current_chunk: List[str] = []
        current_len = 0

        for line in lines:
            # FIX (Bug 1): if a single line is itself longer than chunk_size,
            # force-split it instead of letting an oversized chunk through
            # (which can blow past embedding API limits and get silently
            # dropped later in add_docs).
            if len(line) > chunk_size:
                if current_chunk:
                    chunk_text = "\n".join(current_chunk).strip()
                    if chunk_text:
                        chunks.append(chunk_text)
                    current_chunk = []
                    current_len = 0
                for i in range(0, len(line), chunk_size):
                    piece = line[i:i + chunk_size].strip()
                    if piece:
                        chunks.append(piece)
                continue

            line_len = len(line) + 1
            if current_len + line_len > chunk_size and current_chunk:
                chunk_text = "\n".join(current_chunk).strip()
                if chunk_text:
                    chunks.append(chunk_text)
                overlap_lines: List[str] = []
                overlap_len = 0
                for ol in reversed(current_chunk):
                    if overlap_len + len(ol) > overlap:
                        break
                    overlap_lines.insert(0, ol)
                    overlap_len += len(ol)
                current_chunk = overlap_lines
                current_len = overlap_len

            current_chunk.append(line)
            current_len += line_len

        if current_chunk:
            chunk_text = "\n".join(current_chunk).strip()
            if chunk_text:
                chunks.append(chunk_text)

        return chunks

    def add_docs(self, collection_name: str, content: str, source_url: str = "") -> int:
        """Add documentation chunks to a collection. Returns chunk count."""
        chunks = self._chunk_text(content)
        if not chunks:
            return 0

        collection = self._get_or_create_collection(collection_name)

        try:
            existing = collection.get()
            if existing["ids"]:
                collection.delete(ids=existing["ids"])
        except Exception as e:
            # FIX (Bug 3): log instead of silently swallowing. If this
            # actually fails, leftover ids can later collide with the
            # ids generated below and crash collection.add() with no
            # useful context, so we want this in the logs.
            logger.warning(f"Could not clear existing docs for {collection_name}: {e}")

        embeddings = []
        valid_chunks = []

        for chunk in chunks:
            try:
                emb = self._embed(chunk)
                embeddings.append(emb)
                valid_chunks.append(chunk)
            except Exception as e:
                logger.warning(f"Failed to embed chunk: {e}")
                continue

        if not valid_chunks:
            return 0

        ids = [f"{collection_name}_{i}" for i in range(len(valid_chunks))]
        metadatas = [
            {"collection": collection_name, "source_url": source_url, "chunk_index": i}
            for i in range(len(valid_chunks))
        ]

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=valid_chunks,
            metadatas=metadatas
        )

        self._chunk_counts[collection_name] = len(valid_chunks)
        if source_url:
            self._source_urls[collection_name] = source_url

        return len(valid_chunks)

    def query(
        self, diagram_type: str, query_text: str, top_k: int = 3,
        api_key: Optional[str] = None
    ) -> Tuple[str, List[Dict]]:
        """
        Query relevant collections for syntax rules.
        Returns (combined_text, citations_list).
        Never raises — returns ("", []) on total failure so callers can fall back.
        """
        collection_names = DIAGRAM_TYPE_TO_COLLECTIONS.get(diagram_type, ["mermaid_flowchart"])

        try:
            query_embedding = self._embed(query_text, api_key=api_key)
        except Exception as e:
            logger.warning(f"Failed to embed query: {e}")
            return "", []

        all_chunks = []
        citations: List[Dict] = []

        for col_name in collection_names:
            if col_name not in self.collections:
                continue
            try:
                count = self._chunk_counts.get(col_name, 0)
                if count == 0:
                    continue
                results = self.collections[col_name].query(
                    query_embeddings=[query_embedding],
                    n_results=min(top_k, count)
                )
                docs = results["documents"][0] if results["documents"] else []
                metas = results["metadatas"][0] if results["metadatas"] else []

                for doc, meta in zip(docs, metas):
                    all_chunks.append(doc)
                    source_url = meta.get("source_url", self._source_urls.get(col_name, ""))
                    if source_url and not any(c["url"] == source_url for c in citations):
                        citations.append({
                            "collection": col_name,
                            "url": source_url,
                            "title": col_name.replace("_", " ").title()
                        })
            except Exception as e:
                logger.warning(f"Query failed for collection {col_name}: {e}")
                continue

        return "\n\n---\n\n".join(all_chunks), citations

    def get_status(self) -> dict:
        return {
            "collections_loaded": len(self.collections),
            "chunk_counts": self._chunk_counts,
            "total_chunks": sum(self._chunk_counts.values())
        }