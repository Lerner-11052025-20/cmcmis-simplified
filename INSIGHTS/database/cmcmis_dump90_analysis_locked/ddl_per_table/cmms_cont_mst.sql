-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_cont_mst` (
  `CMM_CONT_ID` int(11) NOT NULL COMMENT 'Surrogate PK; referenced by 4 legacy tables',
  `CMM_CONT_NAME` varchar(200) NOT NULL,
  `CMM_CONT_TYPE` enum('MFR','VENDOR','BOTH','OEM') NOT NULL DEFAULT 'BOTH',
  `CMM_CONT_CONTACT_PERSON` varchar(150) DEFAULT NULL,
  `CMM_CONT_EMAIL` varchar(150) DEFAULT NULL,
  `CMM_CONT_PHONE` varchar(50) DEFAULT NULL,
  `CMM_CONT_MOBILE` varchar(50) DEFAULT NULL,
  `CMM_CONT_ADDRESS` varchar(500) DEFAULT NULL,
  `CMM_CONT_CITY` varchar(100) DEFAULT NULL,
  `CMM_CONT_STATE` varchar(100) DEFAULT NULL,
  `CMM_CONT_COUNTRY` varchar(100) DEFAULT NULL,
  `CMM_CONT_ZIP` varchar(20) DEFAULT NULL,
  `CMM_CONT_WEBSITE` varchar(255) DEFAULT NULL,
  `CMM_CONT_GSTIN` varchar(20) DEFAULT NULL,
  `CMM_CONT_PAN` varchar(20) DEFAULT NULL,
  `CMM_CONT_NABL` tinyint(1) NOT NULL DEFAULT 0,
  `CMM_CONT_NABL_CERT_NO` varchar(50) DEFAULT NULL,
  `CMM_CONT_REMARKS` varchar(1000) DEFAULT NULL,
  `CMM_CONT_STATE_FLAG` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'is_active — kept naming style of legacy tables',
  `CMM_CONT_CREATED_BY` varchar(20) NOT NULL,
  `CMM_CONT_CREATED_ON` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `CMM_CONT_UPDATED_BY` varchar(20) NOT NULL,
  `CMM_CONT_UPDATED_ON` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 3: vendor/manufacturer master (was missing from legacy dump)';

ALTER TABLE `cmms_cont_mst`
  ADD PRIMARY KEY (`CMM_CONT_ID`),
  ADD UNIQUE KEY `uk_cont_name` (`CMM_CONT_NAME`),
  ADD KEY `idx_cont_type` (`CMM_CONT_TYPE`),
  ADD KEY `idx_cont_active` (`CMM_CONT_STATE_FLAG`),
  ADD KEY `idx_cont_name_search` (`CMM_CONT_NAME`(50));
ALTER TABLE `cmms_cont_mst`
  MODIFY `CMM_CONT_ID` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK;
