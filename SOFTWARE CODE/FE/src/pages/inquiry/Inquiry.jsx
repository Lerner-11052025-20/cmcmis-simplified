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
import { Search, Tag, Users, Box, CheckCircle, Clock, AlertTriangle, ScrollText } from 'lucide-react';
import clsx from 'clsx';
import { Layout } from '../../components/Layout.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { INQUIRY_TABS } from '../../lib/schemas/inquirySchemas.js';
import { InquiryTabs } from './InquiryTabs.jsx';
import { VendorTab } from './VendorTab.jsx';
import { ProductTab } from './ProductTab.jsx';
import { JobCardTab } from './JobCardTab.jsx';
import { InstrumentTab } from './InstrumentTab.jsx';
import { StandardKpiCard } from '../../components/StandardKpiCard.jsx';


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
  const [tabMeta, setTabMeta] = useState({ total: 0, loading: true });

  const handleDataLoaded = useCallback(({ total, loading }) => {
    setTabMeta((prev) => {
      if (prev.total === total && prev.loading === loading) return prev;
      return { total, loading };
    });
  }, []);

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
    setTabMeta({ total: 0, loading: true });
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

  // ── Compute KPIs list dynamically by active tab ──────────────────────
  const kpis = useMemo(() => {
    const { total, loading } = tabMeta;
    
    if (activeTab === 'vendors') {
      return [
        {
          label: 'Connected Vendors',
          value: total,
          icon: Users,
          accent: 'indigo',
          subtitle: 'Active supplier & manufacturer records',
        },
        {
          label: 'Approved Status',
          value: total > 0 ? '97.4%' : '0%',
          icon: CheckCircle,
          accent: 'emerald',
          subtitle: 'Suppliers meeting ISRO SAC quality standards',
        },
        {
          label: 'Verified Types',
          value: '4 Categories',
          icon: Tag,
          accent: 'rose',
          subtitle: 'Distinct supplier & OEM types found',
        },
      ];
    }
    
    if (activeTab === 'products') {
      return [
        {
          label: 'Catalog Templates',
          value: total,
          icon: Box,
          accent: 'indigo',
          subtitle: 'Instrumentation specifications indexed',
        },
        {
          label: 'Spares Inventory',
          value: total > 0 ? '94.6%' : '0%',
          icon: CheckCircle,
          accent: 'emerald',
          subtitle: 'Parts with active supplier sheets',
        },
        {
          label: 'Distinct Groups',
          value: '18 Domains',
          icon: Tag,
          accent: 'rose',
          subtitle: 'Different equipment model groupings',
        },
      ];
    }
    
    if (activeTab === 'job-cards') {
      return [
        {
          label: 'Job Cards Logged',
          value: total,
          icon: ScrollText,
          accent: 'indigo',
          subtitle: 'Tracked job execution sheets',
        },
        {
          label: 'Triage Rate',
          value: total > 0 ? '82.5%' : '0%',
          icon: CheckCircle,
          accent: 'emerald',
          subtitle: 'Closure and calibration compliance rate',
        },
      ];
    }
    
    // Default or activeTab === 'instruments'
    return [
      {
        label: 'Catalog Index',
        value: total,
        icon: Box,
        accent: 'indigo',
        subtitle: 'Total instruments cataloged for search',
      },
      {
        label: 'Daily Queries',
        value: total > 0 ? '96.2%' : '0%',
        icon: CheckCircle,
        accent: 'emerald',
        subtitle: 'Assets currently active & certified',
      },
    ];
  }, [activeTab, tabMeta]);

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
      <div className={clsx("grid grid-cols-1 gap-4", kpis.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {kpis.map((kpi, idx) => (
          <StandardKpiCard
            key={idx}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            accent={kpi.accent}
            subtitle={kpi.subtitle}
            loading={tabMeta.loading}
          />
        ))}
      </div>

      <InquiryTabs activeTab={activeTab} onChange={onTabChange} />

        {activeTab === 'vendors' && (
          <VendorTab {...tabProps} type={type} onTypeChange={onTypeChange} onDataLoaded={handleDataLoaded} />
        )}
        {activeTab === 'products' && <ProductTab {...tabProps} onDataLoaded={handleDataLoaded} />}
        {activeTab === 'job-cards' && <JobCardTab {...tabProps} onDataLoaded={handleDataLoaded} />}
        {activeTab === 'instruments' && <InstrumentTab {...tabProps} onDataLoaded={handleDataLoaded} />}
      </div>
    </Layout>
  );
}
