-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `cmms_section_mst` (
  `SM_ID` int(11) NOT NULL,
  `SM_SHORTNAME` varchar(50) NOT NULL,
  `SM_NAME` varchar(80) DEFAULT NULL,
  `SM_HEAD_NAME` varchar(50) DEFAULT NULL,
  `SM_HEAD_PH_NO` varchar(50) DEFAULT NULL,
  `SM_HEAD_USER_ID` varchar(7) DEFAULT NULL,
  `SM_STATE` tinyint(1) NOT NULL,
  `SM_CREATED_BY` varchar(7) NOT NULL,
  `SM_CREATED_ON` datetime(6) NOT NULL,
  `SM_UPDATED_BY` varchar(7) NOT NULL,
  `SM_UPDATED_ON` datetime(6) NOT NULL,
  `SM_HEAD_DESIGNATION` varchar(200) DEFAULT NULL,
  `SM_ISGROUP` tinyint(1) NOT NULL DEFAULT 0,
  `SM_Email` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `cmms_section_mst`
  ADD PRIMARY KEY (`SM_ID`);
