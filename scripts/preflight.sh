#!/bin/bash
# schwarm: Session preflight check
# Runs on SessionStart via hooks.json
# Checks: git sync, lockfile changes, shared code freshness

set -euo pipefail
cd "$(git rev-parse --show-toplevel)" 2>/dev/null || exit 0

WARNINGS=""

# 1. Check if we're behind remote (left=ahead, right=behind)
COUNTS=$(git rev-list --left-right --count HEAD...@{u} 2>/dev/null || echo "0 0")
BEHIND=$(echo "$COUNTS" | awk '{print $2}')
if [ "$BEHIND" -gt 0 ] 2>/dev/null; then
  WARNINGS="${WARNINGS}schwarm: Local branch is $BEHIND commit(s) behind remote. Run 'git pull' to sync.\n"
fi

# 2. Check lockfile freshness (detect any common lockfile change)
if git diff HEAD~1 --name-only 2>/dev/null | grep -qE "(pnpm-lock|package-lock|bun\.lock|yarn\.lock)"; then
  WARNINGS="${WARNINGS}schwarm: Lockfile changed recently. Run your package manager's install if needed.\n"
fi

# 3. Check shared code freshness (configurable via .schwarm.json, fallback to common paths)
SHARED_DIR=""
if [ -f ".schwarm.json" ]; then
  SHARED_DIR=$(python3 -c "import json; c=json.load(open('.schwarm.json')); print(c.get('sharedDir',''))" 2>/dev/null || echo "")
fi
# Fallback: check common shared package locations
if [ -z "$SHARED_DIR" ]; then
  for candidate in packages/shared/src packages/shared src/shared lib/shared; do
    if [ -d "$candidate" ]; then SHARED_DIR="$candidate"; break; fi
  done
fi

if [ -n "$SHARED_DIR" ] && [ -d "$SHARED_DIR" ]; then
  LAST_SHARED=$(git log -1 --format='%ct' -- "$SHARED_DIR" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  AGE=$(( (NOW - LAST_SHARED) ))
  if [ "$AGE" -lt 7200 ] && [ "$AGE" -gt 0 ]; then
    LAST_MSG=$(git log -1 --format='%s' -- "$SHARED_DIR" 2>/dev/null)
    WARNINGS="${WARNINGS}schwarm: $SHARED_DIR changed recently ($LAST_MSG). Rebuild shared code if needed.\n"
  fi
fi

# Output warnings (if any)
if [ -n "$WARNINGS" ]; then
  echo -e "$WARNINGS"
fi
