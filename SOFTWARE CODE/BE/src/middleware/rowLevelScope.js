// ============================================================================
// src/middleware/rowLevelScope.js  —  Row-level scope resolver (BR-VIS-01)
// ----------------------------------------------------------------------------
// PURPOSE
//   Run AFTER `authenticate` and the route's permission gate. Inspects the
//   caller's permissions for a "broad" code (read-all / read-list) vs a
//   "narrow" one (read-own); writes the decision onto `req.scope` so the
//   repo can build the right WHERE clause.
//
//   The actual filter SQL lives in the repo — this middleware ONLY decides
//   *who* the rows must belong to and exposes the decision via:
//
//     req.scope = {
//       resource:        'job_request' | 'job_card' | ...
//       canReadAll:      boolean   ← if true, no row-level filter
//       ownerEmployeeId: string    ← cmms_emp_mst.EMM_ID for the caller
//       laneScopes:      string[]  ← optional row-level lane filter
//     }
//
// PRECEDENCE (broadest wins)
//   1. `${resource}:read-all`  → canReadAll = true (e.g. LIC, SA, VIEW_ONLY on JR)
//   2. `${resource}:read-list` → canReadAll = true (e.g. JC has no own/all split)
//   3. `${resource}:read-own`  → canReadAll = false, ownerEmployeeId set
//   4. None of the above       → caller wasn't even gated through here;
//                                 fail-closed with 401 to surface the bug.
//
// USAGE
//   const rowLevelScope = require('../../middleware/rowLevelScope');
//   router.get('/',
//     authenticate,
//     authorizeAny('job_request:read-all', 'job_request:read-own'),
//     rowLevelScope('job_request'),
//     validate(listQuerySchema, 'query'),
//     ctrl.list,
//   );
// ============================================================================

'use strict';

const { errors } = require('./errorHandler');

/**
 * Factory. Closes over `resource` so the returned middleware is a hot-path
 * one-liner that does at most three Set.has() lookups per request.
 *
 * @param {string} resource  e.g. 'job_request' or 'job_card'
 * @returns Express middleware
 */
function rowLevelScope(resource) {
  if (typeof resource !== 'string' || !resource) {
    throw new Error('rowLevelScope(resource): resource must be a non-empty string');
  }
  // Pre-compute the permission codes so the middleware itself does no
  // string work per request.
  const readAllCode  = `${resource}:read-all`;
  const readListCode = `${resource}:read-list`;
  const readOwnCode  = `${resource}:read-own`;

  return function rowLevelScopeMw(req, _res, next) {
    // Defensive: should never trip when paired with authenticate, but
    // failing closed beats silently treating "no user" as "no filter".
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return next(errors.unauthorized('Authentication required'));
    }

    const perms = new Set(req.user.permissions);
    const canReadAll =
      perms.has(readAllCode) || perms.has(readListCode);
    const hasOwn = perms.has(readOwnCode);

    if (!canReadAll && !hasOwn) {
      // Route is misconfigured (no permission gate or wrong codes used)
      // — fail-closed and log for forensics.
      req.log?.warn?.(
        { resource, employeeId: req.user.employeeId, role: req.user.role },
        'rowLevelScope: caller has neither read-all/list nor read-own — failing closed',
      );
      return next(errors.forbidden('Missing read permission'));
    }

    req.scope = {
      resource,
      canReadAll,
      ownerEmployeeId: req.user.employeeId,
      // Empty array = legacy global role or personal-only user. Non-empty
      // means "read-all/list is still constrained to these operational lanes".
      laneScopes: Array.isArray(req.user.laneScopes) ? req.user.laneScopes : [],
    };
    return next();
  };
}

module.exports = rowLevelScope;
