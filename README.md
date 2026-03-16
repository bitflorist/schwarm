```
                  *  .  *
               .  *  🐝  *  .
            *    .  .  .  .    *
         .    *   *   *   *    .
       *   .    .   .   .    .   *
     .   *   *   *   *   *   *   .
    ───────────────────────────────
    ██████  ██████ ██   ██ ██   ██
    ██      ██     ██   ██ ██   ██
    ███████ ██     ███████ ██ █ ██
         ██ ██     ██   ██ ██ █ ██
    ██████  ██████ ██   ██  █████
              A    R    M
    ───────────────────────────────
     .   *   *   *   *   *   *   .
       *   .    .   .   .    .   *
         .    *   *   *   *    .
            *    .  .  .  .    *
               .  *     *  .
                  *  .  *
```

# schwarm

**Multi-agent orchestration plugin for Claude Code.**

Parallel development streams. Multi-model deliberation. Swarm intelligence for your codebase.

[![npm](https://img.shields.io/npm/v/@bitflorist/schwarm)](https://www.npmjs.com/package/@bitflorist/schwarm)
[![license](https://img.shields.io/github/license/bitflorist/schwarm)](LICENSE)

---

## What it does

- **Streams** — Run multiple development streams in parallel (backend, frontend, mobile, data)
- **Chat** — Multi-model deliberation: Claude + Codex + Gemini debate with you in the loop
- **PM** — GitHub Issues as SSOT, with stream labels and status tracking
- **GSD-compatible** — Works alongside Get Shit Done framework

## Install

```bash
# In Claude Code:
/plugin marketplace add bitflorist/schwarm
/plugin install schwarm@schwarm
```

Or load directly during development:
```bash
claude --plugin-dir ./path/to/schwarm
```

Or add as git submodule:
```bash
git submodule add https://github.com/bitflorist/schwarm tools/schwarm
claude --plugin-dir ./tools/schwarm
```

## Quick Start

```
/schwarm:setup                          # First time: creates labels + streams
/schwarm:pick backend                   # Pick a task from a stream
# ... code, test, commit ...
gh issue close 42                       # Done
```

## Commands

| Command | What it does |
|---------|-------------|
| `/schwarm:help` | Usage guide and workflow overview |
| `/schwarm:setup` | First-time project setup (labels, directories) |
| `/schwarm:sync` | Regenerate STATE.md dashboard from GitHub Issues |
| `/schwarm:dashboard` | Show all streams at a glance |
| `/schwarm:pick <stream>` | Pick next task from a stream |
| `/schwarm:chat <topic>` | Multi-model deliberation with human-in-the-loop |

## Streams

Streams are configurable per project via `.schwarm.json`:

```json
{
  "streams": [
    { "name": "backend", "dirs": ["src/api/", "packages/shared/"] },
    { "name": "frontend", "dirs": ["src/web/"] },
    { "name": "mobile", "dirs": ["src/app/"] },
    { "name": "data", "dirs": ["src/data/"] }
  ]
}
```

No config file? `/schwarm:setup` walks you through it.

## Multi-Model Chat

```
/schwarm:chat "Should we use WebSockets or SSE?"
```

Claude moderates. Codex + Gemini respond in parallel. You decide.

- `continue` — go deeper
- `redirect` — change the question
- `lead codex` — shift intellectual leadership
- `ground` — ask models to prove their claims
- `done` — exit with summary

Principles: uncertainty-first (`[UNKNOWN]` > guessing), evidence-based (`[FACT]` with file paths), mandatory minority report.

## GSD Compatible

Schwarm works alongside GSD (`/gsd:*` commands):

| Mode | When | Tool |
|------|------|------|
| **GSD** | Complex phased work (>3 tasks) | `/gsd:execute-phase` |
| **Schwarm** | Parallel simple tasks | `/schwarm:pick <stream>` |
| **Chat** | Architecture decisions | `/schwarm:chat <topic>` |

Rule: Only ONE GSD session at a time. Multiple schwarm task sessions can run in parallel.

## Requirements

- Claude Code >= 1.0.33
- `gh` CLI authenticated
- Git repository with GitHub remote

### Optional (for /schwarm:chat)

- Codex CLI, Gemini CLI, or Auggie CLI

## License

MIT — made by [@bitflorist](https://github.com/bitflorist)
