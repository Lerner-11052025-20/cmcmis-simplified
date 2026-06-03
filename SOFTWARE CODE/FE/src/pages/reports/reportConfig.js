// ============================================================================
// src/pages/reports/reportConfig.js  —  Report catalogue
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Single source of truth for:
//   • the 6 report cards on the landing page (title, subtitle, icon)
//   • which BE key each card maps to
//   • which permission gates each card
//   • the column shape used by the per-report TanStack Table
//
// Adding a 7th report later = ADD ONE ENTRY here.
// ============================================================================

import {
  Calendar, FileText, TrendingUp, User as UserIcon, ClipboardList, FileEdit,
} from 'lucide-react';

/**
 * Each entry corresponds to one report card + table view.
 *
 *  key          — must match an entry in lib/api/reports.js REPORT_PATHS.
 *  title        — display title for both card + page header.
 *  subtitle     — short description (one line under the title).
 *  icon         — lucide-react icon component.
 *  requires     — view permission code (gates card visibility).
 *  accent       — Tailwind colour token used by the card chip.
 *  columns      — TanStack column defs for the on-screen table.
 *                 Each: { id, header, accessorKey or accessorFn, cell?, size? }
 *  statusEnum   — Allowed enum values for the Status filter dropdown
 *                 (used by ReportFilters to populate options). When
 *                 absent the Status filter is hidden for that report.
 */
