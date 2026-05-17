// ============================================================================
// src/config/logger.js  —  Structured logger (pino)
// ----------------------------------------------------------------------------
// PURPOSE
//   One canonical logger instance shared by the whole backend. Pino is a
//   ~5× faster JSON logger than Winston with the right defaults for
//   production: machine-readable lines, level filtering, async writes,
//   and pluggable transports.
//
// WHY pino over console.log?
//   • Structured JSON → grep/jq/ELK-friendly in prod.
//   • Levels (fatal/error/warn/info/debug/trace) → filterable noise.
//   • REDACTION → can scrub secrets out of every line automatically.
//
// SECURITY: the `redact.paths` array is the single most important
// configuration in this file. Anything matching a path is replaced by
// '***' BEFORE the line is serialised. We redact:
//   • Authorization header  (would leak the access token)
//   • Cookie header         (would leak the refresh token)
//   • Set-Cookie response header
//   • Any property literally named password / password_hash
//   • Any property literally named jwtAccessSecret / jwtRefreshSecret
// If you add a new logging call that includes a secret-bearing object,
// extend this list — do not weaken it.
// ============================================================================

'use strict';

const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.LOG_LEVEL,

  // ── Redaction: scrub secrets from EVERY log record ──────────────────────
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.password_hash',
      '*.jwtAccessSecret',
      '*.jwtRefreshSecret',
    ],
    censor: '***',
  },

  // ── Base context attached to every log line ─────────────────────────────
  base: {
    service: 'cmcmis-be',
    env: env.NODE_ENV,
  },

  // ── Transport: pretty-print in dev, raw JSON in prod ────────────────────
  // pino-pretty is a separate process pipe that formats records for humans.
  // In production we want raw JSON so log shippers can parse it directly.
  transport: env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service,env',
        },
      }
    : undefined,
});

module.exports = logger;
