#!/bin/bash
cd /home/z/my-project
if ! git remote get-url origin > /dev/null 2>&1; then
  echo "Git remote not configured yet."
  exit 1
fi
git add -A
git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')" --allow-empty 2>/dev/null
git push origin main 2>&1
echo "Synced to GitHub at $(date)"
