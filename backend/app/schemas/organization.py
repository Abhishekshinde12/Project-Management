from sqlmodel import SQLModel
from datetime import datetime 
from uuid import UUID 
from app.enums import UserType


# Organization Schemas
class OrganizationBase(SQLModel):
    name: str 

class OrganizationCreate(OrganizationBase):
    pass 

class OrganizationPublic(OrganizationBase):
    id: UUID 
    owner_id: UUID 
    created_at: datetime

class OrganizationUpdate(SQLModel):
    name: str | None = None


# Organization Members Schemas
class UserSummary(SQLModel):
    id: UUID
    name: str
    email: str


class OrganizationMemberBase(SQLModel):
    org_id: UUID 
    user_id: UUID 
    role: UserType


class OrganizationMemberCreate(OrganizationMemberBase):
    pass 


class OrganizationMemberPublic(OrganizationMemberBase):
    id: UUID 
    user: UserSummary
    joined_at: datetime 