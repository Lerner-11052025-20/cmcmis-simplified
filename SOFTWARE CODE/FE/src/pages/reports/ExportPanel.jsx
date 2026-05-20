// ============================================================================
// src/pages/reports/ExportPanel.jsx  —  PDF / Excel / Print buttons
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics
//
// Sits at the bottom of the Reports landing page (matches attached UI):
//
//     ┌─ Export Report ─────────────────────────────┐
//     │ [⬇ Export as PDF] [⬇ Export as Excel] [⎙ Print Report] │
//     └─────────────────────────────────────────────┘
//
//   • PDF   — fires `downloadReportPdf(key, params)` and streams the file
//   • Excel — generates a tab-separated CSV from the currently visible rows
//             (Excel opens CSV natively; uses the same `rows` array the
//             on-screen table is rendering, so what-you-see is what-you-get).
//   • Print — opens the browser print dialog focused on the report region.
//
// Permission gate: the Export buttons are hidden when the user lacks
// `reports:export` (BE will also block with 403). Print is local so it
// shows for view-only users too.
// ============================================================================

import { Download, Printer, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../lib/auth-context.jsx';
import { downloadReportPdf } from '../../lib/api/reports.js';

function rowsToCsv(columns, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.header)).join(',');
  const body = rows.map((r) =>
    columns.map((c) => escape(r[c.accessorKey])).join(',')
  ).join('\r\n');
  // UTF-8 BOM so Excel opens correctly.
  return '﻿' + header + '\r\n' + body + '\r\n';
}

function downloadBlob(text, filename) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportPanel({ reportKey, reportTitle, columns, rows, params }) {
  const { user } = useAuth();
  const canExport = (user?.permissions || []).includes('reports:export');

  async function onPdf() {
    try {
      const id = toast.loading(`Preparing PDF — ${reportTitle}…`);
      const { filename } = await downloadReportPdf(reportKey, params);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      toast.error(`Failed to export PDF: ${e.response?.data?.error?.message || e.message}`);
    }
  }

  function onExcel() {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${reportKey}-${ts}.csv`;
      downloadBlob(rowsToCsv(columns, rows || []), filename);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error(`Could not generate CSV: ${e.message}`);
    }
  }

  function onPrint() {
    window.print();
  }

  return (
    <div className="rounded-lg border border-border bg-base-elev p-4">
      <h3 className="text-sm font-semibold text-ink">Export Report</h3>
      <div className="mt-3 flex flex-wrap gap-3">
        {canExport ? (
          <button
            type="button"
            onClick={onPdf}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Download size={16} strokeWidth={1.5} aria-hidden="true" />
            Export as PDF
          </button>
        ) : null}
        {canExport ? (
          <button
            type="button"
            onClick={onExcel}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <FileSpreadsheet size={16} strokeWidth={1.5} aria-hidden="true" />
            Export as Excel
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-base px-4 py-2 text-sm text-ink hover:bg-base-elev focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <Printer size={16} strokeWidth={1.5} aria-hidden="true" />
          Print Report
        </button>
      </div>
      {!canExport ? (
        <p className="mt-3 text-xs text-ink-soft">
          You have view-only access. Contact your administrator for export permissions.
        </p>
      ) : null}
    </div>
  );
}
