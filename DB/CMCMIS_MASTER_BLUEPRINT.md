# CMCMIS — MASTER BLUEPRINT

> **Computerized Maintenance & Calibration Management Information System**
> Single source of truth for the 10-week MVP build.
> Owner: Harsh Khanna (Software Developer Intern) • Date: 2026-05-17 • Version: v1.0 (locked)

---

## TABLE OF CONTENTS

```
PART A — IDENTITY & CONTEXT
  1. Project Identity
  2. Executive Summary
  3. Domain Glossary (read this first if you're new)
  4. Stakeholders & Users
  5. Business Drivers

PART B — WHAT WE'RE BUILDING
  6. Module Architecture Map (9 modules)
  7. Roles & RBAC (5 roles)
  8. State Machines (Equipment + Job Request + Job Card)
  9. MVP Scope & Timeline
 10. Constraints (the hard NOs)

PART C — HOW WE'RE BUILDING IT
 11. Tech Stack (locked v3)
 12. Architecture & Production Topology
 13. Architectural Decision Register (D1–D11 + C1–C5)
 14. Folder Structure (FE + BE)
 15. API Design Conventions

PART D — THE CONTRACT
 16. Business Rules (BR catalogue)
 17. Functional Requirements (FR catalogue)
 18. Non-Functional Requirements (NFR targets)

PART E — DATA LAYER
 19. Existing Database Inventory (64 legacy tables)
 20. Critical DB Findings (Phase 3 audit flags)
 21. New Schema Strategy (cmcm_* prefix)
 22. Security Model

PART F — DELIVERY
 23. 10-Week Build Plan
 24. Risk Register
 25. Pending Inputs From User
 26. Quick Recap (one-page mental model)
```

---

# PART A — IDENTITY & CONTEXT

---

## 1. PROJECT IDENTITY

| Field | Value |
|---|---|
| **System name** | CMCMIS — Computerized Maintenance & Calibration MIS |
| **Domain** | T&ME (Test & Measurement Equipment) + F&PE (Functional & Performance Equipment) lab operations |
| **Org type** | ISRO SAC-style — defence / space-grade / mission-critical |
| **Deployment** | Internal on-prem / private intranet (NO public cloud) |
| **Project nature** | Real organizational production system (not a prototype) |
| **Team size** | Solo developer (intern) + AI pair |
| **Timeline** | 10-week MVP, then Phase 2 handoff |
| **Lead** | Harsh Khanna — Software Developer Intern |
| **Repo root** | `e:\SOFTWAREs By DS\cmcmis-simplified` |
| **Today** | 2026-05-17 |

---

## 2. EXECUTIVE SUMMARY

CMCMIS replaces the org's manual / paper / fragmented process for managing the **full lifecycle of laboratory instruments** — from registration through calibration, repair, and retirement.

```
┌──────────────────────────────────────────────────────────────────┐
│                  CMCMIS — One-Sentence Pitch                     │
│                                                                  │
│  "A permission-driven, audit-tracked, on-prem MIS that runs      │
│   every laboratory instrument's lifecycle — register → calibrate │
│   → maintain → repair → retire — for a defence-grade R&D org."   │
└──────────────────────────────────────────────────────────────────┘
```

### The lifecycle in one picture

```
         ┌──────────────┐
         │  REGISTER    │  ← any role except View-Only
         │  equipment   │     defaults to PENDING_VERIFICATION
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │   VERIFY     │  ← Lab In-charge / Super Admin
         │ → ACTIVE     │
         └──────┬───────┘
                │
   ┌────────────┼─────────────┬──────────────┐
   ▼            ▼             ▼              ▼
┌────────┐ ┌──────────┐ ┌──────────┐  ┌──────────────┐
│ JOB    │ │   PM     │ │  REPAIR  │  │ OUT-OF-TOL / │
│REQUEST │ │ Schedule │ │  ticket  │  │  QUARANTINE  │
│(cal/rep│ │ (Phase2) │ │          │  │              │
└───┬────┘ └──────────┘ └──────────┘  └──────────────┘
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
│ next_cal_due_date   │
│   recomputed        │
└─────────────────────┘
```

### Why this matters

| Stakeholder | Pain point CMCMIS solves |
|---|---|
| **Lab engineers** | Paper job cards lost; no calibration due reminders; manual cert typing |
| **Lab in-charge** | No visibility on queue, engineer workload, overdue calibrations |
| **Super Admin / Mgmt** | No audit trail; can't answer "who calibrated what, when, with what reading" |
| **Audit / Compliance** | Cannot reconstruct equipment history; cert reissue is manual |
| **Org IT** | Disparate tools, no central RBAC, no SSO-readiness |

---

## 3. DOMAIN GLOSSARY (read this first)

Skip if you're already fluent. **Critical:** this is defence-grade — terms are precise, not vibes.

| Term | Meaning |
|---|---|
| **T&ME** | Test & Measurement Equipment — measures something (multimeter, oscilloscope, spectrum analyser). MUST have calibration frequency. |
| **F&PE** | Functional & Performance Equipment — does/performs something (chamber, power supply, fixture). Calibration frequency optional. |
| **Calibration** | Comparing an instrument's reading against a reference standard, recording deviation, certifying it. |
| **Calibration frequency** | How often (in months) the instrument must be recalibrated. Often regulated (NABL / ISO 17025 / AS9100). |
| **`next_cal_due_date`** | `last_cal_date + calibration_frequency_months`. Drives dashboard alerts. |
| **Out-of-tolerance** | Instrument reading deviates beyond allowed limits → flagged → reverse-investigation may be needed on all measurements taken since the last good cal. |
| **Job Request (JR)** | Intake ticket — "please calibrate / repair / register this". |
| **Job Card (JC)** | The execution artefact — created when JR is approved + assigned. Engineer fills readings, observations, tasks. |
| **PM** | Preventive Maintenance — scheduled, non-corrective servicing. |
| **AMC** | Annual Maintenance Contract — vendor-side service agreement. |
| **NABL / ISO 17025 / AS9100** | Accreditation standards. **NOT in MVP** — user will instruct when needed. |
| **Standards used** | The reference instruments (themselves traceable) used to calibrate another instrument. Required on cert. |
| **Uncertainty** | The numeric error band of a measurement, reported on cert. Placeholder fields in MVP cert; full calc Phase 2. |
| **Condemn** | Status flip to mark equipment unfit for further use (soft delete). |
| **PENDING_VERIFICATION** | Default state of a freshly-registered equipment until Lab In-charge / Super Admin verifies. |

