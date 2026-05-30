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
import { 
  Check, 
  CheckCheck, 
  X,
  FileText,
  ClipboardList,
  Wrench,
  Bell
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';

import {
  useNotificationList,
  useNotificationActions,
} from '../../lib/hooks/useNotifications.js';

dayjs.extend(relativeTime);

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
    <div className="w-96 max-w-[95vw] rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(15,23,42,0.15)] overflow-hidden font-sans">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 to-indigo-50/20 border-b border-slate-100">
        <div className="text-[13px] font-bold text-slate-800 flex items-center">
          Notifications
          {unread > 0 ? (
            <span className="ml-2 inline-flex items-center rounded-md bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              {unread} unread
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={marking || unread === 0}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100/80 active:scale-95 disabled:opacity-40 transition-all duration-150"
            title="Mark all as read"
          >
            <CheckCheck size={13} strokeWidth={2} aria-hidden="true" />
            Mark all
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all duration-150"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────── */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100/60 no-scrollbar">
        {loading ? (
          <div className="px-4 py-10 text-center text-xs font-semibold text-slate-400">Loading notifications...</div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-xs font-semibold text-red-600">
            {error.response?.data?.error?.message || error.message || 'Failed to load'}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs font-semibold text-slate-400">
            You're all caught up.
          </div>
        ) : (
          rows.map((n) => {
            const cat = getNotificationCategory(n);
            const Icon = cat.type === 'job_request' ? FileText :
                         cat.type === 'job_card' ? ClipboardList :
                         cat.type === 'equipment' ? Wrench : Bell;

            // Cohesive premium palette for row background and border colors
            let rowBgClass = '';
            let borderClass = 'border-transparent';

            if (n.is_read) {
              rowBgClass = 'bg-white hover:bg-slate-50/50';
            } else {
              rowBgClass = 'bg-indigo-50/20 hover:bg-indigo-50/45';
              borderClass = cat.type === 'job_request' ? 'border-sky-500' :
                            cat.type === 'job_card' ? 'border-violet-500' :
                            cat.type === 'equipment' ? 'border-emerald-500' : 'border-amber-500';
            }

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => activate(n)}
                className={clsx(
                  'w-full text-left px-5 py-4 flex items-start gap-3.5 transition-all border-l-[4px] font-sans antialiased relative',
                  rowBgClass,
                  borderClass
                )}
              >
                {/* Category icon with color light contrast + pulsing status indicator dot */}
                <div className="relative shrink-0 mt-0.5">
                  <div className={clsx(
                    'h-8 w-8 rounded-xl flex items-center justify-center shadow-sm border transition-all',
                    cat.iconBg
                  )}>
                    <Icon size={14} strokeWidth={2} />
                  </div>
                  {!n.is_read && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className={clsx(
                        'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                        cat.indicatorColor
                      )}></span>
                      <span className={clsx(
                        'relative inline-flex rounded-full h-2 w-2',
                        cat.indicatorColor
                      )}></span>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap leading-none">
                    <span className={clsx(
                      'text-xs tracking-tight font-sans',
                      n.is_read ? 'text-slate-600 font-medium' : 'text-slate-800 font-bold'
                    )}>
                      {n.title}
                    </span>
                    <span className={clsx(
                      'px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border leading-none font-sans',
                      cat.colorClass
                    )}>
                      {cat.label}
                    </span>
                  </div>
                  {n.body ? (
                    <div className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-sans font-medium">
                      {n.body}
                    </div>
                  ) : null}
                  <div className="text-[9px] text-slate-400 font-bold mt-2 font-sans tracking-wider uppercase">
                    {dayjs(n.created_at).fromNow()}
                  </div>
                </div>
                {!n.is_read ? (
                  <Check
                    size={14}
                    strokeWidth={2}
                    className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 bg-slate-50/40 p-1.5">
        <button
          type="button"
          onClick={() => { onClose?.(); navigate('/notifications'); }}
          className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100/50 transition-all duration-150"
        >
          See all notifications ({total.toLocaleString()})
        </button>
      </div>
    </div>
  );
}
