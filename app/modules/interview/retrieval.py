"""
Lightweight retrieval using sentence-transformer embeddings.
Embeddings are stored in-memory (no vector DB).
Used exclusively during the deep_dive stage by the orchestrator.
"""

import numpy as np

from app.core import store
from app.modules.resume.embedder import generate_query_embedding


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0


def retrieve_relevant_chunks(resume_id: str, query: str, top_k: int = 2) -> list[str]:
    """Return the top-k resume chunks most semantically similar to the query."""
    chunks = store.resume_chunks.get(resume_id, [])
    embeddings = store.resume_embeddings.get(resume_id)
    if not chunks or embeddings is None:
        return []

    query_emb = generate_query_embedding(query)

    scored = []
    for idx, chunk in enumerate(chunks):
        sim = _cosine_similarity(query_emb, embeddings[idx])
        scored.append((sim, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [text for _, text in scored[:top_k]]
