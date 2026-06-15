#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting TechFix Deployment Environment..."

# Ensure required upload directories exist in the runtime container volume
mkdir -p /app/static/payment_invoices /app/static/user_problem_image
chown -R www-data:www-data /app/static

echo "⏳ Starting FastAPI & Telegram Bot (Uvicorn)..."
# Start FastAPI backend (which automatically spins up the Telegram bot on startup)
# Binds to 127.0.0.1 so it's private and only accessible via Nginx proxy on port 80
/venv/bin/uvicorn main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 4 \
    --log-level info &

echo "🌐 Starting Nginx Web Server..."
# Run Nginx in the foreground to keep the Docker container active
exec nginx -g "daemon off;"
