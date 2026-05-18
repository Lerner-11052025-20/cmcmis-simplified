// ============================================================================
// src/modules/employees/employees.service.js  —  Business logic
// ----------------------------------------------------------------------------
// Six service functions:
//   listEmployees(params)
//   findEmployee(employeeId)
//   createEmployee({ body, actor, ip, ua })
//   updateEmployee({ employeeId, body, actor, ip, ua })
//   softDeleteEmployee({ employeeId, actor, ip, ua })       — invariant I-5
//   createAccount({ employeeId, role, actor, ip, ua })       — generates pw
//
// SECURITY ENVELOPE
//   Every write runs inside one transaction with audit_log row written
//   in the same tx (Doctrine 6).
//   createAccount uses adminUsers.repo.insertUser to keep the user_roles
//   junction consistent — same canonical pattern as a normal user create.
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const pool = require('../../config/db');
const repo = require('./employees.repo');
const adminUsersRepo = require('../adminUsers/adminUsers.repo');
const sm = require('../adminUsers/adminUsers.stateMachine');
const { errors } = require('../../middleware/errorHandler');

// ────────────────────────────────────────────────────────────────────
//  Password generator — Q-1 locked
// ────────────────────────────────────────────────────────────────────
/**
 * 12-char URL-safe random password. Shown ONCE in the create-account
 * response; never stored in plaintext.
 */
