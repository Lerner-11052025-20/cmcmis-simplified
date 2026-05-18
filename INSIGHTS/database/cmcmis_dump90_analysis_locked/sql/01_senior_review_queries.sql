-- CMCMIS dump90tables Senior Review SQL Pack
-- Run only after importing dump90tables into a local/staging database.
-- Purpose: validate row counts, PK/FK integrity, and Phase 6 readiness.

-- 1) Database-level table count
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = DATABASE();

-- 2) Tables without primary key
SELECT t.table_name
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints c
  ON c.table_schema=t.table_schema AND c.table_name=t.table_name AND c.constraint_type='PRIMARY KEY'
WHERE t.table_schema=DATABASE() AND t.table_type='BASE TABLE' AND c.constraint_name IS NULL
ORDER BY t.table_name;

-- 3) Foreign key graph
SELECT k.table_name, k.constraint_name, k.column_name, k.referenced_table_name, k.referenced_column_name
FROM information_schema.key_column_usage k
WHERE k.table_schema=DATABASE() AND k.referenced_table_name IS NOT NULL
ORDER BY k.table_name, k.constraint_name, k.ordinal_position;

-- 4) Phase 6 critical row counts
SELECT 'audit_log' AS table_name, COUNT(*) AS row_count FROM `audit_log`
UNION ALL
SELECT 'audit_log_changes' AS table_name, COUNT(*) AS row_count FROM `audit_log_changes`
UNION ALL
SELECT 'cmms_eqipinst_identification' AS table_name, COUNT(*) AS row_count FROM `cmms_eqipinst_identification`
UNION ALL
SELECT 'cmms_eqip_detail_spec' AS table_name, COUNT(*) AS row_count FROM `cmms_eqip_detail_spec`
UNION ALL
SELECT 'cmms_eqip_mst' AS table_name, COUNT(*) AS row_count FROM `cmms_eqip_mst`
UNION ALL
SELECT 'cmms_eqip_mst_hist' AS table_name, COUNT(*) AS row_count FROM `cmms_eqip_mst_hist`
UNION ALL
SELECT 'cmms_eqip_tec_spec' AS table_name, COUNT(*) AS row_count FROM `cmms_eqip_tec_spec`
UNION ALL
SELECT 'cmms_fault_mst' AS table_name, COUNT(*) AS row_count FROM `cmms_fault_mst`
UNION ALL
SELECT 'cmms_ins_accuracy_info' AS table_name, COUNT(*) AS row_count FROM `cmms_ins_accuracy_info`
UNION ALL
SELECT 'cmms_inv_eqip_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_inv_eqip_dtl`
UNION ALL
SELECT 'cmms_jobcard_attendedby_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_attendedby_dtl`
UNION ALL
SELECT 'cmms_jobcard_awaitinginfo' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_awaitinginfo`
UNION ALL
SELECT 'cmms_jobcard_cal_adjustments_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_cal_adjustments_dtl`
UNION ALL
SELECT 'cmms_jobcard_cal_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_cal_dtl`
UNION ALL
SELECT 'cmms_jobcard_cal_observations' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_cal_observations`
UNION ALL
SELECT 'cmms_jobcard_contract_warranty_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_contract_warranty_dtl`
UNION ALL
SELECT 'cmms_jobcard_eq_used' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_eq_used`
UNION ALL
SELECT 'cmms_jobcard_faulty_category' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_faulty_category`
UNION ALL
SELECT 'cmms_jobcard_faulty_section' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_faulty_section`
UNION ALL
SELECT 'cmms_jobcard_inspection_info' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_inspection_info`
UNION ALL
SELECT 'cmms_jobcard_mst' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_mst`
UNION ALL
SELECT 'cmms_jobcard_mst_history' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_mst_history`
UNION ALL
SELECT 'cmms_jobcard_repair_info' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_repair_info`
UNION ALL
SELECT 'cmms_jobcard_request_info' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_request_info`
UNION ALL
SELECT 'cmms_jobcard_request_item_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_request_item_dtl`
UNION ALL
SELECT 'cmms_jobcard_spares_equip' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_spares_equip`
UNION ALL
SELECT 'cmms_jobcard_status_hist' AS table_name, COUNT(*) AS row_count FROM `cmms_jobcard_status_hist`
UNION ALL
SELECT 'cmms_jobrequest_item_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_jobrequest_item_dtl`
UNION ALL
SELECT 'cmms_jobrequest_mst' AS table_name, COUNT(*) AS row_count FROM `cmms_jobrequest_mst`
UNION ALL
SELECT 'cmms_jobrequest_project_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_jobrequest_project_dtl`
UNION ALL
SELECT 'cmms_schedule_eqip_dtl' AS table_name, COUNT(*) AS row_count FROM `cmms_schedule_eqip_dtl`
UNION ALL
SELECT 'equipment_status_history' AS table_name, COUNT(*) AS row_count FROM `equipment_status_history`
UNION ALL
SELECT 'export_audit' AS table_name, COUNT(*) AS row_count FROM `export_audit`
UNION ALL
SELECT 'job_request_accessories' AS table_name, COUNT(*) AS row_count FROM `job_request_accessories`
UNION ALL
SELECT 'job_request_status_history' AS table_name, COUNT(*) AS row_count FROM `job_request_status_history`
UNION ALL
SELECT 'login_audit' AS table_name, COUNT(*) AS row_count FROM `login_audit`
UNION ALL
SELECT 'permissions' AS table_name, COUNT(*) AS row_count FROM `permissions`
UNION ALL
SELECT 'refresh_tokens' AS table_name, COUNT(*) AS row_count FROM `refresh_tokens`
UNION ALL
SELECT 'roles' AS table_name, COUNT(*) AS row_count FROM `roles`
UNION ALL
SELECT 'role_permissions' AS table_name, COUNT(*) AS row_count FROM `role_permissions`
UNION ALL
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM `users`
UNION ALL
SELECT 'user_roles' AS table_name, COUNT(*) AS row_count FROM `user_roles`;

-- 5) Orphan check template: replace table/columns as needed from 04_foreign_key_catalog.csv
-- SELECT child.* FROM child LEFT JOIN parent ON child.parent_id = parent.id WHERE parent.id IS NULL;
