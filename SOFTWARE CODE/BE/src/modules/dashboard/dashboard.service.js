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
  // Run all 8 KPI groups in parallel — independent queries, independent
  // pool connections. The pool max is ≥ 10; these are all COUNT-only
  // sub-50 ms queries so the batch finishes well under the 150 ms p50
  // target for cold cache misses.
  // Run 7 KPI groups in parallel (Calibration Due removed per UX decision).
  const [
    pending,
    completed,
    activeEqm,
    inProgress,
    openJC,
    overdueCalibration,
    newEqmThisWeek,
  ] = await Promise.all([
    repo.orgPendingJobs(),
    repo.orgCompletedThisWeek(),
    repo.orgTotalActiveEquipment(),
    repo.orgInProgressJobs(),
    repo.orgOpenJobCards(),
    repo.orgOverdueCalibrations(),
    repo.orgNewEquipmentThisWeek(),
  ]);

  return [
    // ── Row 1 ────────────────────────────────────────────────────────
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
      id: 'total_active_equipment',
      label: 'Active Equipment',
      value: activeEqm.total,
      value_kind: 'count',
      subtitle: activeEqm.thisWeek > 0
        ? `+${activeEqm.thisWeek} registered this week`
        : 'No new registrations this week',
      icon: 'box',
      accent: 'emerald',
      href: '/equipment',
    },
    {
      id: 'in_progress_jobs',
      label: 'In Progress Jobs',
      value: inProgress.total,
      value_kind: 'count',
      subtitle: inProgress.total > 0 ? 'Work underway' : 'No work in progress',
      icon: 'activity',
      accent: 'blue',
      href: '/job-requests?status=IN_PROGRESS',
    },
    // ── Row 2 ────────────────────────────────────────────────────────
    {
      id: 'open_job_cards',
      label: 'Open Job Cards',
      value: openJC.total,
      value_kind: 'count',
      subtitle: openJC.total > 0 ? 'Awaiting completion' : 'All cards closed',
      icon: 'clipboard-list',
      accent: 'indigo',
      href: '/job-cards',
    },
    {
      id: 'overdue_calibrations',
      label: 'Overdue Calibrations',
      value: overdueCalibration.total,
      value_kind: 'count',
      subtitle: overdueCalibration.total > 0 ? 'Past due date — action needed' : 'No overdue equipment',
      icon: 'alert-triangle',
      accent: 'orange',
      href: '/equipment',
    },
    {
      id: 'new_equipment_this_week',
      label: 'New Equipment (Week)',
      value: newEqmThisWeek.total,
      value_kind: 'count',
      subtitle: formatPctDelta(newEqmThisWeek.total, newEqmThisWeek.lastWeek, 'last week'),
      icon: 'calendar-plus',
      accent: 'violet',
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
    drafts,
    myEqm,
    overdueCalibration,
    approvedQueued,
  ] = await Promise.all([
    repo.myActiveRequests(employeeId),
    repo.myInProgress(employeeId),
    repo.myCompletedThisMonth(employeeId),
    repo.myCalibrationDue30d(employeeId),
    repo.myDraftRequests(employeeId),
    repo.myEquipmentCount(employeeId),
    repo.myOverdueCalibrations(employeeId),
    repo.myApprovedQueued(employeeId),
  ]);

  return [
    // ── Row 1 ────────────────────────────────────────────────────────
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
    // ── Row 2 ────────────────────────────────────────────────────────
    {
      id: 'my_drafts',
      label: 'My Drafts',
      value: drafts.total,
      value_kind: 'count',
      subtitle: drafts.total > 0 ? 'Unsent — click to review' : 'No pending drafts',
      icon: 'file-plus',
      accent: 'slate',
      href: '/job-requests?mine=1&status=DRAFT',
    },
    {
      id: 'my_equipment',
      label: 'My Equipment',
      value: myEqm.total,
      value_kind: 'count',
      subtitle: 'Registered by me (active)',
      icon: 'package',
      accent: 'emerald',
      href: '/equipment?registered_by_me=1',
    },
    {
      id: 'my_overdue_calibrations',
      label: 'My Overdue Cal.',
      value: overdueCalibration.total,
      value_kind: 'count',
      subtitle: overdueCalibration.total > 0 ? 'Past due — action needed' : 'All calibrations current',
      icon: 'alert-triangle',
      accent: 'orange',
      href: '/equipment?registered_by_me=1',
    },
    {
      id: 'my_approved_queued',
      label: 'Approved & Queued',
      value: approvedQueued.total,
      value_kind: 'count',
      subtitle: approvedQueued.total > 0 ? 'Waiting for engineer to start' : 'No queued work',
      icon: 'hourglass',
      accent: 'violet',
      href: '/job-requests?mine=1&status=ASSIGNED',
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

  // Cache miss — compute cards + recent activity in parallel, then memoise.
  const [cards, recent_activity] = await Promise.all([
    variant === 'org'
      ? buildOrgCards()
      : buildMyCards(actor.employeeId),
    repo.recentActivity(variant, actor.employeeId),
  ]);

  const payload = {
    variant,
    cards,
    recent_activity,
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
