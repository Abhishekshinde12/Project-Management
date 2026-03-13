# routers/comment.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from uuid import UUID
from app.db.postgres_db import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.comment import Comment
from app.models.task import Task
from app.models.project import Project
from app.models.organization import OrganizationMember
from app.schemas.comment import CommentCreate, CommentPublic
from app.enums import UserType

router = APIRouter(prefix="/comments", tags=["comments"])

def get_comment_and_verify_membership(
    comment_id: UUID,
    session: Session,
    current_user: User
) -> tuple[Comment, OrganizationMember]:
    """Verify comment exists and current user is a member of the comment's org"""
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    task = session.get(Task, comment.task_id)
    proj = session.get(Project, task.proj_id)

    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return comment, member


@router.get('/{task_id}', response_model=list[CommentPublic])
def get_comments(
    task_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    proj = session.get(Project, task.proj_id)
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return task.comments


@router.post('/{task_id}', response_model=CommentPublic, status_code=201)
def create_comment(
    task_id: UUID,
    data: CommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    proj = session.get(Project, task.proj_id)
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    comment = Comment(
        task_id=task_id,
        text=data.text,
        commented_user_id=current_user.id  # injected server-side
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


@router.patch('/{comment_id}', response_model=CommentPublic)
def update_comment(
    comment_id: UUID,
    data: CommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    comment, member = get_comment_and_verify_membership(comment_id, session, current_user)

    # only comment author or admin/owner can edit
    if comment.commented_user_id != current_user.id and member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    comment.text = data.text
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


@router.delete('/{comment_id}', status_code=204)
def delete_comment(
    comment_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    comment, member = get_comment_and_verify_membership(comment_id, session, current_user)

    # only comment author or admin/owner can delete
    if comment.commented_user_id != current_user.id and member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    session.delete(comment)
    session.commit()