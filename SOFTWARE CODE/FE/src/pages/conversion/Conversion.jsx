// ============================================================================
// src/pages/conversion/Conversion.jsx  —  /conversion route
// ----------------------------------------------------------------------------
// LIC + SA workspace for turning SUBMITTED Job Requests into Job Cards.
//
// LAYOUT (matches image-9..10):
//   Conversion
//   Accept job requests and assign workflow, timeline, and resources
//
//   [Calibration (3)] [Inspection (2)] [Master Data Correction (2)]
//   ── tab strip ──────────────────────────────────────────────────
//
//   [🔍 Search by Job ID, Equipment, or Submitted By…]    [⚙ Filter]
//
//   ┌─────────────────────────────────────────────────────────────────┐
//   │ Job ID  Equipment  Division  Submitted By  Date  Status  Actions │
//   │ ...                                                             │
//   └─────────────────────────────────────────────────────────────────┘
//
// EACH ACTION:
//   ✓ → opens ConvertToJobCardModal pre-filled with the row's JR
//   👁 → navigates to /job-requests/:id (same tab; back-button returns)
//   ✗ → opens RejectModal
//
// CACHE / POLLING:
//   • useConversionList polls every 30s so badge counts + tab table
//     stay near-live during batch processing.
//   • Both modals call onSuccess → invalidate caches + refetch.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, Filter as FilterIcon } from 'lucide-react';

import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

import { ConversionTabs, CONVERSION_TABS } from './components/ConversionTabs.jsx';
import { ConversionTable } from './components/ConversionTable.jsx';
import { ConvertToJobCardModal } from './components/ConvertToJobCardModal.jsx';
import { RejectModal } from './components/RejectModal.jsx';

import { useConversionList, invalidateConversionList } from '../../lib/hooks/useConversionList.js';
import { invalidateEngineersLookup } from '../../lib/hooks/useEngineersLookup.js';
import { invalidateJobRequestDetail } from '../../lib/hooks/useJobRequestDetail.js';
import { invalidateJobRequestHistory } from '../../lib/hooks/useJobRequestHistory.js';
import { invalidateJobRequestCache } from '../../lib/hooks/useJobRequestList.js';

const PAGE_SIZE = 25;

