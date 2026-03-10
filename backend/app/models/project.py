from sqlmodel import SQLModel, Field, Relationship
from datetime import timezone, datetime 
from uuid import uuid4, UUID
from app.enums import ProjectStatus 
from typing import Optional

class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key='organization.id', nullable=False)
    name: str 
    description: Optional[str] = None 
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE)
    created_at: datetime = Field(default_factory= lambda: datetime.now(timezone.utc))