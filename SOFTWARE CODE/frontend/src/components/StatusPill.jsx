// ============================================================================
// src/components/StatusPill.jsx  —  Coloured status badge for JR / JC tables
// ----------------------------------------------------------------------------
// Maps a canonical status string to the right Tailwind pill classes.
// Used by JobRequestList and JobCardList. Keep the colour map in this
// one file so a design change is a one-touch update.
//
// Status colour map (uses the existing 11-token Tailwind palette + default
// shades — NO new hex literals per R12):
//   DRAFT               → slate    (waiting on the submitter)
//   SUBMITTED           → amber    (pending review)
//   ASSIGNED / Approved → violet   (LIC approved + engineer assigned)
//   IN_PROGRESS         → blue     (engineer working)
//   COMPLETED           → green    (engineer done, awaiting verification)
//   VERIFIED_CLOSED     → emerald  (LIC verified, terminal-good)
//   REJECTED            → red      (terminal-bad)
//   REOPENED            → orange   (sent back to engineer)
//
// Unknown values render as slate so an unexpected status from the BE
// surfaces visually rather than crashing the table.
// ============================================================================

import clsx from 'clsx';

const STYLE = {
  DRAFT:           { cls: 'bg-slate-100   text-slate-700',   label: 'Draft' },
  SUBMITTED:       { cls: 'bg-amber-100   text-amber-700',   label: 'Pending' },
  ASSIGNED:        { cls: 'bg-violet-100  text-violet-700',  label: 'Approved' },
  IN_PROGRESS:     { cls: 'bg-blue-100    text-blue-700',    label: 'In Progress' },
  COMPLETED:       { cls: 'bg-green-100   text-green-700',   label: 'Completed' },
  VERIFIED_CLOSED: { cls: 'bg-emerald-100 text-emerald-700', label: 'Verified' },
  REJECTED:        { cls: 'bg-red-100     text-red-700',     label: 'Rejected' },
  REOPENED:        { cls: 'bg-orange-100  text-orange-700',  label: 'Reopened' },
  CANCELLED:       { cls: 'bg-slate-100   text-slate-700',   label: 'Cancelled' },
};

const PILL_BASE =
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap';

/**
 * @param {Object} props
 * @param {string} props.status  Canonical status string (any of STYLE keys)
 */
export function StatusPill({ status }) {
  const s = STYLE[status] || STYLE.DRAFT;
  // Fall back to the raw status if we don't know a friendly label for it —
  // beats silently rendering "Draft" for an unknown value.
  const label = STYLE[status] ? s.label : status;
  return <span className={clsx(PILL_BASE, s.cls)}>{label}</span>;
}
