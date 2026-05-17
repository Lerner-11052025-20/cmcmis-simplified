#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════
 * CMCMIS_SIMPLIFIED — Phase 3 Migration Runner
 * File:     run-migrations.js
 *
 * Purpose:  Idempotent runner that applies all migrations in
 *           /migrations/ in alphabetical order, tracks state in a
 *           `schema_migrations` table, and supports dry-run.
 *
 * Usage:
 *   node run-migrations.js                # apply all pending
 *   node run-migrations.js --dry-run      # show what WOULD run
 *   node run-migrations.js --status       # show migration status
 *   node run-migrations.js --reset        # DANGER: drops schema_migrations
 *
 * Env (from .env or shell):
 *   DB_HOST                  (default: localhost)
 *   DB_PORT                  (default: 3306)
 *   DB_USER                  (default: root)
 *   DB_PASSWORD              (default: empty)
 *   DB_NAME                  (default: final)
 *   BCRYPT_ROUNDS            (default: 12  — use 10 for dev/test)
 *   SUPER_ADMIN_EMPLOYEE_IDS (default: SA79900,AC77777)
 *   NODE_ENV                 (development | production)
 *
 * Author:   Claude (AI engineering pair) for Deep Sorathiya (DS)
 * Version:  v2.0 LOCKED
 * ════════════════════════════════════════════════════════════════════
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const mysql    = require('mysql2/promise');
require('dotenv').config();

// ────────────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────────────
const CFG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'final',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ||
    (process.env.NODE_ENV === 'production' ? '12' : '10'), 10),
  superAdminEmployeeIds:
    process.env.SUPER_ADMIN_EMPLOYEE_IDS || 'SA79900,AC77777',
  migrationsDir: path.resolve(__dirname, '..', 'migrations'),
};

const C = {  // chalk-less colored output
  reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  cyan: '\x1b[36m', gray: '\x1b[90m',
};

const banner = (msg) => console.log(`${C.cyan}${C.bold}${msg}${C.reset}`);
const ok     = (msg) => console.log(`${C.green}✓ ${msg}${C.reset}`);
const warn   = (msg) => console.log(`${C.yellow}⚠ ${msg}${C.reset}`);
const err    = (msg) => console.log(`${C.red}✗ ${msg}${C.reset}`);
const info   = (msg) => console.log(`${C.gray}  ${msg}${C.reset}`);


// ────────────────────────────────────────────────────────────────────
// ARGS
// ────────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const isStatus = args.has('--status');
const isReset  = args.has('--reset');


// ────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────
function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function listMigrationFiles() {
  if (!fs.existsSync(CFG.migrationsDir)) {
    throw new Error(`Migrations dir not found: ${CFG.migrationsDir}`);
  }
  return fs.readdirSync(CFG.migrationsDir)
    .filter(f => /\.(sql|js)$/.test(f) && !f.startsWith('.'))
    .sort();  // alphabetical → 001 first, 099 last
}

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
      \`migration_id\`     VARCHAR(120) NOT NULL PRIMARY KEY,
      \`checksum_sha256\`  VARCHAR(64)  NOT NULL,
      \`applied_at\`       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`applied_by\`       VARCHAR(40)  NULL,
      \`duration_ms\`      INT UNSIGNED NULL,
      \`success\`          TINYINT(1)   NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
  `);
}

async function isApplied(conn, migrationId) {
  const [rows] = await conn.query(
    'SELECT migration_id, checksum_sha256 FROM `schema_migrations` ' +
    'WHERE migration_id = ? AND success = 1 LIMIT 1',
    [migrationId]
  );
  return rows[0] || null;
}

async function recordApplied(conn, migrationId, checksum, durationMs) {
  await conn.query(
    `INSERT INTO \`schema_migrations\`
       (migration_id, checksum_sha256, applied_at, applied_by, duration_ms, success)
     VALUES (?, ?, NOW(6), ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       checksum_sha256 = VALUES(checksum_sha256),
       applied_at      = NOW(6),
       duration_ms     = VALUES(duration_ms),
       success         = 1`,
    [migrationId, checksum, process.env.USER || 'runner', durationMs]
  );
}


// ────────────────────────────────────────────────────────────────────
// EXECUTE SQL FILE (multi-statement aware via mysql2 multipleStatements)
// ────────────────────────────────────────────────────────────────────
async function runSqlFile(conn, filePath, fileName) {
  const sql = fs.readFileSync(filePath, 'utf8');

  // mysql2's `query()` with multipleStatements=true handles DELIMITER blocks
  // and CALL statements transparently. We rely on the connection-level flag.
  // The driver returns a result-set per statement; we ignore the values.
  await conn.query(sql);
}


