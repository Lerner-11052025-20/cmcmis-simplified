// ============================================================================
// src/modules/adminUsers/adminUsers.stateMachine.js  —  Invariant enforcer
// ----------------------------------------------------------------------------
// SINGLE CHOKE-POINT (Doctrine 3).
//   Every role/status mutation in this module funnels through one of the
//   four guard functions exported here. They are PURE — no DB calls, no
//   side effects — so they can be unit-tested with synthetic inputs and
//   reused by the FE for live button-disable logic.
//
// THE FIVE SUPER-ADMIN INVARIANTS (D-7.3)
//   I-1  Cannot demote the LAST active SUPER_ADMIN.       → LAST_SUPER_ADMIN
//   I-2  Cannot deactivate the LAST active SUPER_ADMIN.   → LAST_SUPER_ADMIN
//   I-3  Cannot change YOUR OWN role.                     → SELF_MODIFICATION_FORBIDDEN
//   I-4  Cannot deactivate YOURSELF.                      → SELF_DEACTIVATE_FORBIDDEN
//   I-5  Cannot soft-delete an employee with ACTIVE user. → EMPLOYEE_HAS_ACTIVE_USER
//
// CONTRACT
//   Each guard returns `void` on success and THROWS an AppError(409) with
//   a structured details.code on violation. Callers (the service) run the
//   relevant guard BEFORE opening the DB transaction. If a guard throws,
//   no audit row is written, no token_version is bumped — the request is
//   reflected as a 409 to the client and nothing else happens.
//
// WHY PURE FUNCTIONS
//   Putting the DB count-of-active-SAs query inside the guard would
//   conflate two concerns: "is the action legal" and "how do we read the
//   current state". Separating them means:
//     • Guards are deterministic given their inputs — trivial to test.
//     • Service can decide where the state snapshot comes from (a fresh
//       SELECT vs an in-memory snapshot).
//     • FE can reuse the same logic for button-disable UX.
// ============================================================================

'use strict';

const { errors } = require('../../middleware/errorHandler');

// ── Error builders — keep code strings centralised ───────────────────
function err409(code, message) {
  const e = errors.conflict(message);
  e.code = code;
  e.details = { code };
  return e;
}

// ── I-1 / I-2 helper — "would this action leave zero active SAs?" ────
/**
 * @param {{
 *   isLastActiveSuperAdmin: boolean,
 *   currentlySuperAdmin:    boolean,
 *   currentlyActive:        boolean,
 * }} snapshot
 * @param {{ targetRole?: string, targetActive?: boolean }} change
 */
function wouldLeaveZeroActiveSuperAdmins(snapshot, change) {
  if (!snapshot.isLastActiveSuperAdmin) return false;
  // Currently: the target IS the last active SA. Any change that removes
  // SA-ness OR removes activeness leaves zero active SAs.
  const stillSuperAdmin = (change.targetRole !== undefined)
    ? (change.targetRole === 'SUPER_ADMIN')
    : snapshot.currentlySuperAdmin;
  const stillActive = (change.targetActive !== undefined)
    ? change.targetActive === true
    : snapshot.currentlyActive;
  return !(stillSuperAdmin && stillActive);
}

// ── Guard 1 — Role change (I-1 + I-3) ────────────────────────────────
/**
 * @param {Object} args
 * @param {number} args.actorUserId       The Super Admin performing the change
 * @param {number} args.targetUserId      The user being changed
 * @param {string} args.targetCurrentRole roles.role_code as of NOW
 * @param {string} args.targetNewRole     roles.role_code requested
 * @param {boolean} args.targetIsLastActiveSuperAdmin
 * @param {boolean} args.targetCurrentlyActive
 */
