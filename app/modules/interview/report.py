"""
Final interview report generator — Groq only.

Scores from evaluator are on a 1-10 scale.  This module normalises them to
0-1 for the final report (frontend expects 0-1 floats).
"""

import json
import logging

from groq import Groq

from app.core.config import settings
from app.modules.interview.evaluator import composite_score
from app.modules.interview.prompts import build_report_prompt

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_history_summary(session: dict) -> str:
    lines = []
    for e in session.get("history", [])[-50:]:
        who = "Interviewer" if e["role"] == "interviewer" else "Candidate"
        stage = e.get("stage", "")
        followup = " [follow-up]" if e.get("is_followup") else ""
        lines.append(f"[{stage}{followup}] {who}: {e['content']}")
    return "\n".join(lines)


def _build_scores_summary(session: dict) -> str:
    scores = session.get("technical_scores", [])
    if not scores:
        return "No scored answers."
    n = len(scores)

    # Evaluator returns 1-10 scores
    avg_d = sum(s.get("technical_depth", 5) for s in scores) / n
    avg_r = sum(s.get("relevance", 5) for s in scores) / n
    avg_c = sum(s.get("clarity", 5) for s in scores) / n
    avg_conf = sum(s.get("confidence", 5) for s in scores) / n

    comm = session.get("communication_scores", [])
    avg_comm = sum(comm) / len(comm) if comm else avg_c / 10.0

    # Per-answer summaries
    answer_summaries = []
    for i, s in enumerate(scores[-10:], 1):
        summary = s.get("summary", "")
        if summary:
            answer_summaries.append(f"  Q{i}: {summary}")

    parts = [
        f"Avg technical_depth: {avg_d:.1f}/10",
        f"Avg relevance: {avg_r:.1f}/10",
        f"Avg clarity: {avg_c:.1f}/10",
        f"Avg confidence: {avg_conf:.1f}/10",
        f"Avg communication (normalised): {avg_comm:.2f}",
        f"Strong topics: {', '.join(session.get('strong_topics', [])) or 'None'}",
        f"Weak topics: {', '.join(session.get('weak_topics', [])) or 'None'}",
        f"Total questions: {session.get('question_count', 0)}",
        f"Round type: {session.get('round_type', 'full')}",
    ]
    if answer_summaries:
        parts.append("Recent answer summaries:")
        parts.extend(answer_summaries)
    return "\n".join(parts)


def _deterministic_rec(report: dict) -> str:
    avg = (
        report.get("technicalCompetency", 0)
        + report.get("problemSolving", 0)
        + report.get("communication", 0)
        + report.get("behavioralFit", 0)
    ) / 4
    if avg >= 0.85:
        return "Strong Hire"
    if avg >= 0.70:
        return "Hire"
    if avg >= 0.55:
        return "Lean Yes"
    if avg >= 0.40:
        return "Lean No"
    return "No Hire"


# ─────────────────────────────────────────────────────────────────────────────
# Report generation
# ─────────────────────────────────────────────────────────────────────────────

def generate_final_report(session: dict) -> dict:
    messages = build_report_prompt(
        _build_history_summary(session),
        _build_scores_summary(session),
    )
    try:
        resp = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0,
            response_format={"type": "json_object"},
        )
        report = json.loads(resp.choices[0].message.content)
        for k in ("technicalCompetency", "problemSolving", "communication", "behavioralFit"):
            report[k] = max(0.0, min(1.0, float(report.get(k, 0))))
        for k in ("strengths", "weaknesses", "improvementPlan"):
            if not isinstance(report.get(k), list):
                report[k] = []
        valid = {"Strong Hire", "Hire", "Lean Yes", "Lean No", "No Hire"}
        if report.get("hiringRecommendation") not in valid:
            report["hiringRecommendation"] = _deterministic_rec(report)

        # Attach per-answer evaluations so the frontend can show Q&A scores
        report["answerEvaluations"] = _answer_evaluations(session)
        return report
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        return _fallback_report(session)


def _answer_evaluations(session: dict) -> list[dict]:
    """Build a list of Q&A + scores for the frontend's review panel."""
    evals = session.get("evaluations", session.get("technical_scores", []))
    history = session.get("history", [])

    pairs: list[dict] = []
    q_idx = 0
    for entry in history:
        if entry["role"] == "interviewer":
            q_text = entry["content"]
        elif entry["role"] == "candidate":
            ev = evals[q_idx] if q_idx < len(evals) else {}
            pairs.append({
                "question": q_text if "q_text" in dir() else "",
                "answer": entry["content"],
                "stage": entry.get("stage", ""),
                "clarity": ev.get("clarity", 5),
                "confidence": ev.get("confidence", 5),
                "technical_depth": ev.get("technical_depth", 5),
                "relevance": ev.get("relevance", 5),
                "composite": round(composite_score(ev), 2) if ev else 0,
                "summary": ev.get("summary", ""),
            })
            q_idx += 1
    return pairs


# ─────────────────────────────────────────────────────────────────────────────
# Fallback
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_report(session: dict) -> dict:
    scores = session.get("technical_scores", [])
    if not scores:
        return {
            "technicalCompetency": 0, "problemSolving": 0,
            "communication": 0, "behavioralFit": 0,
            "strengths": [], "weaknesses": [],
            "improvementPlan": [], "hiringRecommendation": "No Hire",
            "answerEvaluations": [],
        }
    n = len(scores)

    # Normalise 1-10 scores to 0-1
    tech = sum(s.get("technical_depth", 5) for s in scores) / (n * 10)
    rel = sum(s.get("relevance", 5) for s in scores) / (n * 10)
    clar = sum(s.get("clarity", 5) for s in scores) / (n * 10)
    conf = sum(s.get("confidence", 5) for s in scores) / (n * 10)

    comm_list = session.get("communication_scores", [])
    comm = sum(comm_list) / len(comm_list) if comm_list else clar

    report = {
        "technicalCompetency": round(tech, 2),
        "problemSolving": round(rel, 2),
        "communication": round(comm, 2),
        "behavioralFit": round((conf + clar) / 2, 2),
        "strengths": session.get("strong_topics", [])[:5],
        "weaknesses": session.get("weak_topics", [])[:5],
        "improvementPlan": [f"Improve: {t}" for t in session.get("weak_topics", [])[:3]],
        "hiringRecommendation": "",
        "answerEvaluations": _answer_evaluations(session),
    }
    report["hiringRecommendation"] = _deterministic_rec(report)
    return report