// ────────────────────────────────────────────────────────────────────
// EXECUTE JS FILE (must export { up(connection, env) })
// ────────────────────────────────────────────────────────────────────
async function runJsFile(conn, filePath, fileName) {
  // Clear require cache so re-runs pick up edits during development
  delete require.cache[require.resolve(filePath)];
  const mod = require(filePath);
  if (typeof mod.up !== 'function') {
    throw new Error(`JS migration ${fileName} must export an 'up(conn, env)' function`);
  }
  await mod.up(conn, {
    SUPER_ADMIN_EMPLOYEE_IDS: CFG.superAdminEmployeeIds,
    BCRYPT_ROUNDS: String(CFG.bcryptRounds),
    NODE_ENV: process.env.NODE_ENV || 'development',
  });
}


// ────────────────────────────────────────────────────────────────────
// MAIN COMMANDS
// ────────────────────────────────────────────────────────────────────
async function cmdStatus(conn) {
  await ensureMigrationsTable(conn);
  const files = listMigrationFiles();
  const [appliedRows] = await conn.query(
    'SELECT migration_id, applied_at, duration_ms FROM `schema_migrations` ORDER BY migration_id'
  );
  const appliedMap = new Map(appliedRows.map(r => [r.migration_id, r]));

  console.log('');
  banner('MIGRATION STATUS');
  console.log('');
  console.log(`${C.bold}  ID                                        STATUS    APPLIED AT             DURATION${C.reset}`);
  console.log(`  ──────────────────────────────────────────────────────────────────────────────────────`);
  for (const f of files) {
    const rec = appliedMap.get(f);
    if (rec) {
      console.log(`  ${C.green}✓${C.reset} ${f.padEnd(40)} APPLIED   ${rec.applied_at.toISOString()}  ${(rec.duration_ms || 0) + 'ms'}`);
    } else {
      console.log(`  ${C.yellow}○${C.reset} ${f.padEnd(40)} PENDING`);
    }
  }
  console.log('');
}

async function cmdApply(conn) {
  await ensureMigrationsTable(conn);
  const files = listMigrationFiles();

  banner(`Migration runner starting (${isDryRun ? 'DRY-RUN' : 'APPLY'})`);
  info(`DB: ${CFG.user}@${CFG.host}:${CFG.port}/${CFG.database}`);
  info(`Bcrypt rounds: ${CFG.bcryptRounds}`);
  info(`Super Admin IDs: ${CFG.superAdminEmployeeIds}`);
  info(`Migrations dir: ${CFG.migrationsDir}`);
  info(`Found ${files.length} migration file(s).`);
  console.log('');

  for (const f of files) {
    const filePath = path.join(CFG.migrationsDir, f);
    const buf      = fs.readFileSync(filePath);
    const checksum = sha256(buf);
    const prev     = await isApplied(conn, f);

    if (prev) {
      if (prev.checksum_sha256 === checksum) {
        info(`[SKIP]  ${f}  (already applied, checksum matches)`);
      } else {
        warn(`[SKIP]  ${f}  (already applied BUT checksum differs!)`);
        warn(`        stored=${prev.checksum_sha256.slice(0, 16)}…`);
        warn(`        file  =${checksum.slice(0, 16)}…`);
        warn(`        File was edited after apply. Resolve manually if intentional.`);
      }
      continue;
    }

    if (isDryRun) {
      console.log(`${C.cyan}[DRY]   ${f}${C.reset}  (would run, checksum=${checksum.slice(0, 12)}…)`);
      continue;
    }

    console.log(`${C.bold}▶ ${f}${C.reset}`);
    const t0 = Date.now();
    try {
      if (f.endsWith('.sql')) {
        await runSqlFile(conn, filePath, f);
      } else if (f.endsWith('.js')) {
        await runJsFile(conn, filePath, f);
      } else {
        warn(`  skipped (unknown extension): ${f}`);
        continue;
      }
      const ms = Date.now() - t0;
      await recordApplied(conn, f, checksum, ms);
      ok(`${f}  (${ms}ms)`);
    } catch (e) {
      err(`${f} failed: ${e.message}`);
      throw e;
    }
  }

  console.log('');
  ok('All migrations processed.');
}

async function cmdReset(conn) {
  warn('--reset will DROP the schema_migrations table. (Tables themselves untouched.)');
  warn('Re-running migrations afterwards will re-execute every file.');
  await conn.query('DROP TABLE IF EXISTS `schema_migrations`');
  ok('schema_migrations dropped.');
}


