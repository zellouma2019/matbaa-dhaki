#!/bin/bash
# Persistent server wrapper - handles signals gracefully and restarts
cd /home/z/my-project

# Ignore SIGHUP
trap '' HUP
# Handle SIGTERM by doing nothing (force the kernel to SIGKILL us)
trap '' TERM

while true; do
  echo "[$(date)] Starting next dev..." >> /home/z/my-project/server.log
  npx next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE" >> /home/z/my-project/server.log
  # Don't restart if intentionally stopped
  if [ $EXIT_CODE -eq 0 ]; then
    break
  fi
  sleep 2
done