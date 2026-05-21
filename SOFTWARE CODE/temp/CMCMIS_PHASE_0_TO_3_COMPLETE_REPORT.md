# CMCMIS — PHASE 0 → PHASE 3 · COMPLETE REPORT

> **Computerized Maintenance & Calibration Management Information System**
> End-to-end consolidation of every decision, design, and deliverable from project genesis through database runtime readiness.
>
> **Document version:** v1.0 · **Date:** 2026-05-17 · **Owner:** Harsh Khanna (Software Developer Intern)
> **Authority chain:** FINAL-DESC-CMCMIS v1.0 → FINAL_DB_DESIGN_v2.0 → PHASE3_COMPLETE_v2.0 → this report (consolidation only)
> **Status:** Phases 0, 1, 2, 3 = 🟢 ALL LOCKED · Phase 4 (software coding) = ready to begin

---

## TABLE OF CONTENTS

```
PART 0 — GENESIS & MANDATE
   0.1  Why this system exists
   0.2  Organisation context (ISRO SAC-style)
   0.3  Pain points being solved
   0.4  The mandate (who's building what, for whom, by when)
   0.5  Success criteria

PART 1 — PROJECT FOUNDATION (Phase 1)
   1.1  Project identity (the CMCMIS card)
   1.2  Domain glossary (T&ME, F&PE, calibration, AMC…)
   1.3  Stakeholders & users
   1.4  The lifecycle pipeline (one diagram)
   1.5  The 9 modules — block diagram + table
   1.6  The 5 roles — hierarchy + override
   1.7  MVP vs Phase 2 — what ships in 10 weeks
   1.8  Constraints (the hard NOs)
   1.9  The 10-week timeline

PART 2 — ARCHITECTURE & CONTRACTS (Phase 2)
   2.1  Tech stack v3 (locked)
   2.2  Production topology
   2.3  Layered request flow (BE)
   2.4  Symmetry — shared zod + dayjs
   2.5  Folder structures (FE feature / BE layered)
   2.6  Architectural Decision Register (D1–D11, C1–C5, +6 stack adds)
   2.7  API design conventions
   2.8  Business Rules (BR catalogue)
   2.9  Functional Requirements (FR catalogue)
   2.10 Non-Functional Requirements (NFR targets)
   2.11 Security model (7 layers)
   2.12 State machines (Auth, Equipment, JR, JC)

PART 3 — PHASE 3 DAY 1: LEGACY DB AUDIT
   3.1  Database snapshot
   3.2  The 6 critical BR-violations (🔴)
   3.3  The 4 decisions needed (🟡)
   3.4  The orphan candidates (🟣)
   3.5  The insight that produced the two-universe strategy

PART 4 — PHASE 3 DAY 2: DB DESIGN v2.0 LOCKED
   4.1  Authority chain
   4.2  The two-universe strategy
   4.3  Naming conventions
   4.4  The 15 NEW tables
   4.5  The 6 ALTERed legacy tables
   4.6  The 26 ISOLATED `_legacy_*` tables
   4.7  The 32 KEPT-as-is tables
   4.8  Architectural Decision Records (ADR-DB-01 … ADR-DB-10)
   4.9  Password policy (the exact spec)
   4.10 The 3-layer RBAC model
   4.11 Permission catalogue + role grant matrix
   4.12 Bootstrap seed order (10 deterministic steps)
   4.13 M1–M12 migration data answers
   4.14 ERD walk-through

PART 5 — PHASE 3 DAY 3: BUNDLE DELIVERED
   5.1  What was shipped (16 files, ~2,800 lines)
   5.2  Disk layout (verified)
   5.3  File-by-file walkthrough (all 12 migrations)
   5.4  Migration runner architecture
   5.5  npm scripts
   5.6  14-check verification suite
   5.7  7 end-to-end tests
   5.8  5-step quickstart for DS
   5.9  5 layers of idempotency
   5.10 Recovery & troubleshooting matrix
   5.11 Migration → v2.0 design cross-reference

PART 6 — SYNTHESIS
   6.1  Authority chain (one diagram)
   6.2  Cross-reference cheat sheet
   6.3  Decision-making compass
   6.4  What's locked at every layer
   6.5  Phase 4 hand-off
   6.6  One-page mental model

APPENDIX A — Locked terminology
APPENDIX B — File index (every doc + code path)
APPENDIX C — Acronyms
```

---

# PART 0 — GENESIS & MANDATE

---

## 0.1 Why this system exists

```
   ┌────────────────────────────────────────────────────────────────────┐
   │   THE ONE-SENTENCE PITCH                                           │
   ├────────────────────────────────────────────────────────────────────┤
   │                                                                    │
   │   "Replace the org's paper / spreadsheet / fragmented-tool         │
   │    workflow for laboratory-instrument lifecycle with one           │
   │    permission-driven, audit-tracked, on-prem MIS — built for       │
   │    defence-grade R&D, ship-able in 10 weeks by a single intern."   │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘
```

## 0.2 Organisation context

| Attribute | Value |
|---|---|
| Org type | **ISRO SAC-style** — government / technical / defence-grade R&D |
| Deployment reality | **On-prem only.** No AWS / Azure / GCP. No public cloud SDKs. No email-out. |
| Lab makeup | **T&ME** (Test & Measurement Equipment — multimeters, oscilloscopes, spectrum analysers) + **F&PE** (Functional & Performance Equipment — chambers, fixtures, power supplies) |
| User profile | Engineers, lab in-charges, normal users — **technical, daily users**, NOT consumer-style users |
| Compliance posture | Adjacent to NABL / ISO 17025 / AS9100 (specifics deferred to user; arch must be ready) |
| Risk posture | Cannot tolerate data loss, ambiguity in equipment state, or audit gaps |

## 0.3 Pain points being solved

| Stakeholder | Pain CMCMIS fixes |
|---|---|
| **Lab engineers** | Paper job cards get lost; no automated cal-due reminders; manual cert typing |
| **Lab in-charge** | No visibility on queue, engineer workload, overdue calibrations, pending verifications |
| **Super Admin / mgmt** | No audit trail; can't answer "who calibrated what, when, with what reading" |
| **Audit / compliance** | Cannot reconstruct equipment history; cert re-issue is manual |
| **Org IT** | Disparate tools, no central RBAC, no SSO-readiness, no API layer |

## 0.4 The mandate

| Field | Value |
|---|---|
| Lead | **Harsh Khanna** — Software Developer Intern |
| Team size | Solo developer + Claude (AI pair) |
| Timeline | **10 weeks** total internship |
| Project nature | **Real production system**, not a college / prototype project |
| Working directory | `e:\SOFTWAREs By DS\cmcmis-simplified` |
| AI pair role | Senior engineer mentoring Harsh through design + implementation |
| Career stake | First big professional project — career-defining |

## 0.5 Success criteria

```
   ┌──────────────────────────────────────────────────────────────┐
   │  WEEK 10 DEMO PASSES IF:                                     │
   ├──────────────────────────────────────────────────────────────┤
   │                                                              │
   │  ☐ SA79900 (Super Admin) logs in cleanly                     │
   │  ☐ Super Admin can add a Normal User                         │
   │  ☐ Normal User can register a new equipment                  │
   │  ☐ Lab In-Charge can verify (PENDING → ACTIVE)               │
   │  ☐ Normal User can raise a job request                       │
   │  ☐ Lab In-Charge approves + assigns engineer                 │
   │  ☐ Engineer executes job card, fills readings                │
   │  ☐ Lab In-Charge verifies + closes                           │
   │  ☐ PDF certificate downloads on demand                       │
   │  ☐ Dashboard shows live KPIs                                 │
   │  ☐ Inquiry searches across 4 entities                        │
   │  ☐ Every write op is in audit_log                            │
   │  ☐ View-Only user can read everything but write nothing      │
   │  ☐ p95 API < 500ms · cold load < 3s · uptime architecture    │
   │     in place                                                 │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘
```

---

# PART 1 — PROJECT FOUNDATION (Phase 1)

---

## 1.1 Project Identity

| Field | Value |
|---|---|
| Acronym | **CMCMIS** = Computerized Maintenance & Calibration Management Information System |
| Domain | Laboratory instrument lifecycle for T&ME + F&PE |
| Status | Real production project (defence/space-grade) |
| Working dir | `e:\SOFTWAREs By DS\cmcmis-simplified` |
| Today | 2026-05-17 |

## 1.2 Domain Glossary

> Read this once and the rest of the report is much easier.

| Term | Definition |
|---|---|
| **T&ME** | Test & Measurement Equipment — measures something. MUST have calibration frequency. |
| **F&PE** | Functional & Performance Equipment — does/performs something. Calibration frequency optional. |
| **Calibration** | Comparing an instrument's reading against a reference standard, recording deviation, certifying it. |
| **Calibration frequency** | How often (in months) the instrument must be recalibrated. |
| **`next_cal_due_date`** | `last_cal_date + calibration_frequency_months` — drives dashboard alerts. |
| **Out-of-tolerance** | Instrument reading exceeds allowed limits → flagged; may trigger reverse-investigation of all measurements taken since the last good cal. |
| **Job Request (JR)** | Intake ticket — "please calibrate / repair / register this". |
| **Job Card (JC)** | Execution artefact — created when JR is approved + engineer assigned. |
| **PM** | Preventive Maintenance — scheduled, non-corrective servicing. |
| **AMC** | Annual Maintenance Contract — vendor-side service agreement. |
| **NABL / ISO 17025 / AS9100** | Accreditation standards. **Not in MVP** — user will instruct when needed. |
| **Standards used** | Reference instruments used to calibrate another; required on cert. |
| **Uncertainty** | Numeric error band of a measurement, reported on cert. MVP = placeholder fields. |
| **Condemn** | Status flip to mark equipment unfit for further use (soft delete). |
| **PENDING_VERIFICATION** | Default state of a freshly-registered equipment until Lab In-charge / Super Admin verifies. |
| **TIMCD** | Test/Inspection/Maintenance/Calibration Division — parent department. |

## 1.3 Stakeholders & Users

```
                    ┌──────────────────────┐
                    │   Super Admin (×2)   │ ◄── seeded: SA79900, AC77777
                    │ Ultimate authority   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Lab In-charge      │ ◄── approves, verifies, closes
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Lab Engineer       │ ◄── executes job cards
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Normal User        │ ◄── raises JRs, registers equipment
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   View-Only User     │ ◄── reads all, writes NOTHING
                    └──────────────────────┘
```

> **Locked:** there is **NO separate "Admin" role** — Super Admin is the only admin tier.

## 1.4 The Lifecycle Pipeline

```
         ┌──────────────┐
         │  REGISTER    │ ◄── any role except View-Only
         │  equipment   │     defaults to PENDING_VERIFICATION
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │   VERIFY     │ ◄── Lab In-charge / Super Admin
         │ → ACTIVE     │
         └──────┬───────┘
                │
   ┌────────────┼─────────────┬──────────────┐
   ▼            ▼             ▼              ▼
┌────────┐ ┌──────────┐ ┌──────────┐  ┌──────────────┐
│ JOB    │ │   PM     │ │  REPAIR  │  │ OUT-OF-TOL / │
│REQUEST │ │ Schedule │ │  ticket  │  │  QUARANTINE  │
│(cal/   │ │ (Phase2) │ │          │  │              │
│ rep/   │ └──────────┘ └──────────┘  └──────────────┘
│ reg)   │
└───┬────┘
    │
┌───▼──────────────────┐
│ JOB CARD (auto)      │
│ Lab Engineer executes│
│ readings + tasks     │
└───┬──────────────────┘
    │
┌───▼─────────────────┐        ┌────────────────┐
│ Lab In-charge       │───────►│ PDF Cert       │
│ VERIFY / CLOSE      │        │ (on demand)    │
└───┬─────────────────┘        └────────────────┘
    │
┌───▼─────────────────┐
│ Equipment → ACTIVE  │
│ next_cal_due        │
│   recomputed        │
└─────────────────────┘
```

## 1.5 The 9 Modules

### Block diagram

```
                       ┌────────────────────────┐
                       │   AUTH + RBAC layer    │  ← BLOCK 1 foundation
                       │ (login, JWT, perms)    │
                       └────────────┬───────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌────────────────┐   ┌────────────────┐    ┌────────────────────┐
   │  EQUIPMENT     │   │  JOB REQUESTS  │    │   JOB CARDS        │
   │  (master)      │◄──┤  (intake)      ├───►│ (execution)        │  ← BLOCK 2 core
   └───────┬────────┘   └───────┬────────┘    └─────────┬──────────┘
           │                    │                       │
           │            ┌───────▼───────┐               │
           └───────────►│   AUDIT LOG   │◄──────────────┘
                        │  (generic)    │
                        └───────┬───────┘
                                │
            ┌───────────────────┼────────────────────┐
            ▼                                        ▼
   ┌────────────────┐                     ┌────────────────────┐
   │  DASHBOARD     │                     │  INQUIRY (search)  │   ← BLOCK 3 surface
   │  (read-only)   │                     │  4-tab interface   │
   └────────────────┘                     └────────────────────┘

   ┌──────────────────────────────────────────────────────────────┐
   │  PHASE 2 (out of MVP): Schedule, Procurement, Vendors,       │
   │  Reports, Admin master-data CRUD UI, Notifications           │
   └──────────────────────────────────────────────────────────────┘
```

### Module table

