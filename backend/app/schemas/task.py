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
    priority_id: TaskPriority
    status_id: TaskStatus
    # created_by: UUID, injected from auth token

class TaskPublic(TaskCreate):
    id: UUID 
    created_at: datetime  



# Task Assignes Schemas
class TaskAssignesBase(SQLModel):
    task_id: UUID 
    user_id: UUID 

class TaskAssignesCreate(TaskAssignesBase):
    pass 

class TaskAssignesPublic(TaskAssignesBase):
    id: UUID 
    assigned_at: datetime 