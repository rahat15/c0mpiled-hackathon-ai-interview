"""
Interview Orchestrator — conversational, dynamic, intent-driven.

Inspired by rahat15/AI-Interview-backend:
  ● Strict stage isolation (each stage has its own rules & FORBIDDEN list)
  ● Hybrid follow-up decision (rule-based + LLM for borderline cases)
  ● CV/JD analysis for personalized, context-rich questions
  ● Adaptive difficulty based on answer quality
  ● Round-type support (full, technical, behavioral, HR)
  ● Question variety tracking — never asks the same thing twice

The LLM only generates natural language. All control flow lives here in Python.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from groq import Groq

from app.core import store
from app.core.config import settings
from app.models.interview import (
    FOLLOWUP_LIMITS,
    ROUND_STAGES,
    STAGE_QUESTION_COUNTS,
    InterviewStage,
    PersonalityMode,
    RoundType,
)
from app.modules.interview.evaluator import (
    composite_score,
    evaluate_answer,
    followup_decision,
)
from app.modules.interview.prompts import build_question_prompt
from app.modules.interview.report import generate_final_report
from app.modules.interview.retrieval import retrieve_relevant_chunks

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# CV / JD analysis (local, no LLM needed)
# ─────────────────────────────────────────────────────────────────────────────

def _analyze_cv(raw_text: str) -> dict:
    """Extract structured info from resume text for context-rich prompts."""
    text_lower = raw_text.lower()
    lines = raw_text.strip().split("\n")

    # Try to extract name (first non-empty line that looks like a name)
    name = ""
    for line in lines[:5]:
        clean = line.strip()
        if clean and len(clean.split()) <= 5 and not any(c.isdigit() for c in clean):
            if "@" not in clean and "http" not in clean:
                name = clean
                break

    # Extract skills (common tech keywords)
    tech_keywords = [
        "python", "javascript", "typescript", "react", "node", "fastapi", "django",
        "flask", "java", "c++", "go", "rust", "docker", "kubernetes", "aws", "gcp",
        "azure", "postgresql", "mongodb", "redis", "graphql", "rest", "sql",
        "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
        "git", "ci/cd", "microservices", "kafka", "rabbitmq", "elasticsearch",
        "html", "css", "tailwind", "next.js", "vue", "angular", "spring",
    ]
    skills = [kw for kw in tech_keywords if kw in text_lower]

    # Try to find experience years
    years_match = re.search(r"(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)", text_lower)
    experience_years = int(years_match.group(1)) if years_match else 0

    # Extract project-like sections
    projects = []
    for line in lines:
        clean = line.strip()
        if len(clean) > 20 and any(kw in clean.lower() for kw in ["built", "developed", "designed", "implemented", "created", "led"]):
            projects.append(clean[:150])
            if len(projects) >= 5:
                break

    # Try to find current role
    role_patterns = [
        r"(?:currently|present)\s*(?:working\s*as|role:?)\s*(.+)",
        r"^(.+?(?:engineer|developer|designer|manager|lead|architect|scientist|analyst))",
    ]
    current_role = ""
    for pat in role_patterns:
        match = re.search(pat, raw_text, re.IGNORECASE | re.MULTILINE)
        if match:
            current_role = match.group(1).strip()[:80]
            break

    return {
        "candidate_name": name,
        "current_role": current_role,
        "experience_years": experience_years,
        "skills": skills[:15],
        "projects": projects,
    }


def _detect_round_type(jd_text: str) -> RoundType:
    """Try to detect the round type from the JD context string."""
    text_lower = jd_text.lower()
    if "interview focus: technical" in text_lower:
        return RoundType.TECHNICAL
    if "interview focus: behavioral" in text_lower:
        return RoundType.BEHAVIORAL
    if "interview focus: problem solving" in text_lower:
        return RoundType.TECHNICAL  # map to technical
    return RoundType.FULL


# ─────────────────────────────────────────────────────────────────────────────
# Stage logic helpers
# ─────────────────────────────────────────────────────────────────────────────

def _stage_limit(session: dict, stage: InterviewStage) -> int:
    """Get question limit for this stage & round type."""
    round_type = RoundType(session.get("round_type", "full"))
    counts = STAGE_QUESTION_COUNTS.get(round_type, STAGE_QUESTION_COUNTS[RoundType.FULL])
    return counts.get(stage, 2)


def _get_stage_order(session: dict) -> list[InterviewStage]:
    round_type = RoundType(session.get("round_type", "full"))
    return ROUND_STAGES.get(round_type, ROUND_STAGES[RoundType.FULL])


def _advance_stage(session: dict) -> None:
    """Move to the next stage in the round's stage order."""
    stages = _get_stage_order(session)
    try:
        idx = stages.index(InterviewStage(session["stage"]))
        session["stage"] = stages[idx + 1].value if idx + 1 < len(stages) else InterviewStage.COMPLETED.value
    except (ValueError, IndexError):
        session["stage"] = InterviewStage.COMPLETED.value
    session["stage_question_count"] = 0
    session["stage_followup_count"] = 0
    logger.info("Advanced to stage: %s", session["stage"])


