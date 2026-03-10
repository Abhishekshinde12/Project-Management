from sqlmodel import SQLModel, Field, Relationship 
from uuid import UUID, uuid4
from datetime import datetime, timezone 
from app.enums import TaskPriority, TaskStatus
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.project import Project
    from app.models.comment import Comment

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

    # The project this task belongs to
    project: "Project" = Relationship(back_populates="tasks")
    # User who created this task
    creator: "User" = Relationship(back_populates="created_tasks")
    # Assignees (via junction table)
    assignments: list["TaskAssignees"] = Relationship(back_populates="task")
    # Comments on this task
    comments: list["Comment"] = Relationship(back_populates="task")




class TaskAssignees(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: UUID = Field(foreign_key='task.id', nullable=False)
    user_id: UUID = Field(foreign_key='user.id', nullable=False)
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Back to the task
    task: "Task" = Relationship(back_populates="assignments")
    # Back to the user
    user: "User" = Relationship(back_populates="task_assignments")