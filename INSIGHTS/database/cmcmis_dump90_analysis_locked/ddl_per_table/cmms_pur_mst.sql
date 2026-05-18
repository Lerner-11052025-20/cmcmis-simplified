-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_pur_mst` (
  `PUM_NO` varchar(25) NOT NULL,
  `PUM_REQ_WHO` bigint(20) DEFAULT NULL,
  `PUM_DT` datetime(6) DEFAULT NULL,
  `PUM_VEND_CODE` varchar(4) DEFAULT NULL,
  `PUM_COST_CENTER` varchar(30) DEFAULT NULL,
  `PUM_PARTSTOTAL` decimal(10,2) DEFAULT NULL,
  `PUM_FRIGHT` decimal(10,2) DEFAULT NULL,
  `PUM_OTHERCHARGE` decimal(10,2) DEFAULT NULL,
  `PUM_GTOTAL` decimal(22,2) DEFAULT NULL,
  `PUM_BILLTO` varchar(4) DEFAULT NULL,
  `PUM_GST` varchar(10) DEFAULT NULL,
  `PUM_INSU` varchar(10) DEFAULT NULL,
  `PUM_OCTROI` varchar(10) DEFAULT NULL,
  `PUM_APPROVAL1` bigint(20) DEFAULT NULL,
  `PUM_APPROVAL2` bigint(20) DEFAULT NULL,
  `PUM_APP1_DATE` datetime(6) DEFAULT NULL,
  `PUM_APP2_DATE` datetime(6) DEFAULT NULL,
  `PUM_CREATED_BY` mediumint(9) DEFAULT NULL,
  `PUM_CREATED_ON` datetime(6) DEFAULT NULL,
  `PUM_UPDATED_BY` mediumint(9) DEFAULT NULL,
  `PUM_UPDATED_ON` datetime(6) DEFAULT NULL,
  `PUM_REMARKS` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_pur_mst`
  ADD PRIMARY KEY (`PUM_NO`);
