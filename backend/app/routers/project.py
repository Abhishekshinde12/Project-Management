from app.models.user import User
from app.models.project import Project
from app.models import Organization, OrganizationMember
from app.schemas.project import ProjectCreate, ProjectPublic, ProjectUpdate
from app.db.postgres_db import get_session
from app.core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select 
from uuid import UUID 
from app.enums import UserType, ProjectStatus

router = APIRouter(prefix='/project', tags=['project'])


@router.get('/all/{org_id}', response_model=list[ProjectPublic])
def get_all_projects(
    org_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    projects = session.exec(
        select(Project).where(Project.org_id == org_id)
    ).all()
    return projects


@router.get('/{project_id}', response_model=ProjectPublic)
def get_project(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    proj = session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return proj


@router.post('/', response_model=ProjectPublic)
def create_project(
    data: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org = session.get(Organization, data.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == data.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    if member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and owners can create projects")

    
    proj = Project(
        org_id=data.org_id,
        name=data.name,
        description=data.description,
        status=ProjectStatus.ACTIVE
    )
    session.add(proj)
    session.commit()
    session.refresh(proj)
    return proj


@router.patch("/{project_id}", response_model=ProjectPublic)
def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    proj = session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    if member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and owners can update projects")

    if data.name is not None:
        proj.name = data.name
    if data.description is not None:
        proj.description = data.description
    if data.status is not None:
        proj.status = data.status

    session.commit()
    session.refresh(proj)
    return proj


@router.delete('/{project_id}')
def delete_project(
    project_id: UUID, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    proj = session.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    if member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and owners can delete projects")

    session.delete(proj)
    session.commit()
    return {"message" : "Successfully Deleted Project"}