| # | Module | MVP? | Owner role | Notes |
|---|---|---|---|---|
| 1 | Dashboard | ✅ | All (role-aware) | KPIs, cal-due alerts, engineer workload |
| 2 | Job Requests | ✅ | Normal+ creates; Lab In-charge approves | DRAFT → SUBMITTED → … |
| 3 | Job Cards | ✅ | Engineer executes; Lab In-charge closes | Auto-created on JR approval |
| 4 | Equipment | ✅ | All except View-Only can register | PENDING_VERIFICATION default |
| 5 | Schedule | ❌ Phase 2 | — | PM + cal calendar |
| 6 | Procurement | ❌ Phase 2 | — | POs, spares |
| 7 | Vendors | ❌ Phase 2 | — | Master data |
| 8 | Inquiry | ✅ | All (read) | 4-tab search hub |
| 9 | Reports | ❌ Phase 2 | — | Analytics + exports |
| 10 | Admin | Partial | Super Admin | RBAC in MVP; master-data CRUD UI Phase 2 |

## 1.6 The 5 Roles (locked, final)

```
Level | Role            | Can do                                              | Cannot do
------|-----------------|-----------------------------------------------------|------------------
  5   | Super Admin     | Everything; assign roles; master data CRUD          | (nothing — top)
  4   | Lab In-charge   | Approve JR, verify equipment, close/reopen JC       | Assign roles
  3   | Lab Engineer    | Execute job cards, fill readings                    | Approve, verify
  2   | Normal User     | Raise JR, register equipment                        | Approve, execute
  1   | View-Only User  | READ all visible data                               | Any write
```

> **Special override (LOCKED):** `equipment:create` is granted to **all roles except View-Only** — even Normal Users can register new equipment; it then sits in `PENDING_VERIFICATION` until Lab In-charge / Super Admin verifies.

## 1.7 MVP vs Phase 2

### MVP delivery in 3 blocks

```
┌────────────────────────────────────────────────────────────────┐
│ BLOCK 1 — AUTH + RBAC (foundation, ships first)                │
│ Login • JWT • sessions • permissions • protected routes •      │
│ sidebar visibility • SSO-ready architecture                    │
└────────────────────┬───────────────────────────────────────────┘
                     ▼
┌────────────────────────────────────────────────────────────────┐
│ BLOCK 2 — OPERATIONAL HEART                                    │
│ Equipment master + register • Job Request lifecycle •          │
│ Job Card lifecycle • PDF generation • Audit log                │
└────────────────────┬───────────────────────────────────────────┘
                     ▼
┌────────────────────────────────────────────────────────────────┐
│ BLOCK 3 — DEMO SURFACE                                         │
│ Dashboard (role-aware KPIs + alerts) • Inquiry 4-tab search    │
└────────────────────────────────────────────────────────────────┘
```

### What's IN vs OUT

| ✅ MVP IN (10 weeks) | ❌ Phase 2 OUT (post-internship) |
|---|---|
| Auth + RBAC | Schedule module |
| Equipment master + register + verify | Procurement |
| Job Requests | Reports |
| Job Cards | Admin master-data CRUD UI |
| Dashboard | Notifications (any channel) |
| Inquiry (4-tab) | NABL / ISO 17025 cert templates |
| PDF generation (download only) | Compliance specifics |
| Audit log (basic) | Mobile / tablet UI |
| Responsive UI (desktop + laptop) | |

## 1.8 Constraints (hard NOs)

| # | Constraint | Decision |
|---|---|---|
| 1 | SSO in v1 | ❌ — employee_id + password; SSO-ready arch only |
| 2 | Public cloud (AWS/Azure/GCP) | ❌ — on-prem only |
| 3 | File storage / uploads | ❌ — PDFs on-demand, never stored |
| 4 | Email / SMTP | ❌ |
| 5 | Redis / cache | ❌ — SQL + pagination + pool only |
| 6 | Backup infra | ❌ — user handles |
| 7 | Mobile / tablet | ❌ — desktop + laptop only |
| 8 | Barcode / QR | ❌ |
| 9 | TypeScript | ❌ — JS + JSDoc + Zod |
| 10 | ORM | ❌ — raw SQL via mysql2/promise |
| 11 | PDF generation | ✅ — generated on demand |
| 12 | Sensitive data handling | ✅ — RBAC + row-level visibility + secure sessions + limited exports |
| 13 | Compliance specifics | TBD — user instructs |
| 14 | Notifications | TBD — user instructs |

## 1.9 The 10-week timeline (indicative)

```
Week 1  ┃ Repo scaffold, env, lint/format, husky, vitest, CI minimal
Week 2  ┃ DB Phase 3 finish — new cmcm_/snake_case schema design + migrations
Week 3  ┃ BLOCK 1: Auth + RBAC end-to-end (BE + FE login + sidebar filter)
Week 4  ┃ Equipment module (list, register, verify, history)
Week 5  ┃ Job Requests module (create, draft, submit, approve/reject)
Week 6  ┃ Job Cards module (auto-create, execute, transitions, observations)
Week 7  ┃ PDF service + cert + JC PDF + audit log integration
Week 8  ┃ Dashboard (KPIs, alerts, charts) + Inquiry (4-tab search)
Week 9  ┃ Hardening: NFR validation, security review, accessibility, UAT prep
Week 10 ┃ Deployment dry-run on staging, demo polish, handoff docs
```

---

# PART 2 — ARCHITECTURE & CONTRACTS (Phase 2)

---

## 2.1 Tech stack v3 (LOCKED)

### Frontend (React 18 + Vite + Tailwind v3)

| Concern | Lib | Why |
|---|---|---|
| Build | `vite` | Fast HMR, modern default |
| Framework | `react@18` | Locked |
| Routing | `react-router-dom@v6` | Standard SPA |
| Local state | `useState` / `useReducer` | Built-in |
| Global state | `zustand` | ~1KB, no boilerplate |
| Server state | `@tanstack/react-query` | Caching, mutations |
| HTTP | `axios` | Interceptors for JWT + errors |
| Forms | `react-hook-form` + `zod` | Schema shared with BE |
| Tables | `@tanstack/react-table` | Headless sort/filter/paginate |
| Tailwind plugin | `@tailwindcss/forms` | Sane form defaults |
| Icons | `lucide-react` | Tree-shakable |
| Charts | `recharts` | Dashboard widgets |
| Date | `dayjs` | Same as BE → symmetry |
| Toasts | `sonner` | Lightweight |
| Lint/Format | `eslint` + `prettier` + `husky` + `lint-staged` | Pre-commit |
| Test | `vitest` | Same runner as BE |

### Backend (Node + Express 4)

| Concern | Lib | Version | Why |
|---|---|---|---|
| Framework | `express` | ^4.x | Stable |
| DB driver | `mysql2/promise` | ^3.x | Fastest, native promises |
| Validation | `zod` | ^3.x | Shared with FE |
| Auth tokens | `jsonwebtoken` | ^9.x | Standard |
| Password hash | `bcryptjs` | ^2.x | Pure-JS — Windows-friendly |
| Logger | `pino` + `pino-pretty` | ^8.x | Structured JSON |
| Env loader | `dotenv` | ^16.x | Standard |
| Env validation | `envalid` | ^8.x | Fail-fast at boot |
| Date | `dayjs` | ^1.x | Same as FE |
| PDF | `pdfkit` | ^0.14.x | No Chromium (on-prem fit) |
| Rate limit | `express-rate-limit` | ^7.x | In-memory sufficient |
| Security headers | `helmet` | ^7.x | OWASP defaults |
| CORS | `cors` | ^2.x | Standard |
| Compression | `compression` | ^1.x | gzip/brotli responses |
| Cookie parser | `cookie-parser` | ^1.x | httpOnly refresh |
| Process mgr | `pm2` | latest | Cluster mode, restarts |
| Test | `vitest` + `supertest` | latest | Unit + API |

## 2.2 Production topology

```
   ┌──────────────────┐
   │  Browser (Chrome,│
   │   Edge, Firefox) │
   │  React 18 SPA    │
   └─────────┬────────┘
             │  HTTPS (443)
             ▼
   ┌──────────────────┐
   │   NGINX          │  ◄── D9: reverse proxy
   │   - TLS terminate│       SPA static
   │   - SPA static   │       /api/* → proxy
   │   - /api/* proxy │
   └─────────┬────────┘
             │  HTTP (internal)
             ▼
   ┌──────────────────┐
   │   PM2 Cluster    │  ◄── auto-restart, multiple workers
   │   Node 20 LTS    │       NFR: 99% uptime business hours
   │   Express 4      │
   │   ┌──────────┐   │
   │   │worker 1  │   │
   │   │worker 2  │   │
   │   │worker N  │   │
   │   └──────────┘   │
   └─────────┬────────┘
             │  mysql2/promise pool (10–20 connections)
             ▼
   ┌──────────────────┐
   │     MySQL 8      │
   │  cmcmis_redev    │  ◄── legacy `cmms_*` + new snake_case
   │  InnoDB, utf8mb4 │
   └──────────────────┘
```

## 2.3 Layered request flow (BE)

```
   HTTP req
      │
      ▼
  ┌──────────────────────────────────────────────────────┐
  │  Middleware: helmet → cors → compression → cookies   │
  │              → rateLimit → requestId → pino logger   │
  └──────────────────────────┬───────────────────────────┘
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │  Router (/api/v1/<feature>)                          │
  └──────────────────────────┬───────────────────────────┘
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │  Controller — authenticate JWT → requirePermission() │
  │             → zod.parse(req.body)                    │
  └──────────────────────────┬───────────────────────────┘
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │  Service — business rules, state transitions,        │
  │           row-vis scoping, audit log write           │
  └──────────────────────────┬───────────────────────────┘
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │  Repository — parameterized SQL via mysql2/promise   │
  └──────────────────────────┬───────────────────────────┘
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │  MySQL                                               │
  └──────────────────────────────────────────────────────┘
```

> **Per D7:** controllers never call DB directly. Repository is the only SQL author.

## 2.4 Symmetry — shared zod + dayjs

```
                    ┌────────────────────────┐
                    │  Shared zod schemas    │
                    │  (single source)       │
                    └───────┬────────┬───────┘
                            │        │
              ┌─────────────┘        └──────────────┐
              ▼                                     ▼
       ┌─────────────┐                       ┌─────────────┐
       │   React FE  │                       │  Express BE │
       │ form valid. │                       │ input valid.│
       │ + types     │                       │ + types     │
       └─────────────┘                       └─────────────┘
              │                                     │
              └────────► dayjs on both ◄────────────┘
                         (date math identical)
```

## 2.5 Folder structures

### Backend `/server` (layered per D7)

```
server/
├─ src/
│  ├─ config/              ← env loading (envalid), constants
│  ├─ middleware/          ← auth, rbac, error, requestId, validate
│  ├─ db/                  ← mysql2 pool, migrations runner, seed
│  ├─ utils/               ← jwt, password, audit helpers, pdf base
│  ├─ features/
│  │  ├─ auth/
│  │  │  ├─ auth.routes.js
│  │  │  ├─ auth.controller.js
│  │  │  ├─ auth.service.js
│  │  │  ├─ auth.repository.js
│  │  │  └─ auth.schema.js
│  │  ├─ equipment/...
│  │  ├─ jobRequest/...
│  │  ├─ jobCard/...
│  │  ├─ dashboard/...
│  │  └─ inquiry/...
│  ├─ app.js               ← express assembly
│  └─ server.js            ← PM2 entry
├─ migrations/             ← timestamped .sql files
├─ seeds/                  ← roles, permissions, super admins
├─ tests/                  ← vitest + supertest
├─ .env.example
├─ ecosystem.config.js     ← PM2 cluster config
└─ package.json
```

### Frontend `/web` (feature-based per D8)

```
web/
├─ src/
│  ├─ app/                 ← router, providers (QueryClient, Zustand)
│  ├─ shared/
│  │  ├─ ui/               ← Button, Input, Modal, Table primitives
│  │  ├─ lib/              ← axios client, dayjs config
│  │  ├─ hooks/            ← useDebounce, useAuth, usePermission
│  │  └─ schemas/          ← shared zod (mirrors BE)
│  ├─ features/
│  │  ├─ auth/{api, components, pages, schemas, hooks}
│  │  ├─ equipment/...
│  │  ├─ jobRequest/...
│  │  ├─ jobCard/...
│  │  ├─ dashboard/...
│  │  └─ inquiry/...
│  ├─ layouts/             ← AppShell, Sidebar (permission-filtered)
│  ├─ main.jsx
│  └─ index.css            ← tailwind directives
├─ public/
├─ vite.config.js
├─ tailwind.config.js
└─ package.json
```

## 2.6 Architectural Decision Register

### Major decisions (D-series, all LOCKED 2026-05-16)

| ID | Decision |
|---|---|
| **D1** | JavaScript + JSDoc + Zod (NOT TypeScript) |
| **D2** | Raw SQL + Repository pattern (NOT ORM) |
| **D3** | TanStack Query for server state |
| **D4** | Zustand for global UI state |
| **D5** | pdfkit for PDFs (NOT Puppeteer — on-prem fit) |
| **D6** | Pino for structured JSON logs |
| **D7** | BE: routes → controllers → services → repositories → DB |
| **D8** | FE feature-based folders |
| **D9** | Nginx reverse proxy in production |
| **D10** | Equipment defaults to `PENDING_VERIFICATION` |
| **D11** | ≥2 Super Admin IDs seeded via env var |

### Confirmations (C-series)

| ID | Confirmation |
|---|---|
| C1 | 5-role list final (no separate Admin) |
| C2 | Master Data CRUD UI = Phase 2 |
| C3 | Lookup data via phpMyAdmin during MVP |
| C4 | Bootstrap with ≥2 Super Admins |
| C5 | Equipment verify (PENDING→ACTIVE) = Lab In-charge + Super Admin |

### Stack additions

