'use strict';
/**
 * audit_phase5_schema.js  —  Phase 5 STEP 1 schema discovery
 * ───────────────────────────────────────────────────────────
 * Connects to the same MySQL `final` database the Phase 4 backend uses,
 * runs the schema-discovery queries mandated by STEP 1.1, and writes
 * `phase5-schema-audit.md` next to itself.
 *
 * This script is READ-ONLY. It runs only:
 *   SHOW TABLES LIKE …
 *   SHOW CREATE TABLE …
 *   SHOW INDEX FROM …
 *   SHOW COLUMNS FROM …
 *   SELECT COUNT(*)
 * It never issues ALTER, CREATE, INSERT, UPDATE, DELETE.
 *
 * Run from project root or anywhere:
 *   node "SOFTWARE CODE/TECH_DOCX/audit_phase5_schema.js"
 */

const path = require('node:path');
const fs = require('node:fs');

const HERE = __dirname;
const BE_DIR = path.join(HERE, '..', 'BE');
const ENV_PATH = path.join(BE_DIR, '.env');
const NM = path.join(BE_DIR, 'node_modules');

const dotenv = require(path.join(NM, 'dotenv'));
const mysql = require(path.join(NM, 'mysql2', 'promise'));

dotenv.config({ path: ENV_PATH });

const OUT = path.join(HERE, 'phase5-schema-audit.md');
const DB = process.env.DB_NAME || 'final';

// ─── Form-field requirements from Phase 5 STEP 4 ──────────────────────────
// Used in Section G to produce the field-by-field mapping table.
const FORM_FIELDS = [
  // [section, field, target table.column (best guess), required]
  ['1', 'Job Category',          'enum [T&ME, F&PE] (column on equipment, or job_categories table)', true],
  ['1', 'Job Type',              "literal 'Registration' (request flag)", true],
  ['2', 'Equipment Name',        'equipment.name', true],
  ['2', 'Make',                  'equipment.manufacturer / equipment.make', false],
  ['2', 'Model No.',             'equipment.model_no / equipment.model', false],
  ['2', 'Serial No.',            'equipment.serial_no (UNIQUE per BR-EQP-01)', true],
  ['2', 'Equipment Type',        'equipment.type_id → equipment_types.name', true],
  ['2', 'Options / Description', 'equipment.description / equipment.options', false],
  ['3', 'Accessory rows',        'equipment_accessories (FK equipment_id)', false],
  ['4', 'PO Number',             'equipment_procurement.po_number / equipment.po_number', true],
  ['4', 'PO Date',               'equipment_procurement.po_date', true],
  ['4', 'MIVR Number',           'equipment_procurement.mivr_number', true],
  ['4', 'MIVR Date',             'equipment_procurement.mivr_date', true],
  ['4', 'Line Item Code',        'equipment_procurement.line_item_code', true],
  ['4', 'Cost',                  'equipment_procurement.cost (NUMERIC)', true],
  ['4', 'Cost Currency',         'equipment_procurement.cost_currency (CHAR 3)', true],
  ['4', 'Warranty (months)',     'equipment_procurement.warranty_months', false],
  ['5', 'Name',                  'users JOIN employees → display_name (auto-fill)', true],
  ['5', 'SAC Employee ID',       'users.employee_id (auto-fill)', true],
  ['5', 'Designation',           'employees.designation (auto-fill)', true],
  ['5', 'Email',                 'employees.email (auto-fill)', true],
  ['5', 'Lab Phone',             'equipment_contact.lab_phone (or equipment column)', false],
  ['5', 'Room Phone',            'equipment_contact.room_phone', false],
  ['5', 'Division',              'equipment.division_id → divisions', true],
  ['5', 'Subsystem',             'equipment.subsystem', false],
  ['5', 'Project',               'equipment.project', false],
  ['5', 'Complaint Description', 'equipment.complaint_description / request.description', true],
  ['5', 'Remarks',               'equipment.remarks', false],
  ['6', 'T&C 1-6 accepted',      'equipment_tc_acceptance (or JSON column on equipment)', true],
];

// ─── Generic helpers ──────────────────────────────────────────────────────
let conn;

async function searchTables(pattern) {
  const [rows] = await conn.query(`SHOW TABLES FROM \`${DB}\` LIKE ?`, [pattern]);
  return rows.map((r) => Object.values(r)[0]);
}

async function countRows(t) {
  try {
    const [r] = await conn.query(`SELECT COUNT(*) AS n FROM \`${DB}\`.\`${t}\``);
    return r[0].n;
  } catch (e) {
    return { error: e.code || e.message };
  }
}

