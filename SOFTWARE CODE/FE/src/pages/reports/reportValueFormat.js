import dayjs from 'dayjs';

import { formatIstDate } from '../../lib/time.js';

const STATUS_LABELS = {
  SUBMITTED:       'Pending For Conversion',
  ASSIGNED:        'Job In Queue',
  IN_PROGRESS:     'Job On Hand',
  COMPLETED:       'Review Pending',
  VERIFIED_CLOSED: 'Completed',
  DRAFT:           'Draft',
  CANCELLED:       'Cancelled',
  REOPENED:        'Reopened',
  REJECTED:        'Rejected',
};

export function displayText(value) {
  if (!value) return '';
  const key = String(value).toUpperCase();
  if (STATUS_LABELS[key]) {
    return STATUS_LABELS[key];
  }
  return String(value).replaceAll('_', ' ');
}

function extractYear(value) {
  if (!value) return new Date().getFullYear();
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d{4}/.test(value)) return value.slice(0, 4);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
}

function formatDisplayCode(prefix, id, dateValue, fallback) {
  if (id === null || id === undefined || id === '') return fallback || '';
  return `${prefix}-${extractYear(dateValue)}-${String(id).padStart(4, '0')}`;
}

export function formatReportValue(column, row, emptyValue = '-') {
  const value = row?.[column.accessorKey];

  if (value === null || value === undefined || value === '') return emptyValue;

  if (column.display === 'jrCode') {
    return formatDisplayCode('JR', value, row?.submitted_date || row?.received_date, row?.request_code) || emptyValue;
  }

  if (column.display === 'jcCode') {
    return formatDisplayCode('JC', value, row?.received_date || row?.completed_date, row?.card_code || row?.job_card_no) || emptyValue;
  }

  if (column.kind === 'date') {
    const d = dayjs(value);
    return d.isValid() ? formatIstDate(value) : String(value);
  }

  if (column.kind === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : String(value);
  }

  if (column.kind === 'badge') {
    return displayText(value);
  }

  return String(value);
}
