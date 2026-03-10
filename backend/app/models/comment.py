from sqlmodel import SQLModel, Field, Relationship
from uuid import uuid4, UUID 
from datetime import datetime, timezone 
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.task import Task

class Comment(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: UUID = Field(foreign_key='task.id', nullable=False)
    text: str
    commented_user_id: UUID = Field(foreign_key='user.id', nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # The task this comment belongs to
    task: "Task" = Relationship(back_populates="comments")
    # The user who wrote this comment
    commented_user: "User" = Relationship(back_populates="comments")