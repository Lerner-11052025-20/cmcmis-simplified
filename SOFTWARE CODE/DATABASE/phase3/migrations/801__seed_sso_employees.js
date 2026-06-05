/**
 * CMCMIS_SIMPLIFIED - Migration 801
 * Purpose: Import the 1877 organization SSO employees and assign NORMAL_USER.
 *
 * Locked design:
 * - Do not touch users.
 * - Do not touch user_roles.
 * - Store SSO identities in employee_sso_directory.
 * - Store SSO role mappings in sso_user_roles.
 * - Reuse roles/permissions through role_id.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_BATCH = 'response_employee_7_DATA';
const IMPORT_ACTOR = 'SSO_IMPORT';

function clean(value, maxLen) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return null;
  return maxLen ? text.slice(0, maxLen) : text;
}

function cleanEmployeeId(value) {
  const id = clean(value, 7);
  return id ? id.toUpperCase() : null;
}

function cleanEmail(value) {
  const email = clean(value, 150);
  return email ? email.toLowerCase() : null;
}

function loadPayload() {
  const filePath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'reports PDFs',
    'DATA',
    'response_employee_7_DATA.json',
  );
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!parsed || !Array.isArray(parsed.data)) {
    throw new Error('[801] response_employee_7_DATA.json must contain a data array');
  }
  return parsed.data;
}

async function up(conn) {
  const rows = loadPayload();
  const [roleRows] = await conn.query(
    "SELECT role_id FROM roles WHERE role_code = 'NORMAL_USER' LIMIT 1",
  );
  if (!roleRows[0]) {
    throw new Error("[801] NORMAL_USER role is missing. Run role seed migrations first.");
  }
  const normalUserRoleId = roleRows[0].role_id;

  let insertedOrUpdated = 0;
  let skipped = 0;
  let missingEmail = 0;
  const seenEmployeeIds = new Set();

  await conn.beginTransaction();
  try {
    for (const row of rows) {
      const employeeId = cleanEmployeeId(row.EmployeeCode);
      const fullName = clean(row.Name, 150);
      const email = cleanEmail(row.CenterEmail);

      if (!employeeId || !fullName) {
        skipped++;
        continue;
      }
      if (seenEmployeeIds.has(employeeId)) {
        throw new Error(`[801] Duplicate EmployeeCode in source JSON: ${employeeId}`);
      }
      seenEmployeeIds.add(employeeId);
      if (!email) missingEmail++;

      await conn.query(
        `INSERT INTO employee_sso_directory
           (employee_id, email, full_name, egd_name, designation,
            telephone, lab_telephone, is_active, source_batch, raw_payload,
            created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(6), ?, NOW(6), ?)
         ON DUPLICATE KEY UPDATE
           email         = VALUES(email),
           full_name     = VALUES(full_name),
           egd_name      = VALUES(egd_name),
           designation   = VALUES(designation),
           telephone     = VALUES(telephone),
           lab_telephone = VALUES(lab_telephone),
           is_active     = 1,
           source_batch  = VALUES(source_batch),
           raw_payload   = VALUES(raw_payload),
           updated_at    = NOW(6),
           updated_by    = VALUES(updated_by)`,
        [
          employeeId,
          email,
          fullName,
          clean(row.EGDName, 100),
          clean(row.DesignationFullname, 200),
          clean(row.Telephone, 100),
          clean(row.LabTelephone, 100),
          SOURCE_BATCH,
          JSON.stringify(row),
          IMPORT_ACTOR,
          IMPORT_ACTOR,
        ],
      );

      const [ssoRows] = await conn.query(
        'SELECT sso_user_id FROM employee_sso_directory WHERE employee_id = ? LIMIT 1',
        [employeeId],
      );
      const ssoUserId = ssoRows[0] && ssoRows[0].sso_user_id;
      if (!ssoUserId) {
        throw new Error(`[801] Failed to resolve imported SSO user: ${employeeId}`);
      }

      await conn.query(
        `INSERT INTO sso_user_roles (sso_user_id, role_id, assigned_at, assigned_by)
         VALUES (?, ?, NOW(6), ?)
         ON DUPLICATE KEY UPDATE
           role_id = VALUES(role_id),
           assigned_at = NOW(6),
           assigned_by = VALUES(assigned_by)`,
        [ssoUserId, normalUserRoleId, IMPORT_ACTOR],
      );

      insertedOrUpdated++;
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  }

  console.log(
    `[801] SSO import complete. rows=${rows.length}, upserted=${insertedOrUpdated}, ` +
    `skipped=${skipped}, missing_email=${missingEmail}, role=NORMAL_USER`,
  );
}

module.exports = { up };