| # | Library | Purpose |
|---|---|---|
| 1 | `cookie-parser` (BE) | Read httpOnly refresh cookie |
| 2 | `compression` (BE) | gzip/brotli responses |
| 3 | CSRF double-submit token | On `/api/v1/auth/refresh` only |
| 4 | `@tanstack/react-table` (FE) | Headless tables |
| 5 | `@tailwindcss/forms` (FE) | Form defaults |
| 6 | `vitest` + `supertest` | Unit + API tests |

## 2.7 API design conventions

### URL & versioning

- **Base:** `/api/v1/...` from day 1
- **Resource-oriented:** `/api/v1/equipment`, `/api/v1/equipment/:id`
- **Actions for state transitions:** `POST /api/v1/job-cards/:id/verify` (not `PATCH status=verified`)

### Standard responses

```jsonc
// SUCCESS
{ "ok": true, "data": { ... }, "meta": { "page": 1, "limit": 25, "total": 137 } }

// ERROR
{ "ok": false, "error": { "code": "EQP_NOT_FOUND", "message": "...", "details": {} } }
```

### Pagination

`GET /resource?page=1&limit=25&sort=-created_at&q=keyword&status=ACTIVE`
Default `limit=25`, max `100`.

### Auth headers

- Access: `Authorization: Bearer <jwt>` (15 min)
- Refresh: httpOnly cookie `cmcmis_rt` (7 days, SameSite=Lax)
- CSRF: double-submit token only on `/auth/refresh`

## 2.8 Business Rules (BR catalogue)

### BR-AUTH

| ID | Rule |
|---|---|
| BR-AUTH-01 | Login by `employee_id` only (not email/username) |
| BR-AUTH-02 | User must exist in org employee directory. NO self-registration |
| BR-AUTH-03 | Authenticated user with no role → defaults to Normal User |
| BR-AUTH-04 | Sessions expire after **60 min inactivity**; refresh 7 days |
| BR-AUTH-05 | First Super Admin seeded via `SUPER_ADMIN_EMPLOYEE_IDS` env (≥2) |
| BR-AUTH-06 | All login attempts (success + failure) logged |
| BR-AUTH-07 | Deactivated user cannot log in; history preserved |

### BR-RBAC

| ID | Rule |
|---|---|
| BR-RBAC-01 | Only Super Admin can assign/change a user's role |
| BR-RBAC-02 | **One primary role per user** (no multi-role in v1) |
| BR-RBAC-03 | Permissions derived: User → Role → Permissions. NEVER check role name in code |
| BR-RBAC-04 | Sidebar + routes filtered by permissions, not role names |
| BR-RBAC-05 | Every API endpoint enforces permission check at controller layer |
| BR-RBAC-06 | View-Only users can READ but never WRITE |
| BR-RBAC-07 | Role changes take effect on next login OR token refresh |

### BR-EQP

| ID | Rule |
|---|---|
| BR-EQP-01 | Unique serial number system-wide |
| BR-EQP-02 | Must belong to T&ME OR F&PE category |
| BR-EQP-03 | F&PE may have NO calibration frequency (optional) |
| BR-EQP-04 | T&ME MUST have calibration frequency (months) |
| BR-EQP-05 | `next_cal_due_date = last_cal_date + calibration_frequency_months` |
| BR-EQP-06 | Status transitions follow state machine |
| BR-EQP-07 | Hard DELETE = Super Admin only; CONDEMN = Lab In-charge / Super Admin |
| BR-EQP-08 | Search = case-insensitive across serial, model, mfr, type |
| BR-EQP-09 | Every registration carries `registered_by`, `registered_at`, `verified_by` (nullable), `verified_at` |
| BR-EQP-10 | New equipment defaults to `PENDING_VERIFICATION`; verify → ACTIVE = Lab In-charge / Super Admin only |

### BR-JR

| ID | Rule |
|---|---|
| BR-JR-01 | Must reference existing equipment (or trigger registration) |
| BR-JR-02 | Type ∈ {Calibration, Repair, Registration} |
| BR-JR-03 | Save as DRAFT before submitting |
| BR-JR-04 | Once SUBMITTED, only Lab In-charge changes state |
| BR-JR-05 | Approval requires assigning Lab Engineer → becomes JC |
| BR-JR-06 | `submitted_by` auto-filled from current user; not overridable |
| BR-JR-07 | High-priority repair requests appear at top of Lab In-charge queue |
| BR-JR-08 | Rejection requires mandatory reason (free text + reason code) |

### BR-JC

| ID | Rule |
|---|---|
| BR-JC-01 | Auto-created on JR approve+assign |
| BR-JC-02 | Lifecycle: ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED/CLOSED |
| BR-JC-03 | Only assigned engineer marks IN_PROGRESS / COMPLETED |
| BR-JC-04 | Only Lab In-charge verifies/closes |
| BR-JC-05 | Reopen = Lab In-charge only, mandatory reason |
| BR-JC-06 | Tasks are configurable per job type |
| BR-JC-07 | Calibration cards REQUIRE before-reading + after-reading + env conds before COMPLETED |
| BR-JC-08 | History is **append-only** — immutable state transition log |

### BR-PDF

| ID | Rule |
|---|---|
| BR-PDF-01 | Generated on demand from current DB state. **Nothing stored.** |
| BR-PDF-02 | Job card PDF: header, equipment info, tasks, observations, signatures (text), date |
| BR-PDF-03 | Cal cert PDF: equipment, standards used, readings, env, uncertainty placeholders, valid-until |
| BR-PDF-04 | All PDFs include timestamp + "Generated by CMCMIS" footer + record ID |

### BR-AUD

| ID | Rule |
|---|---|
| BR-AUD-01 | Every write on critical tables → `audit_log` |
| BR-AUD-02 | Audit log: who, what, when, before, after, IP, user-agent |
| BR-AUD-03 | Exports (PDF, future Excel) logged with user + record IDs |
| BR-AUD-04 | Sensitive fields filtered from API responses by permission |
| BR-AUD-05 | HTTPS in prod; JWT in Authorization header; refresh in httpOnly cookie |

### BR-VIS (row-level visibility)

| ID | Rule |
|---|---|
| BR-VIS-01 | Normal User → own JRs only |
| BR-VIS-02 | Lab Engineer → assigned jobs + the queue |
| BR-VIS-03 | Lab In-charge+ → all jobs and equipment |
| BR-VIS-04 | View-Only → all data (read), no actions |

### BR-MASTER (Phase 2 build; rules locked now)

| ID | Rule |
|---|---|
| BR-MASTER-01 | All master data CRUD (employees, vendors, equipment types, divisions, lookups) = **Super Admin only** |

## 2.9 Functional Requirements (MVP)

### FR-A — Auth & RBAC

| ID | Requirement |
|---|---|
| FR-A-01 | Login screen accepts employee_id + password |
| FR-A-02 | On success, issue JWT (15min) + refresh cookie (7d) |
| FR-A-03 | Logout clears refresh cookie |
| FR-A-04 | Protected routes redirect unauth → /login |
| FR-A-05 | Sidebar shows items filtered by permissions |
| FR-A-06 | Super Admin: list users, assign role, activate/deactivate |
| FR-A-07 | GET /me returns user + role + permissions |
| FR-A-08 | POST /auth/refresh issues new access token |
| FR-A-09 | Idle 60min → auto logout (sliding window) |
| FR-A-10 | Bootstrap seed inserts ≥2 Super Admins |

### FR-E — Equipment

| ID | Requirement |
|---|---|
| FR-E-01 | List with pagination, search, filter |
| FR-E-02 | Detail page with full history timeline |
| FR-E-03 | Register form (all roles except View-Only) |
| FR-E-04 | Edit (permissioned) |
| FR-E-05 | Color-coded next_cal_due (green/amber/red) |
| FR-E-06 | History timeline |
| FR-E-07 | Search by serial / model / mfr |
| FR-E-08 | Soft-delete via CONDEMNED |
| FR-E-09 | Lab In-charge / Super Admin verify PENDING → ACTIVE |

### FR-JR — Job Requests

| ID | Requirement |
|---|---|
| FR-JR-01 | List with filters |
| FR-JR-02 | Multi-section form |
| FR-JR-03 | Save as draft |
| FR-JR-04 | Submit |
| FR-JR-05 | Detail with state history |
| FR-JR-06 | Approve / reject with reason |
| FR-JR-07 | Approval auto-creates Job Card |
| FR-JR-08 | Assignment dropdown SHOULD show engineer workload |

### FR-JC — Job Cards

| ID | Requirement |
|---|---|
| FR-JC-01 | List |
| FR-JC-02 | Status stepper |
| FR-JC-03 | Configurable task checklist |
| FR-JC-04 | Observations log |
| FR-JC-05 | Engineer state transitions (start/complete) |
| FR-JC-06 | Lab In-charge verify/close/reopen |
| FR-JC-07 | PDF generation (download) |
| FR-JC-08 | State history timeline |

### FR-D — Dashboard

| ID | Requirement |
|---|---|
| FR-D-01 | Role-aware KPI tiles |
| FR-D-02 | Cal-due alerts (next 30/60/90 days) |
| FR-D-03 | Engineer workload chart |
| FR-D-04 | Equipment status pie |
| FR-D-05 | Recently-updated jobs |
| FR-D-06 | Permission-gated quick actions |

### FR-I — Inquiry

| ID | Requirement |
|---|---|
| FR-I-01 | 4-tab interface: Vendor / Product / Job Card / Instrument |
| FR-I-02 | Debounced real-time search |
| FR-I-03 | Drill-down links to detail pages |
| FR-I-04 | Empty-state messaging |

## 2.10 Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| **Performance** | Cold page load (intranet) | < 3 sec |
| | API response (p95) | < 500 ms |
| | List pagination | 25 default, 100 max |
| **Security** | Password hashing | bcrypt ≥10 rounds (12 prod) |
| | JWT access lifetime | 15 min |
| | Refresh lifetime | 7 days, httpOnly, SameSite=Lax |
| | SQL injection | Parameterized queries everywhere |
| | XSS | React auto-escape + CSP header |
| | CSRF | SameSite + token on state-changing endpoints |
| **Reliability** | Uptime (post go-live) | 99% in business hours |
| | DB pool | 10–20 connections |
| **Usability** | Max clicks to any feature | ≤ 3 |
| | Keyboard shortcuts | On power-user screens |
| | Viewport | 1280–1920px primary, degrades to 768px |
| **Audit** | Every state-changing op logged | Yes |
| | Audit retention | Indefinite |
| **Maintainability** | Style | ESLint + Prettier |
| | API versioning | `/api/v1/...` from day 1 |
| **Compatibility** | Browsers | Chrome, Edge, Firefox (latest 2) |

## 2.11 Security model (7 layers)

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1 — Transport                                         │
│  HTTPS (Nginx TLS terminate) + HSTS + secure cookies         │
├──────────────────────────────────────────────────────────────┤
│  Layer 2 — Edge                                              │
│  helmet (CSP, X-Frame, etc.) + cors (whitelist) +            │
│  express-rate-limit (per IP, per route)                      │
├──────────────────────────────────────────────────────────────┤
│  Layer 3 — Identity                                          │
│  bcrypt(≥10) + JWT(HS256, 15min) + httpOnly refresh(7d) +    │
│  CSRF double-submit on /auth/refresh                         │
├──────────────────────────────────────────────────────────────┤
│  Layer 4 — Authorization                                     │
│  requirePermission('resource:action') middleware per route   │
│  + row-level visibility scoping in service layer             │
├──────────────────────────────────────────────────────────────┤
│  Layer 5 — Input                                             │
│  zod.parse() at controller boundary; reject unknown keys     │
├──────────────────────────────────────────────────────────────┤
│  Layer 6 — Data access                                       │
│  Parameterized SQL only (mysql2/promise placeholders)        │
├──────────────────────────────────────────────────────────────┤
│  Layer 7 — Audit                                             │
│  Every write → audit_log (who/what/when/before/after)        │
└──────────────────────────────────────────────────────────────┘
```

### Threat → control matrix

| Threat | Control |
|---|---|
| Credential theft | bcrypt, no plaintext, login throttling |
| Token theft (access) | 15-min lifetime, HTTPS-only |
| Token theft (refresh) | httpOnly cookie, SameSite=Lax, revocable via DB |
| SQL injection | Parameterized queries (mysql2) |
| XSS | React auto-escape + CSP header |
| CSRF | SameSite cookies + double-submit on /refresh |
| Privilege escalation | Permission check per endpoint; row-vis in service |
| Data exfiltration | Pagination caps, sensitive-field filtering, audit log |
| Brute force | express-rate-limit + failed_login_count + is_locked |
| Session hijack | 60-min idle expiry, refresh revocation |

## 2.12 State Machines

### Equipment

```
                       (BR-EQP-10)
                       ┌──────────────────────────┐
                       │   PENDING_VERIFICATION   │ ◄── default on register
                       └─────────────┬────────────┘
                          (verify by Lab I/C, SA)
                                     │
                                     ▼
              ┌──────────────────► ACTIVE ◄────────────────────┐
              │                      │                         │
              │      ┌───────────────┼───────────────┐         │
              │      ▼               ▼               ▼         │
              │ UNDER_CALIBRATION  UNDER_REPAIR  OUT_OF_TOL    │
              │      │               │               │         │
              │      └───────────────┴───────┬───────┘         │
              │                              │                 │
              │                          QUARANTINED ──────────┘
              │
              │  (Lab I/C or SA)
              ▼
        CONDEMNED / RETIRED   (terminal)
```

### Job Request

```
   DRAFT ──submit──► SUBMITTED ──approve──► ASSIGNED ──► (creates JC)
     ▲                  │
     │                  └──reject (reason+code mandatory)──► REJECTED
     │
   (user edits before submit)
