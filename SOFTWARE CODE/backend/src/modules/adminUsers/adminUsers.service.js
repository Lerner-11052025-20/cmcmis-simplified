// ============================================================================
// src/modules/adminUsers/adminUsers.service.js  —  Business logic
// ----------------------------------------------------------------------------
// Five service functions:
//   listUsers(params)                            — paginated read
//   findUser(userId)                             — detail read
//   changeRole({ targetId, newRole, reason })    — guarded transactional write
//   activateUser({ targetId, reason })           — guarded transactional write
//   deactivateUser({ targetId, reason })         — guarded transactional write
//   forceLogout({ targetId, reason })            — bumps token_version only
//   listHistory(userId)                          — append-only timeline read
//
// SECURITY ENVELOPE (every write):
//   1. State-machine guard (pure function) — throws 409 on invariant violation.
//   2. BEGIN transaction.
//   3. UPDATE the canonical table (user_roles or users).
//   4. bumpTokenVersion — server-side increment, race-free.
//   5. appendHistory — one row per transition (Doctrine 6).
//   6. writeAudit — one row in audit_log (Doctrine 6).
//   7. COMMIT.
//   8. tokenVersionCache.invalidate(targetId) — eager forced cache miss.
//
//   If step 1 throws, NOTHING happens server-side — clean 409 to client.
//   If steps 3-6 throw, the transaction rolls back. Cache is NOT invalidated.
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const pool = require('../../config/db');
const repo = require('./adminUsers.repo');
const sm = require('./adminUsers.stateMachine');
const tokenVersionCache = require('../../utils/tokenVersionCache');
const { errors } = require('../../middleware/errorHandler');
const { normalizeLaneScopes } = require('../../utils/lanes');

