"""
AI Interview Platform — FastAPI entrypoint.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (in-memory store, Groq LLM)", settings.APP_NAME)
    yield
    logger.info("Shutting down …")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI Interview Platform — resume analysis + conversational interviews, powered by Groq.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
from app.modules.auth.router import router as auth_router          # noqa: E402
from app.modules.resume.router import router as resume_router      # noqa: E402
from app.modules.interview.router import router as interview_router  # noqa: E402

app.include_router(auth_router, prefix="/api")
app.include_router(resume_router, prefix="/api")
app.include_router(interview_router, prefix="/api")


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.APP_NAME,
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "resume": "/api/resume/upload, /api/resume/evaluate",
            "interview": "/api/interview/session, /api/interview/sessions, /api/interview/session/{id}/answer, /api/interview/session/{id}/complete, /api/interview/session/{id}/report",
        },
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": settings.APP_NAME}
