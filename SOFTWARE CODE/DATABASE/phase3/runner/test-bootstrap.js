#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════
 * CMCMIS_SIMPLIFIED — Phase 3 End-to-End Bootstrap Test
 * File:     test-bootstrap.js
 *
 * Purpose:  Verify the full bootstrap path post-migration:
 *           1. SA79900 logs in with password 'SA79900' → "JWT issued"
 *           2. SA79900 creates a Normal User 'DS00001'
 *           3. DS00001 logs in with password 'DS00001' → "JWT issued"
 *           4. DS00001 cannot access admin endpoints (perm check fails)
 *
 * This is a DB-only simulation — no HTTP server needed. It mimics what
 * the auth service WILL do once the modules are wired in Phase 4.
 *
 * Usage:    node test-bootstrap.js
 * ════════════════════════════════════════════════════════════════════
 */

'use strict';

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const C = {
  reset:'\x1b[0m', bold:'\x1b[1m', red:'\x1b[31m', green:'\x1b[32m',
  yellow:'\x1b[33m', blue:'\x1b[34m', cyan:'\x1b[36m', gray:'\x1b[90m'
};

const banner = m => console.log(`\n${C.cyan}${C.bold}═══ ${m} ═══${C.reset}\n`);
const ok     = m => console.log(`${C.green}✓${C.reset} ${m}`);
const err    = m => console.log(`${C.red}✗${C.reset} ${m}`);
const step   = m => console.log(`${C.blue}▶${C.reset} ${m}`);
const detail = m => console.log(`  ${C.gray}${m}${C.reset}`);

const PASSWORD_REGEX = /^[A-Z]{2}[0-9]{5}$/;

const CFG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'final',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
};


// ────────────────────────────────────────────────────────────────────
// Simulated auth service functions (DB-only, no HTTP)
// ────────────────────────────────────────────────────────────────────

/** Simulates POST /auth/login */
async function login(conn, employeeId, password, ipAddress = '127.0.0.1') {
  // Step 1: regex validate
  if (!PASSWORD_REGEX.test(password)) {
    await conn.query(
      'INSERT INTO `login_audit` (employee_id, outcome, ip_address) VALUES (?,?,?)',
      [employeeId, 'FAILED_INVALID_FORMAT', ipAddress]
    );
    return {ok: false, reason: 'invalid_format'};
  }

  // Step 2: find user
  const [u] = await conn.query(
    `SELECT user_id, password_hash, is_active, is_locked, failed_login_count
       FROM users WHERE employee_id = ? LIMIT 1`,
    [employeeId]
  );
  if (u.length === 0) {
    await conn.query(
      'INSERT INTO `login_audit` (employee_id, outcome, ip_address) VALUES (?,?,?)',
      [employeeId, 'FAILED_NOT_FOUND', ipAddress]
    );
    return {ok: false, reason: 'not_found'};
  }
  const user = u[0];
  if (!user.is_active) {
    return {ok: false, reason: 'inactive'};
  }
  if (user.is_locked) {
    return {ok: false, reason: 'locked'};
  }

  // Step 3: bcrypt compare
  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    await conn.query(
      `UPDATE users SET failed_login_count = failed_login_count + 1 WHERE user_id = ?`,
      [user.user_id]
    );
    await conn.query(
      'INSERT INTO `login_audit` (employee_id, outcome, ip_address) VALUES (?,?,?)',
      [employeeId, 'FAILED_BAD_PASSWORD', ipAddress]
    );
    return {ok: false, reason: 'bad_password'};
  }

  // Step 4: load role + permissions (this is what the JWT payload will carry)
  const [rolePerms] = await conn.query(
    `SELECT r.role_code, p.permission_code
       FROM user_roles ur
       JOIN roles r            ON r.role_id = ur.role_id
       JOIN role_permissions rp ON rp.role_id = r.role_id
       JOIN permissions p      ON p.permission_id = rp.permission_id
      WHERE ur.user_id = ?`,
    [user.user_id]
  );

  const role = rolePerms[0]?.role_code || null;
  const permissions = rolePerms.map(r => r.permission_code);

  // Step 5: update last_login + reset failed_count
  await conn.query(
    `UPDATE users SET last_login_at = NOW(6), last_login_ip = ?, failed_login_count = 0
      WHERE user_id = ?`,
    [ipAddress, user.user_id]
  );
  await conn.query(
    'INSERT INTO `login_audit` (employee_id, outcome, ip_address) VALUES (?,?,?)',
    [employeeId, 'SUCCESS', ipAddress]
  );

  // Step 6: build fake "JWT payload" (for demo; real JWT is in Phase 4)
  return {
    ok: true,
    jwtPayload: {
      sub: employeeId,
      role,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    },
  };
}

