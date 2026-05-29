// ============================================================================
// src/lib/hooks/useNotifications.js  —  Notifications react-query hooks
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// Three hooks, all gated by the caller's permissions BEFORE they fire
// (View-Only users hold no `notifications:read-own`, so we skip the
// network call entirely — saves an obvious 403 round trip).
//
//   useUnreadCount()              — polls /unread-count every 30 s
//   useNotificationList(params)   — paginated list (used by bell dropdown + page)
//   useNotificationActions()      — mutation hooks: markRead + markAllRead
//
// Permission gate
//   Returns `{ permitted: false, ... }` for users without
//   `notifications:read-own`. Components can early-return when permitted
//   is false (this is what makes the bell vanish for View-Only).
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth-context.jsx';
import {
  fetchNotifications,
  fetchUnreadCount,
  markRead,
  markAllRead,
} from '../api/notifications.js';

// Poll cadence. 30 s mirrors the Phase-8 dashboard pattern — same
// freshness expectation, same battery cost. Refetch on focus covers the
// "I tabbed away" case so the user never stares at a stale badge.
const POLL_MS = 30_000;

/**
 * Permission helper. Single point of truth so component-level checks
 * stay one-liners (`if (!useCanReadNotifications()) return null;`).
 */
export function useCanReadNotifications() {
  const { user } = useAuth();
  return Boolean(user?.permissions?.includes('notifications:read-own'));
}


/**
 * Live unread count for the bell badge.
 *
 * Returns the raw `{ unread: number }` shape so the component can show
 * "9+" when over a threshold without re-fetching.
 */
export function useUnreadCount() {
  const canRead = useCanReadNotifications();
  const q = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn:  ({ signal }) => fetchUnreadCount(signal),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    enabled: canRead,
  });
  return {
    unread:   q.data?.unread ?? 0,
    loading:  q.isLoading,
    error:    q.error,
    refetch:  q.refetch,
    permitted: canRead,
  };
}


/**
 * Paginated list — bell dropdown uses page=1, page_size=10; the full
 * /notifications page uses larger sizes + the unreadOnly toggle.
 *
 * @param {Object} params  { unreadOnly?, page?, page_size? }
 */
export function useNotificationList(params = {}) {
  const canRead = useCanReadNotifications();
  const q = useQuery({
    queryKey: ['notifications', 'list', params],
    queryFn:  ({ signal }) => fetchNotifications(params, signal),
    enabled: canRead,
    keepPreviousData: true,
    refetchOnWindowFocus: true,
  });
  return {
    rows:    q.data?.rows  || [],
    total:   q.data?.total || 0,
    unread:  q.data?.unread || 0,
    loading: q.isLoading,
    error:   q.error,
    refetch: q.refetch,
    permitted: canRead,
  };
}


/**
 * Mark-read mutations. Both invalidate the unread-count query so the
 * bell badge drops immediately without waiting for the next poll.
 *
 * Usage:
 *   const { markOne, markAll, marking } = useNotificationActions();
 *   markOne.mutate(id)        // single
 *   markAll.mutate()          // bulk
 */
export function useNotificationActions() {
  const qc = useQueryClient();

  const invalidate = () => {
    // Bust unread-count + every list flavour. We use a wide queryKey
    // prefix because the list keys carry params (e.g. unreadOnly=true).
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markOne = useMutation({
    mutationFn: (id) => markRead(id),
    onSuccess:  invalidate,
  });

  const markAll = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess:  invalidate,
  });

  return { markOne, markAll, marking: markOne.isPending || markAll.isPending };
}
