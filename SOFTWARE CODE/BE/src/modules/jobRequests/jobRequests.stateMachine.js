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
// LIFECYCLE (FINAL-DESC §8.1 + Phase 7 Slice 2 patches)
//
//   DRAFT       ─[submit]──>  SUBMITTED
//   SUBMITTED   ─[approve]─>  APPROVED   ◄── logical state (NOT in DB enum)
//   SUBMITTED   ─[reject]──>  REJECTED
//   APPROVED    ─[assign]──>  ASSIGNED
//   (ASSIGNED+ live on the Job Card state machine — Phase 9)
//
//   ⚠ APPROVED is a TRANSIENT logical state (decision D-7.2.3). The DB
//   enum `JR_MVP_STATUS` does NOT include APPROVED — the JR row jumps
//   SUBMITTED → ASSIGNED in one atomic Convert. The APPROVED step is
//   captured only in `job_request_status_history.to_status` (varchar),
//   giving us a full audit trail without the ADD-only doctrine violation
//   that ALTERing the enum would represent.
//
// SLICE OWNERSHIP
//   Phase 6 Slice 1: DRAFT → SUBMITTED
//   Phase 7 Slice 2: + SUBMITTED → APPROVED, APPROVED → ASSIGNED, SUBMITTED → REJECTED
//   Phase 9:         JC state-machine (ASSIGNED → IN_PROGRESS → COMPLETED → ...)
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
    // Phase 6 Slice 1 — owner-only self-submit. Same row stays put; only
    // the status flag flips, plus T&C metadata is captured.
    submit:  { to: 'SUBMITTED', perm: 'job_request:create',          actorMustBeOwner: true  },
    // Phase 9 — owner-only edit of a DRAFT body. NOT a state change (the
    // row stays DRAFT) but we model it here so the permission + ownership
    // checks pass through the same choke-point as transitions. The service
    // ignores the returned newState (it's identical to currentState).
    edit:    { to: 'DRAFT',     perm: 'job_request:create',          actorMustBeOwner: true  },
    // Phase 9 — owner-only cancel of a DRAFT. CANCELLED is a LOGICAL state
    // (decision D-9.11) — the row stays DRAFT but JR_CANCELLED_AT is set.
    // The list endpoint hides cancelled rows by default. History row gets
    // to_status='CANCELLED' (varchar column accepts the string).
    cancel:  { to: 'CANCELLED', perm: 'job_request:create',          actorMustBeOwner: true  },
  },
  SUBMITTED: {
    // Phase 7 Slice 2 — Lab In-Charge / Super Admin approves.
    // Final DB state will be ASSIGNED (via APPROVED → assign in the same
    // txn) — the service layer chains these two transitions.
    approve: { to: 'APPROVED',  perm: 'job_request:approve',         actorMustBeOwner: false },
    // Phase 7 Slice 2 — Lab In-Charge / Super Admin rejects with reason.
    reject:  { to: 'REJECTED',  perm: 'job_request:reject',          actorMustBeOwner: false },
  },
  // APPROVED is a logical state — the service layer calls transition('APPROVED','assign')
  // inside the same Convert transaction, immediately after approve. It is
  // NOT a persisted JR status; the JR row goes from SUBMITTED to ASSIGNED
  // in a single UPDATE. We model it in the table here so that the
  // permission gate for assign is enforced as a distinct check (different
  // permission code from approve — defence in depth).
  APPROVED: {
    assign:  { to: 'ASSIGNED',  perm: 'job_request:assign-engineer', actorMustBeOwner: false },
  },
  // Terminal-for-now states — no slice-2 transitions OUT of these.
  // REJECTED is terminal for Slice 2 (D-7.2.2, Q-3). The ASSIGNED-and-
  // beyond lifecycle lives on the Job Card state machine (Phase 9).
  ASSIGNED:  {},
  REJECTED:  {},
};

/**
 * Validate a transition request. Throws AppError(409|403) on failure.
 *
 * @param {string} currentState  one of the keys of ALLOWED
 * @param {string} action        e.g. 'submit', 'approve', 'reject', 'assign'
 * @param {Object} actor         { employeeId, role, permissions[] }
 * @param {Object} [opts]
 * @param {boolean} [opts.isOwner]  Whether the actor created the row
 * @returns {{ newState: string }}
 */
function transition(currentState, action, actor, { isOwner = false } = {}) {
  // 1) Find the rule. Unknown (state, action) means an illegal transition.
  //    A common cause is "client tried to convert a REJECTED JR" — that's
  //    a 409 CONFLICT, not a 400, because the request is well-formed but
  //    the resource is in the wrong state.
  const rule = ALLOWED[currentState]?.[action];
  if (!rule) {
    throw appError409Illegal(`Illegal transition: ${currentState} → ${action}`);
  }

  // 2) Ownership gate — only relevant for DRAFT→SUBMITTED right now.
  //    The Convert flow + Reject flow are ANY actor with the perm; they
  //    set actorMustBeOwner=false.
  if (rule.actorMustBeOwner && !isOwner) {
    throw errors.forbidden('Only the request owner can perform this action');
  }

  // 3) Permission gate — defence in depth (route already gated, but the
  //    state machine is the single choke-point so we re-check here).
  //    This is what saves us from a misconfigured route or a future bug
  //    that adds a new endpoint without the right authorize() middleware.
  if (!Array.isArray(actor.permissions) || !actor.permissions.includes(rule.perm)) {
    throw errors.forbidden(`Missing required permission: ${rule.perm}`);
  }

  return { newState: rule.to };
}

// Helper: 409 ILLEGAL_TRANSITION with a stable error code the FE can branch on.
function appError409Illegal(msg) {
  const e = errors.conflict(msg);
  e.code = 'ILLEGAL_TRANSITION';
  return e;
}

module.exports = { transition, ALLOWED };
