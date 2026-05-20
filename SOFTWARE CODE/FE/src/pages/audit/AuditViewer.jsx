// ============================================================================
// src/pages/audit/AuditViewer.jsx  —  /audit route
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer (read-only)
//
// PAGE CHROME
//
//   Audit Log                                              [ ⬇ Export CSV ]
//   Immutable record of every state change across the system
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ All Actions | Identity & Access | Status Transitions                  │
//   └──────────────────────────────────────────────────────────────────────┘
//
//   ┌─ Filter bar ────────────────────────────────────────────────────────┐
//   │ Date From [____]  Date To [____]  Actor [____]                       │
//   │ Action [dropdown ▼] Entity Type [dropdown ▼] Entity ID [____]        │
//   │ Search [____]                                  [ Reset ] [ Apply ]  │
//   └─────────────────────────────────────────────────────────────────────┘
//
//   <DataTable> · click row → <AuditDetailDrawer />
//   <Pagination />
//
// FILTER URL SYNC
//   Every filter writes to react-router-dom's search params so the URL is
//   shareable / bookmarkable / refreshable. Initial state is read from
//   the URL on mount (one-shot, then react-query becomes the source of
//   truth).
//
// READ-ONLY UI
//   There is NO mutation control anywhere on this page. The detail drawer
//   shows fields + JSON pretty-print and is the only way to "act" — but
//   even that is just navigation (deep link) and CSV download.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download, Search as SearchIcon, RefreshCw, ScrollText, X as XIcon, Eye,
} from 'lucide-react';

import { Button }    from '../../components/ui/Button.jsx';
import { Input }     from '../../components/ui/Input.jsx';
import { Select }    from '../../components/ui/Select.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { useAuth }   from '../../lib/auth-context.jsx';
import { useAuditList, useAuditFilters } from '../../lib/hooks/useAuditLog.js';
import { downloadAuditCsv } from '../../lib/api/audit.js';
import { AuditDetailDrawer } from './AuditDetailDrawer.jsx';

const SOURCES = [
  { value: 'audit_log',   label: 'All Actions' },
  { value: 'identity',    label: 'Identity & Access' },
  { value: 'transitions', label: 'Status Transitions' },
];

const DEFAULT_PAGE_SIZE = 25;

// One-place style mapping for the action badge — semantic colors keyed on
// the verb prefix so any new action plugs in automatically.
function actionBadgeStyle(action) {
  if (!action) return 'bg-base-elev text-ink-soft border border-border';
  if (/^JR_/.test(action))         return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (/^JC_/.test(action))         return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
  if (/^SCHEDULE_/.test(action))   return 'bg-purple-50 text-purple-700 border border-purple-200';
  if (/^PO_/.test(action))         return 'bg-amber-50 text-amber-800 border border-amber-200';
  if (/^SPARE_/.test(action))      return 'bg-amber-50 text-amber-800 border border-amber-200';
  if (/^EQUIPMENT_/.test(action))  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (/^USER_/.test(action))       return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (/^EMPLOYEE_/.test(action))   return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (/^PASSWORD_/.test(action))   return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-base text-ink-soft border border-border';
}


