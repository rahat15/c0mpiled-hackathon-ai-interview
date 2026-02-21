"""
LLM-based resume scoring using Groq.
Prompts modelled after the reference AI-Interview-backend CV evaluation module.
"""

import json
import logging
import time

from groq import Groq

from app.core.config import settings

logger = logging.getLogger(__name__)


def _client() -> Groq:
    return Groq(api_key=settings.GROQ_API_KEY)


def _extract_json(text: str) -> str:
    """Pull JSON from an LLM response that may wrap it in markdown fences."""
    if "```json" in text:
        s = text.find("```json") + 7
        e = text.find("```", s)
        return text[s:e].strip()
    if "```" in text:
        s = text.find("```") + 3
        e = text.find("```", s)
        return text[s:e].strip()
    start, end = text.find("{"), text.rfind("}")
    return text[start : end + 1] if start != -1 and end != -1 else text


def _call_llm(prompt: str, system: str = "You are a strict JSON generator.", retries: int = 3) -> str:
    """Call Groq with retry + exponential back-off."""
    for attempt in range(retries):
        try:
            resp = _client().chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
                max_tokens=3500,
            )
            return resp.choices[0].message.content.strip()
        except Exception as exc:
            logger.error("Groq API call failed (attempt %d/%d): %s", attempt + 1, retries, exc)
            if attempt == retries - 1:
                raise
            time.sleep(1.5 ** attempt)


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS  (ported from reference repo cv_eval/prompts.py)
# ─────────────────────────────────────────────────────────────────────────────

UNIFIED_EVALUATION_PROMPT = """\
You are an expert hiring evaluator. Your task is to analyze a Candidate CV against a Job Description and return a detailed scoring analysis.

Return ONLY valid JSON that strictly adheres to the schema provided at the end. Do NOT include explanations, apologies, or any prose outside of the JSON structure.

---

### INSTRUCTIONS & RUBRICS

**1. General Rules:**
- For each dimension, provide a score based on the provided CV and Job Description.
- For the `evidence` field in each subscore, you MUST provide an array of direct, concise quotes from the CV that justify your score.
- If no evidence can be found for a dimension, the score MUST be 0 and the `evidence` array must contain the single string "No evidence found.".

**2. PART 1: CV QUALITY (100 points total)**
Evaluate the CV's intrinsic quality, independent of the job description.
- ats_structure (10): Contact details are clear, sections are well-defined, bullets are easily parseable, dates are consistent.
- writing_clarity (15): Concise, uses active voice (e.g., "Led," "Developed"), parallel bullet structure, no typos or grammatical errors.
- quantified_impact (20): Uses specific metrics (% / $ / user numbers / latency reduction) to show the impact of actions.
- technical_depth (15): Mentions specific, non-generic tools/frameworks/architectures. Shows understanding of complex systems.
- projects_portfolio (10): Includes links to a portfolio, GitHub, or describes personal/open-source projects with outcomes.
- leadership_skills (10): Provides evidence of leading teams, mentoring others, project ownership, or significant cross-functional work.
- career_progression (10): Shows increasing responsibility over time. Timeline is clear and logical.
- consistency (10): Formatting, tone, and verb tenses are consistent throughout the document. No large, unexplained career gaps.

**3. PART 2: JOB MATCH (100 points total)**
Evaluate how well the CV matches the specific Job Description.
- hard_skills (35): Coverage of "must-have" technical skills, tools, and frameworks from the JD. Consider exact, alias (e.g., AWS vs. Amazon Web Services), and semantic matches.
- responsibilities (15): Overlap between the candidate's experience (verbs and outcomes) and the key responsibilities listed in the JD.
- domain_relevance (10): Match of the candidate's industry experience (e.g., FinTech, SaaS, AI) with the company's domain.
- seniority (10): Candidate's years of relevant experience vs. JD requirements (e.g., "5+ years").
- nice_to_haves (5): Coverage of optional skills or "bonus points" mentioned in the JD.
- education_certs (5): Match for required or preferred degrees and certifications.
- recent_achievements (10): Candidate's accomplishments in the last 1-2 roles directly align with the core needs of the job.
- constraints (10): Match on practical constraints like location, work authorization, or travel. If not mentioned, assume a match.

**4. PART 3: KEY TAKEAWAYS**
Based on your full analysis, identify critical highlights.
- red_flags: List any critical deal-breakers. A red flag is a clear mismatch on a non-negotiable requirement.
- green_flags: List 2-3 standout qualifications that make the candidate exceptionally strong for this role.

---

### INPUTS:
CV:
{cv_text}

Job Description:
{jd_text}

---

### OUTPUT SCHEMA (strict JSON only):

{{
  "cv_quality": {{
    "overall_score": <float>,
    "subscores": [
      {{"dimension": "ats_structure", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "writing_clarity", "score": <float>, "max_score": 15, "evidence": [<string>]}},
      {{"dimension": "quantified_impact", "score": <float>, "max_score": 20, "evidence": [<string>]}},
      {{"dimension": "technical_depth", "score": <float>, "max_score": 15, "evidence": [<string>]}},
      {{"dimension": "projects_portfolio", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "leadership_skills", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "career_progression", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "consistency", "score": <float>, "max_score": 10, "evidence": [<string>]}}
    ]
  }},
  "jd_match": {{
    "overall_score": <float>,
    "subscores": [
      {{"dimension": "hard_skills", "score": <float>, "max_score": 35, "evidence": [<string>]}},
      {{"dimension": "responsibilities", "score": <float>, "max_score": 15, "evidence": [<string>]}},
      {{"dimension": "domain_relevance", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "seniority", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "nice_to_haves", "score": <float>, "max_score": 5, "evidence": [<string>]}},
      {{"dimension": "education_certs", "score": <float>, "max_score": 5, "evidence": [<string>]}},
      {{"dimension": "recent_achievements", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "constraints", "score": <float>, "max_score": 10, "evidence": [<string>]}}
    ]
  }},
  "key_takeaways": {{
    "red_flags": [<string>],
    "green_flags": [<string>]
  }}
}}"""


