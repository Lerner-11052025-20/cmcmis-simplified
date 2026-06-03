// ============================================================================
// src/pages/reports/SummaryTiles.jsx  —  KPI summary tiles (premium)
// ============================================================================

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Gauge,
  Settings,
  Users,
} from 'lucide-react';
import { StandardKpiCard } from '../../components/StandardKpiCard.jsx';

const LABELS = {
  total:           ['Total Equipment',  'in scope'],
  due_soon:        ['Due Soon',         'within window'],
  overdue:         ['Overdue',          'past due date'],
  valid:           ['Valid',            'beyond alert window'],
  total_pending:   ['Total Pending',    'open requests'],
  new_requests:    ['New Requests',     'in range'],
  assigned:        ['Assigned',         'engineer present'],
  unassigned:      ['Unassigned',       'no engineer'],
  total_equipment: ['Total Equipment',  'registered assets'],
  used_equipment:  ['Used Equipment',   'with job cards'],
  total_job_cards: ['Total Job Cards',  'in selected range'],
  inactive_low_use:['Inactive / Low',   'no job cards'],
  engineers:       ['Engineers',        'assigned staff'],
  assigned_jcs:    ['Assigned JCs',     'workload total'],
  completed:       ['Completed',        'final state'],
  in_progress:     ['In Progress',      'being worked'],
  verified_closed: ['Verified Closed',  'final state'],
  open_assigned:   ['Open / Assigned',  'awaiting start'],
  reopened:        ['Reopened',         'returned for rework'],
  draft:           ['Draft',            'not yet submitted'],
  submitted:       ['Submitted',        'sent for action'],
  rejected:        ['Rejected',         'terminal'],
};

const REPORT_LABELS = {
  calibrationDue: {
    total: ['Total Equipment', 'in scope'],
  },
  jobCardSummary: {
    total: ['Total Job Cards', 'in selected range'],
    open_assigned: ['Open Assigned', 'awaiting start'],
    completed: ['Completed JCs', 'finished work'],
  },
  jobRequestSummary: {
    total: ['Total Requests', 'in selected range'],
    submitted: ['Submitted Requests', 'sent for action'],
    assigned: ['Assigned Requests', 'engineer present'],
    verified_closed: ['Verified Requests', 'closed requests'],
  },
};

const TILE_META = [
  { accent: 'indigo', icon: ClipboardList },
  { accent: 'emerald', icon: CheckCircle2 },
  { accent: 'amber', icon: Clock },
  { accent: 'rose', icon: AlertTriangle },
  { accent: 'blue', icon: Gauge },
  { accent: 'violet', icon: Settings },
  { accent: 'slate', icon: Users },
  { accent: 'orange', icon: FileText },
];

export function SummaryTiles({ summary, keys, reportKey }) {
  if (!summary) return null;
  const renderKeys = (keys && keys.length)
    ? keys
    : Object.keys(summary).filter((k) => LABELS[k] !== undefined);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {renderKeys.map((k, i) => {
        const [label, sub] = REPORT_LABELS[reportKey]?.[k] || LABELS[k] || [k, ''];
        const meta = TILE_META[i % TILE_META.length];
        return (
          <StandardKpiCard
            key={k}
            label={label}
            value={typeof summary[k] === 'number' ? summary[k].toLocaleString() : summary[k]}
            icon={meta.icon}
            accent={meta.accent}
            subtitle={sub}
          />
        );
      })}
    </div>
  );
}
