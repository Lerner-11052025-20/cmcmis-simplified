// ============================================================================
// src/lib/tokens/tokenInterceptor.js  —  Universal mutation → token bridge
// ----------------------------------------------------------------------------
// PHASE 12 — Task 2 (Tokens)
//
// PURPOSE
//   Listen on EVERY axios response. For 2xx POST/PATCH/DELETE (i.e. every
//   successful mutation across the app) push a contextual capsule token.
//   For 4xx/5xx mutations push a danger-variant token.
//
//   GET responses are ignored — they're reads, not mutations.
//
//   This is the "centralised mutation wrapper" the spec asks for (§4.4):
//   every CRUD path emits consistently without each call-site having to
//   wire its own toast.
//
// PERMISSION GATE
//   View-Only users hold no `notifications:read-own` — by the spec they
//   must see NO tokens. We cache the current user's permissions in a
//   module variable updated by AuthProvider on login/refresh, so the
//   interceptor can answer "can this user see tokens?" without touching
//   React context.
//
// IDENTITY
//   The interceptor is installed once at module load (importing this
//   file is enough). It coexists with the existing 401-refresh
//   interceptor — multiple interceptors are stacked, not exclusive.
// ============================================================================

import { api } from '../api-client.js';
import { pushToken } from './tokenStore.js';

// ── Notification-cache bust hook ──────────────────────────────────────
// react-query polls `/notifications/unread-count` every 30 s; that means
// a user who just submitted a Job Request might wait up to 30 s before
// the bell badge ticks. We bust the cache the instant a workflow
// mutation succeeds so the bell reflects reality immediately.
//
// main.jsx registers a global handle by calling `setQueryClient(qc)`
// after the QueryClient is constructed. Without that hook, the
// interceptor silently skips the bust (no crash, no stale query).
let _qcRef = null;
export function setQueryClient(qc) { _qcRef = qc; }
function bustNotificationCache() {
  if (_qcRef) _qcRef.invalidateQueries({ queryKey: ['notifications'] });
}

// ── Module-level permission snapshot ──────────────────────────────────
// AuthProvider keeps this fresh by calling setAuthSnapshot() on every
// user change (login, /me refetch, logout-clear).
let currentPermissions = new Set();

export function setAuthSnapshot(user) {
  currentPermissions = new Set(user?.permissions || []);
}

function canSeeTokens() {
  // Same gate as `usePushToken` — View-Only never holds this perm.
  return currentPermissions.has('notifications:read-own');
}


