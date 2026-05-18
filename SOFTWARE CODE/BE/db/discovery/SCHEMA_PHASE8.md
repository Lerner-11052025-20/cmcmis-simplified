# SCHEMA_PHASE8.md — Canonical ↔ Legacy DB Column Map for Dashboard + Inquiry

> **Phase 8 Slice 1** — Dashboard (role-aware KPIs) + Inquiry (4 tabs).
> Authored 2026-05-18 for Deep Sorathiya (DS). Locked at start of Phase 8 Slice 1.
> All facts below come from live read-only introspection of `final` DB on
> the dev box (see `runner/introspect_phase8.js`).
> Reading rule: every repo function does `SELECT real_col AS canonical_col`.
> ADD-only migrations. NEVER DROP / RENAME / MODIFY-NULL.

---

## 0. The reality vs. the prompt — one-page truth table

| What the prompt calls | What actually exists in DB | Rows |
|---|---|---|
| `vendors`            | **`cmms_cont_mst`** (`CMM_CONT_TYPE` ENUM ('MFR','VENDOR','BOTH','OEM')) | 540 |
| `products`           | **`cmms_product_mst`** (thin: PROD_ID, PROD_NAME, PROD_DESC + tinyint flags) | 32 |
| `equipment`          | **`cmms_eqip_mst`** (composite PK: EQM_TYPE, EQM_ID) | 5,705 |
| `equipment.status`   | `EQM_MVP_STATUS` ENUM = **PENDING_VERIFICATION / ACTIVE / UNDER_CALIBRATION / UNDER_REPAIR / OUT_OF_TOLERANCE / QUARANTINED / CONDEMNED / RETIRED** — **no `OPERATIONAL`** value |
| `equipment.next_cal_date` | `EQM_CAL_DUE_DATE` datetime(6) (already indexed) |
| `equipment.registered_by_user_id` | `EQM_CREATED_BY` varchar(7) — **employee_id**, not user_id |
| `job_requests`       | **`cmms_jobrequest_mst`** | 21,490 |
| `job_requests.status`| `JR_MVP_STATUS` ENUM (DRAFT/SUBMITTED/ASSIGNED/IN_PROGRESS/COMPLETED/VERIFIED_CLOSED/REJECTED/REOPENED) ✓ |
| `job_requests.submitted_by_user_id` | `JR_SUBMITTEDBYID` varchar(7) — **employee_id**, not user_id |
| `job_requests.created_at` | `JR_CREATED_AT` datetime(6) (Phase 6) ✓ |
| `job_requests.verified_at` | `JR_MVP_STATUS_AT` datetime(6) (transition timestamp — used for "completed this month" when status=VERIFIED_CLOSED) |
| `job_cards`          | **`cmms_jobcard_mst`** | 19,432 |
| `job_cards.status`   | `JM_MVP_STATUS` ENUM (ASSIGNED/IN_PROGRESS/COMPLETED/VERIFIED_CLOSED/REOPENED) — **no PENDING / REJECTED** |
| `job_cards.completed_at` | `JM_JobEndDate` datetime(6) — already exists ✓ |
| `job_cards.verified_at`  | `JM_VERIFIED_ON` datetime(6) — already exists ✓ |
| `divisions`          | `cmms_section_mst` (SM_ID, SM_SHORTNAME) — same as Phase 6/7 |
| `audit_log`          | ✓ direct, Phase 3 sealed (42 rows currently) |

**Implication**: NO new tables are needed; legacy + Phase 6/7 already cover every Slice 1 read. Phase 8 migrations are **index-only + permission seed + (optionally) FULLTEXT**.

---

## 1. Decisions register (P8 Slice 1, locked 2026-05-18)

