// ============================================================================
// src/utils/kpiCache.js  —  In-process LRU cache for dashboard KPI payloads
// ----------------------------------------------------------------------------
// PROBLEM
//   Dashboard KPI aggregation queries are heavy — five SELECT COUNT(...) +
//   one COUNT(DISTINCT JOIN) — and the dashboard polls every 30 s per user.
//   With 50 active users that is 50 × 6 = 300 aggregation queries per
//   minute. Each query individually is fast (< 50 ms with the new
//   composite indexes from migration 120), but together they would saturate
//   the connection pool during incident-response moments when everyone
//   is staring at the same dashboard.
//
// SOLUTION (P8-D2 / P8-D3 from SCHEMA_PHASE8.md)
//   Memoise the KPI payload behind two keys:
//
//     kpi:org                       → single key, all org-variant users
//     kpi:personal:emp:<employeeId> → per-employee key for personal users
//
//   TTL is short — 10 seconds. The FE polls every 30 s and adds another
//   25 s of stale-time, so in steady state the BE serves the same memoised
//   payload to ~3 calls before recomputing. Worst-case freshness lag is
//   10 s + 30 s = 40 s, which is well within the "feels live" threshold
//   for a calibration MIS.
//
// WHY in-process and not Redis?
//   • Stack constraint (MEMORY: no Redis) — Phase 7 already shipped its
//     LRU as in-process; this stays consistent.
//   • One Node process today. When we add horizontal scale (Phase 10),
//     each replica gets its own cache with its own TTL — the 10-s ceiling
//     means a stale replica can lag a fresh one by at most 10 s.
//
// ATOMICITY + WRITE-TIME INVALIDATION
//   Mutating services (jobRequests, equipment, future jobCards) call
//   `kpiCache.invalidate('kpi:org')` and `kpiCache.invalidate('kpi:personal:emp:'+id)`
//   AFTER `conn.commit()`. The TTL is the safety net if a service forgets:
//   stale data lives at most 10 s.
//
// THREAD MODEL
//   Node is single-threaded; the Map is mutated synchronously inside
//   service handlers. No locking needed.
//
// METRICS
//   `getStats()` returns hits / misses / hit-rate for A3 verification
//   and for any future ops dashboard tile.
// ============================================================================

'use strict';

// ── Tunables ──────────────────────────────────────────────────────────
// Defaults locked at P8-D2.
const DEFAULT_TTL_MS = 10 * 1000;       // 10 seconds
const DEFAULT_MAX_ENTRIES = 5000;       // generous: org + 1 per active user

/**
 * Cached payload shape — we store the *exact* JSON the controller will
 * return so a cache hit is a single Map.get() + clone-by-reference.
 * The `cachedAt` timestamp lets the controller stamp `cacheAgeMs` into
 * the outgoing response for A3 / debugging.
 *
 * @typedef {Object} KpiCacheEntry
 * @property {any}    value      JSON-serialisable KPI payload
 * @property {number} cachedAt   ms epoch when this entry was stored
 */

class KpiCache {
  /**
   * @param {{ maxEntries?: number, ttlMs?: number }} [opts]
   */
  constructor({ maxEntries = DEFAULT_MAX_ENTRIES, ttlMs = DEFAULT_TTL_MS } = {}) {
    /** @type {Map<string, KpiCacheEntry>} */
    this._map = new Map();
    this._max = maxEntries;
    this._ttl = ttlMs;
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
    this._invalidations = 0;
  }

  /**
   * Read a cache entry. Returns null on miss / expired.
   * On hit, refreshes the entry's LRU recency by re-inserting it at the
   * tail of the Map (Map preserves insertion order; oldest = first).
   *
   * @param {string} key
   * @returns {{ value: any, cachedAt: number, cacheAgeMs: number } | null}
   */
  get(key) {
    const entry = this._map.get(key);
    if (!entry) {
      this._misses += 1;
      return null;
    }
    const age = Date.now() - entry.cachedAt;
    if (age > this._ttl) {
      // Expired — treat as miss and drop the stale row.
      this._map.delete(key);
      this._misses += 1;
      return null;
    }
    // Hit. LRU recency refresh: delete + re-set moves to tail.
    this._map.delete(key);
    this._map.set(key, entry);
    this._hits += 1;
    return { value: entry.value, cachedAt: entry.cachedAt, cacheAgeMs: age };
  }

  /**
   * Insert / refresh a cache entry. Evicts the oldest if over capacity.
   *
   * @param {string} key
   * @param {any}    value   JSON-serialisable payload
   */
  set(key, value) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, { value, cachedAt: Date.now() });
    if (this._map.size > this._max) {
      // Drop the oldest entry — the head of insertion order.
      const oldestKey = this._map.keys().next().value;
      this._map.delete(oldestKey);
      this._evictions += 1;
    }
  }

  /**
   * Forced eviction — called after every mutation that affects KPI
   * counts. Belt-and-braces with the TTL.
   *
   * @param {string} key
   */
  invalidate(key) {
    if (this._map.delete(key)) {
      this._invalidations += 1;
    }
  }

  /**
   * Bulk invalidation — drop every key matching a prefix. Used by the
   * (future) "rebuild everything" admin endpoint and by Phase 7's
   * role/status mutation hook that conservatively wipes all personal
   * keys.
   *
   * @param {string} prefix
   * @returns {number}  Count of keys removed.
   */
  invalidateByPrefix(prefix) {
    let n = 0;
    for (const key of this._map.keys()) {
      if (key.startsWith(prefix)) {
        this._map.delete(key);
        n += 1;
      }
    }
    this._invalidations += n;
    return n;
  }

  /**
   * Drop everything. Test-only / hypothetical /admin/cache-bust.
   */
  clear() {
    this._map.clear();
  }

  /**
   * Diagnostic snapshot for A3 verification + future ops dashboard.
   *
   * @returns {{ hits:number, misses:number, hitRate:number,
   *            size:number, max:number, evictions:number,
   *            invalidations:number, ttlMs:number }}
   */
  getStats() {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      hitRate: total === 0 ? 0 : this._hits / total,
      size: this._map.size,
      max: this._max,
      evictions: this._evictions,
      invalidations: this._invalidations,
      ttlMs: this._ttl,
    };
  }
}

// ── Canonical cache keys ──────────────────────────────────────────────
// Exported so mutating services and tests don't accidentally drift from
// the naming convention. Doctrine 3: single choke-point.
const KEYS = Object.freeze({
  ORG: 'kpi:org',
  /**
   * @param {string} employeeId  varchar(7) e.g. 'SA79900'
   * @returns {string}
   */
  personal(employeeId) {
    return `kpi:personal:emp:${employeeId}`;
  },
  PERSONAL_PREFIX: 'kpi:personal:emp:',
});

// ── Singleton ──────────────────────────────────────────────────────────
// One cache per Node process — shared by the dashboard service (reader)
// and every mutating service (invalidator).
const kpiCache = new KpiCache();

module.exports = kpiCache;
module.exports.KEYS = KEYS;
module.exports.KpiCache = KpiCache; // exported for unit tests
