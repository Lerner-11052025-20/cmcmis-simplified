-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 770 (Phase 16 · Dynamic Terms & Conditions)
-- File:     770__dynamic_job_request_terms.sql
-- Purpose:  Create table, seed initial terms, and define administrative
--           permission code granted strictly to SUPER_ADMIN role.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 770.1  Create job_request_terms table ────────────────────────────
CREATE TABLE IF NOT EXISTS `job_request_terms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `index_no` INT NOT NULL,
  `text` VARCHAR(500) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX `idx_jrt_active` (`is_active`),
  INDEX `idx_jrt_index_no` (`index_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 770.2  Seed initial reference terms verbatim ─────────────────────
INSERT IGNORE INTO `job_request_terms` (`id`, `index_no`, `text`, `is_active`, `created_at`, `updated_at`)
VALUES
  (1, 1, 'I confirm that all equipment details provided are accurate and complete to the best of my knowledge.', 1, NOW(6), NOW(6)),
  (2, 2, 'I understand that the equipment must be delivered to the calibration lab in proper working condition with all necessary accessories.', 1, NOW(6), NOW(6)),
  (3, 3, 'I acknowledge that the calibration timeline begins only after the equipment is received and inspected by the lab.', 1, NOW(6), NOW(6)),
  (4, 4, 'I agree to coordinate with the assigned lab engineer for any additional information or testing requirements.', 1, NOW(6), NOW(6)),
  (5, 5, 'I accept that equipment found to be damaged or beyond repair will be returned with appropriate documentation and recommendations.', 1, NOW(6), NOW(6)),
  (6, 6, 'I understand that urgency requests will be handled based on lab capacity and must be justified with proper authorization.', 1, NOW(6), NOW(6));


-- ── 770.3  Seed terms:manage permission ──────────────────────────────
INSERT IGNORE INTO `permissions`
  (`permission_code`,    `resource`,  `action`,    `description`,                                              `is_system`, `created_at`)
VALUES
  ('terms:manage',       'terms',     'manage',    'Manage dynamic terms and conditions (CRUD)',               1, NOW(6));


-- ── 770.4  Grant terms:manage to SUPER_ADMIN role ────────────────────
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'BOOTSTRAP'
  FROM `roles` r
  CROSS JOIN `permissions` p
 WHERE r.role_code = 'SUPER_ADMIN'
   AND p.permission_code = 'terms:manage';


-- ── 770.5  Verify ────────────────────────────────────────────────────
SELECT
  p.permission_code,
  COUNT(rp.role_id)                            AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles`            r  ON r.role_id        = rp.role_id
 WHERE p.permission_code = 'terms:manage'
 GROUP BY p.permission_code;

SELECT COUNT(*) AS seeded_terms_count FROM `job_request_terms`;

SELECT '✓ Migration 770 complete — Dynamic terms and conditions table created & seeded' AS result;
