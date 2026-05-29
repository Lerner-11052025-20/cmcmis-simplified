// ============================================================================
// src/modules/schedule/schedule.stateMachine.js  —  Status transition rules
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// THE SCHEDULE LIFECYCLE
//
//                     ┌────────────┐
//   (create)──────────▶│  PLANNED   │──schedule───▶┌────────────┐
//                     └─────┬──────┘               │ SCHEDULED  │
//                           │                      └─────┬──────┘
//                           │                            │
//                           │     (scheduled_date passes)│
//                           │                            ▼
//                           │                       ┌────────────┐
//                           │                       │    DUE     │
//                           │                       └─────┬──────┘
//                           │                             │
//                           ▼                             ▼
//                     ┌──────────────────────────────────────────┐
//                     │              COMPLETED                   │
//                     └──────────────────────────────────────────┘
//
//   Any state → CANCELLED (with reason)
//
// DOCTRINE
//   • The "DUE" state is BOTH persistable AND derivable. A row becomes DUE
//     automatically when scheduled_date <= today AND status ∈ {PLANNED,
//     SCHEDULED}. The service stamps it on read OR on the next transition
//     so the calendar/list always shows the truthful badge.
//   • COMPLETED + CANCELLED are TERMINAL — no transitions out (rework =
//     create a new schedule).
//   • The state machine ONLY knows transitions. Permission gates live on
//     the routes (authorize('schedule:update' / 'schedule:delete')).
// ============================================================================

'use strict';

const { errors } = require('../../middleware/errorHandler');

// Allowed transitions table — { from: [allowedTos…] }. CANCELLED is reachable
// from any non-terminal state (added separately below for clarity).
const TRANSITIONS = Object.freeze({
  PLANNED:   ['SCHEDULED', 'DUE', 'COMPLETED', 'CANCELLED'],
  SCHEDULED: ['DUE', 'COMPLETED', 'CANCELLED'],
  DUE:       ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
  // Terminal states — empty array.
  COMPLETED: [],
  CANCELLED: [],
});


/**
 * Compute the legal "derived" status for a row at read time. If the row is
 * still in PLANNED/SCHEDULED AND its scheduled_date is in the past, the
 * effective status is DUE. The service uses this to:
 *   1. Render the correct badge in list/calendar payloads.
 *   2. Lazily flip the stored status when the row is next touched.
 *
 * @param {string}       persistedStatus   The status column value.
 * @param {string|Date}  scheduledDate     YYYY-MM-DD or Date.
 * @param {string|Date}  [now]             For deterministic tests.
 * @returns {string}                       Effective status.
 */
function deriveStatus(persistedStatus, scheduledDate, now = new Date()) {
  if (persistedStatus !== 'PLANNED' && persistedStatus !== 'SCHEDULED') {
    return persistedStatus; // DUE / COMPLETED / CANCELLED — no change.
  }
  // Compare dates by YYYY-MM-DD lexicographically — both sides are stable.
  const today = (typeof now === 'string' ? now : toIsoDate(now));
  const sched = typeof scheduledDate === 'string'
    ? scheduledDate.slice(0, 10)
    : toIsoDate(scheduledDate);
  return sched <= today ? 'DUE' : persistedStatus;
}

function toIsoDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


/**
 * Run a transition. Throws 409 CONFLICT on illegal transition. The caller
 * has already verified the schedule exists + the actor holds the right
 * permission — this function does NOT inspect req.user.
 *
 * @param {string} from   Persisted status (already DUE-derived if applicable)
 * @param {string} to     Desired target status
 * @returns {{ from: string, to: string }}
 */
function transition(from, to) {
  if (!TRANSITIONS[from]) {
    throw errors.conflict(`Unknown source status: ${from}`);
  }
  if (from === to) {
    // No-op transition — treat as a soft conflict so the caller can
    // distinguish "already there" from "illegal".
    throw errors.conflict(`Schedule is already in status ${from}`);
  }
  if (!TRANSITIONS[from].includes(to)) {
    throw errors.conflict(
      `Illegal transition: ${from} → ${to}`,
      { allowed: TRANSITIONS[from] },
    );
  }
  return { from, to };
}


module.exports = {
  TRANSITIONS,
  deriveStatus,
  transition,
};