```

### Job Card

```
   ASSIGNED ──start──► IN_PROGRESS ──complete──► COMPLETED ──verify──► VERIFIED/CLOSED
                                                                          │
                                                            ◄──reopen──── (Lab I/C only, reason)
```

### Auth session

```
   UNAUTHENTICATED ──login──► AUTHENTICATED ──refresh (≤15min)──► AUTHENTICATED
        ▲                          │
        │                          └──logout / refresh expired──► TERMINATED
        │                                                              │
        └──────────────────────────────────────────────────────────────┘

   Failure branches → login_audit:
     bad password  → FAILED_BAD_PASSWORD + failed_login_count++
     user locked   → FAILED_USER_LOCKED
     user inactive → FAILED_USER_INACTIVE
     not found     → FAILED_NOT_FOUND
     bad regex     → FAILED_INVALID_FORMAT  (skips bcrypt → saves 250ms CPU)
```

---

# PART 3 — PHASE 3 DAY 1: LEGACY DB AUDIT

---

## 3.1 Database snapshot

| Attribute | Value |
|---|---|
| **DB name** | `cmcmis_redev` |
| **Engine** | MySQL 8.x |
| **Storage** | InnoDB |
| **Charset/collation** | utf8mb4 / utf8mb4_0900_ai_ci |
| **Total existing tables** | **64** |
| **Total rows (approx)** | ~390,000 |
| **Naming convention (legacy)** | `cmms_*` |
| **Schema artifacts** | [DB/cmcmis_schema_analysis_bundle/](DB/cmcmis_schema_analysis_bundle/) |

## 3.2 The 6 critical BR-violations 🔴 (MUST fix before MVP)

| # | Issue | Where | Impact | Resolution (in v2.0) |
|---|---|---|---|---|
| 1 | `USER_PASSWORD VARCHAR(10)` — can't fit bcrypt 60-char | `cmms_userrole_mst` | Cannot store secure passwords | New `users.password_hash VARCHAR(60)` |
| 2 | `cmms_jobcard_status_hist` has NO primary key — violates append-only (BR-JC-08) | `cmms_jobcard_status_hist` | Cannot guarantee immutability | Legacy KEEP; new `job_request_status_history` has PK; new ALTERs preserve append discipline |
| 3 | Equipment lacks `registered_by` / `verified_by` / `verified_at` (BR-EQP-09) | `cmms_eqip_mst` | Cannot satisfy verification audit | ALTER adds `EQM_VERIFIED_BY`, `EQM_VERIFIED_ON` |
| 4 | No `PENDING_VERIFICATION` state in equipment (BR-EQP-10); uses free-text `EQM_DIV_STATUS` | `cmms_eqip_mst` | Cannot enforce state machine | ALTER adds `EQM_MVP_STATUS ENUM(...)` |
| 5 | No central `audit_log` table (BR-AUD-01) | (missing) | Cannot meet defence-grade audit | NEW `audit_log` + `audit_log_changes` + `export_audit` |
| 6 | No `login_audit` (BR-AUTH-06), no `refresh_tokens` table | (missing) | Cannot log attempts or rotate tokens | NEW `login_audit` + `refresh_tokens` |

## 3.3 The 4 decisions needed 🟡 (resolved during v2.0)

| # | Issue | Resolution |
|---|---|---|
| 1 | `cmms_role_mst` has 23 roles — we only need 5 | Q4: NO mapping. Legacy isolated → `_legacy_role_mst`. New `roles` seeded with 5 |
| 2 | `cmms_eqip_mst` compound PK `(EQM_TYPE, EQM_ID)` propagates to 12+ FK chains | KEEP composite PK; FKs in new tables (`equipment_status_history`) use (eqm_type, eqm_id) too |
| 3 | `cmms_jobcard_mst` has both `JM_JobCardNO` (int) AND `JM_SectionJobNo` (varchar(9), PK) — which is canonical? | KEEP existing PK `JM_SectionJobNo`; new FK from `equipment_status_history.related_job_card` references it |
| 4 | `cmms_cont_mst` (vendors/contacts) referenced by 4+ FKs but missing from dump | Q1: design new with same name → 4 legacy FKs auto-resolve (ADR-DB-06) |

## 3.4 Orphan candidates 🟣 (deprecate)

| Category | Tables |
|---|---|
| Backup variants | `cmms_parameter_master_bkp` (4), `cmms_parameter_master_jun2016` (233), `cmms_parameter_master_incharge` (9) |
| Legacy checklist dupes (no FK) | `cf001` (6), `cf002` (553), `cf003` (570), `cf004` (3,449) |
| Empty / dead | `cmms_pur_mst` (0), `cmms_pur_dtl` (0), `cmms_amc_mst` (0), `cmms_cal_jobcard_feedback_spec` (0), `cmms_jobcard_insp_maint_dtl` (0) |
| Legacy RBAC (full stack to replace) | `cmms_userrole_mst`, `cmms_accessright_mst`, `cmms_role_mst`, `cmms_module_mst`, `cmms_section_user_mst` |
| Misc orphan | `chklistvendor` (238) |

## 3.5 The insight that produced the two-universe strategy

> Reality forced a choice: **migrate-everything** OR **start-fresh-without-touching**.

- Migrate-everything = drop legacy, lose 390K rows, break compliance posture.
- Start-fresh-without-touching = parallel new tables; legacy untouched; new MVP code reads both.

The second won. It became **ADR-DB-01: Two-Universe Strategy** — the foundation of v2.0.

---

# PART 4 — PHASE 3 DAY 2: DB DESIGN v2.0 LOCKED

---

## 4.1 Authority chain

```
FINAL-DESC-CMCMIS v1.0   ◄── behaviour, BR/FR/NFR contract
        │
        ▼
FINAL_DB_DESIGN_v2.0    ◄── schema canon (this part)
        │
        ▼
All other interim docs   ◄── defer to v2.0 for DB
```

## 4.2 The Two-Universe Strategy

```
   ┌────────────────────────────────────────────────────────────────┐
   │                  THE TWO-UNIVERSE STRATEGY                     │
   ├────────────────────────────────────────────────────────────────┤
   │                                                                │
   │   LEGACY UNIVERSE (cmms_*)            MVP UNIVERSE (snake_case)│
   │   ─────────────────────────           ─────────────────────────│
   │   ~60 tables · 390,000 rows           15 new tables · 0 initial│
   │   Untouched data integrity            Clean modern schema     │
   │   Read-mostly for MVP                 Read/write hot path      │
   │   FK targets preserved                FK references both worlds│
   │                                                                │
   │         ↓                                       ↓              │
   │         │     ←── JOINED VIA ──►              │              │
   │         │   cmms_emp_mst.EMM_ID                 │              │
   │         │   cmms_eqip_mst (TYPE,ID)             │              │
   │         │   cmms_section_mst.SM_ID              │              │
   │         ▼                                       ▼              │
   │   ┌────────────────────────────────────────────────────────┐   │
   │   │  MVP RUNTIME READS BOTH; WRITES ONLY TO MVP TABLES +   │   │
   │   │  CONTROLLED ALTERs ON LEGACY                           │   │
   │   └────────────────────────────────────────────────────────┘   │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘
```

### Why it works

1. **Zero data loss** — every legacy row preserved.
2. **Zero downtime risk** — new auth runs alongside old; old data is untouched.
3. **Clean RBAC** — fresh auth stack with no 23-role legacy compromise.
4. **Audit-grade** — bcrypt, 3-layer RBAC, comprehensive audit_log per locked BRs.
5. **Future-proof** — SSO swap-in is one adapter; rest is SSO-ready.

### Final totals

| Bucket | Count |
|---|---|
| 🌱 NEW (active MVP) | **15** |
| 🔧 ALTER (active MVP) | **6** |
| ✅ KEEP (active MVP) | **32** |
| **Total active MVP runtime** | **53** |
| 🗄️ ISOLATE (renamed `_legacy_*`) | **26** |
| **GRAND TOTAL after Phase 3** | **79** |

## 4.3 Naming conventions

| Layer | Convention |
|---|---|
| NEW tables | `snake_case`, plural for entities, singular for junctions, suffix `_history` / `_audit` |
| NEW columns | `snake_case` (`employee_id`, `created_at`) |
| LEGACY tables | kept as-is for FK compatibility |
| LEGACY ALTER columns | match existing UPPER_PREFIX style (e.g., `EQM_VERIFIED_BY`) |
| ONE EXCEPTION | `cmms_cont_mst` keeps `cmms_` prefix despite being NEW (4 legacy FKs already reference it — ADR-DB-06) |
| PKs | `BIGINT UNSIGNED AUTO_INCREMENT`, named `id` or `<entity>_id` |
| Timestamps | `DATETIME(6)`, UTC; `created_at` / `updated_at`; audit-style → `occurred_at` / `transitioned_at` |
| Booleans | `TINYINT(1)`, positive form (`is_active`, `is_locked`) |
| Enums | SCREAMING_SNAKE values |
| Engine/charset | InnoDB / utf8mb4_0900_ai_ci |

## 4.4 The 15 NEW Tables

| # | Table | Cluster | Purpose |
|---|---|---|---|
| 1 | `users` | 1 Identity | App-level auth identity (1:1 with `cmms_emp_mst`) |
| 2 | `roles` | 1 Identity | 5 system rows: SUPER_ADMIN, LAB_IN_CHARGE, LAB_ENGINEER, NORMAL_USER, VIEW_ONLY |
| 3 | `permissions` | 1 Identity | 40 atomic resource:action codes |
| 4 | `role_permissions` | 1 Identity | M:N grant matrix (~110 rows) |
| 5 | `user_roles` | 1 Identity | PK on `user_id` alone → enforces BR-RBAC-02 |
| 6 | `refresh_tokens` | 1 Identity | sha256 hash; raw never stored (ADR-DB-09) |
| 7 | `login_audit` | 1 Identity | Every attempt (BR-AUTH-06) |
| 8 | `departments` | 2 Organisation | seed: TIMCD |
| 9 | `sections` | 2 Organisation | seed: T&ME, F&PE (with `equipment_category` ENUM) |
| 10 | `cmms_cont_mst` | 3 Equipment | Vendor master (legacy-named per ADR-DB-06) |
| 11 | `equipment_status_history` | 3 Equipment | Per-equipment state log (Q5 locked) |
| 12 | `job_request_status_history` | 4 Job | Per-JR state log (Q6 locked) |
| 13 | `audit_log` | 10 Audit | Generic write-op audit |
| 14 | `audit_log_changes` | 10 Audit | Field-level before/after diffs |
| 15 | `export_audit` | 10 Audit | PDF + future Excel exports |

## 4.5 The 6 ALTERed Tables

| Table | Adds |
|---|---|
| `cmms_emp_mst` | `INDEX idx_emm_active` only |
| `cmms_eqip_mst` | `EQM_VERIFIED_BY`, `EQM_VERIFIED_ON`, **`EQM_MVP_STATUS ENUM`** (8 values, default PENDING_VERIFICATION per D10), `EQM_MVP_STATUS_AT`, `EQM_SECTION_ID` FK→new `sections`; 5 indexes |
| `cmms_jobrequest_mst` | **`JR_MVP_STATUS ENUM`** (DRAFT/SUBMITTED/ASSIGNED/IN_PROGRESS/COMPLETED/VERIFIED_CLOSED/REJECTED/REOPENED), `JR_APPROVED_BY/ON`, `JR_REJECTED_BY/ON/REASON`, `JR_PRIORITY ENUM`, `JR_ASSIGNED_ENGINEER`; 4 indexes |
| `cmms_jobcard_mst` | **`JM_MVP_STATUS ENUM`** (ASSIGNED/IN_PROGRESS/COMPLETED/VERIFIED_CLOSED/REOPENED), `JM_VERIFIED_BY/ON`, `JM_REOPENED_REASON`; 2 indexes |
| `cmms_parameter_master` | ADD PK `(CategoryID, SrID)`, `is_active`, `display_order`, audit columns; 2 indexes |
| `cmms_checklist_mst` | audit columns |

## 4.6 The 26 ISOLATED `_legacy_*` Tables

| Category | Tables (renamed `_legacy_*`) |
|---|---|
| Legacy RBAC (5) | `cmms_userrole_mst`, `cmms_accessright_mst`, `cmms_role_mst`, `cmms_module_mst`, `cmms_section_user_mst` |
| Orphan checklist dupes (4) | `cf001`, `cf002`, `cf003`, `cf004` |
| Orphan misc (1) | `chklistvendor` |
| Backup variants (3) | `cmms_parameter_master_bkp`, `cmms_parameter_master_jun2016`, `cmms_parameter_master_incharge` |
| Empty/dead (2) | `cmms_cal_jobcard_feedback_spec`, `cmms_jobcard_insp_maint_dtl` |
| + 11 P2 tables kept untouched | (not renamed; remain `cmms_*` until P2) |

## 4.7 The 32 KEPT-as-is Tables

| Cluster | Tables |
|---|---|
| 2 Organisation | `cmms_section_mst` (293 rows), `cmms_designation_mst` (40), `cmms_proj_mst` (182) |
| 3 Equipment | `cmms_eqip_mst_hist` (519), `cmms_eqipinst_identification` (2,286), `cmms_ins_accuracy_info` (1,501), `cmms_division_hist` (3,676), `cmms_product_mst` (32), `cmms_fault_mst` (30) |
| 4 Job Lifecycle (18 child tables) | `cmms_jobcard_status_hist` (22,214), `cmms_jobcard_mst_history` (22,143), `cmms_jobrequest_item_dtl` (7,786), `cmms_jobrequest_project_dtl` (19,624), `cmms_jobcard_attendedby_dtl` (27,890), `cmms_jobcard_awaitinginfo` (7,261), `cmms_jobcard_cal_dtl` (9,065), `cmms_jobcard_cal_observations` (77,171 — largest!), `cmms_jobcard_cal_adjustments_dtl` (1,831), `cmms_jobcard_contract_warranty_dtl` (17,225), `cmms_jobcard_eq_used` (38,316), `cmms_jobcard_faulty_category` (8,605), `cmms_jobcard_faulty_section` (8,131), `cmms_jobcard_inspection_info` (2,214), `cmms_jobcard_repair_info` (8,118), `cmms_jobcard_request_info` (19,432), `cmms_jobcard_request_item_dtl` (11,064), `cmms_jobcard_request_project_dtl` (22,316), `cmms_jobcard_spares_equip` (2,804), `cmms_task_mst` (1,489), `cmms_checklist_tasks` (7,536), `cmms_checklist_hist` (811), `cmms_checklist_tasks_hist` (8,450) |
| 6-9 Phase 2 | `cmms_amc_mst`, `cmms_device_spares_mst`, `cmms_schedule_mst`, `cmms_schedule_eqip_dtl`, `cmms_po_mst`, `cmms_pur_mst`, `cmms_pur_dtl`, `cmms_inv_mst`, `cmms_lineitem_mst`, `cmms_eqip_detail_spec` |
| 12 Lookups | `cmms_documentno_mst` (151) |

## 4.8 Architectural Decision Records (DB)

| ADR | Decision |
|---|---|
| **ADR-DB-01** | Two-universe (legacy + MVP) DB strategy |
| **ADR-DB-02** | Fresh AUTH stack — ZERO migration from `cmms_userrole_mst` |
| **ADR-DB-03** | Password = employee_id at seed time (V1 only, pre-SSO) |
| **ADR-DB-04** | Bootstrap via env-CSV migration (`SUPER_ADMIN_EMPLOYEE_IDS`) |
| **ADR-DB-05** | New `departments` + `sections` parallel to legacy `cmms_section_mst` |
| **ADR-DB-06** | New vendor master keeps legacy name `cmms_cont_mst` (4 legacy FKs reference it) |
| **ADR-DB-07** | Per-entity separate status-history tables (NOT polymorphic) |
| **ADR-DB-08** | bcrypt cost factor 12 prod / 10 dev-test |
| **ADR-DB-09** | Refresh tokens stored as SHA-256 hash, never plaintext |
| **ADR-DB-10** | Audit log writes SYNCHRONOUS in MVP (async queue is P2 optimisation) |

## 4.9 Password Policy (the exact spec)

```
   ┌──────────────────────────────────────────────────────────┐
   │  PASSWORD POLICY — LOCKED                                │
   ├──────────────────────────────────────────────────────────┤
   │                                                          │
   │  REGEX:    ^[A-Z]{2}[0-9]{5}$                            │
   │                                                          │
   │  STRUCTURE:                                              │
   │    ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐    │
   │    │ char1│ char2│ char3│ char4│ char5│ char6│ char7│    │
   │    │ [A-Z]│ [A-Z]│ [0-9]│ [0-9]│ [0-9]│ [0-9]│ [0-9]│    │
   │    └──────┴──────┴──────┴──────┴──────┴──────┴──────┘    │
   │      U      U      d      d      d      d      d         │
   │                                                          │
   │  EXAMPLES:                                               │
   │    ✓ VALID:    SA79900, AC77777, DS12345, MK00001        │
   │    ✗ INVALID:  sa79900 (lowercase)                       │
   │                SA7990  (only 6 chars)                    │
   │                SA799000 (8 chars)                        │
   │                S179900 (digit in pos 2)                  │
   │                SA7990A (letter in pos 7)                 │
   │                SA-7990 (special char)                    │
   │                                                          │
   │  STORAGE:                                                │
   │    Plaintext → never written to disk                     │
   │    Hash → bcrypt(plaintext, rounds=12)                   │
   │    Column type: VARCHAR(60) NOT NULL                     │
   │                                                          │
   │  EXPIRY:        None (lifetime, per Q7)                  │
   │  ROTATION:      None                                     │
   │  HISTORY:       Not tracked                              │
   │  RESET FLOW:    None in MVP (Super Admin / DB only)      │
   │                                                          │
   │  INITIAL PASSWORD: password = employee_id                │
   │    SA79900's password = 'SA79900'                        │
   │    AC77777's password = 'AC77777'                        │
   │                                                          │
   │  ENFORCEMENT LAYERS:                                     │
   │    1. Frontend → zod schema, regex on input              │
   │    2. Backend  → zod schema (same regex), pre-bcrypt     │
   │    3. Database → not enforced at column level            │
   │                  (bcrypt hash is opaque)                 │
   │                                                          │
   │  LOCKOUT:                                                │
   │    failed_login_count ≥ 5 → is_locked = TRUE             │
   │    Only Super Admin can unlock                           │
   │                                                          │
   │  FUTURE (SSO):                                           │
   │    password_hash becomes NULLABLE                        │
   │    bcrypt check replaced with SSO assertion              │
   │    No other schema change needed                         │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
