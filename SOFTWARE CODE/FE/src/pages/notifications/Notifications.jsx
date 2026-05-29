// ============================================================================
// src/pages/notifications/Notifications.jsx  —  Full notifications page
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// Long-form view of the bell dropdown. Adds:
//   • pagination
//   • unread-only toggle
//   • per-row mark-read + bulk mark-all-read
//   • deep-link navigation on click
//
// Permission gate is applied at the route level (App.jsx) via
// requiredPermission='notifications:read-own', so View-Only users can't
// even reach this URL. The hook re-checks defensively.
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  ClipboardList,
  Wrench
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';

import { Layout } from '../../components/Layout.jsx';
import {
  useNotificationList,
  useNotificationActions,
} from '../../lib/hooks/useNotifications.js';

dayjs.extend(relativeTime);

const PAGE_SIZE = 25;

/**
 * Classifies a notification into a visual category based on content and link.
 */
function getNotificationCategory(n) {
  const link = n.deep_link || '';
  const title = (n.title || '').toLowerCase();
  
  if (link.startsWith('/job-requests') || link.startsWith('/conversion') || title.includes('request') || title.includes('submit')) {
    return {
      type: 'job_request',
      label: 'Job Request',
      colorClass: 'text-sky-700 bg-sky-50 border-sky-100/50',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100/50',
      indicatorColor: 'bg-sky-500',
    };
  }
  if (link.startsWith('/job-cards') || title.includes('card') || title.includes('calib') || title.includes('repair')) {
    return {
      type: 'job_card',
      label: 'Job Card',
      colorClass: 'text-violet-700 bg-violet-50 border-violet-100/50',
      iconBg: 'bg-violet-50 text-violet-600 border border-violet-100/50',
      indicatorColor: 'bg-violet-500',
    };
  }
  if (link.startsWith('/equipment') || title.includes('equip') || title.includes('instrument') || title.includes('verify')) {
    return {
      type: 'equipment',
      label: 'Equipment',
      colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-100/50',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100/50',
      indicatorColor: 'bg-emerald-500',
    };
  }
  return {
    type: 'general',
    label: 'Notification',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-100/50',
    iconBg: 'bg-amber-50 text-amber-600 border border-amber-100/50',
    indicatorColor: 'bg-amber-500',
  };
}

