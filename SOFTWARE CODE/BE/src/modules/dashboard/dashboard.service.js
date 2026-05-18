// ============================================================================
// src/modules/dashboard/dashboard.service.js  —  Business logic + cache
// ----------------------------------------------------------------------------
// Owns three responsibilities:
//   1. Decide whether to serve the ORG or MY variant from the requester's
//      role (P8-D1).
//   2. Read the kpiCache; on miss, query the repo and stamp the result back.
//   3. Compute every "presentational" field — labels, subtitles, deep-link
//      hrefs, colour-accent tokens, % delta strings — so the FE renders
//      payload as-is without any business logic.
//
// Doctrine 7 (Phase 7 sealed): the FE does NOT branch on role to choose
// labels. The payload tells it which 4 cards to render and what to say.
//
// CACHE KEY POLICY (P8-D3):
//   role IN ('NORMAL_USER','VIEW_ONLY')  → key = kpi:personal:emp:<employeeId>
//   role IN ('LAB_ENGINEER','LAB_IN_CHARGE','SUPER_ADMIN') → key = kpi:org
// ============================================================================

'use strict';

const repo = require('./dashboard.repo');
const kpiCache = require('../../utils/kpiCache');
const { KEYS } = require('../../utils/kpiCache');

// ── Variant resolution from role ──────────────────────────────────────
// Single source of truth. Authorize middleware has already proven the
// caller holds dashboard:view, so we trust req.user.role here.
const PERSONAL_ROLES = new Set(['NORMAL_USER', 'VIEW_ONLY']);

/**
 * @param {string} role  Canonical role_code from JWT claim
 * @returns {'my' | 'org'}
 */
function variantForRole(role) {
  return PERSONAL_ROLES.has(role) ? 'my' : 'org';
}

// ── Quick-Action button definitions ───────────────────────────────────
// Defined here so the FE doesn't hard-code button labels. Each entry is
// gated by a permission code — the FE further hides any button whose
// `requires` is not in the user's permission set.
//
// Locked at Q-8: Normal User has `equipment:create`, View-Only does not.
function quickActionsFor(variant) {
  if (variant === 'my') {
    return [
      {
        label: 'New Service Request',
        href: '/job-requests/new',
        icon: 'plus',
        primary: true,
        requires: 'job_request:create',
      },
      {
        label: 'Register Equipment',
        href: '/equipment/new',
        icon: 'trending-up',
        primary: false,
        requires: 'equipment:create',
      },
    ];
  }
  // org
  return [
    {
      label: 'Create Job Request',
      href: '/job-requests/new',
      icon: 'plus',
      primary: true,
      requires: 'job_request:create',
    },
    {
      label: 'Add Equipment',
      href: '/equipment/new',
      icon: 'wrench',
      primary: false,
      requires: 'equipment:create',
    },
  ];
}

// ── Utilization band label ────────────────────────────────────────────
// 60–90% Optimal · >90 Above · <60 Below.  Used by ORG Card 4.
function utilizationBandLabel(pct) {
  if (pct > 90) return 'Above range';
  if (pct < 60) return 'Below range';
  return 'Optimal range';
}

