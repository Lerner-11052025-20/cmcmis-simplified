// ============================================================================
// src/modules/jobRequests/jobRequests.stateMachine.js  —  Single choke-point
// ----------------------------------------------------------------------------
// PURPOSE
//   The ONLY blessed way to transition a Job Request between states.
//   `transition(currentState, action, actor, opts)` returns
//   { newState } on success or throws an AppError. The service layer
//   calls this BEFORE writing to the DB so an illegal action is rejected
//   before any side effect occurs.
//
//   Per FINAL-DESC §8.3 ("single choke-point implementation rule") every
//   state-changing path must funnel through this function — never set
//   JR_MVP_STATUS from anywhere else.
//
// LIFECYCLE (FINAL-DESC §8.1)
//   DRAFT       ─[submit]──>  SUBMITTED
//   SUBMITTED   ─[approve]─>  ASSIGNED
//   SUBMITTED   ─[reject]──>  REJECTED
//   (ASSIGNED+ live on the Job Card state machine — out of scope here)
//
// Slice 1 implements only DRAFT→SUBMITTED. Approve / reject are wired now
// (table + actor permission check) but never invoked by any controller
// in slice 1. Locking them in code prevents shape drift in later slices.
// ============================================================================

'use strict';

const { errors } = require('../../middleware/errorHandler');

/**
 * ALLOWED transitions table — keyed by (state, action). Each entry says:
 *   to:               the next state on success
 *   perm:             the permission code the actor must hold
 *   actorMustBeOwner: only the submitter can perform this (DRAFT→SUBMITTED)
 */
const ALLOWED = {
  DRAFT: {
    submit:  { to: 'SUBMITTED', perm: 'job_request:create',          actorMustBeOwner: true  },
  },
  SUBMITTED: {
    approve: { to: 'ASSIGNED',  perm: 'job_request:approve',         actorMustBeOwner: false },
    reject:  { to: 'REJECTED',  perm: 'job_request:reject',          actorMustBeOwner: false },
  },
  // Terminal-for-now states — no slice-1 transitions OUT of these. The
  // ASSIGNED-and-beyond lifecycle lives on the Job Card state machine.
  ASSIGNED:  {},
  REJECTED:  {},
};

/**
 * Validate a transition request. Throws AppError(409|403) on failure.
 *
 * @param {string} currentState  one of the keys of ALLOWED
 * @param {string} action        e.g. 'submit', 'approve', 'reject'
 * @param {Object} actor         { employeeId, role, permissions[] }
 * @param {Object} [opts]
 * @param {boolean} [opts.isOwner]  Whether the actor created the row
 * @returns {{ newState: string }}
 */
function transition(currentState, action, actor, { isOwner = false } = {}) {
  // 1) Find the rule. Unknown (state, action) means an illegal transition.
  const rule = ALLOWED[currentState]?.[action];
  if (!rule) {
    throw new AppError409(`Illegal transition: ${currentState} → ${action}`);
  }

  // 2) Ownership gate — DRAFT→SUBMITTED is creator-only.
  if (rule.actorMustBeOwner && !isOwner) {
    throw errors.forbidden('Only the request owner can perform this action');
  }

  // 3) Permission gate — defence in depth (route already gated, but the
  //    state machine is the single choke-point so we re-check here).
  if (!Array.isArray(actor.permissions) || !actor.permissions.includes(rule.perm)) {
    throw errors.forbidden(`Missing required permission: ${rule.perm}`);
  }

  return { newState: rule.to };
}

// Helper: 409 with a structured `details` slot.
function AppError409(msg) {
  const e = errors.conflict(msg);
  e.code = 'ILLEGAL_TRANSITION';
  return e;
}

module.exports = { transition, ALLOWED };