---

## 4. STAKEHOLDERS & USERS

```
                    ┌──────────────────────┐
                    │   Super Admin (×2)   │ ◄── SA79900, AC77777 (seeded)
                    │ Ultimate authority   │
                    │ Assigns roles        │
                    │ Owns master data     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Lab In-charge      │
                    │ Approves JRs         │
                    │ Verifies equipment   │
                    │ Closes job cards     │
                    │ Reopens if needed    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Lab Engineer       │
                    │ Executes job cards   │
                    │ Fills readings       │
                    │ Logs observations    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Normal User        │
                    │ Raises JRs           │
                    │ Registers equipment  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   View-Only User     │
                    │ Reads everything     │
                    │ Writes NOTHING       │
                    └──────────────────────┘
```

> **Locked decision:** there is **NO separate "Admin" role**. Super Admin is the only admin tier.

---

## 5. BUSINESS DRIVERS

| Driver | What it forces in design |
|---|---|
| **Defence-grade audit trail** | Every write op logged with who/what/when/before/after/IP/UA |
| **Mission-critical reliability** | 99% uptime in business hours, PM2 cluster, auto-restart |
| **On-prem reality** | No Chromium (pdfkit not Puppeteer), no Redis, no cloud SDKs |
| **Engineer-first UX** | ≤3 clicks to any feature, keyboard shortcuts, data-dense lists |
| **Existing 64-table legacy DB** | Refactor + extend, not greenfield; new tables prefixed `cmcm_` |
| **Compliance-ready architecture** | NABL/ISO 17025 hooks built generic; specifics deferred |
| **SSO-future** | v1 uses employee_id+password; arch must accept AD/SSO drop-in |

---

# PART B — WHAT WE'RE BUILDING

---

## 6. MODULE ARCHITECTURE MAP (9 modules, plus Admin)

### Block diagram — how modules connect

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
   │  (master)      │◄──┤  (intake)      ├───►│ (execution)        │  ← BLOCK 2 core flow
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

### Module-by-module status

| # | Module | MVP? | Owner role(s) | Notes |
|---|---|---|---|---|
| 1 | **Dashboard** | ✅ | All (role-aware view) | KPIs, cal-due alerts, engineer workload |
| 2 | **Job Requests** | ✅ | Normal+ creates; Lab In-charge approves | DRAFT → SUBMITTED → … |
| 3 | **Job Cards** | ✅ | Engineer executes; Lab In-charge closes | Auto-created on JR approval |
| 4 | **Equipment** | ✅ | All except View-Only can register | PENDING_VERIFICATION default |
| 5 | Schedule | ❌ Phase 2 | — | PM + Cal calendar |
| 6 | Procurement | ❌ Phase 2 | — | POs, spares |
| 7 | Vendors | ❌ Phase 2 | — | Master data |
| 8 | **Inquiry** | ✅ | All (read) | 4-tab search hub |
| 9 | Reports | ❌ Phase 2 | — | Analytics + exports |
| 10 | **Admin** | Partial | Super Admin | RBAC actions in MVP; master CRUD UI Phase 2 |

### Cross-cutting concerns (in MVP)

| Concern | Where it lives |
|---|---|
| **Audit log** | Generic `cmcm_audit_log` table, written by service layer on every state-changing op |
| **PDF generation** | Generic `pdfService` (pdfkit) — any module plugs template |
| **Permissions** | Centralized middleware `requirePermission('resource:action')` |
| **Row-level visibility** | Service-layer scoping based on role + user_id |
| **Pagination** | Standard `?page=&limit=&sort=&q=` query convention |

---

## 7. ROLES & RBAC (3-layer model)

### The 5 roles (final, locked)

```
Level | Role            | Can do                                              | Cannot do
------|-----------------|-----------------------------------------------------|------------------
  5   | Super Admin     | Everything; assign roles; master data CRUD          | (nothing — top)
  4   | Lab In-charge   | Approve JR, verify equipment, close/reopen JC       | Assign roles
  3   | Lab Engineer    | Execute job cards, fill readings                    | Approve, verify
  2   | Normal User     | Raise JR, register equipment                        | Approve, execute
  1   | View-Only User  | READ all visible data                               | Any write
```

### Special override (LOCKED)

> `equipment:create` is granted to **all roles except View-Only** — even Normal Users can register a new instrument (then it sits in `PENDING_VERIFICATION` until Lab In-charge / Super Admin verifies).

### The 3-layer RBAC model

```
   ┌────────┐      ┌────────┐       ┌─────────────┐       ┌────────────────────┐
   │  USER  │─────►│  ROLE  │──────►│ PERMISSION  │──────►│ RESOURCE + ACTION  │
   └────────┘      └────────┘       └─────────────┘       └────────────────────┘
   employee_id    1 primary role    e.g. "jc:verify"      e.g. job_card.verify()
                  (BR-RBAC-02)      granular, not roles
```

| Layer | Stored in (new schema) | Notes |
|---|---|---|
| User | `cmcm_users` (FK to employee directory) | active/inactive flag |
| Role | `cmcm_roles` (5 rows seeded) | name unique |
| Permission | `cmcm_permissions` | granular: `resource:action` |
| Mapping | `cmcm_role_permissions`, `cmcm_user_roles` | join tables |

### Auth flow (sequence)

