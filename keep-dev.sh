#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 2>&1 &
  DEV_PID=$!
  for i in $(seq 1 120); do
    sleep 2
    if ! kill -0 $DEV_PID 2>/dev/null; then break; fi
    curl -s -o /dev/null http://localhost:3000/s/mtba-tab 2>/dev/null || true
  done
  kill $DEV_PID 2>/dev/null
  wait $DEV_PID 2>/dev/null
  sleep 1
done
