-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_device_spares_mst` (
  `DS_TYPE` char(1) NOT NULL COMMENT 'S- Spare / D - Device',
  `DS_ID` int(11) NOT NULL,
  `DS_NAME` varchar(50) NOT NULL,
  `DS_STATE` tinyint(1) NOT NULL,
  `DS_CREATED_BY` varchar(7) NOT NULL,
  `DS_CREATED_ON` datetime(6) NOT NULL,
  `DS_UPDATED_BY` varchar(7) NOT NULL,
  `DS_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_device_spares_mst`
  ADD PRIMARY KEY (`DS_ID`);