```

## 4.10 The 3-Layer RBAC Model

```
        LAYER 1                LAYER 2              LAYER 3
     ┌───────────┐         ┌──────────────┐     ┌──────────────────┐
        USER                  ROLE                 PERMISSION
        │                      │                    │
     ┌──┴────────┐         ┌───┴──────┐         ┌───┴──────────────┐
     │ identity  │   M:1   │ bundle   │   M:N   │ resource:action  │
     │ (employee │ ──────► │ (e.g.,   │ ──────► │ (e.g.,           │
     │  + bcrypt │         │  LAB_    │         │  equipment:      │
     │  password)│         │  ENGINEER│         │  create)         │
     └───────────┘         └──────────┘         └──────────────────┘
           │                    │                       │
           ▼                    ▼                       ▼
     ┌──────────────────────────────────────────────────────────┐
     │  CONTROLLER CODE:                                        │
     │    authorize('equipment:create') {                       │
     │      // does THIS user's role include this permission?   │
     │      // YES → proceed                                    │
     │      // NO  → 403 Forbidden                              │
     │    }                                                     │
     │  NEVER WRITES:  if (user.role === 'LAB_ENGINEER') {...}  │
     └──────────────────────────────────────────────────────────┘
```

> **Why it matters:** Business says "Lab Engineers should also approve job requests." Old 2-layer way: change code, recompile, redeploy. Our 3-layer way: Super Admin ticks a box → `INSERT INTO role_permissions` → done. No redeploy.

## 4.11 Permission catalogue + role grant matrix

### The 40 permissions (atomic resource:action)

| Resource | Count | Examples |
|---|---|---|
| auth | 3 | login, logout, refresh-token |
| me | 1 | read |
| user | 3 | read-list, role-assign, activate-deactivate |
| equipment | 7 | read-list, read-detail, create, update, verify, condemn, delete |
| job_request | 6 | create, read-own, read-all, approve, reject, assign-engineer |
| job_card | 8 | read-list, read-detail, start-work, update-tasks, complete, verify-close, reopen, generate-pdf |
| dashboard | 1 | view |
| inquiry | 4 | search-vendors, search-products, search-job-cards, search-instruments |
| master | 5 | (Phase 2: employees, vendors, equipment-types, divisions, lookup-values) |
| audit_log | 1 | read |
| export | 1 | trigger |
| **TOTAL** | **40** | |

### Grant matrix (~110 rows total)

| Role | Permissions | How it's seeded |
|---|---|---|
| SUPER_ADMIN | 40 (all) | `INSERT … SELECT 1, p.permission_id FROM permissions p` |
| LAB_IN_CHARGE | ~30 | explicit `permission_code IN (…)` list — full lifecycle except `equipment:delete`, master CRUD, `audit_log:read` |
| LAB_ENGINEER | ~20 | explicit list — execute, not approve/verify-close/reopen |
| NORMAL_USER | ~12 | explicit list — raise requests, register, read own |
| VIEW_ONLY | ~15 | explicit list — read all, no writes |

## 4.12 Bootstrap Seed Order (10 deterministic steps)

```
STEP 1   Create new tables (FK-safe order)
         departments → sections → cmms_cont_mst →
         permissions → roles → role_permissions →
         users (FK cmms_emp_mst) → user_roles → refresh_tokens →
         login_audit → equipment_status_history →
         job_request_status_history → audit_log →
         audit_log_changes → export_audit

STEP 2   ALTERs on legacy
         cmms_emp_mst (idx), cmms_eqip_mst, cmms_jobrequest_mst,
         cmms_jobcard_mst, cmms_parameter_master, cmms_checklist_mst
         + add FK users.section_id (deferred from Step 1)

STEP 3   Pre-bootstrap: insert ADMIN section
         INSERT INTO cmms_section_mst
           (SM_ID, SM_SHORTNAME, SM_NAME, SM_HEAD_NAME, SM_STATE,
            SM_CREATED_BY, SM_CREATED_ON, SM_UPDATED_BY, SM_UPDATED_ON)
         VALUES (9999, 'ADMIN', 'System Administration', NULL, 1,
                'BOOTSTRAP', NOW(6), 'BOOTSTRAP', NOW(6));

STEP 4   Seed SA79900 + AC77777 into cmms_emp_mst (EMM_DEPT=9999)

STEP 5   Seed roles (5 rows, role_id 1..5)

STEP 6   Seed permissions (40 rows)

STEP 7   Seed role_permissions grant matrix
         SUPER_ADMIN: SELECT-INSERT all 40
         Others: explicit IN-clause lists

STEP 8   Seed users + user_roles
         (bcrypt computed in Node migration runner)
         password_hash = bcrypt(employee_id, rounds)

STEP 9   Seed departments (TIMCD) + sections (T&ME, F&PE)
         head_employee_id = NULL (per M9)

STEP 10  Seed lookups (28 rows in cmms_parameter_master)
         + bootstrap audit_log entries (≥6 rows)
```

## 4.13 M1–M12 Migration Data Answers (LOCKED)

| ID | Sev | Question | LOCKED Answer |
|---|---|---|---|
| **M1** | 🔴 | SM_ID for SA79900/AC77777 EMM_DEPT | **Option B — INSERT new ADMIN section** at SM_ID=9999 |
| **M2** | 🔴 | Names/designations/emails for SA79900 & AC77777 | **Defaults.** SA79900 = 'Super Admin Primary' (or 'System Super Admin (Primary)'), AC77777 = secondary. Designation 'System Administrator'. Emails `@org.local`. User owns: IDs + password rule only. |
| **M3** | 🟡 | Seed `cmms_cont_mst` with vendor rows | **Placeholder strategy** — derive from `SELECT DISTINCT EQM_MFRID, COALESCE(EQM_MFG_MODEL_NAME, …)` from `cmms_eqip_mst` |
| **M4** | 🟡 | Legacy MFRID → new CMM_CONT_ID mapping | **Reuse legacy IDs as new PKs.** AUTO_INCREMENT picks up after the max |
| **M5** | 🟡 | Legacy 293 SM_IDs → new sections mapping | **Skip for MVP** — Phase 2 task |
| **M6** | 🟡 | Auto-create users for 57 legacy employees? | **NO** — Super Admin onboards on demand |
| **M7** | 🟡 | Backfill `cmms_jobcard_mst.JM_MVP_STATUS` (19,432 rows) | All legacy → **`VERIFIED_CLOSED`** |
| **M8** | 🟡 | Backfill `cmms_jobrequest_mst.JR_MVP_STATUS` (21,485 rows) | `JR_SECTIONJOB_NO IS NOT NULL` → **`ASSIGNED`**, else **`SUBMITTED`** |
| **M9** | 🟢 | Head employee_id for T&ME, F&PE | **NULL on bootstrap** |
| **M10** | 🟢 | Archive 23-role legacy dump | **Already isolated** as `_legacy_role_mst` |
| **M11** | 🟢 | bcrypt cost factor | **12 prod, 10 dev/test** (`BCRYPT_ROUNDS` env) |
| **M12** | 🟢 | JWT/refresh durations | **Locked defaults** — JWT 15 min, refresh 7 days |

### Locked SA79900 + AC77777 seed (committed to migration code)

```sql
INSERT INTO cmms_emp_mst
  (EMM_ID, EMM_NAME, EMM_DESIGNATION, EMM_DEPT, EMM_EMAIL, EMM_INACTIVE, …)
VALUES
  ('SA79900', 'System Super Admin (Primary)',   'System Administrator', 9999,
   'sa79900@cmcmis.local', 0, …),
  ('AC77777', 'System Super Admin (Secondary)', 'System Administrator', 9999,
   'ac77777@cmcmis.local', 0, …);

-- Then bcrypt-hashed in Node:
--   password_hash = bcrypt('SA79900', 12)
--   password_hash = bcrypt('AC77777', 12)
-- Then INSERT into user_roles with role_id=1 (SUPER_ADMIN).
```

## 4.14 ERD walk-through (MVP-critical clusters)

```
   IDENTITY & ACCESS (Cluster 1)
   ─────────────────────────────

   departments ──1:N──► sections ──1:N──► users ──1:1──► user_roles ──M:1──► roles
                                  │                                            │
                                  │                                            ▼
                                  │                                     role_permissions
                                  ▼                                            │
                              users ──1:N──► refresh_tokens                    ▼
                                   ──1:N──► login_audit                  permissions

   ORG link: users.employee_id (FK) ──► cmms_emp_mst.EMM_ID (legacy KEEP)

   ─────────────────────────────────────────────────────────────────────────────────
   EQUIPMENT MASTER (Cluster 3)
   ─────────────────────────────

   cmms_cont_mst ──FK from many──► cmms_eqip_mst (ALTER)
                                       │
                                       │ EQM_SECTION_ID ──► sections (new)
                                       │
                                       ├──1:N──► equipment_status_history (new)
                                       ├──1:N──► cmms_division_hist (legacy)
                                       ├──1:N──► cmms_eqipinst_identification
                                       ├──1:N──► cmms_ins_accuracy_info
                                       └──1:N──► cmms_eqip_mst_hist

   ─────────────────────────────────────────────────────────────────────────────────
   JOB LIFECYCLE (Cluster 4)
   ─────────────────────────

   cmms_jobrequest_mst (ALTER) ──1:N──► job_request_status_history (new)
                              ──1:N──► cmms_jobrequest_item_dtl
                              ──1:N──► cmms_jobrequest_project_dtl

   cmms_jobcard_mst (ALTER) ──1:N──► cmms_jobcard_status_hist (legacy, KEEP)
                            ──1:N──► cmms_jobcard_mst_history
                            ──1:N──► 16 child detail tables (attendance, observations,
                                       readings, eq_used, faults, etc.)

   ─────────────────────────────────────────────────────────────────────────────────
   AUDIT (Cluster 10)
   ──────────────────

   audit_log ──1:N──► audit_log_changes  (field-level diffs)
   export_audit  (standalone)

   ─────────────────────────────────────────────────────────────────────────────────
   LOOKUPS (Cluster 12)
   ────────────────────

   cmms_parameter_master (ALTER)  ←  365 rows after seed (337 legacy + 28 new MVP)
   cmms_documentno_mst (KEEP)
   cmms_product_mst (KEEP, also used in Cluster 3)
   cmms_fault_mst (KEEP, also used in Cluster 3)
   cmms_task_mst (KEEP, also used in Cluster 4)
   cmms_designation_mst (KEEP, also used in Cluster 2)
```

---

# PART 5 — PHASE 3 DAY 3: BUNDLE DELIVERED

---

## 5.1 What was shipped

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                  PHASE 3 DELIVERABLE BUNDLE                        │
   ├────────────────────────────────────────────────────────────────────┤
   │                                                                    │
   │   SOFTWARE CODE/DATABASE/                                          │
   │   ├── PHASE3_COMPLETE_v2.0.md     (48 KB, the spec)                │
   │   ├── migrations/                  (12 SQL/JS files)               │
   │   │   ├── 001..010 (10 mainline files)                             │
   │   │   ├── 050__backfill_cmms_cont_mst.sql       (bonus M3/M4)      │
   │   │   └── 099__isolate_legacy_unused.sql        (rename)           │
   │   ├── runner/                                                      │
   │   │   ├── run-migrations.js       (16 KB, orchestrator + verifier) │
   │   │   └── test-bootstrap.js       (13 KB, 7 E2E tests)             │
   │   └── phase 3/                    (⚠️ folder name has a space)     │
   │       ├── README.md               (9.7 KB)                         │
   │       ├── package.json            (737 B)                          │
   │       └── .env.example            (2.0 KB)                         │
   │                                                                    │
   │   Total: 16 files / ~2,800 lines (SQL + JS + docs)                 │
   │   Idempotency: 5 layers · Verification: 14 auto checks             │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘
```

## 5.2 Disk layout (verified)

| Path | Size |
|---|---|
| [SOFTWARE CODE/DATABASE/PHASE3_COMPLETE_v2.0.md](SOFTWARE%20CODE/DATABASE/PHASE3_COMPLETE_v2.0.md) | 48 KB |
| [SOFTWARE CODE/DATABASE/migrations/001__create_new_tables.sql](SOFTWARE%20CODE/DATABASE/migrations/001__create_new_tables.sql) | 29 KB |
| [SOFTWARE CODE/DATABASE/migrations/002__alter_legacy_tables.sql](SOFTWARE%20CODE/DATABASE/migrations/002__alter_legacy_tables.sql) | 15 KB |
| [SOFTWARE CODE/DATABASE/migrations/003__pre_bootstrap_admin_section.sql](SOFTWARE%20CODE/DATABASE/migrations/003__pre_bootstrap_admin_section.sql) | 1.4 KB |
| [SOFTWARE CODE/DATABASE/migrations/004__seed_super_admin_employees.sql](SOFTWARE%20CODE/DATABASE/migrations/004__seed_super_admin_employees.sql) | 3.2 KB |
| [SOFTWARE CODE/DATABASE/migrations/005__seed_roles.sql](SOFTWARE%20CODE/DATABASE/migrations/005__seed_roles.sql) | 1.5 KB |
| [SOFTWARE CODE/DATABASE/migrations/006__seed_permissions.sql](SOFTWARE%20CODE/DATABASE/migrations/006__seed_permissions.sql) | 7.6 KB |
| [SOFTWARE CODE/DATABASE/migrations/007__seed_role_permissions.sql](SOFTWARE%20CODE/DATABASE/migrations/007__seed_role_permissions.sql) | 6.9 KB |
| [SOFTWARE CODE/DATABASE/migrations/008__seed_super_admin_users.js](SOFTWARE%20CODE/DATABASE/migrations/008__seed_super_admin_users.js) | 5.3 KB |
| [SOFTWARE CODE/DATABASE/migrations/009__seed_org_departments_sections.sql](SOFTWARE%20CODE/DATABASE/migrations/009__seed_org_departments_sections.sql) | 4.1 KB |
| [SOFTWARE CODE/DATABASE/migrations/010__seed_lookups_and_audit.sql](SOFTWARE%20CODE/DATABASE/migrations/010__seed_lookups_and_audit.sql) | 6.6 KB |
| [SOFTWARE CODE/DATABASE/migrations/050__backfill_cmms_cont_mst.sql](SOFTWARE%20CODE/DATABASE/migrations/050__backfill_cmms_cont_mst.sql) | 5.4 KB |
| [SOFTWARE CODE/DATABASE/migrations/099__isolate_legacy_unused.sql](SOFTWARE%20CODE/DATABASE/migrations/099__isolate_legacy_unused.sql) | 5.3 KB |
| [SOFTWARE CODE/DATABASE/runner/run-migrations.js](SOFTWARE%20CODE/DATABASE/runner/run-migrations.js) | 16 KB |
| [SOFTWARE CODE/DATABASE/runner/test-bootstrap.js](SOFTWARE%20CODE/DATABASE/runner/test-bootstrap.js) | 13 KB |
| SOFTWARE CODE/DATABASE/phase3/README.md | 9.7 KB |
| SOFTWARE CODE/DATABASE/phase3/package.json | 737 B |
| SOFTWARE CODE/DATABASE/phase3/.env.example | 2.0 KB | 

## 5.3 File-by-file walkthrough (all 12 migrations)

### 001 — `create_new_tables.sql` (~431 lines)

Creates all 15 NEW tables in FK-safe order:

```
   departments
     ├──► sections (FK department_id)
   cmms_cont_mst (standalone vendor master)
   permissions (standalone)
   roles (standalone)
     ├──► role_permissions (FK role+permission)
   users (FK cmms_emp_mst)
     ├──► user_roles (FK user+role)
     ├──► refresh_tokens (FK user)
   login_audit (no FK — loose employee_id)
   equipment_status_history (FK cmms_eqip_mst + cmms_emp_mst + cmms_jobcard_mst)
   job_request_status_history (FK cmms_jobrequest_mst + cmms_emp_mst)
   audit_log
     └──► audit_log_changes (FK audit_id)
   export_audit
```

**Idempotency:** every `CREATE TABLE` uses `IF NOT EXISTS`. `users.section_id` FK is **deferred** to migration 002 (because `sections` exists before the FK can resolve).

### 002 — `alter_legacy_tables.sql` (~307 lines)

Applies 6 ALTERs via an **idempotent stored procedure** `_cmcmis_safe_alter` that consults `information_schema` before each `ADD COLUMN / INDEX / FK`. Also adds `users.section_id` FK (deferred from 001). Includes M7/M8 backfills:

```sql
-- M7: legacy job cards → all VERIFIED_CLOSED
UPDATE cmms_jobcard_mst
   SET JM_MVP_STATUS = 'VERIFIED_CLOSED'
 WHERE JM_MVP_STATUS = 'ASSIGNED' AND JM_VERIFIED_ON IS NULL;

-- M8: legacy job requests → ASSIGNED if has SECTIONJOB_NO, else SUBMITTED
UPDATE cmms_jobrequest_mst
   SET JR_MVP_STATUS = CASE
         WHEN JR_SECTIONJOB_NO IS NOT NULL AND JR_SECTIONJOB_NO <> ''
              THEN 'ASSIGNED'
         ELSE 'SUBMITTED'
       END
 WHERE JR_MVP_STATUS = 'DRAFT' AND JR_MVP_STATUS_AT IS NULL;
```

### 003 — `pre_bootstrap_admin_section.sql` (~49 lines)

The M1 answer: INSERT new ADMIN section so SA/AC have valid `EMM_DEPT`:

```sql
INSERT IGNORE INTO cmms_section_mst
  (SM_ID, SM_SHORTNAME, SM_NAME, SM_HEAD_NAME, SM_STATE,
   SM_CREATED_BY, SM_CREATED_ON, SM_UPDATED_BY, SM_UPDATED_ON, …)
VALUES
  (9999, 'ADMIN', 'System Administration', NULL, 1,
   'BOOTSTRAP', NOW(6), 'BOOTSTRAP', NOW(6), …);
```

### 004 — `seed_super_admin_employees.sql` (~97 lines)

Insert SA79900 + AC77777 into `cmms_emp_mst` with `EMM_DEPT=9999`:

| Field | SA79900 | AC77777 |
|---|---|---|
| EMM_ID | 'SA79900' | 'AC77777' |
| EMM_NAME | 'System Super Admin (Primary)' | 'System Super Admin (Secondary)' |
| EMM_DESIGNATION | 'System Administrator' | 'System Administrator' |
| EMM_DEPT | 9999 | 9999 |
| EMM_EMAIL | sa79900@cmcmis.local | ac77777@cmcmis.local |
| EMM_INACTIVE | 0 | 0 |
| EMM_CREATED_BY / EMM_UPDATED_BY | 'BOOTSTRAP' | 'BOOTSTRAP' |

### 005 — `seed_roles.sql` (~29 lines)

5 rows with hard-coded `role_id` 1..5 for deterministic seeds. See §4.10.

### 006 — `seed_permissions.sql` (~73 lines)

40 atomic `resource:action` rows. See §4.11 for the catalogue table.

### 007 — `seed_role_permissions.sql` (~126 lines)

Strategic pattern:

```sql
-- SUPER_ADMIN gets ALL 40 permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT 1, p.permission_id, 'BOOTSTRAP' FROM permissions p;

-- Others: explicit IN-clause lists
INSERT IGNORE … SELECT 2, … WHERE p.permission_code IN (…30 perms…);
INSERT IGNORE … SELECT 3, … WHERE p.permission_code IN (…20 perms…);
INSERT IGNORE … SELECT 4, … WHERE p.permission_code IN (…12 perms…);
INSERT IGNORE … SELECT 5, … WHERE p.permission_code IN (…15 perms…);
```

### 008 — `seed_super_admin_users.js` (~142 lines) — the JS one

```javascript
async function up(connection, env) {
  const employeeIds = env.SUPER_ADMIN_EMPLOYEE_IDS.split(',');
  const rounds = parseInt(env.BCRYPT_ROUNDS, 10);  // M11: 10 dev / 12 prod

  for (const employeeId of employeeIds) {
    // 1. Validate locked regex ^[A-Z]{2}[0-9]{5}$
    if (!/^[A-Z]{2}[0-9]{5}$/.test(employeeId)) throw …;

    // 2. Idempotency guard
    if (await usersRowExists(employeeId)) { skip; continue; }

    // 3. bcrypt the password (= employee_id)
    const passwordHash = await bcrypt.hash(employeeId, rounds);

    // 4. SANITY CHECK: round-trip verify the hash
    if (!await bcrypt.compare(employeeId, passwordHash)) {
      throw 'Refuse to write a broken hash';
    }

    // 5. INSERT users + user_roles + 3 audit_log rows each
    INSERT INTO users (…, passwordHash, …);
    INSERT INTO user_roles (user_id, role_id=1, …);
    INSERT INTO audit_log (USER_CREATE, ROLE_ASSIGN, PASSWORD_SET);
  }
}
```

**End state:** `users` has 2 bcrypt-hashed rows; `user_roles` links both to SUPER_ADMIN; `audit_log` has 6 bootstrap rows.

### 009 — `seed_org_departments_sections.sql` (~84 lines)

Per Q8 + M9 (head_employee_id NULL on bootstrap):

```sql
INSERT IGNORE INTO departments (department_code, department_name, …)
VALUES ('TIMCD', 'Test/Inspection/Maintenance/Calibration Division', …);

INSERT IGNORE INTO sections (department_id, section_code, equipment_category, head_employee_id, …)
VALUES
  ((SELECT department_id FROM departments WHERE department_code='TIMCD'),
   'TME', 'Test & Measurement Equipment', 'TME', NULL, …),
  ((SELECT department_id FROM departments WHERE department_code='TIMCD'),
   'FPE', 'Fabrication & Production Equipment', 'FPE', NULL, …);
```

### 010 — `seed_lookups_and_audit.sql` (~91 lines)

Inserts **28 lookup rows** across 6 categories via `INSERT … ON DUPLICATE KEY UPDATE`:

| CategoryID | Description | Row count |
|---|---|---|
| 100 | JobRequest MVP Status | 8 (DRAFT…REOPENED) |
| 101 | Equipment MVP Status | 8 (PENDING_VERIFICATION…RETIRED) |
| 102 | Calibration Status | 5 (VALID, DUE_SOON, OVERDUE, OUT_OF_TOLERANCE, NOT_REQUIRED) |
| 103 | JobRequest Priority | 4 (LOW, NORMAL, HIGH, URGENT) |
| 104 | Equipment Category | 2 (TME, FPE) |
| 105 | JobRequest Type | 3 (CALIBRATION, REPAIR, REGISTRATION) |

Plus final `BOOTSTRAP_COMPLETE` audit marker.

### 050 — `backfill_cmms_cont_mst.sql` (~101 lines) — bonus per M3/M4

Wraps in `SET foreign_key_checks = 0;` (safe — we're inserting IDs already referenced by 5,704 orphan FKs), then:

```sql
INSERT IGNORE INTO cmms_cont_mst (CMM_CONT_ID, CMM_CONT_NAME, CMM_CONT_TYPE, …)
SELECT DISTINCT
  e.EQM_MFRID,
  COALESCE(NULLIF(TRIM(e.EQM_MFG_MODEL_NAME), ''),
           CONCAT('Vendor #', e.EQM_MFRID)),
  'MFR',
  …
FROM cmms_eqip_mst e
WHERE e.EQM_MFRID IS NOT NULL AND e.EQM_MFRID > 0;

-- Verification
SELECT COUNT(*) AS orphan_fks_remaining
  FROM cmms_eqip_mst e
  LEFT JOIN cmms_cont_mst c ON c.CMM_CONT_ID = e.EQM_MFRID
 WHERE c.CMM_CONT_ID IS NULL AND e.EQM_MFRID IS NOT NULL;
-- Should = 0
```

### 099 — `isolate_legacy_unused.sql` (~103 lines)

Renames 15 legacy tables to `_legacy_*` prefix via `_cmcmis_safe_rename` helper proc:

| Group | Tables |
|---|---|
| Orphans (8) | cf001–cf004, chklistvendor, 3× cmms_parameter_master variants |
| Dead/Empty (2) | cmms_cal_jobcard_feedback_spec, cmms_jobcard_insp_maint_dtl |
| Legacy RBAC (5) | cmms_accessright_mst, cmms_module_mst, cmms_role_mst, cmms_section_user_mst, cmms_userrole_mst |

After this, MVP code physically cannot read these tables by their original names.

## 5.4 Migration runner architecture

```
   ┌──────────────────────────────────────────────────────────────┐
   │                  RUNNER ARCHITECTURE                          │
   ├──────────────────────────────────────────────────────────────┤
                                                                  
   .env loaded → CFG (host/port/user/pwd/db/bcrypt/admins)
        │
        ▼
   mysql2/promise.createConnection({ multipleStatements: true })
        │
        ▼
   ensureMigrationsTable()  ──►  schema_migrations
        │                       (migration_id PK, sha256, time, ms)
        ▼
   listMigrationFiles()  ──►  sorted alphabetically
        │
        ▼
   ┌──────────────────────────────────────────────┐
   │ FOR EACH FILE:                               │
   │                                              │
   │   buf = fs.readFileSync(file)                │
   │   checksum = sha256(buf)                     │
   │   prev = SELECT FROM schema_migrations       │
   │                                              │
   │   IF prev AND prev.checksum == checksum:     │
   │     → SKIP (already applied, identical)      │
   │                                              │
   │   IF prev AND prev.checksum != checksum:     │
   │     → WARN (edited after apply; skip)        │
   │                                              │
   │   IF --dry-run:                              │
   │     → LOG (would run); continue              │
   │                                              │
   │   IF .sql:                                   │
   │     await conn.query(buf.toString())         │
   │   ELIF .js:                                  │
   │     mod = require(file)                      │
   │     await mod.up(conn, env)                  │
   │                                              │
   │   recordApplied(file, checksum, durationMs)  │
   │                                              │
   └──────────────────────────────────────────────┘
        │
        ▼
   runVerification(conn)  ──►  14-check post-bootstrap suite
        │
        ▼
   process.exit(0) if all pass · process.exit(1) if any fail
```

## 5.5 npm scripts

| Command | Action |
|---|---|
| `npm run migrate` | Apply pending migrations + run verification |
| `npm run migrate:dry` | Preview what WOULD be applied (no changes) |
| `npm run migrate:status` | Tabular status: ✅ applied / ⏳ pending |
| `npm run migrate:reset` | DROP `schema_migrations` only — tables untouched, forces re-run |
| `npm run test:bootstrap` | Run 7 end-to-end auth tests |

### npm dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "dotenv":   "^16.4.5",
    "mysql2":   "^3.11.0"
  }
}
```

Node ≥ 18.0.0. Target DB: MySQL 8.x · InnoDB · utf8mb4_0900_ai_ci.

## 5.6 14-check verification suite (auto-runs after `npm run migrate`)

| # | Check | Expected | Source of truth |
|---|---|---|---|
| 1 | `roles` count | == 5 | Migration 005 |
| 2 | `permissions` count | == 40 | Migration 006 |
| 3 | `role_permissions` count | > 100 | Grant matrix sum |
| 4 | `users` count | == 2 | M6 — no auto-create |
| 5 | `user_roles` count | == 2 | One per Super Admin |
| 6 | `departments` where code='TIMCD' | == 1 | Migration 009 |
| 7 | `sections` where code IN (TME, FPE) | == 2 | Migration 009 |
| 8 | `cmms_emp_mst` has SA79900 | == 1 | Migration 004 |
| 9 | `cmms_emp_mst` has AC77777 | == 1 | Migration 004 |
| 10 | `cmms_section_mst` has SM_ID=9999 | == 1 | M1 / Migration 003 |
| 11 | Lookup rows (CategoryID 100..199) | ≥ 25 | Migration 010 |
| 12 | `audit_log` BOOTSTRAP rows | ≥ 6 | Migrations 008+009+010 |
| 13 | **bcrypt round-trip SA79900** | TRUE | Critical correctness |
| 14 | **bcrypt round-trip AC77777** | TRUE | Critical correctness |

> If all 14 pass → Phase 3 is declared COMPLETE. Any fail → runner exits 1.

## 5.7 7 End-to-End Tests (`test-bootstrap.js` — DB-only, no HTTP)

```
   1. SA79900 logs in with password 'SA79900'
      → role=SUPER_ADMIN, ~40 permissions, login_audit SUCCESS

   2. SA79900 creates NORMAL_USER 'DS00001'
      (pre-step: INSERT 'DS00001' into cmms_emp_mst as 'Deep Sorathiya')
      → users row + user_roles row + audit_log USER_CREATE

   3. DS00001 logs in with password 'DS00001'
      → role=NORMAL_USER, ~12 permissions

   4. DS00001 tries to create a user
      → DENIED (no 'user:role-assign' permission) — 403 simulation

   5. DS00001 enters wrong password 'WX99999' (valid format, wrong value)
      → bcrypt fail + failed_login_count++ + FAILED_BAD_PASSWORD audit

   6. Login with malformed password 'abc123'
      → regex rejects BEFORE bcrypt (saves ~250ms CPU)
      → FAILED_INVALID_FORMAT audit

   7. Cleanup — reset DS00001 failed_login_count = 0
