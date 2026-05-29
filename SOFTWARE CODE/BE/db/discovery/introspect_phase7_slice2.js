// ============================================================================
// db/discovery/introspect_phase7_slice2.js
// ----------------------------------------------------------------------------
// READ-ONLY DB introspection for Phase 7 Slice 2.
//
// PURPOSE
//   Capture the exact current shape of every table the Conversion + Reject +
//   Detail flow will touch. Output is written to:
//     db/discovery/introspect_phase7_slice2_<YYYYMMDD-HHmm>.out
//   so SCHEMA_PHASE7_SLICE2.md can be authored against ground truth, not
//   memory.
//
// COVERS
//   cmms_jobrequest_mst       (status, approval/rejection columns, FK shape)
//   cmms_jobcard_mst          (whether assigned_engineer / workflow_type
//                              etc. already exist or need to be ADDed)
//   job_request_status_history
//   audit_log
//   user_roles + roles        (engineer-lookup workload join validation)
//   cmms_emp_mst              (engineer-lookup name + employee_id source)
//   information_schema indexes for the three core tables
//
// USAGE
//   cd "SOFTWARE CODE/BE"
//   node db/discovery/introspect_phase7_slice2.js
// ============================================================================

'use strict';

const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load env from BE/.env so DB credentials match runtime exactly.
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const CFG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'final',
};

const TABLES = [
  'cmms_jobrequest_mst',
  'cmms_jobcard_mst',
  'job_request_status_history',
  'audit_log',
  'audit_log_changes',
  'user_roles',
  'roles',
  'cmms_emp_mst',
];

async function main() {
  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const outPath = path.join(__dirname, `introspect_phase7_slice2_${ts}.out`);
  const out = fs.createWriteStream(outPath, { encoding: 'utf8' });

  const log = (line = '') => { out.write(line + '\n'); console.log(line); };

  log('# ============================================================');
  log(`# Phase 7 Slice 2 — DB introspection`);
  log(`# Run at:  ${new Date().toISOString()}`);
  log(`# DB:      ${CFG.user}@${CFG.host}:${CFG.port}/${CFG.database}`);
  log('# ============================================================');

  const conn = await mysql.createConnection(CFG);
  try {
    // ── 1. SHOW CREATE TABLE for every relevant table ─────────────────
    for (const t of TABLES) {
      log('');
      log(`-- ${'─'.repeat(60)}`);
      log(`-- SHOW CREATE TABLE \`${t}\``);
      log(`-- ${'─'.repeat(60)}`);
      try {
        const [rows] = await conn.query(`SHOW CREATE TABLE \`${t}\``);
        const row = rows[0];
        const sql = row['Create Table'] || row['Create View'] || '(no DDL returned)';
        log(sql + ';');
      } catch (e) {
        log(`-- ERROR: ${e.code || ''} ${e.message}`);
      }
    }

    // ── 2. Index inventory for the tables we will mutate ──────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- INDEX INVENTORY  (information_schema.STATISTICS)');
    log(`-- ${'─'.repeat(60)}`);
    const [idx] = await conn.query(
      `SELECT TABLE_NAME, INDEX_NAME,
              GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
              NON_UNIQUE, INDEX_TYPE
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME IN ('cmms_jobrequest_mst','cmms_jobcard_mst','job_request_status_history','audit_log')
        GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE, INDEX_TYPE
        ORDER BY TABLE_NAME, INDEX_NAME`,
      [CFG.database],
    );
    for (const r of idx) {
      log(`${r.TABLE_NAME.padEnd(28)} ${r.INDEX_NAME.padEnd(36)} [${r.columns}]  unique=${!r.NON_UNIQUE}  type=${r.INDEX_TYPE}`);
    }

    // ── 3. Status distribution of JRs (for tab counter sanity) ────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- JR STATUS DISTRIBUTION (for /conversion tab counters)');
    log(`-- ${'─'.repeat(60)}`);
    const [stat] = await conn.query(
      `SELECT JR_MVP_STATUS AS status, JR_JOB_TYPE AS job_type, COUNT(*) AS n
         FROM cmms_jobrequest_mst
        WHERE JR_MVP_STATUS IS NOT NULL
        GROUP BY JR_MVP_STATUS, JR_JOB_TYPE
        ORDER BY status, job_type`,
    );
    for (const r of stat) {
      log(`  status=${String(r.status).padEnd(18)} job_type=${String(r.job_type || '(null)').padEnd(13)} n=${r.n}`);
    }

    // ── 4. Engineer-lookup feasibility: how many LAB_ENGINEERs exist? ──
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- LAB_ENGINEER USERS (workload dropdown source)');
    log(`-- ${'─'.repeat(60)}`);
    const [engs] = await conn.query(
      `SELECT u.user_id, u.employee_id, u.is_active, e.EMM_NAME AS full_name
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.user_id
         JOIN roles      r  ON r.role_id  = ur.role_id
         LEFT JOIN cmms_emp_mst e ON e.EMM_ID = u.employee_id
        WHERE r.role_code = 'LAB_ENGINEER'
        ORDER BY u.employee_id`,
    );
    log(`  total LAB_ENGINEER user rows: ${engs.length}`);
    for (const r of engs.slice(0, 10)) {
      log(`    user_id=${r.user_id}  emp=${r.employee_id}  active=${r.is_active}  name=${r.full_name || '(no emp row)'}`);
    }
    if (engs.length > 10) log(`    … and ${engs.length - 10} more`);

    // ── 5. Row counts for the tables we will mutate ───────────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- ROW COUNTS (capacity planning + smoke baseline)');
    log(`-- ${'─'.repeat(60)}`);
    for (const t of ['cmms_jobrequest_mst', 'cmms_jobcard_mst',
                     'job_request_status_history', 'audit_log',
                     'users', 'cmms_emp_mst']) {
      try {
        const [rc] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
        log(`  ${t.padEnd(32)} ${rc[0].n}`);
      } catch (e) {
        log(`  ${t.padEnd(32)} ERROR: ${e.message}`);
      }
    }

    // ── 6. Existing permissions for this slice (sanity check) ─────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- PERMISSION GRANTS — does LIC + SA already have approve/reject/assign?');
    log(`-- ${'─'.repeat(60)}`);
    const [grants] = await conn.query(
      `SELECT r.role_code, p.permission_code
         FROM role_permissions rp
         JOIN roles       r ON r.role_id = rp.role_id
         JOIN permissions p ON p.permission_id = rp.permission_id
        WHERE p.permission_code IN ('job_request:approve','job_request:reject','job_request:assign-engineer')
        ORDER BY r.role_code, p.permission_code`,
    );
    for (const g of grants) {
      log(`  ${g.role_code.padEnd(16)} ${g.permission_code}`);
    }
  } finally {
    await conn.end();
    out.end();
  }

  console.log(`\nWrote: ${outPath}`);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
