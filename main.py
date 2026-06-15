from fastapi import FastAPI, HTTPException, Depends, Cookie, File, UploadFile, Form, Request, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from project_models import (
    User,
    Base,
    async_session,
    engine,
    Problem,
    AdminResponse,
    ServiceRecord,
    UsersInTelegram,
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
import jwt
from datetime import datetime, timedelta, date
import bcrypt
import secrets
import string
import asyncio
import re
import json
import requests
import time
from collections import defaultdict
from typing import Optional
from tg_bot import start, send_msg, get_read_keyboard
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def generate_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


import os

SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"


def sanitize_html(text: Optional[str]) -> Optional[str]:
    if text is None:
        return None
    import re
    import html
    
    # Pre-parse basic markdown to HTML tags first
    # Bold: **text** or __text__ -> <b>text</b>
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.*?)__', r'<b>\1</b>', text)
    # Italic: *text* or _text_ -> <i>text</i>
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    text = re.sub(r'_(.*?)_', r'<i>\1</i>', text)
    # Code inline: `text` -> <code>text</code>
    text = re.sub(r'`(.*?)`', r'<code>\1</code>', text)
    
    allowed_tags = {
        "b", "strong", "i", "em", "u", "ins", "s", "strike", "del", "span", "code", "pre", "br", "a",
        "p", "div", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"
    }
    
    tag_pattern = re.compile(r'<(/?)([a-zA-Z0-9_-]+)(?:\s+([^>]*))?(/?)>')
    
    def replacer(match):
        is_closing = match.group(1) == '/'
        tag_name = match.group(2).lower()
        attrs = match.group(3) or ''
        is_self_closing = match.group(4) == '/'
        
        if tag_name not in allowed_tags:
            return ''
            
        if is_closing:
            return f'</{tag_name}>'
            
        cleaned_attrs = ''
        if tag_name == 'a' and attrs:
            href_match = re.search(r'(?i)\bhref\s*=\s*["\']([^"\']*)["\']', attrs)
            if href_match:
                url = href_match.group(1).strip()
                if re.match(r'^(https?://|/)', url, re.IGNORECASE) and not re.search(r'javascript:', url, re.IGNORECASE):
                    cleaned_attrs = f' href="{url}"'
                    
        if tag_name == 'br':
            return '<br/>'
            
        if is_self_closing:
            return f'<{tag_name}{cleaned_attrs}/>'
        else:
            return f'<{tag_name}{cleaned_attrs}>'
            
    cleaned = tag_pattern.sub(replacer, text)
    cleaned = re.sub(r'(?i)javascript:', '', cleaned)
    return cleaned


async def notify_managers_and_admins(session: AsyncSession, text: str):
    try:
        managers_result = await session.execute(
            select(User).filter(User.role.in_(["manager", "admin"]))
        )
        managers = managers_result.scalars().all()
        for mgr in managers:
            await send_msg(mgr.id, text)
    except Exception as e:
        print(f"Error notifying managers/admins: {e}")


async def notify_only_managers(session: AsyncSession, text: str, exclude_user_id: Optional[int] = None):
    try:
        managers_result = await session.execute(
            select(User).filter(User.role == "manager")
        )
        managers = managers_result.scalars().all()
        for mgr in managers:
            if exclude_user_id is None or mgr.id != exclude_user_id:
                await send_msg(mgr.id, text)
    except Exception as e:
        print(f"Error notifying only managers: {e}")


async def notify_only_admins(session: AsyncSession, text: str):
    try:
        admins_result = await session.execute(
            select(User).filter(User.role == "admin")
        )
        admins = admins_result.scalars().all()
        for admin in admins:
            await send_msg(admin.id, text)
    except Exception as e:
        print(f"Error notifying only admins: {e}")



async def validate_uploaded_file(file: UploadFile, is_invoice: bool = False):
    if not file or not file.filename:
        return
    
    if is_invoice:
        allowed_exts = {"pdf", "jpg", "jpeg", "png"}
        allowed_mimes = {"application/pdf", "image/jpeg", "image/png"}
    else:
        allowed_exts = {"jpg", "jpeg", "png", "gif", "webp"}
        allowed_mimes = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Недозволене розширення файлу: .{ext}. Дозволені розширення: {', '.join(sorted(allowed_exts))}"
        )
         
    if file.content_type not in allowed_mimes:
        raise HTTPException(
            status_code=400,
            detail=f"Недозволений MIME-тип файлу: {file.content_type}"
        )

    # 10 MB limit check
    max_size_mb = 10
    max_bytes = max_size_mb * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Розмір файлу не повинен перевищувати {max_size_mb} МБ"
        )
    await file.seek(0)


class InMemoryRateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.history = {}
        self.last_cleanup = time.time()
        self.lock = asyncio.Lock()

    async def check_rate_limit(self, client_ip: str) -> bool:
        async with self.lock:
            now = time.time()
            cutoff = now - self.window_seconds
            
            if now - self.last_cleanup > 300 or len(self.history) > 10000:
                for ip in list(self.history.keys()):
                    self.history[ip] = [t for t in self.history[ip] if t > cutoff]
                    if not self.history[ip]:
                        del self.history[ip]
                self.last_cleanup = now
                
            timestamps = self.history.get(client_ip, [])
            timestamps = [t for t in timestamps if t > cutoff]
            self.history[client_ip] = timestamps
            
            if len(timestamps) >= self.requests_limit:
                return False
                
            self.history[client_ip].append(now)
            return True


rate_limiter_general = InMemoryRateLimiter(requests_limit=1500, window_seconds=60)
rate_limiter_strict = InMemoryRateLimiter(requests_limit=200, window_seconds=60)


