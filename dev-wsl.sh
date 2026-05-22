#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

echo "=== Next.js WSL dev runner ==="
echo "PWD: $(pwd)"
echo "HOST=$HOST"
echo "PORT=$PORT"

echo
echo "=== Kill stale Next/node listeners on $PORT inside WSL ==="
PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "Killing WSL PIDs: $PIDS"
  kill $PIDS 2>/dev/null || true
  sleep 1
  PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$PIDS" ]; then
    echo "Force killing WSL PIDs: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
  fi
else
  echo "No WSL listener found on $PORT"
fi

echo
echo "=== Clean volatile Next cache ==="
rm -rf .next/cache .next/server .next/static/chunks 2>/dev/null || true

echo
echo "=== Verify dependencies ==="
if [ ! -d node_modules ]; then
  echo "node_modules missing; running npm install"
  npm install
fi

echo
echo "=== Start Next with polling watchers ==="
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1

# Important for WSL + /mnt/c file watching
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export CHOKIDAR_INTERVAL=800
export WDS_SOCKET_PORT="$PORT"

# Helps some Next/Turbopack file-watch edge cases
export NEXT_PRIVATE_WORKER_POOL=1

echo "WATCHPACK_POLLING=$WATCHPACK_POLLING"
echo "CHOKIDAR_USEPOLLING=$CHOKIDAR_USEPOLLING"
echo "CHOKIDAR_INTERVAL=$CHOKIDAR_INTERVAL"

echo
echo "=== Running dev server ==="
exec npm run dev -- --hostname "$HOST" --port "$PORT"
