-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 811
-- Purpose: Add storage for repair UI fields introduced after the dedicated
--          repair workflow tabs were first added.
-- ============================================================================

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES';

ALTER TABLE `cmms_jobcard_mst`
  ADD COLUMN IF NOT EXISTS `repair_equipment_received_from_cal_lab_flag` VARCHAR(3) NULL
    COMMENT 'Repair workflow: Yes/No flag for equipment received from calibration lab'
    AFTER `repair_equipment_received_from_cal_lab`,
  ADD COLUMN IF NOT EXISTS `awaiting_restarting_date` DATE NULL
    COMMENT 'Awaiting information: restarting date after awaiting clearance'
    AFTER `awaiting_from_date`;

SELECT 'Migration 811 complete - repair workflow UI fields ensured' AS status;
