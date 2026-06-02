import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Inbox,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';

import { Layout } from '../../components/Layout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import {
  useNotificationActions,
  useNotificationList,
} from '../../lib/hooks/useNotifications.js';

dayjs.extend(relativeTime);

const PAGE_SIZE = 25;

function categoryOf(notification) {
  const link = notification.deep_link || '';
  const title = String(notification.title || '').toLowerCase();

  if (link.startsWith('/job-requests') || link.startsWith('/conversion') || title.includes('request')) {
    return {
      label: 'Job request',
      icon: FileText,
      chip: 'bg-sky-50 text-sky-700 border-sky-200',
      iconClass: 'bg-sky-50 text-sky-600',
      line: 'border-l-sky-500',
    };
  }

  if (link.startsWith('/job-cards') || title.includes('card') || title.includes('calib') || title.includes('repair')) {
    return {
      label: 'Job card',
      icon: ClipboardList,
      chip: 'bg-violet-50 text-violet-700 border-violet-200',
      iconClass: 'bg-violet-50 text-violet-600',
      line: 'border-l-violet-500',
    };
  }

  if (link.startsWith('/equipment') || title.includes('equip') || title.includes('instrument') || title.includes('verify')) {
    return {
      label: 'Equipment',
      icon: Wrench,
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconClass: 'bg-emerald-50 text-emerald-600',
      line: 'border-l-emerald-500',
    };
  }

  return {
    label: 'General',
    icon: Bell,
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    iconClass: 'bg-amber-50 text-amber-600',
    line: 'border-l-amber-500',
  };
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', tone)}>
          <Icon size={21} strokeWidth={2.1} />
        </span>
      </div>
    </div>
  );
}

export function Notifications() {
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const { rows, total, unread, loading, error, refetch } = useNotificationList({
    unreadOnly,
    page,
    page_size: PAGE_SIZE,
  });
  const { markOne, markAll, marking } = useNotificationActions();

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => (
      String(row.title || '').toLowerCase().includes(q)
      || String(row.body || '').toLowerCase().includes(q)
      || String(row.actor_employee_id || '').toLowerCase().includes(q)
    ));
  }, [query, rows]);

  function activate(notification) {
    if (!notification.is_read) markOne.mutate(notification.id);
    if (notification.deep_link) navigate(notification.deep_link);
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Inbox size={28} strokeWidth={2.1} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold text-slate-950">Notifications</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review system events, jump to related records, and clear completed updates from one focused inbox.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => refetch()}
                disabled={loading}
                className="rounded-xl"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
                Refresh
              </Button>
              <Button
                variant="primary"
                onClick={() => markAll.mutate()}
                disabled={marking || unread === 0}
                className="rounded-xl"
              >
                <CheckCheck size={16} />
                Mark all read
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total records" value={(total || 0).toLocaleString()} icon={Bell} tone="bg-sky-50 text-sky-600" />
          <StatCard label="Unread" value={(unread || 0).toLocaleString()} icon={Inbox} tone="bg-rose-50 text-rose-600" />
          <StatCard label="Current page" value={`${page} / ${totalPages}`} icon={ClipboardList} tone="bg-emerald-50 text-emerald-600" />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, message, or employee ID"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100/60"
              />
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              {[
                { label: 'All', value: false },
                { label: 'Unread', value: true },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setUnreadOnly(item.value);
                    setPage(1);
                  }}
                  className={clsx(
                    'rounded-lg px-4 py-2 text-sm font-medium transition',
                    unreadOnly === item.value
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-950'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-medium text-slate-500 shadow-card">
            Loading notifications...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {error.response?.data?.error?.message || error.message || 'Failed to load notifications.'}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-card">
            <Bell className="mx-auto text-slate-300" size={34} />
            <p className="mt-4 text-base font-medium text-slate-700">
              {query ? 'No notifications match your search.' : unreadOnly ? 'No unread notifications.' : 'Your inbox is empty.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRows.map((notification) => {
              const category = categoryOf(notification);
              const Icon = category.icon;
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => activate(notification)}
                  className={clsx(
                    'group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md',
                    'border-l-4',
                    notification.is_read ? 'border-l-slate-200' : category.line
                  )}
                >
                  <div className="flex gap-4">
                    <span className={clsx('relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', category.iconClass)}>
                      <Icon size={22} strokeWidth={2.1} />
                      {!notification.is_read ? (
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className={clsx('text-base font-semibold', notification.is_read ? 'text-slate-700' : 'text-slate-950')}>
                          {notification.title}
                        </h2>
                        <span className={clsx('rounded-full border px-2.5 py-1 text-xs font-medium', category.chip)}>
                          {category.label}
                        </span>
                      </div>
                      {notification.body ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{dayjs(notification.created_at).format('MMM DD, YYYY HH:mm')}</span>
                        <span>-</span>
                        <span>{dayjs(notification.created_at).fromNow()}</span>
                        {notification.actor_employee_id ? (
                          <>
                            <span>-</span>
                            <span>By {notification.actor_employee_id}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {total > PAGE_SIZE ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-xl"
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-xl"
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
