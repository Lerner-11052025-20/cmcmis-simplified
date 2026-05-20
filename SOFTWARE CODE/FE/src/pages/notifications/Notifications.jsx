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
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
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
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink flex items-center gap-2">
              <Bell size={22} strokeWidth={1.5} aria-hidden="true" />
              Notifications
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Every workflow event you're involved in lands here. Click a row to
              open the related Job Request or Job Card.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
                className="rounded border-border focus:ring-accent"
              />
              Unread only
              {unread > 0 ? (
                <span className="inline-flex items-center rounded-full bg-danger/10 text-danger px-2 py-0.5 text-[10px] font-medium tabular-nums">
                  {unread}
                </span>
              ) : null}
            </label>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={marking || unread === 0}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-base px-3 py-2 text-xs text-ink hover:bg-base-elev focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-40"
            >
              <CheckCheck size={14} strokeWidth={1.75} aria-hidden="true" />
              Mark all as read
            </button>
          </div>
        </div>

        {/* ── List ──────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-base-elev divide-y divide-border">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-ink-soft">Loading…</div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-sm text-red-700">
              {error.response?.data?.error?.message || error.message || 'Failed to load'}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Bell size={32} strokeWidth={1.25} aria-hidden="true" className="mx-auto text-ink-soft mb-3" />
              <div className="text-sm text-ink-soft">
                {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
              </div>
            </div>
          ) : (
            rows.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => activate(n)}
                className={clsx(
                  'w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors',
                  n.is_read ? 'hover:bg-base' : 'bg-accent/5 hover:bg-accent/10',
                )}
              >
                <span className={clsx(
                  'mt-1.5 h-2 w-2 rounded-full shrink-0',
                  n.is_read ? 'bg-transparent border border-border' : 'bg-accent',
                )} />
                <div className="flex-1 min-w-0">
                  <div className={clsx(
                    'text-sm leading-snug',
                    n.is_read ? 'text-ink-soft' : 'text-ink font-medium',
                  )}>
                    {n.title}
                  </div>
                  {n.body ? (
                    <div className="text-xs text-ink-soft mt-0.5">
                      {n.body}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3 text-[11px] text-ink-mute mt-1.5">
                    <span>{dayjs(n.created_at).format('YYYY-MM-DD HH:mm')}</span>
                    <span>·</span>
                    <span>{dayjs(n.created_at).fromNow()}</span>
                    {n.actor_employee_id ? (
                      <>
                        <span>·</span>
                        <span>by {n.actor_employee_id}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── Pagination ─────────────────────────────────────────── */}
        {total > PAGE_SIZE ? (
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span>
              Page {page} of {totalPages} · <span className="tabular-nums">{total.toLocaleString()}</span> total
            </span>
            <span className="inline-flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-base px-2 py-1 hover:bg-base-elev disabled:opacity-50"
              >
                <ChevronLeft size={14} strokeWidth={1.5} /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-base px-2 py-1 hover:bg-base-elev disabled:opacity-50"
              >
                Next <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </span>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