/** Simulates POST /admin/users (requires permission user:role-assign) */
async function createUser(conn, actorEmployeeId, actorPermissions,
                          newEmployeeId, newRoleCode, sectionId = null) {
  // Authorize
  if (!actorPermissions.includes('user:role-assign')) {
    return {ok: false, reason: 'forbidden'};
  }

  // Employee must already exist in cmms_emp_mst (BR-AUTH-02: no self-registration)
  const [emp] = await conn.query(
    'SELECT EMM_ID FROM cmms_emp_mst WHERE EMM_ID = ?', [newEmployeeId]
  );
  if (emp.length === 0) {
    return {ok: false, reason: 'employee_not_in_directory'};
  }

  // Bcrypt the password (= employee_id)
  const passwordHash = await bcrypt.hash(newEmployeeId, CFG.bcryptRounds);

  // Insert into users
  const [ins] = await conn.query(
    `INSERT INTO users (employee_id, password_hash, section_id, is_active,
                        password_hash_set_at, created_by, updated_by)
     VALUES (?, ?, ?, 1, NOW(6), ?, ?)`,
    [newEmployeeId, passwordHash, sectionId, actorEmployeeId, actorEmployeeId]
  );
  const newUserId = ins.insertId;

  // Get role_id from code
  const [r] = await conn.query(
    'SELECT role_id FROM roles WHERE role_code = ?', [newRoleCode]
  );
  if (r.length === 0) return {ok: false, reason: 'invalid_role_code'};

  // Insert user_roles
  await conn.query(
    'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?,?,?)',
    [newUserId, r[0].role_id, actorEmployeeId]
  );

  // Audit
  await conn.query(
    `INSERT INTO audit_log (actor_employee_id, actor_role_code, action,
                             entity_type, entity_id, notes)
     VALUES (?, ?, 'USER_CREATE', 'users', ?, ?)`,
    [actorEmployeeId, 'SUPER_ADMIN', newEmployeeId,
     `Created user ${newEmployeeId} with role ${newRoleCode}`]
  );

  return {ok: true, userId: newUserId};
}


