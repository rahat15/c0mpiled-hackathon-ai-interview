"""
Interview Orchestrator — deterministic stage-flow controller.

Stage transitions & adaptive difficulty are controlled here in Python.
The LLM only generates natural language questions.
All conversation uses Groq.
"""

import logging
from datetime import datetime, timezone

from groq import Groq

from app.core import store
from app.core.config import settings
from app.models.interview import (
    InterviewStage,
    PersonalityMode,
    STAGE_ORDER,
)
from app.modules.interview.evaluator import composite_score, evaluate_answer
from app.modules.interview.prompts import build_question_prompt
from app.modules.interview.report import generate_final_report
from app.modules.interview.retrieval import retrieve_relevant_chunks

logger = logging.getLogger(__name__)


# ── Stage limits ─────────────────────────────────────────────────────────────

def _stage_limit(stage: InterviewStage) -> int:
    return {
        InterviewStage.INTRO: settings.STAGE_LIMITS_INTRO,
        InterviewStage.TECHNICAL: settings.STAGE_LIMITS_TECHNICAL,
        InterviewStage.DEEP_DIVE: settings.STAGE_LIMITS_DEEP_DIVE,
        InterviewStage.BEHAVIORAL: settings.STAGE_LIMITS_BEHAVIORAL,
        InterviewStage.CLOSING: settings.STAGE_LIMITS_CLOSING,
    }.get(stage, 3)


# ── LLM question generation via Groq ────────────────────────────────────────

def _generate_question(messages: list[dict]) -> str:
    resp = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        temperature=0.7,
    )
    return resp.choices[0].message.content.strip()


# ── Adaptive logic (Python-controlled, NOT LLM) ─────────────────────────────

def _adaptive_instruction(session: dict, eval_result: dict | None) -> str:
    if eval_result is None:
        return ""
    score = composite_score(eval_result)
    if eval_result.get("is_repetitive"):
        return "The candidate is being repetitive. Move to a different topic area."
    if eval_result.get("is_vague"):
        return "The candidate was vague. Ask them for a specific example or concrete details."
    if score < 0.5:
        return "The candidate struggled. Ask a simpler probing follow-up."
    if score > 0.8:
        return "The candidate answered very well. Escalate difficulty with a harder question."
    return ""


def _should_advance(session: dict, eval_result: dict | None) -> bool:
    stage = InterviewStage(session["stage"])
    limit = _stage_limit(stage)
    if session["stage_question_count"] >= limit:
        return True
    min_q = max(2, limit // 2)
    if eval_result and eval_result.get("is_repetitive") and session["stage_question_count"] >= min_q:
        return True
    return False


def _advance_stage(session: dict) -> None:
    try:
        idx = STAGE_ORDER.index(InterviewStage(session["stage"]))
        session["stage"] = STAGE_ORDER[idx + 1].value if idx + 1 < len(STAGE_ORDER) else InterviewStage.COMPLETED.value
    except (ValueError, IndexError):
        session["stage"] = InterviewStage.COMPLETED.value
    session["stage_question_count"] = 0
    logger.info("Advanced to stage: %s", session["stage"])


# ── Public API ───────────────────────────────────────────────────────────────

def create_session(
    user_id: str,
    resume_id: str,
    jd_text: str = "",
    personality: PersonalityMode = PersonalityMode.FRIENDLY,
) -> dict:
    if resume_id not in store.resumes:
        raise ValueError("Resume not found")

    sid = store.new_id()
    session = {
        "id": sid,
        "user_id": user_id,
        "resume_id": resume_id,
        "jd_text": jd_text,
        "personality": personality.value,
        "stage": InterviewStage.INTRO.value,
        "question_count": 0,
        "stage_question_count": 0,
        "history": [],
        "technical_scores": [],
        "communication_scores": [],
        "weak_topics": [],
        "strong_topics": [],
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

    # RAG-lite: keyword retrieval during deep_dive
    resume_context = ""
    if session["stage"] == InterviewStage.DEEP_DIVE.value:
        query_parts = list(session["weak_topics"][-3:])
        for e in reversed(session["history"]):
            if e["role"] == "interviewer":
                query_parts.append(e["content"])
                break
        if not query_parts:
            query_parts.append("technical skills experience")
        chunks = retrieve_relevant_chunks(session["resume_id"], " ".join(query_parts), top_k=2)
        if chunks:
            resume_context = "\n---\n".join(chunks)

    last_eval = session["technical_scores"][-1] if session["technical_scores"] else None
    adaptive = _adaptive_instruction(session, last_eval)

    messages = build_question_prompt(
        personality=PersonalityMode(session["personality"]),
        stage=InterviewStage(session["stage"]),
        history=history,
        resume_context=resume_context,
        jd_text=session["jd_text"],
        weak_topics=session["weak_topics"],
        adaptive_instruction=adaptive,
    )

    question = _generate_question(messages)

    session["history"].append({
        "role": "interviewer", "content": question, "stage": session["stage"],
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
        "role": "candidate", "content": answer, "stage": session["stage"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    ev = evaluate_answer(last_question, answer, session["stage"])
    session["technical_scores"].append(ev)
    cs = composite_score(ev)
    session["communication_scores"].append(ev.get("clarity", 0.5))

    topics = ev.get("key_topics", [])
    if cs >= 0.7:
        for t in topics:
            if t not in session["strong_topics"]:
                session["strong_topics"].append(t)
    elif cs < 0.5:
        for t in topics:
            if t not in session["weak_topics"]:
                session["weak_topics"].append(t)

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
