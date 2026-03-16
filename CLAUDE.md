# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**schwarm** (`@bitflorist/schwarm`) is a Claude Code plugin for multi-stream orchestration — enabling parallel development across configurable streams with multi-model deliberation (Claude + Codex + Gemini). Published to npm as a scoped package.

## Development Commands

Default to **Bun** instead of Node.js for all commands.

```sh
bun install              # Install dependencies
bun test                 # Run tests (bun:test)
bun src/orchestrator.ts  # Run orchestrator directly
bun ./bin/run            # Run via CLI entry point
```

Type-check only (no emit):
```sh
bunx tsc --noEmit
```

## Architecture

### Plugin Structure (Claude Code plugin conventions)

- `.claude-plugin/plugin.json` — Plugin metadata and registration
- `hooks/hooks.json` — SessionStart hook runs `scripts/preflight.sh`
- `commands/*.md` — Slash commands: help, pick, chat, setup, sync, dashboard
- `skills/*/SKILL.md` — Auto-loading skills: stream-awareness, deliberation
- `agents/task-executor.md` — Agent template for parallel task execution
- `config/agents.json` — LLM agent configs (Claude, Codex, Gemini)
- `bin/run` — CLI entry point

### Core: Orchestrator (`src/orchestrator.ts`)

The main engine — a multi-LLM agent dispatcher with CLI subcommands:

| Command | Purpose |
|---------|---------|
| `dispatch <agent> <prompt>` | Send to single agent |
| `fanout <agents\|all> <prompt>` | Parallel dispatch to multiple agents |
| `deliberate <prompt> [--rounds N]` | Full consensus loop (default 3 rounds) |
| `synthesize [session-id]` | Build consensus prompt from agent responses |
| `streams` | Show status across all streams (from GitHub Issues) |
| `pick <stream>` | Pick next task for a stream |

**Key flow**: `deliberate` calls `fanout` → all agents respond in parallel → `buildConsensusPrompt` synthesizes → Claude judges consensus → repeats if NO consensus.

**Agent execution model**: Each LLM runs as a CLI subprocess in a neutral `/tmp` working directory to prevent project config leakage. Agents configured in `config/agents.json`.

**Sessions**: Stored in `sessions/<id>/` with `session.json`, per-agent responses as `.md`, and consensus prompts/verdicts per round.

### Configuration

Projects configure streams in `.schwarm.json`:
```json
{
  "streams": [
    { "name": "backend", "dirs": ["src/api/"] },
    { "name": "frontend", "dirs": ["src/web/"] }
  ],
  "sharedDir": "packages/shared/src"
}
```

### Design Decisions

- **GitHub Issues as SSOT** — All task state lives in GitHub Issues with stream labels and status labels. The plugin never owns task state.
- **Configurable streams** — Streams defined per-project in `.schwarm.json`, not hardcoded.
- **Zero production dependencies** — Only `@types/bun` as devDep
- **No build step** — Pure TypeScript, runs directly via Bun
- **GSD-compatible** — Reads `.planning/` state but never writes GSD state

### Shell Scripts (`scripts/`)

- `preflight.sh` — SessionStart hook: checks git freshness, lockfile changes, shared code staleness
- `setup-labels.sh` — Idempotent GitHub label creation (stream/status labels)
- `sync-state.sh` — Regenerates `.planning/STATE.md` dashboard from GitHub Issues

All scripts require `gh` CLI to be authenticated.

## Conventions

- ES Modules (`"type": "module"` in package.json)
- TypeScript strict mode, ESNext target, bundler module resolution
- Use `node:*` prefixed imports for Node built-ins
- Bun APIs preferred: `Bun.file` over `node:fs`, `bun:sqlite` over `better-sqlite3`