// ────────────────────────────────────────────────────────────────────
// VERIFICATION CHECKLIST (post-bootstrap, per v2.0 §17)
// ────────────────────────────────────────────────────────────────────
async function runVerification(conn) {
  console.log('');
  banner('POST-BOOTSTRAP VERIFICATION CHECKLIST (v2.0 §17)');
  console.log('');

  const checks = [
    {label: 'roles count == 5',                sql: 'SELECT COUNT(*) AS n FROM `roles`',                                    want: 5},
    {label: 'permissions count == 40',         sql: 'SELECT COUNT(*) AS n FROM `permissions`',                              want: 40},
    {label: 'role_permissions count > 100',    sql: 'SELECT COUNT(*) AS n FROM `role_permissions`',                         min: 100},
    {label: 'users count == 2',                sql: 'SELECT COUNT(*) AS n FROM `users`',                                    want: 2},
    {label: 'user_roles count == 2',           sql: 'SELECT COUNT(*) AS n FROM `user_roles`',                               want: 2},
    {label: 'departments count == 1',          sql: "SELECT COUNT(*) AS n FROM `departments` WHERE `department_code`='TIMCD'", want: 1},
    {label: 'sections count == 2',             sql: "SELECT COUNT(*) AS n FROM `sections` WHERE `section_code` IN ('TME','FPE')", want: 2},
    {label: 'cmms_emp_mst includes SA79900',   sql: "SELECT COUNT(*) AS n FROM `cmms_emp_mst` WHERE `EMM_ID`='SA79900'",    want: 1},
    {label: 'cmms_emp_mst includes AC77777',   sql: "SELECT COUNT(*) AS n FROM `cmms_emp_mst` WHERE `EMM_ID`='AC77777'",    want: 1},
    {label: 'cmms_section_mst includes ADMIN (9999)', sql: "SELECT COUNT(*) AS n FROM `cmms_section_mst` WHERE `SM_ID`=9999", want: 1},
    {label: 'lookup values seeded',            sql: "SELECT COUNT(*) AS n FROM `cmms_parameter_master` WHERE `CategoryID` BETWEEN 100 AND 199", min: 25},
    {label: 'audit_log has bootstrap rows',    sql: "SELECT COUNT(*) AS n FROM `audit_log` WHERE `actor_employee_id`='BOOTSTRAP'", min: 6},
  ];

  let pass = 0, fail = 0;
  for (const c of checks) {
    const [rows] = await conn.query(c.sql);
    const n = rows[0].n;
    let okay = false;
    if (c.want !== undefined) okay = (n === c.want);
    if (c.min !== undefined) okay = (n >= c.min);
    if (okay) { ok(`${c.label} → ${n}`); pass++; } else { err(`${c.label} → ${n} (want ${c.want ?? '≥' + c.min})`); fail++; }
  }

  // Critical bcrypt round-trip check for SA79900
  const bcrypt = require('bcryptjs');
  const [u] = await conn.query("SELECT password_hash FROM `users` WHERE employee_id='SA79900'");
  if (u[0]) {
    const matches = await bcrypt.compare('SA79900', u[0].password_hash);
    if (matches) { ok("bcrypt: SA79900 password verifies as 'SA79900'"); pass++; }
    else { err("bcrypt: SA79900 password DOES NOT verify against 'SA79900'"); fail++; }
  }

  const [a] = await conn.query("SELECT password_hash FROM `users` WHERE employee_id='AC77777'");
  if (a[0]) {
    const bcrypt2 = require('bcryptjs');
    const matches = await bcrypt2.compare('AC77777', a[0].password_hash);
    if (matches) { ok("bcrypt: AC77777 password verifies as 'AC77777'"); pass++; }
    else { err("bcrypt: AC77777 password DOES NOT verify against 'AC77777'"); fail++; }
  }

  console.log('');
  if (fail === 0) {
    ok(`ALL ${pass} CHECKS PASSED — system is RUNTIME READY.`);
  } else {
    err(`${fail} of ${pass + fail} checks FAILED. Investigate before declaring done.`);
    process.exit(1);
  }
}


// ────────────────────────────────────────────────────────────────────
// ENTRYPOINT
// ────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection({
    host: CFG.host,
    port: CFG.port,
    user: CFG.user,
    password: CFG.password,
    database: CFG.database,
    multipleStatements: true,    // needed for our migration SQL files
    timezone: 'Z',
    charset: 'utf8',
  });

  try {
    if (isStatus) {
      await cmdStatus(conn);
    } else if (isReset) {
      await cmdReset(conn);
    } else {
      await cmdApply(conn);
      if (!isDryRun) {
        await runVerification(conn);
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  err(`FATAL: ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
