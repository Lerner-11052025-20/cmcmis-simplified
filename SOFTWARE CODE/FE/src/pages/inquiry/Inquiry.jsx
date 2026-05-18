// ============================================================================
// src/pages/inquiry/Inquiry.jsx  —  /inquiry tab orchestrator
// ----------------------------------------------------------------------------
// Doctrine 10: URL is the source of truth. Every interaction (tab change,
// search edit, page change, type filter) updates `?tab=&q=&page=&type=` so:
//   • a refresh restores the exact state,
//   • bookmarks survive,
//   • back/forward navigation is well-defined.
//
// Each tab keeps its own local `q` debounce state, but it is reflected
// back to the URL on every keystroke (replace mode — no history pollution).
// ============================================================================

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../../components/Layout.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { INQUIRY_TABS } from '../../lib/schemas/inquirySchemas.js';
import { InquiryTabs } from './InquiryTabs.jsx';
import { VendorTab } from './VendorTab.jsx';
import { ProductTab } from './ProductTab.jsx';
import { JobCardTab } from './JobCardTab.jsx';
import { InstrumentTab } from './InstrumentTab.jsx';

// ── Default page size locked to 10 (P8-D12) ───────────────────────────
const DEFAULT_PAGE_SIZE = 10;

// ── Page-size sanitiser (defence in depth against URL tampering) ──────
function sanitisePageSize(raw) {
  const n = Number(raw);
  return n === 10 || n === 25 ? n : DEFAULT_PAGE_SIZE;
}

function sanitisePage(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 10_000) : 1;
}

// ── Tab gate — returns first allowed tab if requested tab isn't visible ─
function resolveActiveTab(requested, hasPermission) {
  const visible = INQUIRY_TABS.filter((t) => hasPermission(t.permission));
  if (visible.length === 0) return null;
  const found = visible.find((t) => t.id === requested);
  return found ? found.id : visible[0].id;
}

export function Inquiry() {
  const { user, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Read URL state (single source of truth) ─────────────────────────
  const requestedTab = searchParams.get('tab') || 'vendors';
  const activeTab    = resolveActiveTab(requestedTab, hasPermission);
  const q            = searchParams.get('q') || '';
  const page         = sanitisePage(searchParams.get('page') || '1');
  const pageSize     = sanitisePageSize(searchParams.get('page_size') || '10');
  const type         = searchParams.get('type') || undefined;

  // If the URL referenced a tab the user can't see, bounce them to a tab they can.
  useEffect(() => {
    if (activeTab && activeTab !== requestedTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
    // We only want this effect to fire when the active tab is "fixed up".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, requestedTab]);

  // ── URL writers — collapse all updates through one helper ────────────
  // patchObj = { q?: string, page?: number, type?: string|undefined, tab?: string }
  const patchUrl = useCallback((patchObj) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patchObj)) {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Changing the tab clears query + page + type (each tab has its own search context).
  const onTabChange = useCallback((id) => {
    patchUrl({ tab: id, q: undefined, page: undefined, type: undefined });
  }, [patchUrl]);

  // Search input — reset page to 1 on every keystroke so the user always
  // sees the first page of the new search.
  const onQChange = useCallback((newQ) => {
    patchUrl({ q: newQ, page: undefined });
  }, [patchUrl]);

  const onPageChange = useCallback((p) => {
    patchUrl({ page: p === 1 ? undefined : p });
  }, [patchUrl]);

  const onTypeChange = useCallback((newType) => {
    patchUrl({ type: newType, page: undefined });
  }, [patchUrl]);

  if (!user) return null;
  if (!activeTab) {
    return (
      <Layout>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          You do not have permission to view any Inquiry tab.
        </div>
      </Layout>
    );
  }

  // ── Render active tab ────────────────────────────────────────────────
  const tabProps = {
    q,
    onQChange,
    page,
    onPageChange,
    pageSize,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inquiry</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Search and lookup information across the system
          </p>
        </div>

        <InquiryTabs activeTab={activeTab} onChange={onTabChange} />

        {activeTab === 'vendors' && (
          <VendorTab {...tabProps} type={type} onTypeChange={onTypeChange} />
        )}
        {activeTab === 'products' && <ProductTab {...tabProps} />}
        {activeTab === 'job-cards' && <JobCardTab {...tabProps} />}
        {activeTab === 'instruments' && <InstrumentTab {...tabProps} />}
      </div>
    </Layout>
  );
}