function guardRoleChange({
  actorUserId, targetUserId,
  targetCurrentRole, targetNewRole,
  targetIsLastActiveSuperAdmin, targetCurrentlyActive,
}) {
  // I-3 — self
  if (actorUserId === targetUserId) {
    throw err409('SELF_MODIFICATION_FORBIDDEN',
      'You cannot change your own role. Ask another Super Admin.');
  }

  // No-op guard — refuse to write a history row for a non-change.
  if (targetCurrentRole === targetNewRole) {
    throw err409('NO_CHANGE',
      `User is already ${targetNewRole}. Nothing to do.`);
  }

  // I-1 — last SA invariant
  const wouldZero = wouldLeaveZeroActiveSuperAdmins(
    {
      isLastActiveSuperAdmin: targetIsLastActiveSuperAdmin,
      currentlySuperAdmin:    targetCurrentRole === 'SUPER_ADMIN',
      currentlyActive:        targetCurrentlyActive,
    },
    { targetRole: targetNewRole },
  );
  if (wouldZero) {
    throw err409('LAST_SUPER_ADMIN',
      'Cannot demote the last active Super Admin. Promote someone else first.');
  }
}

// ── Guard 2 — Deactivate (I-2 + I-4) ─────────────────────────────────
function guardDeactivate({
  actorUserId, targetUserId,
  targetCurrentRole, targetCurrentlyActive,
  targetIsLastActiveSuperAdmin,
}) {
  // I-4 — self
  if (actorUserId === targetUserId) {
    throw err409('SELF_DEACTIVATE_FORBIDDEN',
      'You cannot deactivate your own account. Ask another Super Admin.');
  }
  // No-op
  if (targetCurrentlyActive === false) {
    throw err409('NO_CHANGE', 'User is already deactivated.');
  }
  // I-2 — last active SA
  const wouldZero = wouldLeaveZeroActiveSuperAdmins(
    {
      isLastActiveSuperAdmin: targetIsLastActiveSuperAdmin,
      currentlySuperAdmin:    targetCurrentRole === 'SUPER_ADMIN',
      currentlyActive:        true,
    },
    { targetActive: false },
  );
  if (wouldZero) {
    throw err409('LAST_SUPER_ADMIN',
      'Cannot deactivate the last active Super Admin.');
  }
}

// ── Guard 3 — Activate (no invariant violation possible) ─────────────
function guardActivate({ targetCurrentlyActive }) {
  if (targetCurrentlyActive === true) {
    throw err409('NO_CHANGE', 'User is already active.');
  }
  // Activate is benign — re-enabling someone never breaks an invariant.
  // (Even reactivating an SA is fine: it just increases the count.)
}

// ── Guard 4 — Force-logout ───────────────────────────────────────────
function guardForceLogout({ actorUserId, targetUserId }) {
  // Self force-logout IS allowed — useful "log me out of every device".
  // But we still pre-empt no-op + suspicious patterns later if needed.
  if (typeof actorUserId !== 'number' || typeof targetUserId !== 'number') {
    throw err409('BAD_REQUEST', 'Missing actor or target id');
  }
  // No other invariants — force-logout bumps token_version, doesn't touch
  // role or is_active, so I-1..I-5 are all unaffected.
}

// ── Guard 5 — Employee soft-delete (I-5) ─────────────────────────────
/**
 * Called from employees.service before issuing the soft-delete UPDATE.
 *
 * @param {Object} args
 * @param {boolean} args.employeeHasUserRow    Does a users row exist for this emp_id?
 * @param {boolean} args.employeeUserIsActive  Is that users row is_active=1?
 */
function guardEmployeeSoftDelete({ employeeHasUserRow, employeeUserIsActive }) {
  if (employeeHasUserRow && employeeUserIsActive) {
    throw err409('EMPLOYEE_HAS_ACTIVE_USER',
      'Deactivate the user account before soft-deleting the employee record.');
  }
}

module.exports = {
  guardRoleChange,
  guardDeactivate,
  guardActivate,
  guardForceLogout,
  guardEmployeeSoftDelete,
  // exposed for tests / FE reuse
  wouldLeaveZeroActiveSuperAdmins,
};
