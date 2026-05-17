# Backend — FastAPI + LangGraph (uv, Python 3.12)
FROM python:3.12-slim

# uv for fast, reproducible installs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install deps first (layer-cached)
COPY pyproject.toml ./
RUN uv pip install --system -r pyproject.toml

COPY . .

# Volume mount point for the persisted SQLite DB + checkpoints.
RUN mkdir -p /data

EXPOSE 8000

# agents.db lives in /app (mounted as a volume by compose)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