```

Then prints last 8 rows of `login_audit` as a console table for visual confirmation.

## 5.8 5-Step Quickstart for DS

```
   STEP 1.  Load 64-table dump into MySQL 8.x
   ──────────────────────────────────────────
            CREATE DATABASE cmcmis_redev
              CHARACTER SET utf8mb4
              COLLATE utf8mb4_0900_ai_ci;
            mysql -u root -p cmcmis_redev < cmcmis_schema_only.sql

   STEP 2.  Install npm deps
   ────────────────────────
            cd "SOFTWARE CODE/DATABASE/phase 3"
            npm install

   STEP 3.  Configure .env
   ──────────────────────
            cp .env.example .env
            # Edit with real DB creds
            # NODE_ENV=development → BCRYPT_ROUNDS=10 (faster)

   STEP 4.  Run migrations
   ──────────────────────
            npm run migrate:dry       # preview
            npm run migrate           # apply + auto-verify (14 checks)

   STEP 5.  E2E test
   ────────────────
            npm run test:bootstrap    # 7 tests
            
            Expected:
              ✓ SA79900 login successful
              ✓ DS00001 created
              ✓ DS00001 login successful
              ✓ DS00001 correctly DENIED
              ✓ Wrong password rejected
              ✓ Malformed password rejected
              ✓ Cleanup OK
              ✅ ALL TESTS PASSED — Phase 3 bootstrap RUNTIME READY
