-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_cal_observations` (
  `JobcardNumber` varchar(9) NOT NULL,
  `TaskID` int(11) NOT NULL,
  `Status` varchar(15) DEFAULT NULL,
  `Is_NABL` tinyint(3) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_cal_observations`
  ADD PRIMARY KEY (`JobcardNumber`,`TaskID`),
  ADD KEY `FK_CMMS_JOBCARD_CAL_OBSERVATIONS_CMMS_TASK_MST` (`TaskID`);
ALTER TABLE `cmms_jobcard_cal_observations`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CAL_OBSERVATIONS_CMMS_JOBCARD_MST` FOREIGN KEY (`JobcardNumber`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_CAL_OBSERVATIONS_CMMS_TASK_MST` FOREIGN KEY (`TaskID`) REFERENCES `cmms_task_mst` (`TSK_ID`);
