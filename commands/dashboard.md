---
description: Show stream overview dashboard (read-only)
allowed-tools:
  - Read
  - Bash
---

Display the current multi-stream project state.

<process>
1. Read `.planning/STATE.md`
2. If the file is older than 1 hour, suggest running `/schwarm:sync` to refresh
3. Display the stream table with open/ready/blocked counts
4. Highlight any streams with `status:blocked` issues
5. Show the last shared package change timestamp
</process>