```

## 5.9 5 Layers of Idempotency

```
   Level 1: Runner-level
   ─────────────────────
   • schema_migrations table tracks every applied file
   • SHA-256 checksum stored per file
   • Subsequent runs skip files with matching checksum
   • Edited files trigger WARN (skips by default)

   Level 2: SQL-level
   ──────────────────
   • CREATE TABLE IF NOT EXISTS         (001)
   • INSERT IGNORE                       (003, 004, 005, 006, 007, 009)
   • INSERT … ON DUPLICATE KEY UPDATE   (010)
   • NOT EXISTS subquery + INSERT       (008, 009, 099, audit-log rows)

   Level 3: ALTER-level
   ────────────────────
   • _cmcmis_safe_alter procedure       (002)
       checks information_schema.columns / statistics / constraints
       BEFORE attempting ADD COLUMN / INDEX / FK
   • _cmcmis_safe_rename procedure      (099)
       checks both old and new table existence before RENAME

   Level 4: JS-level
   ─────────────────
   • 008 checks users.employee_id existence before INSERT
   • test-bootstrap uses INSERT IGNORE on cmms_emp_mst pre-step

   Level 5: Backfill-level
   ───────────────────────
   • 002 backfills only WHERE current value matches the default
   • 050 INSERTs only DISTINCT EQM_MFRID values
```

## 5.10 Recovery & Troubleshooting Matrix

| Scenario | Action |
|---|---|
| "I want to re-run everything from scratch" | `npm run migrate:reset && npm run migrate` |
| "A migration failed halfway" | Runner stops on first error; failed file NOT recorded. Fix → re-run resumes |
| "Cannot add foreign key constraint" | Verify legacy tables exist (load 64-table dump first) |
| "I edited migration 003 after running" | Runner detects checksum mismatch + WARNs but skips. Either: (a) accept change → manually UPDATE schema_migrations.checksum_sha256, or (b) revert the file |
| "Duplicate entry for key 'PRIMARY'" | Should never happen — all INSERTs are IGNORE or ON DUPLICATE KEY UPDATE. If it does, file was edited non-idempotently. Audit |
| "I want to nuke only the new tables" | `DROP TABLE export_audit, audit_log_changes, audit_log, job_request_status_history, equipment_status_history, login_audit, refresh_tokens, user_roles, users, role_permissions, permissions, roles, cmms_cont_mst, sections, departments, schema_migrations;` then re-run migrate |

## 5.11 Migration → v2.0 design cross-reference

| Migration | v2.0 Section | Locked Decision |
|---|---|---|
| 001 (new tables) | §7.4, §8.2, §9.2, §10.2, §11.1 | Cluster 1, 2, 3, 4, 10 DDL |
| 002 (ALTERs) | §7.4 (users FK), §9.2 (eqip), §10.2 (JR, JC), §12.1 (param_master) | M7 + M8 backfills |
| 003 (ADMIN section) | §7.6 + §18.2.a | M1 |
| 004 (SA/AC emp seed) | §7.6 | M2 |
| 005 (5 roles) | §7.2, §7.4 (1.2) | Q4 |
| 006 (40 perms) | §7.4 (1.3) + FINAL-DESC §6 | Locked catalogue |
| 007 (grant matrix) | §7.5 | Locked matrix |
| 008 (SA/AC users) | §7.6, ADR-DB-03, ADR-DB-08 | Q7 + M11 |
| 009 (TIMCD+T&ME+F&PE) | §8.2 | Q8 + M9 |
| 010 (lookups) | §12.3 | Locked lookup values |
| 050 (vendor backfill) | §18.2.b + ADR-DB-06 | M3 + M4 |
| 099 (legacy isolation) | §14 + ADR-DB-01 | "Isolate not delete" |

---

# PART 6 — SYNTHESIS

---

## 6.1 Authority Chain (one diagram)

```
   ┌────────────────────────────┐
   │  FINAL-DESC-CMCMIS v1.0    │  ← behaviour, BR/FR/NFR contract
   │  (the spec)                │
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │  FINAL_DB_DESIGN_v2.0      │  ← schema canon
   │  (2,957 lines)             │
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │  PHASE3_COMPLETE_v2.0      │  ← delivered bundle
   │  16 files / ~2,800 lines   │
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │  CMCMIS_MASTER_BLUEPRINT   │  ← consolidation read
   │  + this Phase 0→3 report   │
   └────────────────────────────┘

   Conflict resolution:  FINAL-DESC wins behaviour.
                         v2.0       wins schema.
```

## 6.2 Cross-reference cheat sheet

| If you need to know… | Look at |
|---|---|
| What modules exist | §1.5 |
| Who can do what | §1.6 + §2.8 (BR-RBAC) + §4.11 |
| How state moves | §2.12 |
| Why a library was chosen | §2.1 + §2.6 |
| Where code goes | §2.5 |
| What an endpoint must enforce | §2.8 |
| Whether something is in MVP | §1.7 + §1.8 |
| What the legacy DB looks like | §3 |
| What new tables we're creating | §4.4 |
| What's ALTERed on legacy | §4.5 |
| What's been isolated | §4.6 |
| Password rules | §4.9 |
| How RBAC works mechanically | §4.10 |
| The migration files | §5.3 |
| How to run it | §5.8 |
| When something breaks | §5.10 |

## 6.3 Decision-Making Compass

When stuck on a design choice, walk this tree:

```
Is it in §1.8 (Constraints) NO list?
  └─ YES → reject, do not propose
  └─ NO ↓

