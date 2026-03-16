---
description: Initialize schwarm labels and directories for a new project
allowed-tools:
  - Bash
  - Write
  - Read
---

First-time setup for multi-stream project management. Creates GitHub labels, stream directories, and rules template.

<process>
1. Run the setup script: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup-labels.sh`
2. Create stream directories: `mkdir -p .planning/streams/{backend,web,mobile,data}`
3. If `.claude/rules/multi-stream.md` does not exist, copy the template:
   `cp ${CLAUDE_PLUGIN_ROOT}/templates/rules/multi-stream.md .claude/rules/multi-stream.md`
4. Run initial sync: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/sync-state.sh`
5. Display the generated STATE.md
6. Tell user: "Multistream setup complete. Label your open issues with stream:X labels, then run /schwarm:sync."
</process>
