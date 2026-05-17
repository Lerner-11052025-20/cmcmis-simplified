// ============================================================================
// src/server.js  —  Application entry point (STEP 2: middleware pipeline)
// ----------------------------------------------------------------------------
// PURPOSE
//   Assembles configuration, the request pipeline, and the HTTP listener.
//   At STEP 2 the auth and users routers do not yet exist (they arrive in
//   STEPs 3 and 5). The pipeline below is the locked order; future steps
//   only *insert* middleware at the marked points — they do not reshuffle.
//
// THE 13-STEP PIPELINE (locked, copy-paste from FINAL-DESC-CMCMIS)
//
//   incoming request
//     1.  helmet()           ← security headers
//     2.  cors()             ← reject foreign origins
//     3.  compression()      ← gzip responses
//     4.  express.json()     ← parse JSON body (1MB cap)
//     5.  cookie-parser()    ← parse refresh cookie
//     6.  pino-http()        ← per-request log line + req.log
//     7.  rateLimit()        ← STEP 4 — applied per-router on /auth/*
//     8.  authenticate()     ← STEP 4 — applied per-router on protected routes
//     9.  authorize()        ← STEP 4 — applied per-route on permission gates
//    10.  rowLevelScope()    ← Phase 5+
//    11.  validate(schema)   ← STEP 3+ — applied per-route via factory
//    12.  controller         ← business handler
//    13.  notFound + errorHandler  ← ALWAYS LAST
//   outgoing response
//
//   The order matters. helmet must run before any handler because some of
//   its headers (HSTS, CSP) need to be on the eventual response regardless
//   of which router answers. cors must run before json because CORS
//   pre-flight OPTIONS requests carry no body. cookie-parser must run
//   before any route that reads `req.cookies`. pino-http should be
//   *after* the parsers so the per-request log line includes the parsed
//   body shape (with secrets redacted by the logger's redact rules).
// ============================================================================

'use strict';

// ── Foundational config (may exit the process on failure) ────────────────
const env = require('./config/env');
const logger = require('./config/logger');
require('./config/db'); // side-effect: kicks off the connectivity check

// ── Third-party middleware ───────────────────────────────────────────────
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');

// ── App-owned middleware ─────────────────────────────────────────────────
const errorHandler = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// `trust proxy` lets Express look at X-Forwarded-For to compute req.ip.
// In dev this is harmless; in prod (behind Nginx) it is essential for
// accurate rate-limiting and audit logging. The Phase 10 deployment
// will ensure Nginx is the only thing setting this header.
app.set('trust proxy', 1);

// Disable the "X-Powered-By: Express" banner — small information leak.
app.disable('x-powered-by');

// ── 1. helmet ────────────────────────────────────────────────────────────
// Adds ~15 OWASP-recommended security headers in one line:
//   X-Content-Type-Options: nosniff   (blocks MIME-sniffing attacks)
//   X-Frame-Options: SAMEORIGIN       (blocks clickjacking)
//   Strict-Transport-Security ...     (forces HTTPS — only in prod)
//   Content-Security-Policy ...       (restricts where scripts can load from)
//   ... and more.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // The API server only ever calls itself and the configured frontend
        // origin. In Phase 10 (HTTPS prod) this list expands minimally.
        connectSrc: ["'self'", env.CORS_ORIGIN],
      },
    },
    // crossOriginResourcePolicy: 'same-site' is the default; left as-is.
  }),
);

// ── 2. cors ──────────────────────────────────────────────────────────────
// Browsers block cross-origin requests by default. The frontend on
// localhost:5173 needs to call this API on localhost:3000. CORS opens
// that channel — but ONLY for the exact origin we trust.
//
// credentials: true is REQUIRED for the httpOnly refresh cookie to be
// sent by the browser. Without it, the cookie is silently dropped on
// every cross-origin request and refresh never works.
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    // Browsers respect this; CORS pre-flight responses cache for 10 min,
    // saving an OPTIONS round-trip on every subsequent request.
    maxAge: 600,
  }),
);

