// ============================================================================
// src/modules/users/users.controller.js  —  Current-user endpoint handler
// ----------------------------------------------------------------------------
// PURPOSE
//   GET /api/v1/me — returns the authenticated user's identity and
//   permission set. Used by the frontend in two scenarios:
//
//     1. On every page reload, the auth-context calls /me (or first
//        /auth/refresh, then /me) so the sidebar and ProtectedRoute
//        gates can re-evaluate without re-prompting for a password.
//     2. As a quick "who am I?" debug probe during development.
//
// WHY a SEPARATE endpoint instead of just returning the user on /login?
//   /login already returns it — but the access token expires every 15
//   minutes. After a silent refresh the FE has a new access token but
//   may want to re-validate its in-memory user shape against the
//   server's view (e.g. role just changed). /me is the canonical place
//   to ask "what does the server believe about the holder of THIS
//   token, right now?"
//
// PERFORMANCE NOTE
//   This handler does NOT hit the database. Everything it returns comes
//   from req.user, which authenticate.js populated from the JWT payload
//   in O(1) time. If we ever need to enrich the response with
//   server-side joins (e.g. profile photo, last_login_at), we add a
//   service layer and a users.repo.findMe() — but until that's needed,
//   one round trip is one round trip too many.
// ============================================================================

'use strict';

/**
 * GET /api/v1/me handler.
 *
 * @param {import('express').Request}  req  with req.user from authenticate.js
 * @param {import('express').Response} res
 */
async function getMe(req, res) {
  // authenticate.js guarantees req.user is set when this controller runs.
  // (If the middleware wiring is ever broken, fail loudly so we notice.)
  if (!req.user) {
    // This should be unreachable in normal flow — authenticate would
    // have returned 401 already. The explicit guard is defence-in-depth.
    return res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'authenticate middleware did not populate req.user',
        details: null,
      },
    });
  }

  return res.json({
    data: {
      employeeId: req.user.employeeId,
      userId: req.user.userId,
      role: req.user.role,
      permissions: req.user.permissions,
    },
  });
}

module.exports = { getMe };
