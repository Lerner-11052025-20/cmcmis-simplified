// ============================================================================
// db/discovery/introspect_phase9.js
// ----------------------------------------------------------------------------
// READ-ONLY DB introspection for Phase 9 (Job Card detail + lifecycle).
//
// Surfaces:
//   • cmms_jobcard_mst — full DDL + which proposed Phase 9 columns
//     already exist vs need adding
//   • Existence check for proposed child tables (jc_*)
//   • Permission grants for the 6 Phase 9 perms across all 5 roles
//   • Row distribution on cmms_jobcard_mst by JM_MVP_STATUS
//   • cmms_emp_mst + cmms_eqip_mst checks (FK targets we'll touch)
//
// Output: db/discovery/introspect_phase9_<ts>.out
// ============================================================================

'use strict';

const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const CFG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'final',
};

// ── Proposed Phase 9 column delta (from prompt §7 Step 1) ─────────────
// We'll cross-reference each name against information_schema.COLUMNS so
// idempotent migrations can skip what already exists.
const PROPOSED_JC_COLUMNS = [
  // Plug-In / Accessories
  'plug_in_accessories',
  // Submitted & Received
  'equipment_submitted_date',
  'submitted_by',
  'equipment_received_date_actual',
  'received_by',
  // Job Card Details
  'instrument_received_date',
  'job_complete_planned_date',
  'job_type',
  'repair_type',
  'job_request_remarks',
  // Equipments Used
  'equipments_used',
  // Awaiting Information
  'awaiting_for',
  'awaiting_status',
  'supplier_name',
  'awaiting_from_date',
  'awaiting_clear_date',
  'attended_by',
  // Procurement Details
  'indent_no', 'indent_date',
  'mirv_no', 'mirv_date',
  'po_no', 'po_date',
  'procurement_cost',
  // Contract / Warranty
  'vendor_supplier_name', 'intimation_sent_on',
  'sent_to_vendor_date', 'received_from_vendor_date',
  'gate_pass_no', 'gate_pass_issued_date',
  'cost_of_component', 'labour_charges',
  'invoice_no', 'invoice_recd_on',
  // Observations
  'observations_text', 'job_status_display',
  // Completion
  'completion_summary', 'actual_completion_date', 'total_hours_spent',
  'marked_complete_by_user_id', 'marked_complete_at',
  // Closure
  'reviewed_by', 'review_date', 'review_comments',
  'equipment_received_by_customer', 'customer_received_date',
  'customer_acknowledged', 'final_closure_notes',
  'verified_closed_by_user_id', 'verified_closed_at',
  // Reopen tracking
  'last_reopened_at', 'last_reopened_by_user_id', 'reopen_count',
];

const PROPOSED_CHILD_TABLES = [
  'jc_maintenance_details',
  'jc_spares_used',
  'jc_task_checklist',
  'jc_documents',
  'jc_observations_readings',
  'task_library',
];

const PHASE9_PERMISSIONS = [
  'job_card:read-detail',
  'job_card:start-work',
  'job_card:update-tasks',
  'job_card:complete',
  'job_card:verify-close',
  'job_card:reopen',
];

