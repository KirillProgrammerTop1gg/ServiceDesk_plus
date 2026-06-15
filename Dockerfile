# ==========================================
# Build & Package Python App (Backend & Bot)
# ==========================================
FROM python:3.13-slim

# Copy uv binary for rapid dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Configure python and uv environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/venv

# Copy dependency definition files to leverage layer caching
COPY pyproject.toml uv.lock ./

# Install python dependencies into virtualenv /venv
RUN uv sync --frozen --no-install-project --no-dev

# Copy application source code
COPY main.py tg_bot.py project_models.py ./
COPY static/ ./static/

# Create dynamic upload folders
RUN mkdir -p /app/static/payment_invoices /app/static/user_problem_image

# Expose backend port
EXPOSE 8080

# Run FastAPI backend (which automatically spins up the Telegram bot on startup)
CMD ["/venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4", "--log-level", "info"]
