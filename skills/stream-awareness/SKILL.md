---
name: stream-awareness
description: Multi-stream development awareness. Use when the user mentions streams, parallel work, picking tasks, or coordinating between development streams. Also use when deciding between GSD mode and task mode.
---

# Multi-Stream Development

This project uses parallel development streams. Each stream maps to specific directories and can be worked on by a separate agent session. Streams are configured in `.schwarm.json` at the project root.

## Streams

Streams are project-specific. Check `.schwarm.json` for this project's configuration. Common patterns:

| Stream | Typical directories | What it covers |
|--------|--------------------|----------------|
| `stream:backend` | `src/api/`, `packages/shared/` | API server, database, shared types |
| `stream:frontend` | `src/web/` | Web frontend |
| `stream:mobile` | `src/app/` | Mobile application |
| `stream:data` | `src/data/`, `src/workers/` | Data pipelines, ML workers |

## Execution Modes

### GSD Mode (complex phased work)
- Use `/gsd:execute-phase`, `/gsd:plan-phase` for multi-plan phases
- Only ONE GSD session at a time (STATE.md write lock)
- Wave parallelism within a phase (3 agents) is fine

### Task Mode (parallel simple/medium tasks)
- Use `gh issue list -l "stream:X" -l "status:ready"` to find work
- Multiple streams can run simultaneously
- Track via GitHub Issue comments + close when done
- Do NOT edit STATE.md (read-only for task mode)

## Rules
- All work on `main` branch
- `git pull` at session start
- Stay within your stream's directories
- Shared code changes: rebuild after edit, `shared:breaking` label for breaking changes
- Backend stream is primary owner of shared code
