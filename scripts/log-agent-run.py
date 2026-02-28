#!/usr/bin/env python3
"""
log-agent-run.py — Appends an agent run entry to data/agent-runs.jsonl

Usage:
  python3 log-agent-run.py <agent> <status> <model> <tokens> <task> [cost]

Examples:
  python3 log-agent-run.py forge completed sonnet-4-6 31609 "Multi-room selector" 0.47
  python3 log-agent-run.py forge started sonnet-4-6 0 "Building feature X"
"""

import json
import sys
import time
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / "data" / "agent-runs.jsonl"


def main():
    if len(sys.argv) < 6:
        print("Usage: log-agent-run.py <agent> <status> <model> <tokens> <task> [cost]")
        sys.exit(1)

    agent = sys.argv[1]
    status = sys.argv[2]  # started, completed, failed
    model = sys.argv[3]
    tokens = int(sys.argv[4])
    task = sys.argv[5]
    cost = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0

    entry = {
        "agent": agent,
        "status": status,
        "model": model,
        "tokens": tokens,
        "task": task,
        "cost": cost,
        "timestamp": int(time.time()),
        "iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

    print(f"✅ Logged: {agent} {status} ({model}, {tokens} tokens)")


if __name__ == "__main__":
    main()
