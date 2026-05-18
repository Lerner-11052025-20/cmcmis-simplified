-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobcard_request_item_dtl` (
  `JR_SECTIONJOBNO` varchar(9) NOT NULL,
  `JR_ITEM_ID` varchar(20) NOT NULL,
  `JR_ITEM_TYPE` varchar(60) NOT NULL,
  `JR_ITEM_NAME` varchar(100) NOT NULL,
  `JR_ITEM_MODELNO` varchar(100) NOT NULL,
  `JR_ITEM_SRNO` varchar(100) NOT NULL,
  `JR_ITEM_INUSE` tinyint(1) NOT NULL,
  `JR_ITEM_REMARKS` varchar(100) DEFAULT NULL,
  `JR_ITEM_CALREQUIRED` tinyint(1) NOT NULL,
  `JR_ITEM_SUBMITTED` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobcard_request_item_dtl`
  ADD PRIMARY KEY (`JR_SECTIONJOBNO`,`JR_ITEM_ID`);
ALTER TABLE `cmms_jobcard_request_item_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBCARD_REQUEST_ITEM_DTL_CMMS_JOBCARD_MST` FOREIGN KEY (`JR_SECTIONJOBNO`) REFERENCES `cmms_jobcard_mst` (`JM_SectionJobNo`);