```
[Browser]                  [Nginx]               [Express API]              [MySQL]
   │   POST /auth/login        │                       │                      │
   │   {emp_id, password}      │                       │                      │
   ├──────────────────────────►├──────────────────────►│                      │
   │                           │                       │ SELECT user          │
   │                           │                       ├─────────────────────►│
   │                           │                       │◄─────────────────────┤
   │                           │                       │ bcrypt.compare()     │
   │                           │                       │ load roles+perms     │
   │                           │                       ├─────────────────────►│
   │                           │                       │◄─────────────────────┤
   │                           │                       │ sign JWT (15min)     │
   │                           │                       │ set refresh cookie   │
   │                           │                       │   httpOnly (7d)      │
   │   200 + JWT body          │                       │                      │
   │   + Set-Cookie refresh    │                       │                      │
   │◄──────────────────────────┤◄──────────────────────┤                      │
   │                           │                       │                      │
   │   GET /api/v1/equipment   │                       │                      │
   │   Authorization: Bearer…  │                       │                      │
   ├──────────────────────────►├──────────────────────►│ verify JWT           │
   │                           │                       │ requirePermission()  │
   │                           │                       │ scope by row-vis     │
   │                           │                       ├─────────────────────►│
   │                           │                       │◄─────────────────────┤
   │◄──────────────────────────┤◄──────────────────────┤                      │
```

### Permission catalogue (initial)

| Resource | Actions |
|---|---|
| `auth` | `login`, `refresh`, `logout` |
| `user` | `read`, `create`, `update`, `deactivate`, `assign_role` |
| `equipment` | `read`, `create`, `update`, `verify`, `condemn`, `delete` |
| `job_request` | `read`, `create`, `update_draft`, `submit`, `approve`, `reject`, `assign` |
| `job_card` | `read`, `start`, `complete`, `verify`, `reopen`, `pdf` |
| `dashboard` | `read` |
| `inquiry` | `read` |
| `audit_log` | `read` |
| `master_data` | `read`, `create`, `update`, `delete` (Phase 2 UI) |

> **Rule:** code never checks `role.name === 'Super Admin'`. It checks `user.permissions.has('equipment:verify')`.

---

## 8. STATE MACHINES

### 8.1 Equipment Lifecycle

```
                       (BR-EQP-10)
                       ┌──────────────────────────┐
                       │   PENDING_VERIFICATION   │
                       │   (default on register)  │
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

**Enforcement:** single `equipment.transition(toStatus, ctx)` function in service layer. DB stores history in `cmcm_equipment_status_hist` (append-only).

### 8.2 Job Request Lifecycle

```
   DRAFT ──submit──► SUBMITTED ──approve──► ASSIGNED  ──► (creates JC)
     ▲                  │
     │                  └──reject (reason+code mandatory)──► REJECTED
     │
   (user edits before submit)
```

| State | Who can transition | To |
|---|---|---|
| DRAFT | requester | SUBMITTED (delete also allowed) |
| SUBMITTED | Lab In-charge | ASSIGNED, REJECTED |
| ASSIGNED | (system, on approve) | — flows into JC |
| REJECTED | (terminal) | — |

### 8.3 Job Card Lifecycle

```
   ASSIGNED ──start──► IN_PROGRESS ──complete──► COMPLETED ──verify──► VERIFIED/CLOSED
                                                                          │
                                                            ◄──reopen──── (Lab I/C only, reason)
```

| State | Who | Gate |
|---|---|---|
| ASSIGNED | system | created on JR approve |
| IN_PROGRESS | assigned engineer only | — |
| COMPLETED | assigned engineer only | cal cards need before+after readings + env conds (BR-JC-07) |
| VERIFIED/CLOSED | Lab In-charge only | — |
| REOPENED | Lab In-charge only | mandatory reason |

> **All transitions append to `cmcm_jobcard_status_hist` (immutable, BR-JC-08).**

---

## 9. MVP SCOPE & TIMELINE

### MVP delivery in 3 blocks

```
┌────────────────────────────────────────────────────────────────┐
│ BLOCK 1 — AUTH + RBAC (foundation, ships first)               │
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

### MVP IN / Phase 2 OUT

| ✅ MVP IN | ❌ Phase 2 OUT |
|---|---|
| Auth + RBAC + protected routes | Schedule module |
| Equipment master + register + verify | Procurement |
| Job Requests | Reports |
| Job Cards | Admin master-data CRUD UI |
| Dashboard | Notifications (any channel) |
| Inquiry (4-tab) | NABL/ISO 17025 cert templates |
| PDF generation (download only) | Compliance specifics |
| Audit log (basic) | Notification channels |
| Responsive UI (desktop+laptop) | Mobile / tablet UI |

### What user has explicitly deferred

> Do **not** pre-architect any of: NABL/ISO 17025/AS9100 specifics, cert template format, specific report formats/fields, notification channels (email/in-app/SMS/push), data retention policy. Wait for instructions.

---

## 10. CONSTRAINTS (the hard NOs)

| # | Constraint | Decision |
|---|---|---|
| 1 | Organization context | ISRO-SAC-like defence/space-grade |
| 2 | Existing DB | 64 tables in `cmcmis_redev` — refactor/extend, not greenfield |
| 3 | SSO in v1 | ❌ NO — `employee_id` + password; SSO-ready arch only |
| 4 | Deployment | ✅ On-prem only — ❌ no AWS/Azure/GCP |
| 5 | File storage | ❌ NO uploads/attachments; PDFs generated on demand only |
| 6 | Email / SMTP | ❌ NO |
| 7 | Redis / cache | ❌ NO — SQL + pagination + connection pool only |
| 8 | Backup infra | ❌ Out of scope (user handles) |
| 9 | Mobile / tablet UI | ❌ NO — desktop+laptop only; responsive within that |
| 10 | Barcode / QR | ❌ NO |
| 11 | PDF generation | ✅ YES — on demand, no storage |
| 12 | Sensitive data | Defence-grade RBAC + row-level visibility + secure sessions + limited exports |
| 13 | Compliance specifics | TBD — user will instruct |
| 14 | Notifications | TBD — user will instruct |

