"""
Resume service - orchestrates upload, analysis, scoring.
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
    """Full pipeline: extract text -> analyse structure -> chunk -> embed -> store in memory."""
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


def full_evaluate(resume_id: str, jd_text: str = "") -> dict:
    """
    Evaluate a resume.  Always returns cv_quality (with subscores + evidence)
    and key_takeaways.  When a JD is provided, also returns jd_match,
    fit_index, and enhancement (tailored_resume, top_1_percent_gap, cover_letter).
    """
    resume = store.resumes.get(resume_id)
    if not resume:
        raise ValueError("Resume not found")

    # Step 1: CV quality + optional JD match
    eval_result = unified_evaluate(resume["raw_text"], jd_text)
    resume["cv_score"] = eval_result

    has_jd = bool(jd_text and jd_text.strip())

    cv_quality = eval_result.get("cv_quality", {"overall_score": 0, "subscores": []})
    jd_match = eval_result.get("jd_match") if has_jd else None
    key_takeaways = eval_result.get("key_takeaways", {"red_flags": [], "green_flags": []})

    # Compute fit_index: 0.6 × JD Match + 0.4 × CV Quality (both out of 100)
    fit_index = None
    if has_jd and jd_match:
        cv_score = cv_quality.get("overall_score", 0)
        jd_score = jd_match.get("overall_score", 0)
        fit_index = round(0.6 * jd_score + 0.4 * cv_score, 1)

    output = {
        "resume_id": resume_id,
        "cv_quality": cv_quality,
        "jd_match": jd_match,
        "key_takeaways": key_takeaways,
        "fit_index": fit_index,
        "enhancement": None,
    }

    # Step 2: If JD was given, also generate improvements
    if has_jd:
        imp = improvement(resume["raw_text"], jd_text)
        resume["improvement_data"] = imp
        output["enhancement"] = {
            "tailored_resume": imp.get("tailored_resume", {}),
            "top_1_percent_gap": imp.get("top_1_percent_gap", {}),
            "cover_letter": imp.get("cover_letter", ""),
        }

    return output
