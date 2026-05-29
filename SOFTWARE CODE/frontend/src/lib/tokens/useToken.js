// ============================================================================
// src/lib/tokens/useToken.js  —  Permission-gated push helper
// ----------------------------------------------------------------------------
// PHASE 12 — Task 2 (Tokens)
//
// The token UI is forbidden for View-Only users (§4.2). We enforce that
// at the PUSH site rather than inside the store so:
//   1. The store stays test-friendly (no auth-context mock needed).
//   2. A buggy caller can't bypass the gate by importing pushToken().
//
// Components that want to fire tokens should use this hook instead of
// the raw `pushToken()` import. The returned function is a no-op when
// the user lacks permission — call sites stay clean.
// ============================================================================

import { useCallback } from 'react';
import { useAuth } from '../auth-context.jsx';
import { pushToken as rawPush } from './tokenStore.js';

/**
 * Returns a pushToken-shaped function gated by the user's role.
 *
 * @returns {(opts: { message: string, sub?: string, variant?: 'success'|'info'|'danger' }) => number|null}
 */
export function usePushToken() {
  const { user } = useAuth();
  // Tokens are for SA/LIC/Engineer/Normal only — never View-Only.
  // We use a permission proxy that View-Only never holds:
  //   notifications:read-own  (mig 431) IS the canonical
  //   "you participate in the workflow" gate.
  const canPush = Boolean(user?.permissions?.includes('notifications:read-own'));

  return useCallback((opts) => {
    if (!canPush) return null;
    return rawPush(opts);
  }, [canPush]);
}
