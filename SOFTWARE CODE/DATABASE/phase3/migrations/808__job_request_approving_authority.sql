-- Adds a separate requested approving-authority column for job request creation.
-- JR_APPROVED_BY remains the actual approver populated by the approval workflow.

SET @c := (
  SELECT COUNT(*)
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'cmms_jobrequest_mst'
     AND column_name = 'JR_APPROVING_AUTHORITY'
);
SET @sql := IF(
  @c > 0,
  'SELECT 1',
  'ALTER TABLE `cmms_jobrequest_mst` ADD COLUMN `JR_APPROVING_AUTHORITY` VARCHAR(7) NULL DEFAULT NULL AFTER `JR_DIVISION`'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
