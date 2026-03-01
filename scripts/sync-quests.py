#!/usr/bin/env python3
"""
sync-quests.py — Genera quests-data.json desde las notas de backlog de Obsidian.

Escanea carpetas backlog/ de cada proyecto registrado y genera el JSON
que consume el Quest panel del dashboard.

Usage:
  python3 scripts/sync-quests.py
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional

# Proyectos registrados (vault_path: project_name)
PROJECTS = {
    os.path.expanduser("~/Documents/JIS/backlog"): "JIS",
    # Añadir más proyectos aquí:
    # os.path.expanduser("~/Documents/OtroProyecto/backlog"): "OtroProyecto",
}

OUTPUT = Path(__file__).parent.parent / "public" / "assets" / "room" / "quests-data.json"

# Mapping de status
STATUS_MAP = {
    "pendiente": "active",
    "en-spec": "active",
    "en-progreso": "active",
    "completado": "completed",
}

# Mapping de prioridad
PRIORITY_MAP = {
    "feature": "main",
    "bugfix": "main",
    "refactor": "side",
    "mejora": "side",
}

# XP por tipo
XP_MAP = {
    "feature": 200,
    "bugfix": 150,
    "refactor": 100,
    "mejora": 100,
}

# Assignee mapping
ASSIGNEE_MAP = {
    "forge": "forge",
    "sprite": "sprite",
    "percival": "percival",
}


def parse_frontmatter(filepath: Path) -> Optional[Dict]:
    """Parse YAML frontmatter from a markdown file."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception:
        return None

    # Extract frontmatter between --- markers
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", content, re.DOTALL)
    if not match:
        return None

    frontmatter_text = match.group(1)
    body = match.group(2).strip()

    # Simple YAML parser (no dependency)
    fm = {}
    for line in frontmatter_text.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("- "):
            # List item — append to last key
            if "_last_key" in fm:
                key = fm["_last_key"]
                if not isinstance(fm[key], list):
                    fm[key] = []
                fm[key].append(line[2:].strip())
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            fm[key] = value if value else []
            fm["_last_key"] = key

    fm.pop("_last_key", None)
    fm["_body"] = body
    fm["_filename"] = filepath.stem
    return fm


def frontmatter_to_quest(fm: Dict, project: str, index: int) -> Dict:
    """Convert parsed frontmatter to a quest entry."""
    title = fm.get("title", fm.get("_filename", "Unknown"))
    task_type = fm.get("type", "feature")
    status = STATUS_MAP.get(fm.get("status", "pendiente"), "active")
    priority = PRIORITY_MAP.get(task_type, "side")
    assignee = None
    
    # Check assignee field
    raw_assignee = fm.get("assignee", "")
    if raw_assignee and raw_assignee in ASSIGNEE_MAP:
        assignee = ASSIGNEE_MAP[raw_assignee]

    # Description: first line of body or title
    body = fm.get("_body", "")
    description = body.split("\n")[0].strip("# ").strip() if body else title

    xp = XP_MAP.get(task_type, 100)
    
    quest = {
        "id": "quest-%s-%03d" % (project.lower(), index),
        "title": title,
        "description": description,
        "status": status,
        "priority": priority,
        "assignee": assignee,
        "project": project,
        "reward": "%d XP" % xp,
    }

    # Add completion date if completed
    completed_at = fm.get("completedAt", fm.get("date", ""))
    if status == "completed" and completed_at:
        quest["completedAt"] = completed_at

    return quest


def scan_backlogs() -> List[Dict]:
    """Scan all registered backlog folders and return quests."""
    quests = []
    
    for backlog_path, project_name in PROJECTS.items():
        folder = Path(backlog_path)
        if not folder.exists():
            continue
        
        index = 1
        for md_file in sorted(folder.glob("*.md")):
            fm = parse_frontmatter(md_file)
            if fm is None:
                continue
            
            # Only process files with task tag or status field
            tags = fm.get("tags", [])
            if isinstance(tags, str):
                tags = [tags]
            
            if "task" not in tags and "status" not in fm:
                continue
            
            quest = frontmatter_to_quest(fm, project_name, index)
            quests.append(quest)
            index += 1
    
    return quests


def main():
    print("🔄 Syncing quests from Obsidian backlogs...")
    
    quests = scan_backlogs()
    
    # Sort: active first, then by project
    quests.sort(key=lambda q: (0 if q["status"] == "active" else 1, q["project"], q["title"]))
    
    data = {
        "quests": quests,
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    active = sum(1 for q in quests if q["status"] == "active")
    completed = sum(1 for q in quests if q["status"] == "completed")
    print("✅ %d quests (%d active, %d completed) → %s" % (len(quests), active, completed, OUTPUT.name))


if __name__ == "__main__":
    main()
