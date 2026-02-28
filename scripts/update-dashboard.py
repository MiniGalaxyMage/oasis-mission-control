#!/usr/bin/env python3
"""
update-dashboard.py — Generates real dashboard data for OASIS Mission Control.

Sources:
  - openclaw status --json → active sessions, token counts
  - subagents list (via sessions_list internally) → recent agent runs
  - agents-status.json → current agent states (already maintained by set-agent-status.py)

Outputs:
  - public/assets/room/sessions-data.json
  - public/assets/room/costs-data.json

Usage:
  python3 scripts/update-dashboard.py
"""

import json
import subprocess
import sys
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ASSETS_DIR = PROJECT_ROOT / "public" / "assets" / "room"
SESSIONS_OUT = ASSETS_DIR / "sessions-data.json"
COSTS_OUT = ASSETS_DIR / "costs-data.json"

# OpenClaw sessions file (direct read for speed)
OPENCLAW_SESSIONS = Path.home() / ".openclaw" / "agents" / "main" / "sessions" / "sessions.json"
AGENT_RUNS_LOG = PROJECT_ROOT / "data" / "agent-runs.jsonl"

# Pricing per 1M tokens (approximate)
PRICING = {
    "claude-opus-4-6": {"input": 15.0, "output": 75.0, "cache_read": 1.5},
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0, "cache_read": 0.3},
    "claude-haiku-3.5": {"input": 0.25, "output": 1.25, "cache_read": 0.025},
}

# Agent mapping from session keys
AGENT_MAP = {
    "telegram:direct": ("Percival", "telegram"),
    "main": ("Percival", "webchat"),
    "subagent": ("Forge", "spawn"),
    "telegram:slash": ("Percival", "slash"),
}

# Monthly budget
BUDGET = 50.0


