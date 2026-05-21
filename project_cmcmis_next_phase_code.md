---
name: project-cmcmis-next-phase-code
description: Phase 4 ACTIVE from 2026-05-17 — SOFTWARE CODING. Phase 3 (PHASE3_COMPLETE_v2.0) is delivered + locked. Build the auth module first (E2E smoke test = the gate).
metadata: 
  node_type: memory
  type: project
  originSessionId: 4365bcb1-7e07-4521-8da8-e6524359a964
---

**Phase status timeline:**
- ✅ Phase 1 — Project scoping & overview (FINAL-DESC v1.0)
- ✅ Phase 2 — Tech stack, modules, roles, BRs (locked)
- ✅ Phase 3 — DB design + migration bundle (FINAL_DB_DESIGN_v2.0 + [[project-cmcmis-phase3-delivered]] PHASE3_COMPLETE_v2.0; runtime ready, 16 files, ~2,800 lines)
- 🟢 **Phase 4 — SOFTWARE CODING (ACTIVE from 2026-05-17)**

**User's authorization for Phase 4 (2026-05-17):** *"please refer this and REMEMBER THIS AND LOCKED THIS. next phase as phase 4 ----> software coding."*

## What Phase 4 means

Wire the application code on top of the locked DB. Start with the **auth module end-to-end** because nothing else can be reached without it.

## Phase 4 Build Order (Phase 3's migrations are DONE, skip those steps)

| Step | Deliverable | Notes |
|---|---|---|
| 4.0 | Repo scaffold: `/server`, `/web`, root `package.json`, `.env.example`, `.gitignore`, eslint+prettier+husky+lint-staged, vitest configs | If `/phase3` lives in repo root, decide whether to absorb it into `/server/migrations/` or leave standalone |
| 4.1 | BE — `modules/auth/{controller,service,repo,validators}.js` | login + refresh + logout endpoints; reads `users`, writes `login_audit` + `refresh_tokens` |
| 4.2 | BE — `middleware/{authenticate,authorize,rateLimit}.js` | JWT verify; `authorize('resource:action')` checks permission set from cache |
| 4.3 | BE — `modules/users/users.controller.js` | `GET /api/v1/me` |
| 4.4 | BE — `modules/admin/admin.controller.js` | Super Admin: list users, create user, change role, activate/deactivate |
| 4.5 | FE — `pages/login.jsx` + `lib/auth-context.jsx` + `components/ProtectedRoute.jsx` + `lib/api-client.js` (axios interceptors for JWT) | Per D1 = JSX not TSX |
| 4.6 | FE — `layouts/AppShell.jsx` + permission-filtered `Sidebar.jsx` | Reads `me.permissions` from auth-context |
| 4.7 | FE — `pages/admin/UsersList.jsx`, `AddUser.jsx`, `ChangeRole.jsx` | Calls 4.4 endpoints |
| 4.8 | **Smoke test the gate:** browser login SA79900, create DS00001, login DS00001, verify 403 on /admin/users | Acceptance for Phase 4.A |
| 4.9 | Equipment module BE+FE (register, verify, list, detail, history) | Cluster 3 + BR-EQP-* |
| 4.10 | Job Request module BE+FE | Cluster 4 + BR-JR-* |
| 4.11 | Job Card module BE+FE (incl. PDF generation) | Cluster 4 + BR-JC-* + BR-PDF-* |
| 4.12 | Dashboard + Inquiry | FR-D, FR-I |
| 4.13 | Hardening (NFR validation, security review, accessibility) | NFR catalogue |
| 4.14 | Deploy dry-run + handoff docs | D9 Nginx + PM2 |

## Style Mandate (re-affirm)

Every Phase 4 file uses **HIGH-COMMENT, HIGH-PRECISION** style per [[feedback-code-style-high-comments]]:
- File header comment (purpose, cluster, BR/FR/D refs, deps)
- Function header (1-line what + 1-line why + JSDoc + BR refs)
- Inline comments at every business-rule decision point, citing the rule ID
- JSDoc + Zod = the type system (D1: no TypeScript; files are `.js` / `.jsx`)
- SQL gets per-column `COMMENT` + section dividers + lock-ID refs

## Session Opening Protocol

When user says "let's start Phase 4" / "write the auth module" / similar:

1. State which step from above
2. Restate the BR/FR/D/ADR IDs being implemented
3. Show the file plan (which paths will be created/edited) BEFORE writing
4. Write with HIGH comments + cite IDs
5. End with a verification checklist (what passes = step done)

## Locked Inputs (no re-asking)

| Input | Value |
|---|---|
| Super Admin IDs | SA79900, AC77777 |
| Initial password | = employee_id (bcrypt cost 12 prod / 10 dev) |
| Admin section | SM_ID=9999 'ADMIN' 'System Administration' in cmms_section_mst |
| Tech stack | per [[project-cmcmis-tech-stack]] LOCKED v3 |
| DB schema | per [[project-cmcmis-db-v2-locked]] |
| Migration data | per [[project-cmcmis-db-v2-migration-answers]] |
| Migration bundle | per [[project-cmcmis-phase3-delivered]] |
| Folder structure | BE layered (D7) `routes/controllers/services/repositories/utils`; FE feature-based (D8) `features/<feature>/{api,components,pages,schemas,hooks}` |
| File extensions | `.js` and `.jsx` (per D1; Phase 3 doc casually said `.tsx` — D1 wins) |
| JWT | 15min access (HS256) |
| Refresh token | 7 days, httpOnly cookie, SameSite=Lax, sha256 hash in `refresh_tokens.token_hash` |
| Session | 60-min idle (sliding) |
| CSRF | double-submit token only on `/api/v1/auth/refresh` |
| Comment style | HIGH per [[feedback-code-style-high-comments]] |
| Shell | Bash only, never PowerShell (per [[feedback-shell-preference]]) |

## Pending User Inputs (none blocking 4.0–4.8)

- For 4.11+ (Job Card PDF): NABL/ISO 17025 cert template specifics still deferred per FINAL-DESC. Build generic `pdfService` first; template plugs in later.

## Disk State Reminder

As of locking (2026-05-17), Phase 3 bundle is **specified in PHASE3_COMPLETE_v2.0 doc** but the files may not yet be written to `e:/SOFTWAREs By DS/cmcmis-simplified/phase3/` on disk. Verify with `ls phase3/` before assuming `npm run migrate` works. If missing, Step 4.0 includes materializing the bundle from the spec.

See [[project-cmcmis-phase3-delivered]], [[project-cmcmis-db-v2-locked]], [[project-cmcmis-db-v2-migration-answers]], [[feedback-code-style-high-comments]], [[project-cmcmis-tech-stack]], [[project-cmcmis-business-rules]].
