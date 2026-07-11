---
name: feedback-code-style-high-comments
description: "For CMCMIS code: HIGH-COMMENT mode — explain WHY heavily, beginner→advanced friendly. OVERRIDES the default 'no comments unless WHY is non-obvious'."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4365bcb1-7e07-4521-8da8-e6524359a964
---

**Rule:** When writing code for CMCMIS, use **HIGH-COMMENT, HIGH-PRECISION** style. This OVERRIDES my default "write no comments" instruction.

**Why:** User explicitly stated on 2026-05-17 when authorizing the code-writing phase: *"REAL TIME CODE WRITING WITH HIGH PRECISIONS AND HIGH COMMENTS BASED"*. User is an intern building his first production-grade system; he revises code as study material; he reads through every file as a learning exercise; comments serve both correctness and pedagogy.

**How to apply:**

- **File header comment:** every file gets a header block describing — file purpose, which cluster/module it belongs to, which BR/FR/D it implements, what depends on it.
- **Function header comment:** every exported function gets — what it does (1 line), why it exists (1 line), inputs/outputs in JSDoc form, BR/FR refs.
- **Inline comments at decision points:** every conditional / branch that encodes a business rule or non-obvious choice → comment with WHY + BR reference.
- **SQL files:** every CREATE TABLE column gets a `COMMENT` clause; every section divider uses the boxed `-- ───` style; lock decisions referenced by ID (e.g., `-- per D10: PENDING_VERIFICATION default`).
- **JSDoc + Zod:** since project uses JS not TS (per D1), JSDoc + Zod are the type system. Always include `@param`, `@returns`, `@throws`. Use `z.infer` patterns.
- **Reference the contract:** when implementing a constraint, cite the rule: `// BR-RBAC-02: PK on user_id enforces one-role-per-user at schema level`.
- **Avoid commenting WHAT** when the code is self-explanatory; do comment WHY for every business-rule branch.
- **Examples in comments:** for tricky regex / state-machine code, include a worked example.

**Verbosity calibration:**

| Code type | Comment density |
|---|---|
| Trivial getters/setters, glue code | Low (function header only) |
| Business logic, state transitions, RBAC checks | HIGH (inline at every decision point) |
| SQL migrations, schema DDL | VERY HIGH (per-column COMMENT + section dividers + lock-ID references) |
| Auth / security code | VERY HIGH (cite BR-AUTH-* / NFR-Security at every step) |
| Tests | Medium (describe the scenario; the assertions speak for themselves) |

**Anti-patterns to avoid even under high-comment mode:**

- Don't restate the obvious: `i++ // increment i` — never.
- Don't write doc-block essays — keep each comment block tight and scannable.
- Don't reference Claude / chat history in comments. Reference BRs, FRs, decision IDs (D1-D11), ADRs (ADR-DB-01..10).
- Don't leave TODOs without an owner — convert to a tracked issue or solve now.

See [[feedback-response-style]] (parent style preference), [[project-cmcmis-db-v2-locked]] (the contract being implemented), [[project-cmcmis-decisions]] (decision IDs to reference).
