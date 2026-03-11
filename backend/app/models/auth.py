from sqlmodel import SQLModel, Field
from datetime import datetime, timezone
from uuid import UUID


class RefreshToken(SQLModel, table=True):
    jti: str = Field(primary_key=True)
    family_id: str = Field(nullable=False, index=True)
    user_id: UUID = Field(foreign_key='user.id', nullable=False, index=True)
    device_info: str
    expires_at: datetime = Field(nullable=False, index=True)
    revoked: bool = Field(default=False)
    created_at: datetime  = Field(default_factory=lambda: datetime.now(timezone.utc))