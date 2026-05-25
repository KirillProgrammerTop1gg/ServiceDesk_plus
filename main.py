from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import (
    Cookie,
    Depends,
    FastAPI,
    Form,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from project_models import Base, Problem, User, async_session, engine

SECRET_KEY = "kW!8729ew95P$be5j532#8Qlv;3&5tJ3"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 1
COOKIE_MAX_AGE = 60 * 60 * 24 * 3


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
templates = Jinja2Templates(directory="static")


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session


def get_current_user(access_token: str = Cookie(default=None)) -> tuple[int, str]:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Неавторизовано"
        )
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int | None = payload.get("user_id")
        role: str | None = payload.get("role")
        if user_id is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Недійсний токен"
            )
        return user_id, role
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен прострочений"
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Недійсний токен"
        )


def _create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(tz=timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"user_id": user_id, "role": role, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
    )


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/register", response_class=HTMLResponse)
async def register_form(request: Request):
    return templates.TemplateResponse(request, "register.html")


@app.post("/register", response_class=HTMLResponse)
async def register(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    email: str = Form(...),
    session: AsyncSession = Depends(get_session),
):
    existing = await session.execute(
        select(User).where((User.username == username) | (User.email == email))
    )
    if existing.scalars().first():
        return templates.TemplateResponse(
            request,
            "register.html",
            {"error": "Користувач з таким іменем або email вже існує"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    new_user = User(username=username, email=email)
    new_user.set_password(raw_password=password)
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    return templates.TemplateResponse(
        request,
        "register.html",
        {"message": "Ви успішно створили акаунт!"},
    )


@app.get("/login", response_class=HTMLResponse)
async def login_form(request: Request, error: str | None = None):
    return templates.TemplateResponse(request, "login.html", {"error": error})


@app.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(User).where(User.username == form_data.username)
    )
    user: User | None = result.scalars().first()

    if not user or not bcrypt.checkpw(
        form_data.password.encode(), user.password.encode()
    ):
        return RedirectResponse(
            url="/login?error=Пароль або логін невірний, спробуйте ще раз",
            status_code=status.HTTP_302_FOUND,
        )

    token = _create_access_token(
        user_id=user.id,
        role="admin" if user.is_admin else "user",
    )

    redirect = RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
    _set_auth_cookie(redirect, token)
    return redirect


@app.post("/logout")
def logout():
    response = RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
    response.delete_cookie("access_token")
    return response
