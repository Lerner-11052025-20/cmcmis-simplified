---
name: project-cmcmis-phase11-delivered
description: "Phase 11 PDF Generation — 3 PDFs (locked Cert + JC Details + JR Details) shipped 2026-05-20, 23/23 smoke green"
metadata: 
  node_type: memory
  type: project
  originSessionId: 068c4547-4284-45e7-a76b-c45fb8354d63
---

# Phase 11 — PDF Generation DELIVERED (2026-05-20)

Three streamed PDFKit documents on top of the sealed Phase-9 JC + Phase-6 JR data. Strictly read-only, no audit/log rows, no persisted files.

**Smoke matrix: 23/23 green** — JSON+PDF+RBAC (anon/VIEW_ONLY/NORMAL_USER own+foreign)+409 ineligibility+404 not-found+filename pattern+repo-aliasing scan+zero-write proof (audit_log + JC.updated_at unchanged).

## Decisions register (P11-D1 .. P11-D8 LOCKED)

| ID | Topic | Decision |
|----|-------|----------|
| P11-D1 | Certificate layout | LOCKED — replicates `JobCard_cmcmis_simplified_DSMG.pdf` precisely. Single-page A4 portrait. NO redesign permission |
| P11-D2 | Certificate eligibility | Status MUST be `COMPLETED` or `VERIFIED_CLOSED` → else 409 CONFLICT. FE re-validates for UX, BE re-enforces |
| P11-D3 | JC Details + JR Details | Own design, multi-page allowed. Use shared ISRO+SAC header on page 1 + stamped footer (docId · Page X of Y) on every page |
| P11-D4 | PDF persistence | NONE. Streamed via res.pipe; no disk write; no audit row; no download log (per §1.F + §5) |
| P11-D5 | PDFKit pagination discipline | NEVER bind drawHeader to `pageAdded` — re-entrant rendering during text() auto-pagination produces near-empty pages (saw 75 pages for a 16-row JC). Instead: render header on page 1 only; use flow-disciplined `gridKV` with fixed `ROW_H=30 / VALUE_H=20`, `lineBreak:false` for labels + `height` cap + `ellipsis:true` for values; explicit `ensureRoomFor()` at row boundaries |
| P11-D6 | Permission codes | Follow project convention `job_card:*` / `job_request:*` (with underscore + colon), NOT spec's hyphenated `jobcard:*` shorthand. 3 new perms in mig 410 |
| P11-D7 | Row-level scope for JR PDF | Normal Users (no `job_request:read-all`) see only own JRs. Foreign IDs collapse to 404 (NOT 403) — don't leak existence. Mirrors Phase-7 Slice-2 JR Detail policy |
| P11-D8 | Logo strategy | Look for `src/assets/{isro,sac}-logo.{png,jpg}` at request time; typographic fallback when absent. Government licensing — no logo binary shipped by default |

## Files delivered (12 BE + 2 FE edits + 1 FE new = 15 total)

**Backend (10 new + 1 mount + 1 migration):**
- `db/migrations/410__phase11_pdf_permissions.sql` — 3 new perms × role grants
- `src/modules/pdf/pdf.validators.js` — `:id` Zod schemas (varchar(9)/positive int)
- `src/modules/pdf/pdf.repo.js` — `loadJobCardFull()` (master + 6 child queries in parallel) + `loadJobRequestFull()` (master + 2 child queries)
- `src/modules/pdf/pdf.service.js` — 2-phase `prepare*()` pattern (load+validate then return render closure)
- `src/modules/pdf/pdf.controller.js` — 3 streaming handlers
- `src/modules/pdf/pdf.routes.js` — 2 routers (mounted BEFORE jobCards/jobRequests to claim `.pdf` paths)
- `src/modules/pdf/templates/_isroHeader.js` — shared ISRO+SAC seal block + `stampPageNumbers()` + NULL-safe formatters
- `src/modules/pdf/templates/jobCardCertificate.js` — LOCKED single-page (PDF #1)
- `src/modules/pdf/templates/jobCardDetails.js` — multi-page 15 sections A..O (PDF #2)
- `src/modules/pdf/templates/jobRequestDetails.js` — multi-page 8 sections A..H (PDF #3)
- `src/server.js` — mounted PDF routers
- `db/discovery/smoke_phase11.js` — 23-check matrix
- BE dep: `pdfkit` (already added Phase 10)

**Frontend (1 new + 2 edits):**
- `src/lib/api/pdf.js` — `downloadJobCardCertificate/Details` + `downloadJobRequestDetails` + `isCertificateEligible` helper + Blob-error JSON unwrap
- `src/pages/jobCards/components/DetailHeader.jsx` — enabled `Download Report` button (Certificate); added `Download Full Details` button. Both permission-gated + status-gated with explanatory tooltips. Sonner toasts for loading/success/error
- `src/pages/jobRequests/components/DetailHeader.jsx` — added `Download Request PDF` button. Permission-gated + sonner toasts

## Permissions seeded (mig 410 — 3 new perms)

| Permission | SA | LIC | LE | NU | VO |
|---|:-:|:-:|:-:|:-:|:-:|
| job_card:download-certificate | ✓ | ✓ | ✓ |   |   |
| job_card:download-details | ✓ | ✓ | ✓ |   | ✓ |
| job_request:download-details | ✓ | ✓ | ✓ | ✓ | ✓ |

Legacy `job_card:generate-pdf` (Phase 3) retained for backwards compatibility with the existing 404-stub legacy route.

## Endpoints (3 total — streamed PDF)

| Endpoint | Permission | Notes |
|----------|-----------|-------|
| `GET /api/v1/job-cards/:id/certificate.pdf` | `job_card:download-certificate` | 409 if status not COMPLETED/VERIFIED_CLOSED; single-page; LOCKED template |
| `GET /api/v1/job-cards/:id/details.pdf` | `job_card:download-details` | Multi-page; sections A..O cover all 13 tabs |
| `GET /api/v1/job-requests/:id/details.pdf` | `job_request:download-details` | Multi-page; row-level scoped for Normal Users (foreign id → 404) |

Filenames: `JC-2026-24219_certificate.pdf`, `JC-2026-24219_details.pdf`, `JR-2026-24265_details.pdf`.

## Smoke verification highlights
- Certificate on VERIFIED_CLOSED card J00024219 → 200, **1 page**, 4.7 KB, valid `%PDF-` magic, filename matches `JC-YYYY-NNNN_certificate.pdf`
- Certificate on ASSIGNED card → 409 CONFLICT with structured `details: { current_status, eligible: [COMPLETED, VERIFIED_CLOSED] }`
- JC Details (J00024219) → 200, **12 pages**, 12.8 KB (post-pagination-fix; was 75 pages before D-5 fix)
- JR Details (24265) → 200, **6 pages**, 6.4 KB
- RBAC: VIEW_ONLY → cert 403, JC details 200, JR details 200; NORMAL → JC PDFs 403, own JR 200, foreign JR 404 (no existence leak)
- Zero-write proof: `audit_log` count unchanged (105 == 105) + `JM_UPDATED_ON` unchanged across all PDF requests
- Repo aliasing: zero `JM_*/JR_*/EQM_*/EMM_*/SM_*` legacy tokens in service/controller/templates (only in repo SQL strings)

## Related
- [[project-cmcmis-phase9-delivered]] — JC Detail 13 tabs + 53 snake_case columns + 5 child tables
- [[project-cmcmis-phase10-delivered]] — Phase 10 Reports established the PDFKit + permission pattern (mig 400)
- [[project-cmcmis-db-v2-locked]] — sealed schema; Phase 11 added zero ALTERs
