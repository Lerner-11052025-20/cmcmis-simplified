-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_lineitem_mst` (
  `LITM_ID` varchar(15) NOT NULL,
  `LITM_NAME` varchar(100) NOT NULL,
  `LITM_AMT` bigint(20) DEFAULT NULL,
  `LITM_YEAR` varchar(9) DEFAULT NULL,
  `LITM_STATE` tinyint(1) NOT NULL,
  `LITM_CREATED_BY` varchar(7) NOT NULL,
  `LITM_CREATED_ON` datetime(6) NOT NULL,
  `LITM_UPDATED_BY` varchar(7) NOT NULL,
  `LITM_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_lineitem_mst`
  ADD PRIMARY KEY (`LITM_ID`);
