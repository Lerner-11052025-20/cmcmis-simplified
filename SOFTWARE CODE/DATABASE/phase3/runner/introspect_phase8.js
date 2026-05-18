// ============================================================================
// introspect_phase8.js — READ-ONLY Phase 8 Step 0 introspection.
// ----------------------------------------------------------------------------
// Purpose: probe the live `final` database to determine which tables relevant
// to Phase 8 (Dashboard + Inquiry) actually exist, and dump their column
// shapes. NO writes. Output goes to stdout — pipe into SCHEMA_PHASE8.md.
// ============================================================================
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, multipleStatements: false
  });

  const dbName = process.env.DB_NAME;
  const tablesOfInterest = [
    // canonical (Phase 3) names
    'vendors', 'products', 'equipment', 'job_requests', 'job_cards',
    'audit_log', 'users', 'user_roles', 'roles', 'permissions', 'role_permissions',
    'employees',
    // legacy `cmms_*_mst` candidates
    'cmms_vendor_mst', 'cmms_supplier_mst', 'cmms_cont_mst',
    'cmms_product_mst', 'cmms_prdct_mst',
    'cmms_equipment_mst', 'cmms_instrument_mst', 'cmms_equip_mst',
    'cmms_jobrequest_mst', 'cmms_jobcard_mst', 'cmms_jc_mst',
    'cmms_emp_mst', 'cmms_section_mst', 'cmms_dept_mst'
  ];

  console.log('## 1. EXISTENCE CHECK\n');
  const [tableRows] = await conn.query(
    `SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN (${tablesOfInterest.map(() => '?').join(',')})
      ORDER BY TABLE_NAME`,
    [dbName, ...tablesOfInterest]
  );
  const existing = new Set(tableRows.map(r => r.TABLE_NAME));
  console.log('| Table | Approx Rows | Engine | Collation |');
  console.log('|-------|-------------|--------|-----------|');
  for (const r of tableRows) {
    console.log(`| \`${r.TABLE_NAME}\` | ${r.TABLE_ROWS} | ${r.ENGINE} | ${r.TABLE_COLLATION} |`);
  }
  console.log('\n**Missing from `tablesOfInterest`:**');
  for (const t of tablesOfInterest) if (!existing.has(t)) console.log(`- \`${t}\` — NOT FOUND`);

  console.log('\n## 2. COLUMN SHAPES (existing tables only)\n');
  for (const r of tableRows) {
    const t = r.TABLE_NAME;
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
      [dbName, t]
    );
    console.log(`### \`${t}\` — ${cols.length} columns`);
    console.log('| # | Column | Type | Null | Key | Default | Extra |');
    console.log('|---|--------|------|------|-----|---------|-------|');
    cols.forEach((c, i) => {
      const def = c.COLUMN_DEFAULT === null ? '' : String(c.COLUMN_DEFAULT);
      console.log(`| ${i + 1} | \`${c.COLUMN_NAME}\` | \`${c.COLUMN_TYPE}\` | ${c.IS_NULLABLE} | ${c.COLUMN_KEY || ''} | ${def} | ${c.EXTRA || ''} |`);
    });
    console.log('');
  }

  console.log('## 3. INDEXES on KPI / Inquiry-relevant tables\n');
  for (const t of [
    'job_requests', 'job_cards', 'equipment',
    'cmms_jobrequest_mst', 'cmms_jc_mst', 'cmms_equip_mst', 'cmms_equipment_mst',
    'vendors', 'products', 'cmms_cont_mst', 'cmms_prdct_mst', 'cmms_product_mst'
  ]) {
    if (!existing.has(t)) continue;
    const [rows] = await conn.query(
      `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLS, INDEX_TYPE, NON_UNIQUE
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        GROUP BY INDEX_NAME, INDEX_TYPE, NON_UNIQUE
        ORDER BY INDEX_NAME`,
      [dbName, t]
    );
    if (rows.length === 0) continue;
    console.log(`### \`${t}\``);
    console.log('| Index | Columns | Type | Unique |');
    console.log('|-------|---------|------|--------|');
    for (const r of rows) {
      console.log(`| ${r.INDEX_NAME} | ${r.COLS} | ${r.INDEX_TYPE} | ${r.NON_UNIQUE === 0 ? 'YES' : 'no'} |`);
    }
    console.log('');
  }

  console.log('## 4. DATA SANITY (counts only — no PII)\n');
  const sanityProbes = [
    { label: 'equipment total', sql: 'SELECT COUNT(*) AS n FROM equipment' },
    { label: 'equipment OPERATIONAL', sql: "SELECT COUNT(*) AS n FROM equipment WHERE status='OPERATIONAL'" },
    { label: 'equipment with next_cal_date', sql: 'SELECT COUNT(*) AS n FROM equipment WHERE next_cal_date IS NOT NULL' },
    { label: 'job_requests total', sql: 'SELECT COUNT(*) AS n FROM job_requests' },
    { label: 'job_requests SUBMITTED', sql: "SELECT COUNT(*) AS n FROM job_requests WHERE status='SUBMITTED'" },
    { label: 'job_cards total', sql: 'SELECT COUNT(*) AS n FROM job_cards' },
    { label: 'cmms_jobcard_mst total', sql: 'SELECT COUNT(*) AS n FROM cmms_jobcard_mst' },
    { label: 'cmms_jobrequest_mst total', sql: 'SELECT COUNT(*) AS n FROM cmms_jobrequest_mst' },
    { label: 'cmms_cont_mst total', sql: 'SELECT COUNT(*) AS n FROM cmms_cont_mst' },
    { label: 'cmms_prdct_mst total', sql: 'SELECT COUNT(*) AS n FROM cmms_prdct_mst' },
    { label: 'cmms_product_mst total', sql: 'SELECT COUNT(*) AS n FROM cmms_product_mst' }
  ];
  console.log('| Probe | Result |');
  console.log('|-------|--------|');
  for (const p of sanityProbes) {
    try {
      const [rows] = await conn.query(p.sql);
      console.log(`| ${p.label} | ${rows[0].n} |`);
    } catch (e) {
      console.log(`| ${p.label} | (not available: ${e.code || e.message}) |`);
    }
  }

  console.log('\n## 5. STATUS ENUM VALUES\n');
  for (const t of ['equipment', 'job_requests', 'job_cards']) {
    if (!existing.has(t)) continue;
    const [rows] = await conn.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME='status'`,
      [dbName, t]
    );
    if (rows.length) console.log(`- **${t}.status** = \`${rows[0].COLUMN_TYPE}\``);
  }

  await conn.end();
  console.log('\n## DONE');
})().catch(e => { console.error('FATAL', e); process.exit(2); });