function generateInitialPassword() {
  // 9 bytes → 12 base64-ish chars (after replacing the URL-unsafe ones)
  return crypto.randomBytes(9).toString('base64')
    .replace(/\+/g, 'A').replace(/\//g, 'B').replace(/=/g, '');
}

// ────────────────────────────────────────────────────────────────────
//  LIST
// ────────────────────────────────────────────────────────────────────
async function listEmployees(params) {
  const { rows, total } = await repo.listEmployees(params);

  const items = rows.map((r) => ({
    employee_id:     r.employee_id,
    full_name:       r.full_name,
    designation:     r.designation,
    email:           r.email,
    mobile:          r.mobile,
    lab_phone:       r.lab_phone,
    room_phone:      r.room_phone,
    division_id:     r.division_id,
    division_code:   r.division_code,
    division_name:   r.division_name,
    is_active:       r.is_active === 1,
    has_account:     r.user_id != null,
    user_id:         r.user_id || null,
    user_is_active:  r.user_id != null ? (r.user_is_active === 1) : null,
    created_at:      r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD') : null,
    deactivated_at:  r.deactivated_at ? dayjs(r.deactivated_at).format('YYYY-MM-DD HH:mm') : null,
  }));

  const totalPages = Math.max(1, Math.ceil(total / params.page_size));
  return {
    items,
    pagination: {
      page: params.page,
      page_size: params.page_size,
      total_items: total,
      total_pages: totalPages,
    },
    applied_filters: {
      q: params.q || null,
      is_active: params.is_active ?? null,
      division_id: params.division_id || null,
      has_account: params.has_account ?? null,
      sort: params.sort,
    },
  };
}

// ────────────────────────────────────────────────────────────────────
//  FIND ONE
// ────────────────────────────────────────────────────────────────────
async function findEmployee(employeeId) {
  const row = await repo.findEmployeeById(employeeId);
  if (!row) return null;
  return {
    employee_id:           row.employee_id,
    full_name:             row.full_name,
    designation:           row.designation,
    designation_date:      row.designation_date ? dayjs(row.designation_date).format('YYYY-MM-DD') : null,
    date_of_birth:         row.date_of_birth ? dayjs(row.date_of_birth).format('YYYY-MM-DD') : null,
    date_of_joining:       row.date_of_joining ? dayjs(row.date_of_joining).format('YYYY-MM-DD') : null,
    blood_group:           row.blood_group,
    address:               row.address,
    city:                  row.city,
    state:                 row.state,
    zip:                   row.zip,
    lab_phone:             row.lab_phone,
    room_phone:            row.room_phone,
    email:                 row.email,
    mobile:                row.mobile,
    remarks:               row.remarks,
    division_id:           row.division_id,
    division_code:         row.division_code,
    division_name:         row.division_name,
    is_active:             row.is_active === 1,
    created_at:            row.created_at ? dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss') : null,
    updated_at:            row.updated_at ? dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
    deactivated_at:        row.deactivated_at ? dayjs(row.deactivated_at).format('YYYY-MM-DD HH:mm:ss') : null,
    has_account:           row.user_id != null,
    user_id:               row.user_id || null,
    user_is_active:        row.user_id != null ? (row.user_is_active === 1) : null,
  };
}

// ────────────────────────────────────────────────────────────────────
//  CREATE
// ────────────────────────────────────────────────────────────────────
async function createEmployee({ body, actor, ipAddress, userAgent }) {
  // Pre-check for duplicate emp_id (UNIQUE constraint will also fire,
  // but a friendly 409 beats a 500 from the driver).
  const existing = await repo.findEmployeeById(body.employee_id);
  if (existing) {
    throw errors.conflict('Employee with that ID already exists', { field: 'employee_id' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await repo.insertEmployee(conn, { ...body, actor_employee_id: actor.employeeId });
    await repo.writeAudit(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      action: 'EMPLOYEE_CREATED',
      employeeId: body.employee_id,
      ipAddress, userAgent,
      details: {
        full_name: body.full_name,
        designation: body.designation,
        division_id: body.division_id,
      },
    });
    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    // MySQL duplicate-key on EMM_ID (PK) → 409 friendly
    if (err && err.code === 'ER_DUP_ENTRY') {
      throw errors.conflict('Employee with that ID already exists', { field: 'employee_id' });
    }
    throw err;
  } finally {
    conn.release();
  }

  return { employee_id: body.employee_id };
}

// ────────────────────────────────────────────────────────────────────
//  UPDATE
// ────────────────────────────────────────────────────────────────────
async function updateEmployee({ employeeId, body, actor, ipAddress, userAgent }) {
  const existing = await repo.findEmployeeById(employeeId);
  if (!existing) throw errors.notFound(`Employee ${employeeId} not found`);

  if (Object.keys(body).length === 0) {
    throw errors.badRequest('No fields to update');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await repo.updateEmployee(conn, employeeId, body, actor.employeeId);
    await repo.writeAudit(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      action: 'EMPLOYEE_UPDATED',
      employeeId,
      ipAddress, userAgent,
      details: { fields: Object.keys(body) },
    });
    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
  return { employee_id: employeeId };
}

// ────────────────────────────────────────────────────────────────────
//  SOFT-DELETE  (I-5)
// ────────────────────────────────────────────────────────────────────
async function softDeleteEmployee({ employeeId, actor, ipAddress, userAgent }) {
  const existing = await repo.findEmployeeById(employeeId);
  if (!existing) throw errors.notFound(`Employee ${employeeId} not found`);

  // I-5: cannot soft-delete if an ACTIVE user row exists
  sm.guardEmployeeSoftDelete({
    employeeHasUserRow:    existing.user_id != null,
    employeeUserIsActive:  existing.user_id != null && existing.user_is_active === 1,
  });

  if (existing.is_active === 0) {
    throw errors.conflict('Employee is already soft-deleted', { code: 'NO_CHANGE' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await repo.softDeleteEmployee(conn, employeeId, actor.employeeId);
    await repo.writeAudit(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      action: 'EMPLOYEE_SOFT_DELETED',
      employeeId,
      ipAddress, userAgent,
      details: {},
    });
    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
  return { employee_id: employeeId, is_active: false };
}

// ────────────────────────────────────────────────────────────────────
//  CREATE ACCOUNT (employee → user)
// ────────────────────────────────────────────────────────────────────
/**
 * Create a users row for an existing employee.
 * Returns { user_id, employee_id, role, initial_password } — the password
 * is the only piece of info that is NOT recoverable from the DB; SA copies
 * it once and shares offline (Q-1 locked).
 */
async function createAccount({ employeeId, role, actor, ipAddress, userAgent }) {
  const employee = await repo.findEmployeeById(employeeId);
  if (!employee) throw errors.notFound(`Employee ${employeeId} not found`);

  // Can't create an account for a soft-deleted employee.
  if (employee.is_active === 0) {
    throw errors.conflict('Cannot create account for a soft-deleted employee');
  }

  // Already has one?
  if (employee.user_id) {
    throw errors.conflict('Employee already has a user account', { code: 'HAS_ACCOUNT' });
  }

  const initialPassword = generateInitialPassword();
  const passwordHash = await bcrypt.hash(initialPassword, 10);

  const conn = await pool.getConnection();
  let newUserId;
  try {
    await conn.beginTransaction();

    newUserId = await adminUsersRepo.insertUser(conn, {
      employee_id: employeeId,
      password_hash: passwordHash,
      role_code: role,
      actor_employee_id: actor.employeeId,
    });

    await adminUsersRepo.appendHistory(conn, {
      userId: newUserId,
      fromRole: null,
      toRole: role,
      fromActive: null,
      toActive: true,
      action: 'CREATE',
      reason: null,
      actorUserId: actor.userId,
    });

    await repo.writeAudit(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      action: 'USER_ACCOUNT_CREATED',
      employeeId,
      ipAddress, userAgent,
      details: { role, user_id: newUserId },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    if (err && err.code === 'ER_DUP_ENTRY') {
      throw errors.conflict('Employee already has a user account', { code: 'HAS_ACCOUNT' });
    }
    throw err;
  } finally {
    conn.release();
  }

  return {
    user_id: newUserId,
    employee_id: employeeId,
    role,
    initial_password: initialPassword,  // ★ shown ONCE to SA — not stored
  };
}

module.exports = {
  listEmployees,
  findEmployee,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
  createAccount,
};