async function describeTable(t) {
  try {
    const [r] = await conn.query(`SHOW CREATE TABLE \`${DB}\`.\`${t}\``);
    return r[0]['Create Table'];
  } catch {
    return null;
  }
}

async function indexInfo(t) {
  try {
    const [r] = await conn.query(`SHOW INDEX FROM \`${DB}\`.\`${t}\``);
    return r;
  } catch {
    return [];
  }
}

async function tableColumns(t) {
  try {
    const [r] = await conn.query(`SHOW COLUMNS FROM \`${DB}\`.\`${t}\``);
    return r;
  } catch {
    return [];
  }
}

// Group indexes by key name for readable display
function groupIndexes(rows) {
  const g = {};
  for (const r of rows) {
    if (!g[r.Key_name]) {
      g[r.Key_name] = {
        cols: [],
        unique: r.Non_unique === 0,
        type: r.Index_type,
      };
    }
    g[r.Key_name].cols.push(r.Column_name);
  }
  return g;
}

// ─── Section builders ────────────────────────────────────────────────────
const out = [];
const add = (s = '') => out.push(s);
const sep = () => add('');

async function dumpTable(t) {
  add(`### \`${t}\``);
  sep();

  const rows = await countRows(t);
  const create = await describeTable(t);
  const idxRows = await indexInfo(t);

  if (typeof rows === 'object' && rows.error) {
    add(`*Row count failed:* \`${rows.error}\``);
  } else {
    add(`**Rows:** ${rows.toLocaleString()}`);
  }
  sep();

  if (create) {
    add('```sql');
    add(create);
    add('```');
    sep();
  }

  const grouped = groupIndexes(idxRows);
  if (Object.keys(grouped).length > 0) {
    add('**Indexes**');
    sep();
    add('| Index | Columns | Unique | Type |');
    add('|---|---|---|---|');
    for (const [name, info] of Object.entries(grouped)) {
      add(`| \`${name}\` | \`${info.cols.join(', ')}\` | ${info.unique ? 'yes' : 'no'} | ${info.type} |`);
    }
    sep();
  }
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.DB_USER) {
    throw new Error(`Cannot read DB credentials from ${ENV_PATH}. Confirm BE/.env exists and has DB_* set.`);
  }

  conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: DB,
    multipleStatements: false,
  });

  // ── Document header ──
  add('# Phase 5 · Equipment Module — Schema Audit');
  sep();
  add(`> Auto-generated by \`audit_phase5_schema.js\` against MySQL \`${DB}\` on ${new Date().toISOString()}.`);
  sep();
  add('> **STATUS: DRAFT — awaiting DS review.** Per Phase 5 STEP 1.3 no equipment-module code has been written yet. This document is the gate.');
  sep();

  add('## How this audit was produced');
  sep();
  add('Queries executed (READ-ONLY, exactly as mandated by STEP 1.1):');
  sep();
  add('```sql');
  add(`SHOW TABLES FROM \`${DB}\` LIKE '%equip%';`);
  add(`SHOW TABLES FROM \`${DB}\` LIKE '%instrument%';`);
  add(`SHOW TABLES FROM \`${DB}\` LIKE '%asset%';`);
  add(`-- and the same for: type, division, location, status, make,`);
  add(`-- manufacturer, po, purchase, mivr, accessor, warrant.`);
  add(`SHOW CREATE TABLE   <each candidate>;`);
  add(`SHOW INDEX FROM     <each candidate>;`);
  add(`SHOW COLUMNS FROM   <each candidate>;`);
  add(`SELECT COUNT(*) FROM <each candidate>;`);
  add('```');
  sep();
  add('No DDL, no DML, no migrations.');
  sep();

  // ──────────────────────────── A · Equipment family ────────────────────────────
  add('---');
  sep();
  add('## A. Equipment-family tables');
  sep();

  // ISRO SAC abbreviation: `eqip` (no second `u`). Include both spellings,
  // plus the column-prefix `eqm` used by cmms_eqip_mst.EQM_ID etc.
  const equipPatterns = ['%equip%', '%eqip%', '%eqm\\_%', '%instrument%', '%asset%'];
  const seen = new Set();
  for (const p of equipPatterns) {
    for (const t of await searchTables(p)) seen.add(t);
  }

  if (seen.size === 0) {
    add('🛑 **NO equipment-related tables exist in this database.** Audit cannot proceed without DS guidance.');
    sep();
  } else {
    add('Pattern matches (`%equip%`, `%instrument%`, `%asset%`):');
    sep();
    add('| Table | Rows | Universe |');
    add('|---|---|---|');
    for (const t of [...seen].sort()) {
      const n = await countRows(t);
      const universe = t.startsWith('_legacy_') ? '⚠️ legacy (ignore for design)' : '✅ active';
      const rowsStr = typeof n === 'object' ? `_err: ${n.error}_` : n.toLocaleString();
      add(`| \`${t}\` | ${rowsStr} | ${universe} |`);
    }
    sep();

    add('Detailed structure of every **active** match below.');
    sep();

    for (const t of [...seen].filter((x) => !x.startsWith('_legacy_')).sort()) {
      await dumpTable(t);
    }
  }

  // ──────────────────────────── B · Master tables ────────────────────────────
  add('---');
  sep();
  add('## B. Master / lookup tables');
  sep();

  const masterPatterns = [
    '%type%', '%division%', '%section%', '%location%', '%status%',
    '%make%', '%manufacturer%', '%vendor%', '%currency%', '%category%',
  ];
  const masters = new Set();
  for (const p of masterPatterns) {
    for (const t of await searchTables(p)) masters.add(t);
  }
  if (masters.size === 0) {
    add('_None found._');
    sep();
  } else {
    add('| Table | Rows | Universe |');
    add('|---|---|---|');
    for (const t of [...masters].sort()) {
      const n = await countRows(t);
      const universe = t.startsWith('_legacy_') ? '⚠️ legacy' : '✅ active';
      const rowsStr = typeof n === 'object' ? `_err: ${n.error}_` : n.toLocaleString();
      add(`| \`${t}\` | ${rowsStr} | ${universe} |`);
    }
    sep();

    // For active master tables only, show columns (saves space — no CREATE)
    for (const t of [...masters].filter((x) => !x.startsWith('_legacy_')).sort()) {
      const cols = await tableColumns(t);
      if (cols.length === 0) continue;
      add(`### \`${t}\` — columns`);
      sep();
      add('| Column | Type | Null | Key | Default |');
      add('|---|---|---|---|---|');
      for (const c of cols) {
        add(`| \`${c.Field}\` | ${c.Type} | ${c.Null} | ${c.Key || ''} | ${c.Default ?? ''} |`);
      }
      sep();
    }
  }

  // ──────────────────────────── C · Procurement-adjacent ────────────────────────────
  add('---');
  sep();
  add('## C. Procurement-adjacent tables');
  sep();

  const procPatterns = ['%po%', '%purchase%', '%mivr%', '%procure%'];
  const procs = new Set();
  for (const p of procPatterns) {
    for (const t of await searchTables(p)) procs.add(t);
  }
  if (procs.size === 0) {
    add('_None found — procurement fields may live as columns on the equipment table itself._');
    sep();
  } else {
    add('| Table | Rows | Universe |');
    add('|---|---|---|');
    for (const t of [...procs].sort()) {
      const n = await countRows(t);
      const universe = t.startsWith('_legacy_') ? '⚠️ legacy' : '✅ active';
      const rowsStr = typeof n === 'object' ? `_err: ${n.error}_` : n.toLocaleString();
      add(`| \`${t}\` | ${rowsStr} | ${universe} |`);
    }
    sep();
    for (const t of [...procs].filter((x) => !x.startsWith('_legacy_')).sort()) {
      await dumpTable(t);
    }
  }

  // ──────────────────────────── D · Accessory + warranty ────────────────────────────
  add('---');
  sep();
  add('## D. Accessory & warranty tables');
  sep();

  const accPatterns = ['%accessor%', '%warrant%'];
  const accs = new Set();
  for (const p of accPatterns) {
    for (const t of await searchTables(p)) accs.add(t);
  }
  if (accs.size === 0) {
    add('_None found — accessory and warranty data may need new tables or columns._');
    sep();
  } else {
    add('| Table | Rows | Universe |');
    add('|---|---|---|');
    for (const t of [...accs].sort()) {
      const n = await countRows(t);
      const universe = t.startsWith('_legacy_') ? '⚠️ legacy' : '✅ active';
      const rowsStr = typeof n === 'object' ? `_err: ${n.error}_` : n.toLocaleString();
      add(`| \`${t}\` | ${rowsStr} | ${universe} |`);
    }
    sep();
    for (const t of [...accs].filter((x) => !x.startsWith('_legacy_')).sort()) {
      await dumpTable(t);
    }
  }

  // ──────────────────────────── E · Phase-3 sealed support tables ────────────────────────────
  add('---');
  sep();
  add('## E. Phase-3 sealed support tables (audit_log, users, employees)');
  sep();

  for (const t of ['audit_log', 'users', 'employees', 'cmms_emp_mst', 'roles', 'permissions', 'role_permissions', 'user_roles']) {
    const exists = (await searchTables(t)).length > 0;
    if (!exists) {
      add(`- \`${t}\` — **does not exist**`);
      continue;
    }
    add(`- \`${t}\` — exists`);
  }
  sep();
  for (const t of ['audit_log', 'users', 'cmms_emp_mst']) {
    const exists = (await searchTables(t)).length > 0;
    if (exists) await dumpTable(t);
  }

  // ──────────────────────────── F · Full table inventory (cross-check) ────────────────────────────
  add('---');
  sep();
  add('## F. Full table inventory (for cross-reference)');
  sep();
  const [allRows] = await conn.query(
    'SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
    [DB],
  );
  add(`**${allRows.length}** tables total in \`${DB}\`.`);
  sep();
  add('| Table | Approx. rows | Universe |');
  add('|---|---|---|');
  for (const r of allRows) {
    const universe = r.TABLE_NAME.startsWith('_legacy_') ? '⚠️ legacy' : '✅ active';
    add(`| \`${r.TABLE_NAME}\` | ${(r.TABLE_ROWS ?? 0).toLocaleString()} | ${universe} |`);
  }
  sep();

  // ──────────────────────────── G · Form-field → table.column mapping ────────────────────────────
  add('---');
  sep();
  add('## G. Form-field → table.column mapping');
  sep();
  add('Each field from Phase 5 STEP 4 with the best-guess source. Items marked ❓ need DS to confirm before implementation. Items marked ❌ have no obvious home — likely require new columns or tables.');
  sep();
  add('| § | Field | Best-guess source | Required |');
  add('|---|---|---|---|');
  for (const [s, f, src, req] of FORM_FIELDS) {
    add(`| ${s} | ${f} | ${src} | ${req ? '✓' : ''} |`);
  }
  sep();

  // ──────────────────────────── H · Missing pieces (preliminary) ────────────────────────────
  add('---');
  sep();
  add('## H. Preliminary missing-pieces list');
  sep();
  add('Filled in by DS after reviewing Sections A–G. Suspected gaps to verify:');
  sep();
  add('- T&C acceptance storage: no obvious table; may need `equipment_tc_acceptance` (FK equipment_id + 6 boolean cols + accepted_at + accepted_by_user_id) OR a JSON column on equipment.');
  add('- Submitted-By contact bundle (lab_phone, room_phone, subsystem, project, complaint_description, remarks): if no `equipment_request` / `equipment_contact` table exists, these likely belong as columns on equipment itself.');
  add('- equipment_code generation strategy: pattern `EQ-<typeAbbr>-<seq>` is the FE display in the reference image; verify existing rows match this and document the generation rule before INSERT.');
  add('- equipment status ENUM: confirm the DB enum includes all 7 statuses from FINAL-DESC §8.2 (PENDING_VERIFICATION, ACTIVE, UNDER_CALIBRATION, UNDER_REPAIR, OUT_OF_TOLERANCE, QUARANTINED, CONDEMNED).');
  sep();

  // ──────────────────────────── I · Index audit ────────────────────────────
  add('---');
  sep();
  add('## I. Index audit & proposals');
  sep();
  add('Per Phase 5 STEP 1.2.D: the Equipment List page filters on `equipment_code`, `name`, `manufacturer`, `model_no`, `serial_no`, `status`, `type_id`, `division_id`, `next_cal_due_date`. Confirm an index exists for each, and propose ALTERs for any that are missing.');
  sep();
  add('Concrete proposals will be filled in once DS confirms which active table is THE `equipment` table. **No ALTER will be executed without explicit DS approval.**');
  sep();

  // ──────────────────────────── J · Recommendation ────────────────────────────
  add('---');
  sep();
  add('## J. Recommendation to DS');
  sep();
  add('Action requested: review Sections A–F, confirm the canonical active `equipment` table name and its surrounding tables (procurement, accessories), and answer the four STOP-and-ask items in Section H.');
  sep();
  add('Once that is signed off I proceed to Phase 5 STEP 2 (Sidebar + TopBar redesign), STEP 3 (List page), STEP 4 (Add form), and STEP 5 (stubs).');
  sep();

  fs.writeFileSync(OUT, out.join('\n'), 'utf8');
  console.log('OK - wrote', OUT);
  await conn.end();
}

main().catch((e) => {
  console.error('AUDIT FAILED:', e.message);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
