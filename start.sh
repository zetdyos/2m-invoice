#!/usr/bin/env bash
# First-time setup and launch: builds the frontend, installs the backend, starts the server.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> Building frontend"
"$HERE/build.sh"

echo "==> Preparing backend"
cd "$HERE/backend"
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q -r requirements.txt

if [ "${MIGRATE:-0}" = "1" ]; then
  echo "==> Importing data from the original .NET app"
  python migrate_from_dotnet.py || true
fi

echo "==> Starting server"
exec "$HERE/backend/run.sh"
