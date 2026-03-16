# Changelog

## 0.1.0 (2026-03-16)

Initial release.

- 6 commands: `/schwarm:help`, `/schwarm:setup`, `/schwarm:sync`, `/schwarm:dashboard`, `/schwarm:pick`, `/schwarm:chat`
- 2 skills: stream-awareness (auto-loaded), deliberation (uncertainty-first debate)
- 1 agent: task-executor (non-GSD parallel task execution)
- Multi-model orchestrator: fanout, dispatch, deliberate (Claude + Codex + Gemini)
- SessionStart hook: preflight checks (git sync, lockfile, shared package freshness)
- GSD-compatible: reads .planning/ but never writes GSD state
- Configurable streams via `.schwarm.json`
