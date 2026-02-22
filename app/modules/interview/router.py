"""
Interview router - session lifecycle endpoints.
"""

from fastapi import APIRouter, HTTPException, status

from app.core import store
from app.models.interview import (
    CreateSessionRequest,
    FinalReportResponse,
    InterviewResponse,
    InterviewStage,
    PersonalityMode,
    SubmitAnswerRequest,
)
from app.modules.interview import orchestrator

router = APIRouter(prefix="/interview", tags=["Interview"])

ANON_USER = "anonymous"


@router.post("/session", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_session(body: CreateSessionRequest):
    try:
        session = orchestrator.create_session(
            user_id=ANON_USER, resume_id=body.resume_id,
            jd_text=body.jd_text, personality=body.personality,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        question, session = orchestrator.get_next_question(session["id"])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {exc}")

    return InterviewResponse(
        session_id=session["id"],
        stage=session["stage"],
        question=question,
        round_type=session.get("round_type"),
    )


@router.post("/session/{session_id}/answer", response_model=InterviewResponse)
async def submit_answer(session_id: str, body: SubmitAnswerRequest):
    session = store.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["stage"] in (InterviewStage.COMPLETED.value, InterviewStage.FINAL_EVALUATION.value):
        raise HTTPException(status_code=400, detail="Interview already completed")

    try:
        ev, session = orchestrator.submit_answer(session_id, body.answer)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Auto-complete if we hit final_evaluation
    if session["stage"] in (InterviewStage.FINAL_EVALUATION.value, InterviewStage.COMPLETED.value):
        orchestrator.complete_interview(session_id)
        return InterviewResponse(
            session_id=session["id"],
            stage=session["stage"],
            is_complete=True,
            evaluation=ev,
            round_type=session.get("round_type"),
        )

    try:
        question, session = orchestrator.get_next_question(session_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {exc}")

    # Check if the next question is a follow-up
    last_history = session["history"][-1] if session["history"] else {}
    is_followup = last_history.get("is_followup", False)

    return InterviewResponse(
        session_id=session["id"],
        stage=session["stage"],
        question=question,
        evaluation=ev,
        is_followup=is_followup,
        round_type=session.get("round_type"),
    )


@router.post("/session/{session_id}/complete", response_model=FinalReportResponse)
async def complete_interview(session_id: str):
    session = store.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        report = orchestrator.complete_interview(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return FinalReportResponse(**report)


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    session = store.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session["id"],
        "stage": session["stage"],
        "question_count": session["question_count"],
        "personality": session["personality"],
        "round_type": session.get("round_type", "full"),
        "is_complete": session["stage"] == InterviewStage.COMPLETED.value,
        "history": [
            {
                "role": e["role"],
                "content": e["content"],
                "stage": e.get("stage", ""),
                "is_followup": e.get("is_followup", False),
                "timestamp": e.get("timestamp", ""),
            }
            for e in session["history"]
        ],
        "strong_topics": session.get("strong_topics", []),
        "weak_topics": session.get("weak_topics", []),
        "cv_analysis": session.get("cv_analysis"),
        "final_report": session["final_report"],
        "created_at": session["created_at"],
    }


@router.get("/session/{session_id}/report", response_model=FinalReportResponse)
async def get_report(session_id: str):
    session = store.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session["final_report"]:
        raise HTTPException(status_code=400, detail="Interview not yet completed")
    return FinalReportResponse(**session["final_report"])


@router.get("/sessions")
async def list_sessions():
    return [
        {"session_id": s["id"], "stage": s["stage"], "question_count": s["question_count"],
         "personality": s["personality"], "is_complete": s["stage"] == InterviewStage.COMPLETED.value,
         "has_report": s["final_report"] is not None, "created_at": s["created_at"]}
        for s in store.sessions.values()
    ]
