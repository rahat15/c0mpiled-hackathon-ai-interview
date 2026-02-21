"""Resume schemas (plain Pydantic - no DB document)."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ResumeUploadResponse(BaseModel):
    """Combined upload + evaluation response."""
    resume_id: str
    filename: str
    structured_data: Optional[Dict[str, Any]] = None
    # Evaluation fields (auto-populated after upload)
    cv_quality: Optional[Dict[str, Any]] = None
    jd_match: Optional[Dict[str, Any]] = None
    key_takeaways: Optional[Dict[str, Any]] = None
    fit_index: Optional[float] = None
    enhancement: Optional[Dict[str, Any]] = None