---

# PART C — HOW WE'RE BUILDING IT

---

## 11. TECH STACK (LOCKED v3)

### 11.1 Frontend — React 18 + Vite + Tailwind v3

| Concern | Library | Why |
|---|---|---|
| Build | `vite` | Fast HMR, modern default |
| Framework | `react@18` | Locked |
| Routing | `react-router-dom@v6` | Standard SPA |
| Local state | `useState` / `useReducer` | Built-in |
| Global state | `zustand` | ~1KB, no boilerplate |
| Server state | `@tanstack/react-query` | Caching, mutations |
| HTTP | `axios` | Interceptors for JWT + errors |
| Forms | `react-hook-form` + `zod` | Schema shared with BE |
| UI primitives | Custom on Tailwind | Avoid lock-in |
| Tables | `@tanstack/react-table` | Headless, sort/filter/paginate |
| Tailwind plugin | `@tailwindcss/forms` | Sane form defaults |
| Icons | `lucide-react` | Tree-shakable |
| Charts | `recharts` | Dashboard widgets |
| Date | `dayjs` | Same as BE → symmetry |
| Toasts | `sonner` | Lightweight |
| Lint/Format | `eslint` + `prettier` + `husky` + `lint-staged` | Pre-commit enforced |
| Test | `vitest` | Same runner as BE |

### 11.2 Backend — Node + Express 4

| Concern | Library | Version | Why |
|---|---|---|---|
| Web framework | `express` | ^4.x | Stable, ubiquitous |
| DB driver | `mysql2/promise` | ^3.x | Fastest, native promises |
| Validation | `zod` | ^3.x | Shared with FE |
| Auth tokens | `jsonwebtoken` | ^9.x | Standard |
| Password hash | `bcryptjs` | ^2.x | Pure-JS — Windows-friendly |
| Logger | `pino` + `pino-pretty` | ^8.x | Structured JSON |
| Env loader | `dotenv` | ^16.x | Standard |
| Env validation | `envalid` | ^8.x | Fail at boot if missing |
| Date | `dayjs` | ^1.x | Same as FE |
| PDF | `pdfkit` | ^0.14.x | No Chromium (on-prem fit) |
| Rate limit | `express-rate-limit` | ^7.x | In-memory sufficient |
| Security headers | `helmet` | ^7.x | OWASP defaults |
| CORS | `cors` | ^2.x | Standard |
| Compression | `compression` | ^1.x | gzip/brotli for p95 < 500ms |
| Cookie parser | `cookie-parser` | ^1.x | Read httpOnly refresh |
| Process mgr | `pm2` | latest | Cluster mode, restarts |
| Test | `vitest` + `supertest` | latest | Unit + API |
| Lint/Format | `eslint` + `prettier` + `husky` + `lint-staged` | latest | Pre-commit enforced |

### 11.3 Symmetry — the architectural beauty

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

---

