"""
Answer evaluation engine — Groq LLM with heuristic fallback.
"""

import json
import logging

from groq import Groq

from app.core.config import settings
from app.modules.interview.prompts import build_evaluation_prompt

logger = logging.getLogger(__name__)


def _heuristic_score(answer: str) -> dict:
    wc = len(answer.split())
    depth = 0.3 if wc < 15 else 0.5 if wc < 40 else 0.65 if wc < 100 else 0.75
    specifics = ["for example", "specifically", "we implemented", "i built", "trade-off", "architecture"]
    found = sum(1 for kw in specifics if kw in answer.lower())
    if found >= 2:
        depth = min(depth + 0.15, 1.0)
    return {
        "technical_depth": round(depth, 2), "relevance": 0.5,
        "clarity": round(0.4 if wc < 15 else 0.6 if wc < 40 else 0.7, 2),
        "is_vague": wc < 20 and found == 0, "is_repetitive": False, "key_topics": [],
    }


def evaluate_answer(question: str, answer: str, stage: str) -> dict:
    messages = build_evaluation_prompt(question, answer, stage)
    try:
        resp = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
            model=settings.GROQ_MODEL, messages=messages,
            temperature=0, response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content)
        for k in ("technical_depth", "relevance", "clarity"):
            result[k] = max(0.0, min(1.0, float(result.get(k, 0))))
        result.setdefault("is_vague", False)
        result.setdefault("is_repetitive", False)
        result.setdefault("key_topics", [])
        return result
    except Exception as exc:
        logger.warning("LLM eval failed, using heuristic: %s", exc)
        return _heuristic_score(answer)


def composite_score(ev: dict) -> float:
    return round(ev.get("technical_depth", 0) * 0.5 + ev.get("relevance", 0) * 0.3 + ev.get("clarity", 0) * 0.2, 3)
