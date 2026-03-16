---
description: Pick next task from a stream's ready queue
argument-hint: "<stream> (backend|web|mobile|data)"
allowed-tools:
  - Bash
  - Read
---

Show ready tasks for a specific development stream and help the user pick one.

<process>
1. Parse `$ARGUMENTS` to get the stream name (backend, web, mobile, or data)
2. If no stream specified, show all streams and ask user to pick one
3. Run: `gh issue list -l "stream:$ARGUMENTS" -l "status:ready" -s open --limit 10 --json number,title,labels`
4. If no ready tasks, fall back to: `gh issue list -l "stream:$ARGUMENTS" -s open --limit 10 --json number,title,labels`
5. Present the issues as numbered options
6. When user picks one, show the issue details: `gh issue view <number>`
7. Ask: "Start working on this? I'll comment on the issue and begin."
</process>
