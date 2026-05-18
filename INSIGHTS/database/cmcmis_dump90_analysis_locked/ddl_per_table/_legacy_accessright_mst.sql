-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `_legacy_accessright_mst` (
  `ACC_MOD_ID` int(11) NOT NULL,
  `ACC_ROLE` int(11) NOT NULL,
  `ACC_ADD` tinyint(3) UNSIGNED NOT NULL,
  `ACC_MODIFY` tinyint(3) UNSIGNED NOT NULL,
  `ACC_VIEW` tinyint(3) UNSIGNED NOT NULL,
  `ACC_DELETE` tinyint(3) UNSIGNED NOT NULL,
  `ACC_PRINT` tinyint(3) UNSIGNED NOT NULL,
  `ACC_CREATED_BY` varchar(7) DEFAULT NULL,
  `ACC_CREATED_ON` datetime(6) DEFAULT NULL,
  `ACC_UPDATED_BY` varchar(7) DEFAULT NULL,
  `ACC_UPDATED_ON` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `_legacy_accessright_mst`
  ADD PRIMARY KEY (`ACC_MOD_ID`,`ACC_ROLE`),
  ADD KEY `FK_CMMS_ACCESSRIGHT_MST_CMMS_ROLE_MST` (`ACC_ROLE`);
ALTER TABLE `_legacy_accessright_mst`
  ADD CONSTRAINT `FK_CMMS_ACCESSRIGHT_MST_CMMS_MODULE_MST` FOREIGN KEY (`ACC_MOD_ID`) REFERENCES `_legacy_module_mst` (`MOD_ID`),
  ADD CONSTRAINT `FK_CMMS_ACCESSRIGHT_MST_CMMS_ROLE_MST` FOREIGN KEY (`ACC_ROLE`) REFERENCES `_legacy_role_mst` (`ROLE_ID`);
