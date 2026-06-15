# ==========================================
# STAGE 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package configuration files
COPY package.json package-lock.json ./

# Install dependencies (frozen-lockfile)
RUN npm ci

# Copy configuration files and source code
COPY vite.config.js index.html ./
COPY src/ ./src/
COPY static/ ./static/

# Build the production assets (outputs to /app/dist)
RUN npm run build

# ==========================================
# STAGE 2: Build & Package the Python App
# ==========================================
FROM python:3.13-slim AS runner

# Install Nginx and other runtime tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*

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

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy deployment configurations
COPY nginx.conf /etc/nginx/sites-available/default
COPY entrypoint.sh /app/entrypoint.sh

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Create dynamic upload folders and grant permissions to Nginx
RUN mkdir -p /app/static/payment_invoices /app/static/user_problem_image \
    && chown -R www-data:www-data /app/static

# Expose Nginx public port
EXPOSE 80

# Run entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
