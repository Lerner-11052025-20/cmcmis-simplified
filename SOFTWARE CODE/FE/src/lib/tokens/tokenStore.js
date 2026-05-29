// ============================================================================
// src/lib/tokens/tokenStore.js  —  Zustand store for capsule pop-ups
// ----------------------------------------------------------------------------
// PHASE 12 — Task 2 (Tokens)
//
// PURPOSE
//   Transient, NOT-persisted, capsule-shaped pop-ups that confirm every
//   client-side mutation (CRUD save / state change). Distinct from
//   notifications (server-emitted, persisted) and distinct from sonner
//   toasts (we control the shape + position precisely).
//
//   The store is intentionally tiny — push + dismiss + read. Auto-expiry
//   is driven by setTimeout per token; the timer is keyed by token id so
//   manual dismiss can clear it without flushing the whole queue.
//
//   The user's role gate ("not for View-Only") is enforced at the
//   `pushToken()` call site via `useCanPushTokens()` — the store itself
//   accepts every push so unit tests don't have to mock auth context.
// ============================================================================

import { create } from 'zustand';

// Auto-dismiss after exactly 2 seconds per spec §4.1.
const AUTO_DISMISS_MS = 2_000;

// Cap on simultaneously visible tokens. Excess pushes queue silently
// (oldest waits, newest replaces? — we drop the oldest visible to keep
// the strip uncluttered). Tunable per future UX feedback.
const MAX_VISIBLE = 3;

// Monotonic id source. Date.now() collides if two tokens fire in the
// same millisecond (real possibility when a mutation onSuccess fires
// before its onSettled). A counter avoids the collision entirely.
let nextId = 1;

// Per-token timeout handles, keyed by token id. We keep them outside
// the store so subscriptions don't trigger when timeouts shuffle.
const timers = new Map();


/**
 * Variants ⇒ semantic colours. Used by the renderer to pick a capsule
 * style. Keep the keyword list short — extending it is fine, but every
 * caller has to be updated, so prefer mapping unknown variants to 'info'.
 */
export const TOKEN_VARIANTS = Object.freeze(['success', 'info', 'danger']);


export const useTokenStore = create((set, get) => ({
  tokens: [],   // [{ id, message, sub?, variant, at: Date }]

  /**
   * Push a new capsule. Returns the assigned id so callers can clear
   * it early if needed.
   *
   * @param {{ message: string, sub?: string, variant?: 'success'|'info'|'danger' }} opts
   */
  push: ({ message, sub, variant }) => {
    if (!message) return null;
    const v = TOKEN_VARIANTS.includes(variant) ? variant : 'info';
    const id = nextId++;
    const token = { id, message: String(message), sub: sub ? String(sub) : null, variant: v, at: new Date() };

    set((s) => {
      // Cap visible tokens — drop the oldest when full so the newest
      // always appears (matches user expectation; a 4-th save shouldn't
      // be hidden behind the 1-st).
      let next = [...s.tokens, token];
      while (next.length > MAX_VISIBLE) {
        const dropped = next.shift();
        const t = timers.get(dropped.id);
        if (t) { clearTimeout(t); timers.delete(dropped.id); }
      }
      return { tokens: next };
    });

    const handle = setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
    timers.set(id, handle);
    return id;
  },

  /** Remove a token by id and clear its auto-expiry. */
  dismiss: (id) => {
    const t = timers.get(id);
    if (t) { clearTimeout(t); timers.delete(id); }
    set((s) => ({ tokens: s.tokens.filter((x) => x.id !== id) }));
  },

  /** Test helper — wipes everything immediately. Not exported for app use. */
  _clearAll: () => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    set({ tokens: [] });
  },
}));


// ── Direct push helper (non-hook) ──────────────────────────────────────
// Most callers will use `useTokenStore.getState().push(...)` because
// they're inside a mutation callback, not a React render. The helper
// below wraps that pattern so call sites are one-liners.
//
//   import { pushToken } from '@/lib/tokens/tokenStore';
//   pushToken({ message: 'Job Card saved', variant: 'success' });
//
export function pushToken(opts) {
  return useTokenStore.getState().push(opts);
}

export const TOKEN_AUTO_DISMISS_MS = AUTO_DISMISS_MS;
export const TOKEN_MAX_VISIBLE = MAX_VISIBLE;
