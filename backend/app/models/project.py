from sqlmodel import SQLModel, Field, Relationship
from datetime import timezone, datetime 
from uuid import uuid4, UUID
from app.enums import ProjectStatus 
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.task import Task



class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key='organization.id', nullable=False)
    name: str 
    description: Optional[str] = None 
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE)
    created_at: datetime = Field(default_factory= lambda: datetime.now(timezone.utc))

    # The org this project belongs to
    organization: "Organization" = Relationship(back_populates="projects")
    # All tasks under this project
    tasks: list["Task"] = Relationship(back_populates="project")