export function Conversion() {
  // ── Tab + filter state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('CALIBRATION');
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounce q input by 300ms — one request per change, not per keystroke.
  const debTimer = useRef(null);
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => debTimer.current && clearTimeout(debTimer.current);
  }, [qInput]);

  // Reset pagination when tab or filter changes.
  useEffect(() => { setPage(1); }, [activeTab, dateFrom, dateTo]);

  // ── Data: active tab + sibling tabs (for badge counts) ──────────
  // We need a count for each of the three tabs even though the user
  // only views one at a time. Hook fires 3 requests but each is cheap
  // (status+job_type both indexed, ≤ a few hundred rows on a busy day).
  // Page=1, page_size=25 — pagination metadata gives us total_items.
  const calibrationParams = useMemo(() => ({
    jobType: 'CALIBRATION', page: activeTab === 'CALIBRATION' ? page : 1,
    pageSize: PAGE_SIZE,
    q: activeTab === 'CALIBRATION' ? q : undefined,
    dateFrom: activeTab === 'CALIBRATION' ? dateFrom : undefined,
    dateTo:   activeTab === 'CALIBRATION' ? dateTo   : undefined,
  }), [activeTab, page, q, dateFrom, dateTo]);

  const repairParams = useMemo(() => ({
    jobType: 'REPAIR', page: activeTab === 'REPAIR' ? page : 1,
    pageSize: PAGE_SIZE,
    q: activeTab === 'REPAIR' ? q : undefined,
    dateFrom: activeTab === 'REPAIR' ? dateFrom : undefined,
    dateTo:   activeTab === 'REPAIR' ? dateTo   : undefined,
  }), [activeTab, page, q, dateFrom, dateTo]);

  const registrationParams = useMemo(() => ({
    jobType: 'REGISTRATION', page: activeTab === 'REGISTRATION' ? page : 1,
    pageSize: PAGE_SIZE,
    q: activeTab === 'REGISTRATION' ? q : undefined,
    dateFrom: activeTab === 'REGISTRATION' ? dateFrom : undefined,
    dateTo:   activeTab === 'REGISTRATION' ? dateTo   : undefined,
  }), [activeTab, page, q, dateFrom, dateTo]);

  const cal = useConversionList(calibrationParams);
  const rep = useConversionList(repairParams);
  const reg = useConversionList(registrationParams);

  const tabHook = activeTab === 'CALIBRATION' ? cal
                 : activeTab === 'REPAIR'      ? rep
                 : reg;

  const counts = {
    CALIBRATION:  cal?.data?.pagination?.total_items ?? null,
    REPAIR:       rep?.data?.pagination?.total_items ?? null,
    REGISTRATION: reg?.data?.pagination?.total_items ?? null,
  };

  // ── Modal state ────────────────────────────────────────────────
  const [convertRow, setConvertRow] = useState(null);
  const [rejectRow,  setRejectRow]  = useState(null);

  function handleAfterMutation(rowId) {
    invalidateConversionList();
    invalidateEngineersLookup();
    invalidateJobRequestCache();
    if (rowId) {
      invalidateJobRequestDetail(rowId);
      invalidateJobRequestHistory(rowId);
    }
    // Forcing a re-render with a state ping is the simplest way to
    // trigger the hooks' useEffect on next tick (the cache was just
    // cleared so they'll refetch).
    setPage((p) => p);
  }

  return (
    <div className="space-y-4">
      {/* ── Page header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-ink">Conversion</h1>
        <p className="text-sm text-ink-soft mt-1">
          Accept job requests and assign workflow, timeline, and resources.
        </p>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <ConversionTabs
        active={activeTab}
        onChange={setActiveTab}
        counts={counts}
      />

      {/* ── Filter strip ───────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border shadow-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-9">
            <label htmlFor="conv-q" className="sr-only">Search</label>
            <div className="relative">
              <SearchIcon
                size={16} strokeWidth={1.5} aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <Input
                id="conv-q"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search by Job ID, Equipment, or Submitted By…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <FilterIcon size={14} strokeWidth={1.5} aria-hidden="true" />
              Filter {filtersOpen ? '(open)' : ''}
            </Button>
          </div>
        </div>
        {filtersOpen ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border-t border-border pt-3">
            <div className="md:col-span-6">
              <label htmlFor="conv-df" className="block text-xs font-medium text-ink mb-1">Date from</label>
              <Input
                id="conv-df"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="md:col-span-6">
              <label htmlFor="conv-dt" className="block text-xs font-medium text-ink mb-1">Date to</label>
              <Input
                id="conv-dt"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Error banner ───────────────────────────────────────── */}
      {tabHook.error ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          Could not load list: {tabHook.error?.response?.data?.error?.message || tabHook.error?.message || 'Unknown error.'}
        </div>
      ) : null}

      {/* ── Table ─────────────────────────────────────────────── */}
      <ConversionTable
        rows={tabHook?.data?.items ?? []}
        loading={tabHook.loading}
        onConvert={(row) => setConvertRow(row)}
        onReject={(row)  => setRejectRow(row)}
      />

      {/* ── Modals ────────────────────────────────────────────── */}
      {convertRow ? (
        <ConvertToJobCardModal
          jr={convertRow}
          onClose={() => setConvertRow(null)}
          onSuccess={(_payload) => {
            const id = convertRow.id;
            setConvertRow(null);
            handleAfterMutation(id);
          }}
        />
      ) : null}

      {rejectRow ? (
        <RejectModal
          jr={rejectRow}
          onClose={() => setRejectRow(null)}
          onSuccess={() => {
            const id = rejectRow.id;
            setRejectRow(null);
            handleAfterMutation(id);
          }}
        />
      ) : null}
    </div>
  );
}
