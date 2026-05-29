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
import { Search, Tag, Users, Box } from 'lucide-react';
import clsx from 'clsx';
import { Layout } from '../../components/Layout.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { INQUIRY_TABS } from '../../lib/schemas/inquirySchemas.js';
import { InquiryTabs } from './InquiryTabs.jsx';
import { VendorTab } from './VendorTab.jsx';
import { ProductTab } from './ProductTab.jsx';
import { JobCardTab } from './JobCardTab.jsx';
import { InstrumentTab } from './InstrumentTab.jsx';

// ── Custom Local KPI Card ─────────────────────────────────────────────
function LocalKpiCard({ label, value, icon: Icon, accent, subtitle, loading }) {
  const ACCENT_COLORS = {
    indigo:  { bg: 'bg-indigo-50/60',   text: 'text-indigo-600',   topBorder: 'border-t-indigo-500/80',  glow: 'hover:shadow-[0_20px_25px_-5px_rgba(79,93,255,0.06)] hover:border-indigo-200', indicator: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50/60', text: 'text-emerald-600', topBorder: 'border-t-emerald-500/80', glow: 'hover:shadow-[0_20px_25px_-5px_rgba(16,185,129,0.06)] hover:border-emerald-200', indicator: 'bg-emerald-500' },
    rose:    { bg: 'bg-rose-50/60',    text: 'text-rose-600',    topBorder: 'border-t-rose-500/80',    glow: 'hover:shadow-[0_20px_25px_-5px_rgba(244,63,94,0.06)] hover:border-rose-200',   indicator: 'bg-rose-500' },
    amber:   { bg: 'bg-amber-50/60',   text: 'text-amber-600',   topBorder: 'border-t-amber-500/80',   glow: 'hover:shadow-[0_20px_25px_-5px_rgba(245,158,11,0.06)] hover:border-amber-200', indicator: 'bg-amber-500' },
  };

  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.indigo;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/40 border-t-[4px] border-t-slate-200 p-5 animate-pulse flex flex-col font-sans">
        <div className="w-10 h-10 rounded-xl bg-slate-100/80" />
        <div className="mt-4 h-7 w-16 bg-slate-100 rounded" />
        <div className="mt-2.5 h-3 w-28 bg-slate-100 rounded" />
        <div className="mt-2 h-2.5 w-32 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group bg-white rounded-2xl border border-slate-200/50 p-5 border-t-[4px] transition-all duration-300 shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-lg font-sans antialiased',
        color.topBorder,
        color.glow,
        'hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between">
        <div className={clsx('inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all duration-300 group-hover:scale-105', color.bg)}>
          <Icon size={18} strokeWidth={2} className={color.text} />
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors duration-300" />
      </div>

      <div className="mt-4 text-2xl font-bold tracking-tight text-slate-800 font-sans leading-none transition-colors duration-300">
        {value}
      </div>
      
      <div className="mt-2 text-xs font-semibold text-slate-500 font-sans">
        {label}
      </div>
      
      <div className="mt-1.5 text-xs text-slate-400 font-medium font-sans flex items-center gap-1.5 leading-relaxed">
        <span className={clsx("h-1 w-1 rounded-full shrink-0", color.indicator)} />
        {subtitle}
      </div>
    </div>
  );
}

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
      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LocalKpiCard
          label="Catalog Index"
          value="1.4k"
          icon={Box}
          accent="indigo"
          subtitle="Total instruments cataloged for search"
        />
        <LocalKpiCard
          label="Daily Queries"
          value="128"
          icon={Search}
          accent="emerald"
          subtitle="Search queries executed today"
        />
        <LocalKpiCard
          label="Connected Vendors"
          value="42"
          icon={Users}
          accent="rose"
          subtitle="Active supplier & manufacturer records"
        />
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
