"""
Resume schemas (plain Pydantic — no DB document).
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ResumeUploadResponse(BaseModel):
    resume_id: str
    filename: str
    text_length: int
    structured_data: Optional[Dict[str, Any]] = None


class ResumeScoreResponse(BaseModel):
    cv_quality: Dict[str, Any]
    jd_match: Optional[Dict[str, Any]] = None
    skill_gaps: Optional[List[str]] = None
    improvement_suggestions: Optional[List[str]] = None


class ResumeImprovementResponse(BaseModel):
    tailored_resume: str
    cover_letter: str
    suggestions: List[str]