// ── URL/method → human message inference ──────────────────────────────
// We keep this dictionary small and let the catch-all handle anything
// that isn't deliberately mapped. The dictionary lives here (not in the
// store) so it's easy to discover when wiring new endpoints.
//
// Entries are checked in order; the FIRST match wins.
const SUCCESS_RULES = [
  // ── Auth ──────────────────────────────────────────────────────────
  // /auth/* is intentionally NOT mapped — login/logout already show
  // their own toast/redirect, a capsule would be noisy.

  // ── Job Requests ──────────────────────────────────────────────────
  { method: 'POST',   pattern: /^\/job-requests\/?$/,                msg: 'Job Request saved' },
  { method: 'PATCH',  pattern: /^\/job-requests\/[^/]+\/submit\/?$/,  msg: 'Job Request submitted' },
  { method: 'PATCH',  pattern: /^\/job-requests\/[^/]+\/cancel\/?$/,  msg: 'Job Request cancelled' },
  { method: 'PATCH',  pattern: /^\/job-requests\/[^/]+\/convert\/?$/, msg: 'Job Card created' },
  { method: 'PATCH',  pattern: /^\/job-requests\/[^/]+\/reject\/?$/,  msg: 'Job Request rejected' },
  { method: 'PATCH',  pattern: /^\/job-requests\/[^/]+\/?$/,          msg: 'Draft updated' },

  // ── Job Cards ─────────────────────────────────────────────────────
  { method: 'POST',   pattern: /^\/job-cards\/[^/]+\/start-work\/?$/,    msg: 'Work started' },
  { method: 'POST',   pattern: /^\/job-cards\/[^/]+\/mark-complete\/?$/, msg: 'Marked complete' },
  { method: 'POST',   pattern: /^\/job-cards\/[^/]+\/verify-close\/?$/,  msg: 'Closed' },
  { method: 'POST',   pattern: /^\/job-cards\/[^/]+\/reopen\/?$/,        msg: 'Reopened' },
  { method: 'PATCH',  pattern: /^\/job-cards\/[^/]+\/?$/,                msg: 'Tab saved' },

  // ── JC child-table CRUD ──────────────────────────────────────────
  { method: 'POST',   pattern: /^\/job-cards\/[^/]+\/tasks\/?$/,         msg: 'Task added' },
  { method: 'PATCH',  pattern: /^\/job-cards\/[^/]+\/tasks\/[^/]+\/?$/,  msg: 'Task updated' },
  { method: 'DELETE', pattern: /^\/job-cards\/[^/]+\/tasks\/[^/]+\/?$/,  msg: 'Task removed' },
  { method: 'POST',   pattern: /^\/job-cards\/[^/]+\/maintenance\/?$/,   msg: 'Maintenance row added' },
  { method: 'PATCH',  pattern: /^\/job-cards\/[^/]+\/maintenance\/[^/]+\/?$/, msg: 'Maintenance row saved' },
  { method: 'DELETE', pattern: /^\/job-cards\/[^/]+\/maintenance\/[^/]+\/?$/, msg: 'Maintenance row removed' },
  { method: 'POST',   pattern: /^\/job-cards\/[^/]+\/spares\/?$/,        msg: 'Spare row added' },
  { method: 'PATCH',  pattern: /^\/job-cards\/[^/]+\/spares\/[^/]+\/?$/, msg: 'Spare row saved' },
  { method: 'DELETE', pattern: /^\/job-cards\/[^/]+\/spares\/[^/]+\/?$/, msg: 'Spare row removed' },
  { method: 'POST',   pattern: /^\/job-cards\/[^/]+\/documents\/?$/,     msg: 'Document uploaded' },
  { method: 'DELETE', pattern: /^\/job-cards\/[^/]+\/documents\/[^/]+\/?$/, msg: 'Document removed' },

  // ── Equipment ─────────────────────────────────────────────────────
  { method: 'POST',   pattern: /^\/equipment\/?$/,                       msg: 'Equipment registered' },
  { method: 'PATCH',  pattern: /^\/equipment\/[^/]+\/verify\/?$/,        msg: 'Equipment verified' },
  { method: 'PATCH',  pattern: /^\/equipment\/[^/]+\/?$/,                msg: 'Equipment updated' },

  // ── Notifications ────────────────────────────────────────────────
  // PATCH /notifications/:id/read and /read-all are silent — the bell
  // badge itself is the feedback; a token would be noisy on every click.

  // ── Admin ────────────────────────────────────────────────────────
  { method: 'POST',   pattern: /^\/admin\/employees\/?$/,                msg: 'Employee created' },
  { method: 'PATCH',  pattern: /^\/admin\/employees\/[^/]+\/?$/,         msg: 'Employee updated' },
  { method: 'PATCH',  pattern: /^\/admin\/users\/[^/]+\/role\/?$/,       msg: 'Role updated' },
  { method: 'PATCH',  pattern: /^\/admin\/users\/[^/]+\/(activate|deactivate)\/?$/,
                                                                       msg: 'User status changed' },

  // ── Phase 13 · Schedule ───────────────────────────────────────────
  { method: 'POST',   pattern: /^\/schedules\/?$/,                       msg: 'Schedule created' },
  { method: 'PATCH',  pattern: /^\/schedules\/[^/]+\/?$/,                msg: 'Schedule updated' },
  { method: 'POST',   pattern: /^\/schedules\/[^/]+\/status\/?$/,        msg: 'Schedule status changed' },
  { method: 'DELETE', pattern: /^\/schedules\/[^/]+\/?$/,                msg: 'Schedule cancelled' },

  // ── Phase 13 · Procurement ────────────────────────────────────────
  { method: 'POST',   pattern: /^\/procurement\/purchase-orders\/?$/,                msg: 'Purchase Order created' },
  { method: 'PATCH',  pattern: /^\/procurement\/purchase-orders\/[^/]+\/?$/,         msg: 'Purchase Order updated' },
  { method: 'POST',   pattern: /^\/procurement\/spare-parts\/?$/,                    msg: 'Spare part added' },
  { method: 'PATCH',  pattern: /^\/procurement\/spare-parts\/[^/]+\/?$/,             msg: 'Spare part updated' },
  { method: 'POST',   pattern: /^\/procurement\/spare-parts\/[^/]+\/order\/?$/,      msg: 'Order placed' },
];

/** Find the first matching rule for a given (method, url). */
function inferMessage(method, urlPath) {
  const m = String(method || '').toUpperCase();
  // Strip the /api/v1 base if present so patterns stay short.
  const path = String(urlPath || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '');
  for (const rule of SUCCESS_RULES) {
    if (rule.method !== m) continue;
    if (rule.pattern.test(path)) return rule.msg;
  }
  // Catch-all — generic but accurate.
  if (m === 'POST')   return 'Created';
  if (m === 'PATCH')  return 'Saved';
  if (m === 'DELETE') return 'Removed';
  return null;
}


// ── Interceptor — installed once at module load ───────────────────────
api.interceptors.response.use(
  (resp) => {
    // Notifications endpoints are excluded entirely — mark-read flips
    // shouldn't fire a token, and neither should the unread-count poll.
    // The same is true for /auth/* (login/logout have their own UX).
    const url = resp.config?.url || '';
    if (/^\/?(notifications|auth)/.test(url) || /\/(notifications|auth)\//.test(url)) {
      return resp;
    }

    const method = String(resp.config?.method || '').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      // Reads never fire tokens. Bell badge already reflects state changes.
      return resp;
    }

    // Bust the notification cache so the bell ticks immediately for
    // workflow mutations (every JR/JC mutation may have inserted a row).
    // This is permission-independent — the cache hook is a no-op for
    // users without `notifications:read-own` because the query simply
    // isn't enabled for them.
    bustNotificationCache();

    if (!canSeeTokens()) return resp;

    const msg = inferMessage(method, url);
    if (msg) pushToken({ message: msg, variant: 'success' });
    return resp;
  },
  (error) => {
    // Don't double-toast 401s — the auth interceptor handles the refresh
    // / SESSION_REVOKED redirect flow itself.
    const status = error?.response?.status;
    const url    = error?.config?.url || '';
    const method = String(error?.config?.method || '').toUpperCase();
    if (status && status !== 401
        && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
        && !/^\/?(notifications|auth)/.test(url) && !/\/(notifications|auth)\//.test(url)
        && canSeeTokens()) {
      const beMsg = error.response?.data?.error?.message;
      const code  = error.response?.data?.error?.code;
      pushToken({
        message: beMsg || `Failed (${status})`,
        sub:     code ? `${code}` : undefined,
        variant: 'danger',
      });
    }
    return Promise.reject(error);
  },
);
