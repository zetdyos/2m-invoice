#!/usr/bin/env bash
# Build the React frontend into backend/app/static so FastAPI serves it at /.
set -euo pipefail
cd "$(dirname "$0")/frontend"
npm install
npm run build
echo "Frontend built into backend/app/static"
