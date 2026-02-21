"""
Resume service — orchestrates upload, analysis, scoring.
Uses in-memory store instead of a database.
"""

import logging
from datetime import datetime, timezone

from app.core import store
from app.modules.resume.analyzer import analyze_structure, chunk_text, extract_text
from app.modules.resume.embedder import generate_embeddings
from app.modules.resume.scorer import improvement, unified_evaluate

logger = logging.getLogger(__name__)


def process_upload(user_id: str, file_bytes: bytes, filename: str) -> dict:
    """Full pipeline: extract text → analyse structure → chunk → embed → store in memory."""
    raw_text = extract_text(file_bytes, filename)
    structured = analyze_structure(raw_text)
    chunks = chunk_text(raw_text)

    # Generate embeddings for retrieval during interview deep-dive
    embeddings = generate_embeddings(chunks)

    resume_id = store.new_id()
    resume = {
        "id": resume_id,
        "user_id": user_id,
        "filename": filename,
        "raw_text": raw_text,
        "structured_data": structured,
        "cv_score": None,
        "improvement_data": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    store.resumes[resume_id] = resume
    store.resume_chunks[resume_id] = chunks
    store.resume_embeddings[resume_id] = embeddings
    logger.info("Stored resume %s with %d chunks + embeddings", resume_id, len(chunks))
    return resume


def evaluate_resume(resume_id: str, jd_text: str = "") -> dict:
    resume = store.resumes.get(resume_id)
    if not resume:
        raise ValueError("Resume not found")
    result = unified_evaluate(resume["raw_text"], jd_text)
    resume["cv_score"] = result
    return result


def improve_resume(resume_id: str, jd_text: str = "") -> dict:
    resume = store.resumes.get(resume_id)
    if not resume:
        raise ValueError("Resume not found")
    result = improvement(resume["raw_text"], jd_text)
    resume["improvement_data"] = result
    return result