export function AuditViewer() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('audit:export');

  // ── URL ⇄ state plumbing ─────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFromUrl = useMemo(() => ({
    source:     searchParams.get('source')     || 'audit_log',
    from:       searchParams.get('from')       || '',
    to:         searchParams.get('to')         || '',
    actor:      searchParams.get('actor')      || '',
    action:     searchParams.get('action')     || '',
    entityType: searchParams.get('entityType') || '',
    entityId:   searchParams.get('entityId')   || '',
    q:          searchParams.get('q')          || '',
    page:       Number(searchParams.get('page')) || 1,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);    // one-shot read

  const [source,     setSource]     = useState(initialFromUrl.source);
  const [from,       setFrom]       = useState(initialFromUrl.from);
  const [to,         setTo]         = useState(initialFromUrl.to);
  const [actor,      setActor]      = useState(initialFromUrl.actor);
  const [action,     setAction]     = useState(initialFromUrl.action);
  const [entityType, setEntityType] = useState(initialFromUrl.entityType);
  const [entityId,   setEntityId]   = useState(initialFromUrl.entityId);
  const [q,          setQ]          = useState(initialFromUrl.q);
  const [page,       setPage]       = useState(initialFromUrl.page);

  // Drawer state — id + sub_source pair for the transitions UNION case.
  const [openRow, setOpenRow] = useState(null);

  // Reset filters when switching source tabs — dropdown choices differ.
  const switchSource = (s) => {
    setSource(s);
    setAction('');
    setEntityType('');
    setEntityId('');
    setPage(1);
  };

  // ── Build query params (memoised) ────────────────────────────────────
  const queryParams = useMemo(() => ({
    source,
    ...(from       ? { from }       : {}),
    ...(to         ? { to }         : {}),
    ...(actor      ? { actor }      : {}),
    ...(action     ? { action }     : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId   ? { entityId }   : {}),
    ...(q          ? { q }          : {}),
    page,
    page_size: DEFAULT_PAGE_SIZE,
  }), [source, from, to, actor, action, entityType, entityId, q, page]);

  // ── Sync URL whenever filters change ────────────────────────────────
  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v && v !== '' && v !== 'audit_log' /* default — omit for clean URLs */) {
        next.set(k, String(v));
      }
    });
    // Always preserve source explicitly so a deep-link to a non-default tab
    // re-opens the right tab on refresh.
    if (source !== 'audit_log') next.set('source', source);
    setSearchParams(next, { replace: true });
  }, [queryParams, source, setSearchParams]);


  // ── Data + filter dropdowns ──────────────────────────────────────────
  const { items, pagination, fetching, error, refetch } = useAuditList(queryParams);
  const { actions: actionOpts, entityTypes: entityTypeOpts } = useAuditFilters(source);


  // ── Export ──────────────────────────────────────────────────────────
  const onExport = async () => {
    try {
      const { rowCount, capped } = await downloadAuditCsv(queryParams);
      if (capped) {
        alert(`Export downloaded ${rowCount} rows — capped at the server row limit. Narrow your filters to capture older rows.`);
      }
    } catch (e) {
      console.error('Audit export failed', e);
      alert('Could not export audit data. Please try again.');
    }
  };

  const onReset = () => {
    setFrom(''); setTo(''); setActor(''); setAction('');
    setEntityType(''); setEntityId(''); setQ(''); setPage(1);
  };


  // ── Columns ────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      header: 'Timestamp',
      accessor: 'occurred_at',
      className: 'whitespace-nowrap text-ink',
    },
    {
      header: 'Actor',
      accessor: 'actor_name',
      format: (val, row) => (
        <div className="leading-tight">
          <div className="text-ink">{val || '—'}</div>
          <div className="text-[11px] text-ink-soft">
            {row.actor_employee_id}{row.actor_role_code ? ' · ' + row.actor_role_code : ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      format: (val) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-mono ${actionBadgeStyle(val)}`}>
          {val}
        </span>
      ),
    },
    { header: 'Entity Type', accessor: 'entity_type', className: 'text-ink-soft uppercase text-xs' },
    {
      header: 'Entity ID',
      accessor: 'entity_id',
      format: (val, row) => row.deep_link
        ? <a href={row.deep_link} className="text-accent hover:underline font-medium">{val}</a>
        : <span className="font-medium text-ink">{val}</span>,
    },
    { header: 'Summary', accessor: 'summary', className: 'text-ink-soft' },
    { header: 'IP', accessor: 'ip_address', className: 'text-[11px] text-ink-soft font-mono' },
    {
      header: '',
      accessor: 'id',
      format: (_v, row) => (
        <button
          type="button"
          onClick={() => setOpenRow(row)}
          className="text-accent hover:underline text-sm inline-flex items-center gap-1"
          aria-label="View detail"
        >
          <Eye size={14} strokeWidth={1.75} aria-hidden="true" />
          View
        </button>
      ),
    },
  ], []);


  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink inline-flex items-center gap-2">
            <ScrollText size={22} strokeWidth={1.75} aria-hidden="true" />
            Audit Log
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Immutable record of every state change across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={fetching}>
            <RefreshCw size={14} strokeWidth={1.5} className={fetching ? 'animate-spin' : undefined} />
            Refresh
          </Button>
          {canExport ? (
            <Button variant="secondary" onClick={onExport}>
              <Download size={16} strokeWidth={1.75} aria-hidden="true" />
              Export CSV
            </Button>
          ) : null}
        </div>
      </div>

      {/* Source tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6" aria-label="Audit source tabs">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => switchSource(s.value)}
              className={
                'pb-3 -mb-px text-sm font-semibold transition-colors ' +
                (source === s.value
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-ink-soft hover:text-ink')
              }
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filter strip */}
      <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-ink-soft mb-1">Date From</label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-ink-soft mb-1">Date To</label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-ink-soft mb-1">Actor (employee_id)</label>
            <Input value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }} placeholder="e.g. SA79900" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-ink-soft mb-1">Action</label>
            <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {actionOpts.map((a) => (
                <option key={a.value} value={a.value}>{a.value}{a.n != null ? ` (${a.n})` : ''}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-ink-soft mb-1">Entity Type</label>
            <Select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {entityTypeOpts.map((et) => (
                <option key={et.value} value={et.value}>{et.value}{et.n != null ? ` (${et.n})` : ''}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <label className="block text-xs text-ink-soft mb-1">Entity ID</label>
            <Input value={entityId} onChange={(e) => { setEntityId(e.target.value); setPage(1); }} placeholder="exact match" />
          </div>
          <div className="md:col-span-6 relative">
            <label className="block text-xs text-ink-soft mb-1">Search</label>
            <SearchIcon size={14} strokeWidth={1.5} className="absolute left-3 top-[34px] text-ink-soft" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="across action / entity / notes" className="pl-9" />
          </div>
          <div className="md:col-span-3 flex items-end justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onReset}>
              <XIcon size={14} strokeWidth={1.75} />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load audit log: {error?.response?.data?.error?.message || error?.message || 'Unknown error.'}
        </div>
      ) : null}

      {/* Table */}
      <DataTable
        columns={columns}
        rows={items}
        keyField="id"
        loading={fetching}
        emptyMessage="No audit rows match your filters."
      />

      {/* Pagination + count */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-soft">
          {pagination ? (
            <>Showing page <span className="font-medium text-ink">{pagination.page}</span> of <span className="font-medium text-ink">{pagination.total_pages}</span> · <span className="font-medium text-ink">{pagination.total_items}</span> total rows</>
          ) : <>&nbsp;</>}
        </div>
        <Pagination
          currentPage={pagination?.page || 1}
          totalPages={pagination?.total_pages || 1}
          onPageChange={setPage}
        />
      </div>

      {/* Detail drawer */}
      {openRow ? (
        <AuditDetailDrawer
          row={openRow}
          onClose={() => setOpenRow(null)}
        />
      ) : null}
    </div>
  );
}
