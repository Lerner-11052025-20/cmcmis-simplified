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
import { Download, Filter, Plus, Search as SearchIcon } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { useEquipmentList } from '../../lib/hooks/useEquipmentList.js';
import { fetchTypes } from '../../lib/api/equipment.js';
import { useAuth } from '../../lib/auth-context.jsx';
import { calDueClass } from './utils/calColor.js';

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
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('equipment:create');

  // ── Filter state ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [typeId, setTypeId] = useState('');
  const [status, setStatus] = useState('');

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

  // ── Build the hook params object (memoised so cache key is stable) ──
  const params = useMemo(
    () => ({
      page,
      page_size: DEFAULT_PAGE_SIZE,
      ...(q ? { q } : {}),
      ...(typeId ? { type_id: Number(typeId) } : {}),
      ...(status ? { status } : {}),
      sort: 'equipment_code',
      order: 'asc',
    }),
    [page, q, typeId, status],
  );

  const { data, error, loading } = useEquipmentList(params);

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
      { header: 'Type', accessor: 'type_name' },
      { header: 'Make', accessor: 'make' },
      {
        header: 'Calibration Due',
        accessor: 'next_cal_due_date',
        format: (val) => val || <span className="text-ink-soft">—</span>,
        className: (val) => calDueClass(val),
      },
      {
        header: 'Division',
        accessor: 'division_code',
        className: 'text-ink uppercase text-xs',
      },
      {
        header: 'Location',
        accessor: 'location_name',
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
        {canCreate ? (
          <Link to="/equipment/new">
            <Button variant="primary">
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              Add Equipment
            </Button>
          </Link>
        ) : null}
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
              aria-label="Filter by type"
              value={typeId}
              onChange={(e) => { setTypeId(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              {types.map((t) => (
                <option key={t.type_id} value={t.type_id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => alert('Advanced filters arrive in Phase 6.')}
            >
              <Filter size={14} strokeWidth={1.5} aria-hidden="true" />
              Advanced Filters
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                console.info('Export → Phase 7');
                alert('Export will be available in Phase 7.');
              }}
            >
              <Download size={14} strokeWidth={1.5} aria-hidden="true" />
              Export
            </Button>
          </div>
          <div className="text-xs text-ink-soft">
            {loading ? (
              <span>Loading…</span>
            ) : (
              <span>
                Showing <span className="font-medium text-ink">{shownItems}</span>{' '}
                of <span className="font-medium text-ink">{totalItems}</span> items
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load equipment: {error?.response?.data?.error?.message || error?.message || 'Unknown error.'}
        </div>
      ) : null}

      {/* ── Table ────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyField="equipment_id"
        loading={loading}
        emptyMessage={
          q || typeId || status
            ? 'No equipment matches your filters.'
            : 'No equipment registered yet.'
        }
      />

      {/* ── Pagination ───────────────────────────────────── */}
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
    </div>
  );
}