export const REPORTS = [
  {
    key:      'calibrationDue',
    title:    'Calibration Due Report',
    subtitle: 'Equipment pending calibration',
    icon:     Calendar,
    requires: 'reports:view-calibration-due',
    accent:   'blue',
    statusEnum: ['VALID', 'DUE_SOON', 'OVERDUE'],
    summaryKeys: ['total', 'overdue', 'due_soon', 'valid'],
    columns: [
      { id: 'equipment_id',       header: 'Equipment ID',      accessorKey: 'equipment_id',      size: 110 },
      { id: 'equipment_name',     header: 'Equipment Name',    accessorKey: 'equipment_name',    size: 220 },
      { id: 'serial_number',      header: 'Serial Number',     accessorKey: 'serial_number',     size: 130 },
      { id: 'division',           header: 'Division',          accessorKey: 'division',          size: 110 },
      { id: 'calibration_status', header: 'Cal Status',        accessorKey: 'calibration_status',size: 110, kind: 'badge' },
      { id: 'equipment_status',   header: 'Equipment Status',  accessorKey: 'equipment_status',  size: 140, kind: 'badge' },
    ],
  },
  {
    key:      'pendingJobs',
    title:    'Pending Jobs Report',
    subtitle: 'All pending job requests',
    icon:     FileText,
    requires: 'reports:view-pending-jobs',
    accent:   'amber',
    statusEnum: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'],
    summaryKeys: ['total_pending', 'new_requests', 'assigned', 'unassigned'],
    columns: [
      { id: 'request_code',           header: 'Job Request ID',     accessorKey: 'job_request_id',         size: 160, display: 'jrCode', mono: true },
      { id: 'equipment_name',         header: 'Equipment Name',     accessorKey: 'equipment_name',         size: 220 },
      { id: 'job_type',               header: 'Job Type',           accessorKey: 'job_type',               size: 110 },
      { id: 'status',                 header: 'Status',             accessorKey: 'status',                 size: 130, kind: 'badge' },
      { id: 'priority',               header: 'Priority',           accessorKey: 'priority',               size: 100, kind: 'badge' },
      { id: 'submitted_by_name',      header: 'Submitted By',       accessorKey: 'submitted_by_name',      size: 160 },
      { id: 'submitted_date',         header: 'Submitted On',       accessorKey: 'submitted_date',         size: 130, kind: 'date' },
      { id: 'division',               header: 'Division',           accessorKey: 'division',               size: 110 },
      { id: 'assigned_engineer_name', header: 'Assigned Engineer',  accessorKey: 'assigned_engineer_name', size: 160 },
    ],
  },
  {
    key:      'equipmentUtilization',
    title:    'Equipment Utilization',
    subtitle: 'Usage and downtime analysis',
    icon:     TrendingUp,
    requires: 'reports:view-equipment-utilization',
    accent:   'emerald',
    statusEnum: ['ACTIVE', 'UNDER_CALIBRATION', 'UNDER_REPAIR', 'OUT_OF_TOLERANCE',
                 'QUARANTINED', 'CONDEMNED', 'RETIRED', 'PENDING_VERIFICATION'],
    summaryKeys: ['total_equipment', 'used_equipment', 'total_job_cards', 'inactive_low_use'],
    columns: [
      { id: 'equipment_id',     header: 'Equipment ID',   accessorKey: 'equipment_id',     size: 110 },
      { id: 'equipment_name',   header: 'Equipment Name', accessorKey: 'equipment_name',   size: 240 },
      { id: 'serial_number',    header: 'Serial Number',  accessorKey: 'serial_number',    size: 130 },
      { id: 'equipment_type',   header: 'Equipment Type', accessorKey: 'equipment_type',   size: 150 },
      { id: 'total_job_cards',  header: 'Total Job Cards',accessorKey: 'total_job_cards',  size: 130, kind: 'number' },
      { id: 'division',         header: 'Division',       accessorKey: 'division',         size: 110 },
      { id: 'equipment_status', header: 'Status',         accessorKey: 'equipment_status', size: 150, kind: 'badge' },
    ],
  },
  {
    key:      'engineerSummary',
    title:    'Engineer Summary',
    subtitle: 'Engineer workload and performance',
    icon:     UserIcon,
    requires: 'reports:view-engineer-summary',
    accent:   'indigo',
    // No status filter for engineer summary; the report is aggregation.
    summaryKeys: ['engineers', 'assigned_jcs', 'completed', 'in_progress'],
    columns: [
      { id: 'engineer_employee_id', header: 'Engineer ID',       accessorKey: 'engineer_employee_id', size: 110 },
      { id: 'engineer_name',        header: 'Engineer Name',     accessorKey: 'engineer_name',        size: 220 },
      { id: 'total_assigned',       header: 'Total Assigned',    accessorKey: 'total_assigned',       size: 110, kind: 'number' },
      { id: 'assigned',             header: 'Assigned',          accessorKey: 'assigned',             size: 100, kind: 'number' },
      { id: 'completed',            header: 'Completed',         accessorKey: 'completed',            size: 100, kind: 'number' },
      { id: 'in_progress',          header: 'In Progress',       accessorKey: 'in_progress',          size: 100, kind: 'number' },
      { id: 'verified_closed',      header: 'Verified/Closed',   accessorKey: 'verified_closed',      size: 120, kind: 'number' },
      { id: 'date_range_from',      header: 'First JC',          accessorKey: 'date_range_from',      size: 130, kind: 'date' },
      { id: 'date_range_to',        header: 'Last JC',           accessorKey: 'date_range_to',        size: 130, kind: 'date' },
    ],
  },
  {
    key:      'jobCardSummary',
    title:    'Job Card Summary',
    subtitle: 'All job cards by status & engineer',
    icon:     ClipboardList,
    requires: 'reports:view-job-card-summary',
    accent:   'sky',
    statusEnum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED_CLOSED', 'REOPENED'],
    summaryKeys: ['total', 'open_assigned', 'in_progress', 'completed'],
    columns: [
      { id: 'job_card_no',             header: 'Job Card ID',     accessorKey: 'job_card_id',             size: 160, display: 'jcCode', mono: true },
      { id: 'equipment_name',          header: 'Equipment Name',  accessorKey: 'equipment_name',          size: 220 },
      { id: 'job_type',                header: 'Job Type',        accessorKey: 'job_type',                size: 110 },
      { id: 'status',                  header: 'Status',          accessorKey: 'status',                  size: 140, kind: 'badge' },
      { id: 'assigned_engineer_name',  header: 'Engineer',        accessorKey: 'assigned_engineer_name',  size: 160 },
      { id: 'received_date',           header: 'Received',        accessorKey: 'received_date',           size: 130, kind: 'date' },
      { id: 'completed_date',          header: 'Completed',       accessorKey: 'completed_date',          size: 130, kind: 'date' },
      { id: 'verified_date',           header: 'Verified',        accessorKey: 'verified_date',           size: 130, kind: 'date' },
      { id: 'division',                header: 'Division',        accessorKey: 'division',                size: 110 },
      { id: 'workflow_type',           header: 'Workflow',        accessorKey: 'workflow_type',           size: 120 },
    ],
  },
  {
    key:      'jobRequestSummary',
    title:    'Job Request Summary',
    subtitle: 'All requests by lifecycle stage',
    icon:     FileEdit,
    requires: 'reports:view-job-request-summary',
    accent:   'rose',
    statusEnum: ['DRAFT', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS',
                 'COMPLETED', 'VERIFIED_CLOSED', 'REJECTED', 'REOPENED'],
    summaryKeys: ['total', 'submitted', 'assigned', 'verified_closed'],
    columns: [
      { id: 'request_code',           header: 'Job Request ID', accessorKey: 'job_request_id',         size: 160, display: 'jrCode', mono: true },
      { id: 'equipment_name',         header: 'Equipment Name', accessorKey: 'equipment_name',         size: 220 },
      { id: 'job_type',               header: 'Job Type',       accessorKey: 'job_type',               size: 110 },
      { id: 'status',                 header: 'Status',         accessorKey: 'status',                 size: 140, kind: 'badge' },
      { id: 'priority',               header: 'Priority',       accessorKey: 'priority',               size: 100, kind: 'badge' },
      { id: 'submitted_by_name',      header: 'Submitted By',   accessorKey: 'submitted_by_name',      size: 160 },
      { id: 'submitted_date',         header: 'Submitted On',   accessorKey: 'submitted_date',         size: 130, kind: 'date' },
      { id: 'assigned_engineer_name', header: 'Engineer',       accessorKey: 'assigned_engineer_name', size: 150 },
      { id: 'approved_by_name',       header: 'Approved By',    accessorKey: 'approved_by_name',       size: 150 },
      { id: 'rejected_by_name',       header: 'Rejected By',    accessorKey: 'rejected_by_name',       size: 150 },
      { id: 'division',               header: 'Division',       accessorKey: 'division',               size: 110 },
    ],
  },
];

/**
 * Helper — find a report config entry by key. Throws if missing so a
 * typo crashes loudly instead of silently rendering nothing.
 */
export function reportByKey(key) {
  const r = REPORTS.find((x) => x.key === key);
  if (!r) throw new Error(`Unknown report key: ${key}`);
  return r;
}
