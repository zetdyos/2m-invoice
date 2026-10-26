#!/usr/bin/env bash
# Development mode: FastAPI on :8000 (reload) + Vite dev server on :5173 (proxying /api).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/backend"; . .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000 &
API_PID=$!
trap "kill $API_PID 2>/dev/null" EXIT
cd "$HERE/frontend"; npm run dev
