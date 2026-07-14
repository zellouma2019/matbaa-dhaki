#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 2>&1 | tee -a dev.log
  echo "Server crashed, restarting in 2s..."
  sleep 2
done