// ────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection(CFG);
  let failures = 0;

  try {
    banner('END-TO-END BOOTSTRAP TEST');

    // ─── Test 1: SA79900 login with password = 'SA79900' ──────────
    step("Test 1: SA79900 logs in with password 'SA79900'");
    const t1 = await login(conn, 'SA79900', 'SA79900');
    if (t1.ok && t1.jwtPayload.role === 'SUPER_ADMIN' && t1.jwtPayload.permissions.length === 40) {
      ok('SA79900 login successful');
      detail(`role: ${t1.jwtPayload.role}`);
      detail(`permissions: ${t1.jwtPayload.permissions.length} granted`);
    } else {
      err(`SA79900 login FAILED: ${JSON.stringify(t1)}`);
      failures++;
    }

    // ─── Test 2: SA79900 creates DS00001 (NORMAL_USER) ──────────────
    step('Test 2: SA79900 prepares DS00001 in cmms_emp_mst (legacy step), then creates user');

    // First insert into legacy directory (this is what would happen via
    // a future "manage employees" Phase 2 UI; for the test we just write it).
    await conn.query(
      `INSERT IGNORE INTO cmms_emp_mst
         (EMM_ID, EMM_NAME, EMM_DESIGNATION, EMM_DEPT,
          EMM_CREATED_BY, EMM_CREATED_ON, EMM_UPDATED_BY, EMM_UPDATED_ON, EMM_INACTIVE)
       VALUES ('DS00001', 'Deep Sorathiya', 'Software Developer Intern', 9999,
               'SA79900', NOW(6), 'SA79900', NOW(6), 0)`
    );

    // Get T&ME section id for assignment
    const [s] = await conn.query("SELECT section_id FROM sections WHERE section_code = 'TME'");
    const tmeId = s[0]?.section_id || null;

    const t2 = await createUser(
      conn,
      'SA79900',
      t1.jwtPayload.permissions,
      'DS00001',
      'NORMAL_USER',
      tmeId
    );
    if (t2.ok) {
      ok(`DS00001 created (user_id=${t2.userId}, role=NORMAL_USER, section_id=${tmeId})`);
    } else {
      err(`Create DS00001 FAILED: ${JSON.stringify(t2)}`);
      failures++;
    }

    // ─── Test 3: DS00001 logs in with password = 'DS00001' ────────
    step("Test 3: DS00001 logs in with password 'DS00001'");
    const t3 = await login(conn, 'DS00001', 'DS00001');
    if (t3.ok && t3.jwtPayload.role === 'NORMAL_USER') {
      ok('DS00001 login successful');
      detail(`role: ${t3.jwtPayload.role}`);
      detail(`permissions: ${t3.jwtPayload.permissions.length} granted (subset of Super Admin's 40)`);
    } else {
      err(`DS00001 login FAILED: ${JSON.stringify(t3)}`);
      failures++;
    }

    // ─── Test 4: DS00001 cannot create users (permission denial) ──
    step('Test 4: DS00001 tries to create another user (should be FORBIDDEN)');
    const t4 = await createUser(
      conn, 'DS00001', t3.jwtPayload.permissions,
      'XX00099', 'LAB_ENGINEER', tmeId
    );
    if (!t4.ok && t4.reason === 'forbidden') {
      ok('DS00001 correctly DENIED (no user:role-assign permission)');
    } else {
      err(`Permission check FAILED — DS00001 should not be able to create users: ${JSON.stringify(t4)}`);
      failures++;
    }

    // ─── Test 5: Bad password lockout simulation ──────────────────
    step('Test 5: DS00001 attempts login with wrong password (should FAIL)');
    const t5 = await login(conn, 'DS00001', 'WX99999');
    if (!t5.ok && t5.reason === 'bad_password') {
      ok('Wrong password correctly rejected');
      const [fc] = await conn.query(
        'SELECT failed_login_count FROM users WHERE employee_id = ?', ['DS00001']
      );
      detail(`failed_login_count incremented to: ${fc[0].failed_login_count}`);
    } else {
      err(`Wrong-password rejection FAILED: ${JSON.stringify(t5)}`);
      failures++;
    }

    // ─── Test 6: Invalid format rejected ──────────────────────────
    step("Test 6: Login with malformed password 'abc123' (should FAIL fast)");
    const t6 = await login(conn, 'DS00001', 'abc123');
    if (!t6.ok && t6.reason === 'invalid_format') {
      ok('Malformed password correctly rejected (before bcrypt)');
    } else {
      err(`Malformed-password rejection FAILED: ${JSON.stringify(t6)}`);
      failures++;
    }

    // ─── Test 7: Reset DS00001 to working state for next run ──────
    step('Test 7: Cleanup — reset DS00001 failed_login_count');
    await conn.query(
      'UPDATE users SET failed_login_count = 0 WHERE employee_id = ?', ['DS00001']
    );
    ok('DS00001 state reset');

    // ─── Summary ──────────────────────────────────────────────────
    banner('TEST SUMMARY');
    if (failures === 0) {
      ok(`ALL TESTS PASSED — Phase 3 bootstrap is RUNTIME READY.`);
    } else {
      err(`${failures} test(s) FAILED — investigate before declaring done.`);
      process.exit(1);
    }

    // Show the latest login_audit rows
    banner('Recent login_audit rows (last 8)');
    const [rows] = await conn.query(
      `SELECT employee_id, outcome, ip_address, attempt_at
         FROM login_audit
        ORDER BY audit_id DESC
        LIMIT 8`
    );
    console.table(rows);

  } finally {
    await conn.end();
  }
}

main().catch(e => { err(`FATAL: ${e.message}`); console.error(e.stack); process.exit(1); });
