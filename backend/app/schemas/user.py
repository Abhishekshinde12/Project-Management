from app.enums import UserType
from sqlmodel import SQLModel
from uuid import UUID 
from datetime import datetime 


class UserBase(SQLModel):
    name: str 
    email: str 
    user_type: UserType = UserType.MEMBER


class UserCreate(UserBase):
    password: str 


class UserPublic(UserBase):
    id: UUID 
    created_at: datetime