"""
Resume router — upload, evaluate, improve.
"""

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pathlib import Path

from app.core.security import get_current_user
from app.core import store
from app.models.resume import ResumeImprovementResponse, ResumeScoreResponse, ResumeUploadResponse
from app.modules.resume import service

router = APIRouter(prefix="/resume", tags=["Resume"])

ALLOWED_EXT = {
    ".pdf", ".docx", ".doc", ".txt", ".rtf", ".html", ".htm", ".odt",
    ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp",
}


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = Path(file.filename or "x").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    try:
        resume = service.process_upload(user["id"], data, file.filename or "upload")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ResumeUploadResponse(
        resume_id=resume["id"], filename=resume["filename"],
        text_length=len(resume["raw_text"]), structured_data=resume["structured_data"],
    )


@router.get("/list")
async def list_resumes(user: dict = Depends(get_current_user)):
    return [
        {"resume_id": r["id"], "filename": r["filename"], "text_length": len(r["raw_text"]),
         "has_score": r["cv_score"] is not None, "created_at": r["created_at"]}
        for r in store.resumes.values() if r["user_id"] == user["id"]
    ]


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user: dict = Depends(get_current_user)):
    r = store.resumes.get(resume_id)
    if not r or r["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Resume not found")
    return r


@router.post("/{resume_id}/evaluate", response_model=ResumeScoreResponse)
async def evaluate(resume_id: str, jd_text: str = Query(""), user: dict = Depends(get_current_user)):
    r = store.resumes.get(resume_id)
    if not r or r["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Resume not found")
    result = service.evaluate_resume(resume_id, jd_text)
    return ResumeScoreResponse(**result)


@router.post("/{resume_id}/improve", response_model=ResumeImprovementResponse)
async def improve(resume_id: str, jd_text: str = Query(""), user: dict = Depends(get_current_user)):
    r = store.resumes.get(resume_id)
    if not r or r["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Resume not found")
    result = service.improve_resume(resume_id, jd_text)
    return ResumeImprovementResponse(**result)