async function main() {
  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const outPath = path.join(__dirname, `introspect_phase9_${ts}.out`);
  const out = fs.createWriteStream(outPath, { encoding: 'utf8' });
  const log = (line = '') => { out.write(line + '\n'); console.log(line); };

  log('# ============================================================');
  log(`# Phase 9 — DB introspection`);
  log(`# Run at:  ${new Date().toISOString()}`);
  log(`# DB:      ${CFG.user}@${CFG.host}:${CFG.port}/${CFG.database}`);
  log('# ============================================================');

  const conn = await mysql.createConnection(CFG);
  try {
    // ── 1. Full DDL of cmms_jobcard_mst ──────────────────────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- SHOW CREATE TABLE cmms_jobcard_mst (full current shape)');
    log(`-- ${'─'.repeat(60)}`);
    const [[show]] = await conn.query('SHOW CREATE TABLE `cmms_jobcard_mst`');
    log(show['Create Table'] + ';');

    // ── 2. Column existence cross-check ──────────────────────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- PHASE 9 COLUMN DELTA  (which proposed cols already exist?)');
    log(`-- ${'─'.repeat(60)}`);
    const [existingCols] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME   = 'cmms_jobcard_mst'`,
      [CFG.database],
    );
    const existingSet = new Set(existingCols.map((r) => r.COLUMN_NAME.toLowerCase()));
    let needAdd = 0, alreadyExists = 0;
    for (const want of PROPOSED_JC_COLUMNS) {
      // Phase 9 columns are canonical snake_case names but the table uses
      // UPPER prefixes (JM_*). We never blindly add a column whose name
      // already exists in any case-form — check case-insensitively.
      const exists = existingSet.has(want.toLowerCase());
      if (exists) {
        log(`  EXISTS    ${want}`);
        alreadyExists++;
      } else {
        log(`  ADD       ${want}`);
        needAdd++;
      }
    }
    log(`  ─── ${alreadyExists} already exist · ${needAdd} need ADD COLUMN`);

    // ── 3. Child-table existence check ───────────────────────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- PHASE 9 CHILD TABLE EXISTENCE');
    log(`-- ${'─'.repeat(60)}`);
    for (const t of PROPOSED_CHILD_TABLES) {
      const [rows] = await conn.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [CFG.database, t],
      );
      log(`  ${rows.length ? 'EXISTS' : 'CREATE'}    ${t}`);
    }

    // ── 4. Permission seed audit ─────────────────────────────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- PERMISSION GRANTS for the 6 Phase 9 perms');
    log(`-- ${'─'.repeat(60)}`);
    const placeholders = PHASE9_PERMISSIONS.map(() => '?').join(',');
    const [grants] = await conn.query(
      `SELECT r.role_code, p.permission_code
         FROM role_permissions rp
         JOIN roles       r ON r.role_id       = rp.role_id
         JOIN permissions p ON p.permission_id = rp.permission_id
        WHERE p.permission_code IN (${placeholders})
        ORDER BY p.permission_code, r.role_code`,
      PHASE9_PERMISSIONS,
    );
    if (!grants.length) {
      log('  (no grants found for any Phase 9 perm — must seed via migration)');
    } else {
      const grouped = {};
      for (const g of grants) {
        grouped[g.permission_code] = grouped[g.permission_code] || [];
        grouped[g.permission_code].push(g.role_code);
      }
      for (const code of PHASE9_PERMISSIONS) {
        log(`  ${code.padEnd(28)} → ${(grouped[code] || []).join(', ') || '(NONE)'}`);
      }
    }

    // ── 5. JC status distribution (current) ──────────────────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- JC status distribution (current row counts)');
    log(`-- ${'─'.repeat(60)}`);
    const [statRows] = await conn.query(
      `SELECT JM_MVP_STATUS AS status, COUNT(*) AS n
         FROM cmms_jobcard_mst
        GROUP BY JM_MVP_STATUS
        ORDER BY status`,
    );
    for (const r of statRows) {
      log(`  ${String(r.status).padEnd(18)} ${r.n}`);
    }

    // ── 6. Indexes on cmms_jobcard_mst ──────────────────────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- Indexes on cmms_jobcard_mst');
    log(`-- ${'─'.repeat(60)}`);
    const [idx] = await conn.query(
      `SELECT INDEX_NAME,
              GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols,
              INDEX_TYPE
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'cmms_jobcard_mst'
        GROUP BY INDEX_NAME, INDEX_TYPE
        ORDER BY INDEX_NAME`,
      [CFG.database],
    );
    for (const r of idx) {
      log(`  ${r.INDEX_NAME.padEnd(32)} [${r.cols}]  ${r.INDEX_TYPE}`);
    }

    // ── 7. Job-request-side helper rows (count current ASSIGNED JCs) ─
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- ASSIGNED JCs with assigned_engineer set (Phase 9 work queue source)');
    log(`-- ${'─'.repeat(60)}`);
    const [[assignedNew]] = await conn.query(
      `SELECT COUNT(*) AS n
         FROM cmms_jobcard_mst
        WHERE JM_MVP_STATUS = 'ASSIGNED'
          AND JM_ASSIGNED_ENGINEER IS NOT NULL`,
    );
    log(`  ASSIGNED + JM_ASSIGNED_ENGINEER set: ${assignedNew.n}`);

    // ── 8. JR status enum (need CANCELLED?) ─────────────────────────
    log('');
    log(`-- ${'─'.repeat(60)}`);
    log('-- JR_MVP_STATUS enum (for Phase 9 PART D: JR cancel)');
    log(`-- ${'─'.repeat(60)}`);
    const [[colInfo]] = await conn.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cmms_jobrequest_mst'
          AND COLUMN_NAME = 'JR_MVP_STATUS'`,
      [CFG.database],
    );
    log(`  ${colInfo.COLUMN_TYPE}`);
    const hasCancelled = /'CANCELLED'/i.test(colInfo.COLUMN_TYPE);
    log(`  CANCELLED in enum? ${hasCancelled ? 'YES (no enum modify needed)' : 'NO (will need a logical-only state à la APPROVED, OR an enum modify)'}`);
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