CV_ONLY_EVALUATION_PROMPT = """\
You are an expert hiring evaluator. Your task is to analyze a Candidate CV and return a detailed scoring analysis.

Return ONLY valid JSON that strictly adheres to the schema provided at the end. Do NOT include explanations, apologies, or any prose outside of the JSON structure.

---

### INSTRUCTIONS & RUBRICS

**1. General Rules:**
- For each dimension, provide a score based on the provided CV.
- For the `evidence` field in each subscore, you MUST provide an array of direct, concise quotes from the CV that justify your score.
- If no evidence can be found for a dimension, the score MUST be 0 and the `evidence` array must contain the single string "No evidence found.".

**2. PART 1: CV QUALITY (100 points total)**
Evaluate the CV's intrinsic quality:
- ats_structure (10): Contact details are clear, sections are well-defined, bullets are easily parseable, dates are consistent.
- writing_clarity (15): Concise, uses active voice (e.g., "Led," "Developed"), parallel bullet structure, no typos or grammatical errors.
- quantified_impact (20): Uses specific metrics (% / $ / user numbers / latency reduction) to show the impact of actions.
- technical_depth (15): Mentions specific, non-generic tools/frameworks/architectures. Shows understanding of complex systems.
- projects_portfolio (10): Includes links to a portfolio, GitHub, or describes personal/open-source projects with outcomes.
- leadership_skills (10): Provides evidence of leading teams, mentoring others, project ownership, or significant cross-functional work.
- career_progression (10): Shows increasing responsibility over time. Timeline is clear and logical.
- consistency (10): Formatting, tone, and verb tenses are consistent throughout the document. No large, unexplained career gaps.

**3. PART 2: KEY TAKEAWAYS**
Based on your full analysis, identify critical highlights.
- red_flags: List any critical weaknesses (e.g., no quantified impact, inconsistent timeline).
- green_flags: List 2-3 standout qualifications that make the candidate exceptionally strong overall.

---

### INPUT:
CV:
{cv_text}

---

### OUTPUT SCHEMA (strict JSON only):

{{
  "cv_quality": {{
    "overall_score": <float>,
    "subscores": [
      {{"dimension": "ats_structure", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "writing_clarity", "score": <float>, "max_score": 15, "evidence": [<string>]}},
      {{"dimension": "quantified_impact", "score": <float>, "max_score": 20, "evidence": [<string>]}},
      {{"dimension": "technical_depth", "score": <float>, "max_score": 15, "evidence": [<string>]}},
      {{"dimension": "projects_portfolio", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "leadership_skills", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "career_progression", "score": <float>, "max_score": 10, "evidence": [<string>]}},
      {{"dimension": "consistency", "score": <float>, "max_score": 10, "evidence": [<string>]}}
    ]
  }},
  "key_takeaways": {{
    "red_flags": [<string>],
    "green_flags": [<string>]
  }}
}}"""


