from sqlmodel import SQLModel, Field
from uuid import uuid4, UUID 
from datetime import datetime, timezone 

class Comment(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: UUID = Field(foreign_key='task.id', nullable=False)
    text: str
    commented_user_id: UUID = Field(foreign_key='user.id', nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))