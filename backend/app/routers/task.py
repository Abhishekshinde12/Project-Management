# routers/task.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from uuid import UUID
from app.db.postgres_db import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import Task, TaskAssignees
from app.models.organization import OrganizationMember
from app.models.project import Project
from app.schemas.task import TaskCreate, TaskPublic, TaskUpdate, TaskAssigneesPublic
from app.enums import UserType

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_and_verify_membership(
    task_id: UUID,
    session: Session,
    current_user: User
) -> tuple[Task, OrganizationMember]:
    """Verify task exists and current user is a member of the task's org"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # get project to find org
    proj = session.get(Project, task.proj_id)

    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return task, member


@router.get('/{task_id}', response_model=TaskPublic)
def get_task(
    task_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task, _ = get_task_and_verify_membership(task_id, session, current_user)
    return task


@router.post('/', response_model=TaskPublic, status_code=201)
def create_task(
    data: TaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # verify project exists
    proj = session.get(Project, data.proj_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # verify current user is a member of the org
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == current_user.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    task = Task(
        proj_id=data.proj_id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        priority=data.priority,
        status=data.status,
        created_by=current_user.id  # injected server-side
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.patch('/{task_id}', response_model=TaskPublic)
def update_task(
    task_id: UUID,
    data: TaskUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task, member = get_task_and_verify_membership(task_id, session, current_user)

    # check if current user is assignee
    is_assignee = session.exec(
        select(TaskAssignees).where(
            TaskAssignees.task_id == task_id,
            TaskAssignees.user_id == current_user.id
        )
    ).first()

    # only task creator, assignee, admin or owner can update
    is_authorized = (
        task.created_by == current_user.id or
        is_assignee or
        member.role in [UserType.OWNER, UserType.ADMIN]
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    # only update fields that were provided
    task_data = data.model_dump(exclude_unset=True)
    for key, value in task_data.items():
        setattr(task, key, value)

    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.delete('/{task_id}', status_code=204)
def delete_task(
    task_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task, member = get_task_and_verify_membership(task_id, session, current_user)

    # only task creator, admin or owner can delete
    if task.created_by != current_user.id and member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    session.delete(task)
    session.commit()


# ── Task Assignees ───────────────────────────────────────

@router.get('/{task_id}/assignees', response_model=list[TaskAssigneesPublic])
def get_assignees(
    task_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task, _ = get_task_and_verify_membership(task_id, session, current_user)
    return task.assignments


@router.post('/{task_id}/assignees', response_model=TaskAssigneesPublic, status_code=201)
def add_assignee(
    task_id: UUID,
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task, member = get_task_and_verify_membership(task_id, session, current_user)

    # only creator, admin or owner can assign
    if task.created_by != current_user.id and member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to assign members")

    # verify user to be assigned is a member of the org
    proj = session.get(Project, task.proj_id)
    assignee_member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.org_id == proj.org_id,
            OrganizationMember.user_id == user_id
        )
    ).first()
    if not assignee_member:
        raise HTTPException(status_code=400, detail="User is not a member of this organization")

    # check not already assigned
    existing = session.exec(
        select(TaskAssignees).where(
            TaskAssignees.task_id == task_id,
            TaskAssignees.user_id == user_id
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already assigned to this task")

    assignee = TaskAssignees(task_id=task_id, user_id=user_id)
    session.add(assignee)
    session.commit()
    session.refresh(assignee)
    return assignee


@router.delete('/{task_id}/assignees/{user_id}', status_code=204)
def remove_assignee(
    task_id: UUID,
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    task, member = get_task_and_verify_membership(task_id, session, current_user)

    if task.created_by != current_user.id and member.role not in [UserType.OWNER, UserType.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to remove assignees")

    assignee = session.exec(
        select(TaskAssignees).where(
            TaskAssignees.task_id == task_id,
            TaskAssignees.user_id == user_id
        )
    ).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")

    session.delete(assignee)
    session.commit()