export function Notifications() {
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { rows, total, unread, loading, error } = useNotificationList({
    unreadOnly, page, page_size: PAGE_SIZE,
  });
  const { markOne, markAll, marking } = useNotificationActions();

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  function activate(n) {
    if (!n.is_read) markOne.mutate(n.id);
    if (n.deep_link) navigate(n.deep_link);
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto font-sans">
        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <Bell size={20} strokeWidth={2} aria-hidden="true" />
              </div>
              Notifications Inbox
            </h1>
            <p className="mt-2 text-xs font-medium text-ink-soft/90 max-w-2xl leading-relaxed">
              Real-time workspace logs and event telemetry. Click any record card to interact directly with the related Job Request, Card, or Equipment detail.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Premium segmented control for filtering */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/40 select-none">
              <button
                type="button"
                onClick={() => { setUnreadOnly(false); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  !unreadOnly
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-ink-soft/85 hover:text-ink'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setUnreadOnly(true); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                  unreadOnly
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-ink-soft/85 hover:text-ink'
                )}
              >
                Unread
                {unread > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-danger text-white text-[9px] font-bold h-4 min-w-[16px] px-1 leading-none">
                    {unread}
                  </span>
                )}
              </button>
            </div>

            {/* Mark All Read Action */}
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={marking || unread === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-40 shadow-sm transition"
            >
              <CheckCheck size={14} strokeWidth={2} aria-hidden="true" />
              Mark All Read
            </button>
          </div>
        </div>

        {/* ── Dynamic Grouped List with Spaced Out Cards ──────────────────────────────── */}
        {loading ? (
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white px-6 py-16 text-center text-xs font-bold text-ink-soft flex items-center justify-center gap-2.5 font-sans">
            <svg className="animate-spin h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Retrieving Notifications...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white px-6 py-12 text-center text-xs font-bold text-danger font-sans">
            {error.response?.data?.error?.message || error.message || 'Failed to load notifications.'}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white px-6 py-20 text-center font-sans">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-ink-soft/45 border border-slate-100 mb-4">
              <Bell size={22} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="text-xs font-bold text-ink-soft">
              {unreadOnly ? 'No unread notifications to review.' : 'Your inbox is empty.'}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((n, idx) => {
              const isEven = idx % 2 === 0;
              const cat = getNotificationCategory(n);
              const Icon = cat.type === 'job_request' ? FileText :
                           cat.type === 'job_card' ? ClipboardList :
                           cat.type === 'equipment' ? Wrench : Bell;

              // High contrast alternating backgrounds for read/unread entries
              let rowBg = '';
              if (n.is_read) {
                rowBg = isEven 
                  ? 'bg-slate-100/90 hover:bg-slate-200/60' 
                  : 'bg-white hover:bg-slate-100/50';
              } else {
                if (cat.type === 'job_request') {
                  rowBg = isEven 
                    ? 'bg-sky-100/70 hover:bg-sky-200/60' 
                    : 'bg-sky-50/40 hover:bg-sky-100/40';
                } else if (cat.type === 'job_card') {
                  rowBg = isEven 
                    ? 'bg-violet-100/70 hover:bg-violet-200/60' 
                    : 'bg-violet-50/40 hover:bg-violet-100/40';
                } else if (cat.type === 'equipment') {
                  rowBg = isEven 
                    ? 'bg-emerald-100/70 hover:bg-emerald-200/60' 
                    : 'bg-emerald-50/40 hover:bg-emerald-100/40';
                } else {
                  rowBg = isEven 
                    ? 'bg-amber-100/70 hover:bg-amber-200/60' 
                    : 'bg-amber-50/40 hover:bg-amber-100/40';
                }
              }

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => activate(n)}
                  className={clsx(
                    'group relative w-full text-left px-6 py-5 flex items-start gap-4 transition-all duration-200 border border-slate-200/80 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.002] border-l-[5px] font-sans antialiased',
                    rowBg,
                    n.is_read ? 'border-l-transparent' : (
                      cat.type === 'job_request' ? 'border-l-sky-500' :
                      cat.type === 'job_card' ? 'border-l-violet-500' :
                      cat.type === 'equipment' ? 'border-l-emerald-500' : 'border-l-amber-500'
                    )
                  )}
                >
                  {/* Category icon with color light contrast + pulsing status indicator dot */}
                  <div className="relative shrink-0">
                    <div className={clsx(
                      'h-9 w-9 rounded-lg flex items-center justify-center transition-all',
                      cat.iconBg
                    )}>
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    {!n.is_read && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className={clsx(
                          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                          cat.indicatorColor
                        )}></span>
                        <span className={clsx(
                          'relative inline-flex rounded-full h-2.5 w-2.5',
                          cat.indicatorColor
                        )}></span>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Unified font-sans typography */}
                      <span className={clsx(
                        'text-sm tracking-tight font-sans',
                        n.is_read ? 'text-ink-soft/90 font-medium' : 'text-ink font-bold',
                      )}>
                        {n.title}
                      </span>
                      
                      {/* Category Pill Tag */}
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-sans border',
                        cat.colorClass
                      )}>
                        {cat.label}
                      </span>
                    </div>

                    {n.body ? (
                      <div className="text-xs text-ink-soft/85 mt-1.5 leading-relaxed font-medium font-sans">
                        {n.body}
                      </div>
                    ) : null}

                    {/* Metadata telemetry details - strictly font-sans */}
                    <div className="flex items-center gap-2.5 text-[11px] text-ink-soft/50 font-bold mt-2.5 font-sans">
                      <span>{dayjs(n.created_at).format('YYYY-MM-DD HH:mm')}</span>
                      <span>·</span>
                      <span>{dayjs(n.created_at).fromNow()}</span>
                      {n.actor_employee_id ? (
                        <>
                          <span>·</span>
                          <span className="text-sky-600/80 font-semibold">by {n.actor_employee_id}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Pagination controls ───────────────────────────────── */}
        {total > PAGE_SIZE ? (
          <div className="flex items-center justify-between text-xs font-bold text-ink-soft px-1 select-none">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} records
            </span>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition"
              >
                <ChevronLeft size={14} strokeWidth={2} /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition"
              >
                Next <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
