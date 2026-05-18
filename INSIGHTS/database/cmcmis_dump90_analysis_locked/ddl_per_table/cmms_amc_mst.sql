-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_amc_mst` (
  `AMC_ID` int(11) NOT NULL,
  `AMC_DATE` datetime NOT NULL,
  `AMC_VENDERID` int(11) NOT NULL,
  `AMC_BUDGET_ID` varchar(15) DEFAULT NULL,
  `AMC_COST` bigint(20) NOT NULL,
  `AMC_STARTDATE` datetime NOT NULL,
  `AMC_ENDDATE` datetime NOT NULL,
  `CREATED_BY` varchar(7) NOT NULL,
  `CREATED_ON` datetime NOT NULL,
  `UPDATED_BY` bigint(20) DEFAULT NULL,
  `UPDATED_ON` varchar(7) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_amc_mst`
  ADD PRIMARY KEY (`AMC_ID`),
  ADD KEY `FK_CMMS_AMC_MST_CMMS_BUDGET_MST` (`AMC_BUDGET_ID`),
  ADD KEY `FK_CMMS_AMC_MST_CMMS_CONT_MST` (`AMC_VENDERID`);
ALTER TABLE `cmms_amc_mst`
  ADD CONSTRAINT `FK_CMMS_AMC_MST_CMMS_BUDGET_MST` FOREIGN KEY (`AMC_BUDGET_ID`) REFERENCES `cmms_lineitem_mst` (`LITM_ID`),
  ADD CONSTRAINT `FK_CMMS_AMC_MST_CMMS_CONT_MST` FOREIGN KEY (`AMC_VENDERID`) REFERENCES `cmms_cont_mst` (`CMM_CONT_ID`);