// ── % delta human format ──────────────────────────────────────────────
// `+12% from last week` / `-3% from last week` / `+0% from last week`.
// When last-week count is 0, growth is "undefined" mathematically;
// we degrade to a friendly "vs. last week" string instead of "+∞%".
function formatPctDelta(current, previous, suffix) {
  if (previous === 0) {
    if (current === 0) return `± 0% from ${suffix}`;
    return `New activity ${suffix}`;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}% from ${suffix}`;
}

// ── Card builders ─────────────────────────────────────────────────────
// Each builder returns the SAME card shape — predictable for the FE.
//
//   {
//     id:        'pending_jobs',
//     label:     'Pending Jobs',
//     value:     24,
//     value_kind:'count'|'percent',
//     subtitle:  '+3 today',
//     icon:      'clock',
//     accent:    'amber',
//     href:      '/job-requests?status=SUBMITTED',
//   }

async function buildOrgCards() {
  // Run all four KPI groups in parallel — independent queries, independent
  // pool connections. The repo's parallel sub-queries inside each group
  // mean we issue ~8 SELECTs concurrently; the pool max is ≥ 10 and the
  // queries are sub-50 ms each on the new indexes, so this finishes well
  // under our 150 ms p50 target for cold cache misses.
  const [
    pending,
    calibration,
    completed,
    utilization,
  ] = await Promise.all([
    repo.orgPendingJobs(),
    repo.orgCalibrationDue7d(),
    repo.orgCompletedThisWeek(),
    repo.orgEquipmentUtilization(),
  ]);

  // Equipment Utilization percentage — guard divide-by-zero.
  const utilPct =
    utilization.active === 0
      ? 0
      : Math.round((utilization.withOpenWork / utilization.active) * 100);

  return [
    {
      id: 'pending_jobs',
      label: 'Pending Jobs',
      value: pending.total,
      value_kind: 'count',
      subtitle: pending.today > 0
        ? `+${pending.today} today`
        : 'No new requests today',
      icon: 'clock',
      accent: 'amber',
      href: '/job-requests?status=SUBMITTED',
    },
    {
      id: 'calibration_due',
      label: 'Calibration Due',
      value: calibration.total,
      value_kind: 'count',
      subtitle: 'Within 7 days',
      icon: 'alert-circle',
      accent: 'red',
      href: '/equipment?calibration_due=7d',
    },
    {
      id: 'completed_this_week',
      label: 'Completed This Week',
      value: completed.thisWeek,
      value_kind: 'count',
      subtitle: formatPctDelta(completed.thisWeek, completed.lastWeek, 'last week'),
      icon: 'check-circle',
      accent: 'green',
      href: '/job-cards?status=COMPLETED&period=this_week',
    },
    {
      id: 'equipment_utilization',
      label: 'Equipment Utilization',
      value: utilPct,
      value_kind: 'percent',
      subtitle: utilizationBandLabel(utilPct),
      icon: 'trending-up',
      accent: 'blue',
      href: '/equipment',
    },
  ];
}

async function buildMyCards(employeeId) {
  const [
    active,
    inProgress,
    completed,
    calibration,
  ] = await Promise.all([
    repo.myActiveRequests(employeeId),
    repo.myInProgress(employeeId),
    repo.myCompletedThisMonth(employeeId),
    repo.myCalibrationDue30d(employeeId),
  ]);

  return [
    {
      id: 'active_requests',
      label: 'Active Requests',
      value: active.active,
      value_kind: 'count',
      subtitle: active.pendingApproval > 0
        ? `${active.pendingApproval} pending approval`
        : 'None pending approval',
      icon: 'file-text',
      accent: 'indigo',
      href: '/job-requests?mine=1',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: inProgress.total,
      value_kind: 'count',
      subtitle: inProgress.total > 0 ? 'Being processed' : 'Nothing in progress',
      icon: 'clock',
      accent: 'amber',
      href: '/job-requests?mine=1&status=IN_PROGRESS',
    },
    {
      id: 'completed_this_month',
      label: 'Completed This Month',
      value: completed.thisMonth,
      value_kind: 'count',
      subtitle: formatPctDelta(completed.thisMonth, completed.lastMonth, 'last month'),
      icon: 'check-circle',
      accent: 'green',
      href: '/job-requests?mine=1&status=VERIFIED_CLOSED&period=this_month',
    },
    {
      id: 'due_for_calibration',
      label: 'Due for Calibration',
      value: calibration.total,
      value_kind: 'count',
      subtitle: 'Next 30 days',
      icon: 'alert-circle',
      accent: 'red',
      href: '/equipment?registered_by_me=1&calibration_due=30d',
    },
  ];
}

// ── Public entry point ────────────────────────────────────────────────

/**
 * Build the full /dashboard/kpis payload — cache-aware.
 *
 * @param {Object} actor
 * @param {string} actor.role        Canonical role_code (e.g. 'LAB_ENGINEER').
 * @param {string} actor.employeeId  varchar(7) e.g. 'SA79900'.
 * @returns {Promise<{
 *   variant: 'my' | 'org',
 *   cards:   Array<Object>,
 *   quick_actions: Array<Object>,
 *   generatedAt: string,
 *   cacheAgeMs:  number,
 *   cacheHit:    boolean
 * }>}
 */
async function getKpis(actor) {
  const variant = variantForRole(actor.role);
  const cacheKey =
    variant === 'org' ? KEYS.ORG : KEYS.personal(actor.employeeId);

  // Cache lookup first — short TTL means even a "stale" hit is < 10 s.
  const hit = kpiCache.get(cacheKey);
  if (hit) {
    // We DO recompute `cacheAgeMs` here so the FE shows accurate "Last
    // updated Xs ago". generatedAt comes from the cached payload.
    return {
      ...hit.value,
      cacheAgeMs: hit.cacheAgeMs,
      cacheHit: true,
    };
  }

  // Cache miss — compute, then memoise.
  const cards =
    variant === 'org'
      ? await buildOrgCards()
      : await buildMyCards(actor.employeeId);

  const payload = {
    variant,
    cards,
    quick_actions: quickActionsFor(variant),
    generatedAt: new Date().toISOString(),
    cacheAgeMs: 0,
    cacheHit: false,
  };

  // Stamp before returning — minus cacheAgeMs / cacheHit (those are
  // per-response flags). We re-attach them on hit.
  const { cacheAgeMs: _a, cacheHit: _h, ...toCache } = payload;
  kpiCache.set(cacheKey, toCache);

  return payload;
}

module.exports = {
  getKpis,
  // Exported for unit testing + telemetry only.
  variantForRole,
  quickActionsFor,
  formatPctDelta,
  utilizationBandLabel,
};
