-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_attendedby_dtl` (
  `JMA_SECTIONJOBNO` varchar(9) NOT NULL,
  `JMA_USERID` varchar(7) NOT NULL,
  `JMA_ISAWAITING` tinyint(1) NOT NULL DEFAULT 1,
  `JMA_SRNO` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_attendedby_dtl`
  ADD PRIMARY KEY (`JMA_SECTIONJOBNO`,`JMA_USERID`,`JMA_ISAWAITING`),
  ADD KEY `FK_CMMS_JOBCARD_ATTENDEDBY_DTL_CMMS_EMP_MST` (`JMA_USERID`);
ALTER TABLE `cmms_jobcard_attendedby_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_ATTENDEDBY_DTL_CMMS_EMP_MST` FOREIGN KEY (`JMA_USERID`) REFERENCES `cmms_emp_mst` (`EMM_ID`),
  ADD CONSTRAINT `FK_CMMS_JOBCARD_ATTENDEDBY_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JMA_SECTIONJOBNO`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
