from sqlmodel import SQLModel
from datetime import datetime 
from uuid import UUID 
from app.enums import UserType


# Organization Schemas
class OrganizationBase(SQLModel):
    owner_id: UUID 
    name: str 

class OrganizationCreate(OrganizationBase):
    pass 

class OrganizationPublic(OrganizationBase):
    id: UUID 
    created_at: datetime


# Organization Members Schemas
class OrganizationMemberBase(SQLModel):
    org_id: UUID 
    user_id: UUID 
    role: UserType


class OrganizationMemberCreate(OrganizationMemberBase):
    pass 


class OrganizationMemberPublic(OrganizationMemberBase):
    id: UUID 
    joined_at: datetime 