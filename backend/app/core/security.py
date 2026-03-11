from fastapi import Request, HTTPException, Depends
from .jwt_handler import decode_token
from sqlmodel import Session
from app.db.postgres_db import get_session
from app.models.user import User 

def get_current_user(
    request: Request,
    session: Session = Depends(get_session)
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token, "access")
        if payload.get("type") != "access":
            raise ValueError()
        user = session.get(User, payload["sub"])
        if not user:
            raise ValueError()
        return user
    except ValueError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")