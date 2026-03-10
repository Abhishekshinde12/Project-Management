from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime, timezone 
from uuid import uuid4, UUID 
from app.enums import UserType


class Organization(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key='user.id', nullable=False)
    name: str 
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrganizationMember(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key='organization.id', nullable=False)
    user_id: UUID = Field(foreign_key='user.id', nullable=False)
    # role: UserType = Field(default=UserType.MEMBER)
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))