-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_emp_mst` (
  `EMM_ID` varchar(7) NOT NULL,
  `EMM_NAME` varchar(100) NOT NULL,
  `EMM_DESIGNATION` varchar(200) NOT NULL,
  `EMM_DESIGDATE` datetime(6) DEFAULT NULL,
  `EMM_DEPT` int(11) NOT NULL,
  `EMM_DEPTDATE` datetime(6) DEFAULT NULL,
  `EMM_DOB` datetime(6) DEFAULT NULL,
  `EMM_DOJ` datetime(6) DEFAULT NULL,
  `EMM_BLOODGRP` varchar(50) DEFAULT NULL,
  `EMM_ADD` varchar(200) DEFAULT NULL,
  `EMM_CITY` varchar(100) DEFAULT NULL,
  `EMM_STATE` varchar(100) DEFAULT NULL,
  `EMM_ZIP` varchar(100) DEFAULT NULL,
  `EMM_PH1` varchar(100) DEFAULT NULL,
  `EMM_PH2` varchar(100) DEFAULT NULL,
  `EMM_FAX` varchar(100) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_EMAIL` varchar(100) DEFAULT NULL,
  `EMM_MOBILE` varchar(100) DEFAULT NULL,
  `EMM_PAGER` varchar(100) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_STARTDT` datetime(6) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_APP_LVL` bigint(20) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_MAX_PURCHASE` decimal(10,2) DEFAULT NULL,
  `EMM_REMARKS` varchar(500) DEFAULT NULL,
  `EMM_CREATED_BY` varchar(7) NOT NULL,
  `EMM_CREATED_ON` datetime(6) NOT NULL,
  `EMM_UPDATED_BY` varchar(7) NOT NULL,
  `EMM_UPDATED_ON` datetime(6) NOT NULL,
  `EMM_RESIPH` varchar(50) DEFAULT NULL COMMENT 'NA as per new desing',
  `EMM_ROLE` int(11) DEFAULT NULL,
  `EMM_INACTIVE` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_emp_mst`
  ADD PRIMARY KEY (`EMM_ID`),
  ADD KEY `FK_CMMS_EMP_MST_CMMS_SECTION_MST` (`EMM_DEPT`),
  ADD KEY `FK_CMMS_EMP_MST_CMMS_ROLE_MST` (`EMM_ROLE`),
  ADD KEY `idx_emm_active` (`EMM_INACTIVE`);
ALTER TABLE `cmms_emp_mst`
  ADD CONSTRAINT `FK_CMMS_EMP_MST_CMMS_ROLE_MST` FOREIGN KEY (`EMM_ROLE`) REFERENCES `_legacy_role_mst` (`ROLE_ID`),
  ADD CONSTRAINT `FK_CMMS_EMP_MST_CMMS_SECTION_MST` FOREIGN KEY (`EMM_DEPT`) REFERENCES `cmms_section_mst` (`SM_ID`);
