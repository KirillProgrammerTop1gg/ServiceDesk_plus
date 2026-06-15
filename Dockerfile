# ==========================================
# Build & Package Python App (Backend & Bot)
# ==========================================
FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/venv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev
COPY main.py tg_bot.py project_models.py ./
COPY static/ ./static/
RUN mkdir -p /app/static/payment_invoices /app/static/user_problem_image
EXPOSE 8080
CMD exec /venv/bin/uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --log-level info
