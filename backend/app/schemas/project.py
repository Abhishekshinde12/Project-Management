from sqlmodel import SQLModel
from datetime import timezone, datetime 
from uuid import UUID 
from app.enums import ProjectStatus

class ProjectBase(SQLModel):
    org_id: UUID 
    name: str 
    description: str 
    status: ProjectStatus

class ProjectCreate(ProjectBase):
    pass 

class ProjectPublic(ProjectBase):
    id: UUID 
    created_at: datetime 