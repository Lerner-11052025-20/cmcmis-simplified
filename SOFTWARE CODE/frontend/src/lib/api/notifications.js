// ============================================================================
// src/lib/api/notifications.js  —  Notifications HTTP wrapper
// ----------------------------------------------------------------------------
// PHASE 12 — Notifications
//
// Four endpoints, all scoped to the caller:
//
//   fetchNotifications({ unreadOnly, page, page_size })
//   fetchUnreadCount()
//   markRead(id)
//   markAllRead()
//
// Zero UI logic — react-query hooks consume these and own caching/polling.
// ============================================================================

import { api } from '../api-client.js';

/** Strip falsy/empty values so the BE Zod schema doesn't reject. */
function clean(params) {
  if (!params) return undefined;
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '' || Number.isNaN(v)) return;
    out[k] = v;
  });
  return out;
}

/** Paginated list of the caller's notifications. */
export async function fetchNotifications(params, signal) {
  const r = await api.get('/notifications', { params: clean(params), signal });
  return r.data.data;
}

/** Tiny `{ unread: <number> }`. Used by the bell-badge poller. */
export async function fetchUnreadCount(signal) {
  const r = await api.get('/notifications/unread-count', { signal });
  return r.data.data;
}

/** Flip is_read=1 + stamp read_at on a single notification (own only). */
export async function markRead(id) {
  const r = await api.patch(`/notifications/${id}/read`);
  return r.data.data;
}

/** Flip every unread row to is_read=1 for the caller. Returns `{ marked: N }`. */
export async function markAllRead() {
  const r = await api.patch('/notifications/read-all');
  return r.data.data;
}
