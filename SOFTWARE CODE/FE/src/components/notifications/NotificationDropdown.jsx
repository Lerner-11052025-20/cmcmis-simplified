// ============================================================================
// src/components/notifications/NotificationDropdown.jsx
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications dropdown anchored to the TopBar bell.
//
//   ┌─────────────────────────────────────────────┐
//   │ Notifications                  Mark all read │
//   ├─────────────────────────────────────────────┤
//   │ [●] Job Card complete · JC-2026-24219       │
//   │     Awaiting verification        5 min ago   │
//   │ ─────────────────────────────────────────── │
//   │ [ ] Draft saved · JR-2026-24287             │
//   │     Your Job Request was saved   1 h ago     │
//   ├─────────────────────────────────────────────┤
//   │            See all notifications →           │
//   └─────────────────────────────────────────────┘
//
// BEHAVIOUR
//   • Renders up to 10 newest notifications (we don't paginate inside
//     the dropdown — the /notifications page is the long-form view).
//   • Unread rows show a coloured dot + slight bg tint.
//   • Click a row → markRead + navigate to its deep_link.
//   • "Mark all read" mass-resolves; "See all" navigates to /notifications.
//   • Outside-click + Escape close (handled by the parent TopBar wrapper).
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { Check, CheckCheck, X } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';

import {
  useNotificationList,
  useNotificationActions,
} from '../../lib/hooks/useNotifications.js';

dayjs.extend(relativeTime);

export function NotificationDropdown({ onClose }) {
  const navigate = useNavigate();
  const { rows, total, unread, loading, error } = useNotificationList({ page: 1, page_size: 10 });
  const { markOne, markAll, marking } = useNotificationActions();

  function activate(n) {
    if (!n.is_read) markOne.mutate(n.id);
    if (n.deep_link) {
      onClose?.();
      navigate(n.deep_link);
    }
  }

  return (
    <div className="w-96 max-w-[95vw] rounded-lg border border-border bg-white shadow-lg overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="text-sm font-semibold text-ink">
          Notifications
          {unread > 0 ? (
            <span className="ml-2 inline-flex items-center rounded-full bg-danger/10 text-danger px-2 py-0.5 text-[11px] font-medium">
              {unread} unread
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={marking || unread === 0}
            className="inline-flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink px-2 py-1 rounded hover:bg-base disabled:opacity-40"
            title="Mark all as read"
          >
            <CheckCheck size={13} strokeWidth={1.75} aria-hidden="true" />
            Mark all
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-soft hover:text-ink hover:bg-base"
          >
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────── */}
      <div className="max-h-96 overflow-y-auto divide-y divide-border">
        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-ink-soft">Loading…</div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-xs text-red-700">
            {error.response?.data?.error?.message || error.message || 'Failed to load'}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-ink-soft">
            You're all caught up.
          </div>
        ) : (
          rows.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => activate(n)}
              className={clsx(
                'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
                n.is_read ? 'hover:bg-base' : 'bg-accent/5 hover:bg-accent/10',
              )}
            >
              {/* Unread dot */}
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
                  <div className="text-[11px] text-ink-soft mt-0.5 line-clamp-2">
                    {n.body}
                  </div>
                ) : null}
                <div className="text-[10px] text-ink-mute mt-1">
                  {dayjs(n.created_at).fromNow()}
                </div>
              </div>
              {!n.is_read ? (
                <Check
                  size={14}
                  strokeWidth={1.5}
                  className="text-ink-soft opacity-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          ))
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => { onClose?.(); navigate('/notifications'); }}
          className="w-full px-4 py-2.5 text-xs text-accent font-medium hover:bg-base transition-colors"
        >
          See all notifications ({total.toLocaleString()})
        </button>
      </div>
    </div>
  );
}
