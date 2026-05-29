-- ============================================================================
-- CMCMIS_SIMPLIFIED - Migration 750
-- File:     750__equipment_verification_super_admin_only.sql
-- Purpose:  Restrict Admin / Equipment Verification to SUPER_ADMIN only.
--
-- Context:
--   Earlier RBAC seeds granted equipment:verify to the global LAB_IN_CHARGE
--   role, and migration 700 copied that grant to the four scoped lab
--   in-charge roles. The admin verification screen must now be available
--   only to SUPER_ADMIN.
--
-- Additive/safe:
--   - No role, user, permission, or equipment rows are removed.
--   - Only role-permission grants for equipment:verify are narrowed.
-- ============================================================================

SET NAMES utf8mb4;

UPDATE `permissions`
   SET `description` = 'PENDING_VERIFICATION -> ACTIVE (SUPER_ADMIN only)'
 WHERE `permission_code` = 'equipment:verify';

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`, `granted_by`)
SELECT r.role_id, p.permission_id, NOW(6), 'MIGRATION_750'
  FROM `roles` r
  JOIN `permissions` p ON p.permission_code = 'equipment:verify'
 WHERE r.role_code = 'SUPER_ADMIN';

DELETE rp
  FROM `role_permissions` rp
  JOIN `roles` r ON r.role_id = rp.role_id
  JOIN `permissions` p ON p.permission_id = rp.permission_id
 WHERE p.permission_code = 'equipment:verify'
   AND r.role_code <> 'SUPER_ADMIN';

SELECT
  p.permission_code,
  COUNT(rp.role_id) AS granted_roles,
  GROUP_CONCAT(r.role_code ORDER BY r.role_id) AS roles
  FROM `permissions` p
  LEFT JOIN `role_permissions` rp ON rp.permission_id = p.permission_id
  LEFT JOIN `roles` r ON r.role_id = rp.role_id
 WHERE p.permission_code = 'equipment:verify'
 GROUP BY p.permission_code;

SELECT 'Migration 750 complete - equipment verification is SUPER_ADMIN-only' AS result;
