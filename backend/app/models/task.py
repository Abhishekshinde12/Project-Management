from sqlmodel import SQLModel, Field, Relationship 
from uuid import UUID, uuid4
from datetime import datetime, timezone 
from app.enums import TaskPriority, TaskStatus
from typing import Optional 

class Task(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    proj_id: UUID = Field(foreign_key='project.id', nullable=False)
    title: str 
    description: Optional[str] = None 
    due_date: Optional[datetime] = None
    priority: TaskPriority = Field(default=TaskPriority.LOW)
    status_id: TaskStatus = Field(default=TaskStatus.TODO)
    created_by: UUID = Field(foreign_key='user.id', nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskAssigness(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: UUID = Field(foreign_key='task.id', nullable=False)
    user_id: UUID = Field(foreign_key='user.id', nullable=False)
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))