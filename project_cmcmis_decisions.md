---
name: project-cmcmis-decisions
description: "CMCMIS Architectural Decision Register — D1-D11 + C1-C5 + 6 stack additions, all LOCKED by user on 2026-05-16 (good morning session)"
metadata: 
  node_type: memory
  type: project
  originSessionId: b9863bb4-3873-480d-9bae-b15d6a527c82
---

**Architectural Decision Register — ALL LOCKED.** User confirmed every item with "YES" on 2026-05-16.

## Major Decisions (D-series)

| ID | Decision | Lock |
|---|---|---|
| D1 | **JavaScript + JSDoc + Zod** (NOT TypeScript). Runtime validation via Zod; dev-time types via z.infer + JSDoc. | LOCKED |
| D2 | **Raw SQL + Repository pattern** (NOT ORM like Sequelize/Prisma). mysql2/promise pool. | LOCKED |
| D3 | TanStack Query for server state | LOCKED |
| D4 | Zustand for global UI state (NOT Redux) | LOCKED |
| D5 | pdfkit for PDFs (NOT Puppeteer/Chromium — on-prem fit) | LOCKED |
| D6 | Pino for structured JSON logs (NOT Winston) | LOCKED |
| D7 | **Repository pattern in BE**: routes → controllers → services → repositories → DB | LOCKED |
| D8 | **Feature-based FE folders** (frontend/src/features/<feature>/{api,components,pages,schemas,hooks}), NOT layer-based | LOCKED |
| D9 | **Nginx reverse proxy in production** — TLS termination, SPA static serving, /api/* proxy to PM2 cluster | LOCKED |
| D10 | New equipment defaults to PENDING_VERIFICATION; Lab In-charge / Super Admin flip to ACTIVE | LOCKED |
| D11 | Seed at least 2 Super Admin employee IDs via SUPER_ADMIN_EMPLOYEE_IDS env var (comma-separated) | LOCKED — IDs to come |

## Confirmation Points (C-series)

| ID | Confirmation | Lock |
|---|---|---|
| C1 | 5 roles final: Super Admin, Lab In-charge, Lab Engineer, Normal User, View-Only | LOCKED |
| C2 | Master Data Management = Phase 2; Super Admin only when built | LOCKED (instructions later) |
| C3 | Lookup data (vendors, equipment types, divisions) seeded Week 2; edited via phpMyAdmin during MVP | LOCKED |
| C4 | Bootstrap with at least 2 Super Admin employee IDs (user provides) | LOCKED — IDs to come |
| C5 | Equipment verify (PENDING → ACTIVE) belongs to Lab In-charge + Super Admin | LOCKED |

## Stack Additions — All Confirmed

| # | Library | Purpose |
|---|---|---|
| 1 | `cookie-parser` (BE) | Read httpOnly refresh cookie |
| 2 | `compression` (BE) | gzip/brotli for API responses |
| 3 | CSRF double-submit token | Applied on `/api/v1/auth/refresh` only |
| 4 | `@tanstack/react-table` (FE) | Headless tables for equipment/job lists |
| 5 | `@tailwindcss/forms` (FE) | Sane form-element defaults |
| 6 | `vitest` + `supertest` | Unit + API testing (FE + BE share vitest) |

NOTE: swagger-ui-express + zod-to-openapi was dropped from the confirmed list (not in MVP).

## Pending Inputs From User

- 2 Super Admin employee IDs (tomorrow morning)
- Existing DB schema export (~64 tables via SHOW CREATE TABLE or mysqldump --no-data) (tomorrow morning)
- Note classifying existing tables: definitely-used / probably-dead / unsure (tomorrow morning)

## How to apply

- These decisions are the FINAL contract for the build. Do NOT re-propose alternatives unless user explicitly opens the question.
- Reference these decisions when scaffolding code (e.g., "per D7, controller calls service, service calls repository").
- Treat JSDoc + Zod as the type system. Never silently introduce `.ts` files.
- When writing data access, always use parameterized SQL via mysql2/promise; never concatenate strings.
- Production topology = browser → Nginx (443 TLS) → PM2 cluster (Node:3000) → MySQL.

See [[project-cmcmis-overview]], [[project-cmcmis-tech-stack]], [[project-cmcmis-modules-roles]], [[project-cmcmis-mvp-scope]], [[project-cmcmis-constraints]], [[project-cmcmis-business-rules]].
