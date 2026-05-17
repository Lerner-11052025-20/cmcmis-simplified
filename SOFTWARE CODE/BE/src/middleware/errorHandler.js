// ============================================================================
// src/middleware/errorHandler.js  —  Centralised error envelope
// ----------------------------------------------------------------------------
// PURPOSE
//   Every error that escapes a controller, service, repository, or other
//   middleware lands here. Without this file Express would respond with a
//   raw 500 + HTML stack trace — terrible for security (information leak)
//   and useless for the frontend (no machine-readable code to react to).
//
// THE ENVELOPE STANDARD (locked, do not deviate)
//
//     { "error": { "code": "<MACHINE_CODE>", "message": "<human msg>",
//                  "details": <object|array|null> } }
//
//   • code     — UPPER_SNAKE, used by the frontend to branch (e.g. on
//                "RATE_LIMITED" show a cooldown banner).
//   • message  — short, user-safe sentence. NEVER includes stack traces.
//   • details  — optional. Field-level validation errors live here.
//
// HOW TO RAISE AN ERROR
//
//     const { errors } = require('../middleware/errorHandler');
//     throw errors.unauthorized('Invalid credentials');           // → 401
//     throw errors.badRequest('Bad shape', { field: 'employee_id' }); // → 400
//
//   Never `throw new Error(...)` in business code — those become 500s with
//   the generic "Internal server error" message. The factory helpers below
//   are the only blessed way to raise an HTTP-shaped error.
//
// SECURITY
//   • Stack traces are NEVER serialised to the response, in ANY env. They
//     still appear in the server log (`req.log.error`) so engineers can
//     debug; they just don't leak to clients.
//   • Production responses for unhandled errors use a generic message
//     ("Internal server error") to avoid exposing internals. In dev we
//     surface `err.message` so the developer can see what blew up.
// ============================================================================

'use strict';

// ── AppError ─────────────────────────────────────────────────────────────
// A specialised Error that carries the three envelope fields. The factory
// helpers in `errors` below all return AppError instances.
class AppError extends Error {
  /**
   * @param {string} code        UPPER_SNAKE machine code (e.g. 'FORBIDDEN')
   * @param {string} message     Human-safe sentence shown to end users
   * @param {number} statusCode  HTTP status; defaults to 400
   * @param {*}      [details]   Optional structured detail (validation rows, ids, ...)
   */
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    // Capture a stack starting at the throw site (not this constructor).
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// ── Factory helpers ──────────────────────────────────────────────────────
// One per HTTP class we routinely emit. Adding a new helper is a deliberate
// act — keep this list tight so the frontend has a finite set of `code`s
// to branch on.
const errors = Object.freeze({
  badRequest:      (msg = 'Bad request', details = null) => new AppError('BAD_REQUEST',    msg, 400, details),
  unauthorized:    (msg = 'Authentication required')     => new AppError('UNAUTHORIZED',   msg, 401),
  forbidden:       (msg = 'Insufficient permissions')    => new AppError('FORBIDDEN',      msg, 403),
  notFound:        (msg = 'Resource not found')          => new AppError('NOT_FOUND',      msg, 404),
  conflict:        (msg = 'Conflict', details = null)    => new AppError('CONFLICT',       msg, 409, details),
  tooManyRequests: (msg = 'Rate limit exceeded')         => new AppError('RATE_LIMITED',   msg, 429),
  internal:        (msg = 'Internal server error')       => new AppError('INTERNAL',       msg, 500),
});

// ── 404 catch-all (separate middleware, mounted just before errorHandler) ─
// Express routes requests top-down. If none matched, we fall through to
// this function which produces a standard NOT_FOUND envelope. Without it,
// Express would emit its own HTML "Cannot GET /foo" page.
function notFoundHandler(req, res, next) {
  next(errors.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// ── The error handler proper ─────────────────────────────────────────────
// MUST be registered LAST in server.js. Express identifies error middleware
// by its four-argument signature (err, req, res, next) — leaving any of
// these out breaks the contract silently.
function errorHandler(err, req, res, _next) {
  // 1) Zod validation errors → 422. The `validate.js` middleware calls
  //    schema.parse() and forwards the thrown ZodError here. We unpack it
  //    into a clean details[] the frontend can highlight per-field.
  //    NOTE: no manual log here — pino-http already emits one WARN line per
  //    completed 4xx response, which is sufficient context.
  if (err && err.name === 'ZodError' && Array.isArray(err.errors)) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      },
    });
  }

  // 2) JSON body parse errors from express.json() arrive as SyntaxError
  //    with `.type === 'entity.parse.failed'`. Translate to 400 BAD_JSON.
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'BAD_JSON', message: 'Request body is not valid JSON', details: null },
    });
  }

  // 3) Payload too large (express.json `limit` exceeded) → 413.
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 1MB limit', details: null },
    });
  }

  // 4) AppError instances we threw deliberately → use their statusCode.
  //    No manual log: pino-http's request-completion line already records
  //    method/url/status/responseTime at the correct level (warn for 4xx,
  //    error for 5xx). Logging here too would duplicate every error line.
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // 5) Anything else is truly unexpected. Log the full stack server-side
  //    for forensics, but respond with a generic message.
  req.log?.error?.(
    { err: { name: err?.name, message: err?.message, stack: err?.stack }, path: req.originalUrl },
    'Unhandled error',
  );

  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: isDev && err?.message ? err.message : 'Internal server error',
      details: null,
    },
  });
}

// CJS: export the handler as the module value, attach helpers as properties.
// Consumers write either:
//   const errorHandler = require('./errorHandler');
//   const { errors, AppError } = require('./errorHandler');
module.exports = errorHandler;
module.exports.errors = errors;
module.exports.AppError = AppError;
module.exports.notFoundHandler = notFoundHandler;
