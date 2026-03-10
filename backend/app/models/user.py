from sqlmodel import SQLModel, Field, Relationship
from uuid import UUID, uuid4
from datetime import datetime, timezone 
from pydantic import EmailStr
from app.enums import UserType
from typing import TYPE_CHECKING

'''
- As we need to define one model as a type for another model
- It can lead to circular imports for type checking
- Hence we use following syntax, where we place all our type annotations related imports 
- This prevents module from actually being imported at run-time
- Static Type analysis, which means the module will be imported and the types will be checked properly during such analysis.
'''
if TYPE_CHECKING:
    from app.models.organization import Organization, OrganizationMember
    from app.models.task import Task, TaskAssignees
    from app.models.comment import Comment 


class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str 
    email: EmailStr = Field(index=True, unique=True)
    password: str
    user_type: UserType = Field(default=UserType.MEMBER)
    created_at: datetime = Field(default_factory= lambda: datetime.now(timezone.utc))

    # Orgs this user owns
    owned_organizations: list["Organization"] = Relationship(back_populates='owner')
    # Orgs this user is a member of (via junction table)
    org_memberships: list["OrganizationMember"] = Relationship(back_populates="user")
    # Tasks this user created
    created_tasks: list["Task"] = Relationship(back_populates="creator")
    # Tasks assigned to this user (vis junction table)
    task_assignments: list["TaskAssignees"] = Relationship(back_populates="user")
    # Comments by this user
    comments: list["Comment"] = Relationship(back_populates="commented_user")