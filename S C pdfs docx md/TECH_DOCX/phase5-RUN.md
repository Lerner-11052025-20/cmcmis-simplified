# Phase 5 · Equipment Module — RUN Guide

> Path: `SOFTWARE CODE/TECH_DOCX/phase5-RUN.md`
> Companion to: `phase4SEALED.docx`, `phase5-schema-audit.md`
> Status: **CODE-COMPLETE — awaiting browser smoke-test sign-off**

This document is the manual-acceptance test for Phase 5. Run every section below; if all sections pass, the phase is sealed.

---

## 1. Locked decisions (recap from Section K.6 of the audit)

| # | Decision | Path taken |
|---|---|---|
| Q1 | Schema strategy | **(a) no ALTERs** — write to existing `cmms_eqip_mst` |
| Q2 | Module scope | **(a) equipment-row only** — JR-only fields persist to `audit_log.notes` |
| Q3 | Division FK | New `sections` table (Phase 3) where seeded; legacy `cmms_section_mst` for dropdown |
| Q4 | Equipment-code | **Computed** display string `EQ-{EQM_TYPE.upper()[:3]}-{EQM_ID:04d}` |
| Q5 | Accessories | **Phase-6 park** — collected on the form, persisted to `audit_log.notes` only |

---

## 2. Phase-4 files touched (count = 9, matches the file inventory STEP 6 expected ≤ 8 ± stubs)

| File | Change |
|---|---|
| `BE/src/server.js` | Mounted `/api/v1/equipment` router |
| `BE/src/modules/users/users.controller.js` | Enriched `getMe()` to return `display_name`, `designation`, `email` from `cmms_emp_mst` |
| `FE/src/components/Sidebar.jsx` | Full rewrite — ISRO SAC logo + 9 nav items |
| `FE/src/components/TopBar.jsx` | Full rewrite — global search + bell + user cluster |
| `FE/src/components/Layout.jsx` | Adjusted — TopBar no longer takes `title` prop |
| `FE/src/lib/permissions.js` | 9 nav items in correct order, matching Lucide icons |
| `FE/src/lib/auth-context.jsx` | After `/auth/refresh`, also fetches `/me` to enrich the user object |
| `FE/src/App.jsx` | Added 6 new routes (equipment, schedule, procurement, reports, plus 2 placeholders) |
| `FE/src/lib/schemas/loginSchema.js` | _unchanged_ (Phase 4 file kept intact) |

---

## 3. Files added (count = 19)

### Backend (5 + 1 helper)
```
BE/src/modules/equipment/
    equipment.validators.js
    equipment.repo.js
    equipment.service.js
    equipment.controller.js
    equipment.routes.js
BE/src/modules/users/
    users.repo.js          (new — was inline in controller before)
```

### Frontend (13)
```
FE/src/assets/isro-sac-logo.svg
FE/src/components/DataTable.jsx
FE/src/components/Pagination.jsx
FE/src/components/ui/Select.jsx
FE/src/components/ui/Checkbox.jsx
FE/src/lib/api/equipment.js
FE/src/lib/hooks/useEquipmentList.js
FE/src/lib/schemas/equipmentSchema.js
FE/src/pages/InquiryPlaceholder.jsx
FE/src/pages/equipment/EquipmentList.jsx
FE/src/pages/equipment/EquipmentForm.jsx
FE/src/pages/equipment/EquipmentDetailPlaceholder.jsx
FE/src/pages/equipment/utils/calColor.js
```

### Documentation
```
SOFTWARE CODE/TECH_DOCX/
    audit_phase5_schema.js
    phase5-schema-audit.md   (1,115 lines)
    phase5-RUN.md            ← this file
```

**Zero `.ts` / `.tsx` / `tsconfig.json` files anywhere — confirmed via `find`.**

---

## 4. Setup

```bash
# Terminal A — backend
cd "SOFTWARE CODE/BE"
# nothing to install; Phase 4 already wired
npm run dev
# Expected: DB pool ready → Server ready

# Terminal B — frontend
cd "SOFTWARE CODE/FE"
# nothing to install; Phase 4 already wired
npm run dev
# Expected: Vite serves at http://localhost:5173/
```

---

## 5. Backend curl matrix

```bash
# Login as Super Admin
LOGIN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"employee_id":"SA79900","password":"SA79900"}' -c cookies.txt)
ACCESS=$(echo "$LOGIN" | python -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

# 1. List page 1, default size → 200 + items[] + pagination{}
curl -s "http://localhost:3000/api/v1/equipment?page=1&page_size=25" \
  -H "Authorization: Bearer $ACCESS" | python -m json.tool | head -30

# 2. /me now returns the enriched profile
curl -s http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer $ACCESS" | python -m json.tool
# → display_name, designation, email present (or empty strings if cmms_emp_mst lookup misses)

# 3. Equipment types dropdown
curl -s http://localhost:3000/api/v1/equipment/types \
  -H "Authorization: Bearer $ACCESS" | python -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']['items']),'types')"

# 4. Search test
curl -s "http://localhost:3000/api/v1/equipment?q=spectrum" \
  -H "Authorization: Bearer $ACCESS" | python -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']['items']),'hits')"

# 5. Phase-6 stub — detail route returns 404 'Ships in Phase 6'
curl -s -i http://localhost:3000/api/v1/equipment/Instrument-1 \
  -H "Authorization: Bearer $ACCESS" | head -8

# 6. Forbidden — list as a user without equipment:read-list → 403
# (Use a future VIEW_ONLY login once seeded; SA always has all perms.)
```

