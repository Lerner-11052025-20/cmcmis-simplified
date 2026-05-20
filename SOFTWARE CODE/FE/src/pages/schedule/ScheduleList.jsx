// ============================================================================
// src/pages/schedule/ScheduleList.jsx  —  list-view body
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// Image refs: list view shows columns
//   CAL:  ID · Equipment · Priority · Scheduled Date · Status · Engineer · Edit
//   PM:   ID · Equipment · Type     · Scheduled Date · Status · Engineer · Edit
// ============================================================================

import { useMemo } from 'react';

import { DataTable } from '../../components/DataTable.jsx';
import { useSchedules } from '../../lib/hooks/useSchedule.js';
import { useAuth } from '../../lib/auth-context.jsx';
import { downloadScheduleIcs } from '../../lib/api/schedule.js';
import { Download, Edit3 } from 'lucide-react';

// Status badge palette — mirrors the Phase-9 StatusPill conventions.
const STATUS_STYLES = {
  PLANNED:   'bg-base text-ink-soft border border-border',
  SCHEDULED: 'bg-blue-50 text-blue-700 border border-blue-200',
  DUE:       'bg-amber-50 text-amber-800 border border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  CANCELLED: 'bg-base-elev text-ink-soft border border-border',
};
const PRIORITY_STYLES = {
  HIGH:   'text-danger font-semibold',
  MEDIUM: 'text-amber-700 font-semibold',
  LOW:    'text-emerald-700 font-semibold',
};


export function ScheduleList({ tab, onEdit }) {
  const { hasPermission } = useAuth();
  const canEdit   = hasPermission('schedule:update');
  const canExport = hasPermission('schedule:export');

  const { items, loading, error } = useSchedules({
    type:      tab,
    view:      'list',
    page:      1,
    page_size: 200,           // single-page view; cap at 200 by validator
  });

  const isCalibration = tab === 'CALIBRATION';

  const columns = useMemo(() => {
    const cols = [
      {
        header: 'ID',
        accessor: 'schedule_code',
        format: (val) => (
          <span className="text-accent font-medium">{val}</span>
        ),
      },
      { header: 'Equipment', accessor: 'equipment_label', className: 'text-ink' },
    ];

    if (isCalibration) {
      cols.push({
        header: 'Priority',
        accessor: 'priority',
        format: (val) => (
          <span className={PRIORITY_STYLES[val] || 'text-ink-soft'}>{val}</span>
        ),
      });
    } else {
      cols.push({
        header: 'Type',
        accessor: 'schedule_type',
        format: () => 'Preventive Maintenance',
      });
    }

    cols.push(
      { header: 'Scheduled Date', accessor: 'scheduled_date' },
      {
        header: 'Status',
        accessor: 'status',
        format: (val) => (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[val] || STATUS_STYLES.PLANNED}`}>
            {label(val)}
          </span>
        ),
      },
      {
        header: 'Assigned Engineer',
        accessor: 'assigned_engineer_name',
        format: (val) => val || <span className="text-ink-soft">Unassigned</span>,
      },
      {
        header: 'Actions',
        accessor: 'id',
        format: (_v, row) => (
          <div className="flex items-center gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="text-accent hover:underline text-sm inline-flex items-center gap-1"
              >
                <Edit3 size={14} strokeWidth={1.75} aria-hidden="true" />
                Edit
              </button>
            ) : null}
            {canExport ? (
              <button
                type="button"
                title="Download .ics"
                onClick={() => downloadScheduleIcs(row.id)}
                className="text-ink-soft hover:text-ink inline-flex"
              >
                <Download size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ),
      },
    );
    return cols;
  }, [isCalibration, canEdit, canExport, onEdit]);

  return (
    <div className="space-y-4">
      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load schedules: {error?.response?.data?.error?.message || error?.message || 'Unknown error.'}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        rows={items}
        keyField="id"
        loading={loading}
        emptyMessage={isCalibration ? 'No calibration schedules yet.' : 'No PM schedules yet.'}
      />
    </div>
  );
}

function label(s) {
  if (!s) return '';
  // Title-case: PLANNED → Planned, SCHEDULED → Scheduled.
  return s.charAt(0) + s.slice(1).toLowerCase();
}
