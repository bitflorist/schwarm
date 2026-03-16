---
description: Show schwarm plugin usage guide and workflow overview
allowed-tools: []
disable-model-invocation: true
---

```
    🐝 SCHWARM — Multi-Agent Orchestration
    ═══════════════════════════════════════
    Streams · Chat · Pick · Sync · Setup
```

# Schwarm Plugin — Help

## Quick Start (5 Steps)

```
1. START    → git pull
2. PICK     → /schwarm:pick backend  (or frontend, mobile, data)
3. WORK     → Code in your stream's directory
4. SHIP     → Commit on main, gh issue close
5. END      → git status clean
```

## Commands

| Command | When to use |
|---------|-------------|
| `/schwarm:help` | You're reading it |
| `/schwarm:setup` | First time in a new project — creates labels + directories |
| `/schwarm:sync` | Refresh the STATE.md dashboard from GitHub Issues |
| `/schwarm:dashboard` | See all streams at a glance (reads STATE.md) |
| `/schwarm:pick <stream>` | Browse ready tasks for a stream and pick one |
| `/schwarm:chat <topic>` | Multi-model debate (Claude + Codex + Gemini) with you in the loop |

## Streams

Streams are configured in `.schwarm.json` at your project root. Default setup suggests common presets.

Example:
| Stream | What | Directory |
|--------|------|-----------|
| `stream:backend` | API, database, shared code | `src/api/`, `packages/shared/` |
| `stream:frontend` | Web frontend | `src/web/` |
| `stream:mobile` | Mobile app | `src/app/` |
| `stream:data` | Data pipelines, ML workers | `src/data/` |

Run `/schwarm:setup` to configure streams for your project.

## GSD or Task Mode?

```
Complex phase (>3 tasks, dependencies)  →  /gsd:execute-phase
Simple/medium task (single issue)       →  /schwarm:pick <stream>
Architecture decision                   →  /schwarm:chat <question>
```

**Rule:** Only ONE GSD session at a time. Multiple task sessions can run in parallel on different streams.

## Typical Workflows

### Solo developer, one stream
```
/schwarm:pick backend
→ Pick issue #42
→ Code → Test → Commit
→ gh issue close 42
```

### Two agents in parallel
```
Agent A: /gsd:execute-phase 1          (backend, complex)
Agent B: /schwarm:pick frontend        (frontend, simple task)
```

### Architecture decision
```
/schwarm:chat "WebSockets vs SSE for real-time updates?"
→ All models debate → You decide → Action items
```

## Key Rules

- All work on `main` branch — no feature branches per stream
- `git pull` at session start
- Shared code owned by backend stream — breaking changes need `shared:breaking` label
- GSD owns STATE.md writes — task sessions read only
