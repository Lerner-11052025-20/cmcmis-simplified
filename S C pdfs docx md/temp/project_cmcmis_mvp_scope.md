---
name: project-cmcmis-mvp-scope
description: "CMCMIS MVP vs Phase 2 split, 10-week solo internship timeline, 3 MVP core blocks"
metadata: 
  node_type: memory
  type: project
  originSessionId: b9863bb4-3873-480d-9bae-b15d6a527c82
---

**Timeline:** 10 weeks total (internship duration). Solo developer (user + me as pair). User is willing to work late nights / early mornings — no compromise on quality.

**Goal:** Demo-ready MVP within internship. Full go-live AFTER MVP + testing + permission validation + data verification + stakeholder approval.

## MVP Scope (10 weeks) — user signed off on this split

| In-Scope MVP Modules / Features |
|---|
| Auth + RBAC (login, session, role loading, permissions, protected routes, SSO-ready architecture) |
| Equipment master + register |
| Job Requests |
| Job Cards |
| Dashboard |
| Inquiry |
| PDF generation (calibration certificates etc — download/generate only, NO storage) |
| Audit logs (basic) |
| Responsive UI (desktop + laptop viewports; NO mobile/tablet) |

## MVP "3 Core Blocks" — how to think about MVP delivery

- **MVP Core Block 1 — Auth/RBAC:** Login, session, role loading, permissions, protected routes, sidebar visibility, SSO-ready design. *Foundation. Must work first.*
- **MVP Core Block 2 — Equipment register + Job Requests generation + Job Cards creation:** Real DB-driven operational flows. The heart of CMCMIS.
- **MVP Core Block 3 — Dashboard + Inquiry:** Operational overview + search across job cards/products/instruments/vendors. Demo impact.

## Phase 2 (POST-INTERNSHIP handoff)

| Out-of-MVP / Phase 2 |
|---|
| Schedule module (PM + Calibration calendar) |
| Procurement (POs + spares) |
| Reports (analytics + exports) |
| Admin master-data CRUD UI |
| Notifications (in-app feed) |

## Items the user has deferred (will instruct later — don't pre-build)
- NABL / ISO 17025 / AS9100 compliance specifics
- Calibration certificate template format
- Specific report formats / fields
- Notification channels (email/in-app/SMS/push)
- Data retention policy

**Why:** User explicitly told me to wait for his instructions on these. Premature design here = wasted work.

**How to apply:**
- Build PDF generation as a generic service so any template can plug in later.
- Build the audit log as a generic table so any module can write to it.
- DO NOT add schedule/procurement/reports/notifications code in MVP — even stubs are forbidden unless explicitly approved.
- Sidebar should show Phase 2 modules as visible-but-disabled placeholders ONLY if user approves; otherwise hide.

See [[project-cmcmis-overview]], [[project-cmcmis-constraints]].
