import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../lib/auth-context.jsx';
import { downloadReportPdf, fetchReport } from '../../lib/api/reports.js';
import { formatReportValue } from './reportValueFormat.js';

const EXPORT_PAGE_SIZE = 500;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cleanExportParams(params) {
  const { page, page_size, ...rest } = params || {};
  return rest;
}

async function fetchAllReportRows(reportKey, params) {
  const base = cleanExportParams(params);
  const rows = [];
  let page = 1;
  let total = null;

  while (total === null || rows.length < total) {
    const result = await fetchReport(reportKey, {
      ...base,
      page,
      page_size: EXPORT_PAGE_SIZE,
    });
    const batch = result?.rows || [];
    total = Number(result?.total ?? batch.length);
    rows.push(...batch);
    if (batch.length === 0 || batch.length < EXPORT_PAGE_SIZE) break;
    page += 1;
  }

  return rows;
}

function buildSpreadsheetHtml(reportTitle, columns, rows) {
  const header = columns
    .map((column) => `<th>${escapeHtml(column.header)}</th>`)
    .join('');
  const body = rows.map((row, index) => {
    const cells = columns
      .map((column) => `<td>${escapeHtml(formatReportValue(column, row, ''))}</td>`)
      .join('');
    return `<tr><td>${index + 1}</td>${cells}</tr>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #111827; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #f8fafc; color: #64748b; font-weight: 700; }
    th, td { border: 1px solid #dbe3ef; padding: 8px; font-size: 12px; vertical-align: top; }
    td { mso-number-format: "\\@"; }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportTitle)}</h1>
  <table>
    <thead><tr><th>#</th>${header}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}

function downloadBlob(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function printRows(reportTitle, columns, rows) {
  const html = buildSpreadsheetHtml(reportTitle, columns, rows).replace(
    '</style>',
    `
    @page { size: landscape; margin: 12mm; }
    body { margin: 0; }
    h1 { font-size: 20px; }
    th { position: sticky; top: 0; }
    </style>`,
  );
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    throw new Error('Print window was blocked by the browser.');
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

export function ExportPanel({ reportKey, reportTitle, columns, params, total }) {
  const { user } = useAuth();
  const canExport = (user?.permissions || []).includes('reports:export');

  async function onPdf() {
    try {
      const id = toast.loading(`Preparing PDF - ${reportTitle}...`);
      const { filename } = await downloadReportPdf(reportKey, params);
      toast.success(`Downloaded ${filename}`, { id });
    } catch (e) {
      toast.error(`Failed to export PDF: ${e.response?.data?.error?.message || e.message}`);
    }
  }

  async function onExcel() {
    try {
      const id = toast.loading(`Preparing Excel sheet - ${reportTitle}...`);
      const rows = await fetchAllReportRows(reportKey, params);
      const date = new Date().toISOString().slice(0, 10);
      const filename = `${reportKey}-${date}.xls`;
      downloadBlob(
        buildSpreadsheetHtml(reportTitle, columns, rows),
        filename,
        'application/vnd.ms-excel;charset=utf-8;',
      );
      toast.success(`Downloaded ${filename} (${rows.length.toLocaleString()} rows)`, { id });
    } catch (e) {
      toast.error(`Could not generate Excel sheet: ${e.response?.data?.error?.message || e.message}`);
    }
  }

  async function onPrint() {
    try {
      const id = toast.loading(`Preparing print view - ${reportTitle}...`);
      const rows = await fetchAllReportRows(reportKey, params);
      printRows(reportTitle, columns, rows);
      toast.success(`Print view ready (${rows.length.toLocaleString()} rows)`, { id });
    } catch (e) {
      toast.error(`Could not print report: ${e.response?.data?.error?.message || e.message}`);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Export Report</h3>
          <p className="text-xs text-slate-500">
            PDF, Excel, and Print use the current filters and full report data.
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {(total || 0).toLocaleString()} rows
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {canExport ? (
          <button
            type="button"
            onClick={onPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <Download size={16} strokeWidth={1.8} aria-hidden="true" />
            Export PDF
          </button>
        ) : null}
        {canExport ? (
          <button
            type="button"
            onClick={onExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <FileSpreadsheet size={16} strokeWidth={1.8} aria-hidden="true" />
            Export Excel
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          <Printer size={16} strokeWidth={1.8} aria-hidden="true" />
          Print Table
        </button>
      </div>
      {!canExport ? (
        <p className="mt-3 text-xs text-slate-500">
          You have view-only access. Contact your administrator for export permissions.
        </p>
      ) : null}
    </div>
  );
}
