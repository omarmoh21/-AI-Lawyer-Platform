from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.security import decode_access_token
from app.config.settings import AUTH_COOKIE_NAME


def _rate_limit_key(request: Request) -> str:
    """Key by authenticated user when possible, so users behind a shared
    IP/NAT don't share a limit and a single user can't dodge one by
    switching networks."""
    token = request.cookies.get(AUTH_COOKIE_NAME)
    user_id = decode_access_token(token) if token else None
    if user_id is not None:
        return f"user:{user_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key)
