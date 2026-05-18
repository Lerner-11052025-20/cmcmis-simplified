-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `_legacy_section_user_mst` (
  `SM_ID` int(11) NOT NULL,
  `SM_USER_ID` varchar(7) NOT NULL,
  `SM_USER_NAME` varchar(50) NOT NULL,
  `SM_USER_ROLE` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `_legacy_section_user_mst`
  ADD PRIMARY KEY (`SM_ID`,`SM_USER_ID`),
  ADD KEY `FK_CMMS_SECTION_USER_MST_CMMS_ROLE_MST` (`SM_USER_ROLE`);
ALTER TABLE `_legacy_section_user_mst`
  ADD CONSTRAINT `FK_CMMS_SECTION_USER_MST_CMMS_ROLE_MST` FOREIGN KEY (`SM_USER_ROLE`) REFERENCES `_legacy_role_mst` (`ROLE_ID`),
  ADD CONSTRAINT `FK_CMMS_SECTION_USER_MST_CMMS_SECTION_MST` FOREIGN KEY (`SM_ID`) REFERENCES `cmms_section_mst` (`SM_ID`);
