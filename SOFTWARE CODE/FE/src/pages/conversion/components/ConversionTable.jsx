// ============================================================================
// pages/conversion/components/ConversionTable.jsx
// ----------------------------------------------------------------------------
// The list of pending-conversion JRs for the active tab. Columns adapt
// slightly per tab (e.g. "Correction Type" only on the Master Data tab),
// but the bulk is shared.
//
// Per-row actions (matches screenshots image-7..9):
//   ✓ Convert (green check)   → opens ConvertToJobCardModal
//   👁 View    (eye)           → navigate to /job-requests/:id (same tab — Q-5)
//   ✗ Reject  (red X)         → opens RejectModal
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { Check, Eye, X, AlertTriangle } from 'lucide-react';
import { DataTable } from '../../../components/DataTable.jsx';
import { StatusPill } from '../../../components/StatusPill.jsx';
import { formatIstTimestamp } from '../../../lib/time.js';

const TYPE_BADGES = {
  CALIBRATION:  'Pending Conversion',
  REPAIR:       'Pending Conversion',
  REGISTRATION: 'Pending Conversion',
};

/**
 * @param {Object} props
 * @param {Array} props.rows
 * @param {boolean} props.loading
 * @param {(row: Object) => void} props.onConvert
 * @param {(row: Object) => void} props.onReject
 */
export function ConversionTable({ rows, loading, onConvert, onReject }) {
  const navigate = useNavigate();

  const columns = [
    {
      header: 'Job ID',
      accessor: 'request_code',
      format: (val, row) => (
        <button
          type="button"
          onClick={() => navigate(`/job-requests/${encodeURIComponent(row.id)}`)}
          className="text-accent hover:underline font-medium"
        >
          {val}
        </button>
      ),
    },
    {
      // Equipment column also flags JRs that lack a concrete equipment_id:
      // those cannot be converted (legacy JC schema requires JM_EQM_ID NOT NULL).
      // An amber warning icon next to the name tells the LIC at a glance.
      header: 'Equipment',
      accessor: 'equipment_name',
      className: 'text-ink',
      format: (val, row) => (
        <div className="flex items-center gap-1.5">
          <span className="truncate">{val}</span>
          {!row.equipment_id ? (
            <AlertTriangle
              size={14}
              strokeWidth={1.75}
              className="text-amber-600 shrink-0"
              aria-label="No equipment selected — cannot convert"
            />
          ) : null}
        </div>
      ),
    },
    { header: 'Division',     accessor: 'division_code',  className: 'uppercase text-xs text-ink' },
    { header: 'Submitted By', accessor: 'submitted_by_name' },
    {
      header: 'Date',
      accessor: (row) => row.submitted_at || row.created_at,
      format: (v) => formatIstTimestamp(v, '—'),
    },
    {
      header: 'Status',
      accessor: 'status',
      format: () => <StatusPill status="SUBMITTED" />,  // always SUBMITTED on this page
    },
    {
      header: 'Actions',
      accessor: '__actions',
      format: (_v, row) => {
        const blocked = !row.equipment_id;
        const convertTitle = blocked
          ? 'Cannot convert — this JR has no equipment selected. Submitter must update it first.'
          : 'Convert to Job Card';
        return (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => { if (!blocked) onConvert(row); }}
            disabled={blocked}
            aria-label={`Convert ${row.request_code} to a Job Card`}
            title={convertTitle}
            className={
              'p-1.5 rounded-md focus:outline-none focus:ring-2 ' +
              (blocked
                ? 'text-ink-soft/40 cursor-not-allowed'
                : 'text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500')
            }
          >
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/job-requests/${encodeURIComponent(row.id)}`)}
            aria-label={`View ${row.request_code}`}
            title="View details"
            className="p-1.5 rounded-md text-accent hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onReject(row)}
            aria-label={`Reject ${row.request_code}`}
            title="Reject"
            className="p-1.5 rounded-md text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      );
      },
      className: 'text-right',
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows ?? []}
      keyField="id"
      loading={loading}
      emptyMessage="No pending requests in this category."
    />
  );
}
