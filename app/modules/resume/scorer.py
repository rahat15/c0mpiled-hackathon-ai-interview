"""
LLM-based resume scoring using Groq.
"""

import json
import logging

from groq import Groq

from app.core.config import settings

logger = logging.getLogger(__name__)


def _client() -> Groq:
    return Groq(api_key=settings.GROQ_API_KEY)


# ── Evaluation ───────────────────────────────────────────────────────────────

_EVAL_PROMPT = """\
Evaluate the candidate's CV{jd_clause}.

Return ONLY a JSON object:
{{
  "cv_quality": {{
    "overall_score": <float 0-1>,
    "formatting": <float 0-1>,
    "content_depth": <float 0-1>,
    "impact_statements": <float 0-1>,
    "keyword_optimization": <float 0-1>,
    "summary": "<brief text>"
  }},
  "jd_match": {{
    "relevance_score": <float 0-1>,
    "matched_skills": ["..."],
    "missing_skills": ["..."],
    "experience_alignment": <float 0-1>,
    "summary": "<brief text>"
  }},
  "skill_gaps": ["..."],
  "improvement_suggestions": ["..."]
}}

If no job description is provided, set jd_match to null and skill_gaps to [].

CV:
\"\"\"
{cv_text}
\"\"\"
{jd_block}
Return ONLY valid JSON.
"""


def unified_evaluate(cv_text: str, jd_text: str = "") -> dict:
    jd_clause = " against the job description" if jd_text else ""
    jd_block = f'\nJob Description:\n"""\n{jd_text}\n"""' if jd_text else ""

    try:
        resp = _client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a resume evaluator. Return only valid JSON."},
                {"role": "user", "content": _EVAL_PROMPT.format(jd_clause=jd_clause, cv_text=cv_text[:6000], jd_block=jd_block)},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as exc:
        logger.error("unified_evaluate failed: %s", exc)
        return {"cv_quality": {"overall_score": 0, "summary": "Evaluation failed"}, "jd_match": None, "skill_gaps": [], "improvement_suggestions": []}


# ── Improvement ──────────────────────────────────────────────────────────────

_IMPROVE_PROMPT = """\
Given the candidate's CV{jd_clause}, provide:
1. tailored_resume — the full improved resume text
2. cover_letter — a professional cover letter{jd_cover}
3. suggestions — list of actionable tips

Return ONLY a JSON object:
{{
  "tailored_resume": "...",
  "cover_letter": "...",
  "suggestions": ["..."]
}}

CV:
\"\"\"
{cv_text}
\"\"\"
{jd_block}
Return ONLY valid JSON.
"""


def improvement(cv_text: str, jd_text: str = "") -> dict:
    jd_clause = " and the target job description" if jd_text else ""
    jd_cover = " tailored to the job" if jd_text else ""
    jd_block = f'\nJob Description:\n"""\n{jd_text}\n"""' if jd_text else ""

    try:
        resp = _client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a career coach. Return only valid JSON."},
                {"role": "user", "content": _IMPROVE_PROMPT.format(jd_clause=jd_clause, jd_cover=jd_cover, cv_text=cv_text[:6000], jd_block=jd_block)},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as exc:
        logger.error("improvement failed: %s", exc)
        return {"tailored_resume": "", "cover_letter": "", "suggestions": ["Generation failed — please retry."]}
