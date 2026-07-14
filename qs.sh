#!/bin/bash
# Quick Server (qs) - Instantly starts Next.js production server
# Usage: source /home/z/my-project/qs.sh
# The server starts in < 1 second using pre-built production assets

QS_PORT=3000
QS_DIR="/home/z/my-project"

# Check if already responding
if curl -s --connect-timeout 2 -o /dev/null -w "" "http://localhost:${QS_PORT}/" 2>/dev/null; then
  return 0 2>/dev/null || exit 0
fi

# Clean stale processes
pkill -f "next start" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 0.5

# Ensure build exists
if [ ! -d "${QS_DIR}/.next/server" ]; then
  echo "qs: No build found. Run 'bun run build' first." >&2
  cd "$QS_DIR" && bun run build > /dev/null 2>&1
fi

# Start production server (starts in < 1 second)
cd "$QS_DIR" && npx next start -p "$QS_PORT" -H 0.0.0.0 > /dev/null 2>&1 &

# Wait for ready
for i in $(seq 1 15); do
  if curl -s --connect-timeout 1 -o /dev/null -w "" "http://localhost:${QS_PORT}/" 2>/dev/null; then
    return 0 2>/dev/null || exit 0
  fi
  sleep 0.3
done

echo "qs: Server failed to start" >&2
return 1 2>/dev/null || exit 1