// ============================================================================
// src/modules/auth/sso.repo.js - SSO identity DAL
// ----------------------------------------------------------------------------
// Separate from users/user_roles by design. Reads employee_sso_directory and
// sso_user_roles, while reusing roles/role_permissions/permissions.
// ============================================================================

'use strict';

const pool = require('../../config/db');
const { normalizeLaneScopes } = require('../../utils/lanes');

async function findByEmployeeId(employeeId) {
  const [rows] = await pool.query(
    `SELECT sso_user_id, employee_id, email, full_name, egd_name, designation,
            telephone, lab_telephone, is_active, last_sso_login_at
       FROM employee_sso_directory
      WHERE employee_id = ?
      LIMIT 1`,
    [employeeId],
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.query(
    `SELECT sso_user_id, employee_id, email, full_name, egd_name, designation,
            telephone, lab_telephone, is_active, last_sso_login_at
       FROM employee_sso_directory
      WHERE email = ?
      LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function loadRoleAndPermissions(ssoUserId) {
  const [rows] = await pool.query(
    `SELECT r.role_code, p.permission_code
       FROM sso_user_roles sur
       JOIN roles r             ON r.role_id       = sur.role_id
       JOIN role_permissions rp ON rp.role_id      = sur.role_id
       JOIN permissions p       ON p.permission_id = rp.permission_id
      WHERE sur.sso_user_id = ?`,
    [ssoUserId],
  );

  if (rows.length === 0) {
    return { role_code: null, permissions: [], lane_scopes: [] };
  }

  const roleCode = rows[0].role_code;
  return {
    role_code: roleCode,
    permissions: rows.map((r) => r.permission_code),
    lane_scopes: normalizeLaneScopes(roleCode, null),
  };
}

async function recordSuccessfulLogin(ssoUserId, ipAddress) {
  await pool.query(
    `UPDATE employee_sso_directory
        SET last_sso_login_at = NOW(6),
            last_sso_login_ip = ?,
            updated_at        = NOW(6),
            updated_by        = 'SSO_LOGIN'
      WHERE sso_user_id = ?`,
    [ipAddress, ssoUserId],
  );
}

module.exports = {
  findByEmployeeId,
  findByEmail,
  loadRoleAndPermissions,
  recordSuccessfulLogin,
};
