"""
In-memory data store.
Replaces a database — all data lives in dicts keyed by UUID strings.
Data resets when the server restarts.
"""

import uuid
from typing import Any

# ── Storage dicts ────────────────────────────────────────────────────────────

users: dict[str, dict[str, Any]] = {}          # user_id  → user dict
resumes: dict[str, dict[str, Any]] = {}        # resume_id → resume dict
resume_chunks: dict[str, list[str]] = {}       # resume_id → list of text chunks
resume_embeddings: dict[str, Any] = {}         # resume_id → numpy array of shape (n_chunks, dim)
sessions: dict[str, dict[str, Any]] = {}       # session_id → interview session dict


def new_id() -> str:
    return str(uuid.uuid4())
