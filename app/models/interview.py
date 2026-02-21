"""
Interview schemas & enums (plain Pydantic — no DB document).
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────

class InterviewStage(str, Enum):
    INTRO = "intro"
    TECHNICAL = "technical"
    DEEP_DIVE = "deep_dive"
    BEHAVIORAL = "behavioral"
    CLOSING = "closing"
    FINAL_EVALUATION = "final_evaluation"
    COMPLETED = "completed"


class PersonalityMode(str, Enum):
    FRIENDLY = "friendly"
    STRICT = "strict"
    STARTUP_CTO = "startup_cto"


STAGE_ORDER: list[InterviewStage] = [
    InterviewStage.INTRO,
    InterviewStage.TECHNICAL,
    InterviewStage.DEEP_DIVE,
    InterviewStage.BEHAVIORAL,
    InterviewStage.CLOSING,
    InterviewStage.FINAL_EVALUATION,
]


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


class FinalReportResponse(BaseModel):
    technicalCompetency: float
    problemSolving: float
    communication: float
    behavioralFit: float
    strengths: List[str]
    weaknesses: List[str]
    improvementPlan: List[str]
    hiringRecommendation: str