// ────────────────────────────────────────────────────────────────────
//  LIST
// ────────────────────────────────────────────────────────────────────
async function listUsers(params) {
  const { rows, total } = await repo.listUsers(params);

  const items = rows.map((r) => ({
    id:              r.id,
    employee_id:     r.employee_id,
    full_name:       r.full_name,
    designation:     r.designation,
    email:           r.email,
    division_id:     r.division_id,
    division_code:   r.division_code,
    division_name:   r.division_name,
    role:            r.role,
    lane_scopes:     normalizeLaneScopes(r.role, r.lane_scopes),
    is_active:       !!r.is_active,
    is_locked:       !!r.is_locked,
    last_login_at:   r.last_login_at ? dayjs(r.last_login_at).format('YYYY-MM-DD HH:mm') : null,
    created_at:      r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD') : null,
    deactivated_at:  r.deactivated_at ? dayjs(r.deactivated_at).format('YYYY-MM-DD HH:mm') : null,
    token_version:   r.token_version,
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
      role: params.role || null,
      is_active: params.is_active ?? null,
      division_id: params.division_id || null,
      sort: params.sort,
    },
  };
}

// ────────────────────────────────────────────────────────────────────
//  FIND ONE
// ────────────────────────────────────────────────────────────────────
async function findUser(userId) {
  const row = await repo.findUserById(userId);
  if (!row) return null;
  return {
    id:              row.id,
    employee_id:     row.employee_id,
    full_name:       row.full_name,
    designation:     row.designation,
    email:           row.email,
    division_id:     row.division_id,
    division_code:   row.division_code,
    division_name:   row.division_name,
    role:            row.role,
    lane_scopes:     normalizeLaneScopes(row.role, row.lane_scopes),
    is_active:       !!row.is_active,
    is_locked:       !!row.is_locked,
    last_login_at:   row.last_login_at ? dayjs(row.last_login_at).format('YYYY-MM-DD HH:mm:ss') : null,
    created_at:      row.created_at ? dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss') : null,
    deactivated_at:  row.deactivated_at ? dayjs(row.deactivated_at).format('YYYY-MM-DD HH:mm:ss') : null,
    deactivation_reason: row.deactivation_reason,
    token_version:   row.token_version,
  };
}

// ────────────────────────────────────────────────────────────────────
//  CHANGE ROLE
// ────────────────────────────────────────────────────────────────────
async function changeRole({ targetUserId, newRole, reason, actor, ipAddress, userAgent }) {
  // 1) Snapshot reads (outside the transaction — these only inform the
  //    state-machine guard, which is pure)
  const target = await repo.findUserById(targetUserId);
  if (!target) throw errors.notFound(`User ${targetUserId} not found`);

  const activeSaCount = await repo.countActiveSuperAdmins();
  const targetIsLastActiveSA = (
    target.role === 'SUPER_ADMIN' && target.is_active === 1 && activeSaCount <= 1
  );

  // 2) State-machine guard — throws 409 with structured code on violation
  sm.guardRoleChange({
    actorUserId:                 actor.userId,
    targetUserId,
    targetCurrentRole:           target.role,
    targetNewRole:               newRole,
    targetIsLastActiveSuperAdmin:targetIsLastActiveSA,
    targetCurrentlyActive:       target.is_active === 1,
  });

  // 3) Transaction
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await repo.changeUserRole(conn, targetUserId, newRole, actor.employeeId);
    await repo.bumpTokenVersion(conn, targetUserId, actor.employeeId);

    await repo.appendHistory(conn, {
      userId: targetUserId,
      fromRole: target.role,
      toRole: newRole,
      fromActive: !!target.is_active,
      toActive: !!target.is_active,
      action: 'CHANGE_ROLE',
      reason: (reason && reason.trim()) ? reason.trim() : null,
      actorUserId: actor.userId,
    });

    await repo.writeAudit(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      action: 'USER_ROLE_CHANGED',
      userId: targetUserId,
      ipAddress, userAgent,
      details: {
        from: target.role,
        to: newRole,
        target_employee_id: target.employee_id,
        reason: reason || null,
      },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }

  // 4) Cache invalidation — outside the transaction (in-memory only)
  tokenVersionCache.invalidate(targetUserId);

  return { id: targetUserId, role: newRole };
}

// ────────────────────────────────────────────────────────────────────
//  DEACTIVATE
// ────────────────────────────────────────────────────────────────────
async function deactivateUser({ targetUserId, reason, actor, ipAddress, userAgent }) {
  const target = await repo.findUserById(targetUserId);
  if (!target) throw errors.notFound(`User ${targetUserId} not found`);

  const activeSaCount = await repo.countActiveSuperAdmins();
  const targetIsLastActiveSA = (
    target.role === 'SUPER_ADMIN' && target.is_active === 1 && activeSaCount <= 1
  );

  sm.guardDeactivate({
    actorUserId:                 actor.userId,
    targetUserId,
    targetCurrentRole:           target.role,
    targetCurrentlyActive:       target.is_active === 1,
    targetIsLastActiveSuperAdmin:targetIsLastActiveSA,
  });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await repo.setActive(conn, targetUserId, false, {
      actorUserId: actor.userId,
      actorEmployeeId: actor.employeeId,
      reason,
    });
    await repo.bumpTokenVersion(conn, targetUserId, actor.employeeId);

    await repo.appendHistory(conn, {
      userId: targetUserId,
      fromRole: target.role,
      toRole: target.role,
      fromActive: true,
      toActive: false,
      action: 'DEACTIVATE',
      reason,
      actorUserId: actor.userId,
    });

    await repo.writeAudit(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      action: 'USER_DEACTIVATED',
      userId: targetUserId,
      ipAddress, userAgent,
      details: { target_employee_id: target.employee_id, reason },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }

  tokenVersionCache.invalidate(targetUserId);
  return { id: targetUserId, is_active: false };
}

// ────────────────────────────────────────────────────────────────────
//  ACTIVATE
// ────────────────────────────────────────────────────────────────────
async function activateUser({ targetUserId, reason, actor, ipAddress, userAgent }) {
  const target = await repo.findUserById(targetUserId);
  if (!target) throw errors.notFound(`User ${targetUserId} not found`);

  sm.guardActivate({ targetCurrentlyActive: target.is_active === 1 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await repo.setActive(conn, targetUserId, true, {
      actorUserId: actor.userId,
      actorEmployeeId: actor.employeeId,
      reason: reason || null,
    });
    await repo.bumpTokenVersion(conn, targetUserId, actor.employeeId);

    await repo.appendHistory(conn, {
      userId: targetUserId,
      fromRole: target.role,
      toRole: target.role,
      fromActive: false,
      toActive: true,
      action: 'ACTIVATE',
      reason: reason || null,
      actorUserId: actor.userId,
    });

    await repo.writeAudit(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      action: 'USER_ACTIVATED',
      userId: targetUserId,
      ipAddress, userAgent,
      details: { target_employee_id: target.employee_id, reason: reason || null },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }

  tokenVersionCache.invalidate(targetUserId);
  return { id: targetUserId, is_active: true };
}

// ────────────────────────────────────────────────────────────────────
//  FORCE LOGOUT  (bumps token_version, writes audit, no state change)
// ────────────────────────────────────────────────────────────────────
async function forceLogout({ targetUserId, reason, actor, ipAddress, userAgent }) {
  const target = await repo.findUserById(targetUserId);
  if (!target) throw errors.notFound(`User ${targetUserId} not found`);

  sm.guardForceLogout({ actorUserId: actor.userId, targetUserId });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await repo.bumpTokenVersion(conn, targetUserId, actor.employeeId);

    await repo.appendHistory(conn, {
      userId: targetUserId,
      fromRole: target.role,
      toRole: target.role,
      fromActive: !!target.is_active,
      toActive: !!target.is_active,
      action: 'FORCE_LOGOUT',
      reason: reason || null,
      actorUserId: actor.userId,
    });

    await repo.writeAudit(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      action: 'USER_FORCE_LOGOUT',
      userId: targetUserId,
      ipAddress, userAgent,
      details: { target_employee_id: target.employee_id, reason: reason || null },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }

  tokenVersionCache.invalidate(targetUserId);
  return { id: targetUserId, force_logged_out: true };
}

// ────────────────────────────────────────────────────────────────────
//  HISTORY
// ────────────────────────────────────────────────────────────────────
async function listHistory(userId, limit = 100) {
  const rows = await repo.listHistory(userId, limit);
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    from_role: r.from_role,
    to_role: r.to_role,
    from_active: !!r.from_active,
    to_active: !!r.to_active,
    action: r.action,
    reason: r.reason,
    actor_user_id: r.actor_user_id,
    created_at: dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss'),
  }));
}

module.exports = {
  listUsers,
  findUser,
  changeRole,
  activateUser,
  deactivateUser,
  forceLogout,
  listHistory,
};
