# Oasis Snapshot Generator

Script CLI en Node.js/TypeScript que genera `data/snapshot.json` con el estado actual del swarm de agentes de Oasis Mission Control.

## Qué hace

- 📡 Consulta PRs de GitHub via `gh` CLI (no requiere tokens manuales)
- 📂 Lee tareas activas desde `.clawdbot/active-tasks.json` de repos locales
- 💓 Lee el estado del heartbeat de Percival
- 🔧 Ensambla un `snapshot.json` que consume el dashboard Phaser.js

## Requisitos

- Node.js >= 18
- `gh` CLI autenticado (`gh auth status`)
- TypeScript / ts-node (instalados como devDependencies)

## Instalación

```bash
cd generator
npm install
```

## Uso

```bash
# Generar snapshot con configuración por defecto
npm run generate

# O directamente con ts-node
npx ts-node src/index.ts

# Opciones
npx ts-node src/index.ts \
  --output ../data/snapshot.json \
  --repos CarlosDez23/JISBACK,CarlosDez23/jis-test-prep,MiniGalaxyMage/oasis-mission-control \
  --local-repos ~/dev/fdd/JISBACK,~/dev/fdd/jis-test-prep,~/dev/fdd/oasis-mission-control \
  --pretty
```

### Opciones CLI

| Opción | Por defecto | Descripción |
|--------|-------------|-------------|
| `--output <path>` | `../data/snapshot.json` | Ruta de salida del JSON |
| `--repos <list>` | `CarlosDez23/JISBACK,...` | Repos de GitHub a monitorizar (separados por coma) |
| `--local-repos <list>` | `~/dev/fdd/JISBACK,...` | Rutas locales de repos (para leer `.clawdbot/`) |
| `--pretty` | `true` | Formatear JSON con indentación |

## Fuentes de datos

### GitHub PRs (`github.ts`)
Usa `gh pr list` para consultar PRs de los repos configurados. Requiere `gh` autenticado.

### Tareas activas (`clawdbot.ts`)
Lee `.clawdbot/active-tasks.json` de cada repo local. Si el archivo no existe, continúa sin error.

Formato esperado:
```json
[
  {
    "id": "task-001",
    "branch": "feature/mi-feature",
    "title": "Descripción de la tarea",
    "agent": "forge-alpha",
    "status": "in-progress",
    "repo": "mi-repo",
    "retries": 0,
    "startedAt": "2026-02-27T10:00:00.000Z"
  }
]
```

### Heartbeat (`heartbeat.ts`)
Lee `~/.openclaw/workspace/memory/heartbeat-state.json`. Si no existe, reporta `status: error`.

## Output

El script genera `data/snapshot.json` (relativo a la raíz del proyecto). Ver el schema completo en `data/snapshot.schema.json`.

Ejemplo de salida:
```json
{
  "timestamp": "2026-02-27T12:00:00.000Z",
  "heartbeat": { "status": "ok", "minutesAgo": 15 },
  "agents": [...],
  "tasks": [...],
  "pullRequests": [...],
  "stats": { "prsToday": 3, "agentsActive": 2 }
}
```

## Estructura del código

```
generator/
  src/
    index.ts      ← Entry point CLI, orquesta todo
    github.ts     ← Consultas a GitHub via gh CLI
    clawdbot.ts   ← Lee .clawdbot/ y construye agentes/tareas
    heartbeat.ts  ← Lee estado del heartbeat
    snapshot.ts   ← Ensambla el JSON final
    types.ts      ← Interfaces TypeScript
  package.json
  tsconfig.json
  README.md
```

## Integración con heartbeat

Para ejecutar automáticamente en cada heartbeat, añadir a `HEARTBEAT.md`:
```markdown
- [ ] Generar snapshot: `cd ~/dev/fdd/oasis-mission-control/generator && npm run generate`
```
