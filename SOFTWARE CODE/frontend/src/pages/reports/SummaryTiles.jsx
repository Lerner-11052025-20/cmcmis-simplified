// ============================================================================
// src/pages/reports/SummaryTiles.jsx  —  Section-2 summary tiles
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Renders 3..5 KPI tiles above the detailed table. Driven by the
// summary object the BE returns for each report. The dictionary below
// maps the BE field name → human label + (optional) subtitle.
// ============================================================================

const LABELS = {
  // Calibration Due (R1)
  total:           ['Total Equipment',  'in scope'],
  due_soon:        ['Due Soon',         'within window'],
  overdue:         ['Overdue',          'today > due date'],
  valid:           ['Valid',            'beyond alert window'],

  // Pending Jobs (R2)
  total_pending:   ['Total Pending',    'open requests'],
  new_requests:    ['New Requests',     'in range'],
  assigned:        ['Assigned',         'engineer present'],
  unassigned:      ['Unassigned',       'no engineer'],

  // Equipment Utilization (R3)
  total_equipment: ['Total Equipment',  'COUNT(EQM_ID)'],
  used_equipment:  ['Used Equipment',   'with JCs in window'],
  total_job_cards: ['Total Job Cards',  'aggregate count'],
  inactive_low_use:['Inactive / Low',   '0 JCs in window'],

  // Engineer Summary (R4)
  engineers:       ['Engineers',        'distinct assigned'],
  assigned_jcs:    ['Assigned JCs',     'total assigned'],
  completed:       ['Completed',        'final state'],
  in_progress:     ['In Progress',      'being worked'],
  verified_closed: ['Verified/Closed',  'final state'],

  // Job Card / Request shared
  open_assigned:   ['Open / Assigned',  'awaiting start'],
  reopened:        ['Reopened',         'returned for rework'],
  draft:           ['Draft',            'not yet submitted'],
  submitted:       ['Submitted',        'awaiting approval'],
  rejected:        ['Rejected',         'terminal'],
};

export function SummaryTiles({ summary, keys }) {
  if (!summary) return null;
  // If specific keys are passed in, render them in order; else render every
  // numeric key from the summary that has a label entry. This keeps the BE
  // free to add new summary numbers without an FE change.
  const renderKeys = (keys && keys.length)
    ? keys
    : Object.keys(summary).filter((k) => LABELS[k] !== undefined);

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      {renderKeys.map((k) => {
        const [label, sub] = LABELS[k] || [k, ''];
        return (
          <div key={k} className="rounded-lg border border-border bg-base-elev p-4">
            <div className="text-xs font-medium text-ink-soft uppercase tracking-wider">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-ink tabular-nums">
              {typeof summary[k] === 'number' ? summary[k].toLocaleString() : summary[k]}
            </div>
            {sub ? <div className="mt-1 text-xs text-ink-soft">{sub}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
