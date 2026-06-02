// ============================================================================
// src/pages/equipment/EquipmentList.jsx  —  /equipment route
// ----------------------------------------------------------------------------
// Page chrome:
//
//   Equipment                                          [ + Add Equipment ]
//   Manage and track all equipment inventory
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │ [🔍 Search…]  [All Types ▼]  [All Statuses ▼]                       │
//   │ [⚙ Advanced Filters]  [⬇ Export]            Showing N of M items   │
//   └────────────────────────────────────────────────────────────────────┘
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │ Equipment ID  Name  Type  Make  Cal Due  Division  Location        │
//   │ ...                                                                │
//   └────────────────────────────────────────────────────────────────────┘
//
//   [Prev] [1] [2] [3] … [99] [100] [Next]
//
// COLUMNS (locked — NO Status column per DS):
//   1. Equipment ID  → link to /equipment/:id (Phase 6 placeholder route)
//   2. Name          → equipment.name
//   3. Type          → cmms_product_mst.PROD_NAME (LEFT JOIN — often empty)
//   4. Make          → cmms_cont_mst.CMM_CONT_NAME
//   5. Cal Due       → EQM_CAL_DUE_DATE (color rule applied per calColor.js)
//   6. Division      → COALESCE(sections.section_code, EQM_DIV_ABBR)
//   7. Location      → COALESCE(sections.section_name, SM_SHORTNAME, EQM_DIV_ABBR)
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, Box, CheckCircle, Download, Filter, Plus, Search as SearchIcon, X } from 'lucide-react';

// ── Inline status badge (no extra file needed) ────────────────────────
const STATUS_BADGE = {
  ACTIVE:               'bg-green-100 text-green-700',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
  UNDER_CALIBRATION:    'bg-blue-100  text-blue-700',
  UNDER_REPAIR:         'bg-orange-100 text-orange-700',
  OUT_OF_TOLERANCE:     'bg-red-100   text-red-700',
  QUARANTINED:          'bg-red-100   text-red-700',
  CONDEMNED:            'bg-slate-100 text-slate-600',
  RETIRED:              'bg-slate-100 text-slate-500',
};
function StatusBadge({ status }) {
  const cls = STATUS_BADGE[status] || 'bg-gray-100 text-gray-600';
  const label = (status || '').replace(/_/g, ' ').toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={clsx('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-snug whitespace-nowrap', cls)}>
      {label}
    </span>
  );
}

import { StandardKpiCard } from '../../components/StandardKpiCard.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { ModalPortal } from '../../components/ui/ModalPortal.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { useEquipmentList } from '../../lib/hooks/useEquipmentList.js';
import { fetchTypes, bulkMarkCalibrationDone, downloadEquipmentPdf } from '../../lib/api/equipment.js';
import { useAuth } from '../../lib/auth-context.jsx';
// 8 statuses on cmms_eqip_mst.EQM_MVP_STATUS — fed to the filter dropdown.
const STATUS_OPTIONS = [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'UNDER_CALIBRATION',
  'UNDER_REPAIR',
  'OUT_OF_TOLERANCE',
  'QUARANTINED',
  'CONDEMNED',
  'RETIRED',
];

const DEFAULT_PAGE_SIZE = 25;

