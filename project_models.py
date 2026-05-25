from sqlalchemy import Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship, DeclarativeBase, mapped_column, Mapped
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from typing import Optional
import bcrypt

DATABASE_URL = "sqlite+aiosqlite:///./database.db"
engine = create_async_engine(DATABASE_URL, echo=True)
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
    status: Mapped[str] = mapped_column(String(250), default="В обробці")
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    admin_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    user: Mapped["User"] = relationship(
        "User", foreign_keys=[user_id], back_populates="problems"
    )
    admin: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[admin_id], back_populates="assigned_problems"
    )
    response: Mapped[Optional["AdminResponse"]] = relationship(
        "AdminResponse", back_populates="problem", uselist=False
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


class AdminResponse(Base):
    __tablename__ = "admin_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message: Mapped[str] = mapped_column(String(1000))
    date_responded: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    problem_id: Mapped[int] = mapped_column(Integer, ForeignKey("problems.id"))

    admin: Mapped["User"] = relationship("User", back_populates="responses")
    problem: Mapped["Problem"] = relationship("Problem", back_populates="response")


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
