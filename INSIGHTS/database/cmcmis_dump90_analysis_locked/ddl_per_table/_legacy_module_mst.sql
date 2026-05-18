-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `_legacy_module_mst` (
  `MOD_MENU_TYPE` smallint(6) NOT NULL DEFAULT 1 COMMENT '"0" for non timcf and "1" for timcf',
  `MOD_ID` int(11) NOT NULL,
  `MOD_NAME` varchar(50) NOT NULL,
  `MOD_PARENT_ID` int(11) DEFAULT NULL,
  `MOD_LEVEL` smallint(6) NOT NULL,
  `MOD_POSITION` int(11) DEFAULT NULL,
  `MOD_NAVIGATE_URL` varchar(100) DEFAULT '#',
  `MOD_CREATED_BY` varchar(7) DEFAULT NULL,
  `MOD_CREATED_ON` datetime(6) DEFAULT NULL,
  `MOD_UPDATED_BY` varchar(7) DEFAULT NULL,
  `MOD_UPDATED_ON` datetime(6) DEFAULT NULL,
  `MOD_IS_LEAF` int(11) DEFAULT 1,
  `MOD_DESC` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

ALTER TABLE `_legacy_module_mst`
  ADD PRIMARY KEY (`MOD_ID`),
  ADD KEY `FK_CMMS_MODULE_MST_CMMS_MODULE_MST` (`MOD_PARENT_ID`);
ALTER TABLE `_legacy_module_mst`
  ADD CONSTRAINT `FK_CMMS_MODULE_MST_CMMS_MODULE_MST` FOREIGN KEY (`MOD_PARENT_ID`) REFERENCES `_legacy_module_mst` (`MOD_ID`);
