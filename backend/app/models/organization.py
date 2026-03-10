from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime, timezone 
from uuid import uuid4, UUID 
from app.enums import UserType
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.project import Project


class Organization(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key='user.id', nullable=False)
    name: str 
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # The user who owns this org
    owner: "User" = Relationship(back_populates="owned_organizations")
    # All members (via junction table)
    memberships: list["OrganizationMember"] = Relationship(back_populates="organization")
    # All projects under this org
    projects: list["Project"] = Relationship(back_populates="organization")


class OrganizationMember(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key='organization.id', nullable=False)
    user_id: UUID = Field(foreign_key='user.id', nullable=False)
    role: UserType = Field(default=UserType.MEMBER)
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Back to the org
    organization: "Organization" = Relationship(back_populates="memberships")
    # Back to the user
    user: "User" = Relationship(back_populates="org_memberships")