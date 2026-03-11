from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select 
from app.db.postgres_db import get_session
from app.core.token_manager import TokenManager
from app.core.jwt_handler import decode_token
from app.models.user import User 
from passlib.context import CryptContext
from app.config import settings 


router = APIRouter(prefix="/auth", tags=['Auth'])
pwd_context = CryptContext(schemes=['bcrypt'])


COOKIE_SETTINGS = {
    'httponly': True, # JS cant access this
    'secure': False, # True = HTTPS, False = Http
    'samesite': 'lax' # Prevents CSRF
}


# Dependency
def get_current_user(
    request: Request,
    session: Session = Depends(get_session)
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError()
        user = session.get(User, payload["sub"])
        if not user:
            raise ValueError()
        return user
    except ValueError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    

@router.post('/token')
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    user = session.exec(select(User)).where(User.email == form_data.username).first()
    
    if not user or not pwd_context.verify(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    tm = TokenManager(session)
    access, refresh = tm.create_token_pair(
        user_id=str(user.id),
        device_info=request.headers.get("User-Agent")
    )

    response.set_cookie(
        key="access_token",
        value=access,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **COOKIE_SETTINGS
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS*24*60*60,
        path="/auth/refresh", # only sent to this endpoint
        **COOKIE_SETTINGS
    )
    return {"message": "Logged in"}


@router.post("/refresh")
def refresh_tokens(
    request: Request,
    response: Response,
    session: Session = Depends(get_session)
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        tm = TokenManager(session)
        access, new_refresh = tm.rotate_refresh_token(refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    response.set_cookie(key="access_token", value=access, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, **COOKIE_SETTINGS)
    response.set_cookie(key="refresh_token", value=new_refresh, max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, path="/auth/refresh", **COOKIE_SETTINGS)
    return {"message": "Token refreshed"}



@router.post("/logout")
def logout(
    request: Request, 
    response: Response, 
    session: Session = Depends(get_session)
):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            payload = decode_token(refresh_token)
            tm = TokenManager(session)
            tm._revoke_family(payload["jti"])
        except ValueError:
            pass  # token already invalid, continue with logout anyway

    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/auth/refresh")
    return {"message": "Logged out"}


# DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '30 days';