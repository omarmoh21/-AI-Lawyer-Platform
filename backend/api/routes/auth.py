import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.schemas import LoginRequest, SignupRequest, UserOut
from app.auth.security import create_access_token, decode_access_token, hash_password, verify_password
from app.config.settings import AUTH_COOKIE_NAME, COOKIE_CROSS_SITE, JWT_EXPIRE_MINUTES
from app.db.database import get_db
from app.db.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_MAX_AGE = JWT_EXPIRE_MINUTES * 60


def _set_auth_cookie(response: Response, user_id: int) -> None:
    token = create_access_token(user_id)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="none" if COOKIE_CROSS_SITE else "lax",
        secure=COOKIE_CROSS_SITE,
    )


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        city=payload.city,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _set_auth_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    _set_auth_cookie(response, user.id)
    return user


@router.post("/guest", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def guest_login(response: Response, db: Session = Depends(get_db)):
    """Create a throwaway guest account so testers can try the app with zero
    friction. Guests get the exact same experience as a real account (same
    auth cookie, same routes) except the frontend hides chat history for
    them, and the account (with cascaded sessions/messages) is deleted the
    moment they log out — see `logout()` below."""
    token = uuid.uuid4().hex
    user = User(
        name="زائر",
        email=f"guest-{token}@guest.local",
        phone="",
        city="",
        password_hash=hash_password(token),
        is_guest=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _set_auth_cookie(response, user.id)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    response.delete_cookie(key=AUTH_COOKIE_NAME)

    token = request.cookies.get(AUTH_COOKIE_NAME)
    user_id = decode_access_token(token) if token else None
    if user_id is None:
        return

    user = db.get(User, user_id)
    if user is not None and user.is_guest:
        db.delete(user)
        db.commit()


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()
    response.delete_cookie(key=AUTH_COOKIE_NAME)