def run_cmd(cmd: List[str]) -> Optional[str]:
    """Run a command and return stdout, or None on failure."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return result.stdout if result.returncode == 0 else None
    except Exception:
        return None


def get_openclaw_status() -> Optional[dict]:
    """Get status from openclaw CLI."""
    output = run_cmd(["openclaw", "status", "--json"])
    if output:
        try:
            return json.loads(output)
        except json.JSONDecodeError:
            pass
    return None


def get_sessions_file() -> dict:
    """Read the sessions file directly."""
    try:
        with open(OPENCLAW_SESSIONS) as f:
            return json.load(f)
    except Exception:
        return {}


def estimate_cost(tokens: int, model: str) -> float:
    """Estimate cost based on tokens and model. Rough approximation."""
    pricing = PRICING.get(model, PRICING["claude-sonnet-4-6"])
    # Assume 30% input, 20% output, 50% cache read as rough split
    input_tokens = tokens * 0.3
    output_tokens = tokens * 0.2
    cache_tokens = tokens * 0.5
    cost = (
        (input_tokens / 1_000_000) * pricing["input"]
        + (output_tokens / 1_000_000) * pricing["output"]
        + (cache_tokens / 1_000_000) * pricing["cache_read"]
    )
    return round(cost, 4)


def classify_session(key: str) -> Tuple[str, str]:
    """Map session key to (agent_name, channel)."""
    for pattern, (agent, channel) in AGENT_MAP.items():
        if pattern in key:
            return agent, channel
    return "Unknown", "unknown"


def determine_status(session: dict) -> str:
    """Determine session status from data."""
    age_ms = session.get("age", float("inf"))
    if age_ms < 120_000:  # active in last 2 minutes
        return "working"
    elif age_ms < 3_600_000:  # active in last hour
        return "idle"
    return "sleeping"


def load_agent_runs() -> list:
    """Load agent run history from JSONL log."""
    runs = []
    try:
        with open(AGENT_RUNS_LOG) as f:
            for line in f:
                line = line.strip()
                if line:
                    runs.append(json.loads(line))
    except FileNotFoundError:
        pass
    return runs


def build_sessions_data(status_data: dict) -> dict:
    """Build sessions-data.json from openclaw status."""
    sessions = []
    now = datetime.now(timezone.utc)

    recent = status_data.get("sessions", {}).get("recent", [])

    for s in recent:
        key = s.get("key", "")
        agent, channel = classify_session(key)
        model = s.get("model", "unknown")
        tokens = s.get("totalTokens") or 0
        cost = estimate_cost(tokens, model)
        updated_at = s.get("updatedAt", 0)

        # Convert epoch ms to ISO
        if updated_at:
            last_activity = datetime.fromtimestamp(updated_at / 1000, tz=timezone.utc).isoformat()
        else:
            last_activity = now.isoformat()

        # Determine status
        status = determine_status(s)

        # Determine task description
        pct = s.get("percentUsed") or 0
        remaining = s.get("remainingTokens") or 0
        task = f"Context: {pct}% used ({tokens:,} tokens)"

        # Model short name
        model_short = model.replace("claude-", "").replace("anthropic/", "")

        sessions.append({
            "id": s.get("sessionId", key),
            "agent": agent,
            "status": status,
            "task": task,
            "model": model_short,
            "channel": channel,
            "lastActivity": last_activity,
            "tokens": tokens,
            "cost": round(cost, 2),
        })

    # Add completed agent runs from log
    agent_runs = load_agent_runs()
    for run in agent_runs:
        if run.get("status") == "completed":
            sessions.append({
                "id": f"run-{run.get('timestamp', 0)}",
                "agent": run.get("agent", "Unknown").capitalize(),
                "status": "sleeping",
                "task": f"✅ {run.get('task', 'Completed')}",
                "model": run.get("model", "unknown"),
                "channel": "spawn",
                "lastActivity": run.get("iso", now.isoformat()),
                "tokens": run.get("tokens", 0),
                "cost": run.get("cost", 0.0),
            })

    # Sort by last activity (most recent first)
    sessions.sort(key=lambda x: x["lastActivity"], reverse=True)

    return {
        "sessions": sessions,
        "updatedAt": now.isoformat(),
    }


def build_costs_data(status_data: dict) -> dict:
    """Build costs-data.json from openclaw status."""
    now = datetime.now(timezone.utc)
    recent = status_data.get("sessions", {}).get("recent", [])

    # Aggregate by agent and model (include agent runs log)
    by_agent: Dict[str, Dict] = {}
    by_model: Dict[str, Dict] = {}
    total_cost = 0.0

    # Include completed agent runs in cost aggregation
    agent_runs = load_agent_runs()
    for run in agent_runs:
        if run.get("status") != "completed":
            continue
        agent = run.get("agent", "unknown").capitalize()
        model = run.get("model", "unknown")
        tokens = run.get("tokens", 0)
        cost = run.get("cost", 0.0) or estimate_cost(tokens, model)
        total_cost += cost

        if agent not in by_agent:
            by_agent[agent] = {"agent": agent, "tokens": 0, "cost": 0.0}
        by_agent[agent]["tokens"] += tokens
        by_agent[agent]["cost"] = round(by_agent[agent]["cost"] + cost, 4)

        if model not in by_model:
            by_model[model] = {"model": model, "tokens": 0, "cost": 0.0}
        by_model[model]["tokens"] += tokens
        by_model[model]["cost"] = round(by_model[model]["cost"] + cost, 4)

    for s in recent:
        key = s.get("key", "")
        agent, _ = classify_session(key)
        model = s.get("model", "unknown")
        tokens = s.get("totalTokens") or 0
        cost = estimate_cost(tokens, model)
        total_cost += cost

        # By agent
        if agent not in by_agent:
            by_agent[agent] = {"agent": agent, "tokens": 0, "cost": 0.0}
        by_agent[agent]["tokens"] += tokens
        by_agent[agent]["cost"] = round(by_agent[agent]["cost"] + cost, 4)

        # By model
        model_short = model.replace("claude-", "").replace("anthropic/", "")
        if model_short not in by_model:
            by_model[model_short] = {"model": model_short, "tokens": 0, "cost": 0.0}
        by_model[model_short]["tokens"] += tokens
        by_model[model_short]["cost"] = round(by_model[model_short]["cost"] + cost, 4)

    # Calculate day of month for projection
    day_of_month = now.day
    days_in_month = 30  # approximation
    daily_avg = total_cost / max(day_of_month, 1)
    projected = round(daily_avg * days_in_month, 2)

    return {
        "today": round(total_cost * 0.3, 2),  # rough: ~30% of visible sessions are today
        "yesterday": round(total_cost * 0.2, 2),
        "thisMonth": round(total_cost, 2),
        "lastMonth": 0,
        "projected": projected,
        "budget": BUDGET,
        "byAgent": sorted(by_agent.values(), key=lambda x: x["cost"], reverse=True),
        "byModel": sorted(by_model.values(), key=lambda x: x["cost"], reverse=True),
        "updatedAt": now.isoformat(),
    }


def main():
    print("🔄 Updating dashboard data...")

    # Get openclaw status
    status_data = get_openclaw_status()
    if not status_data:
        print("❌ Could not get openclaw status")
        sys.exit(1)

    # Build and write sessions data
    sessions_data = build_sessions_data(status_data)
    with open(SESSIONS_OUT, "w") as f:
        json.dump(sessions_data, f, indent=2)
    print(f"✅ Sessions: {len(sessions_data['sessions'])} sessions → {SESSIONS_OUT.name}")

    # Build and write costs data
    costs_data = build_costs_data(status_data)
    with open(COSTS_OUT, "w") as f:
        json.dump(costs_data, f, indent=2)
    print(f"✅ Costs: ${costs_data['thisMonth']:.2f} this month → {COSTS_OUT.name}")

    print("🎮 Dashboard updated!")


if __name__ == "__main__":
    main()
