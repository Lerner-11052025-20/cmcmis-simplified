-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `_legacy_userrole_mst` (
  `USER_ID` varchar(7) NOT NULL,
  `USER_DIVISION_ID` int(11) NOT NULL,
  `USER_ROLE` int(11) NOT NULL,
  `USER_PASSWORD` varchar(10) NOT NULL,
  `USER_STATE` tinyint(1) NOT NULL,
  `USER_CREATED_BY` varchar(7) NOT NULL,
  `USER_CREATED_ON` datetime(6) NOT NULL,
  `USER_UPDATED_BY` varchar(7) NOT NULL,
  `USER_UPDATED_ON` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `_legacy_userrole_mst`
  ADD PRIMARY KEY (`USER_ID`,`USER_DIVISION_ID`);
