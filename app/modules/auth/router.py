"""
Authentication router — register & login (in-memory store).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.core import store
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import TokenResponse, UserLogin, UserRegister, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister):
    # Check duplicate email
    for u in store.users.values():
        if u["email"] == body.email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_id = store.new_id()
    now = datetime.now(timezone.utc).isoformat()
    store.users[user_id] = {
        "id": user_id,
        "email": body.email,
        "hashed_password": hash_password(body.password),
        "created_at": now,
    }
    return UserResponse(id=user_id, email=body.email, created_at=now)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    for u in store.users.values():
        if u["email"] == body.email and verify_password(body.password, u["hashed_password"]):
            return TokenResponse(access_token=create_access_token(u["id"]))

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
