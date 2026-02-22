"""
Interview schemas & enums (plain Pydantic — no DB document).
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────


class InterviewStage(str, Enum):
    INTRO = "intro"
    HR = "hr"
    TECHNICAL = "technical"
    DEEP_DIVE = "deep_dive"
    BEHAVIORAL = "behavioral"
    MANAGERIAL = "managerial"
    CLOSING = "closing"
    FINAL_EVALUATION = "final_evaluation"
    COMPLETED = "completed"


class PersonalityMode(str, Enum):
    FRIENDLY = "friendly"
    STRICT = "strict"
    STARTUP_CTO = "startup_cto"


class RoundType(str, Enum):
    FULL = "full"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    HR = "hr"


# ── Stage order per round type ───────────────────────────────────────────────

ROUND_STAGES: dict[RoundType, list[InterviewStage]] = {
    RoundType.FULL: [
        InterviewStage.INTRO,
        InterviewStage.HR,
        InterviewStage.TECHNICAL,
        InterviewStage.DEEP_DIVE,
        InterviewStage.BEHAVIORAL,
        InterviewStage.CLOSING,
        InterviewStage.FINAL_EVALUATION,
    ],
    RoundType.TECHNICAL: [
        InterviewStage.INTRO,
        InterviewStage.TECHNICAL,
        InterviewStage.DEEP_DIVE,
        InterviewStage.CLOSING,
        InterviewStage.FINAL_EVALUATION,
    ],
    RoundType.BEHAVIORAL: [
        InterviewStage.INTRO,
        InterviewStage.BEHAVIORAL,
        InterviewStage.CLOSING,
        InterviewStage.FINAL_EVALUATION,
    ],
    RoundType.HR: [
        InterviewStage.INTRO,
        InterviewStage.HR,
        InterviewStage.CLOSING,
        InterviewStage.FINAL_EVALUATION,
    ],
}

# Questions per stage per round type
STAGE_QUESTION_COUNTS: dict[RoundType, dict[InterviewStage, int]] = {
    RoundType.FULL: {
        InterviewStage.INTRO: 1,
        InterviewStage.HR: 2,
        InterviewStage.TECHNICAL: 3,
        InterviewStage.DEEP_DIVE: 2,
        InterviewStage.BEHAVIORAL: 2,
        InterviewStage.CLOSING: 1,
    },
    RoundType.TECHNICAL: {
        InterviewStage.INTRO: 1,
        InterviewStage.TECHNICAL: 5,
        InterviewStage.DEEP_DIVE: 2,
        InterviewStage.CLOSING: 1,
    },
    RoundType.BEHAVIORAL: {
        InterviewStage.INTRO: 1,
        InterviewStage.BEHAVIORAL: 4,
        InterviewStage.CLOSING: 1,
    },
    RoundType.HR: {
        InterviewStage.INTRO: 1,
        InterviewStage.HR: 4,
        InterviewStage.CLOSING: 1,
    },
}

# Follow-up limits per stage
FOLLOWUP_LIMITS: dict[InterviewStage, int] = {
    InterviewStage.INTRO: 0,
    InterviewStage.HR: 1,
    InterviewStage.TECHNICAL: 2,
    InterviewStage.DEEP_DIVE: 2,
    InterviewStage.BEHAVIORAL: 1,
    InterviewStage.MANAGERIAL: 1,
    InterviewStage.CLOSING: 0,
}

# Legacy alias for old imports
STAGE_ORDER: list[InterviewStage] = ROUND_STAGES[RoundType.FULL]


# ── Request schemas ──────────────────────────────────────────────────────────


class CreateSessionRequest(BaseModel):
    resume_id: str
    jd_text: str = ""
    personality: PersonalityMode = PersonalityMode.FRIENDLY


class SubmitAnswerRequest(BaseModel):
    answer: str = Field(min_length=1)


# ── Response schemas ─────────────────────────────────────────────────────────


class InterviewResponse(BaseModel):
    session_id: str
    stage: str
    question: Optional[str] = None
    is_complete: bool = False
    is_followup: bool = False
    evaluation: Optional[Dict[str, Any]] = None
    round_type: Optional[str] = None


class FinalReportResponse(BaseModel):
    technicalCompetency: float
    problemSolving: float
    communication: float
    behavioralFit: float
    strengths: List[str]
    weaknesses: List[str]
    improvementPlan: List[str]
    hiringRecommendation: str
    answerEvaluations: Optional[List[Dict[str, Any]]] = None
