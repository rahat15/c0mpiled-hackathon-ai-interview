"""Resume router - single upload+evaluate endpoint."""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pathlib import Path
from typing import Optional

from app.models.resume import ResumeUploadResponse
from app.modules.resume import service

router = APIRouter(prefix="/resume", tags=["Resume"])

ALLOWED_EXT = {
    ".pdf", ".docx", ".doc", ".txt", ".rtf", ".html", ".htm", ".odt",
    ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp",
}


@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & evaluate a resume",
    description=(
        "Upload a resume file (PDF, DOCX, TXT, etc.). "
        "Extracts text, analyses structure, generates embeddings, "
        "and **automatically runs AI evaluation**.\n\n"
        "Optionally provide a **job description** to also get "
        "JD match, skill gaps, tailored resume, and cover letter."
    ),
)
async def upload_resume(
    file: UploadFile = File(...),
    jd_text: Optional[str] = Form(None, description="Job description text (optional)"),
):
    data = await file.read()
    ext = Path(file.filename or "x").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Step 1: Upload, extract, embed
    try:
        resume = service.process_upload("anonymous", data, file.filename or "upload")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Step 2: Auto-evaluate
    try:
        evaluation = service.full_evaluate(resume["id"], jd_text=jd_text or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ResumeUploadResponse(
        resume_id=resume["id"],
        filename=resume["filename"],
        structured_data=resume["structured_data"],
        cv_quality=evaluation.get("cv_quality"),
        jd_match=evaluation.get("jd_match"),
        key_takeaways=evaluation.get("key_takeaways"),
        fit_index=evaluation.get("fit_index"),
        enhancement=evaluation.get("enhancement"),
    )
