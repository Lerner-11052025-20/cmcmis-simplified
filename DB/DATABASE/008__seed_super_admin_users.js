/**
 * ════════════════════════════════════════════════════════════════════
 * CMCMIS_SIMPLIFIED — Migration 008
 * File:     008__seed_super_admin_users.js
 * Purpose:  Insert SA79900 and AC77777 into `users` + `user_roles`
 *           with bcrypt-hashed passwords (= their employee_id strings)
 * Why JS:   SQL cannot bcrypt natively; Node.js bcryptjs does.
 *
 * Per:      Q3 (zero migration), Q7 (password=employee_id, bcrypt cost 12)
 *           M11 (bcrypt cost: 12 prod / 10 dev/test)
 *
 * Idempotent: YES — checks-then-inserts; safe to re-run.
 *
 * Locked password rule: ^[A-Z]{2}[0-9]{5}$
 * Both SA79900 and AC77777 match this regex → initial passwords are valid.
 * ════════════════════════════════════════════════════════════════════
 */

'use strict';

const bcrypt = require('bcryptjs');

const PASSWORD_REGEX = /^[A-Z]{2}[0-9]{5}$/;

/**
 * Migration runner contract:
 *   - exports `up(connection, env)` where connection is mysql2/promise pool
 *   - env carries SUPER_ADMIN_EMPLOYEE_IDS and BCRYPT_ROUNDS
 */
async function up(connection, env) {
  const csv = env.SUPER_ADMIN_EMPLOYEE_IDS || 'SA79900,AC77777';
  const employeeIds = csv.split(',').map(s => s.trim()).filter(Boolean);

  if (employeeIds.length < 2) {
    throw new Error(
      `[008] SUPER_ADMIN_EMPLOYEE_IDS must list ≥ 2 IDs (D11). Got: ${csv}`
    );
  }

  // Validate each ID matches locked password format
  for (const id of employeeIds) {
    if (!PASSWORD_REGEX.test(id)) {
      throw new Error(
        `[008] Employee ID "${id}" violates locked format ^[A-Z]{2}[0-9]{5}$ ` +
        `(needed because password = employee_id per Q7).`
      );
    }
  }

  const rounds = parseInt(env.BCRYPT_ROUNDS || '12', 10);
  if (rounds < 10 || rounds > 14) {
    throw new Error(`[008] BCRYPT_ROUNDS must be 10..14, got ${rounds}.`);
  }
  console.log(`[008] bcrypt rounds = ${rounds}`);

  let inserted = 0, skipped = 0;

  for (const employeeId of employeeIds) {
    // STEP 1: Verify the employee row exists in cmms_emp_mst (migration 004
    // should have inserted it; FK on users.employee_id will fail otherwise)
    const [empRows] = await connection.query(
      'SELECT EMM_ID FROM `cmms_emp_mst` WHERE `EMM_ID` = ? LIMIT 1',
      [employeeId]
    );
    if (empRows.length === 0) {
      throw new Error(
        `[008] cmms_emp_mst row for "${employeeId}" missing. ` +
        `Run migration 004 first.`
      );
    }

    // STEP 2: Check if `users` row already exists (idempotent)
    const [usrRows] = await connection.query(
      'SELECT user_id FROM `users` WHERE `employee_id` = ? LIMIT 1',
      [employeeId]
    );
    if (usrRows.length > 0) {
      console.log(`[008]   [SKIPPED] user "${employeeId}" already exists`);
      skipped++;
      continue;
    }

    // STEP 3: Compute bcrypt(password = employee_id, rounds)
    const passwordHash = await bcrypt.hash(employeeId, rounds);

    // Sanity check the hash round-trips
    const ok = await bcrypt.compare(employeeId, passwordHash);
    if (!ok) {
      throw new Error(
        `[008] bcrypt round-trip failed for "${employeeId}". ` +
        `Aborting — refuse to write a broken hash.`
      );
    }

    // STEP 4: Insert users row
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

    // STEP 5: Grant SUPER_ADMIN role (role_id = 1) via user_roles
    await connection.query(
      `INSERT INTO \`user_roles\`
         (\`user_id\`, \`role_id\`, \`assigned_at\`, \`assigned_by\`)
       VALUES (?, 1, NOW(6), 'BOOTSTRAP')`,
      [newUserId]
    );

    // STEP 6: Audit-log entries (3 rows per super admin)
    await connection.query(
      `INSERT INTO \`audit_log\`
         (\`actor_employee_id\`, \`actor_role_code\`, \`action\`,
          \`entity_type\`, \`entity_id\`, \`occurred_at\`, \`notes\`)
       VALUES
         (?, 'BOOTSTRAP', 'USER_CREATE',  'users',      ?, NOW(6), ?),
         (?, 'BOOTSTRAP', 'ROLE_ASSIGN',  'user_roles', ?, NOW(6), ?),
         (?, 'BOOTSTRAP', 'PASSWORD_SET', 'users',      ?, NOW(6), ?)`,
      [
        'BOOTSTRAP', employeeId,
          `Bootstrap seed: user_id=${newUserId}, employee_id=${employeeId}`,
        'BOOTSTRAP', employeeId,
          `Bootstrap seed: role=SUPER_ADMIN (role_id=1)`,
        'BOOTSTRAP', employeeId,
          `Bootstrap seed: password = employee_id, bcrypt rounds=${rounds}`
      ]
    );

    console.log(`[008]   [INSERTED] user "${employeeId}" → SUPER_ADMIN`);
    inserted++;
  }

  console.log(`[008] ✓ Migration 008 complete. inserted=${inserted}, skipped=${skipped}`);
  return { inserted, skipped };
}

module.exports = { up };
