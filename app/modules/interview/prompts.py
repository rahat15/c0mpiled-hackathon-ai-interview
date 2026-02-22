"""
Interview prompt templates — strict stage isolation, follow-up logic, and
conversational tone.  Inspired by rahat15/AI-Interview-backend.

Key design principles:
  ● Each stage has explicit FORBIDDEN lists to prevent cross-contamination
  ● Follow-up prompts anchor to specific phrases the candidate said
  ● Questions are personalized using CV analysis & JD requirements
  ● One question at a time, max 1-sentence acknowledgment
  ● No bullet points, no markdown, no evaluation leakage
"""

from __future__ import annotations

from app.models.interview import InterviewStage, PersonalityMode


# ─────────────────────────────────────────────────────────────────────────────
# Personality tone
# ─────────────────────────────────────────────────────────────────────────────

_TONE: dict[PersonalityMode, str] = {
    PersonalityMode.FRIENDLY: (
        "You are warm, encouraging, and approachable. "
        "Use a relaxed but professional tone. Occasionally add brief positive reinforcement."
    ),
    PersonalityMode.STRICT: (
        "You are direct, formal, and no-nonsense. "
        "Keep acknowledgments minimal. Push for precision and depth."
    ),
    PersonalityMode.STARTUP_CTO: (
        "You are a pragmatic startup CTO who values speed, ownership, and real-world impact. "
        "You care about shipping code, trade-offs, and hands-on experience over theory."
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# Strict per-stage instructions  (each has FORBIDDEN list)
# ─────────────────────────────────────────────────────────────────────────────

STRICT_STAGE_INSTRUCTIONS: dict[InterviewStage, str] = {

    InterviewStage.INTRO: """Ask ONLY introductory and background questions.

Focus on:
- personal background & career path
- interests related to the role
- high-level motivation for applying
- what excites them about this opportunity

Rules:
- Keep the tone conversational and welcoming.
- Questions must be non-technical.
- Naturally connect to the candidate's CV or career trajectory.

FORBIDDEN:
- technical concepts or system design
- behavioral STAR questions
- HR or managerial evaluation""",

    InterviewStage.HR: """Ask ONLY HR and culture-fit questions.

Focus on:
- motivation for the role or company
- teamwork and collaboration style
- communication style & work preferences
- strengths, areas for growth
- workplace values and expectations

Rules:
- Keep questions people-focused, not skill-focused.
- Do not test technical ability or problem-solving.

FORBIDDEN:
- technical topics, system design, or coding
- behavioral STAR questions
- leadership or managerial assessment""",

    InterviewStage.TECHNICAL: """Ask ONLY technical questions grounded in the Job Description and the candidate's CV.

Focus on:
- skills, tools, or concepts explicitly mentioned in the JD or CV
- relevant engineering fundamentals
- practical understanding and reasoning
- design decisions within the candidate's stated experience

Rules:
- Prefer single-concept or single-component questions.
- Progress from conceptual understanding to deeper technical reasoning.
- Avoid repeating the same technology across multiple questions.
- Do NOT introduce technologies or domains not in the JD or CV.

FORBIDDEN:
- HR, cultural, or personality questions
- behavioral STAR questions
- managerial or leadership evaluation""",

    InterviewStage.DEEP_DIVE: """Ask detailed questions about the candidate's specific past projects and experiences.

Focus on:
- architecture decisions and trade-offs
- specific implementation details
- outcomes, metrics, and impact
- lessons learned and alternative approaches

Rules:
- Reference the resume excerpts provided.
- Probe for specifics — not generalities.
- One project aspect per question.

FORBIDDEN:
- HR or culture-fit questions
- generic behavioral questions
- topics not related to their stated experience""",

    InterviewStage.BEHAVIORAL: """Ask ONLY behavioral questions using the STAR method.

Focus on:
- real past experiences (not hypotheticals)
- challenges faced and actions taken
- outcomes and learnings
- teamwork, conflict resolution, leadership

Rules:
- Frame questions explicitly around past situations.
- Keep one experience per question.
- Do not test technical knowledge.

FORBIDDEN:
- technical questions or system design
- HR/culture-fit questions
- hypothetical or future-oriented scenarios""",

    InterviewStage.MANAGERIAL: """Ask ONLY leadership and ownership questions.

Focus on:
- decision-making and prioritization
- ownership and accountability
- mentoring or guiding others
- handling conflict or ambiguity

Rules:
- Questions should assume responsibility or influence over others.
- Do not assess technical implementation details.
- Focus on judgment and leadership mindset.

FORBIDDEN:
- technical questions
- HR/culture-fit questions
- behavioral STAR questions""",

    InterviewStage.CLOSING: """Ask ONLY closing questions.

Focus on:
- candidate's questions about the role, team, or company
- anything they want to highlight that wasn't covered
- expectations for next steps

Rules:
- Keep it light and open-ended.
- Do not introduce new evaluation topics.

FORBIDDEN:
- technical questions
- HR evaluation
- behavioral or managerial assessment""",

    InterviewStage.FINAL_EVALUATION: "",
}


# ─────────────────────────────────────────────────────────────────────────────
# Follow-up instruction (injected when follow-up is warranted)
# ─────────────────────────────────────────────────────────────────────────────

FOLLOWUP_INSTRUCTION_TEMPLATE = """You are asking a follow-up question in a live interview.

Previous Question: "{last_question}"
Candidate Answer: "{last_answer}"

The candidate's answer was incomplete or lacked depth.

FOLLOW-UP RULES:
- Ask EXACTLY ONE natural follow-up question.
- Focus on the SINGLE weakest part of the candidate's answer.
- Anchor the question to a SPECIFIC phrase, decision, or example the candidate mentioned.
- You MAY probe deeper into details already mentioned (why, how, tradeoffs, impact).
- Do NOT introduce a new domain or topic outside the answer.
- Do NOT ask generic clarification questions.

FORBIDDEN follow-up phrasing:
- "Can you elaborate?"
- "Can you clarify?"
- "Can you explain more?"
- "Tell me more about that."
- Any vague or filler follow-ups.

STYLE:
- Sound like a real human interviewer.
- Be precise and conversational.
- Max 30 words."""


# ─────────────────────────────────────────────────────────────────────────────
# Build the conversational question prompt
# ─────────────────────────────────────────────────────────────────────────────

_BASE_SYSTEM = (
    "You are a senior engineer conducting a real interview. "
    "Speak naturally. Acknowledge the candidate's previous answer briefly (one sentence max), "
    "then ask ONE clear question. No meta commentary. "
    "Never use bullet points or markdown formatting. "
    "Never reveal scores or evaluation reasoning. "
    "Do not ask multiple questions in one turn."
)


def build_question_prompt(
    personality: PersonalityMode,
    stage: InterviewStage,
    history: list[dict],
    resume_context: str = "",
    jd_text: str = "",
    weak_topics: list[str] | None = None,
    strong_topics: list[str] | None = None,
    adaptive_instruction: str = "",
    is_followup: bool = False,
    last_question: str = "",
    last_answer: str = "",
    cv_analysis: dict | None = None,
) -> list[dict]:
    """Build the messages array for Groq question generation."""

    # ── System prompt assembly ──
    parts = [_BASE_SYSTEM, _TONE[personality]]

    stage_instr = STRICT_STAGE_INSTRUCTIONS.get(stage, "")
    if stage_instr:
        parts.append(f"STAGE RULES ({stage.value}):\n{stage_instr}")

    # CV analysis context (personalized)
    if cv_analysis:
        candidate_info = []
        if cv_analysis.get("candidate_name"):
            candidate_info.append(f"Name: {cv_analysis['candidate_name']}")
        if cv_analysis.get("current_role"):
            candidate_info.append(f"Current role: {cv_analysis['current_role']}")
        if cv_analysis.get("experience_years"):
            candidate_info.append(f"Experience: {cv_analysis['experience_years']} years")
        if cv_analysis.get("skills"):
            candidate_info.append(f"Key skills: {', '.join(cv_analysis['skills'][:10])}")
        if cv_analysis.get("projects"):
            candidate_info.append(f"Notable projects: {'; '.join(cv_analysis['projects'][:3])}")
        if candidate_info:
            parts.append("CANDIDATE PROFILE:\n" + "\n".join(candidate_info))

    if resume_context:
        parts.append(
            f"Relevant resume excerpts:\n\"\"\"\n{resume_context}\n\"\"\"\n"
            "Use these to ask specific, personalized questions."
        )

    if jd_text:
        parts.append(f"Job description:\n\"\"\"\n{jd_text[:2000]}\n\"\"\"")

    if weak_topics:
        parts.append(
            "Candidate showed weakness in: " + ", ".join(weak_topics[-5:]) +
            ". Probe these areas if relevant to the current stage."
        )

    if strong_topics:
        parts.append(
            "Candidate showed strength in: " + ", ".join(strong_topics[-5:]) +
            ". Acknowledge but don't re-test. Explore adjacent areas."
        )

    if adaptive_instruction:
        parts.append(adaptive_instruction)

    if is_followup and last_question and last_answer:
        followup_block = FOLLOWUP_INSTRUCTION_TEMPLATE.format(
            last_question=last_question,
            last_answer=last_answer[:500],
        )
        parts.append(followup_block)

    system = "\n\n".join(p for p in parts if p)

    # ── Messages ──
    messages: list[dict] = [{"role": "system", "content": system}]

    for entry in history[-12:]:
        role = "assistant" if entry["role"] == "interviewer" else "user"
        messages.append({"role": role, "content": entry["content"]})

    if is_followup:
        messages.append({
            "role": "user",
            "content": (
                "Based on the candidate's last answer, ask a targeted follow-up "
                "that probes the weakest part of their response. "
                "Anchor your question to something specific they said."
            ),
        })
    else:
        messages.append({
            "role": "user",
            "content": (
                "Generate the next interview question. If this follows an answer, "
                "briefly acknowledge it first (one sentence), then ask your question. "
                "Make it specific to the candidate's background and the role."
            ),
        })

    return messages


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation prompt
# ─────────────────────────────────────────────────────────────────────────────

def build_evaluation_prompt(
    question: str,
    answer: str,
    stage: str,
    jd_text: str = "",
    cv_text: str = "",
) -> list[dict]:
    system = (
        "You are an expert interview evaluator. "
        "Evaluate the candidate's answer. Return ONLY a JSON object:\n"
        "{\n"
        '  "clarity": <1-10>,\n'
        '  "confidence": <1-10>,\n'
        '  "technical_depth": <1-10>,\n'
        '  "relevance": <1-10>,\n'
        '  "is_vague": <bool>,\n'
        '  "is_repetitive": <bool>,\n'
        '  "key_topics": [<strings>],\n'
        '  "summary": "<2-3 sentence evaluation>"\n'
        "}\n\n"
        "Instructions:\n"
        '- "clarity" = how clearly the candidate expressed their answer\n'
        '- "confidence" = tone, conviction, and specificity\n'
        '- "technical_depth" = technical relevance and depth. '
        'If stage is NOT "technical" or "deep_dive", score conservatively.\n'
        '- "relevance" = how well the answer addresses the question\n'
        '- "is_vague" = true if answer lacks specifics or is too short\n'
        '- "is_repetitive" = true if candidate repeated previous points\n'
        '- "key_topics" = main topics/skills mentioned in the answer\n'
        '- "summary" = brief assessment of the answer quality\n\n'
        "Return ONLY valid JSON."
    )

    user_parts = [f"Stage: {stage}", f"Question: {question}", f"Answer: {answer}"]
    if jd_text:
        user_parts.append(f"Job Description (context): {jd_text[:1000]}")
    if cv_text:
        user_parts.append(f"CV (context): {cv_text[:1000]}")

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": "\n\n".join(user_parts)},
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Follow-up decision prompt
# ─────────────────────────────────────────────────────────────────────────────

def build_followup_decision_prompt(
    stage: str,
    question: str,
    answer: str,
    clarity: int,
    confidence: int,
    technical_depth: int,
) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You decide whether to ask a follow-up question or move to the next stage. "
                "Return ONLY a JSON object: "
                '{"decision": "followup" or "stage_transition", "reason": "<max 15 words>"}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Stage: {stage}\n"
                f"Question: {question}\n"
                f"Answer: {answer}\n"
                f"Scores: clarity={clarity}, confidence={confidence}, "
                f"technical_depth={technical_depth}\n\n"
                "Rules:\n"
                "- HR/Intro/Behavioral: max 1 follow-up per question.\n"
                "- Technical/Deep Dive: max 2 follow-ups.\n"
                "- If scores are all >= 7, prefer stage_transition.\n"
                "- If answer was blank or very vague, prefer followup.\n"
                "- For borderline cases, use your judgment."
            ),
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Report prompt
# ─────────────────────────────────────────────────────────────────────────────

def build_report_prompt(history_summary: str, scores_summary: str) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You are an expert hiring evaluator. Generate a final evaluation.\n"
                "Return ONLY a JSON object:\n"
                "{\n"
                '  "technicalCompetency": <0-1>,\n'
                '  "problemSolving": <0-1>,\n'
                '  "communication": <0-1>,\n'
                '  "behavioralFit": <0-1>,\n'
                '  "strengths": ["<specific strength 1>", ...],\n'
                '  "weaknesses": ["<specific weakness 1>", ...],\n'
                '  "improvementPlan": ["<actionable step 1>", ...],\n'
                '  "hiringRecommendation": "Strong Hire|Hire|Lean Yes|Lean No|No Hire"\n'
                "}\n\n"
                "Base your assessment on the interview transcript and score data. "
                "Be specific — reference actual topics discussed. "
                "Return ONLY valid JSON."
            ),
        },
        {
            "role": "user",
            "content": f"Interview Transcript:\n{history_summary}\n\nScore Summary:\n{scores_summary}",
        },
    ]
