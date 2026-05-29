// ============================================================================
// src/config/jwt.js  —  JWT configuration facade
// ----------------------------------------------------------------------------
// PURPOSE
//   Exposes the JWT-relevant pieces of `env` under a single import so that
//   auth.service.js, authenticate.js, and any future token-handling code do
//   not have to import `env` directly and reach for JWT_* fields.
//
//   This is a thin facade — its real value is *discoverability*. A reviewer
//   reading auth.service.js sees `require('../../config/jwt')` and knows
//   exactly which knobs the service depends on, without scrolling through
//   the entire env schema.
//
// WHY centralise?
//   If we later switch from HS256 to RS256, or add a key-rotation strategy,
//   only this file changes. Service code keeps reading from the same
//   shape: { accessSecret, refreshSecret, accessTtlSec, refreshTtlSec, alg }.
// ============================================================================

'use strict';

const env = require('./env');

module.exports = Object.freeze({
  // Symmetric signing — appropriate for a single-process backend. If/when
  // we scale horizontally and want public-key verification we move to RS256.
  alg: 'HS256',

  // Secrets (32+ chars each, enforced different by env.js).
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,

  // Lifetimes in seconds. The numbers themselves are tradeoffs:
  //   • 15-min access  → small blast radius if a token is stolen.
  //   • 7-day refresh  → users stay signed in across a working week.
  // Both are owasp-aligned defaults. Change here, not at call sites.
  accessTtlSec: env.JWT_ACCESS_TTL_SEC,
  refreshTtlSec: env.JWT_REFRESH_TTL_SEC,
});
