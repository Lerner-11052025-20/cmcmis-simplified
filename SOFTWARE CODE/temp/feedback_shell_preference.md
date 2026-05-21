---
name: feedback-shell-preference
description: "User wants the Bash tool (cmd/sh), NOT PowerShell, for all shell commands"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b9863bb4-3873-480d-9bae-b15d6a527c82
---

**Rule:** Always use the Bash tool for shell commands. NEVER use the PowerShell tool.

**Why:** User explicitly said "always use command prompt" when I tried to use PowerShell. He works on Windows but prefers the cmd/bash interface.

**How to apply:**
- Use the Bash tool for every shell command, even Windows-native checks.
- Use Bash-compatible syntax (avoid PowerShell-isms like `Get-Command`, `$env:VAR`, etc.).
- On Windows, the Bash tool runs through Git Bash / Cygwin-like environment — POSIX commands work.
- If a Windows-specific tool needs invoking, call its `.exe` directly via Bash.
