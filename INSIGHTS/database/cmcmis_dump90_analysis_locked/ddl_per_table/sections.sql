-- CMCMIS dump90tables schema-only extraction
-- Source: dump90tables.sql inside dump90tables.zip
-- Extracted: 2026-05-18 15:10:22
-- Source SHA256: dd57e353524636a960f04c0fcd658fb8428ecd6e88e653e52a399b81381ffc6a
-- Note: data INSERT statements intentionally removed. Review before running in production.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE `sections` (
  `section_id` int(10) UNSIGNED NOT NULL,
  `department_id` smallint(5) UNSIGNED NOT NULL,
  `section_code` varchar(20) NOT NULL COMMENT 'Short uppercase code; e.g., TME, FPE',
  `section_name` varchar(150) NOT NULL,
  `section_description` varchar(500) DEFAULT NULL,
  `equipment_category` enum('TME','FPE') NOT NULL COMMENT 'TME = Test & Measurement; FPE = Fabrication & Production',
  `head_employee_id` varchar(7) DEFAULT NULL COMMENT 'FK → cmms_emp_mst.EMM_ID (legacy)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_by` varchar(20) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `updated_by` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Cluster 2: T&ME and F&PE sections under TIMCD';

ALTER TABLE `sections`
  ADD PRIMARY KEY (`section_id`),
  ADD UNIQUE KEY `uk_sect_code` (`section_code`),
  ADD KEY `fk_sections_head_emp` (`head_employee_id`),
  ADD KEY `idx_sect_dept` (`department_id`),
  ADD KEY `idx_sect_category` (`equipment_category`),
  ADD KEY `idx_sect_active` (`is_active`);
ALTER TABLE `sections`
  MODIFY `section_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
ALTER TABLE `sections`
  ADD CONSTRAINT `fk_sections_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`),
  ADD CONSTRAINT `fk_sections_head_emp` FOREIGN KEY (`head_employee_id`) REFERENCES `cmms_emp_mst` (`EMM_ID`);
