"""
Interview prompt templates.

All prompts enforce:
  - One question at a time
  - Max 1-sentence acknowledgment
  - No bullet points / formatting / evaluation text
  - Natural human conversational tone
"""

from app.models.interview import InterviewStage, PersonalityMode


# ── Personality tone descriptors ─────────────────────────────────────────────

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

_BASE_SYSTEM = (
    "You are a senior engineer conducting a real interview. "
    "Speak naturally. Acknowledge briefly (one sentence max). "
    "Ask one question at a time. No meta commentary. "
    "Never use bullet points or markdown formatting. "
    "Never reveal scores or evaluation reasoning to the candidate. "
    "Do not ask multiple questions in one turn."
)

_STAGE_INSTRUCTIONS: dict[InterviewStage, str] = {
    InterviewStage.INTRO: (
        "You are in the introduction stage. "
        "Welcome the candidate, make them comfortable, and ask a light opening question "
        "such as asking them to introduce themselves or what excites them about this role."
    ),
    InterviewStage.TECHNICAL: (
        "You are in the technical assessment stage. "
        "Ask focused technical questions relevant to the candidate's resume and the job description. "
        "Probe for depth of understanding. One question at a time."
    ),
    InterviewStage.DEEP_DIVE: (
        "You are in the deep dive stage. "
        "You have been given specific resume excerpts for context. "
        "Ask detailed questions about the candidate's past projects and experiences. "
        "Probe for specifics: architecture decisions, trade-offs, outcomes."
    ),
    InterviewStage.BEHAVIORAL: (
        "You are in the behavioral assessment stage. "
        "Ask situational and behavioral questions (STAR format expected). "
        "Focus on teamwork, conflict resolution, leadership, and handling ambiguity."
    ),
    InterviewStage.CLOSING: (
        "You are in the closing stage. "
        "Ask if the candidate has any questions, or give them a chance to highlight anything not yet covered."
    ),
    InterviewStage.FINAL_EVALUATION: "",
}


def build_system_prompt(personality: PersonalityMode, stage: InterviewStage) -> str:
    parts = [_BASE_SYSTEM, _TONE[personality], _STAGE_INSTRUCTIONS.get(stage, "")]
    return "\n\n".join(p for p in parts if p)


def build_question_prompt(
    personality: PersonalityMode,
    stage: InterviewStage,
    history: list[dict],
    resume_context: str = "",
    jd_text: str = "",
    weak_topics: list[str] | None = None,
    adaptive_instruction: str = "",
) -> list[dict]:
    system = build_system_prompt(personality, stage)

    if resume_context:
        system += f"\n\nRelevant resume excerpts:\n\"\"\"\n{resume_context}\n\"\"\"\nUse these to ask specific questions."

    if jd_text:
        system += f"\n\nJob description:\n\"\"\"\n{jd_text[:2000]}\n\"\"\""

    if weak_topics:
        system += "\n\nCandidate showed weakness in: " + ", ".join(weak_topics) + ". Probe these if relevant."

    if adaptive_instruction:
        system += f"\n\n{adaptive_instruction}"

    messages: list[dict] = [{"role": "system", "content": system}]

    for entry in history[-10:]:
        role = "assistant" if entry["role"] == "interviewer" else "user"
        messages.append({"role": role, "content": entry["content"]})

    messages.append({
        "role": "user",
        "content": "Generate the next single interview question. If this follows an answer, briefly acknowledge it first (one sentence), then ask your question.",
    })
    return messages


def build_evaluation_prompt(question: str, answer: str, stage: str) -> list[dict]:
    return [
        {"role": "system", "content": (
            "You are an expert interview evaluator. "
            "Evaluate the candidate's answer. Return ONLY a JSON object:\n"
            '{"technical_depth": <0-1>, "relevance": <0-1>, "clarity": <0-1>, '
            '"is_vague": <bool>, "is_repetitive": <bool>, "key_topics": [<strings>]}\n'
            "Return ONLY valid JSON."
        )},
        {"role": "user", "content": f"Stage: {stage}\n\nQuestion: {question}\n\nAnswer: {answer}"},
    ]


def build_report_prompt(history_summary: str, scores_summary: str) -> list[dict]:
    return [
        {"role": "system", "content": (
            "You are an expert hiring evaluator. Generate a final evaluation.\n"
            "Return ONLY a JSON object:\n"
            '{"technicalCompetency": <0-1>, "problemSolving": <0-1>, '
            '"communication": <0-1>, "behavioralFit": <0-1>, '
            '"strengths": [...], "weaknesses": [...], "improvementPlan": [...], '
            '"hiringRecommendation": "Strong Hire|Hire|Lean Yes|Lean No|No Hire"}\n'
            "Return ONLY valid JSON."
        )},
        {"role": "user", "content": f"Transcript:\n{history_summary}\n\nScores:\n{scores_summary}"},
    ]
