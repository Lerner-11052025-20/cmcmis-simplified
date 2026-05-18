-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_desig_hist` (
  `EMM_ID` varchar(7) NOT NULL,
  `EMM_DESIGNATION` varchar(200) NOT NULL,
  `EMM_DATE` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_desig_hist`
  ADD PRIMARY KEY (`EMM_ID`,`EMM_DESIGNATION`,`EMM_DATE`);
ALTER TABLE `cmms_desig_hist`
  ADD CONSTRAINT `FK_CMMS_DESIG_HIST_CMMS_EMP_MST` FOREIGN KEY (`EMM_ID`) REFERENCES `cmms_emp_mst` (`EMM_ID`);
