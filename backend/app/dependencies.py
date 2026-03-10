from typing import Annotated
from fastapi import Depends
from app.db.postgres_db import get_session
from sqlmodel import Session

SessionDep = Annotated[Session, Depends(get_session)]