-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_vendor_doc_spec` (
  `VENDOR_ID` int(11) NOT NULL,
  `VENDOR_DOC_FILENAME` varchar(255) NOT NULL,
  `VENDOR_DOC_IMAGE` longblob DEFAULT NULL,
  `VENDOR_DOC_PATH` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

