SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

ALTER TABLE `cmms_jobcard_mst`
  ADD COLUMN IF NOT EXISTS `job_request_received_date` DATE NULL
    COMMENT 'Date on which the source job request was received during conversion'
    AFTER `JM_SectionJobNo`;

UPDATE `cmms_jobcard_mst` jc
LEFT JOIN `cmms_jobrequest_mst` jr ON jr.JR_JOBREQUESTNO = jc.JM_PARENT_JR_NO
   SET jc.`job_request_received_date` = COALESCE(
     jc.`job_request_received_date`,
     DATE(jr.JR_JOBREQUESTDATE),
     DATE(jr.JR_CREATED_AT)
   )
 WHERE jc.`job_request_received_date` IS NULL
   AND jc.JM_PARENT_JR_NO IS NOT NULL;

SELECT 'Migration 809 complete - job request received date stored on job cards' AS status;