// ── 3. compression ───────────────────────────────────────────────────────
// gzip/brotli for response bodies. JSON compresses ~70% — helps the
// p95-latency NFR. Pure win in dev too: smaller payloads in the Network
// tab make diffing responses easier.
app.use(compression());

// ── 4. JSON body parser (capped at 1MB) ─────────────────────────────────
// Without `limit`, an attacker could POST a 5GB body and starve memory.
// 1MB is plenty for any legitimate JR/JC payload; equipment file
// uploads will go through a separate multer-based route in Phase 5+.
app.use(express.json({ limit: '1mb' }));

// ── 5. cookie-parser ────────────────────────────────────────────────────
// Reads the `Cookie:` request header into `req.cookies` as an object.
// This is the ONLY way to extract the httpOnly refresh token (the FE
// cannot read its own httpOnly cookie, by design — see Phase 4 docs).
app.use(cookieParser());

// ── 6. pino-http ────────────────────────────────────────────────────────
// One log line per request. The custom serializers strip the noisy header
// blob and verbose req/res objects so each line is a single readable row:
//   method, url, status, durationMs, requestId, ip.
// errorHandler.js does NOT emit extra log lines — pino-http's single
// completion line is the canonical record for every request.
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => env.NODE_ENV === 'development' && req.url === '/healthz',
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} → ${res.statusCode}`,
    customErrorMessage: (req, res) =>
      `${req.method} ${req.url} → ${res.statusCode}`,
    // Slim serializers — drop headers, drop res body, keep just the fields
    // we actually want to read at 2am.
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        ip: req.remoteAddress,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  }),
);

// =====================================================================
//   ROUTES
// ---------------------------------------------------------------------
//   /healthz                     — public, mounted at root
//   /api/v1/auth/* (STEP 3)      — login, refresh, logout
//   /api/v1/me     (STEP 5)      — current user profile
// =====================================================================

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), env: env.NODE_ENV });
});

// ── Auth module (STEP 3) ────────────────────────────────────────────────
const authRoutes = require('./modules/auth/auth.routes');
app.use(`${env.API_BASE_PATH}/auth`, authRoutes);

// ── Users module (STEP 5) ───────────────────────────────────────────────
// Mounted at base path → exposes GET /api/v1/me. /me represents "the
// holder of the current token", which is conceptually distinct from a
// row in a users collection (collection routes will live under
// /admin/users in Phase 8).
const usersRoutes = require('./modules/users/users.routes');
app.use(`${env.API_BASE_PATH}`, usersRoutes);

// ── Equipment module (Phase 5) ──────────────────────────────────────────
// Mounted at /api/v1/equipment — see modules/equipment/equipment.routes.js
// for the full route table. Read-list + create implemented this phase;
// detail/update/verify/condemn/delete stubbed with 404 until Phase 6.
const equipmentRoutes = require('./modules/equipment/equipment.routes');
app.use(`${env.API_BASE_PATH}/equipment`, equipmentRoutes);

// ── 13a. 404 — anything that didn't match a route above falls through ───
// Mounted JUST BEFORE the error handler. notFoundHandler synthesises an
// AppError(NOT_FOUND) and forwards it; errorHandler does the rendering.
app.use(notFoundHandler);

// ── 13b. Centralised error handler — MUST be the last app.use() ─────────
// Express identifies error middleware by its 4-arg signature. Anything
// any prior middleware or route calls next(err) with ends up here.
app.use(errorHandler);

// ── HTTP listener ───────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server ready');
});

// ── Graceful shutdown ────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received — closing HTTP server');
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server close');
      process.exit(1);
    }
    logger.info('HTTP server closed — exiting');
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Last-resort safety nets ─────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err: { message: err.message, stack: err.stack } }, 'Uncaught exception — exiting');
  setTimeout(() => process.exit(1), 50);
});
