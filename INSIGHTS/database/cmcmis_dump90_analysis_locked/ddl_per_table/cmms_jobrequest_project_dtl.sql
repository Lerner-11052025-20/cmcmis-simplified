-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_jobrequest_project_dtl` (
  `JR_JOBREQUESTNO` int(11) NOT NULL,
  `JR_PROJECTID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_jobrequest_project_dtl`
  ADD PRIMARY KEY (`JR_JOBREQUESTNO`,`JR_PROJECTID`),
  ADD KEY `FK_CMMS_JOBREQUEST_PROJECTDTL_CMMS_PROJ_MST` (`JR_PROJECTID`);
ALTER TABLE `cmms_jobrequest_project_dtl`
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_PROJECTDTL_CMMS_JOBREQUEST_MST` FOREIGN KEY (`JR_JOBREQUESTNO`) REFERENCES `cmms_jobrequest_mst` (`JR_JOBREQUESTNO`),
  ADD CONSTRAINT `FK_CMMS_JOBREQUEST_PROJECTDTL_CMMS_PROJ_MST` FOREIGN KEY (`JR_PROJECTID`) REFERENCES `cmms_proj_mst` (`PR_ID`);
