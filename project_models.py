from sqlalchemy import Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship, DeclarativeBase, mapped_column, Mapped
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from typing import Optional
from datetime import datetime
import bcrypt

import os

def load_dotenv():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()
                if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                os.environ[key] = value

load_dotenv()

DB_USER = os.environ.get("DB_USER", "admin")
DB_PASS = os.environ.get("DB_PASS", "admin")
DB_NAME = os.environ.get("DB_NAME", "techfix")

INSTANCE_CONNECTION_NAME = os.environ.get("INSTANCE_CONNECTION_NAME")
DB_HOST = os.environ.get("DB_HOST")
DB_PORT = os.environ.get("DB_PORT", "5432")

if INSTANCE_CONNECTION_NAME:
    DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@/{DB_NAME}"
    connect_args = {"server_settings": {}, "host": f"/cloudsql/{INSTANCE_CONNECTION_NAME}"}
elif DB_HOST:
    DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    connect_args = {}
else:
    DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./database.db")
    connect_args = {}

engine = create_async_engine(DATABASE_URL, echo=True, connect_args=connect_args)
async_session = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    description: Mapped[str] = mapped_column(String(1000))
    date_created: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    image_url: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    status: Mapped[str] = mapped_column(String(250), default="На розгляді")
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    admin_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    completion_work_done: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    completion_parts_used: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Price acceptance
    proposed_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # None, "proposed", "accepted", "declined"

    # Master private requests to manager
    master_request_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # None, "close", "end"
    master_request_comment: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    master_request_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # None, "pending", "accepted"

    # Payment details
    payment_requisites: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    payment_invoice_url: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    payment_client_marked: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(
        "User", foreign_keys=[user_id], back_populates="problems"
    )
    admin: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[admin_id], back_populates="assigned_problems"
    )
    responses: Mapped[list["AdminResponse"]] = relationship(
        "AdminResponse", back_populates="problem"
    )
    service_record: Mapped[Optional["ServiceRecord"]] = relationship(
        "ServiceRecord", back_populates="problem", uselist=False
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[str] = mapped_column(String(50), default="client", server_default="client")

    problems: Mapped[list["Problem"]] = relationship(
        "Problem", foreign_keys=[Problem.user_id], back_populates="user"
    )
    assigned_problems: Mapped[list["Problem"]] = relationship(
        "Problem", foreign_keys=[Problem.admin_id], back_populates="admin"
    )
    responses: Mapped[list["AdminResponse"]] = relationship(
        "AdminResponse", back_populates="admin"
    )

    def set_password(self, raw_password: str):
        hashed = bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt())
        self.password = hashed.decode("utf-8")

    def verify_password(self, raw_password: str) -> bool:
        return bcrypt.checkpw(
            raw_password.encode("utf-8"), self.password.encode("utf-8")
        )


class UsersInTelegram(Base):
    __tablename__ = "users_in_telegram"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tg_code: Mapped[str] = mapped_column(String(100))
    user_tg_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_in_site: Mapped[int] = mapped_column(ForeignKey("users.id"))
    date_created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AdminResponse(Base):
    __tablename__ = "admin_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message: Mapped[str] = mapped_column(String(1000))
    date_responded: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    problem_id: Mapped[int] = mapped_column(Integer, ForeignKey("problems.id"))

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)

    admin: Mapped["User"] = relationship("User", back_populates="responses")
    problem: Mapped["Problem"] = relationship("Problem", back_populates="responses")


class ServiceRecord(Base):
    __tablename__ = "service_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    work_done: Mapped[str] = mapped_column(String(1000))
    date_completed: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    parts_used: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    warranty_info: Mapped[str] = mapped_column(String(1000))
    problem_id: Mapped[int] = mapped_column(Integer, ForeignKey("problems.id"))

    problem: Mapped["Problem"] = relationship(
        "Problem", back_populates="service_record"
    )
