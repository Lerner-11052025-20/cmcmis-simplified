-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_cal_adjustments_dtl` (
  `JCAD_JobCardNo` varchar(9) NOT NULL,
  `JCAD_Parameter` varchar(50) NOT NULL,
  `JCAD_TestValue` varchar(50) NOT NULL,
  `JCAD_SpecLimit` varchar(50) DEFAULT NULL,
  `JCAD_BeforeAdj` varchar(50) DEFAULT NULL,
  `JCAD_AfterAdj` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_cal_adjustments_dtl`
  ADD PRIMARY KEY (`JCAD_JobCardNo`,`JCAD_Parameter`,`JCAD_TestValue`);
ALTER TABLE `cmms_jobcard_cal_adjustments_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CAL_ADJUSTMENTS_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JCAD_JobCardNo`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
