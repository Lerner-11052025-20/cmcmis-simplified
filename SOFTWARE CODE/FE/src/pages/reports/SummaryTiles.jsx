// ============================================================================
// src/pages/reports/SummaryTiles.jsx  —  KPI summary tiles (premium)
// ============================================================================

const LABELS = {
  total:           ['Total Equipment',  'in scope'],
  due_soon:        ['Due Soon',         'within window'],
  overdue:         ['Overdue',          'today > due date'],
  valid:           ['Valid',            'beyond alert window'],
  total_pending:   ['Total Pending',    'open requests'],
  new_requests:    ['New Requests',     'in range'],
  assigned:        ['Assigned',         'engineer present'],
  unassigned:      ['Unassigned',       'no engineer'],
  total_equipment: ['Total Equipment',  'COUNT(EQM_ID)'],
  used_equipment:  ['Used Equipment',   'with JCs in window'],
  total_job_cards: ['Total Job Cards',  'aggregate count'],
  inactive_low_use:['Inactive / Low',   '0 JCs in window'],
  engineers:       ['Engineers',        'distinct assigned'],
  assigned_jcs:    ['Assigned JCs',     'total assigned'],
  completed:       ['Completed',        'final state'],
  in_progress:     ['In Progress',      'being worked'],
  verified_closed: ['Verified/Closed',  'final state'],
  open_assigned:   ['Open / Assigned',  'awaiting start'],
  reopened:        ['Reopened',         'returned for rework'],
  draft:           ['Draft',            'not yet submitted'],
  submitted:       ['Submitted',        'awaiting approval'],
  rejected:        ['Rejected',         'terminal'],
};

const TILE_ACCENTS = [
  { bg: 'bg-indigo-50/60', border: 'border-indigo-100/50', valueColor: 'text-indigo-600' },
  { bg: 'bg-emerald-50/60', border: 'border-emerald-100/50', valueColor: 'text-emerald-600' },
  { bg: 'bg-amber-50/60', border: 'border-amber-100/50', valueColor: 'text-amber-600' },
  { bg: 'bg-rose-50/60', border: 'border-rose-100/50', valueColor: 'text-rose-600' },
  { bg: 'bg-sky-50/60', border: 'border-sky-100/50', valueColor: 'text-sky-600' },
  { bg: 'bg-violet-50/60', border: 'border-violet-100/50', valueColor: 'text-violet-600' },
];

export function SummaryTiles({ summary, keys }) {
  if (!summary) return null;
  const renderKeys = (keys && keys.length)
    ? keys
    : Object.keys(summary).filter((k) => LABELS[k] !== undefined);

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {renderKeys.map((k, i) => {
        const [label, sub] = LABELS[k] || [k, ''];
        const accent = TILE_ACCENTS[i % TILE_ACCENTS.length];
        return (
          <div
            key={k}
            className={`rounded-xl border ${accent.border} ${accent.bg} p-4 transition-all duration-200 hover:shadow-sm`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans leading-none">
              {label}
            </div>
            <div className={`mt-2.5 text-2xl font-bold ${accent.valueColor} tabular-nums font-sans`}>
              {typeof summary[k] === 'number' ? summary[k].toLocaleString() : summary[k]}
            </div>
            {sub ? <div className="mt-1 text-[10px] text-slate-400 font-sans">{sub}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