IMPROVEMENT_PROMPT = """\
You are an AI career coach. Your task is to analyze a Candidate CV against a Job Description and suggest improvements.

Return ONLY valid JSON that strictly adheres to the schema provided at the end. Do NOT include explanations, apologies, or any prose outside of the JSON structure.

---

### INSTRUCTIONS

**1. Tailored Resume**
- Rewrite the CV's **summary** in language tailored to the JD.
- Reframe **experience bullets** to match the JD's phrasing and highlight achievements.
- Reorder and prioritize **skills** relevant to the JD.
- Map **projects** to the JD's requirements.

**2. Top 1% Candidate Gap Analysis**
- Describe what a top 1% candidate for this role would include in their resume.
- Identify the candidate's **strengths** vs JD.
- Identify **gaps** (skills, experiences, achievements).
- Suggest **actionable next steps**.

**3. Cover Letter**
- Draft a short, compelling cover letter (<200 words).
- Be specific, enthusiastic, and highlight the candidate's most relevant achievements.
- Tie directly to the company's role.

---

### INPUTS:
CV:
{cv_text}

Job Description:
{jd_text}

---

### OUTPUT SCHEMA (strict JSON only):

{{
  "tailored_resume": {{
    "summary": "revised summary here",
    "experience": ["reframed bullet 1", "reframed bullet 2"],
    "skills": ["skill1", "skill2"],
    "projects": ["mapped project1", "mapped project2"]
  }},
  "top_1_percent_gap": {{
    "strengths": ["strength1", "strength2"],
    "gaps": ["gap1", "gap2"],
    "actionable_next_steps": ["step1", "step2"]
  }},
  "cover_letter": "Draft under 200 words..."
}}"""


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────


def unified_evaluate(cv_text: str, jd_text: str = "") -> dict:
    """
    Auto-switch between UNIFIED (CV+JD) and CV_ONLY prompt.
    Returns the raw parsed JSON dict.
    """
    if jd_text and jd_text.strip():
        prompt = UNIFIED_EVALUATION_PROMPT.format(cv_text=cv_text[:6000], jd_text=jd_text[:4000])
    else:
        prompt = CV_ONLY_EVALUATION_PROMPT.format(cv_text=cv_text[:6000])

    try:
        raw = _call_llm(prompt)
        cleaned = _extract_json(raw)
        return json.loads(cleaned)
    except Exception as exc:
        logger.error("unified_evaluate failed: %s", exc)
        return {
            "cv_quality": {"overall_score": 0, "subscores": []},
            "key_takeaways": {"red_flags": [], "green_flags": []},
        }


def improvement(cv_text: str, jd_text: str) -> dict:
    """Generate tailored resume, gap analysis, and cover letter."""
    if not cv_text.strip() or not jd_text.strip():
        raise ValueError("Both CV text and JD text are required for improvement")

    try:
        prompt = IMPROVEMENT_PROMPT.format(cv_text=cv_text[:6000], jd_text=jd_text[:4000])
        raw = _call_llm(prompt)
        cleaned = _extract_json(raw)
        return json.loads(cleaned)
    except Exception as exc:
        logger.error("improvement failed: %s", exc)
        return {
            "tailored_resume": {"summary": "", "experience": [], "skills": [], "projects": []},
            "top_1_percent_gap": {"strengths": [], "gaps": [], "actionable_next_steps": []},
            "cover_letter": "Generation failed — please retry.",
        }
