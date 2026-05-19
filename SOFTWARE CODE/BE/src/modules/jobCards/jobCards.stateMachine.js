// ============================================================================
// src/modules/jobCards/jobCards.stateMachine.js  —  Single choke-point
// ----------------------------------------------------------------------------
// PURPOSE
//   The ONLY blessed way to transition a Job Card's JM_MVP_STATUS.
//   Every state-changing service path funnels `transition(currentState,
//   action, actor, opts)` through this module BEFORE writing to the DB.
//
//   Per FINAL-DESC §8.3 ("single choke-point implementation rule") +
//   inherited doctrine 3, never set JM_MVP_STATUS from anywhere else.
//
// LIFECYCLE (Phase 9 LOCKED)
//
//   ASSIGNED ─[start-work]──> IN_PROGRESS ─[mark-complete]──> COMPLETED ─[verify-close]──> VERIFIED_CLOSED
//                                  ↑                              │                              │
//                                  ├──── reopen (LIC/SA) ─────────┘                              │
//                                  └──── reopen (LIC/SA) ─────────────────────────────────────────┘
//
// OWNERSHIP RULES
//   • ASSIGNED / IN_PROGRESS transitions (start, save, complete) require
//     the actor be the JC's assigned engineer OR LIC/SA.
//   • COMPLETED transitions (verify-close, reopen) require LIC/SA.
//   • VERIFIED_CLOSED can only be reopened by LIC/SA.
//
// AUDIT PAIRING (inherited doctrine 6)
//   Every successful transition writes ONE audit_log row + ONE
//   job_card_status_history row in the SAME conn.beginTransaction().
//   The service layer owns this pairing — this module only validates.
// ============================================================================

'use strict';

const { errors } = require('../../middleware/errorHandler');

/**
 * ALLOWED transitions table. Same shape as jobRequests.stateMachine
 * for consistency.
 *
 *   to:                       next state name
 *   perm:                     permission code the actor MUST hold
 *   actorMustBeOwnerOrLicSa:  true if engineer (own assignment) OR LIC/SA
 *                             can perform; false if LIC/SA-only
 *   requiresReason:           true → the service must pass a reason ≥20 chars
 */
const ALLOWED = {
  ASSIGNED: {
    'start-work':  { to: 'IN_PROGRESS',     perm: 'job_card:start-work',   actorMustBeOwnerOrLicSa: true,  requiresReason: false },
  },
  IN_PROGRESS: {
    // 'save' is a no-op transition — same state in/out. We keep it in
    // the table so PATCH /:id (save tab) flows through the same choke-
    // point and gets the perm + ownership re-check for free.
    save:          { to: 'IN_PROGRESS',     perm: 'job_card:update-tasks', actorMustBeOwnerOrLicSa: true,  requiresReason: false },
    'mark-complete': { to: 'COMPLETED',    perm: 'job_card:complete',     actorMustBeOwnerOrLicSa: true,  requiresReason: false },
  },
  COMPLETED: {
    'verify-close': { to: 'VERIFIED_CLOSED', perm: 'job_card:verify-close', actorMustBeOwnerOrLicSa: false, requiresReason: false },
    reopen:        { to: 'IN_PROGRESS',     perm: 'job_card:reopen',       actorMustBeOwnerOrLicSa: false, requiresReason: true  },
  },
  VERIFIED_CLOSED: {
    reopen:        { to: 'IN_PROGRESS',     perm: 'job_card:reopen',       actorMustBeOwnerOrLicSa: false, requiresReason: true  },
  },
  // REOPENED is in the DB enum (Phase 3 seed) but Phase 9 reopen sets
  // status=IN_PROGRESS, not REOPENED — reopen_count + last_reopened_at
  // capture the "this card was reopened" signal. The REOPENED enum value
  // stays available for a future hypothetical pure-reopen-without-resume
  // workflow; for now we never use it.
  REOPENED: {},
};

// Roles that bypass the engineer-ownership constraint.
const LIC_SA_ROLES = new Set(['LAB_IN_CHARGE', 'SUPER_ADMIN']);

/**
 * Validate a JC transition request. Throws AppError(409|403|400) on failure.
 *
 * @param {string} currentState  one of the keys of ALLOWED
 * @param {string} action        e.g. 'start-work', 'mark-complete', 'verify-close', 'reopen'
 * @param {Object} actor         { employeeId, role, permissions[] }
 * @param {Object} opts
 * @param {boolean} [opts.isOwnEngineer]  Actor is the JC's assigned engineer
 * @param {string}  [opts.reason]         Reopen reason — required for 'reopen'
 * @returns {{ newState: string }}
 */
function transition(currentState, action, actor, { isOwnEngineer = false, reason = null } = {}) {
  // 1) Find the rule. (state, action) not in the table = illegal.
  const rule = ALLOWED[currentState]?.[action];
  if (!rule) {
    throw appError409Illegal(`Illegal transition: ${currentState} → ${action}`);
  }

  // 2) Permission gate — defence in depth (route already gated, but the
  //    state machine is the choke-point so we re-verify here).
  if (!Array.isArray(actor.permissions) || !actor.permissions.includes(rule.perm)) {
    throw errors.forbidden(`Missing required permission: ${rule.perm}`);
  }

  // 3) Ownership gate.
  //    actorMustBeOwnerOrLicSa=true → engineer (own JC) OR LIC/SA passes.
  //    actorMustBeOwnerOrLicSa=false → ONLY LIC/SA passes.
  const isLicOrSa = LIC_SA_ROLES.has(actor.role);
  if (rule.actorMustBeOwnerOrLicSa) {
    if (!isOwnEngineer && !isLicOrSa) {
      throw errors.forbidden(
        'Only the assigned engineer or Lab In-Charge / Super Admin can perform this action',
      );
    }
  } else {
    // Verify-close + Reopen — LIC/SA only.
    if (!isLicOrSa) {
      throw errors.forbidden('Only Lab In-Charge or Super Admin can perform this action');
    }
  }

  // 4) Reason gate (only for reopen).
  if (rule.requiresReason) {
    const trimmed = (reason || '').trim();
    if (trimmed.length < 20) {
      throw errors.badRequest('Reopen reason must be at least 20 characters', { field: 'reason' });
    }
    if (trimmed.length > 1000) {
      throw errors.badRequest('Reopen reason cannot exceed 1000 characters', { field: 'reason' });
    }
  }

  return { newState: rule.to };
}

// 409 ILLEGAL_TRANSITION helper — same pattern as JR state machine.
function appError409Illegal(msg) {
  const e = errors.conflict(msg);
  e.code = 'ILLEGAL_TRANSITION';
  return e;
}

module.exports = { transition, ALLOWED, LIC_SA_ROLES };