def _should_advance(session: dict, eval_result: dict | None) -> bool:
    """Decide if we should move to the next stage (ignoring follow-up)."""
    stage = InterviewStage(session["stage"])
    limit = _stage_limit(session, stage)
    if session["stage_question_count"] >= limit:
        return True
    min_q = max(1, limit // 2)
    if eval_result and eval_result.get("is_repetitive") and session["stage_question_count"] >= min_q:
        return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Adaptive instruction (Python-controlled, not LLM)
# ─────────────────────────────────────────────────────────────────────────────

def _adaptive_instruction(session: dict, eval_result: dict | None) -> str:
    if eval_result is None:
        return ""
    score = composite_score(eval_result)
    if eval_result.get("is_repetitive"):
        return "The candidate is being repetitive. Move to a different topic area."
    if eval_result.get("is_vague"):
        return "The candidate was vague. Ask them for a specific example or concrete details."
    if score < 0.4:
        return "The candidate struggled significantly. Ask a simpler probing follow-up."
    if score < 0.55:
        return "The candidate's answer was weak. Try a different angle on the same topic."
    if score > 0.8:
        return "The candidate answered very well. Escalate difficulty with a harder question."
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# LLM question generation via Groq
# ─────────────────────────────────────────────────────────────────────────────

def _generate_question(messages: list[dict]) -> str:
    resp = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=300,
    )
    raw = resp.choices[0].message.content.strip()
    # Clean up: keep only the first meaningful paragraph
    # Remove common filler prefixes
    for prefix in ["Sure,", "Here is a question:", "Here's a question:", "Question:"]:
        if raw.startswith(prefix):
            raw = raw[len(prefix):].strip()
    return raw


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def create_session(
    user_id: str,
    resume_id: str,
    jd_text: str = "",
    personality: PersonalityMode = PersonalityMode.FRIENDLY,
) -> dict:
    if resume_id not in store.resumes:
        raise ValueError("Resume not found")

    resume = store.resumes[resume_id]
    cv_analysis = _analyze_cv(resume.get("raw_text", ""))
    round_type = _detect_round_type(jd_text)
    stage_order = ROUND_STAGES[round_type]

    sid = store.new_id()
    session = {
        "id": sid,
        "user_id": user_id,
        "resume_id": resume_id,
        "jd_text": jd_text,
        "personality": personality.value,
        "round_type": round_type.value,
        "stage": stage_order[0].value,
        "stage_order": [s.value for s in stage_order],
        "question_count": 0,
        "stage_question_count": 0,
        "stage_followup_count": 0,
        "history": [],
        "evaluations": [],
        "technical_scores": [],
        "communication_scores": [],
        "weak_topics": [],
        "strong_topics": [],
        "asked_questions_hashes": set(),
        "cv_analysis": cv_analysis,
        "final_report": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    store.sessions[sid] = session
    return session


def get_next_question(session_id: str) -> tuple[str, dict]:
    session = store.sessions.get(session_id)
    if not session:
        raise ValueError("Session not found")
    if session["stage"] in (InterviewStage.COMPLETED.value, InterviewStage.FINAL_EVALUATION.value):
        raise ValueError("Interview is already complete")

    history = [{"role": e["role"], "content": e["content"]} for e in session["history"]]
    resume = store.resumes.get(session["resume_id"], {})

    # Determine if this should be a follow-up
    is_followup = session.get("_pending_followup", False)
    session["_pending_followup"] = False

    last_question = ""
    last_answer = ""
    if is_followup:
        for e in reversed(session["history"]):
            if e["role"] == "candidate" and not last_answer:
                last_answer = e["content"]
            elif e["role"] == "interviewer" and not last_question:
                last_question = e["content"]
            if last_question and last_answer:
                break

    # RAG-lite: keyword retrieval during deep_dive
    resume_context = ""
    if session["stage"] == InterviewStage.DEEP_DIVE.value:
        query_parts = list(session["weak_topics"][-3:])
        for e in reversed(session["history"]):
            if e["role"] == "interviewer":
                query_parts.append(e["content"])
                break
        if not query_parts:
            query_parts.append("technical skills experience projects")
        chunks = retrieve_relevant_chunks(session["resume_id"], " ".join(query_parts), top_k=2)
        if chunks:
            resume_context = "\n---\n".join(chunks)

    last_eval = session["evaluations"][-1] if session["evaluations"] else None
    adaptive = _adaptive_instruction(session, last_eval)

    messages = build_question_prompt(
        personality=PersonalityMode(session["personality"]),
        stage=InterviewStage(session["stage"]),
        history=history,
        resume_context=resume_context,
        jd_text=session["jd_text"],
        weak_topics=session["weak_topics"],
        strong_topics=session["strong_topics"],
        adaptive_instruction=adaptive,
        is_followup=is_followup,
        last_question=last_question,
        last_answer=last_answer,
        cv_analysis=session.get("cv_analysis"),
    )

    question = _generate_question(messages)

    # Track question hash to avoid exact repeats
    q_hash = hash(question.lower().strip()[:100])
    attempts = 0
    while q_hash in session["asked_questions_hashes"] and attempts < 2:
        question = _generate_question(messages)
        q_hash = hash(question.lower().strip()[:100])
        attempts += 1
    session["asked_questions_hashes"].add(q_hash)

    session["history"].append({
        "role": "interviewer",
        "content": question,
        "stage": session["stage"],
        "is_followup": is_followup,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    session["question_count"] += 1
    session["stage_question_count"] += 1
    return question, session


def submit_answer(session_id: str, answer: str) -> tuple[dict, dict]:
    session = store.sessions.get(session_id)
    if not session:
        raise ValueError("Session not found")
    if session["stage"] in (InterviewStage.COMPLETED.value, InterviewStage.FINAL_EVALUATION.value):
        raise ValueError("Interview already complete")

    last_question = ""
    for e in reversed(session["history"]):
        if e["role"] == "interviewer":
            last_question = e["content"]
            break

    session["history"].append({
        "role": "candidate",
        "content": answer,
        "stage": session["stage"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Evaluate
    resume = store.resumes.get(session["resume_id"], {})
    ev = evaluate_answer(
        question=last_question,
        answer=answer,
        stage=session["stage"],
        jd_text=session["jd_text"],
        cv_text=resume.get("raw_text", "")[:2000],
    )
    session["evaluations"].append(ev)
    session["technical_scores"].append(ev)
    cs = composite_score(ev)
    session["communication_scores"].append(ev.get("clarity", 5) / 10.0)

    # Track strong/weak topics
    topics = ev.get("key_topics", [])
    if cs >= 0.7:
        for t in topics:
            if t not in session["strong_topics"]:
                session["strong_topics"].append(t)
    elif cs < 0.45:
        for t in topics:
            if t not in session["weak_topics"]:
                session["weak_topics"].append(t)

    # ── Follow-up decision ──
    fd = followup_decision(
        stage=session["stage"],
        question=last_question,
        answer=answer,
        evaluation=ev,
        stage_followup_count=session["stage_followup_count"],
    )
    logger.info("Follow-up decision: %s (reason: %s)", fd["decision"], fd["reason"])

    if fd["decision"] == "followup":
        # Schedule a follow-up instead of advancing
        session["_pending_followup"] = True
        session["stage_followup_count"] += 1
    else:
        # Check if we should advance stage
        session["_pending_followup"] = False
        if _should_advance(session, ev):
            _advance_stage(session)

    return ev, session


def complete_interview(session_id: str) -> dict:
    session = store.sessions.get(session_id)
    if not session:
        raise ValueError("Session not found")
    if session["final_report"]:
        return session["final_report"]

    session["stage"] = InterviewStage.FINAL_EVALUATION.value
    report = generate_final_report(session)
    session["final_report"] = report
    session["stage"] = InterviewStage.COMPLETED.value
    return report
