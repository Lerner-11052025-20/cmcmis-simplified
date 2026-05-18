// ============================================================================
// src/utils/tokenVersionCache.js  —  In-process LRU for user.token_version
// ----------------------------------------------------------------------------
// PROBLEM
//   JWTs are stateless. When a Super Admin changes Bob's role or
//   deactivates Bob, his existing access token still says the old role /
//   active=1 until it expires (15 min). Worst case: a deactivated user
//   gets to keep using the system for nearly 15 minutes.
//
// SOLUTION (Phase 7 D-7.2)
//   Stamp every JWT with the user's `token_version` at issue time. The
//   authenticate middleware reads the current `token_version` from THIS
//   cache and compares it to the JWT claim. Mismatch → 401 SESSION_REVOKED.
//
//   Every state-changing admin action (role change, activate, deactivate,
//   force-logout) atomically bumps the DB column AND calls invalidate(id).
//
// WHY a tiny in-process LRU
//   • Zero new infrastructure (no Redis, no memcached).
//   • At most 1 DB read per cold (cache-miss) request — and the read is a
//     PK SELECT on `users` which is sub-millisecond.
//   • In steady state (warm cache), the check is an O(1) Map.get() —
//     literally free.
//   • Q-6 locked: 5000 entries. SAC has ~500 users; 10× headroom means
//     never evicting in real-world load.
//
// TTL
//   30 seconds. Within 30 s of an admin's click, the cached value expires;
//   the next request reloads from DB and sees the new token_version. So
//   worst-case latency between "SA clicked Deactivate" and "Bob's next
//   request is rejected" is 30 s — vastly better than 15 min.
//
// ATOMICITY
//   This cache is purely a READ-side optimisation. Writes go through
//   adminUsers.repo.bumpTokenVersion(conn, userId) inside the service
//   transaction, then service calls cache.invalidate(userId). Even if
//   invalidate is forgotten (bug), the TTL guarantees eventual
//   consistency in ≤30 s.
//
// CONCURRENCY
//   Node.js is single-threaded — no locking needed inside the cache.
//   The cache is a simple Map; LRU ordering is approximated via insertion
//   order (Map preserves insertion order; on hit we delete + re-set to
//   move to the tail; oldest entry is at the head).
//
// METRICS
//   Hit / miss counts are exposed via getStats() for A14 verification.
//   Pino debug logs the rate when cache is queried in development.
// ============================================================================

'use strict';

const DEFAULT_TTL_MS  = 30 * 1000;
const DEFAULT_MAX     = 5000;

/**
 * @typedef {Object} CacheEntry
 * @property {number} tokenVersion   The user's current token_version
 * @property {number} loadedAt       ms epoch when this entry was inserted
 */

class TokenVersionCache {
  /**
   * @param {{ maxEntries?: number, ttlMs?: number }} [opts]
   */
  constructor({ maxEntries = DEFAULT_MAX, ttlMs = DEFAULT_TTL_MS } = {}) {
    /** @type {Map<number, CacheEntry>} */
    this._map = new Map();
    this._max = maxEntries;
    this._ttl = ttlMs;
    this._hits   = 0;
    this._misses = 0;
    this._evictions = 0;
  }

  /**
   * Read the cached tokenVersion for a user.
   * Returns null on miss / expired so the caller can hit the DB and
   * populate via set().
   *
   * @param {number} userId
   * @returns {number | null}
   */
  get(userId) {
    const entry = this._map.get(userId);
    if (!entry) {
      this._misses += 1;
      return null;
    }
    // TTL expired? Treat as miss + remove the stale entry.
    const age = Date.now() - entry.loadedAt;
    if (age > this._ttl) {
      this._map.delete(userId);
      this._misses += 1;
      return null;
    }
    // Hit — move to tail (LRU recency) by re-inserting.
    this._map.delete(userId);
    this._map.set(userId, entry);
    this._hits += 1;
    return entry.tokenVersion;
  }

  /**
   * Insert / refresh a userId → tokenVersion mapping. Called from the
   * authenticate middleware after a cache miss (reads from DB).
   *
   * @param {number} userId
   * @param {number} tokenVersion
   */
  set(userId, tokenVersion) {
    if (this._map.has(userId)) this._map.delete(userId);
    this._map.set(userId, { tokenVersion, loadedAt: Date.now() });
    // LRU eviction — drop the oldest entry if over capacity.
    if (this._map.size > this._max) {
      const oldestKey = this._map.keys().next().value;
      this._map.delete(oldestKey);
      this._evictions += 1;
    }
  }

  /**
   * Forced eviction — called immediately after every mutation that bumps
   * a user's token_version. Belt-and-braces with the TTL.
   *
   * @param {number} userId
   */
  invalidate(userId) {
    this._map.delete(userId);
  }

  /**
   * Drop everything. Used by tests + a hypothetical /admin/cache-bust
   * endpoint (not exposed in slice 1).
   */
  clear() {
    this._map.clear();
  }

  /**
   * Diagnostic snapshot — used by A14 verification + dev-mode logs.
   *
   * @returns {{ hits:number, misses:number, hitRate:number,
   *            size:number, max:number, evictions:number }}
   */
  getStats() {
    const total = this._hits + this._misses;
    return {
      hits:      this._hits,
      misses:    this._misses,
      hitRate:   total === 0 ? 0 : this._hits / total,
      size:      this._map.size,
      max:       this._max,
      evictions: this._evictions,
    };
  }
}

// ── Module-level singleton ──────────────────────────────────────────
// One cache per Node process. Importers share state — which is what we
// want; otherwise the authenticate middleware (which holds one reference)
// would see different values than the adminUsers service (which calls
// invalidate from another reference).
const tokenVersionCache = new TokenVersionCache();

module.exports = tokenVersionCache;
module.exports.TokenVersionCache = TokenVersionCache; // exported for unit tests
