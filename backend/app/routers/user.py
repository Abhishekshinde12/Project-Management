from app.models.user import User
from app.schemas.user import UserCreate, UserPublic
from app.db.postgres_db import get_session
from app.core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select 
from uuid import UUID 
from passlib.context import CryptContext

router = APIRouter(prefix="/user", tags=['User'])
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


@router.get('/{user_id}/', response_model=UserPublic)
def get_user(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post('/', response_model=UserPublic)
def create_user(
    data: UserCreate,
    session: Session = Depends(get_session)
):
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')

    user = User(
        name=data.name,
        email=data.email,
        password=pwd_context.hash(data.password),
        user_type=data.user_type
    )
    print(user.model_dump())

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.delete('/{user_id}', status_code=204)
def delete_user(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # only allow users to delete their own account
    if user.id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    session.delete(user)
    session.commit()