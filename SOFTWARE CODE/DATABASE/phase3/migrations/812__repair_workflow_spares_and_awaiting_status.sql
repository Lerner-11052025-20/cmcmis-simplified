-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 812
-- Purpose:
--   1) Allow the new repair type: Only Spare Under Need Based Contract.
--   2) Update spares source dropdown storage to include the latest options.
--   3) Convert cmms_jobcard_mst.awaiting_status from ENUM to VARCHAR.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

ALTER TABLE `cmms_jobcard_mst`
  MODIFY COLUMN `repair_type`
    ENUM('BREAK_DOWN','WARRANTY','PM','NEED_BASED','ONLY_SPARE_NEED_BASED_CONTRACT')
    NULL COMMENT 'Phase 9: classification of the repair work';

ALTER TABLE `cmms_jobcard_mst`
  MODIFY COLUMN `awaiting_status`
    VARCHAR(80) NULL DEFAULT 'NONE'
    COMMENT 'Phase 9: awaiting status label/code';

ALTER TABLE `jc_spares_used`
  MODIFY COLUMN `source`
    ENUM('CASH_PURCHASE','INVENTORY','LOAN','REPLACED_VENDOR_REPAIR_CONTRACT',
         'REPLACED_UNDER_WARRANTY','SPARE_NEED_BASED_REPAIRS','TIMCD_INVENTORY',
         'OTHERS','VENDOR','STOCK','WARRANTY','OTHER')
    NOT NULL DEFAULT 'CASH_PURCHASE';

SELECT 'Migration 812 complete - repair workflow, spares source, awaiting_status updated' AS status;
