---
name: project-cmcmis-phase10-delivered
description: "Phase 10 Reports & Analytics — 6 PDF reports + 8 recharts (G1..G8) + CSV + RBAC delivered 2026-05-20, 41/41 smoke green"
metadata: 
  node_type: memory
  type: project
  originSessionId: 068c4547-4284-45e7-a76b-c45fb8354d63
---

# Phase 10 — Reports & Analytics DELIVERED (2026-05-20)

Industry-grade Reports & Analytics module shipped end-to-end. Strictly read-only on top of the sealed Phase-3 DB. NO table ALTERs. NO report logs/persistence (per §1.F).

**Smoke matrix: 41/41 green** (R1..R6 JSON + PDF + pagination + cross-truth, G1..G8 JSON + CSV, RBAC 401/403/200, filter narrowing).

## Decisions register (P10-D1 .. P10-D8 LOCKED)

| ID | Topic | Decision |
|----|-------|----------|
| P10-D1 | Persistence | NO report logs, NO persisted PDFs. Every report read fetches live data; PDF streams to res |
| P10-D2 | Column aliasing | Repo aliases legacy EQM_*/JR_*/JM_* to canonical snake_case in SELECT; service/controller/FE never see legacy names |
| P10-D3 | last_cal_date derivation | No EQM_CAL_DATE column exists. Derived from MAX(JM_VERIFIED_ON) where JM_MVP_STATUS='VERIFIED_CLOSED' for the equipment (correlated subquery) |
| P10-D4 | RBAC split | Per-report view perms gate JSON; PDF endpoints require BOTH the view-perm AND `reports:export`. View-Only gets all view perms but NOT export |
| P10-D5 | PDF library | PDFKit (no SheetJS). Streams to res, A4 landscape, bufferPages=true so footers can stamp Page X of Y |
| P10-D6 | CSV serialiser | Hand-rolled with UTF-8 BOM (Excel-friendly). No SheetJS dep added. Each chart has its own CSV endpoint |
| P10-D7 | "delayed" alias | MariaDB reserved word. SQL aliases as `delayed_count`; service remaps to `delayed` in payload |
| P10-D8 | mysql2 destructuring | `const [rows] = await pool.query(...)` for raw calls. `const [[rows]] = await Promise.all([pool.query(...)])` for parallel. Phase-10 hotfix established the rule |

## Files delivered (28 total)

**Backend (15 files, ~2 200 lines):**
- `db/migrations/400__phase10_reports_permissions.sql` — 8 new perms × role grants
- `src/modules/reports/reports.validators.js` — 6 Zod schemas + enum allow-lists
- `src/modules/reports/reports.repo.js` — 12 functions (list + summary × 6)
- `src/modules/reports/reports.service.js` — payload assembly + row-level scope
- `src/modules/reports/reports.pdf.js` — ISRO template renderer + 6 per-report sections + auto-pagination
- `src/modules/reports/reports.controller.js` — 12 HTTP handlers (view + PDF × 6)
- `src/modules/reports/reports.routes.js` — 12 routes with requireBoth(view, export) for PDF
- `src/modules/analytics/analytics.validators.js` — common chart query schema
- `src/modules/analytics/analytics.repo.js` — 8 aggregation queries (G1..G8)
- `src/modules/analytics/analytics.service.js` — JSON + CSV serialisers
- `src/modules/analytics/analytics.controller.js` — 16 handlers (JSON + CSV × 8)
- `src/modules/analytics/analytics.routes.js` — 16 routes
- `src/server.js` — mounted /api/v1/reports + /api/v1/analytics
- `db/discovery/smoke_phase10.js` — 41-check matrix
- BE dep added: `pdfkit`

**Frontend (13 files, ~1 600 lines):**
- `src/pages/reports/reportConfig.js` — 6-report catalogue (columns, perms, status enums)
- `src/pages/reports/ReportsLanding.jsx` — orchestrator
- `src/pages/reports/ReportCards.jsx` — 6 card grid (permission-filtered)
- `src/pages/reports/ReportFilters.jsx` — date/division/status filter bar
- `src/pages/reports/SummaryTiles.jsx` — Section-2 KPI tiles
- `src/pages/reports/ReportTable.jsx` — TanStack-Table generic (sort, pagination, badge formatting)
- `src/pages/reports/ExportPanel.jsx` — PDF + Excel + Print buttons
- `src/pages/reports/charts/chartTheme.js` — palette + STATUS_COLORS
- `src/pages/reports/charts/ChartCard.jsx` — shell with skeleton + CSV download icon
- `src/pages/reports/charts/AnalyticsGrid.jsx` — G1..G8 in one grid (parallel fetch)
- `src/lib/api/reports.js` — fetchReport + downloadReportPdf + fetchChart + downloadChartCsv
- `src/lib/hooks/useReport.js` — useReport / useChart react-query hooks
- `src/main.jsx` — QueryClientProvider + Sonner Toaster wired at root
- `src/App.jsx` — replaced /reports placeholder with `<ReportsLanding/>`
- `src/lib/permissions.js` — nav gate switched from `dashboard:view` → `reports:view-analytics`
- FE deps added: `@tanstack/react-query`, `@tanstack/react-table`, `recharts`, `dayjs`, `sonner`

## Permissions seeded (mig 400 — 8 new perms)

| Permission | SA | LIC | LE | NU | VO |
|---|---|---|---|---|---|
| reports:view-calibration-due | ✓ | ✓ | ✓ |   | ✓ |
| reports:view-pending-jobs | ✓ | ✓ |   | ✓ | ✓ |
| reports:view-equipment-utilization | ✓ | ✓ |   |   | ✓ |
| reports:view-engineer-summary | ✓ | ✓ | ✓ |   | ✓ |
| reports:view-job-card-summary | ✓ | ✓ | ✓ |   | ✓ |
| reports:view-job-request-summary | ✓ | ✓ |   | ✓ | ✓ |
| reports:view-analytics | ✓ | ✓ | ✓ | ✓ | ✓ |
| reports:export | ✓ | ✓ | ✓ | ✓ |   |

## Endpoints (28 total)

**Reports** `/api/v1/reports/<key>` + `/<key>/pdf` for: calibration-due, pending-jobs, equipment-utilization, engineer-summary, job-card-summary, job-request-summary

**Analytics** `/api/v1/analytics/<key>` + `/<key>/csv` for: monthly-activity, equipment-status, monthly-jobs, division-wise, calibration-completion, job-type-distribution, engineer-workload, calibration-status-breakdown

## Smoke verification highlights
- R3 total_equipment matches raw `SELECT COUNT(*) FROM cmms_eqip_mst` = 5705
- R2 total_pending matches raw status COUNT = 21493
- R6 status=VERIFIED_CLOSED narrowing verified (0 == 0 in legacy data)
- R1 PDF stream = 1.6 MB (5704 rows, multi-page auto-paginated)
- R5 PDF stream = 2.9 MB (19438 rows, multi-page)
- VIEW_ONLY gets 200 on /reports/calibration-due, 403 on /pdf

## Related
- [[project-cmcmis-phase9-delivered]] — Phase 9 base
- [[project-cmcmis-modules-roles]] — 5-role RBAC
- [[project-cmcmis-db-v2-locked]] — sealed schema (no ALTERs this phase)
