/**
 * CMCMIS_SIMPLIFIED — Migration 008 (FIXED for MariaDB strict mode)
 * - Widens *_by columns from VARCHAR(7) to VARCHAR(20) BEFORE inserts
 *   ('BOOTSTRAP' is 9 chars; legacy schema had VARCHAR(7))
 * - Idempotent: column widen is no-op if already widened; user insert
 *   skipped if user already exists.
 */
'use strict';
const bcrypt = require('bcryptjs');
const PASSWORD_REGEX = /^[A-Z]{2}[0-9]{5}$/;

// columns to widen from any narrower size to VARCHAR(20)
const WIDENS = [
  // table, column, new column DDL (without name)
  ['users', 'created_by', "VARCHAR(20) NULL DEFAULT NULL"],
  ['users', 'updated_by', "VARCHAR(20) NULL DEFAULT NULL"],
  ['user_roles', 'assigned_by', "VARCHAR(20) NULL DEFAULT NULL"],
  ['role_permissions', 'granted_by', "VARCHAR(20) NULL DEFAULT NULL"],
  ['roles', 'role_code', null], // skip — narrow on purpose
  ['departments', 'created_by', "VARCHAR(20) NULL DEFAULT NULL"],
  ['departments', 'updated_by', "VARCHAR(20) NULL DEFAULT NULL"],
  ['sections', 'created_by', "VARCHAR(20) NULL DEFAULT NULL"],
  ['sections', 'updated_by', "VARCHAR(20) NULL DEFAULT NULL"],
  ['audit_log', 'actor_employee_id', "VARCHAR(20) NOT NULL"],
  ['cmms_cont_mst', 'CMM_CONT_CREATED_BY', "VARCHAR(20) NOT NULL"],
  ['cmms_cont_mst', 'CMM_CONT_UPDATED_BY', "VARCHAR(20) NOT NULL"],
];

async function widen(conn, table, col, newDdl) {
  if (!newDdl) return;
  // Check current length
  const [rows] = await conn.query(
    `SELECT CHARACTER_MAXIMUM_LENGTH AS len
       FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, col]
  );
  if (rows.length === 0) {
    console.log(`[008]   [SKIP] ${table}.${col} not found`);
    return;
  }
  if (rows[0].len >= 20) {
    console.log(`[008]   [OK]   ${table}.${col} already >= 20 chars`);
    return;
  }
  await conn.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${col}\` ${newDdl}`);
  console.log(`[008]   [WIDENED] ${table}.${col} → ${newDdl}`);
}

async function up(connection, env) {
  const csv = env.SUPER_ADMIN_EMPLOYEE_IDS || 'SA79900,AC77777';
  const employeeIds = csv.split(',').map(s => s.trim()).filter(Boolean);

  if (employeeIds.length < 2) {
    throw new Error(`[008] need >= 2 SUPER_ADMIN_EMPLOYEE_IDS, got: ${csv}`);
  }
  for (const id of employeeIds) {
    if (!PASSWORD_REGEX.test(id)) {
      throw new Error(`[008] "${id}" violates ^[A-Z]{2}[0-9]{5}$`);
    }
  }

  const rounds = parseInt(env.BCRYPT_ROUNDS || '12', 10);
  if (rounds < 10 || rounds > 14) {
    throw new Error(`[008] BCRYPT_ROUNDS must be 10..14, got ${rounds}.`);
  }
  console.log(`[008] bcrypt rounds = ${rounds}`);

  // ─── STEP A: Widen columns so 'BOOTSTRAP' (9 chars) fits ──────
  console.log(`[008] widening *_by columns to VARCHAR(20) (idempotent)…`);
  for (const [table, col, ddl] of WIDENS) {
    await widen(connection, table, col, ddl);
  }

  // ─── STEP B: Insert users + user_roles + audit_log ────────────
  let inserted = 0, skipped = 0;
  for (const employeeId of employeeIds) {
    // Verify legacy emp row exists (migration 004 should have inserted it)
    const [empRows] = await connection.query(
      'SELECT EMM_ID FROM `cmms_emp_mst` WHERE `EMM_ID` = ? LIMIT 1',
      [employeeId]
    );
    if (empRows.length === 0) {
      throw new Error(`[008] cmms_emp_mst row for "${employeeId}" missing. Run 004 first.`);
    }

    // Idempotency: skip if users row already exists
    const [usrRows] = await connection.query(
      'SELECT user_id FROM `users` WHERE `employee_id` = ? LIMIT 1',
      [employeeId]
    );
    if (usrRows.length > 0) {
      console.log(`[008]   [SKIPPED] user "${employeeId}" already exists`);
      skipped++;
      continue;
    }

    // bcrypt(password = employee_id, rounds)
    const passwordHash = await bcrypt.hash(employeeId, rounds);
    const ok = await bcrypt.compare(employeeId, passwordHash);
    if (!ok) throw new Error(`[008] bcrypt round-trip failed for "${employeeId}"`);

    // Insert users
    const [usrIns] = await connection.query(
      `INSERT INTO \`users\`
         (\`employee_id\`, \`password_hash\`, \`section_id\`,
          \`is_active\`, \`is_locked\`, \`failed_login_count\`,
          \`password_hash_set_at\`, \`created_at\`, \`created_by\`,
          \`updated_at\`, \`updated_by\`)
       VALUES (?, ?, NULL, 1, 0, 0, NOW(6), NOW(6), 'BOOTSTRAP', NOW(6), 'BOOTSTRAP')`,
      [employeeId, passwordHash]
    );
    const newUserId = usrIns.insertId;

    // Grant SUPER_ADMIN
    await connection.query(
      `INSERT INTO \`user_roles\` (\`user_id\`, \`role_id\`, \`assigned_at\`, \`assigned_by\`)
       VALUES (?, 1, NOW(6), 'BOOTSTRAP')`,
      [newUserId]
    );

    // Audit
    await connection.query(
      `INSERT INTO \`audit_log\`
         (\`actor_employee_id\`, \`actor_role_code\`, \`action\`,
          \`entity_type\`, \`entity_id\`, \`occurred_at\`, \`notes\`)
       VALUES
         ('BOOTSTRAP', 'BOOTSTRAP', 'USER_CREATE',  'users',      ?, NOW(6), ?),
         ('BOOTSTRAP', 'BOOTSTRAP', 'ROLE_ASSIGN',  'user_roles', ?, NOW(6), ?),
         ('BOOTSTRAP', 'BOOTSTRAP', 'PASSWORD_SET', 'users',      ?, NOW(6), ?)`,
      [
        employeeId, `Bootstrap seed: user_id=${newUserId}, employee_id=${employeeId}`,
        employeeId, 'Bootstrap seed: role=SUPER_ADMIN (role_id=1)',
        employeeId, `Bootstrap seed: password = employee_id, bcrypt rounds=${rounds}`
      ]
    );

    console.log(`[008]   [INSERTED] user "${employeeId}" → SUPER_ADMIN`);
    inserted++;
  }

  console.log(`[008] ✓ complete. inserted=${inserted}, skipped=${skipped}`);
  return { inserted, skipped };
}

module.exports = { up };