| ID | Topic | Decision | Why |
|----|-------|----------|-----|
| P8-D1 | Dashboard route | **One** route `/dashboard`, branched server-side by role (`req.user.role`) | D-8.1 in the prompt; one URL = one mental model |
| P8-D2 | KPI cache | **In-process LRU**: max 5000 entries, 10s TTL | Matches Phase 7's `permissionsCache` shape; reuse the same util pattern; Redis explicitly out of scope (MEMORY → constraints) |
| P8-D3 | Cache key namespace | `kpi:org` (one key, all org users) · `kpi:personal:emp:<employee_id>` (per Normal/View-Only) | Personal scope uses **employee_id** because `JR_SUBMITTEDBYID` / `EQM_CREATED_BY` are varchar(7) employee_ids |
| P8-D4 | Personal "registered by me" | **`EQM_CREATED_BY = req.user.employeeId`** | Closest existing field; no ALTER. Matches my Q-3 (a) recommendation |
| P8-D5 | "Completed this week" timestamp | **`COALESCE(JM_VERIFIED_ON, JM_JobEndDate)`** | VERIFIED_CLOSED rows have JM_VERIFIED_ON; COMPLETED-only rows fall through to JM_JobEndDate; both exist already |
| P8-D6 | Equipment "OPERATIONAL" mapping | **`EQM_MVP_STATUS = 'ACTIVE'`** | The legacy enum does NOT have `OPERATIONAL`; `ACTIVE` is the post-verification healthy state. Cards display the word "Operational" in UI, but SQL filters on `'ACTIVE'` |
| P8-D7 | Vendor type enum mapping | Repo aliases legacy `CMM_CONT_TYPE` → canonical: `MFR`→`MANUFACTURER`, `VENDOR`→`SUPPLIER`, `BOTH`→`MANUFACTURER+SUPPLIER` (returned as `MANUFACTURER` primary), `OEM`→`MANUFACTURER`. Filter API accepts the canonical names | The prompt's UI uses ("Manufacturer / Supplier / Service Provider"); legacy enum lacks "Service Provider" — show only Manufacturer / Supplier / All in Slice 1, defer SERVICE_PROVIDER (would require enum ALTER) |
| P8-D8 | Product columns shown | **Product ID, Product Name, Description, Equipment Count, Top Manufacturer (derived)** — NOT the original Manufacturer/Category/Supplier triple from the mock-up | `cmms_product_mst` is only 32 rows × 7 columns. It has no manufacturer/category/supplier FK. Deriving "top manufacturer" via JOIN on `cmms_eqip_mst.EQM_INST_TYPE = PROD_ID` is read-only and accurate. **OR** DS may opt to ADD columns — see Q-1' |
| P8-D9 | KPI poll interval | **30 s** (refetchInterval) · staleTime 25 s · refetchOnWindowFocus true | Sweet spot per Q-4 (matches Phase 7 reuse) |
| P8-D10 | "Completed this week" week-start | **ISO week (Mon 00:00 local)** = `CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY` | Q-2 (a) — managers think in calendar weeks |
| P8-D11 | Inquiry search threshold | < 3 chars → prefix `LIKE 'q%'` on primary code column only; ≥ 3 chars → MATCH … AGAINST (FULLTEXT) **if FULLTEXT index exists**, else fallback to `LIKE '%q%'` on a small allow-list of searchable columns | D-8.3 in prompt; FULLTEXT indexes added in migration 120/121 |
| P8-D12 | Inquiry pagination | page=1, page_size ∈ {10,25}, defaults 10 | Matches FE screenshot (small windows) |
| P8-D13 | Inquiry row click | **No-op** (hover highlight only) in Slice 1; deep-link routes deferred to Slice 2 | Q-6 (a); detail pages for vendors/products don't exist yet |
| P8-D14 | Tab state in URL | `/inquiry?tab=vendors|products|job-cards|instruments` — single source of truth (Doctrine 10). No localStorage | Q-9 |
| P8-D15 | Cache invalidation triggers | Write-time delete keys: JR mutate → `kpi:org` + `kpi:personal:emp:<owner_employee_id>`; EQ mutate → `kpi:org` + `kpi:personal:emp:<creator_employee_id>`; JC mutate (when Slice 2 adds it) → `kpi:org` | Bounded blast-radius; LRU TTL is the safety net |

---

## 2. Canonical → real-column map — `vendors` (= `cmms_cont_mst`)

