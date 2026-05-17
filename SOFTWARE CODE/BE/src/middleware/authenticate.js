// ============================================================================
// src/middleware/authenticate.js  —  Bearer-token verifier
// ----------------------------------------------------------------------------
// PURPOSE
//   Verifies the incoming access JWT, decodes its payload, and attaches a
//   small `req.user` object that downstream handlers (controllers,
//   authorize, etc.) can rely on without re-parsing the token.
//
// CONTRACT
//   On success:
//     req.user = {
//       employeeId : string,   // from JWT `sub`
//       userId     : number,   // from JWT `uid`
//       role       : string,   // from JWT `role`
//       permissions: string[], // from JWT `permissions`
//     }
//   On failure: forwards the appropriate 401 AppError (no body).
//
// FAILURE MODES (distinct codes for the FE interceptor's logic)
//   - No / malformed Authorization header  → 401 'Missing Bearer token'
//   - Signature invalid                    → 401 'Token invalid'
//   - Expired token                        → 401 'Token expired'
//
// SECURITY
//   - The same Authorization header value can be probed cheaply by
//     attackers; we keep error messages stable and avoid timing leaks
//     by always going through jwt.verify (which is constant-ish time
//     for HMAC tokens at our payload size).
// ============================================================================

'use strict';

const jwt = require('jsonwebtoken');
const jwtCfg = require('../config/jwt');
const { errors } = require('./errorHandler');

function authenticate(req, _res, next) {
  const header = req.headers.authorization;

  // ── 1. Header present & well-formed ────────────────────────────────────
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return next(errors.unauthorized('Missing Bearer token'));
  }
  // Slice exactly past 'Bearer '. Using slice(7) is intentional — split(' ')
  // would mishandle tokens that legitimately contain spaces (shouldn't
  // happen for JWTs, but defensive parsing is cheap).
  const token = header.slice(7).trim();
  if (!token) {
    return next(errors.unauthorized('Missing Bearer token'));
  }

  // ── 2. Verify signature & expiry ──────────────────────────────────────
  let payload;
  try {
    payload = jwt.verify(token, jwtCfg.accessSecret, {
      algorithms: [jwtCfg.alg], // explicit allow-list — defeats "alg: none" tricks
    });
  } catch (e) {
    // Differentiate error types so the FE can branch precisely:
    //  - "Token expired" tells the axios interceptor to try /auth/refresh
    //  - "Token invalid" means full re-login (something is tampered)
    if (e && e.name === 'TokenExpiredError') {
      return next(errors.unauthorized('Token expired'));
    }
    if (e && e.name === 'JsonWebTokenError') {
      return next(errors.unauthorized('Token invalid'));
    }
    return next(errors.unauthorized());
  }

  // ── 3. Attach a narrow, well-typed user object to the request ─────────
  // We deliberately copy from payload to a new object — downstream code
  // shouldn't accidentally read JWT-internal claims (iat, exp, jti).
  req.user = {
    employeeId: payload.sub,
    userId: payload.uid,
    role: payload.role,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  };

  return next();
}

module.exports = authenticate;