---

## 6. Browser smoke test (the 10-step gate)

| # | Action | Pass condition |
|---|---|---|
| 1 | Open `http://localhost:5173/` | Redirects to `/login`; new ISRO SAC hero + card render |
| 2 | Sign in as `SA79900` / `SA79900` | Lands on `/dashboard`; sidebar shows **9 items** with new icons |
| 3 | TopBar | Search box centered; bell with red dot; "System Administrator" + Admin pill + initials disc visible |
| 4 | Click **Equipment** in sidebar | `/equipment` loads; table shows **real rows** from `cmms_eqip_mst` (no Status column) |
| 5 | Type `keysight` into the filter search box | After 300ms, table refetches; row count narrows; only one in-flight network call in Network tab |
| 6 | Change page in pagination | `[1] [2] [3] … [99] [100]` strip renders; clicking 5 issues exactly one network call |
| 7 | Click **+ Add Equipment** | `/equipment/new` form renders, Section 5 fields auto-filled and disabled |
| 8 | Try Submit with 0 / 6 boxes ticked | Submit button **disabled**; yellow banner reads "(0/6 accepted)" |
| 9 | Fill in required fields, tick all 6 boxes, submit | 201; navigates back to `/equipment` |
| 10 | DevTools console | `Object.keys(localStorage)` → empty OR only `eqp_draft_<userId>`. Never any tokens. |

---

## 7. Database integrity audit

```sql
-- Newly inserted row has PENDING_VERIFICATION + the right submitter
SELECT EQM_TYPE, EQM_ID, EQM_NAME, EQM_SRNO, EQM_MVP_STATUS,
       EQM_CREATED_BY, EQM_CREATED_ON
FROM final.cmms_eqip_mst
ORDER BY EQM_CREATED_ON DESC
LIMIT 3;
-- Expect: top row matches what you typed; status='PENDING_VERIFICATION'

-- Audit log carries the Phase-6 park JSON
SELECT audit_id, action, actor_employee_id, entity_type, entity_id, notes, occurred_at
FROM final.audit_log
WHERE action='EQUIPMENT_REGISTERED'
ORDER BY occurred_at DESC LIMIT 3;
-- Expect: `notes` contains a JSON blob with mivr_number, mivr_date,
--         line_item_code, complaint_description (truncated), tc_all_accepted

-- All existing data still ACTIVE; new rows are PENDING_VERIFICATION
SELECT EQM_MVP_STATUS, COUNT(*) FROM final.cmms_eqip_mst GROUP BY EQM_MVP_STATUS;
-- Expect: ACTIVE 5704, PENDING_VERIFICATION <new count>
```

---

## 8. Followups for Phase 6

These were stubbed deliberately in Phase 5 — Phase 6 picks them up:

- **Detail page** `/equipment/:id` — currently the `EquipmentDetailPlaceholder`. Phase 6 builds the full detail view with status timeline, calibration history, accessories list, and edit/verify/condemn actions.
- **Update** `PATCH /equipment/:id` — stubbed 404; spec lives in FINAL-DESC §8.4.
- **Verify** `POST /equipment/:id/verify` — PENDING_VERIFICATION → ACTIVE state transition. Stubbed; only LIC + SA.
- **Condemn** `POST /equipment/:id/condemn` — any status → CONDEMNED. Stubbed; only LIC + SA.
- **Delete** `DELETE /equipment/:id` — hard delete, SA-only. Stubbed.
- **Accessories** — currently stuffed into `audit_log.notes` JSON. Phase 6 should add a real `cmms_eqip_accessories` table (with FK to `(EQM_TYPE, EQM_ID)`).
- **Full Job Request persistence** — MIVR, lab/room phone, complaint description, T&C acceptance currently live in audit_log; Phase 6 should create a real `job_requests` table and link it.
- **Advanced filters** — date-range, multi-select division, calibration-status. Phase 6 wires the panel currently behind the "Advanced Filters" button.
- **Export** — CSV / Excel download. Currently a Phase-7 placeholder.
- **Inquiry** `/inquiry` — full cross-entity search. Phase 7.
- **Equipment-code column** — currently computed in the SELECT. If DS later wants real codes stored, an ALTER will introduce `EQM_DISPLAY_CODE` and a backfill job.
- **Search index on `EQM_NAME` / `EQM_SRNO`** — table-scans today; ALTER proposal in audit Section I awaits DS approval.

---

## 9. Sign-off statement

When every section above is green:

🟢 **Phase 5 — Equipment Module — SEALED.**
21 backend `.js` files (Phase 4) + 5 new equipment-module files. 19 frontend `.jsx/.js` files (Phase 4) + 13 new Phase-5 files + 1 SVG asset. Zero TypeScript anywhere. Pattern locked for Phase 6+.