| Canonical | Type | Real column | Notes |
|---|---|---|---|
| `id` | INT | `CMM_CONT_ID` | PK auto-inc |
| `vendor_code` | VARCHAR | `CONCAT('V-', LPAD(CMM_CONT_ID, 3, '0'))` | Display-only synthetic, e.g. `V-001` |
| `name` | VARCHAR(200) | `CMM_CONT_NAME` | UNIQUE indexed |
| `type` (canonical) | ENUM | **mapped** from `CMM_CONT_TYPE` (`MFR`→`MANUFACTURER`, `VENDOR`→`SUPPLIER`, `BOTH`→`MANUFACTURER`, `OEM`→`MANUFACTURER`) | See P8-D7 |
| `contact_person` | VARCHAR(150) | `CMM_CONT_CONTACT_PERSON` | |
| `email` | VARCHAR(150) | `CMM_CONT_EMAIL` | |
| `phone` | VARCHAR(50) | `CMM_CONT_PHONE` | |
| `mobile` | VARCHAR(50) | `CMM_CONT_MOBILE` | |
| `address` | VARCHAR(500) | `CMM_CONT_ADDRESS` | |
| `city` | VARCHAR(100) | `CMM_CONT_CITY` | |
| `state` | VARCHAR(100) | `CMM_CONT_STATE` | |
| `is_active` | TINYINT(1) | `CMM_CONT_STATE_FLAG` | |
| `gstin` | VARCHAR(20) | `CMM_CONT_GSTIN` | not shown in Slice 1 UI |
| `nabl` | TINYINT(1) | `CMM_CONT_NABL` | not shown in Slice 1 UI |

**Indexes already present**: `idx_cont_name_search (CMM_CONT_NAME)`, `idx_cont_type (CMM_CONT_TYPE)`, `idx_cont_active (CMM_CONT_STATE_FLAG)`, `uk_cont_name (CMM_CONT_NAME)`.
**Indexes NEEDED**: `FULLTEXT ft_cont_search (CMM_CONT_NAME, CMM_CONT_CONTACT_PERSON, CMM_CONT_EMAIL)` — for inquiry ≥ 3 chars.

---

## 3. Canonical → real-column map — `products` (= `cmms_product_mst`)

| Canonical | Type | Real column | Notes |
|---|---|---|---|
| `id` | INT | `PROD_ID` | PK |
| `product_code` | VARCHAR | `CONCAT('P-', LPAD(PROD_ID, 3, '0'))` | Display synthetic, e.g. `P-001` |
| `name` | VARCHAR(50) | `PROD_NAME` | |
| `description` | VARCHAR(200) | `PROD_DESC` | |
| `type_flag` | TINYINT | `PROD_TYPE` | semantic unclear; surface only if needed |
| `instr_type` | TINYINT | `PROD_INSTR_TYPE` | |
| `tnme_type` | TINYINT | `PROD_TNME_TYPE` | |
| `is_active` | TINYINT | `PROD_STATE` | inverse-flag, similar to EMM_INACTIVE — TBC |
| **`equipment_count`** (derived) | INT | `(SELECT COUNT(*) FROM cmms_eqip_mst e WHERE e.EQM_INST_TYPE = p.PROD_ID)` | aggregated in SELECT |
| **`top_manufacturer`** (derived) | VARCHAR | per-product GROUP_CONCAT of distinct CMM_CONT_NAME via EQM_MFRID, limit 1 | aggregated |

**Indexes already present**: `PRIMARY (PROD_ID)` — that's it. `cmms_product_mst` has no FULLTEXT.
**Indexes NEEDED**: `FULLTEXT ft_prod_search (PROD_NAME, PROD_DESC)` — for inquiry ≥ 3 chars.

---

## 4. Canonical → real-column map — `equipment` (= `cmms_eqip_mst`)

