// ============================================================================
// src/middleware/authorize.js  —  Permission-gate middleware factory
// ----------------------------------------------------------------------------
// PURPOSE
//   Express middleware that enforces RBAC at the route level. Always
//   used AFTER `authenticate` — meaning `req.user` is guaranteed to be
//   populated by the time this runs, and we only need to compare
//   permission strings.
//
// USAGE
//
//     const authenticate = require('../../middleware/authenticate');
//     const authorize    = require('../../middleware/authorize');
//     const { authorizeAny } = authorize;
//
//     // single permission required
//     router.get('/equipment',
//       authenticate,
//       authorize('equipment:read-list'),
//       ctrl.list,
//     );
//
//     // any one of several permissions is sufficient
//     router.get('/job-requests',
//       authenticate,
//       authorizeAny('job_request:read-own', 'job_request:read-all'),
//       ctrl.list,
//     );
//
// CORE RULE (BR-RBAC-03)
//   NEVER check role names. Always check PERMISSION CODES. Roles are
//   collections of permissions; checking the role bakes that mapping
//   into route handlers and makes future role-permission edits a
//   refactor instead of a config change. The JWT carries the resolved
//   `permissions[]` array (computed at login / refresh time) precisely
//   so route code can perform a single Array.includes() against a
//   stable string.
//
// HTTP CONTRACT
//   • Not authenticated  → 401 UNAUTHORIZED  (authenticate already
//                          handled this, but we double-check defensively)
//   • Authenticated, missing permission → 403 FORBIDDEN
//
//   The 401-vs-403 split matters: the FE axios interceptor retries 401
//   via /auth/refresh, but 403 is terminal — show a "forbidden" page.
//   Conflating them would create infinite refresh loops.
//
// FORENSICS
//   Every denial logs a `warn` line with the permission code + the
//   employee_id. Sustained 403s from one user often indicate either a
//   broken UI gate (the FE rendered an action it shouldn't) or someone
//   probing for excess privilege.
// ============================================================================

'use strict';

const { errors } = require('./errorHandler');

/**
 * Build a middleware that requires a single permission code.
 *
 * @param {string} permission  e.g. 'equipment:create'
 * @returns Express middleware
 */
function authorize(permission) {
  if (typeof permission !== 'string' || permission.length === 0) {
    // Throw at module-load time, not request time. A misconfigured route
    // should crash the server boot, not silently allow every request.
    throw new Error(`authorize(): permission must be a non-empty string (got: ${permission})`);
  }

  return function authorizeMiddleware(req, _res, next) {
    // Defensive: in well-wired routes authenticate ran first and req.user
    // is populated. If something upstream forgot it, fail closed (401).
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return next(errors.unauthorized('Authentication required'));
    }

    if (!req.user.permissions.includes(permission)) {
      // Structured warn line for forensic correlation.
      req.log?.warn?.(
        {
          permission,
          employeeId: req.user.employeeId,
          role: req.user.role,
          permissionCount: req.user.permissions.length,
          path: req.originalUrl,
        },
        'Permission denied',
      );
      return next(errors.forbidden(`Missing required permission: ${permission}`));
    }

    return next();
  };
}

/**
 * Build a middleware that requires AT LEAST ONE of the given permissions.
 *
 * Used when several permissions cover the same endpoint — typically a
 * "read-own" + "read-all" pair where either is sufficient to GET the
 * resource (row-level filtering further narrows what the user sees).
 *
 * @param  {...string} permissions  e.g. 'job_request:read-own', 'job_request:read-all'
 * @returns Express middleware
 */
function authorizeAny(...permissions) {
  if (permissions.length === 0 || permissions.some((p) => typeof p !== 'string' || !p)) {
    throw new Error('authorizeAny(): pass one or more non-empty permission strings');
  }

  return function authorizeAnyMiddleware(req, _res, next) {
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return next(errors.unauthorized('Authentication required'));
    }

    const owned = new Set(req.user.permissions);
    const matched = permissions.some((p) => owned.has(p));

    if (!matched) {
      req.log?.warn?.(
        {
          permissionsRequired: permissions,
          employeeId: req.user.employeeId,
          role: req.user.role,
          path: req.originalUrl,
        },
        'Permission denied (none of the required permissions held)',
      );
      return next(errors.forbidden(`Missing any of required permissions: ${permissions.join(', ')}`));
    }

    return next();
  };
}

// Default export = the single-permission factory (most-common case).
// `authorizeAny` is exposed as a property for the rarer multi-perm case.
module.exports = authorize;
module.exports.authorizeAny = authorizeAny;
