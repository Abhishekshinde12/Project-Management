from sqlmodel import SQLModel
from uuid import UUID 
from datetime import datetime
from app.enums import TaskPriority, TaskStatus 


# Task Table Schemas
class TaskBase(SQLModel):
    proj_id: UUID 
    title: str 
    description: str 

class TaskCreate(TaskBase):
    due_date: datetime 
    priority: TaskPriority
    status: TaskStatus
    # created_by: UUID, injected from auth token

class TaskPublic(TaskCreate):
    id: UUID 
    created_at: datetime  

class TaskUpdate(SQLModel):
    title: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None


# Task Assignes Schemas
class TaskAssigneesBase(SQLModel):
    task_id: UUID 
    user_id: UUID 

class TaskAssigneesCreate(TaskAssigneesBase):
    pass 

class TaskAssigneesPublic(TaskAssigneesBase):
    id: UUID 
    assigned_at: datetime 