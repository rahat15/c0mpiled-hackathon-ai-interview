"""
Final interview report generator — Groq only.
"""

import json
import logging

from groq import Groq

from app.core.config import settings
from app.modules.interview.prompts import build_report_prompt

logger = logging.getLogger(__name__)


def _build_history_summary(session: dict) -> str:
    lines = []
    for e in session.get("history", [])[-40:]:
        who = "Interviewer" if e["role"] == "interviewer" else "Candidate"
        lines.append(f"[{e['stage']}] {who}: {e['content']}")
    return "\n".join(lines)


def _build_scores_summary(session: dict) -> str:
    scores = session.get("technical_scores", [])
    if not scores:
        return "No scored answers."
    n = len(scores)
    avg_d = sum(s.get("technical_depth", 0) for s in scores) / n
    avg_r = sum(s.get("relevance", 0) for s in scores) / n
    avg_c = sum(s.get("clarity", 0) for s in scores) / n
    comm = session.get("communication_scores", [])
    avg_comm = sum(comm) / len(comm) if comm else 0
    return (
        f"Avg technical_depth: {avg_d:.2f}\nAvg relevance: {avg_r:.2f}\n"
        f"Avg clarity: {avg_c:.2f}\nAvg communication: {avg_comm:.2f}\n"
        f"Strong topics: {', '.join(session.get('strong_topics', [])) or 'None'}\n"
        f"Weak topics: {', '.join(session.get('weak_topics', [])) or 'None'}\n"
        f"Total questions: {session.get('question_count', 0)}"
    )


def _deterministic_rec(report: dict) -> str:
    avg = (report.get("technicalCompetency", 0) + report.get("problemSolving", 0)
           + report.get("communication", 0) + report.get("behavioralFit", 0)) / 4
    if avg >= 0.85: return "Strong Hire"
    if avg >= 0.70: return "Hire"
    if avg >= 0.55: return "Lean Yes"
    if avg >= 0.40: return "Lean No"
    return "No Hire"


def generate_final_report(session: dict) -> dict:
    messages = build_report_prompt(_build_history_summary(session), _build_scores_summary(session))
    try:
        resp = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
            model=settings.GROQ_MODEL, messages=messages,
            temperature=0, response_format={"type": "json_object"},
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
        return report
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        return _fallback_report(session)


def _fallback_report(session: dict) -> dict:
    scores = session.get("technical_scores", [])
    if not scores:
        return {"technicalCompetency": 0, "problemSolving": 0, "communication": 0, "behavioralFit": 0,
                "strengths": [], "weaknesses": [], "improvementPlan": [], "hiringRecommendation": "No Hire"}
    n = len(scores)
    tech = sum(s.get("technical_depth", 0) for s in scores) / n
    rel = sum(s.get("relevance", 0) for s in scores) / n
    clar = sum(s.get("clarity", 0) for s in scores) / n
    comm_list = session.get("communication_scores", [])
    comm = sum(comm_list) / len(comm_list) if comm_list else clar
    report = {
        "technicalCompetency": round(tech, 2), "problemSolving": round(rel, 2),
        "communication": round(comm, 2), "behavioralFit": round((comm + clar) / 2, 2),
        "strengths": session.get("strong_topics", [])[:5],
        "weaknesses": session.get("weak_topics", [])[:5],
        "improvementPlan": [f"Improve: {t}" for t in session.get("weak_topics", [])[:3]],
        "hiringRecommendation": "",
    }
    report["hiringRecommendation"] = _deterministic_rec(report)
    return report
