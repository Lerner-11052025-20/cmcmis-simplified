-- CMCMIS Phase 6 Slice 2 DB Action Plan generated from dump90tables
-- This file is intentionally a planning SQL/comment file, not a migration.

-- LOCKED RULES:
-- 1. Do not DROP/RENAME legacy tables.
-- 2. Do not directly update status columns outside service state machines.
-- 3. Approve/Reject/Assign/Auto-create Job Card must be one transaction with audit + status history.
-- 4. Use row-level scope server-side for Job Request and Job Card lists/details.

-- Critical tables to inspect before Slice 2 implementation:
-- Job Requests: cmms_jobrequest_item_dtl, cmms_jobrequest_mst, cmms_jobrequest_project_dtl, job_request_accessories, job_request_status_history
-- Job Cards: cmms_fault_mst, cmms_jobcard_attendedby_dtl, cmms_jobcard_awaitinginfo, cmms_jobcard_cal_adjustments_dtl, cmms_jobcard_cal_dtl, cmms_jobcard_cal_observations, cmms_jobcard_contract_warranty_dtl, cmms_jobcard_eq_used, cmms_jobcard_faulty_category, cmms_jobcard_faulty_section, cmms_jobcard_inspection_info, cmms_jobcard_mst, cmms_jobcard_mst_history, cmms_jobcard_repair_info, cmms_jobcard_request_info, cmms_jobcard_request_item_dtl, cmms_jobcard_spares_equip, cmms_jobcard_status_hist
-- Equipment: cmms_eqipinst_identification, cmms_eqip_detail_spec, cmms_eqip_mst, cmms_eqip_mst_hist, cmms_eqip_tec_spec, cmms_ins_accuracy_info, cmms_inv_eqip_dtl, cmms_schedule_eqip_dtl, equipment_status_history

-- Pre-flight checks:
-- A) Confirm submitted JR statuses and counts.
SELECT JR_MVP_STATUS, COUNT(*) FROM cmms_jobrequest_mst GROUP BY JR_MVP_STATUS;

-- B) Confirm job card statuses and counts.
SELECT JM_MVP_STATUS, COUNT(*) FROM cmms_jobcard_mst GROUP BY JM_MVP_STATUS;

-- C) Confirm no submitted request has invalid equipment reference.
SELECT jr.JR_JOBREQUESTNO
FROM cmms_jobrequest_mst jr
LEFT JOIN cmms_eqip_mst e ON e.EQM_TYPE = jr.JR_EQM_TYPE AND e.EQM_ID = jr.JR_EQM_ID
WHERE e.EQM_ID IS NULL
LIMIT 50;

-- D) Confirm audit rows for Phase 6 JR actions.
SELECT action, COUNT(*) FROM audit_log WHERE action LIKE 'JR_%' GROUP BY action ORDER BY action;
