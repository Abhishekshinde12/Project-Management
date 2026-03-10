from sqlmodel import SQLModel, Field 
from uuid import UUID, uuid4
from datetime import datetime, timezone 
from pydantic import EmailStr
from app.enums import UserType

class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str 
    email: EmailStr = Field(index=True, unique=True)
    password: str
    user_type: UserType = Field(default=UserType.MEMBER)
    created_at: datetime = Field(default_factory= lambda: datetime.now(timezone.utc))