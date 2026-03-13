from sqlmodel import SQLModel
from datetime import timezone, datetime 
from uuid import UUID 
from app.enums import ProjectStatus

class ProjectBase(SQLModel):
    org_id: UUID 
    name: str 
    description: str 

class ProjectCreate(ProjectBase):
    pass 

class ProjectPublic(ProjectBase):
    id: UUID 
    created_at: datetime 

class ProjectUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None