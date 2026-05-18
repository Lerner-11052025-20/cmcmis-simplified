# CMCMIS dump90tables — Locked Schema Intelligence Report

Generated: 2026-05-18 15:10:22

Source SHA256: `dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a`
## Executive Snapshot
- Tables parsed: **90**
- Columns parsed: **966**
- Indexes parsed: **172**
- Foreign keys parsed: **84**
- Rows represented by INSERT tuples: **398,329**
- Active/non-legacy tables: **75**
- `_legacy_*` tables: **15**
- Tables without primary key: **19**
## Module Summary

| Module | Tables | Columns | Rows | FKs |
|---|---:|---:|---:|---:|
| Audit / Security | 3 | 23 | 20 | 1 |
| Auth & RBAC | 7 | 51 | 387 | 7 |
| Equipment / Instruments | 9 | 141 | 10,354 | 17 |
| Job Cards | 18 | 254 | 302,946 | 21 |
| Job Requests | 5 | 79 | 48,911 | 10 |
| Legacy / Isolated | 15 | 91 | 9,328 | 6 |
| Master Data / Lookup | 10 | 78 | 19,886 | 3 |
| Organization / Employee | 7 | 83 | 4,205 | 6 |
| Other / Cross-cutting | 4 | 20 | 898 | 0 |
| Procurement / AMC / Inventory | 8 | 108 | 689 | 9 |
| Scheduling / PM-CAL | 1 | 8 | 6 | 1 |
| Vendor / Manufacturer | 3 | 30 | 699 | 3 |

## Highest Priority Next Engineering Actions
1. Freeze this dump as the current DB evidence baseline before Phase 6 Slice 2.
2. Use `04_foreign_key_catalog.csv` and `05_relationship_edges.csv` before writing any approve/assign/auto-job-card SQL.
3. Resolve all HIGH rows in `07_table_risk_audit.csv` before exposing write endpoints.
4. Keep all `_legacy_*` tables read-only/preserved unless a specific migration bridge is approved.
5. Treat `cmms_jobrequest_mst`, `cmms_jobcard_mst`, `cmms_eqip_mst`, `audit_log`, and status-history tables as the Phase 6 Slice 2 transaction core.