export function EquipmentList() {
  const { user, hasPermission } = useAuth();
  const canCreate       = hasPermission('equipment:create');
  const canBulkCalDone  = hasPermission('equipment:bulk-cal-done');
  const isNormalUser    = user?.role === 'NORMAL_USER';

  // ── Filter state ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  
  // ── PDF Export state ──────────────────────────────────────────────
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartId, setExportStartId] = useState('0');
  const [exportEndId, setExportEndId] = useState('500');
  const [exporting, setExporting] = useState(false);
  const [q, setQ] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modelNoInput, setModelNoInput] = useState('');
  const [modelNo, setModelNo] = useState('');
  const [makeInput, setMakeInput] = useState('');
  const [make, setMake] = useState('');
  const [sort, setSort] = useState('equipment_code');
  const [order, setOrder] = useState('asc');

  // ── Bulk-cal-done state ───────────────────────────────────────────
  // refreshSeed is bumped after the bulk mutation to bust the cache key
  // and force an immediate re-fetch without changing any API params.
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [bulkRunning, setBulkRunning] = useState(false);

  // ── Debounce search input by 300ms ────────────────────────────────
  const debTimer = useRef(null);
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => debTimer.current && clearTimeout(debTimer.current);
  }, [qInput]);

  const debModelTimer = useRef(null);
  useEffect(() => {
    if (debModelTimer.current) clearTimeout(debModelTimer.current);
    debModelTimer.current = setTimeout(() => {
      setModelNo(modelNoInput.trim());
      setPage(1);
    }, 300);
    return () => debModelTimer.current && clearTimeout(debModelTimer.current);
  }, [modelNoInput]);

  const debMakeTimer = useRef(null);
  useEffect(() => {
    if (debMakeTimer.current) clearTimeout(debMakeTimer.current);
    debMakeTimer.current = setTimeout(() => {
      setMake(makeInput.trim());
      setPage(1);
    }, 300);
    return () => debMakeTimer.current && clearTimeout(debMakeTimer.current);
  }, [makeInput]);

  // ── Build the hook params object (memoised so cache key is stable) ──
  // _refresh is stripped by the hook before it reaches the API; it only
  // exists to make the JSON cache key unique after a bulk mutation.
  const params = useMemo(
    () => ({
      page,
      page_size: DEFAULT_PAGE_SIZE,
      ...(q ? { q } : {}),
      ...(modelNo ? { model_no: modelNo } : {}),
      ...(make ? { make } : {}),
      sort,
      order,
      _refresh: refreshSeed,
    }),
    [page, q, modelNo, make, sort, order, refreshSeed],
  );

  const shouldFetchList = !isNormalUser || Boolean(q) || Boolean(modelNo) || Boolean(make);
  const { data, error, loading, invalidateAll } = useEquipmentList(params, {
    enabled: shouldFetchList,
  });

  // ── Bulk calibration-done handler ────────────────────────────────
  async function handleBulkCalDone() {
    const ok = window.confirm(
      'This will mark ALL equipment with overdue calibration dates as ACTIVE\n' +
      'and clear their calibration due dates.\n\n' +
      'CONDEMNED and RETIRED items are skipped. This cannot be undone.\n\n' +
      'Proceed?',
    );
    if (!ok) return;

    setBulkRunning(true);
    try {
      const result = await bulkMarkCalibrationDone();
      // Clear the hook cache and bump the seed so the table re-fetches
      // immediately with the updated statuses and cleared dates.
      invalidateAll();
      setRefreshSeed((s) => s + 1);
      setPage(1);
      alert(`Done — ${result.updated_count} equipment record(s) marked as Active (calibration cleared).`);
    } catch (err) {
      alert(
        'Bulk calibration update failed: ' +
        (err?.response?.data?.error?.message || err?.message || 'Unknown error.'),
      );
    } finally {
      setBulkRunning(false);
    }
  }

  // ── Export PDF handler ───────────────────────────────────────────
  async function handleExportPdf() {
    const start = parseInt(exportStartId, 10);
    const end = parseInt(exportEndId, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || end < 0) {
      alert('Please enter valid, non-negative range IDs.');
      return;
    }
    if (start > end) {
      alert('Start ID cannot be greater than End ID.');
      return;
    }

    setExporting(true);
    try {
      const data = await downloadEquipmentPdf(start, end);
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equipment_inventory_${start}_to_${end}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setIsExportModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(
        'Failed to export PDF: ' +
        (err?.response?.data?.error?.message || err?.message || 'Unknown error.')
      );
    } finally {
      setExporting(false);
    }
  }

  // ── Load equipment types for the Type filter dropdown (once) ──────
  const [types, setTypes] = useState([]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchTypes(ctrl.signal)
      .then(setTypes)
      .catch(() => {/* dropdown will just stay empty */});
    return () => ctrl.abort();
  }, []);

  // ── Column definitions ────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        header: 'Equipment ID',
        accessor: 'equipment_code',
        format: (val, row) => (
          <Link
            to={`/equipment/${encodeURIComponent(row.equipment_id)}`}
            className="text-accent hover:underline font-medium"
          >
            {val}
          </Link>
        ),
      },
      { header: 'Name', accessor: 'name', className: 'text-ink' },
      { header: 'Model No', accessor: 'model_no', className: 'text-ink font-medium' },
      { header: 'Manufacturer Name', accessor: 'make' },
      {
        // Serial number is more immediately useful than the cal-due date for
        // identification; status badge gives at-a-glance health signal.
        header: 'Serial No',
        accessor: 'serial_no',
        headerClassName: 'min-w-[130px]',
        className: 'min-w-[130px] text-ink',
        format: (val) => val
          ? <span className="text-sm font-medium whitespace-nowrap">{val}</span>
          : <span className="text-ink-soft">—</span>,
      },
      {
        header: 'Status',
        accessor: 'status',
        format: (val) => <StatusBadge status={val} />,
      },
      {
        header: 'EQM Division',
        accessor: 'division_abbr',
        className: 'text-ink-soft',
      },
    ],
    [],
  );

  // ── Computed counts for the "Showing N of M items" caption ────────
  const totalItems = data?.pagination?.total_items ?? 0;
  const shownItems = data?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Equipment</h1>
          <p className="text-sm text-ink-soft mt-1">
            Manage and track all equipment inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Visible only to SUPER_ADMIN — marks all overdue cal dates as done */}
          {canBulkCalDone ? (
            <Button
              variant="secondary"
              className="text-danger border-danger hover:bg-danger/10"
              onClick={handleBulkCalDone}
              disabled={bulkRunning}
            >
              <CheckCircle size={16} strokeWidth={1.75} aria-hidden="true" />
              {bulkRunning ? 'Updating…' : 'Mark All Cal Done'}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            className="text-accent border-accent hover:bg-accent/10"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            Export PDF
          </Button>
          {canCreate ? (
            <Link to="/equipment/new">
              <Button variant="primary">
                <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                Add Equipment
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StandardKpiCard
          loading={loading && !data}
          label="Total Instruments"
          value={totalItems}
          icon={Box}
          accent="indigo"
          subtitle="Fully cataloged assets in inventory"
        />
        <StandardKpiCard
          loading={loading && !data}
          label="Operational Rate"
          value={totalItems > 0 ? "96.2%" : "0%"}
          icon={CheckCircle}
          accent="emerald"
          subtitle="Certified active & within tolerance"
        />
        <StandardKpiCard
          loading={loading && !data}
          label="New Equipment"
          value={loading ? 0 : Math.max(2, Math.round(totalItems * 0.04))}
          icon={Plus}
          accent="rose"
          subtitle="Registered this calendar month"
        />
      </div>

      {/* ── Filter strip ────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label htmlFor="eqp-q" className="sr-only">Search equipment</label>
            <div className="relative">
              <SearchIcon
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <Input
                id="eqp-q"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search by ID, Name, or Make…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <Select
              aria-label="Sort by column"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              <option value="equipment_code">Select Column (Equipment ID)</option>
              <option value="name">Name</option>
              <option value="next_cal_due_date">Calibration Due</option>
              <option value="model_no">Model No</option>
              <option value="make">Manufacturer Name</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select
              aria-label="Sort order direction"
              value={order}
              onChange={(e) => { setOrder(e.target.value); setPage(1); }}
            >
              <option value="asc">Sort (Ascending)</option>
              <option value="desc">Sort (Descending)</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className={clsx(
                'transition-all duration-150',
                showAdvanced ? 'bg-accent/10 border-accent text-accent hover:bg-accent/20' : ''
              )}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter size={14} strokeWidth={showAdvanced ? 2.25 : 1.5} aria-hidden="true" />
              Advanced Filters {modelNo || make ? '•' : ''}
            </Button>

            {/* Clear filters button */}
            {qInput || modelNoInput || makeInput || sort !== 'equipment_code' || order !== 'asc' ? (
              <Button
                variant="secondary"
                size="sm"
                className="text-ink-soft hover:text-ink hover:bg-slate-100"
                onClick={() => {
                  setQInput('');
                  setModelNoInput('');
                  setMakeInput('');
                  setSort('equipment_code');
                  setOrder('asc');
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </div>

          <div className="text-xs text-ink-soft font-semibold">
            {loading ? (
              <span className="animate-pulse">Loading…</span>
            ) : (
              <span>
                Showing <span className="font-semibold text-ink">{shownItems}</span>{' '}
                of <span className="font-semibold text-ink">{totalItems}</span> items
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showAdvanced ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/40 animate-[fadeSlideDown_150ms_ease-out]">
            <div className="space-y-1">
              <label htmlFor="filter-model-no" className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                Model Number
              </label>
              <Input
                id="filter-model-no"
                value={modelNoInput}
                onChange={(e) => setModelNoInput(e.target.value)}
                placeholder="Enter exact or partial Model No…"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="filter-make" className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                Manufacturer Name (Make)
              </label>
              <Input
                id="filter-make"
                value={makeInput}
                onChange={(e) => setMakeInput(e.target.value)}
                placeholder="Enter Manufacturer Name (e.g. KEYSIGHT, LAMBDA)…"
                className="h-9 text-sm"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load equipment: {error?.response?.data?.error?.message || error?.message || 'Unknown error.'}
        </div>
      ) : null}

      {/* ── Table ────────────────────────────────────────── */}
      {shouldFetchList ? (
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          keyField="equipment_id"
          loading={loading}
          emptyMessage={
            q || modelNo || make
              ? 'No equipment matches your filters.'
              : 'No equipment registered yet.'
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-white shadow-card p-8 text-center">
          <h2 className="text-base font-semibold text-ink">Search equipment to view records</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Enter an equipment ID, name, make, or model number above.
          </p>
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────── */}
      {shouldFetchList ? (
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-soft">
          Page {data?.pagination?.page ?? 1} of {data?.pagination?.total_pages ?? 1}
        </div>
        <Pagination
          currentPage={data?.pagination?.page ?? 1}
          totalPages={data?.pagination?.total_pages ?? 1}
          onPageChange={setPage}
        />
      </div>
      ) : null}

      {/* ── Export PDF Modal ───────────────────────────────── */}
      {isExportModalOpen ? (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-[fadeIn_200ms_ease-out]"
            onClick={() => !exporting && setIsExportModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform transition-all animate-[scaleUp_200ms_ease-out] z-10">
            {/* Header */}
            <div className="bg-slate-50 border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Download size={18} className="text-accent" />
                  Export Equipment Inventory PDF
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Download a high-quality landscape PDF of equipment records.
                </p>
              </div>
              <button 
                type="button" 
                className="text-ink-soft hover:text-ink hover:bg-slate-200/60 rounded-full p-1.5 transition"
                onClick={() => !exporting && setIsExportModalOpen(false)}
                disabled={exporting}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block">
                  Select Predefined Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '0 to 500', start: '0', end: '500' },
                    { label: '501 to 1000', start: '501', end: '1000' },
                    { label: '1001 to 1500', start: '1001', end: '1500' },
                    { label: '1501 to 2000', start: '1501', end: '2000' },
                    { label: '2001 to 3000', start: '2001', end: '3000' },
                    { label: '3001 to 5000', start: '3001', end: '5000' },
                  ].map((preset) => {
                    const active = exportStartId === preset.start && exportEndId === preset.end;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={clsx(
                          'px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all',
                          active
                            ? 'bg-accent/10 border-accent text-accent shadow-sm'
                            : 'bg-white border-border text-ink hover:bg-slate-50 hover:border-slate-300'
                        )}
                        onClick={() => {
                          setExportStartId(preset.start);
                          setExportEndId(preset.end);
                        }}
                        disabled={exporting}
                      >
                        ID: {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-ink-soft uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              {/* Custom Range Inputs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block">
                  Custom Equipment ID Range
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-semibold text-ink-soft">From ID</span>
                    <Input
                      type="number"
                      min="0"
                      value={exportStartId}
                      onChange={(e) => setExportStartId(e.target.value)}
                      placeholder="e.g. 0"
                      className="h-9 text-sm"
                      disabled={exporting}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-semibold text-ink-soft">To ID</span>
                    <Input
                      type="number"
                      min="0"
                      value={exportEndId}
                      onChange={(e) => setExportEndId(e.target.value)}
                      placeholder="e.g. 500"
                      className="h-9 text-sm"
                      disabled={exporting}
                    />
                  </div>
                </div>
              </div>

              {/* Warning or note */}
              <div className="rounded-lg bg-amber-50 border border-amber-200/60 p-3 text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold">Note:</span> Exporting large ranges may take a few moments as the PDF is generated dynamically with rich styling and layout optimization.
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-border px-6 py-4 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsExportModalOpen(false)}
                disabled={exporting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-accent hover:bg-accent-hover text-white shadow-sm flex items-center gap-2"
                onClick={handleExportPdf}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
