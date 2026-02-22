"""
Answer evaluation engine + follow-up decision system.

Two responsibilities:
  1. evaluate_answer  → score each answer (clarity, confidence, depth, relevance)
  2. followup_decision → rule-based + LLM hybrid to decide follow-up vs advance

Inspired by rahat15/AI-Interview-backend's hybrid approach.
"""

from __future__ import annotations

import json
import logging

from groq import Groq

from app.core.config import settings
from app.models.interview import FOLLOWUP_LIMITS, InterviewStage
from app.modules.interview.prompts import (
    build_evaluation_prompt,
    build_followup_decision_prompt,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Heuristic fallback
# ─────────────────────────────────────────────────────────────────────────────

def _heuristic_score(answer: str) -> dict:
    """Quick local scoring when the LLM call fails."""
    wc = len(answer.split())
    depth = 3 if wc < 15 else 5 if wc < 40 else 6 if wc < 100 else 7
    specifics = [
        "for example", "specifically", "we implemented", "i built",
        "trade-off", "architecture", "result was", "outcome",
    ]
    found = sum(1 for kw in specifics if kw in answer.lower())
    if found >= 2:
        depth = min(depth + 1, 10)
    clarity = 4 if wc < 15 else 6 if wc < 40 else 7
    return {
        "clarity": clarity,
        "confidence": 5,
        "technical_depth": depth,
        "relevance": 5,
        "is_vague": wc < 20 and found == 0,
        "is_repetitive": False,
        "key_topics": [],
        "summary": "Heuristic fallback evaluation.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main evaluation
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_answer(
    question: str,
    answer: str,
    stage: str,
    jd_text: str = "",
    cv_text: str = "",
) -> dict:
    """Evaluate a candidate's answer using LLM, with heuristic fallback."""
    messages = build_evaluation_prompt(question, answer, stage, jd_text, cv_text)
    try:
        resp = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content)
        # Clamp scores to 1-10 range
        for k in ("clarity", "confidence", "technical_depth", "relevance"):
            result[k] = max(1, min(10, int(result.get(k, 5))))
        result.setdefault("is_vague", False)
        result.setdefault("is_repetitive", False)
        result.setdefault("key_topics", [])
        result.setdefault("summary", "")
        return result
    except Exception as exc:
        logger.warning("LLM eval failed, using heuristic: %s", exc)
        return _heuristic_score(answer)


def composite_score(ev: dict) -> float:
    """Compute 0-1 composite from 1-10 evaluation scores."""
    clarity = ev.get("clarity", 5)
    tech = ev.get("technical_depth", 5)
    relevance = ev.get("relevance", 5)
    confidence = ev.get("confidence", 5)
    # Weighted average, normalized to 0-1
    raw = (tech * 0.35 + relevance * 0.30 + clarity * 0.20 + confidence * 0.15)
    return round(raw / 10.0, 3)


# ─────────────────────────────────────────────────────────────────────────────
# Follow-up decision (hybrid rule-based + LLM)
# ─────────────────────────────────────────────────────────────────────────────

def followup_decision(
    stage: str,
    question: str,
    answer: str,
    evaluation: dict,
    stage_followup_count: int = 0,
) -> dict:
    """
    Decide whether to ask a follow-up or advance to the next stage.
    Returns {"decision": "followup"|"stage_transition", "reason": "..."}.
    """
    try:
        stage_enum = InterviewStage(stage)
    except ValueError:
        stage_enum = InterviewStage.INTRO

    max_followups = FOLLOWUP_LIMITS.get(stage_enum, 1)

    # Hard rule: already at follow-up limit
    if stage_followup_count >= max_followups:
        return {"decision": "stage_transition", "reason": "Follow-up limit reached"}

    # Hard rule: intro and closing never get follow-ups
    if stage_enum in (InterviewStage.INTRO, InterviewStage.CLOSING):
        return {"decision": "stage_transition", "reason": "Intro/closing stage"}

    clarity = evaluation.get("clarity", 5)
    confidence = evaluation.get("confidence", 5)
    tech_depth = evaluation.get("technical_depth", 5)

    # Rule: blank or extremely vague answer → follow-up
    if not answer.strip() or evaluation.get("is_vague"):
        return {"decision": "followup", "reason": "Blank or vague answer"}

    # Rule: low clarity or confidence → follow-up
    if clarity <= 4 or confidence <= 4:
        return {"decision": "followup", "reason": "Low clarity or confidence"}

    # Rule: strong answer → advance (unless technical depth is weak in tech stage)
    if clarity >= 7 and confidence >= 7:
        if stage_enum not in (InterviewStage.TECHNICAL, InterviewStage.DEEP_DIVE) or tech_depth >= 6:
            return {"decision": "stage_transition", "reason": "Strong answer"}

    # Borderline → ask LLM
    try:
        messages = build_followup_decision_prompt(
            stage=stage,
            question=question,
            answer=answer[:500],
            clarity=clarity,
            confidence=confidence,
            technical_depth=tech_depth,
        )
        resp = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0,
            max_tokens=80,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content)
        decision = result.get("decision", "stage_transition")
        reason = result.get("reason", "LLM decision")
        if decision not in ("followup", "stage_transition"):
            decision = "stage_transition"
        return {"decision": decision, "reason": reason}
    except Exception as exc:
        logger.warning("Follow-up LLM failed, defaulting to stage_transition: %s", exc)
        return {"decision": "stage_transition", "reason": "LLM fallback"}
