// ============================================================================
// src/middleware/authenticate.js  —  Bearer-token verifier (Phase 7 patched)
// ----------------------------------------------------------------------------
// PURPOSE
//   Verifies the incoming access JWT, then performs the Phase-7 TOKEN
//   VERSION CHECK (D-7.2) before populating req.user. The token-version
//   check is the mechanism that revokes live JWTs the moment a Super Admin
//   changes a user's role / activates / deactivates / force-logs-them-out.
//
// CONTRACT
//   On success:
//     req.user = {
//       employeeId : string,   // from JWT `sub`
//       userId     : number,   // from JWT `uid`
//       role       : string,   // from JWT `role`
//       permissions: string[], // from JWT `permissions`
//       laneScopes : string[], // optional row-level lanes for scoped roles
//       tokenVersion: number,  // from JWT `tv` (Phase 7)
//     }
//   On failure: forwards an AppError(401) with one of these reason codes
//   in the response body's error.details.reason:
//     - undefined            (default) — missing / malformed / signature
//     - 'TOKEN_EXPIRED'      — exp claim has passed
//     - 'SESSION_REVOKED'    — JWT.tv < DB.token_version (admin acted)
//
// PERFORMANCE BUDGET
//   Steady-state target: O(1) Map.get() against the token-version cache.
//   Cache miss (cold path): 1 PK SELECT on users.token_version (~0.5 ms).
//   Cache hit rate after warm-up: >95% per A14.
// ============================================================================

'use strict';

const jwt = require('jsonwebtoken');
const jwtCfg = require('../config/jwt');
const { errors } = require('./errorHandler');
const tokenVersionCache = require('../utils/tokenVersionCache');
const usersRepo = require('../modules/auth/users.repo');

/**
 * Helper: build a 401 AppError with a structured reason code in details.
 * The FE axios interceptor branches on `error.details.reason` to decide
 * whether to silently /auth/refresh (TOKEN_EXPIRED) or toast + redirect
 * (SESSION_REVOKED, default).
 */
function unauthorizedWith(reason, message) {
  const e = errors.unauthorized(message || 'Authentication required');
  e.details = { reason };
  return e;
}

async function authenticate(req, _res, next) {
  // ── 1. Header present & well-formed ──────────────────────────────────
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return next(errors.unauthorized('Missing Bearer token'));
  }
  const token = header.slice(7).trim();
  if (!token) {
    return next(errors.unauthorized('Missing Bearer token'));
  }

  // ── 2. Verify signature & expiry ─────────────────────────────────────
  let payload;
  try {
    payload = jwt.verify(token, jwtCfg.accessSecret, {
      algorithms: [jwtCfg.alg],
    });
  } catch (e) {
    if (e && e.name === 'TokenExpiredError') {
      return next(unauthorizedWith('TOKEN_EXPIRED', 'Token expired'));
    }
    if (e && e.name === 'JsonWebTokenError') {
      return next(errors.unauthorized('Token invalid'));
    }
    return next(errors.unauthorized());
  }

  if (payload.authSource === 'SSO') {
    req.user = {
      employeeId: payload.sub,
      userId: payload.uid,
      role: payload.role,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      laneScopes: Array.isArray(payload.laneScopes) ? payload.laneScopes : [],
      tokenVersion: (typeof payload.tv === 'number') ? payload.tv : 1,
      authSource: 'SSO',
    };
    return next();
  }

  // ── 3. PHASE 7 — TOKEN VERSION CHECK (D-7.2) ─────────────────────────
  // The JWT claim `tv` is the user's token_version at issue time. The
  // current value lives in users.token_version and is bumped atomically
  // by adminUsers.service on every role / status / force-logout action.
  //
  // Cache-first: tokenVersionCache.get returns null on miss or expiry.
  // On miss, we do exactly one PK SELECT and write it back.
  //
  // Defensive coding for older JWTs: tokens issued BEFORE this patch
  // shipped won't have a `tv` claim. We treat their tv as 1 (the default
  // for fresh DB rows), which means the very first admin action against
  // that user will revoke them — a graceful upgrade path with no flag day.
  const claimTv = (typeof payload.tv === 'number') ? payload.tv : 1;

  let currentTv = tokenVersionCache.get(payload.uid);
  if (currentTv === null) {
    try {
      currentTv = await usersRepo.findTokenVersionByUserId(payload.uid);
    } catch (err) {
      // DB blip — fail closed; better to ask for re-login than to let a
      // potentially revoked token through.
      req.log?.warn?.({ err: { message: err.message }, uid: payload.uid },
        'token_version DB lookup failed — failing closed');
      return next(errors.unauthorized());
    }
    if (currentTv === null) {
      // user_id in JWT no longer exists in users table (deleted? legacy?).
      return next(unauthorizedWith('SESSION_REVOKED', 'User no longer exists'));
    }
    tokenVersionCache.set(payload.uid, currentTv);
  }

  if (claimTv < currentTv) {
    // Admin has acted since this JWT was issued. Revoke.
    req.log?.info?.(
      { uid: payload.uid, claimTv, currentTv },
      'JWT rejected — token_version mismatch (SESSION_REVOKED)',
    );
    return next(unauthorizedWith(
      'SESSION_REVOKED',
      'Your access was changed by an administrator. Please sign in again.',
    ));
  }

  // ── 4. Attach a narrow, well-typed user object to the request ────────
  req.user = {
    employeeId: payload.sub,
    userId: payload.uid,
    role: payload.role,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    laneScopes: Array.isArray(payload.laneScopes) ? payload.laneScopes : [],
    tokenVersion: claimTv,
    authSource: payload.authSource || 'PASSWORD',
  };

  return next();
}

module.exports = authenticate;
