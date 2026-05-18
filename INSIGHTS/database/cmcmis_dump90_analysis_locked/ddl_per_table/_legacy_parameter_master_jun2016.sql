-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `_legacy_parameter_master_jun2016` (
  `CategoryID` smallint(6) NOT NULL,
  `CategoryDescription` varchar(50) NOT NULL,
  `SrID` varchar(15) NOT NULL,
  `Value` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

