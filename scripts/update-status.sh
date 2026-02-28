#!/bin/bash
# Generates agent status JSON from OpenClaw sessions
# Run via cron or manually: ./scripts/update-status.sh

OUT="$(dirname "$0")/../public/assets/room/agents-status.json"

# Use openclaw's sessions_list tool equivalent via the CLI
# For now, read from memory files to determine activity

NOW=$(date +%s)
STATUS='[]'

for agent in percival forge sprite; do
  MEMORY_DIR="$HOME/.openclaw/workspace/memory"
  TODAY=$(date +%Y-%m-%d)
  MEMORY_FILE="$MEMORY_DIR/$TODAY.md"
  
  case $agent in
    percival)
      # Check main session - if today's memory was updated recently, Percival is active
      if [ -f "$MEMORY_FILE" ]; then
        MOD=$(stat -f %m "$MEMORY_FILE" 2>/dev/null || stat -c %Y "$MEMORY_FILE" 2>/dev/null)
        DIFF=$(( NOW - MOD ))
        if [ "$DIFF" -lt 300 ]; then
          STATE="working"
          TASK="Orchestrating agent swarm..."
        elif [ "$DIFF" -lt 1800 ]; then
          STATE="idle"  
          TASK="Idle..."
        else
          STATE="sleeping"
          TASK="zzZ..."
        fi
      else
        STATE="sleeping"
        TASK="zzZ..."
      fi
      ;;
    forge|sprite)
      STATE="sleeping"
      TASK="zzZ..."
      ;;
  esac
  
  STATUS=$(echo "$STATUS" | python3 -c "
import json, sys
agents = json.load(sys.stdin)
agents.append({'id':'$agent','name':'${agent^}','status':'$STATE','currentTask':'$TASK','lastSeen':$NOW})
json.dump(agents, sys.stdout)
")
done

echo "$STATUS" | python3 -m json.tool > "$OUT"
echo "Updated: $OUT"
