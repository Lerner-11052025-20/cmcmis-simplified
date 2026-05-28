-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 720
-- Purpose: Backfill parent Job Request lifecycle status from linked Job Cards.
--
-- From: after conversion, JR could remain ASSIGNED ("Approved") even when the
--       linked JC had moved to IN_PROGRESS, COMPLETED, or VERIFIED_CLOSED.
-- To:   JR status reflects the latest linked JC lifecycle state.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

CREATE TEMPORARY TABLE tmp_jr_jc_status_sync AS
SELECT
  jr.JR_JOBREQUESTNO AS jr_no,
  jr.JR_MVP_STATUS   AS from_status,
  CASE jc.JM_MVP_STATUS
    WHEN 'ASSIGNED'        THEN 'ASSIGNED'
    WHEN 'IN_PROGRESS'     THEN 'IN_PROGRESS'
    WHEN 'COMPLETED'       THEN 'COMPLETED'
    WHEN 'VERIFIED_CLOSED' THEN 'VERIFIED_CLOSED'
    WHEN 'REOPENED'        THEN 'REOPENED'
    ELSE jr.JR_MVP_STATUS
  END AS to_status
FROM cmms_jobrequest_mst jr
JOIN cmms_jobcard_mst jc
  ON jc.JM_PARENT_JR_NO = jr.JR_JOBREQUESTNO
WHERE jr.JR_CANCELLED_AT IS NULL
  AND jr.JR_MVP_STATUS NOT IN ('DRAFT', 'SUBMITTED', 'REJECTED')
  AND jc.JM_MVP_STATUS IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED_CLOSED', 'REOPENED')
  AND jr.JR_MVP_STATUS <> jc.JM_MVP_STATUS;

INSERT INTO job_request_status_history
  (jr_no, from_status, to_status, transitioned_at, transitioned_by, reason)
SELECT
  jr_no,
  from_status,
  to_status,
  NOW(6),
  'SYSTEM',
  'Backfill: synced parent Job Request status from linked Job Card'
FROM tmp_jr_jc_status_sync;

UPDATE cmms_jobrequest_mst jr
JOIN tmp_jr_jc_status_sync s ON s.jr_no = jr.JR_JOBREQUESTNO
   SET jr.JR_MVP_STATUS = s.to_status,
       jr.JR_MVP_STATUS_AT = NOW(6),
       jr.JR_UPDATED_AT = NOW(6);

SELECT COUNT(*) AS synced_job_requests FROM tmp_jr_jc_status_sync;

DROP TEMPORARY TABLE tmp_jr_jc_status_sync;