| Canonical | Type | Real column | Notes |
|---|---|---|---|
| `eqm_type`            | VARCHAR(15) | `EQM_TYPE` | composite PK part 1 |
| `eqm_id`              | INT         | `EQM_ID` | composite PK part 2 |
| `equipment_code`      | VARCHAR     | `CONCAT('EQ-', EQM_TYPE, '-', EQM_ID)` | synthetic display |
| `name`                | VARCHAR(100)| `EQM_NAME` | |
| `division_id`         | INT         | `EQM_DIVID` (FK → cmms_section_mst.SM_ID) | |
| `division_code`       | VARCHAR     | `cmms_section_mst.SM_SHORTNAME` via JOIN | Phase 6 lookup |
| `model_no`            | VARCHAR(50) | `EQM_MODELNO` | |
| `serial_no`           | VARCHAR(50) | `EQM_SRNO` | |
| `next_cal_date`       | DATETIME(6) | `EQM_CAL_DUE_DATE` | indexed |
| `last_cal_date`       | DATETIME(6) | — does not exist directly; derive from `cmms_jobcard_mst` last VERIFIED_CLOSED on this equipment | derived |
| `manufacturer_id`     | INT         | `EQM_MFRID` (FK → cmms_cont_mst.CMM_CONT_ID) | |
| `instr_type_id`       | INT         | `EQM_INST_TYPE` (FK → cmms_product_mst.PROD_ID) | |
| `status` (canonical)  | ENUM        | `EQM_MVP_STATUS` | values: PENDING_VERIFICATION, ACTIVE, UNDER_CALIBRATION, UNDER_REPAIR, OUT_OF_TOLERANCE, QUARANTINED, CONDEMNED, RETIRED |
| `registered_by_employee_id` | VARCHAR(7) | `EQM_CREATED_BY` | personal scope |
| `created_at`          | DATETIME(6) | `EQM_CREATED_ON` | |

**Indexes present**: `idx_eqip_cal_due`, `idx_eqip_mfr`, `idx_eqip_mvp_status`, `idx_eqip_section_new`, PK.
**Indexes NEEDED**:
- `idx_eqip_status_caldue (EQM_MVP_STATUS, EQM_CAL_DUE_DATE)` — covers org "calibration due" KPI
- `idx_eqip_creator_caldue (EQM_CREATED_BY, EQM_CAL_DUE_DATE)` — covers personal "due for calibration" KPI
- `FULLTEXT ft_eqip_search (EQM_NAME, EQM_MODELNO, EQM_SRNO)` — for instrument-inquiry tab

---

## 5. Canonical → real-column map — `job_cards` (= `cmms_jobcard_mst`)

| Canonical | Type | Real column | Notes |
|---|---|---|---|
| `id`                  | varchar(9) | `JM_SectionJobNo` | PK (legacy section-job number) |
| `card_number`         | int(11)    | `JM_JobCardNO` | not the PK |
| `eqm_type`            | varchar(15)| `JM_EQM_TYPE` | FK to equipment |
| `eqm_id`              | int(11)    | `JM_EQM_ID` | |
| `assigned_engineer`   | varchar(50)| `JM_AttendedBy` *(closest)* / `JM_EQGivenTo` | |
| `status`              | ENUM       | `JM_MVP_STATUS` | values: ASSIGNED, IN_PROGRESS, COMPLETED, VERIFIED_CLOSED, REOPENED |
| `completed_at`        | datetime(6)| `JM_JobEndDate` | ✓ exists, no ALTER |
| `verified_at`         | datetime(6)| `JM_VERIFIED_ON` | ✓ exists, no ALTER |
| `received_at`         | datetime(6)| `JM_JCRecdDate` | |
| `planned_completed`   | datetime(6)| `JM_PlannedComletedDate` | |
| `submitted_date` (Inquiry table column) | datetime(6) | `JM_JCRecdDate` | shown in Inquiry → Job Card Status tab |
| `progress_pct` (derived) | INT | service-layer mapping per P8-D11b: ASSIGNED→25, IN_PROGRESS→60, COMPLETED→100, VERIFIED_CLOSED→100, REOPENED→40 | repo returns status; service maps |

**Indexes NEEDED**:
- `idx_jc_status_verified (JM_MVP_STATUS, JM_VERIFIED_ON)` — org "completed this week"
- `idx_jc_status_ended (JM_MVP_STATUS, JM_JobEndDate)` — fallback path

---

## 6. Canonical → real-column map — `job_requests` (= `cmms_jobrequest_mst`)

Already mapped in `SCHEMA_PHASE6.md`. Phase 8 needs no additional columns. Relevant for KPIs:

| Used by | Real column | Index? |
|---|---|---|
| ORG "Pending Jobs" | `JR_MVP_STATUS = 'SUBMITTED'` | `idx_jr_status` ✓ |
| ORG "+N today"     | `JR_CREATED_AT >= NOW() - INTERVAL 1 DAY` | needs `(JR_MVP_STATUS, JR_CREATED_AT)` — already exists as `idx_jr_priority_status_created` (priority leading) but better: re-use `idx_jr_list_default (JR_MVP_STATUS, JR_CREATED_AT, JR_JOBREQUESTNO)` ✓ |
| PERSONAL "Active Requests" | `JR_SUBMITTEDBYID = ? AND JR_MVP_STATUS IN (DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS)` | `idx_jr_owner_created (JR_SUBMITTEDBYID, JR_CREATED_AT)` ✓ |
| PERSONAL "Completed this month" | `JR_SUBMITTEDBYID = ? AND JR_MVP_STATUS = 'VERIFIED_CLOSED' AND JR_MVP_STATUS_AT >= …` | OK with existing index, secondary filter on status_at |

**Indexes already covering** — no new index needed on this table for Phase 8.

---

## 7. Permission seeds (Phase 8 migration 120)

| Code | Seed? | Granted to roles |
|---|---|---|
| `dashboard:view`              | INSERT IGNORE | N, V, E, L, S |
| `inquiry:search-vendors`      | INSERT IGNORE | N, V, E, L, S |
| `inquiry:search-products`     | INSERT IGNORE | N, V, E, L, S |
| `inquiry:search-job-cards`    | INSERT IGNORE | **V, E, L, S** (NOT Normal) |
| `inquiry:search-instruments`  | INSERT IGNORE | N, V, E, L, S |

Role codes (from `roles` table, Phase 3 seed):
N = `NORMAL_USER`, V = `VIEW_ONLY`, E = `LAB_ENGINEER`, L = `LAB_IN_CHARGE`, S = `SUPER_ADMIN`.

---

## 8. Planned migration files (additive only)

| File | Purpose | Idempotent guard |
|---|---|---|
| `120__phase8_kpi_indexes.sql`          | Add 4 composite/secondary indexes (eq status+caldue, eq creator+caldue, jc status+verified, jc status+ended) | `IF NOT EXISTS` via `INFORMATION_SCHEMA.STATISTICS` lookup |
| `121__phase8_fulltext_indexes.sql`     | FULLTEXT on `cmms_cont_mst`, `cmms_product_mst`, `cmms_eqip_mst` (3 indexes total) | same guard pattern |
| `122__phase8_dashboard_inquiry_permissions.sql` | Seed 5 permissions + 22 role_permission rows (matrix) | `INSERT IGNORE` |

No new tables. No ALTER MODIFY. No DROP. No RENAME.

---

## 9. The four invariants for service / repo authoring

| ID | Rule | Where enforced |
|----|------|----------------|
| I-8.1 | Personal KPI scope uses `req.user.employeeId` (varchar(7)) — never `req.user.uid` | `dashboard.service.js` |
| I-8.2 | Equipment "Operational" UI label is computed from `EQM_MVP_STATUS = 'ACTIVE'` — never compared as raw string | `dashboard.repo.js` + `dashboard.service.js` |
| I-8.3 | Vendor type filter accepts canonical names only (MANUFACTURER, SUPPLIER) — repo translates to `IN ('MFR','OEM','BOTH')` / `IN ('VENDOR','BOTH')` | `inquiry.repo.js` |
| I-8.4 | Inquiry endpoint NEVER returns more than `page_size` rows; `q` is always parameter-bound; FULLTEXT operator string is `?` placeholder via `mysql2` BOOLEAN-safe escaping | `inquiry.repo.js` |

---

## 10. Open questions for DS — answered as senior eng (recommendations)

See the kickoff response for full Q-1 … Q-9 + the 3 additional sub-questions
(Q-1', Q-7', Q-10) that surfaced **only after** Step 0 introspection — they
relate to legacy column reality:
* **Q-1'** — `cmms_product_mst` is only 7 columns; "Manufacturer / Category / Supplier" from the mock-up don't exist. Recommended: derive, don't ALTER (P8-D8).
* **Q-7'** — `CMM_CONT_TYPE` has no `SERVICE_PROVIDER`. Recommended: drop that filter value from Slice 1 dropdown (P8-D7).
* **Q-10** — Equipment status `OPERATIONAL` does not exist; use `ACTIVE` (P8-D6).

---

*Locked by DS pending Q-1 → Q-9 + Q-1'/Q-7'/Q-10 sign-off.*
