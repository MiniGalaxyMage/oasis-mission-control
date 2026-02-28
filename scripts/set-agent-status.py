#!/usr/bin/env python3
"""
Update agent status in the Mission Control dashboard.

Usage:
  python3 set-agent-status.py <agent> <status> [task]

Examples:
  python3 set-agent-status.py percival working "Orchestrating agent swarm..."
  python3 set-agent-status.py forge working "Building Excel export endpoint"
  python3 set-agent-status.py sprite idle "Waiting for tasks..."
  python3 set-agent-status.py forge sleeping

Status: working | idle | sleeping
"""
import json, sys, os, time

AGENTS_FILE = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'room', 'agents-status.json')

DEFAULTS = [
    {"id": "percival", "name": "Percival", "status": "sleeping", "currentTask": "zzZ...", "lastSeen": 0},
    {"id": "forge", "name": "Forge", "status": "sleeping", "currentTask": "zzZ...", "lastSeen": 0},
    {"id": "sprite", "name": "Sprite", "status": "sleeping", "currentTask": "zzZ...", "lastSeen": 0},
]

def load():
    try:
        with open(AGENTS_FILE) as f:
            return json.load(f)
    except:
        return [dict(a) for a in DEFAULTS]

def save(agents):
    with open(AGENTS_FILE, 'w') as f:
        json.dump(agents, f, indent=2)

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    agent_id = sys.argv[1].lower()
    status = sys.argv[2].lower()
    task = sys.argv[3] if len(sys.argv) > 3 else None

    if status not in ('working', 'idle', 'sleeping'):
        print(f"Invalid status: {status}. Use: working, idle, sleeping")
        sys.exit(1)

    agents = load()
    now = int(time.time())

    found = False
    for a in agents:
        if a['id'] == agent_id:
            a['status'] = status
            a['lastSeen'] = now
            if task:
                a['currentTask'] = task
            elif status == 'sleeping':
                a['currentTask'] = 'zzZ...'
            elif status == 'idle':
                a['currentTask'] = 'Idle...'
            found = True
            break

    if not found:
        agents.append({
            "id": agent_id,
            "name": agent_id.capitalize(),
            "status": status,
            "currentTask": task or ("zzZ..." if status == "sleeping" else "Working..."),
            "lastSeen": now,
        })

    save(agents)
    print(f"✓ {agent_id} → {status}" + (f": {task}" if task else ""))

if __name__ == '__main__':
    main()
