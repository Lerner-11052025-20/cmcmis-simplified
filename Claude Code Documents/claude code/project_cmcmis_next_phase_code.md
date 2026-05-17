---
name: project-cmcmis-next-phase-code
description: "Phase 4 IS ACTIVE as of 2026-05-17 — real-time code writing with high-comment, high-precision style. Phase 3 (DB design v2.0) is LOCKED."
metadata: 
  node_type: memory
  type: project
  originSessionId: 4365bcb1-7e07-4521-8da8-e6524359a964
---

**Phase status timeline:**
- ✅ Phase 1 — Project scoping & overview (locked in FINAL-DESC v1.0)
- ✅ Phase 2 — Tech stack, modules, roles, BRs (locked)
- ✅ Phase 3 — DB design (locked in FINAL_DB_DESIGN_v2.0 on 2026-05-17)
- 🟢 **Phase 4 — REAL-TIME CODE WRITING (ACTIVE from 2026-05-17 onward)**

**User's exact words authorizing Phase 4:** *"next phase as -----> REAL TIME CODE WRITING WITH HIGH PRECISIONS AND HIGH COMMENTS BASED"*

## What "Phase 4" means in practice

Build the MVP one cluster at a time, code-first, with the locked DB design as the source of truth. No more design debates on items in [[project-cmcmis-db-v2-locked]] — write code that implements them.

## Build Order (suggested, can be reordered by user)

| Step | Deliverable | Reads from |
|---|---|---|
| 4.1 | Repo scaffold (root package.json, /server, /web, .env.example, eslint+prettier+husky+lint-staged, vitest config, .gitignore) | tech stack memory |
| 4.2 | The 11 migration files (001..010 + 099) per the locked bootstrap order | [[project-cmcmis-db-v2-locked]] + [[project-cmcmis-db-v2-migration-answers]] |
| 4.3 | Migration runner (Node script, idempotent, computes bcrypt for users seed) | M11 → BCRYPT_ROUNDS env |
| 4.4 | Cluster 1 backend: auth module end-to-end (login, refresh, logout, /me) | DB cluster 1 + BR-AUTH-* + BR-RBAC-* |
| 4.5 | Cluster 1 backend: admin module (user CRUD, role assign, activate/deactivate) | BR-RBAC-01, FR-A-06 |
| 4.6 | Cluster 1 frontend: login page + protected routes + sidebar permission filter | FR-A-04, FR-A-05 |
| 4.7 | Equipment module BE+FE (register + verify + list + detail + history) | cluster 3 + BR-EQP-* |
| 4.8 | Job Request module BE+FE (full lifecycle) | cluster 4 + BR-JR-* |
| 4.9 | Job Card module BE+FE (full lifecycle + PDF) | cluster 4 + BR-JC-* + BR-PDF-* |
| 4.10 | Dashboard + Inquiry | FR-D, FR-I |
| 4.11 | Hardening (NFR validation, security review, accessibility) | NFR catalogue |
| 4.12 | Deploy dry-run + handoff docs | D9 (Nginx) + PM2 |

## Style Mandate for Phase 4 Code

See [[feedback-code-style-high-comments]] — HIGH-COMMENT, HIGH-PRECISION mode is in effect. This OVERRIDES the default no-comments instruction.

## How to Open Each Code-Writing Session

When the user says "let's start Phase 4" or "write the X module" or similar:

1. Confirm which step from the build order
2. Restate the relevant BR/FR/D/ADR IDs being implemented
3. Show file plan (which files will be created/edited) before writing
4. Write with HIGH comments + ID references
5. End with a verification checklist (what should pass before this step is "done")

## Locked Inputs (no need to re-ask)

| Input | Value |
|---|---|
| Super Admin IDs | SA79900, AC77777 |
| Initial passwords | = employee_id (bcrypt cost 12 prod, 10 dev) |
| Admin section | SM_ID=9999 'ADMIN' 'System Administration' |
| Tech stack | per [[project-cmcmis-tech-stack]] (LOCKED v3) |
| DB design | per [[project-cmcmis-db-v2-locked]] |
| Migration data answers | per [[project-cmcmis-db-v2-migration-answers]] |
| Folder structure | per [[project-cmcmis-decisions]] D7 (BE layered) + D8 (FE feature-based) |
| Comment style | per [[feedback-code-style-high-comments]] (HIGH) |

## Pending Inputs (still need to ask user before specific steps)

- None blocking right now. Bootstrap can be written immediately.
- For Phase 4.11+: NABL/ISO 17025 cert template format (still deferred per FINAL-DESC).

See [[project-cmcmis-db-v2-locked]], [[project-cmcmis-db-v2-migration-answers]], [[feedback-code-style-high-comments]], [[project-cmcmis-tech-stack]], [[project-cmcmis-business-rules]].
