# app/core/token_manager.py
import secrets
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select
from app.models.auth import RefreshToken
from app.core.jwt_handler import (
    create_access_token, create_refresh_token,
    decode_token
)
from app.config import settings 

class TokenManager:
    def __init__(self, session: Session):
        self.session = session


    def create_token_pair(self, user_id: str, device_info: str = None):
        """Creating new token pair. Here we also set family_id for revocation in case token theft occurred"""
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)
        family_id = secrets.token_urlsafe(16)
        jti = decode_token(refresh_token, "refresh")["jti"]

        self.session.add(RefreshToken(
            jti=jti,
            family_id=family_id,
            user_id=user_id,
            device_info=device_info,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        ))

        self.session.commit()
        return access_token, refresh_token


    def rotate_refresh_token(self, old_refresh_token: str):
        payload = decode_token(old_refresh_token, "refresh")

        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")

        record = self.session.get(RefreshToken, payload["jti"])
        if not record:
            raise ValueError("Refresh token not found")

        if record.revoked:
            # Reuse detected — revoke entire family
            # Forcing legitimate user to re-auth
            self._revoke_family(record.family_id)
            raise ValueError("Token reuse detected - all sessions revoked")

        record.revoked = True
        self.session.add(record)

        # Generating new token, as valid refresh token 
        # hence the new pair of tokens belong to same family as earlier token
        new_access = create_access_token(str(record.user_id))
        new_refresh = create_refresh_token(str(record.user_id))
        new_jti = decode_token(new_refresh, "refresh")["jti"]

        self.session.add(RefreshToken(
            jti=new_jti,
            family_id=record.family_id,
            user_id=record.user_id,
            device_info=record.device_info,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        ))

        self.session.commit()
        return new_access, new_refresh


    def _revoke_family(self, family_id: str):
        records = self.session.exec(
            select(RefreshToken).where(RefreshToken.family_id == family_id)
        ).all()
        for r in records:
            r.revoked = True
            self.session.add(r)
        self.session.commit()


    def revoke_token(self, jti: str):
        record = self.session.get(RefreshToken, jti)
        if record:
            record.revoked = True
            self.session.add(record)
            self.session.commit()