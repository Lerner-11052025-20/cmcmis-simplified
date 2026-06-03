// ============================================================================
// src/config/db.js  —  MySQL connection pool (mysql2/promise)
// ----------------------------------------------------------------------------
// PURPOSE
//   Owns the single shared connection pool to the Phase-3-sealed MySQL
//   database. Every repository in src/modules/* imports this pool and
//   uses parameterised queries through it. There is no other path to the
//   database from this process.
//
// WHY a pool, not raw connections?
//   • Connection setup (TCP handshake + AUTH) costs ~5-10ms; reusing
//     idle sockets keeps per-request DB work near zero.
//   • A pool bounds concurrency: at most DB_POOL_LIMIT queries are
//     in flight simultaneously, protecting the DB from accidental DoS
//     from a runaway loop in the app.
//
// SECURITY contract
//   • multipleStatements is OMITTED here → defaults to FALSE → mysql2
//     will refuse to execute "SELECT 1; DROP TABLE users;" as one call.
//     This neuters the most damaging form of SQL injection. The Phase-3
//     migration runner needs multi-statement support and so sets it
//     true *only there*; runtime code MUST NOT.
//   • Every query in this codebase uses `?` placeholders, never string
//     concatenation. Repositories are the only files that contain SQL.
//
// BOOT BEHAVIOUR
//   At module load we run a single `SELECT 1` to confirm credentials,
//   network, and DB name are correct. If that fails we log fatal and
//   process.exit(1). Catching this at boot rather than first request is
//   the same fail-fast philosophy as env.js.
// ============================================================================

'use strict';

const mysql = require('mysql2/promise');
const env = require('./env');
const logger = require('./logger');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,

  // Concurrency bound. Queries beyond this point queue rather than fan
  // out new sockets — protects MySQL from connection exhaustion.
  connectionLimit: env.DB_POOL_LIMIT,

  // utf8mb4 stores the full Unicode range (including emoji); 'utf8' in
  // MySQL is a legacy 3-byte alias that breaks on supplementary chars.
  charset: 'utf8mb4',

  // Tell the driver to interpret server timestamps as UTC. Combined with
  // dayjs in services, this gives us deterministic time math across
  // server, DB, and frontend (which all agree on UTC under the hood).
  timezone: 'Z',

  // Convert MySQL DATE/DATETIME values into JS Date objects rather than
  // raw strings — saves a parse step in every repository.
  dateStrings: false,

  // multipleStatements intentionally left at default (FALSE). See header.
});

// ── Boot-time connectivity check ─────────────────────────────────────────
// Self-invoked IIFE so the rest of the module can `module.exports = pool`
// synchronously. If we cannot reach MySQL we exit; there is no graceful
// degradation for a backend whose only job is to talk to the database.
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    logger.info(
      `\x1b[32m✓ DB\x1b[0m connected | ${env.DB_HOST}:${env.DB_PORT} | ${env.DB_NAME} | pool ${env.DB_POOL_LIMIT}`,
    );
  } catch (err) {
    logger.fatal({ err: { message: err.message, code: err.code } }, 'DB pool failed to connect — exiting');
    // Give pino's async transport a tick to flush before we kill the process,
    // otherwise the fatal line may never reach the console.
    setTimeout(() => process.exit(1), 50);
  }
})();

module.exports = pool;