## 12. ARCHITECTURE & PRODUCTION TOPOLOGY

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
   │   - TLS termin.  │       SPA static
   │   - SPA static   │       /api/* → proxy
   │   - /api/* proxy │
   └─────────┬────────┘
             │  HTTP (internal)
             ▼
   ┌──────────────────┐
   │   PM2 Cluster    │  ◄── auto-restart, multiple workers
   │   Node 20 LTS    │       NFR: 99% uptime
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
   │  cmcmis_redev    │  ◄── legacy `cmms_*` + new `cmcm_*`
   │  InnoDB, utf8mb4 │
   └──────────────────┘
```

### Layered request flow (BE)

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
  │  Controller — verify JWT → requirePermission()       │
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

---

## 13. ARCHITECTURAL DECISION REGISTER

All decisions confirmed by user with explicit "YES" on **2026-05-16**. Do not re-propose alternatives unless user opens the question.

### D-series (major decisions)

| ID | Decision | Locked |
|---|---|---|
| **D1** | JavaScript + JSDoc + Zod (NOT TypeScript) | ✅ |
| **D2** | Raw SQL + Repository pattern (NOT ORM) | ✅ |
| **D3** | TanStack Query for server state | ✅ |
| **D4** | Zustand for global UI state | ✅ |
| **D5** | pdfkit for PDFs (NOT Puppeteer) | ✅ |
| **D6** | Pino for structured JSON logs | ✅ |
| **D7** | BE flow: routes → controllers → services → repositories → DB | ✅ |
| **D8** | FE feature-based folders | ✅ |
| **D9** | Nginx reverse proxy in production | ✅ |
| **D10** | Equipment defaults to `PENDING_VERIFICATION` | ✅ |
| **D11** | ≥2 Super Admin IDs seeded via env var | ✅ (SA79900, AC77777) |

### C-series (confirmations)

| ID | Confirmation |
|---|---|
| **C1** | 5-role list final (no separate Admin) |
| **C2** | Master Data CRUD UI = Phase 2 |
| **C3** | Lookup data via phpMyAdmin during MVP |
| **C4** | Bootstrap with ≥2 Super Admins |
| **C5** | Equipment verify = Lab In-charge + Super Admin |

### Stack additions confirmed

| # | Library | Purpose |
|---|---|---|
| 1 | `cookie-parser` (BE) | Read httpOnly refresh cookie |
| 2 | `compression` (BE) | gzip/brotli responses |
| 3 | CSRF double-submit token | On `/api/v1/auth/refresh` only |
| 4 | `@tanstack/react-table` (FE) | Headless tables |
| 5 | `@tailwindcss/forms` (FE) | Form defaults |
| 6 | `vitest` + `supertest` | Unit + API tests |

> Dropped from MVP: `swagger-ui-express` + `zod-to-openapi` (Phase 2-friendly).

---

## 14. FOLDER STRUCTURE

### Backend (`/server`)

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

### Frontend (`/web`) — D8 feature-based

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
│  │  ├─ auth/
│  │  │  ├─ api/           ← react-query hooks + axios calls
│  │  │  ├─ components/    ← LoginForm, RequireAuth
│  │  │  ├─ pages/         ← LoginPage, LogoutPage
│  │  │  ├─ schemas/       ← zod
│  │  │  └─ hooks/         ← useLogin, useMe
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

---

## 15. API DESIGN CONVENTIONS

### URL & versioning

- **Base:** `/api/v1/...` from day 1 (NFR maintainability).
- **Resource-oriented:** `/api/v1/equipment`, `/api/v1/equipment/:id`.
- **Actions for state transitions:** `POST /api/v1/job-cards/:id/verify` (not `PATCH status=verified`).

### Standard responses

```jsonc
// SUCCESS
{
  "ok": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 25, "total": 137 }  // when paginated
}

// ERROR
{
  "ok": false,
  "error": {
    "code": "EQP_NOT_FOUND",
    "message": "Equipment with id 42 not found",
    "details": { ... }    // zod issues, etc.
  }
}
```

### Pagination convention

`GET /resource?page=1&limit=25&sort=-created_at&q=keyword&status=ACTIVE`
Default `limit=25`, max `100` (NFR).

### Auth headers

- Access token: `Authorization: Bearer <jwt>` (15 min)
- Refresh: httpOnly cookie `cmcmis_rt` (7 days, SameSite=Lax)
- CSRF: double-submit token only on `POST /api/v1/auth/refresh`

---

# PART D — THE CONTRACT

---

## 16. BUSINESS RULES (BR catalogue)

> **The contract.** Every API endpoint and DB constraint must enforce these.

### BR-AUTH (Authentication & Identity)

| ID | Rule |
|---|---|
| BR-AUTH-01 | Login by `employee_id` only (not email/username). |
| BR-AUTH-02 | User must exist in org employee directory. NO self-registration. |
| BR-AUTH-03 | Authenticated user with no role → defaults to Normal User. |
| BR-AUTH-04 | Sessions expire after **60 min inactivity**. Refresh token 7 days. |
| BR-AUTH-05 | First Super Admin seeded via `SUPER_ADMIN_EMPLOYEE_IDS` env var. **≥2 seeded.** |
| BR-AUTH-06 | All login attempts (success + failure) logged. |
| BR-AUTH-07 | Deactivated user cannot log in; history preserved. |

### BR-RBAC (Authorization)

| ID | Rule |
|---|---|
| BR-RBAC-01 | Only Super Admin can assign/change a user's role. |
| BR-RBAC-02 | **One primary role per user** (no multi-role in v1). |
| BR-RBAC-03 | Permissions derived: User → Role → Permissions. **Never check role name in code.** |
| BR-RBAC-04 | Sidebar + routes filtered by permissions, not role names. |
| BR-RBAC-05 | Every API endpoint enforces permission check at controller layer. |
| BR-RBAC-06 | View-Only users can READ but never WRITE. |
| BR-RBAC-07 | Role changes take effect on next login OR token refresh. |

### BR-EQP (Equipment)

| ID | Rule |
|---|---|
| BR-EQP-01 | Unique serial number system-wide. |
| BR-EQP-02 | Must belong to T&ME OR F&PE category. |
| BR-EQP-03 | F&PE may have NO calibration frequency (optional). |
| BR-EQP-04 | T&ME MUST have calibration frequency (months). |
| BR-EQP-05 | `next_cal_due_date = last_cal_date + calibration_frequency_months`. |
| BR-EQP-06 | Status transitions follow state machine (§8.1). |
| BR-EQP-07 | Hard DELETE = Super Admin only. CONDEMN = Lab In-charge / Super Admin. |
| BR-EQP-08 | Search = case-insensitive across serial, model, manufacturer, type. |
| BR-EQP-09 | **NEW.** Every registration carries `registered_by`, `registered_at`, `verified_by` (nullable), `verified_at`. |
| BR-EQP-10 | **NEW.** New equipment defaults to `PENDING_VERIFICATION`. Verify → ACTIVE = Lab In-charge / Super Admin only. |

### BR-JR (Job Requests)

| ID | Rule |
|---|---|
| BR-JR-01 | Must reference existing equipment (or trigger registration). |
| BR-JR-02 | Type ∈ {Calibration, Repair, Registration}. |
| BR-JR-03 | Save as DRAFT before submitting. |
| BR-JR-04 | Once SUBMITTED, only Lab In-charge changes state. |
| BR-JR-05 | Approval requires assigning Lab Engineer → becomes JC. |
| BR-JR-06 | "submitted_by" auto-filled from current user; not overridable. |
| BR-JR-07 | High-priority repair requests appear at top of Lab In-charge queue. |
| BR-JR-08 | Rejection requires mandatory reason (free text + reason code). |

### BR-JC (Job Cards)

| ID | Rule |
|---|---|
| BR-JC-01 | Auto-created on JR approve+assign. |
| BR-JC-02 | Lifecycle: ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED/CLOSED. |
| BR-JC-03 | Only assigned engineer marks IN_PROGRESS / COMPLETED. |
| BR-JC-04 | Only Lab In-charge verifies/closes. |
| BR-JC-05 | Reopen = Lab In-charge only, mandatory reason. |
| BR-JC-06 | Tasks are configurable per job type. |
| BR-JC-07 | Calibration cards REQUIRE before-reading, after-reading, env conds before COMPLETED. |
| BR-JC-08 | History is **append-only** — immutable state transition log. |

### BR-PDF

| ID | Rule |
|---|---|
| BR-PDF-01 | Generated on demand from current DB state. **Nothing stored.** |
| BR-PDF-02 | Job card PDF: header, equipment info, tasks, observations, signatures (text), date. |
| BR-PDF-03 | Calibration cert PDF: equipment, standards used, readings, env, uncertainty placeholders, valid-until. |
| BR-PDF-04 | All PDFs include generation timestamp + "Generated by CMCMIS" footer + record ID. |

### BR-AUD (Audit & Security)

| ID | Rule |
|---|---|
| BR-AUD-01 | Every write on critical tables → `cmcm_audit_log`. |
| BR-AUD-02 | Audit log: who, what, when, before-value, after-value, IP, user-agent. |
| BR-AUD-03 | Exports (PDF, future Excel) logged with user + record IDs. |
| BR-AUD-04 | Sensitive fields filtered from API responses by permission. |
| BR-AUD-05 | HTTPS in prod. JWT in Authorization header. Refresh in httpOnly cookie. |

### BR-VIS (Row-Level Visibility)

| ID | Rule |
|---|---|
| BR-VIS-01 | Normal User → own JRs only. |
| BR-VIS-02 | Lab Engineer → assigned jobs + the queue. |
| BR-VIS-03 | Lab In-charge+ → all jobs and equipment. |
| BR-VIS-04 | View-Only → all data (read), no actions. |

### BR-MASTER (Phase 2 build, rules locked now)

| ID | Rule |
|---|---|
| BR-MASTER-01 | **NEW.** All master data CRUD (employees, vendors, equipment types, divisions, lookups) = **Super Admin only.** |

---

## 17. FUNCTIONAL REQUIREMENTS (MVP)

### FR-A — Auth & RBAC

| ID | Requirement |
|---|---|
| FR-A-01 | Login screen accepts employee_id + password |
| FR-A-02 | On success, issue JWT (access 15min) + refresh cookie (7d) |
| FR-A-03 | Logout endpoint clears refresh cookie, blacklists JWT (in-memory until Redis added — out of scope) |
| FR-A-04 | Protected routes redirect unauthenticated → /login |
| FR-A-05 | Sidebar shows items filtered by permissions |
| FR-A-06 | Super Admin: list users, assign role, activate/deactivate |
| FR-A-07 | GET /me endpoint returns user + role + permissions |
| FR-A-08 | POST /auth/refresh issues new access token |
| FR-A-09 | Idle 60min → auto logout (sliding window) |
| FR-A-10 | Bootstrap seed inserts ≥2 Super Admins |

### FR-E — Equipment

| ID | Requirement |
|---|---|
| FR-E-01 | List with pagination, search, filter (status, category, type) |
| FR-E-02 | Detail page with full history timeline |
| FR-E-03 | Register form (all roles except View-Only) |
| FR-E-04 | Edit (permissioned) |
| FR-E-05 | Color-coded next_cal_due (green/amber/red) |
| FR-E-06 | History timeline (status transitions, calibrations) |
| FR-E-07 | Search by serial / model / manufacturer |
| FR-E-08 | Soft-delete via CONDEMNED status |
| FR-E-09 | **NEW.** Lab In-charge / Super Admin verify PENDING → ACTIVE |

### FR-JR — Job Requests

| ID | Requirement |
|---|---|
| FR-JR-01 | List with filters (status, type, priority, assignee) |
| FR-JR-02 | Multi-section form (equipment, type, description, priority) |
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
| FR-JC-02 | Status stepper (visual state) |
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

> Phase 2 backlog: all Admin master-data FRs (gated to Super Admin when built).

---

## 18. NON-FUNCTIONAL REQUIREMENTS (NFR)

| Category | Requirement | Target |
|---|---|---|
| **Performance** | Cold page load (intranet) | < 3 sec |
| | API response (95th percentile) | < 500 ms |
| | List pagination | 25 default, 100 max |
| **Security** | Password hashing | bcrypt ≥10 rounds |
| | JWT access lifetime | 15 min |
| | Refresh lifetime | 7 days, httpOnly, SameSite=Lax |
| | SQL injection | Parameterized queries everywhere |
| | XSS | React auto-escape + CSP header |
| | CSRF | SameSite cookies + token on state-changing endpoints |
| **Reliability** | Uptime (post go-live) | 99% in business hours |
| | DB pool | 10–20 connections |
| **Usability** | Max clicks to any feature | ≤ 3 |
| | Keyboard shortcuts | On power-user screens |
| | Responsive viewport | 1280–1920px primary, degrades to 768px |
| **Audit** | Every state-changing op logged | Yes |
| | Audit retention | Indefinite (until user specifies) |
| **Maintainability** | Code style | ESLint + Prettier |
| | Folder structure | feature-based (FE) / layered (BE) |
| | API versioning | `/api/v1/...` from day 1 |
| **Compatibility** | Browsers | Chrome, Edge, Firefox (latest 2) |

---

# PART E — DATA LAYER

---

## 19. EXISTING DATABASE INVENTORY

| Field | Value |
|---|---|
| **DB name (legacy)** | `cmcmis_redev` |
| **Engine** | MySQL 8.x, InnoDB, utf8mb4 |
| **Total legacy tables** | 64 |
| **Naming convention (legacy)** | `cmms_*` |
| **Naming convention (new)** | `cmcm_*` |

### Schema artifacts (in repo)

- [DB/cmcmis_schema_analysis_bundle/cmcmis_schema_only.sql](DB/cmcmis_schema_analysis_bundle/cmcmis_schema_only.sql) — DDL dump
- [DB/cmcmis_schema_analysis_bundle/cmcmis_table_summary.csv](DB/cmcmis_schema_analysis_bundle/cmcmis_table_summary.csv) — row counts + FK summary
- [DB/cmcmis_schema_analysis_bundle/cmcmis_schema_key_report.md](DB/cmcmis_schema_analysis_bundle/cmcmis_schema_key_report.md) — pre-analyzed key report
- [DB/cmcmis_schema_analysis_bundle/cmcmis_schema_keys.json](DB/cmcmis_schema_analysis_bundle/cmcmis_schema_keys.json) — keys in JSON

### Super Admin seed (BR-AUTH-05 / D11)

| Employee ID | Role |
|---|---|
| `SA79900` | Super Admin (seed) |
| `AC77777` | Super Admin (seed) |

> Env var: `SUPER_ADMIN_EMPLOYEE_IDS=SA79900,AC77777`. Migration creates rows in `cmcm_users` + `cmcm_user_roles`.

---

## 20. CRITICAL DB FINDINGS (Phase 3 audit, 2026-05-16)

### Legend

| Flag | Meaning | Action |
|---|---|---|
| 🔴 | BR-violation | Must fix before MVP ships |
| 🟡 | Decision needed | Blocks finalizing the cluster |
| ⚪ | Revision | Schema correction |
| 🟣 | Orphan / dead | Deprecate; do not migrate data |

### The flags

| Severity | Issue | Where |
|---|---|---|
| 🔴 | `USER_PASSWORD` VARCHAR(10) — can't fit bcrypt 60-char hash | `cmms_userrole_mst` |
| 🔴 | `cmms_jobcard_status_hist` has NO primary key — violates append-only (BR-JC-08) | `cmms_jobcard_status_hist` |
| 🔴 | Equipment lacks `registered_by` / `verified_by` / `verified_at` (BR-EQP-09) | `cmms_eqip_mst` |
| 🔴 | No `PENDING_VERIFICATION` status (BR-EQP-10); uses free-text `EQM_DIV_STATUS` | `cmms_eqip_mst` |
| 🔴 | No central `audit_log` table (BR-AUD-01) | (missing) |
| 🔴 | No `login_audit` (BR-AUTH-06), no `refresh_tokens` | (missing) |
| 🟡 | 23 roles in legacy `cmms_role_mst` — must collapse to 5 | `cmms_role_mst` |
| 🟡 | `cmms_eqip_mst` compound PK (EQM_TYPE, EQM_ID) propagates to 12+ FK chains | `cmms_eqip_mst` |
| 🟡 | `cmms_jobcard_mst` has TWO ID cols (JM_JobCardNO int + JM_SectionJobNo varchar(9) PK) — canonical TBD | `cmms_jobcard_mst` |
| 🟡 | `cmms_cont_mst` (vendors/contacts) referenced by 4+ FKs but **missing from dump** | (missing FK target) |
| ⚪ | `cmms_amc_mst.UPDATED_BY` BIGINT but `UPDATED_ON` VARCHAR(7) — column types swapped | `cmms_amc_mst` |
| 🟣 | `cmms_parameter_master_bkp` (4r), `_jun2016` (233r), `_incharge` (9r) — backup tables | (3) |
| 🟣 | `cf001`/`cf002`/`cf003`/`cf004` — no FKs, look like legacy checklist dupes | (4) |
| 🟣 | `cmms_pur_mst`, `cmms_pur_dtl`, `cmms_amc_mst`, `cmms_cal_jobcard_feedback_spec`, `cmms_jobcard_insp_maint_dtl` — all 0 rows | (5) |

### Triage priority

```
   Week 4 (DB design week)
        │
        ├─► 🔴 Fix all 6 BR-violations  ── design new cmcm_* tables
        │
        ├─► 🟡 Resolve 4 decisions
        │     ├─ role mapping (23→5)
        │     ├─ equipment PK (single surrogate?)
        │     ├─ jobcard canonical ID
        │     └─ cmms_cont_mst FK target
        │
        ├─► ⚪ Fix amc_mst column types
        │
        └─► 🟣 Deprecate 12 orphan tables (do NOT migrate)
```

---

## 21. NEW SCHEMA STRATEGY

### Prefix discipline

| Prefix | Meaning |
|---|---|
| `cmms_*` | Legacy table (do not write to from MVP code unless explicitly mapped) |
| `cmcm_*` | New schema (all MVP code writes here) |

### Core new tables (MVP)

| Table | Purpose |
|---|---|
| `cmcm_users` | App-level user, FK to legacy employee directory |
| `cmcm_roles` | 5 rows seeded |
| `cmcm_permissions` | Granular resource:action |
| `cmcm_role_permissions` | Join |
| `cmcm_user_roles` | Join (BR-RBAC-02 enforced by uniqueness) |
| `cmcm_login_audit` | Every login attempt (BR-AUTH-06) |
| `cmcm_refresh_tokens` | Active refresh tokens (revocation) |
| `cmcm_equipment` | New equipment master (with `registered_by`, `verified_by`, `verified_at`, `status` enum incl. PENDING_VERIFICATION) |
| `cmcm_equipment_status_hist` | Append-only state history (PK on `id`) |
| `cmcm_job_requests` | New JR table |
| `cmcm_job_request_status_hist` | Append-only |
| `cmcm_job_cards` | New JC table |
| `cmcm_job_card_status_hist` | Append-only (PK!) |
| `cmcm_job_card_tasks` | Configurable per job type |
| `cmcm_job_card_observations` | Engineer log |
| `cmcm_calibration_readings` | Before/after/env (BR-JC-07) |
| `cmcm_audit_log` | Generic write-op audit (BR-AUD-01) |

### Migration philosophy

1. **Do NOT touch legacy `cmms_*` rows in MVP code.** Read-through adapters in Inquiry module only.
2. **Backfill where needed** — e.g., legacy equipment → `cmcm_equipment` via one-shot migration.
3. **Seed scripts** run in fixed order: permissions → roles → role_permissions → super admins.
4. **Migrations are timestamped `.sql` files** — committed, reviewed, applied in order.

---

## 22. SECURITY MODEL

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1 — Transport                                         │
│  HTTPS (Nginx TLS termination) + HSTS + secure cookies       │
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
│  Every write → cmcm_audit_log (who/what/when/before/after)   │
└──────────────────────────────────────────────────────────────┘
```

### Threat → control matrix

| Threat | Control |
|---|---|
| Credential theft | bcrypt, no plaintext, login throttling |
| Token theft (access) | Short 15-min lifetime, HTTPS-only |
| Token theft (refresh) | httpOnly cookie, SameSite=Lax, revocable via DB |
| SQL injection | Parameterized queries (mysql2) |
| XSS | React auto-escape + CSP header |
| CSRF | SameSite cookies + double-submit on /refresh |
| Privilege escalation | Permission check on every endpoint; row-vis in service |
| Data exfiltration | Pagination caps, sensitive-field filtering, audit log |
| Brute force | express-rate-limit per IP per route |
| Session hijack | 60-min idle expiry, refresh revocation |

---

# PART F — DELIVERY

---

## 23. 10-WEEK BUILD PLAN (indicative)

```
Week 1  ┃ Repo scaffold, env, lint/format, husky, vitest, CI minimal
Week 2  ┃ DB Phase 3 finish — new cmcm_* schema design + migrations
Week 3  ┃ BLOCK 1: Auth + RBAC end-to-end (BE + FE login + sidebar filter)
Week 4  ┃ Equipment module (list, register, verify, history)
Week 5  ┃ Job Requests module (create, draft, submit, approve/reject)
Week 6  ┃ Job Cards module (auto-create, execute, transitions, observations)
Week 7  ┃ PDF service + cert + job card PDF + audit log integration
Week 8  ┃ Dashboard (KPIs, alerts, charts) + Inquiry (4-tab search)
Week 9  ┃ Hardening: NFR validation, security review, accessibility, UAT prep
Week 10 ┃ Deployment dry-run on staging, demo polish, handoff docs
```

> **Buffer:** assume 1 lost week to surprises. If clean, use it for Phase-2 prep.

---

## 24. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Legacy DB ambiguity stalls Week 2 | Med | High | Triage now (§20); accept gaps, build new schema independently |
| Compound PK migration complexity (EQM_TYPE, EQM_ID) | Med | Med | New `cmcm_equipment` uses single surrogate `id`; map legacy via adapter |
| User unavailable for cert template decisions | High | Med | Generic pdfService accepts template plugin — defer template fields |
| Performance regressions on big lists | Med | Med | Indexed queries, pagination caps, compression, vitest perf tests |
| Permission misconfiguration (overprivileged role) | Med | High | Permission catalogue is data, seeded; automated test verifies matrix |
| Solo bus factor | Low | High | Every decision in this doc + memory; daily commits |
| Phase 2 leakage into MVP scope | Med | Med | Sidebar hides Phase 2 modules; reject features that violate §10 |

---

## 25. PENDING INPUTS FROM USER

| Item | Status |
|---|---|
| 2 Super Admin employee IDs | ✅ Received (SA79900, AC77777) |
| Existing DB schema dump | ✅ Received in [DB/cmcmis_schema_analysis_bundle/](DB/cmcmis_schema_analysis_bundle/) |
| Classification: definitely-used / probably-dead / unsure | ⏳ Pending |
| NABL / ISO 17025 / AS9100 cert template | ⏳ Deferred — user will instruct |
| Specific report formats / fields | ⏳ Deferred |
| Notification channels (email / in-app / SMS / push) | ⏳ Deferred |
| Data retention policy | ⏳ Deferred |

---

## 26. QUICK RECAP (one-page mental model)

```
╔══════════════════════════════════════════════════════════════════╗
║                       CMCMIS — IN ONE PAGE                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  WHO    Harsh Khanna, Software Developer Intern (solo)           ║
║  WHY    Replace paper/manual instrument lifecycle for ISRO-SAC-  ║
║         style defence/space-grade R&D org                        ║
║  WHAT   9-module MIS: Auth+RBAC, Equipment, JR, JC, Dashboard,   ║
║         Inquiry (MVP) + Schedule, Procurement, Vendors, Reports, ║
║         Admin (Phase 2)                                          ║
║  WHO    5 roles only: Super Admin, Lab In-charge, Lab Engineer,  ║
║  USES   Normal User, View-Only (NO separate "Admin" role)        ║
║                                                                  ║
║  STACK  JS + JSDoc + Zod (no TS), React 18 + Vite + Tailwind v3, ║
║         Express 4 + mysql2 (raw SQL, repo pattern, no ORM),      ║
║         pdfkit (no Puppeteer), Pino, PM2 + Nginx                 ║
║                                                                  ║
║  RULES  60-min idle session, 15-min JWT + 7-day refresh cookie,  ║
║         1 primary role per user, PENDING_VERIFICATION default,   ║
║         append-only history, audit every write op                ║
║                                                                  ║
║  NO     SSO, cloud, file storage, email, Redis, backups, mobile, ║
║         QR, TS, ORM                                              ║
║                                                                  ║
║  DB     64 legacy `cmms_*` tables in cmcmis_redev (MySQL 8) +    ║
║         new `cmcm_*` tables; 6 critical BR-violations to fix     ║
║                                                                  ║
║  TIME   10 weeks → MVP demo → Phase 2 handoff                    ║
║                                                                  ║
║  3 CORE BLOCKS:                                                  ║
║         1) Auth + RBAC (foundation)                              ║
║         2) Equipment + JR + JC (heart)                           ║
║         3) Dashboard + Inquiry (surface)                         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## APPENDIX A — Cross-reference Cheat Sheet

| If you need to know… | Look at |
|---|---|
| What modules exist | §6 |
| Who can do what | §7 + §16 (BR-RBAC) |
| How state moves | §8 |
| Why a library was chosen | §11 + §13 |
| Where code goes | §14 |
| What an endpoint must enforce | §16 (BR-*) |
| Whether something is in MVP | §9 + §10 |
| What the DB looks like today | §19 + §20 |
| What new tables we're creating | §21 |
| How security stacks up | §22 |
| What week we're shipping it | §23 |

---

## APPENDIX B — Decision-Making Compass

When stuck on a design choice, walk this tree:

```
Is it in §10 (Constraints) NO list?
  └─ YES → reject, do not propose
  └─ NO ↓

Does it violate any BR in §16?
  └─ YES → reject or escalate
  └─ NO ↓

Is it in MVP §9 scope?
  └─ NO → defer to Phase 2 backlog
  └─ YES ↓

Does a locked decision in §13 cover it?
  └─ YES → follow that
  └─ NO ↓

Propose to user (with table of trade-offs) → lock decision → add to §13
```

---

**END OF MASTER BLUEPRINT — v1.0**
*Locked 2026-05-17. Any change requires explicit user approval.*
