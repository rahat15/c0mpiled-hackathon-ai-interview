# AI Interview Platform

> Simplified unified FastAPI backend — Groq-only LLM, in-memory storage, zero external dependencies.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Python 3.11+ |
| Framework | FastAPI + Pydantic v2 |
| LLM | Groq (`llama-3.1-8b-instant`) — all LLM calls |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) — local, no API key needed |
| Storage | In-memory dicts (no database) |
| Auth | JWT + bcrypt |

**No database, no Gemini, no external vector DB.** Just Groq API + local embeddings.

## Quick Start

### 1. Install

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:
```
GROQ_API_KEY=gsk_your_key_here
JWT_SECRET=some-long-random-string
```

### 3. Run

```bash
uvicorn app.main:app --reload --port 8000
```

Docs → **http://localhost:8000/docs**

---

## Project Structure

```
app/
├── main.py                        # FastAPI entrypoint
├── core/
│   ├── config.py                  # Settings (env vars)
│   ├── store.py                   # In-memory data store
│   └── security.py                # JWT + bcrypt
├── models/
│   ├── user.py                    # User schemas
│   ├── resume.py                  # Resume schemas
│   └── interview.py               # Interview schemas + enums
└── modules/
    ├── auth/
    │   └── router.py              # Register & login
    ├── resume/
    │   ├── router.py              # Upload, evaluate, improve
    │   ├── service.py             # Pipeline orchestration
    │   ├── analyzer.py            # Text extraction + Groq analysis
    │   ├── embedder.py            # Local sentence-transformer embeddings
    │   └── scorer.py              # Groq-based scoring
    └── interview/
        ├── router.py              # Session endpoints
        ├── orchestrator.py        # Deterministic stage flow
        ├── prompts.py             # Prompt templates
        ├── evaluator.py           # Answer evaluation (Groq + heuristic)
        ├── retrieval.py           # Embedding-based chunk retrieval
        └── report.py              # Final report generation
```

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login → JWT |

### Resume
| Method | Path | Description |
|---|---|---|
| POST | `/api/resume/upload` | Upload & process resume |
| GET | `/api/resume/list` | List resumes |
| GET | `/api/resume/{id}` | Get resume details |
| POST | `/api/resume/{id}/evaluate` | Score (optionally vs JD) |
| POST | `/api/resume/{id}/improve` | Tailored resume + cover letter |

### Interview
| Method | Path | Description |
|---|---|---|
| POST | `/api/interview/session` | Start → first question |
| POST | `/api/interview/session/{id}/answer` | Answer → next question |
| POST | `/api/interview/session/{id}/complete` | Force-complete → report |
| GET | `/api/interview/session/{id}` | Session state |
| GET | `/api/interview/session/{id}/report` | Final report |
| GET | `/api/interview/sessions` | List sessions |

All resume/interview endpoints need `Authorization: Bearer <token>`.

## Interview Flow

```
intro → technical → deep_dive → behavioral → closing → final_evaluation → completed
```

- Stage transitions controlled by **Python logic**, never by LLM
- Adaptive difficulty: low scores → simpler follow-ups, high scores → harder questions
- Deep-dive uses **semantic embedding retrieval** (cosine similarity) from resume chunks
- Personality modes (`friendly`, `strict`, `startup_cto`) change tone only

## Note

Data lives in memory — it resets when the server restarts. This is intentional for simplicity. Swap `app/core/store.py` for a real DB when needed.
