# CMCMIS Phase 6 Slice 2 Table Map

This is the senior-engineering DB map for the next implementation slice: Job Request detail, approve/reject, assignment, and automatic Job Card creation.

## Auth & RBAC

| Table | Rows | Phase Mapping | Slice 2 Action |
|---|---:|---|---|
| `login_audit` | 57 | Phase 4 sealed | Use only through auth/repository layer; permission checks by permission code, not role name. |
| `permissions` | 40 | Phase 4 sealed | Use only through auth/repository layer; permission checks by permission code, not role name. |
| `refresh_tokens` | 43 | Phase 4 sealed | Use only through auth/repository layer; permission checks by permission code, not role name. |
| `roles` | 5 | Phase 4 sealed | Use only through auth/repository layer; permission checks by permission code, not role name. |
| `role_permissions` | 122 | Phase 4 sealed | Use only through auth/repository layer; permission checks by permission code, not role name. |
| `users` | 60 | Phase 4 sealed | Use only through auth/repository layer; permission checks by permission code, not role name. |
| `user_roles` | 60 | Phase 4 sealed | Use only through auth/repository layer; permission checks by permission code, not role name. |

## Audit / Security

| Table | Rows | Phase Mapping | Slice 2 Action |
|---|---:|---|---|
| `audit_log` | 20 | Phase 3/4/6 cross-cutting | Write in same transaction for state changes; never optional. |
| `audit_log_changes` | 0 | Phase 3/4/6 cross-cutting | Write in same transaction for state changes; never optional. |
| `export_audit` | 0 | Phase 3/4/6 cross-cutting | Write in same transaction for state changes; never optional. |

## Equipment / Instruments

| Table | Rows | Phase Mapping | Slice 2 Action |
|---|---:|---|---|
| `cmms_eqipinst_identification` | 2,286 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |
| `cmms_eqip_detail_spec` | 3 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |
| `cmms_eqip_mst` | 5,705 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |
| `cmms_eqip_mst_hist` | 519 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |
| `cmms_eqip_tec_spec` | 0 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |
| `cmms_ins_accuracy_info` | 1,501 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |
| `cmms_inv_eqip_dtl` | 24 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |
| `cmms_schedule_eqip_dtl` | 316 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |
| `equipment_status_history` | 0 | Phase 5 sealed + Phase 6 dependency | Use as asset source of truth; only controlled back-write from Job Card close. |

## Job Requests

| Table | Rows | Phase Mapping | Slice 2 Action |
|---|---:|---|---|
| `cmms_jobrequest_item_dtl` | 7,786 | Phase 6 active | Target for Slice 2: detail/approve/reject/assign transitions. |
| `cmms_jobrequest_mst` | 21,490 | Phase 6 active | Target for Slice 2: detail/approve/reject/assign transitions. |
| `cmms_jobrequest_project_dtl` | 19,624 | Phase 6 active | Target for Slice 2: detail/approve/reject/assign transitions. |
| `job_request_accessories` | 3 | Phase 6 active | Target for Slice 2: detail/approve/reject/assign transitions. |
| `job_request_status_history` | 8 | Phase 6 active | Target for Slice 2: detail/approve/reject/assign transitions. |

## Job Cards

| Table | Rows | Phase Mapping | Slice 2 Action |
|---|---:|---|---|
| `cmms_fault_mst` | 30 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_attendedby_dtl` | 27,890 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_awaitinginfo` | 7,261 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_cal_adjustments_dtl` | 1,831 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_cal_dtl` | 9,065 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_cal_observations` | 77,171 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_contract_warranty_dtl` | 17,225 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_eq_used` | 38,316 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_faulty_category` | 8,605 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_faulty_section` | 8,131 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_inspection_info` | 2,214 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_mst` | 19,432 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_mst_history` | 22,143 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_repair_info` | 8,118 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_request_info` | 19,432 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_request_item_dtl` | 11,064 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_spares_equip` | 2,804 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |
| `cmms_jobcard_status_hist` | 22,214 | Phase 6 active | Target for Slice 2/3: auto-create, execution, verify-close, PDF. |

## Organization / Employee

| Table | Rows | Phase Mapping | Slice 2 Action |
|---|---:|---|---|
| `cmms_designation_mst` | 40 | Support foundation | Use for user display, sections/divisions, engineer assignment dropdowns. |
| `cmms_desig_hist` | 132 | Support foundation | Use for user display, sections/divisions, engineer assignment dropdowns. |
| `cmms_division_hist` | 3,676 | Support foundation | Use for user display, sections/divisions, engineer assignment dropdowns. |
| `cmms_emp_mst` | 60 | Support foundation | Use for user display, sections/divisions, engineer assignment dropdowns. |
| `cmms_section_mst` | 294 | Support foundation | Use for user display, sections/divisions, engineer assignment dropdowns. |
| `departments` | 1 | Support foundation | Use for user display, sections/divisions, engineer assignment dropdowns. |
| `sections` | 2 | Support foundation | Use for user display, sections/divisions, engineer assignment dropdowns. |

## Master Data / Lookup

| Table | Rows | Phase Mapping | Slice 2 Action |
|---|---:|---|---|
| `cmms_checklist_hist` | 811 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_checklist_mst` | 928 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_checklist_tasks` | 7,536 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_checklist_tasks_hist` | 8,450 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_device_spares_mst` | 67 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_lineitem_mst` | 24 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_parameter_master` | 367 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_product_mst` | 32 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_proj_mst` | 182 | Support + Admin future | Read in MVP; Super Admin CRUD later. |
| `cmms_task_mst` | 1,489 | Support + Admin future | Read in MVP; Super Admin CRUD later. |

## Locked transaction doctrine

Approve/Reject/Assign/Auto-create Job Card must be implemented as one service-layer transaction that writes state, history, and audit together. No direct status update outside the state machine.
