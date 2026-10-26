#!/usr/bin/env bash
# Start the Invoicer API (serves the built React app at /).
set -euo pipefail
cd "$(dirname "$0")"
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q -r requirements.txt
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
echo "Invoicer running at http://localhost:$PORT  (default login: admin / admin123)"
exec python -m uvicorn app.main:app --host "$HOST" --port "$PORT"
