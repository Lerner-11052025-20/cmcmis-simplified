-- Add split fields used by the merged TME/FPE Calibration Details tab.

ALTER TABLE `cmms_jobcard_mst`
  ADD COLUMN IF NOT EXISTS `cal_rh_min` VARCHAR(20) NULL AFTER `cal_relative_humidity`,
  ADD COLUMN IF NOT EXISTS `cal_rh_max` VARCHAR(20) NULL AFTER `cal_rh_min`,
  ADD COLUMN IF NOT EXISTS `cal_temperature_value` VARCHAR(20) NULL AFTER `cal_temperature_c`,
  ADD COLUMN IF NOT EXISTS `cal_temperature_range` VARCHAR(20) NULL AFTER `cal_temperature_value`,
  ADD COLUMN IF NOT EXISTS `cal_procedure_ref` VARCHAR(255) NULL AFTER `cal_due_date`,
  ADD COLUMN IF NOT EXISTS `cal_timeshare` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cal_procedure_ref`,
  ADD COLUMN IF NOT EXISTS `cal_adjustment_mechanical` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cal_adjustment_status`,
  ADD COLUMN IF NOT EXISTS `cal_adjustment_nil` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cal_adjustment_mechanical`,
  ADD COLUMN IF NOT EXISTS `cal_adjustment_electrical` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cal_adjustment_nil`,
  ADD COLUMN IF NOT EXISTS `cal_adjustment_software` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cal_adjustment_electrical`;

UPDATE `cmms_jobcard_mst`
   SET `cal_rh_min` = COALESCE(`cal_rh_min`, '40'),
       `cal_rh_max` = COALESCE(`cal_rh_max`, '70'),
       `cal_temperature_value` = COALESCE(`cal_temperature_value`, '25'),
       `cal_temperature_range` = COALESCE(`cal_temperature_range`, '+/-4.0')
 WHERE `JM_JOB_TYPE` = 'CALIBRATION';
