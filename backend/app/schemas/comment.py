from sqlmodel import SQLModel 
from datetime import datetime 
from uuid import UUID 


class CommentBase(SQLModel):
    text: str 
    # commented_user_id: UUID, even this value taken from auth token


class CommentCreate(CommentBase):
    pass 


class CommentPublic(CommentBase):
    id: UUID 
    task_id: UUID 
    created_at: datetime 