Does it violate any BR in §2.8?
  └─ YES → reject or escalate
  └─ NO ↓

Is it in MVP §1.7 scope?
  └─ NO → defer to Phase 2 backlog
  └─ YES ↓

Does it conflict with an ADR in §2.6 or §4.8?
  └─ YES → cannot proceed without unlocking that ADR
  └─ NO ↓

Does a locked decision (D1–D11, C1–C5, M1–M12, ADR-DB-01..10) cover it?
  └─ YES → follow that
  └─ NO ↓

Propose to user (with tradeoff table) → lock decision → add to register
```

## 6.4 What's Locked at Every Layer

| Layer | What's locked | Where |
|---|---|---|
| **Behaviour contract** | BRs, FRs, NFRs, state machines | §2.8, §2.9, §2.10, §2.12 |
| **Tech stack** | Every library, every version | §2.1 |
| **Architecture** | Topology, layered flow, folder structure, API conventions | §2.2, §2.3, §2.5, §2.7 |
| **Decisions** | D1–D11, C1–C5, +6 stack adds | §2.6 |
| **Constraints** | 14 hard NOs | §1.8 |
| **DB design** | Two-universe, 53 active + 26 isolated, 15 NEW, 6 ALTER | §4 |
| **Schema decisions** | ADR-DB-01..10 | §4.8 |
| **Password policy** | Regex, bcrypt cost, lifetime, regex enforcement | §4.9 |
| **RBAC** | 5 roles, 40 permissions, ~110 grants | §4.10–§4.11 |
| **Migration data** | M1–M12 answers | §4.13 |
| **Bootstrap order** | 10 deterministic steps | §4.12 |
| **Delivered code** | 16 files on disk | §5 |
| **Verification gate** | 14 checks + 7 E2E tests | §5.6, §5.7 |

## 6.5 Phase 4 Hand-off

```
   ┌────────────────────────────────────────────────────────────────┐
   │   PHASE 3   →   PHASE 4 HAND-OFF                               │
   ├────────────────────────────────────────────────────────────────┤
   │                                                                │
   │   PHASE 3 EXIT GATE (must pass before Phase 4 starts):         │
   │   ─────────────────────────────────────────────────────        │
   │   ☑ 14-check verification suite: 14/14 pass                    │
   │   ☑ 7 E2E bootstrap tests: 7/7 pass                            │
   │   ☑ bcrypt round-trip on both SA79900 and AC77777: TRUE        │
   │   ☑ Disk artifacts present at SOFTWARE CODE/DATABASE/          │
   │                                                                │
   │   PHASE 4 BUILD ORDER (auth-first):                            │
   │   ─────────────────────────────────                            │
   │   4.0  Repo scaffold (/server, /web, root tooling)             │
   │   4.1  BE auth module — login + refresh + logout               │
   │   4.2  BE middleware — authenticate + authorize + rateLimit    │
   │   4.3  BE GET /api/v1/me                                       │
   │   4.4  BE admin module — user CRUD + role assign               │
   │   4.5  FE login page + auth-context + ProtectedRoute           │
   │        + axios interceptors    (note: .jsx not .tsx per D1)    │
   │   4.6  FE AppShell + permission-filtered Sidebar               │
   │   4.7  FE admin/{UsersList, AddUser, ChangeRole}               │
   │   4.8  SMOKE TEST GATE — browser SA79900 → create DS00001 →    │
   │        login DS00001 → verify 403 on /admin/users              │
   │                                                                │
   │   THEN PROCEED:                                                │
   │   4.9   Equipment module BE+FE                                 │
   │   4.10  Job Request module BE+FE                               │
   │   4.11  Job Card module BE+FE + PDF                            │
   │   4.12  Dashboard + Inquiry                                    │
   │   4.13  Hardening (NFR, security, accessibility)               │
   │   4.14  Deploy dry-run + handoff                               │
   │                                                                │
   │   STYLE MANDATE:                                               │
   │   ─────────────                                                │
   │   HIGH-COMMENT, HIGH-PRECISION mode is in effect for all       │
   │   Phase 4 code. Every file gets header + per-function JSDoc +  │
   │   inline citations of BR/FR/D/ADR IDs at every decision point. │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘
```

## 6.6 One-Page Mental Model

```
╔══════════════════════════════════════════════════════════════════╗
║                CMCMIS — PHASE 0→3 IN ONE PAGE                    ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  WHO    DS, Software Developer Intern (solo)           ║
║  WHY    Replace paper/manual instrument lifecycle for ISRO-SAC   ║
║         style defence-grade R&D org                              ║
║  WHAT   9-module MIS: Auth+RBAC, Equipment, JR, JC, Dashboard,   ║
║         Inquiry (MVP) + Schedule, Procurement, Vendors, Reports, ║
║         Admin (Phase 2)                                          ║
║  WHO    5 roles only — Super Admin, Lab In-charge, Lab Engineer, ║
║  USES   Normal User, View-Only (NO separate Admin role)          ║
║                                                                  ║
║  STACK  JS + JSDoc + Zod (no TS), React 18 + Vite + Tailwind v3, ║
║         Express 4 + mysql2 (raw SQL, repo pattern, no ORM),      ║
║         pdfkit (no Puppeteer), Pino, PM2 + Nginx                 ║
║                                                                  ║
║  RULES  60-min idle session · 15-min JWT + 7-day refresh cookie  ║
║         1 primary role per user · PENDING_VERIFICATION default   ║
║         append-only history · audit every write op               ║
║         password ^[A-Z]{2}[0-9]{5}$ · bcrypt 12 prod / 10 dev    ║
║         initial password = employee_id · lifetime (until SSO)    ║
║                                                                  ║
║  NO     SSO, cloud, file storage, email, Redis, backups, mobile  ║
║         QR, TS, ORM                                              ║
║                                                                  ║
║  DB     LEGACY ─── coexist ─── NEW                                ║
║         60 cmms_* tables       15 NEW snake_case                 ║
║         390K rows preserved    6 ALTERed (legacy + new cols)     ║
║         26 isolated _legacy_*  32 kept active                    ║
║         53 active MVP runtime · 79 grand total                   ║
║         Admin section SM_ID=9999  ·  SA79900 + AC77777 seeded    ║
║                                                                  ║
║  CODE   16 files / ~2,800 lines on disk under                    ║
║         SOFTWARE CODE/DATABASE/                                  ║
║         12 migrations + Node runner + 7-test E2E + README        ║
║         5 layers of idempotency · 14 auto verification checks    ║
║                                                                  ║
║  TIME   10 weeks → MVP demo → Phase 2 handoff                    ║
║                                                                  ║
║  PHASE  ✅ 0 — Genesis                                            ║
║  STATE  ✅ 1 — Foundation                                         ║
║         ✅ 2 — Architecture & Contracts                           ║
║         ✅ 3 — DB Design + Bundle DELIVERED · RUNTIME READY      ║
║         🟢 4 — Software coding (next)                             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

# APPENDIX A — Locked Terminology

| Term | Meaning |
|---|---|
| **CMCMIS** | Computerized Maintenance & Calibration Management Information System |
| **T&ME** | Test & Measurement Equipment (cal frequency MANDATORY) |
| **F&PE** | Functional & Performance Equipment (cal frequency OPTIONAL) |
| **TIMCD** | Test/Inspection/Maintenance/Calibration Division (parent department) |
| **JR** | Job Request (intake ticket) |
| **JC** | Job Card (execution artefact) |
| **PM** | Preventive Maintenance |
| **AMC** | Annual Maintenance Contract |
| **PENDING_VERIFICATION** | Default state of freshly-registered equipment |
| **OUT_OF_TOLERANCE** | Reading exceeded allowed limits |
| **CONDEMN** | Soft-delete via status flip |
| **next_cal_due_date** | last_cal_date + calibration_frequency_months |
| **Standards used** | Reference instruments used to calibrate another |
| **Uncertainty** | Numeric error band on a measurement |

---

# APPENDIX B — File Index

### Repo root (verified on disk 2026-05-17)

| Path | Type |
|---|---|
| [DB/cmcmis_schema_analysis_bundle/](DB/cmcmis_schema_analysis_bundle/) | Legacy 64-table audit |
| [DB/cmcmis_schema_analysis_bundle/cmcmis_schema_only.sql](DB/cmcmis_schema_analysis_bundle/cmcmis_schema_only.sql) | DDL dump |
| [DB/cmcmis_schema_analysis_bundle/cmcmis_table_summary.csv](DB/cmcmis_schema_analysis_bundle/cmcmis_table_summary.csv) | Row counts + FK summary |
| [DB/cmcmis_schema_analysis_bundle/cmcmis_schema_key_report.md](DB/cmcmis_schema_analysis_bundle/cmcmis_schema_key_report.md) | Pre-analyzed keys |
| [DB/cmcmis_schema_analysis_bundle/cmcmis_schema_keys.json](DB/cmcmis_schema_analysis_bundle/cmcmis_schema_keys.json) | Keys in JSON |
| [SOFTWARE CODE/DATABASE/](SOFTWARE%20CODE/DATABASE/) | Phase 3 bundle root |
| [SOFTWARE CODE/DATABASE/PHASE3_COMPLETE_v2.0.md](SOFTWARE%20CODE/DATABASE/PHASE3_COMPLETE_v2.0.md) | Phase 3 spec |
| [SOFTWARE CODE/DATABASE/migrations/](SOFTWARE%20CODE/DATABASE/migrations/) | 12 SQL/JS files |
| [SOFTWARE CODE/DATABASE/runner/](SOFTWARE%20CODE/DATABASE/runner/) | run-migrations.js + test-bootstrap.js |
| SOFTWARE CODE/DATABASE/phase 3/ | README + package.json + .env.example |
| [Documents/CMCMIS_MASTER_BLUEPRINT.md](Documents/CMCMIS_MASTER_BLUEPRINT.md) | Project consolidation v1.0 |
| [Documents/CMCMIS_PHASE_0_TO_3_COMPLETE_REPORT.md](Documents/CMCMIS_PHASE_0_TO_3_COMPLETE_REPORT.md) | **This document** |

### Memory entries (Claude-side, in `~/.claude/projects/.../memory/`)

| Memory | What it captures |
|---|---|
| user_role.md | Harsh = SDE intern, solo, 10 weeks |
| feedback_response_style.md | Structured tables+diagrams+flowcharts |
| feedback_code_style_high_comments.md | HIGH-COMMENT mandate for Phase 4 code |
| feedback_shell_preference.md | Bash only, never PowerShell |
| project_cmcmis_overview.md | High-level domain context |
| project_cmcmis_tech_stack.md | Locked v3 |
| project_cmcmis_modules_roles.md | 9 modules · 5 roles |
| project_cmcmis_mvp_scope.md | MVP vs Phase 2 |
| project_cmcmis_constraints.md | 14 hard NOs |
| project_cmcmis_business_rules.md | Full BR/FR/NFR catalogue |
| project_cmcmis_decisions.md | D1–D11 + C1–C5 + 6 stack adds |
| project_cmcmis_existing_db.md | Phase 3 Day 1 audit (superseded for design) |
| project_cmcmis_db_v2_locked.md | DB design v2.0 LOCKED |
| project_cmcmis_db_v2_migration_answers.md | M1–M12 LOCKED |
| project_cmcmis_phase3_delivered.md | Bundle file list + runner spec |
| project_cmcmis_next_phase_code.md | Phase 4 build order + style mandate |

---

# APPENDIX C — Acronyms

| Acronym | Expansion |
|---|---|
| ADR | Architectural Decision Record |
| AMC | Annual Maintenance Contract |
| BR | Business Rule |
| C | Confirmation (decision register) |
| CMCMIS | Computerized Maintenance & Calibration Management Information System |
| D | Decision (decision register) |
| DDL | Data Definition Language |
| F&PE | Functional & Performance Equipment |
| FE / BE | Frontend / Backend |
| FK | Foreign Key |
| FR | Functional Requirement |
| HSTS | HTTP Strict Transport Security |
| ISO | International Organization for Standardization |
| JC | Job Card |
| JR | Job Request |
| JWT | JSON Web Token |
| M | Migration data question (Phase 3) |
| MIS | Management Information System |
| MVP | Minimum Viable Product |
| NABL | National Accreditation Board for Testing and Calibration Laboratories |
| NFR | Non-Functional Requirement |
| ORM | Object-Relational Mapper |
| PK | Primary Key |
| PM | Preventive Maintenance |
| PM2 | Process Manager 2 (Node.js cluster mgr) |
| RBAC | Role-Based Access Control |
| SAC | Space Applications Centre |
| SPA | Single-Page Application |
| SSO | Single Sign-On |
| T&ME | Test & Measurement Equipment |
| TIMCD | Test/Inspection/Maintenance/Calibration Division |
| TLS | Transport Layer Security |
| UAT | User Acceptance Testing |

---

**END OF CMCMIS PHASE 0 → PHASE 3 COMPLETE REPORT — v1.0**

*Consolidation of FINAL-DESC-CMCMIS v1.0 + FINAL_DB_DESIGN_v2.0 + PHASE3_COMPLETE_v2.0 + all locked memory.*
*Frozen at 2026-05-17. Any update requires explicit v1.1 revision with user sign-off.*
