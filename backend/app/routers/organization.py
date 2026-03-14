from app.models.user import User
from app.models.organization import Organization, OrganizationMember
from app.schemas.organization import (
    OrganizationCreate, OrganizationPublic, OrganizationUpdate,
    OrganizationMemberCreate, OrganizationMemberPublic
)
from app.db.postgres_db import get_session
from app.core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select 
from uuid import UUID 
from app.enums import UserType


router = APIRouter(prefix="/org", tags=['organization'])

@router.get("/", response_model=list[OrganizationPublic])
def get_all_org(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    orgs = session.exec(select(Organization).where(
        Organization.owner_id == current_user.id
    ))
    if not orgs:
        raise HTTPException(status_code=404, detail="Organization not found")
    return orgs


@router.get("/{org_id}", response_model=OrganizationPublic)
def get_org(
    org_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.post("/", response_model=OrganizationPublic, status_code=201)
def create_org(
    data: OrganizationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org = Organization(owner_id=current_user.id, name=data.name)
    session.add(org)
    session.flush()  # flush to get org.id before committing

    # automatically add creator as owner in org_members
    member = OrganizationMember(
        org_id=org.id,
        user_id=current_user.id,
        role=UserType.OWNER
    )
    session.add(member)
    session.commit()
    session.refresh(org)
    return org


@router.patch("/{org_id}", response_model=OrganizationPublic)
def update_org(
    org_id: UUID,
    data: OrganizationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can update this organization")

    if data.name is not None:
        org.name = data.name

    session.commit()
    session.refresh(org)
    return org


@router.delete("/{org_id}", status_code=204)
def delete_org(
    org_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this organization")

    session.delete(org)
    session.commit()
    return {"message" : "Successfully Deleted Organization"}


# ── Org Member Endpoints ─────────────────────────────────

def get_org_and_verify_membership(
    org_id: UUID,
    session: Session,
    current_user: User
) -> tuple[Organization, OrganizationMember]:
    """Reusable helper — verifies org exists and current user is a member"""
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    current_member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not current_member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return org, current_member


@router.get('/{org_id}/members', response_model=list[OrganizationMemberPublic])
def get_members(
    org_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org, _ = get_org_and_verify_membership(org_id, session, current_user)
    return org.memberships


@router.get('/{org_id}/members/{member_id}', response_model=OrganizationMemberPublic)
def get_member(
    org_id: UUID,
    member_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    get_org_and_verify_membership(org_id, session, current_user)

    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.id == member_id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@router.post('/{org_id}/members', response_model=OrganizationMemberPublic, status_code=201)
def add_member(
    org_id: UUID,
    user_id: UUID,  # ID of user to add,
    role: UserType,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    _, current_member = get_org_and_verify_membership(org_id, session, current_user)

    # only owner or admin can add members
    if current_member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Only owners and admins can add members")

    # check user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # check not already a member
    existing = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == user_id
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    member = OrganizationMember(org_id=org_id, user_id=user_id, role=role)
    print("Added member type: ", member.model_dump())
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


@router.delete('/{org_id}/members/{member_id}', status_code=204)
def remove_member(
    org_id: UUID,
    member_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    _, current_member = get_org_and_verify_membership(org_id, session, current_user)

    if current_member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Only owners and admins can remove members")

    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.id == member_id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # admin cannot remove owner
    if member.role == UserType.OWNER:
        raise HTTPException(status_code=403, detail="Cannot remove the organization owner")

    session.delete(member)
    session.commit()