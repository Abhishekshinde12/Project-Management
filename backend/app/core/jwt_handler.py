# app/core/jwt_handler.py
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import jwt, JWTError
import secrets
from app.config import settings

'''
- sub = subject, identifier for whom token was issued. can be user, app, service
- exp = expiry
- iat = issue time 
- type = token type 
- jti = token id 
'''

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
        "type": "access",
        "jti": secrets.token_urlsafe(16)
    }
    return jwt.encode(payload, settings.ACCESS_TOKEN_SECRET, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": secrets.token_urlsafe(16)
    }
    return jwt.encode(payload, settings.REFRESH_TOKEN_SECRET, algorithm=settings.ALGORITHM)


# this by default works for access
# but also used during refresh token rotation
def decode_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    try:
        secret = settings.ACCESS_TOKEN_SECRET if token_type == "access" else settings.REFRESH_TOKEN_SECRET
        return jwt.decode(token, secret, algorithms=[settings.ALGORITHM])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")