async def limit_general(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not await rate_limiter_general.check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Забагато запитів. Будь ласка, спробуйте пізніше")


async def limit_strict(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not await rate_limiter_strict.check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Забагато запитів для цієї дії. Спробуйте пізніше")


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path
        
        is_safe_method = method in ("GET", "HEAD", "OPTIONS", "TRACE")
        has_session = "access_token" in request.cookies
        
        bypass_verification = (
            is_safe_method
            or not has_session
            or path in ("/login", "/register", "/logout")
            or path.startswith("/static/")
        )
        
        if not bypass_verification:
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            
            if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Помилка CSRF: токени відсутні або не збігаються"}
                )
        
        response = await call_next(request)
        
        if "csrf_token" not in request.cookies:
            token = secrets.token_hex(32)
            response.set_cookie(
                key="csrf_token",
                value=token,
                httponly=False,  # Accessible to Axios JS
                samesite="lax",
                secure=False,
            )
            
        return response


# ---------------------------------------------------------------------------
# App & middleware
# ---------------------------------------------------------------------------

app = FastAPI(title="Service Desk API", dependencies=[Depends(limit_general)])
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
        "https://kirillprogrammertop1gg.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CSRFMiddleware)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session


async def get_current_user(
    access_token: str = Cookie(None),
    session: AsyncSession = Depends(get_session)
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Неавторизовано")
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Невалідний токен")
        # Dynamic check from database to ensure role changes apply immediately
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="Користувача не знайдено")
        return user_id, user.role
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Недійсний токен")


def admin_required(user_data: tuple = Depends(get_current_user)):
    _, role = user_data
    if role != "admin":
        raise HTTPException(status_code=403, detail="Доступ лише для адміністраторів")
    return user_data


def admin_or_manager_required(user_data: tuple = Depends(get_current_user)):
    _, role = user_data
    if role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Доступ лише для адміністраторів та менеджерів")
    return user_data


def staff_required(user_data: tuple = Depends(get_current_user)):
    _, role = user_data
    if role not in ["admin", "manager", "master"]:
        raise HTTPException(status_code=403, detail="Доступ лише для співробітників")
    return user_data


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str


class AnswerCreate(BaseModel):
    problem_id: int
    message: str
    is_private: Optional[bool] = False


class ServiceCompleteCreate(BaseModel):
    problem_id: int
    work_done: str
    parts_used: Optional[str] = None


class DeclineRequest(BaseModel):
    comment: Optional[str] = None


class AssignRequest(BaseModel):
    master_id: int


class UpdateNotesRequest(BaseModel):
    notes: str


class CompletionRequest(BaseModel):
    work_done: str
    parts_used: Optional[str] = None


class RejectCompletionRequest(BaseModel):
    comment: str


class ChangeUsernameRequest(BaseModel):
    new_username: str


class ProposePriceRequest(BaseModel):
    proposed_price: int


class NegotiatePriceRequest(BaseModel):
    counter_price: int
    comment: str


class MasterRequestCreate(BaseModel):
    request_type: str  # "close" or "end"
    comment: str
    work_done: Optional[str] = None
    parts_used: Optional[str] = None


class ManagerAcceptMasterRequest(BaseModel):
    formal_comment: str
    work_done: Optional[str] = None
    parts_used: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


@app.get("/")
async def home():
    return {"message": "Вітаємо на нашому сайті!)"}


@app.post("/register", dependencies=[Depends(limit_strict)], status_code=201)
async def register(
    data: RegisterRequest,
    session: AsyncSession = Depends(get_session),
):
    clean_username = sanitize_html(data.username)
    clean_email = sanitize_html(data.email)
    
    existing = await session.execute(
        select(User).filter(User.username == clean_username)
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=400, detail="Користувач з таким username вже існує"
        )

    new_user = User(
        username=clean_username,
        email=clean_email,
        is_admin=True if clean_username == "admin" else False,
        role="admin" if clean_username == "admin" else "client",
    )
    new_user.set_password(raw_password=data.password)
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    tg_code = generate_code()
    session.add(UsersInTelegram(tg_code=tg_code, user_in_site=new_user.id))
    await session.commit()

    return {
        "message": "Ви успішно створили акаунт!",
        "tg_code": tg_code,
        "tg_bot_url": "https://t.me/techfixnotify_bot",
    }


@app.post("/login", dependencies=[Depends(limit_strict)])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(User).filter(User.username == form_data.username)
    )
    user = result.scalars().first()

    if not user or not bcrypt.checkpw(
        form_data.password.encode(), user.password.encode()
    ):
        raise HTTPException(status_code=401, detail="Пароль або логін невірний")

    token = jwt.encode(
        {
            "user_id": user.id,
            "role": user.role,
            "exp": datetime.utcnow() + timedelta(hours=72),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = JSONResponse(content={"message": "Успішний вхід"})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=60 * 60 * 72,
        samesite="lax",
    )
    return response


@app.post("/logout")
def logout():
    response = JSONResponse(content={"message": "Ви вийшли з системи"})
    response.delete_cookie("access_token")
    return response


@app.get("/me")
async def get_me(
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_id, role = current_user
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
    return {"id": user.id, "username": user.username, "email": user.email, "role": role}


@app.post("/user/change-username")
async def change_username(
    data: ChangeUsernameRequest,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_id, _ = current_user
    clean_username = sanitize_html(data.new_username)
    
    # Check if new username is already taken
    existing = await session.execute(
        select(User).filter(User.username == clean_username, User.id != user_id)
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=400, detail="Користувач з таким ніком вже існує"
        )
        
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
        
    user.username = clean_username
    session.add(user)
    await session.commit()
    return {"message": "Нік успішно змінено", "username": user.username}



@app.get("/user/telegram")
async def get_telegram_status(
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_id, _ = current_user
    result = await session.execute(
        select(UsersInTelegram).filter_by(user_in_site=user_id)
    )
    tg_info = result.scalars().one_or_none()
    
    if not tg_info:
        # If for some reason there's no record, create one
        tg_code = generate_code()
        tg_info = UsersInTelegram(tg_code=tg_code, user_in_site=user_id)
        session.add(tg_info)
        await session.commit()
        await session.refresh(tg_info)
        
    return {
        "is_linked": tg_info.user_tg_id is not None and tg_info.user_tg_id != "",
        "tg_code": tg_info.tg_code,
        "user_tg_id": tg_info.user_tg_id,
        "tg_bot_url": f"https://t.me/techfixnotify_bot?start={tg_info.tg_code}"
    }


@app.post("/user/telegram/unlink")
async def unlink_telegram(
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_id, _ = current_user
    result = await session.execute(
        select(UsersInTelegram).filter_by(user_in_site=user_id)
    )
    tg_info = result.scalars().one_or_none()
    
    if not tg_info:
        raise HTTPException(status_code=404, detail="Запис Telegram не знайдено")
        
    # Send notification before setting user_tg_id to None
    if tg_info.user_tg_id:
        try:
            await send_msg(
                user_id,
                "⚠️ Ваш Telegram-акаунт був від'єднаний від сайту.\n"
                "Ви більше не отримуватимете автоматичних сповіщень про зміну статусу заявок."
            )
        except Exception as e:
            print(f"Error sending unlink notification: {e}")
            
    tg_info.user_tg_id = None
    tg_info.tg_code = generate_code() # Generate a new code for next binding
    session.add(tg_info)
    await session.commit()
    
    return {"message": "Telegram успішно від'єднано", "tg_code": tg_info.tg_code}


# ---------------------------------------------------------------------------
# Problems
# ---------------------------------------------------------------------------


@app.post("/problems", dependencies=[Depends(limit_strict)], status_code=201)
async def add_problem(
    title: str = Form(...),
    description: str = Form(...),
    img: UploadFile = File(None),
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a problem report. Send as multipart/form-data (image is optional)."""
    # 1. Validate file size & type
    await validate_uploaded_file(img, is_invoice=False)
    
    # 2. Sanitize inputs
    clean_title = sanitize_html(title)
    clean_description = sanitize_html(description)

    img_path = None
    if img and img.filename:
        import os
        os.makedirs("static/user_problem_image", exist_ok=True)
        file_location = f"user_problem_image/{img.filename}"
        with open("static/" + file_location, "wb+") as f:
            f.write(await img.read())
        img_path = file_location

    problem = Problem(
        title=clean_title,
        description=clean_description,
        user_id=current_user[0],
        image_url=img_path,
    )
    session.add(problem)
    await session.commit()
    await session.refresh(problem)

    # Notify managers and admins about the new ticket
    try:
        client_user = await session.get(User, current_user[0])
        client_name = client_user.username if client_user else "Клієнт"
        
        managers_result = await session.execute(
            select(User).filter(User.role.in_(["manager", "admin"]))
        )
        managers = managers_result.scalars().all()
        for mgr in managers:
            await send_msg(
                mgr.id,
                f"🔔 Створено нову заявку #{problem.id} ({problem.title})!\n"
                f"Клієнт: {client_name}\n"
                f"Опис: {problem.description}"
            )
    except Exception as e:
        print(f"Error notifying managers on new ticket: {e}")

    return {
        "id": problem.id,
        "title": problem.title,
        "status": problem.status,
        "image_url": problem.image_url,
    }



@app.get("/admin/masters")
async def list_masters(
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager/Admin: get list of all masters for manual assignment."""
    user_id, role = manager_data
    if role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Доступ лише для менеджерів та адміністраторів")
    result = await session.execute(select(User).filter_by(role="master"))
    masters = result.scalars().all()
    return [{"id": m.id, "username": m.username, "email": m.email} for m in masters]


@app.get("/problems/new")
async def new_problems(
    session: AsyncSession = Depends(get_session),
    staff: tuple = Depends(staff_required),
):
    """
    If manager/admin: return all problems pending review (status = 'На розгляді').
    If master: return all accepted unassigned problems (status = 'Прийнято', admin_id = None).
    """
    user_id, role = staff
    if role in ["admin", "manager"]:
        result = await session.execute(
            select(Problem).filter_by(status="На розгляді").order_by(Problem.id.desc())
        )
    else:  # master
        result = await session.execute(
            select(Problem).filter_by(status="Прийнято", admin_id=None).order_by(Problem.id.desc())
        )
    
    problems = result.scalars().all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "date_created": p.date_created,
            "status": p.status,
        }
        for p in problems
    ]


@app.get("/problems/my")
async def my_problems(
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Current client's problems."""
    result = await session.execute(select(Problem).filter_by(user_id=current_user[0]).order_by(Problem.id.desc()))
    problems_list = []
    for p in result.scalars().all():
        assignee_name = None
        if p.admin_id is not None:
            assignee = await session.get(User, p.admin_id)
            if assignee:
                assignee_name = assignee.username
        problems_list.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "status": p.status,
            "date_created": p.date_created,
            "image_url": p.image_url,
            "assignee_name": assignee_name,
            "proposed_price": p.proposed_price,
            "price_status": p.price_status,
        })
    return problems_list


@app.get("/problems/admin")
async def admin_problems(
    staff: tuple = Depends(staff_required),
    session: AsyncSession = Depends(get_session),
):
    """Staff: returns all problems if admin/manager; returns only assigned/taken if master."""
    user_id, role = staff
    if role in ["admin", "manager"]:
        result = await session.execute(select(Problem).order_by(Problem.id.desc()))
    else:  # master
        result = await session.execute(
            select(Problem).filter_by(admin_id=user_id).order_by(Problem.id.desc())
        )
        
    problems_list = []
    for p in result.scalars().all():
        assignee_name = None
        if p.admin_id:
            assignee = await session.get(User, p.admin_id)
            if assignee:
                assignee_name = assignee.username
        problems_list.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "status": p.status,
            "date_created": p.date_created,
            "assignee_name": assignee_name,
            "proposed_price": p.proposed_price,
            "price_status": p.price_status,
        })
    return problems_list


@app.get("/problems/{problem_id}")
async def get_problem(
    problem_id: int,
    staff: tuple = Depends(staff_required),
    session: AsyncSession = Depends(get_session),
):
    """Staff: full details of a single problem."""
    user_id, role = staff
    result = await session.execute(select(Problem).filter_by(id=problem_id))
    problem = result.scalars().first()
    if not problem:
        raise HTTPException(status_code=404, detail="Проблему не знайдено")
        
    # Enforce master isolation:
    # Master can only see their own tickets, or unassigned 'Прийнято' tickets to take them.
    if role == "master":
        if problem.admin_id != user_id and not (problem.status == "Прийнято" and problem.admin_id is None):
            raise HTTPException(
                status_code=403, detail="Ви не маєте доступу до цієї заявки"
            )
        
    return {
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "status": problem.status,
        "date_created": problem.date_created,
        "image_url": problem.image_url,
        "user_id": problem.user_id,
        "admin_id": problem.admin_id,
        "notes": problem.notes,
        "completion_work_done": problem.completion_work_done,
        "completion_parts_used": problem.completion_parts_used,
        "proposed_price": problem.proposed_price,
        "price_status": problem.price_status,
        "master_request_type": problem.master_request_type,
        "master_request_comment": problem.master_request_comment,
        "master_request_status": problem.master_request_status,
        "payment_requisites": problem.payment_requisites,
        "payment_invoice_url": problem.payment_invoice_url,
        "payment_client_marked": problem.payment_client_marked,
    }


@app.post("/problems/{problem_id}/approve")
async def approve_problem(
    problem_id: int,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Approve new problem (status = 'Прийнято')."""
    user_id, role = manager_data
    if role != "manager":
        raise HTTPException(status_code=403, detail="Лише менеджери можуть приймати нові заявки")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    problem.status = "Прийнято"
    session.add(problem)
    await session.commit()
    
    # Notify admin about worker action
    manager_user = await session.get(User, user_id)
    manager_name = manager_user.username if manager_user else "Менеджер"
    await notify_only_admins(
        session,
        f"📋 Менеджер {manager_name} прийняв заявку #{problem.id} ({problem.title}).\n"
        f"Статус змінено на 'Прийнято'."
    )
    
    await send_msg(
        problem.user_id,
        f"📋 Ваш запит #{problem.id} ({problem.title}) успішно прийнято менеджером!\n"
        f"Статус змінено на 'Прийнято'. Невдовзі буде призначено майстра."
    )
    
    # Notify all masters about new available request
    try:
        masters_result = await session.execute(select(User).filter_by(role="master"))
        masters = masters_result.scalars().all()
        for m in masters:
            await send_msg(
                m.id,
                f"🔔 З'явилась нова заявка #{problem.id} ({problem.title}), яку ви можете взяти в роботу!\n"
                f"Опис: {problem.description}"
            )
    except Exception as e:
        print(f"Error notifying masters on request approve: {e}")
        
    return {"message": "Заявку успішно прийнято", "id": problem.id, "status": "Прийнято"}


@app.post("/problems/{problem_id}/decline")
async def decline_problem(
    problem_id: int,
    data: DeclineRequest,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Decline new problem (status = 'Відхилено')."""
    user_id, role = manager_data
    if role != "manager":
        raise HTTPException(status_code=403, detail="Лише менеджери можуть відхиляти нові заявки")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    problem.status = "Відхилено"
    session.add(problem)
    
    clean_comment = sanitize_html(data.comment) if data.comment else None
    
    if clean_comment:
        session.add(
            AdminResponse(
                message=f"❌ Ремонт скасовується: {clean_comment}",
                admin_id=user_id,
                problem_id=problem_id,
            )
        )
    await session.commit()
    
    # Notify admin about worker action
    manager_user = await session.get(User, user_id)
    manager_name = manager_user.username if manager_user else "Менеджер"
    comment_str = f" Коментар: {data.comment}" if data.comment else ""
    await notify_only_admins(
        session,
        f"❌ Менеджер {manager_name} відхилив заявку #{problem.id} ({problem.title}).\n"
        f"Статус змінено на 'Відхилено'.{comment_str}"
    )
    
    await send_msg(
        problem.user_id,
        f"❌ Ваш запит #{problem.id} ({problem.title}) відхилено менеджером.\n"
        + (f"Коментар: {data.comment}" if data.comment else "")
    )
    return {"message": "Заявку відхилено", "id": problem.id, "status": "Відхилено"}


@app.post("/problems/{problem_id}/assign")
async def assign_master(
    problem_id: int,
    data: AssignRequest,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Assign master to accepted problem."""
    user_id, role = manager_data
    if role != "manager":
        raise HTTPException(status_code=403, detail="Лише менеджери можуть призначати майстрів")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    master = await session.get(User, data.master_id)
    if not master or master.role != "master":
        raise HTTPException(status_code=400, detail="Вказаний користувач не є майстром")
        
    problem.status = "Приймання ціни"
    problem.admin_id = data.master_id
    session.add(problem)
    await session.commit()
    
    # Notify admin about worker action
    manager_user = await session.get(User, user_id)
    manager_name = manager_user.username if manager_user else "Менеджер"
    await notify_only_admins(
        session,
        f"🔧 Менеджер {manager_name} призначив майстра {master.username} на заявку #{problem.id} ({problem.title}).\n"
        f"Статус змінено на 'Приймання ціни'."
    )
    
    await send_msg(
        problem.user_id,
        f"🔧 Для вашого запиту #{problem.id} ({problem.title}) призначено майстра: {master.username}.\n"
        f"Статус змінено на 'Приймання ціни'. Наразі обговорюється вартість ремонту."
    )
    await send_msg(
        data.master_id,
        f"🔔 Вам призначено нову заявку: #{problem.id} ({problem.title})! Потрібно узгодити вартість."
    )
    return {"message": "Майстра успішно призначено", "id": problem.id, "status": "Приймання ціни", "admin_id": data.master_id}


@app.post("/problems/{problem_id}/take")
async def take_problem(
    problem_id: int,
    staff: tuple = Depends(staff_required),
    session: AsyncSession = Depends(get_session),
):
    """Master: self-select and take accepted problem."""
    user_id, role = staff
    if role != "master":
        raise HTTPException(status_code=403, detail="Лише майстри можуть брати заявки в роботу")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Проблему не знайдено")
        
    if problem.status != "Прийнято" or problem.admin_id is not None:
        raise HTTPException(status_code=400, detail="Цю заявку не можна взяти в роботу")
        
    problem.status = "Приймання ціни"
    problem.admin_id = user_id
    session.add(problem)
    await session.commit()
    await session.refresh(problem)
    
    master_user = await session.get(User, user_id)
    master_name = master_user.username if master_user else "Майстер"
    
    # Notify managers about master taking the ticket
    await notify_only_managers(
        session,
        f"🔧 Майстер {master_name} взяв в обробку заявку #{problem.id} ({problem.title})!\n"
        f"Статус змінено на 'Приймання ціни'."
    )
    
    # Notify admin about worker action
    await notify_only_admins(
        session,
        f"🔧 Майстер {master_name} взяв в обробку заявку #{problem.id} ({problem.title}).\n"
        f"Статус змінено на 'Приймання ціни'."
    )
    
    await send_msg(
        problem.user_id,
        f"🔧 Майстер {master_name} взяв ваш запит #{problem.id} ({problem.title}) в роботу!\n"
        f"Статус змінено на 'Приймання ціни'. Наразі обговорюється вартість ремонту."
    )
    return {"id": problem.id, "status": problem.status, "admin_id": problem.admin_id}


@app.post("/problems/{problem_id}/notes")
async def update_notes(
    problem_id: int,
    data: UpdateNotesRequest,
    master_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Master: update private notes on problem."""
    user_id, role = master_data
    if role != "master":
        raise HTTPException(status_code=403, detail="Тільки майстер може оновлювати нотатки")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.admin_id != user_id:
        raise HTTPException(status_code=403, detail="Ви не є призначеним майстром для цієї заявки")
        
    clean_notes = sanitize_html(data.notes)
    problem.notes = clean_notes
    session.add(problem)
    await session.commit()
    return {"message": "Нотатки збережено", "notes": problem.notes}


@app.post("/problems/{problem_id}/completion-request")
async def completion_request(
    problem_id: int,
    data: CompletionRequest,
    master_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Master: request manager approval for repair completion."""
    user_id, role = master_data
    if role != "master":
        raise HTTPException(status_code=403, detail="Тільки майстер може надсилати звіт про ремонт")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.admin_id != user_id:
        raise HTTPException(status_code=403, detail="Ви не є призначеним майстром для цієї заявки")
        
    clean_work_done = sanitize_html(data.work_done)
    clean_parts_used = sanitize_html(data.parts_used) if data.parts_used else None
        
    problem.status = "Прийняття оплати"
    problem.completion_work_done = clean_work_done
    problem.completion_parts_used = clean_parts_used
    session.add(problem)
    await session.commit()
    
    # Notify admin about worker action
    master_user = await session.get(User, user_id)
    master_name = master_user.username if master_user else "Майстер"
    await notify_only_admins(
        session,
        f"🛠️ Майстер {master_name} виконав ремонт по заявці #{problem.id} ({problem.title}) та надіслав звіт.\n"
        f"Статус змінено на 'Прийняття оплати'."
    )
    
    await send_msg(
        problem.user_id,
        f"🛠️ Майстер виконав ремонт вашої техніки за запитом #{problem.id} ({problem.title})!\n"
        f"Заявка перейшла на етап оплати. Будь ласка, здійсніть оплату за реквізитами на сайті."
    )
    
    if problem.admin_id:
        await send_msg(
            problem.admin_id,
            f"📨 Заявка #{problem.id} ({problem.title}) перейшла до статусу 'Прийняття оплати' (звіт про ремонт надіслано клієнту)."
        )
        
    return {"message": "Звіт про ремонт надіслано, заявка очікує оплати", "status": "Прийняття оплати"}


@app.post("/problems/{problem_id}/completion-approve")
async def completion_approve(
    problem_id: int,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Approve repair completion. Generate warranty record."""
    user_id, role = manager_data
    if role != "manager":
        raise HTTPException(status_code=403, detail="Лише менеджери можуть приймати завершення ремонту")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.status not in ("Очікує завершення", "Прийняття оплати"):
        raise HTTPException(status_code=400, detail="Заявка не перебуває на етапі перевірки або оплати")
        
    today = date.today()
    warranty_info = (
        f"ГАРАНТІЙНИЙ ТАЛОН #{problem.id}\n"
        f"Послуга: сервісне обслуговування комп'ютерної техніки\n"
        f"Дата прийому: {problem.date_created.date()}\n"
        f"Дата видачі: {today}\n"
        f"Гарантійний термін: 6 місяців з дати видачі\n"
        f"Дата завершення гарантії: {today + timedelta(days=180)}"
    )
    
    record = ServiceRecord(
        work_done=problem.completion_work_done or "Ремонтні роботи завершені",
        parts_used=problem.completion_parts_used,
        warranty_info=warranty_info,
        problem_id=problem_id,
    )
    session.add(record)
    
    problem.status = "Завершено"
    session.add(problem)
    await session.commit()
    
    # Notify admin about worker action
    manager_user = await session.get(User, user_id)
    manager_name = manager_user.username if manager_user else "Менеджер"
    await notify_only_admins(
        session,
        f"🎉 Менеджер {manager_name} підтвердив завершення ремонту по заявці #{problem.id} ({problem.title}).\n"
        f"Статус змінено на 'Завершено'."
    )
    
    await send_msg(
        problem.user_id,
        f"🎉 Чудові новини! Менеджер підтвердив завершення ремонту вашої техніки за запитом #{problem.id} ({problem.title})!\n"
        f"Гарантійний талон згенеровано. Все працює чудово! Дякуємо, що обрали нас!"
    )
    return {"message": "Ремонт прийнято, гарантійний талон згенеровано", "status": "Завершено"}


@app.post("/problems/{problem_id}/completion-reject")
async def completion_reject(
    problem_id: int,
    data: RejectCompletionRequest,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Reject repair completion is completely disabled by user request."""
    raise HTTPException(
        status_code=403,
        detail="Повернення ремонту на доопрацювання повністю заблоковано в системі"
    )


@app.get("/problems/{problem_id}/answer")
async def get_problem_answers(
    problem_id: int,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_id, role = current_user
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
    
    # Permission check:
    if role == "client" and problem.user_id != user_id:
        raise HTTPException(status_code=403, detail="Ви не маєте доступу до цієї заявки")
    elif role == "master":
        if problem.admin_id != user_id and not (problem.status == "Прийнято" and problem.admin_id is None):
            raise HTTPException(status_code=403, detail="Ви не маєте доступу до цієї заявки")
    
    # Fetch answers (comments)
    if role == "client":
        result = await session.execute(
            select(AdminResponse).filter_by(problem_id=problem_id, is_private=False).order_by(AdminResponse.date_responded.asc())
        )
    else:
        result = await session.execute(
            select(AdminResponse).filter_by(problem_id=problem_id).order_by(AdminResponse.date_responded.asc())
        )
    responses = result.scalars().all()
    
    answers_list = []
    for r in responses:
        admin_user = await session.get(User, r.admin_id)
        answers_list.append({
            "id": r.id,
            "message": r.message,
            "date_responded": r.date_responded,
            "is_read": r.is_read,
            "is_private": r.is_private,
            "admin_name": admin_user.username if admin_user else "Співробітник",
            "admin_role": admin_user.role if admin_user else "client",
        })
        
    assignee_name = None
    if problem.admin_id:
        assignee = await session.get(User, problem.admin_id)
        if assignee:
            assignee_name = assignee.username
            
    return {
        "problem": {
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "status": problem.status,
            "date_created": problem.date_created,
            "image_url": problem.image_url,
            "assignee_name": assignee_name,
            "proposed_price": problem.proposed_price,
            "price_status": problem.price_status,
            "completion_work_done": problem.completion_work_done,
            "completion_parts_used": problem.completion_parts_used,
            "payment_requisites": problem.payment_requisites,
            "payment_invoice_url": problem.payment_invoice_url,
            "payment_client_marked": problem.payment_client_marked,
        },
        "answers": answers_list
    }


@app.post("/problems/{problem_id}/read")
async def read_problem_answers(
    problem_id: int,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_id, role = current_user
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    # Permission checks:
    if role == "client" and problem.user_id != user_id:
        raise HTTPException(status_code=403, detail="Ви не маєте доступу до цієї заявки")
    elif role == "master":
        if problem.admin_id != user_id and not (problem.status == "Прийнято" and problem.admin_id is None):
            raise HTTPException(status_code=403, detail="Ви не маєте доступу до цієї заявки")
        
    # Query unread messages for this problem
    stmt = (
        select(AdminResponse)
        .filter(
            AdminResponse.problem_id == problem_id,
            AdminResponse.is_read == False
        )
    )
    result = await session.execute(stmt)
    unread_messages = result.scalars().all()
    
    marked_any = False
    for msg in unread_messages:
        sender = await session.get(User, msg.admin_id)
        if not sender:
            continue
            
        should_mark = False
        if role == "client":
            # Client reads messages from master, manager, admin which are public (is_private=False)
            if not msg.is_private and sender.role != "client":
                should_mark = True
        elif role == "master":
            # Master reads:
            # - public messages written by clients (is_private=False)
            # - private messages written by manager/admin (is_private=True)
            if not msg.is_private and sender.role == "client":
                should_mark = True
            elif msg.is_private and sender.role in ["manager", "admin"]:
                should_mark = True
        elif role in ["manager", "admin"]:
            # Manager/admin reads:
            # - private messages written by master (is_private=True)
            # - public messages written by client ONLY IF there is no master assigned to the problem
            if msg.is_private and sender.role == "master":
                should_mark = True
            elif not msg.is_private and sender.role == "client" and problem.admin_id is None:
                should_mark = True
                
        if should_mark:
            msg.is_read = True
            session.add(msg)
            marked_any = True
            
    if marked_any:
        await session.commit()
        
    return {"message": "Повідомлення прочитано"}


@app.post("/answers")
async def add_answer(
    data: AnswerCreate,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_id, role = current_user
    problem = await session.get(Problem, data.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    # Permission checks:
    if role == "client":
        if problem.user_id != user_id:
            raise HTTPException(status_code=403, detail="Ви можете коментувати лише свої заявки")
    elif role == "master":
        if problem.admin_id != user_id and not (problem.status == "Прийнято" and problem.admin_id is None):
            raise HTTPException(status_code=403, detail="Ви не маєте доступу до цієї заявки")
    elif role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Доступ заборонено")

    # Block commenting if status is completed or declined
    if problem.status in ["Завершено", "Відхилено"]:
        raise HTTPException(
            status_code=400,
            detail="Додавання коментарів заблоковано для завершених або відхилених заявок"
        )
        
    clean_message = sanitize_html(data.message)
        
    is_private_val = data.is_private if role != "client" else False

    response = AdminResponse(
        message=clean_message,
        admin_id=user_id,
        problem_id=data.problem_id,
        is_private=is_private_val,
    )
    session.add(response)
    await session.commit()
    
    # Notify appropriate users on Telegram
    # 1. Notify client if message was posted by staff and is public
    if role != "client" and not is_private_val:
        keyboard = get_read_keyboard(problem.id)
        await send_msg(
            problem.user_id,
            f"💬 Новий коментар до вашого запиту #{problem.id} ({problem.title}):\n{clean_message}",
            reply_markup=keyboard
        )

    # 2. Notify assigned master if comment was posted by client or manager/admin
    if problem.admin_id and problem.admin_id != user_id:
        if role == "client":
            await send_msg(
                problem.admin_id,
                f"💬 Клієнт залишив коментар до запиту #{problem.id} ({problem.title}):\n{clean_message}"
            )
        elif role in ["manager", "admin"]:
            chat_type_str = "🔒 [Внутрішній чат] Менеджер" if is_private_val else "💬 [Публічний чат] Менеджер"
            await send_msg(
                problem.admin_id,
                f"{chat_type_str} залишив коментар до запиту #{problem.id} ({problem.title}):\n{clean_message}"
            )

    # 3. Notify ALL managers on Telegram for ANY comment whatsoever is disabled by user request
    # (they only need notifications about status changes of requests, not chat messages)
    pass
        
    return {"message": "Коментар успішно додано"}


# ── New State Machine & Workflow Endpoints ────────────────

@app.post("/problems/{problem_id}/propose-price")
async def propose_price(
    problem_id: int,
    data: ProposePriceRequest,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Propose price to client."""
    user_id, role = manager_data
    if role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Лише менеджери та адміністратори можуть пропонувати вартість")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.status != "Приймання ціни":
        raise HTTPException(status_code=400, detail="Заявка не перебуває на етапі приймання ціни")
        
    problem.proposed_price = data.proposed_price
    problem.price_status = "proposed"
    session.add(problem)
    await session.commit()
    
    await send_msg(
        problem.user_id,
        f"💰 Менеджер запропонував вартість ремонту для вашого запиту #{problem.id} ({problem.title}): {data.proposed_price} грн.\n"
        f"Будь ласка, підтвердіть або відхиліть пропозицію на сайті."
    )
    return {"message": "Ціну успішно запропоновано", "proposed_price": data.proposed_price, "price_status": "proposed"}


@app.post("/problems/{problem_id}/cancel-price")
async def cancel_price(
    problem_id: int,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Cancel/Withdraw proposed price."""
    user_id, role = manager_data
    if role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Лише менеджери та адміністратори можуть скасовувати пропозицію вартості")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.status != "Приймання ціни":
        raise HTTPException(status_code=400, detail="Заявка не перебуває на етапі приймання ціни")
        
    if problem.price_status not in ("proposed", "negotiating"):
        raise HTTPException(status_code=400, detail="Немає активної пропозиції вартості для скасування")
        
    problem.proposed_price = None
    problem.price_status = None
    session.add(problem)
    await session.commit()
    
    await send_msg(
        problem.user_id,
        f"💰 Менеджер скасував раніше запропоновану вартість ремонту за запитом #{problem.id} ({problem.title}).\n"
        f"Очікуйте на нову пропозицію або зв'яжіться з сервісом."
    )
    return {"message": "Пропозицію вартості успішно скасовано", "proposed_price": None, "price_status": None}


@app.post("/problems/{problem_id}/accept-negotiation")
async def accept_negotiation(
    problem_id: int,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Accept client's counter/bargain price offer and move to 'У роботі'."""
    user_id, role = manager_data
    if role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Лише менеджери та адміністратори можуть приймати пропозицію торгу")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.status != "Приймання ціни":
        raise HTTPException(status_code=400, detail="Заявка не перебуває на етапі приймання ціни")
        
    if problem.price_status != "negotiating":
        raise HTTPException(status_code=400, detail="Немає активної пропозиції торгу від клієнта для прийняття")
        
    problem.price_status = "accepted"
    problem.status = "У роботі"
    session.add(problem)
    
    # Save acceptance message as comment in the chat
    comment_text = f"🤝 <strong>Менеджер прийняв пропозицію торгу:</strong> узгоджено ціну {problem.proposed_price} грн.<br/>Статус змінено на 'У роботі'."
    session.add(
        AdminResponse(
            message=comment_text,
            admin_id=user_id,
            problem_id=problem_id,
        )
    )
    await session.commit()
    
    # Notify admin about worker action
    manager_user = await session.get(User, user_id)
    manager_name = manager_user.username if manager_user else "Менеджер"
    await notify_only_admins(
        session,
        f"🤝 Менеджер {manager_name} прийняв пропозицію торгу клієнта по заявці #{problem.id} ({problem.title}).\n"
        f"Статус змінено на 'У роботі', ціну узгоджено: {problem.proposed_price} грн."
    )
    
    # Notify Client
    await send_msg(
        problem.user_id,
        f"✅ Менеджер прийняв вашу пропозицію торгу {problem.proposed_price} грн для запиту #{problem.id} ({problem.title})!\n"
        f"Статус змінено на 'У роботі', ремонт розпочато."
    )
    
    # Notify Master if any
    if problem.admin_id:
        await send_msg(
            problem.admin_id,
            f"✅ Менеджер прийняв пропозицію торгу {problem.proposed_price} грн для запиту #{problem.id} ({problem.title}).\n"
            f"Статус змінено на 'У роботі', можете розпочати ремонт."
        )
        
    return {"message": "Пропозицію торгу прийнято", "status": "У роботі", "price_status": "accepted"}



@app.post("/problems/{problem_id}/accept-price")
async def accept_price(
    problem_id: int,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Client: Accept proposed price and start work."""
    user_id, role = current_user
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if role != "client" or problem.user_id != user_id:
        raise HTTPException(status_code=403, detail="Тільки клієнт-власник заявки може приймати ціну")
        
    if problem.status != "Приймання ціни" or problem.price_status != "proposed":
        raise HTTPException(status_code=400, detail="Немає запропонованої ціни для підтвердження")
        
    problem.price_status = "accepted"
    problem.status = "У роботі"
    session.add(problem)
    await session.commit()
    
    # Notify managers/admins
    await notify_managers_and_admins(
        session,
        f"🤝 Клієнт прийняв запропоновану ціну {problem.proposed_price} грн для запиту #{problem.id} ({problem.title})!\n"
        f"Статус змінено на 'У роботі'."
    )
    
    # Notify Master
    if problem.admin_id:
        await send_msg(
            problem.admin_id,
            f"✅ Клієнт прийняв запропоновану ціну {problem.proposed_price} грн для запиту #{problem.id} ({problem.title})!\n"
            f"Статус змінено на 'У роботі'. Ви можете приступати до виконання ремонту."
        )
    return {"message": "Ціну прийнято, статус змінено на 'У роботі'", "status": "У роботі", "price_status": "accepted"}


@app.post("/problems/{problem_id}/decline-price")
async def decline_price(
    problem_id: int,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Client: Decline proposed price and decline request."""
    user_id, role = current_user
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if role != "client" or problem.user_id != user_id:
        raise HTTPException(status_code=403, detail="Тільки клієнт-власник заявки може відхиляти ціну")
        
    if problem.status != "Приймання ціни" or problem.price_status != "proposed":
        raise HTTPException(status_code=400, detail="Немає запропонованої ціни для відхилення")
        
    problem.price_status = "declined"
    problem.status = "Відхилено"
    session.add(problem)
    await session.commit()
    
    # Notify managers/admins
    await notify_managers_and_admins(
        session,
        f"❌ Клієнт відхилив запропоновану ціну {problem.proposed_price} грн для запиту #{problem.id} ({problem.title}).\n"
        f"Заявку відхилено."
    )
    
    # Notify Master
    if problem.admin_id:
        await send_msg(
            problem.admin_id,
            f"❌ Клієнт відхилив запропоновану ціну {problem.proposed_price} грн для запиту #{problem.id} ({problem.title}).\n"
            f"Заявку відхилено."
        )
    return {"message": "Ціну відхилено, заявку відхилено", "status": "Відхилено", "price_status": "declined"}


@app.post("/problems/{problem_id}/negotiate-price")
async def negotiate_price(
    problem_id: int,
    data: NegotiatePriceRequest,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Client: Propose counter price to bargain / negotiate."""
    user_id, role = current_user
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if role != "client" or problem.user_id != user_id:
        raise HTTPException(status_code=403, detail="Тільки клієнт-власник заявки може пропонувати торг")
        
    if problem.status != "Приймання ціни" or problem.price_status != "proposed":
        raise HTTPException(status_code=400, detail="Немає активної пропозиції ціни для торгу")
        
    clean_comment = sanitize_html(data.comment)
    
    # Update proposed price to the counter price and price_status to negotiating
    problem.proposed_price = data.counter_price
    problem.price_status = "negotiating"
    session.add(problem)
    
    # Save bargaining offer as a comment in the chat
    comment_text = f"🤝 <strong>Пропозиція торгу від клієнта:</strong> {data.counter_price} грн.<br/><strong>Коментар:</strong> {clean_comment}"
    session.add(
        AdminResponse(
            message=comment_text,
            admin_id=user_id,
            problem_id=problem_id,
        )
    )
    await session.commit()
    
    # Notify managers
    await notify_only_managers(
        session,
        f"🤝 Клієнт запропонував зустрічну ціну {data.counter_price} грн для запиту #{problem.id} ({problem.title}).\n"
        f"Коментар: {clean_comment}"
    )
    
    # Notify Master
    if problem.admin_id:
        await send_msg(
            problem.admin_id,
            f"🤝 Клієнт запропонував зустрічну ціну {data.counter_price} грн для запиту #{problem.id} ({problem.title}).\n"
            f"Коментар: {clean_comment}"
        )
        
    return {"message": "Пропозицію торгу успішно надіслано", "proposed_price": data.counter_price, "price_status": "negotiating"}


@app.post("/problems/{problem_id}/master-request")
async def master_request(
    problem_id: int,
    data: MasterRequestCreate,
    master_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Master: request manager to close or end/complete repair with a private comment."""
    user_id, role = master_data
    if role != "master":
        raise HTTPException(status_code=403, detail="Тільки майстер може надсилати такий запит")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.admin_id != user_id:
        raise HTTPException(status_code=403, detail="Ви не є призначеним майстром для цієї заявки")
        
    if problem.status != "У роботі":
        raise HTTPException(status_code=400, detail="Запит можна подати только у статусі 'У роботі'")
        
    if data.request_type not in ["close", "end"]:
        raise HTTPException(status_code=400, detail="Неправильний тип запиту")
        
    clean_comment = sanitize_html(data.comment)
    clean_work_done = sanitize_html(data.work_done) if data.work_done is not None else None
    clean_parts_used = sanitize_html(data.parts_used) if data.parts_used is not None else None
        
    problem.master_request_type = data.request_type
    problem.master_request_comment = clean_comment
    problem.master_request_status = "pending"
    
    if data.request_type == "end":
        problem.completion_work_done = clean_work_done
        problem.completion_parts_used = clean_parts_used
        
    session.add(problem)
    await session.commit()
    
    req_type_ukr = "завершення ремонту" if data.request_type == "end" else "неможливість ремонту (скасування)"
    await notify_only_managers(
        session,
        f"🔔 Майстер надіслав запит на {req_type_ukr} по заявці #{problem.id} ({problem.title}).\n"
        f"Коментар: {clean_comment}"
    )
    
    return {"message": "Запит успішно надіслано менеджеру", "master_request_type": data.request_type, "master_request_status": "pending"}


@app.post("/problems/{problem_id}/master-request/cancel")
async def cancel_master_request(
    problem_id: int,
    master_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Master: cancel/withdraw their own pending request."""
    user_id, role = master_data
    if role != "master":
        raise HTTPException(status_code=403, detail="Тільки майстер може скасувати запит")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.admin_id != user_id:
        raise HTTPException(status_code=403, detail="Ви не є призначеним майстром для цієї заявки")
        
    if problem.master_request_status != "pending":
        raise HTTPException(status_code=400, detail="Немає активного запиту для скасування")
        
    problem.master_request_type = None
    problem.master_request_comment = None
    problem.master_request_status = None
    session.add(problem)
    await session.commit()
    return {"message": "Запит успішно скасовано"}


@app.post("/problems/{problem_id}/master-request/accept")
async def accept_master_request(
    problem_id: int,
    data: ManagerAcceptMasterRequest,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Accept master's request to close or end the repair, writing a formal comment."""
    user_id, role = manager_data
    if role != "manager":
        raise HTTPException(status_code=403, detail="Тільки менеджер може приймати запити")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.master_request_status != "pending":
        raise HTTPException(status_code=400, detail="Немає активного запиту від майстра")
        
    req_type = problem.master_request_type
    problem.master_request_status = "accepted"
    
    prefix = ""
    if req_type == "end":
        prefix = "📝 Коментар до закінчення ремонту: "
    elif req_type == "close":
        prefix = "❌ Ремонт скасовується: "

    clean_formal_comment = sanitize_html(data.formal_comment)
    clean_work_done = sanitize_html(data.work_done) if data.work_done is not None else None
    clean_parts_used = sanitize_html(data.parts_used) if data.parts_used is not None else None

    # Write a formal comment as AdminResponse (this is visible to everyone, including client!)
    formal_response = AdminResponse(
        message=f"{prefix}{clean_formal_comment}",
        admin_id=user_id,
        problem_id=problem_id,
    )
    session.add(formal_response)
    
    if req_type == "close":
        problem.status = "Відхилено"
        session.add(problem)
        await session.commit()
        
        # Notify admin about worker action
        manager_user = await session.get(User, user_id)
        manager_name = manager_user.username if manager_user else "Менеджер"
        comment_str = f" Коментар: {clean_formal_comment}" if clean_formal_comment else ""
        await notify_only_admins(
            session,
            f"❌ Менеджер {manager_name} прийняв запит майстра на скасування ремонту по заявці #{problem.id} ({problem.title}).\n"
            f"Статус змінено на 'Відхилено'.{comment_str}"
        )
        
        await send_msg(
            problem.user_id,
            f"❌ Ваш запит #{problem.id} ({problem.title}) закритий/відхилений менеджером.\n"
            f"Коментар: {clean_formal_comment}"
        )
        return {"message": "Запит на закриття успішно прийнято, заявку відхилено", "status": "Відхилено"}
        
    elif req_type == "end":
        problem.status = "Прийняття оплати"
        if clean_work_done is not None:
            problem.completion_work_done = clean_work_done
        if clean_parts_used is not None:
            problem.completion_parts_used = clean_parts_used
            
        session.add(problem)
        await session.commit()
        
        # Notify admin about worker action
        manager_user = await session.get(User, user_id)
        manager_name = manager_user.username if manager_user else "Менеджер"
        comment_str = f" Коментар: {clean_formal_comment}" if clean_formal_comment else ""
        await notify_only_admins(
            session,
            f"📨 Менеджер {manager_name} прийняв запит майстра на завершення ремонту по заявці #{problem.id} ({problem.title}).\n"
            f"Статус змінено на 'Прийняття оплати'.{comment_str}"
        )
        
        await send_msg(
            problem.user_id,
            f"🛠️ Ремонт за вашим запитом #{problem.id} ({problem.title}) завершено майстром та підтверджено менеджером!\n"
            f"Опис роботи: {problem.completion_work_done}\n"
            f"Використані деталі: {problem.completion_parts_used or 'немає'}\n"
            f"Коментар менеджера: {clean_formal_comment}\n"
            f"Заявка перейшла на етап 'Прийняття оплати'."
        )
        
        if problem.admin_id:
            await send_msg(
                problem.admin_id,
                f"📨 Заявка #{problem.id} ({problem.title}) перейшла до статусу 'Прийняття оплати' (ваш запит на завершення ремонту підтверджено менеджером)."
            )
            
        return {"message": "Запит на закінчення ремонту успішно прийнято, статус змінено на 'Прийняття оплати'", "status": "Прийняття оплати"}


@app.post("/problems/{problem_id}/post-payment", dependencies=[Depends(limit_strict)])
async def post_payment(
    problem_id: int,
    requisites: str = Form(...),
    invoice: UploadFile = File(None),
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: post payment details and optional invoice file."""
    user_id, role = manager_data
    if role != "manager":
        raise HTTPException(status_code=403, detail="Тільки менеджер може надсилати запит на оплату")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.status != "Прийняття оплати":
        raise HTTPException(status_code=400, detail="Заявка не перебуває на етапі прийняття оплати")
        
    if problem.payment_client_marked:
        raise HTTPException(status_code=400, detail="Клієнт уже позначив, що оплатив замовлення. Зміна реквізитів заблокована!")
        
    # 1. Validate file size & type
    await validate_uploaded_file(invoice, is_invoice=True)
    
    # 2. Sanitize requisites
    clean_requisites = sanitize_html(requisites)
    problem.payment_requisites = clean_requisites
    
    if invoice and invoice.filename:
        import os
        os.makedirs("static/payment_invoices", exist_ok=True)
        file_location = f"payment_invoices/{invoice.filename}"
        with open("static/" + file_location, "wb+") as f:
            f.write(await invoice.read())
        problem.payment_invoice_url = file_location
        
    session.add(problem)
    await session.commit()
    
    await send_msg(
        problem.user_id,
        f"💳 Менеджер надіслав рахунок на оплату та реквізити за запитом #{problem.id} ({problem.title})!\n"
        f"Сума до сплати: {problem.proposed_price or 0} грн\n"
        f"Реквізити:\n{clean_requisites}\n"
        f"Будь ласка, здійсніть оплату та позначте це на сайті."
    )
    return {
        "message": "Рахунок на оплату успішно надіслано",
        "payment_requisites": clean_requisites,
        "payment_invoice_url": problem.payment_invoice_url
    }


@app.post("/problems/{problem_id}/mark-paid")
async def mark_paid(
    problem_id: int,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Client: Mark problem as paid."""
    user_id, role = current_user
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if role != "client" or problem.user_id != user_id:
        raise HTTPException(status_code=403, detail="Тільки клієнт-власник заявки може позначити оплату")
        
    if problem.status != "Прийняття оплати":
        raise HTTPException(status_code=400, detail="Заявка не перебуває на етапі прийняття оплати")
        
    problem.payment_client_marked = True
    session.add(problem)
    await session.commit()
    
    await notify_only_managers(
        session,
        f"💳 Клієнт позначив заявку #{problem.id} ({problem.title}) як оплачену!\n"
        f"Узгоджена сума: {problem.proposed_price or 0} грн.\n"
        f"Будь ласка, перевірте надходження коштів на вказані реквізити та підтвердіть оплату."
    )
    
    return {"message": "Оплату успішно позначено. Очікуйте підтвердження менеджером.", "payment_client_marked": True}


@app.post("/problems/{problem_id}/confirm-payment")
async def confirm_payment(
    problem_id: int,
    manager_data: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manager: Confirm payment and complete request (generate service record)."""
    user_id, role = manager_data
    if role != "manager":
        raise HTTPException(status_code=403, detail="Тільки менеджер може підтвердити оплату")
        
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if problem.status != "Прийняття оплати":
        raise HTTPException(status_code=400, detail="Заявка не перебуває на етапі прийняття оплати")
        
    today = date.today()
    warranty_info = (
        f"ГАРАНТІЙНИЙ ТАЛОН #{problem.id}\n"
        f"Послуга: сервісне обслуговування комп'ютерної техніки\n"
        f"Дата прийому: {problem.date_created.date()}\n"
        f"Дата видачі: {today}\n"
        f"Гарантійний термін: 6 місяців з дати видачі\n"
        f"Дата завершення гарантії: {today + timedelta(days=180)}"
    )
    
    record = ServiceRecord(
        work_done=problem.completion_work_done or "Ремонтні роботи завершені",
        parts_used=problem.completion_parts_used,
        warranty_info=warranty_info,
        problem_id=problem_id,
    )
    session.add(record)
    
    problem.status = "Готово до видачі"
    session.add(problem)
    await session.commit()
    
    # Notify admin about worker action
    manager_user = await session.get(User, user_id)
    manager_name = manager_user.username if manager_user else "Менеджер"
    await notify_only_admins(
        session,
        f"💳 Менеджер {manager_name} підтвердив оплату по заявці #{problem.id} ({problem.title}).\n"
        f"Статус змінено на 'Готово до видачі'."
    )
    
    await send_msg(
        problem.user_id,
        f"🎉 Оплату підтверджено! Ваш пристрій за запитом #{problem.id} ({problem.title}) готовий до видачі.\n"
        f"Будь ласка, заберіть його у сервісному центрі та підтвердіть отримання на сайті."
    )
    
    if problem.admin_id:
        await send_msg(
            problem.admin_id,
            f"📦 Заявка #{problem.id} ({problem.title}) перейшла до статусу 'Готово до видачі' (оплату підтверджено менеджером)."
        )
        
    return {"message": "Оплату успішно підтверджено, пристрій готовий до видачі", "status": "Готово до видачі"}


@app.post("/problems/{problem_id}/confirm-handover")
async def confirm_handover(
    problem_id: int,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Client: Confirm that they have received the device, which moves the ticket to 'Завершено'."""
    user_id, role = current_user
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Заявку не знайдено")
        
    if role != "client" or problem.user_id != user_id:
        raise HTTPException(status_code=403, detail="Тільки клієнт-власник заявки може підтвердити отримання пристрою")
        
    if problem.status != "Готово до видачі":
        raise HTTPException(status_code=400, detail="Заявка має бути в статусі 'Готово до видачі'")
        
    problem.status = "Завершено"
    session.add(problem)
    await session.commit()
    
    # Notify managers
    await notify_managers_and_admins(
        session,
        f"✅ Клієнт підтвердив отримання пристрою по заявці #{problem.id} ({problem.title})! Статус змінено на 'Завершено'."
    )
    
    # Also notify master if assigned
    if problem.admin_id:
        await send_msg(
            problem.admin_id,
            f"✅ Клієнт підтвердив отримання пристрою по вашій заявці #{problem.id} ({problem.title})."
        )
        
    return {"message": "Отримання пристрою успішно підтверджено", "status": "Завершено"}


@app.delete("/problems/{problem_id}")
async def delete_problem(
    problem_id: int,
    admin_or_manager: tuple = Depends(admin_or_manager_required),
    session: AsyncSession = Depends(get_session),
):
    raise HTTPException(
        status_code=403,
        detail="Видалення заявок повністю заблоковано в системі для збереження фінансової та сервісної звітності"
    )


@app.get("/service-records/{problem_id}")
async def get_service_record(
    problem_id: int,
    current_user: tuple = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Problem).filter_by(id=problem_id))
    problem = result.scalars().one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Проблему не знайдено")

    rec_result = await session.execute(
        select(ServiceRecord).filter_by(problem_id=problem_id)
    )
    record = rec_result.scalars().one_or_none()

    return {
        "problem": {
            "id": problem.id,
            "title": problem.title,
            "status": problem.status,
            "date_created": problem.date_created,
            "proposed_price": problem.proposed_price,
        },
        "service_record": (
            {
                "work_done": record.work_done,
                "parts_used": record.parts_used,
                "warranty_info": record.warranty_info,
                "date_completed": record.date_completed,
            }
            if record
            else None
        ),
    }

@app.get("/admin/stats")
async def get_stats(
    manager_data: tuple = Depends(admin_or_manager_required),
    session: AsyncSession = Depends(get_session),
):
    """Show service statistics: active count, status breakdown, average processing time."""
    active_res = await session.execute(
        select(func.count()).select_from(Problem).where(Problem.status != "Завершено", Problem.status != "Відхилено")
    )
    active_count = active_res.scalar_one()
    
    status_res = await session.execute(
        select(Problem.status, func.count()).group_by(Problem.status)
    )
    status_counts = {status: count for status, count in status_res.all()}
    
    completed_res = await session.execute(
        select(Problem.date_created, ServiceRecord.date_completed)
        .join(ServiceRecord, ServiceRecord.problem_id == Problem.id)
        .where(Problem.status == "Завершено")
    )
    rows = completed_res.all()
    if rows:
        total_seconds = sum(
            (row.date_completed - row.date_created).total_seconds() for row in rows
        )
        avg_seconds = total_seconds / len(rows)
    else:
        avg_seconds = None
        
    return {
        "active_count": active_count,
        "status_counts": status_counts,
        "average_processing_seconds": avg_seconds,
    }


# ---------------------------------------------------------------------------
# Admin role management
# ---------------------------------------------------------------------------


class ChangeRoleRequest(BaseModel):
    role: str


@app.get("/admin/users")
async def list_users(
    admin: tuple = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).order_by(User.id))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
        }
        for u in users
    ]


@app.post("/admin/users/{user_id}/role")
async def change_user_role(
    user_id: int,
    data: ChangeRoleRequest,
    admin: tuple = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    valid_roles = ["client", "master", "manager", "admin"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Невідома роль")

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    user.role = data.role
    user.is_admin = True if data.role == "admin" else False

    session.add(user)
    await session.commit()
    return {"message": "Роль успішно змінено", "user_id": user_id, "role": user.role}


# ---------------------------------------------------------------------------
# AI Assistance (OpenRouter Integration)
# ---------------------------------------------------------------------------

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL")


class RefineProblemRequest(BaseModel):
    title: str
    description: str


class RefineCommentRequest(BaseModel):
    text: str


class RefineBargainRequest(BaseModel):
    current_price: int
    counter_price: int
    comment: str


def parse_json_resilient(text: str) -> dict:
    t = text.strip()
    
    # Try to find json block inside markdown blocks
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", t, re.DOTALL | re.IGNORECASE)
    if match:
        json_candidate = match.group(1).strip()
        try:
            return json.loads(json_candidate)
        except Exception:
            pass
            
    # Try to locate the outermost { } curly braces
    first_brace = t.find("{")
    last_brace = t.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_candidate = t[first_brace:last_brace+1].strip()
        try:
            return json.loads(json_candidate)
        except Exception:
            pass
            
    # Fallback to parsing the whole text directly
    return json.loads(t)


def mock_refine_problem(title: str, description: str) -> dict:
    title_lower = title.lower() + " " + description.lower()
    category = "Апаратне забезпечення"
    if any(k in title_lower for k in ["інтернет", "роутер", "wi-fi", "wifi", "мережа", "кабель", "лан", "lan", "провід"]):
        category = "Мережа"
    elif any(k in title_lower for k in ["принтер", "сканер", "мишка", "клавіатура", "монітор", "периферія", "дисплей", "екран"]):
        category = "Периферія"
    elif any(k in title_lower for k in ["windows", "linux", "програма", "антивірус", "драйвер", "офіс", "софт", "встановлення", "помилка"]):
        category = "Програмне забезпечення"
    elif any(k in title_lower for k in ["інше", "запит", "консультація"]):
        category = "Інше"
        
    return {
        "category": category,
        "title": f"[ШІ] {title.strip()}",
        "description": (
            f"**Категорія:** {category}\n\n"
            f"**Офіційний технічний опис:**\n"
            f"Клієнтом повідомлено про проблему: \"{description.strip()}\".\n"
            f"Попередній аналіз вказує на ймовірну несправність у категорії '{category}'. Необхідно провести комплексну первинну діагностику."
        )
    }


def call_openrouter_sync(prompt: str, system_prompt: str = "") -> str:
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set")
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/ServiceDeskPlus",
        "X-Title": "ServiceDesk Plus",
    }
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": 0.3,
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=15)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


async def call_openrouter(prompt: str, system_prompt: str = "") -> str:
    return await asyncio.to_thread(call_openrouter_sync, prompt, system_prompt)


@app.post("/ai/refine-problem")
async def refine_problem(
    data: RefineProblemRequest,
    user_data: tuple = Depends(get_current_user),
):
    title = data.title.strip()
    description = data.description.strip()
    if not title or not description:
        raise HTTPException(status_code=400, detail="Назва та опис не можуть бути порожніми")

    if not OPENROUTER_API_KEY:
        simulated = mock_refine_problem(title, description)
        return {
            "status": "simulation",
            "category": simulated["category"],
            "title": simulated["title"],
            "description": simulated["description"],
            "note": "ШІ працює у режимі симуляції (додайте OPENROUTER_API_KEY в .env)"
        }

    system_prompt = (
        "Ти — провідний технічний експерт та класифікатор у ServiceDesk. Твоє завдання — проаналізувати опис проблеми користувача, класифікувати її та переписати назву (title) та опис (description) українською мовою у високопрофесійному, технічно грамотному стилі.\n"
        "Обов'язкові категорії для вибору (вибери ОДНУ з них):\n"
        "- \"Апаратне забезпечення\"\n"
        "- \"Програмне забезпечення\"\n"
        "- \"Мережа\"\n"
        "- \"Периферія\"\n"
        "- \"Інше\"\n\n"
        "Відповідь має бути СТРОГО у форматі JSON, що містить такі ключі:\n"
        "{\n"
        "  \"category\": \"Назва обраної категорії\",\n"
        "  \"title\": \"Переписаний короткий професійний заголовок\",\n"
        "  \"description\": \"Детальний технічний опис проблеми з чіткою структурою (симптоми, можливий вплив, очікуваний результат)\"\n"
        "}\n"
        "Не додавай жодних інших слів, окрім JSON. Не обгортай відповідь у markdown блоки на кшталт ```json."
    )
    
    prompt = f"Назва: {title}\nОпис: {description}"
    
    try:
        raw_response = await call_openrouter(prompt, system_prompt)
        print(raw_response)
        
        result = parse_json_resilient(raw_response)
        
        if "category" not in result or "title" not in result or "description" not in result:
            raise ValueError("Неповна відповідь від моделі")
            
        return {
            "status": "success",
            "category": result["category"],
            "title": result["title"],
            "description": f"Категорія: {result['category']}\n\n{result['description']}"
        }
    except Exception as e:
        simulated = mock_refine_problem(title, description)
        return {
            "status": "fallback",
            "category": simulated["category"],
            "title": f"[ШІ] {title}",
            "description": simulated["description"],
            "error_log": str(e)
        }


@app.post("/ai/refine-comment")
async def refine_comment(
    data: RefineCommentRequest,
    user_data: tuple = Depends(get_current_user),
):
    _, role = user_data
    if role not in ["admin", "manager", "master"]:
        raise HTTPException(status_code=403, detail="Доступ лише для співробітників")
        
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст для покращення не може бути порожнім")
        
    if not OPENROUTER_API_KEY:
        refined_text = (
            f"Шановний клієнте! {text}\n\n"
            f"З повагою, служба підтримки ServiceDesk. [DEMO - ШІ в режимі симуляції]"
        )
        return {
            "status": "simulation",
            "refined_text": refined_text
        }
        
    system_prompt = (
        "Ти — ввічливий та висококваліфікований менеджер служби підтримки ServiceDesk. Твоє завдання — переписати коментар/повідомлення менеджера українською мовою у бездоганному діловому, офіційному, клієнтоорієнтованому стилі.\n"
        "Повідомлення повинно звучати приязно, професійно та чітко, зберігаючи всі деталі (дати, ціни, деталі поломки тощо).\n"
        "Не додавай жодних коментарів від себе чи вступних пояснень типу 'Ось ваш текст:'. Повертай ТІЛЬКИ фінальний переписаний текст повідомлення."
    )
    
    try:
        refined_text = await call_openrouter(text, system_prompt)
        return {
            "status": "success",
            "refined_text": refined_text.strip()
        }
    except Exception as e:
        return {
            "status": "fallback",
            "refined_text": f"Шановний клієнте! Повідомляємо наступне: {text} (З повагою, служба підтримки)",
            "error_log": str(e)
        }


@app.post("/ai/refine-bargain")
async def refine_bargain(
    data: RefineBargainRequest,
    user_data: tuple = Depends(get_current_user),
):
    _, role = user_data
    if role != "client":
        raise HTTPException(status_code=403, detail="Доступ заборонено")
        
    comment = data.comment.strip()
    if not comment:
        raise HTTPException(status_code=400, detail="Коментар не може бути порожнім")
        
    if not OPENROUTER_API_KEY:
        refined_text = (
            f"Шановний менеджер! Я високо ціную вашу діагностику та роботу майстра, проте "
            f"хотів би узгодити можливість коригування ціни з {data.current_price} грн до {data.counter_price} грн. "
            f"Причина мого прохання: {comment}. Сподіваюся на ваше розуміння та взаємовигідну співпрацю. [DEMO - ШІ в режимі симуляції]"
        )
        return {
            "status": "simulation",
            "refined_text": refined_text
        }
        
    system_prompt = (
        "Ти — ввічливий та дипломатичний клієнт сервісного центру ServiceDesk. Твоє завдання — переписати та сформулювати "
        "офіційну пропозицію (торг) щодо вартості ремонту українською мовою у бездоганному, дипломатичному, "
        "надзвичайно ввічливому діловому стилі. Пропозиція адресована менеджеру сервісного центру.\n"
        "Ти висловлюєш подяку за діагностику та професіоналізм, але просиш розглянути можливість зниження ціни з "
        "початкової вартості до твоєї зустрічної пропозиції, посилаючись на твої аргументи.\n"
        "Не додавай жодних коментарів від себе чи пояснень. Повертай СТРОГО тільки готовий текст повідомлення, без маркдаун-тегів чи лапок. Також у тексті не має бути зірочок чи решіток."
    )
    prompt = (
        f"Початкова ціна: {data.current_price} грн.\n"
        f"Зустрічна ціна: {data.counter_price} грн.\n"
        f"Мої аргументи/коментар: {comment}"
    )
    
    try:
        refined_text = await call_openrouter(prompt, system_prompt)
        return {
            "status": "success",
            "refined_text": refined_text.strip()
        }
    except Exception as e:
        return {
            "status": "fallback",
            "refined_text": (
                f"Шановний менеджер! Я високо ціную вашу діагностику та роботу майстра, проте "
                f"хотів би узгодити можливість коригування ціни з {data.current_price} грн до {data.counter_price} грн. "
                f"Обгрунтування: {comment}."
            ),
            "error_log": str(e)
        }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE admin_responses ADD COLUMN is_private BOOLEAN DEFAULT 0;"))
        except Exception as e:
            # Column likely already exists or other error
            pass


@app.on_event("startup")
async def on_startup():
    asyncio.create_task(start())
    await init_db()
