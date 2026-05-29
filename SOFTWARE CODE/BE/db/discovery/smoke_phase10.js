// ============================================================================
// db/discovery/smoke_phase10.js
// ----------------------------------------------------------------------------
// PHASE 10 — Reports & Analytics end-to-end smoke matrix.
//
//   R1..R6   — JSON view + PDF stream + RBAC + pagination per report
//   G1..G8   — JSON chart + CSV download per chart
//   X1..X4   — RBAC: 401 without auth, 403 without permission, 200 with permission
//
// USAGE
//   cd "SOFTWARE CODE/BE"
//   node db/discovery/smoke_phase10.js
//
// Native fetch (Node 22+); no axios dependency in BE.
// ============================================================================

'use strict';

const path  = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const BASE = process.env.BASE || 'http://localhost:3000/api/v1';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m',
};
let pass = 0, fail = 0;
function ok (label, extra = '') { console.log(`${C.green}✓${C.reset} ${label} ${C.gray}${extra}${C.reset}`); pass++; }
function bad(label, extra = '') { console.log(`${C.red}✗${C.reset} ${label} ${C.gray}${extra}${C.reset}`); fail++; }

// ── Tiny fetch client (axios-ish) ─────────────────────────────────
function makeClient() {
  const headers = {};
  async function request(method, url, opts) {
    let finalUrl = url;
    if (opts?.params) {
      const qs = Object.entries(opts.params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
    const init = { method, headers: { 'content-type': 'application/json', ...headers } };
    if (opts?.body !== undefined) init.body = JSON.stringify(opts.body);
    const r = await fetch(BASE + finalUrl, init);
    const ct = r.headers.get('content-type') || '';
    let data = null;
    if (ct.includes('application/json')) {
      try { data = await r.json(); } catch { data = null; }
    } else {
      // For binary downloads we just want the byte length, not the bytes.
      const buf = await r.arrayBuffer();
      data = { __binary: true, bytes: buf.byteLength, contentType: ct };
    }
    return { status: r.status, data, contentType: ct };
  }
  return {
    get:  (url, opts) => request('GET',  url, opts),
    post: (url, body, opts) => request('POST', url, { ...(opts || {}), body }),
    setAuth: (t) => { headers.Authorization = `Bearer ${t}`; },
    clearAuth: () => { delete headers.Authorization; },
  };
}

async function login(employeeId, password) {
  const c = makeClient();
  const r = await c.post('/auth/login', { employee_id: employeeId, password });
  if (r.status !== 200 || !r.data?.data?.accessToken) {
    throw new Error(`login(${employeeId}) → ${r.status} ${JSON.stringify(r.data).slice(0, 240)}`);
  }
  c.setAuth(r.data.data.accessToken);
  return { client: c, user: r.data.data.user };
}

async function db() {
  return mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'final',
  });
}

// ── REPORT INVENTORY ─────────────────────────────────────────────
const REPORTS = [
  { id: 'R1', key: 'calibration-due',       summaryKeys: ['total', 'overdue', 'due_soon', 'valid'] },
  { id: 'R2', key: 'pending-jobs',          summaryKeys: ['total_pending', 'new_requests', 'assigned', 'unassigned'] },
  { id: 'R3', key: 'equipment-utilization', summaryKeys: ['total_equipment', 'used_equipment', 'total_job_cards', 'inactive_low_use'] },
  { id: 'R4', key: 'engineer-summary',      summaryKeys: ['engineers', 'assigned_jcs', 'completed', 'in_progress'] },
  { id: 'R5', key: 'job-card-summary',      summaryKeys: ['total', 'open_assigned', 'in_progress', 'completed', 'verified_closed'] },
  { id: 'R6', key: 'job-request-summary',   summaryKeys: ['total', 'submitted', 'assigned', 'verified_closed', 'rejected'] },
];

const CHARTS = [
  // Phase 10 — G1..G8
  { id: 'G1', key: 'monthly-activity',              shape: ['month', 'calibrations', 'repairs'] },
  { id: 'G2', key: 'equipment-status',              shape: ['status', 'count'] },
  { id: 'G3', key: 'monthly-jobs',                  shape: ['month', 'completed', 'pending'] },
  { id: 'G4', key: 'division-wise',                 shape: ['division', 'division_id', 'count'] },
  { id: 'G5', key: 'calibration-completion',        shape: ['month', 'on_time', 'delayed'] },
  { id: 'G6', key: 'job-type-distribution',         shape: ['job_type', 'count'] },
  { id: 'G7', key: 'engineer-workload',             shape: ['engineer_employee_id', 'engineer_name', 'open_load', 'done'] },
  { id: 'G8', key: 'calibration-status-breakdown',  shape: ['band', 'count'] },
  // Phase 11 Slice 3 — G9..G12
  { id: 'G9',  key: 'weekly-activity',              shape: ['week', 'calibrations', 'repairs'] },
  { id: 'G10', key: 'jc-lifecycle-funnel',          shape: ['stage', 'count'] },
  { id: 'G11', key: 'equipment-registration-trend', shape: ['month', 'registered'] },
  { id: 'G12', key: 'priority-mix-trend',           shape: ['month', 'low', 'medium', 'high'] },
];

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`${C.bold}${C.cyan}\nPhase 10 — Reports & Analytics smoke matrix${C.reset}\n`);

  // Seed admins (Phase 3): SA79900 / AC77777. Password = employee_id.
  const sa = await login('SA79900', 'SA79900');     // Super Admin — all perms
  console.log(`${C.gray}Super Admin logged in as ${sa.user.sub}${C.reset}`);

  // ── X1: 401 without auth ─────────────────────────────────────────
  const anon = makeClient();
  const a1 = await anon.get('/reports/calibration-due');
  if (a1.status === 401) ok('X1 anonymous → /reports/calibration-due returns 401');
  else                   bad('X1 anonymous expected 401', `got ${a1.status}`);

  const a2 = await anon.get('/analytics/monthly-activity');
  if (a2.status === 401) ok('X1 anonymous → /analytics/monthly-activity returns 401');
  else                   bad('X1 anonymous expected 401', `got ${a2.status}`);

  // ── Reports: JSON + PDF + cross-check totals against raw COUNTs ───
  const conn = await db();

  for (const R of REPORTS) {
    const json = await sa.client.get(`/reports/${R.key}`, { params: { page: 1, page_size: 10 } });
    if (json.status !== 200) { bad(`${R.id} JSON ${R.key}`, `${json.status}: ${JSON.stringify(json.data).slice(0, 120)}`); continue; }
    const body = json.data?.data;
    if (!body) { bad(`${R.id} JSON ${R.key}`, 'no data envelope'); continue; }
    if (!body.meta || !body.summary || !Array.isArray(body.rows)) {
      bad(`${R.id} JSON ${R.key}`, 'missing meta/summary/rows'); continue;
    }
    // Verify every expected summary key is present and numeric (or 0).
    const missing = R.summaryKeys.filter((k) => typeof body.summary[k] !== 'number');
    if (missing.length) { bad(`${R.id} summary keys`, `missing/non-numeric: ${missing.join(',')}`); }
    else                { ok(`${R.id} ${R.key} JSON 200, summary OK, total=${body.total} rows=${body.rows.length}`); }

    // Pagination smoke (page 2 with size 5 returns either fewer rows or same total).
    const json2 = await sa.client.get(`/reports/${R.key}`, { params: { page: 2, page_size: 5 } });
    if (json2.status === 200 && json2.data?.data?.total === body.total) {
      ok(`${R.id} pagination total stable across pages`, `total=${body.total}`);
    } else {
      bad(`${R.id} pagination`, `page2 status=${json2.status} total=${json2.data?.data?.total} vs ${body.total}`);
    }

    // PDF stream — must be application/pdf and non-empty.
    const pdf = await sa.client.get(`/reports/${R.key}/pdf`, { params: { page: 1, page_size: 20 } });
    if (pdf.status === 200 && pdf.contentType.includes('application/pdf') && pdf.data?.bytes > 200) {
      ok(`${R.id} PDF stream OK`, `${pdf.data.bytes} bytes, type=${pdf.contentType}`);
    } else {
      bad(`${R.id} PDF stream`, `status=${pdf.status} ct=${pdf.contentType} bytes=${pdf.data?.bytes}`);
    }
  }

  // ── Spot-check Cross-truth: R3 total_equipment vs raw COUNT(*) ────
  const [r1Count] = await conn.query("SELECT COUNT(*) AS n FROM cmms_eqip_mst");
  const r3 = await sa.client.get('/reports/equipment-utilization', { params: { page: 1, page_size: 1 } });
  if (r3.status === 200 && r3.data?.data?.summary?.total_equipment === Number(r1Count[0].n)) {
    ok('Cross-truth R3 total_equipment == COUNT(cmms_eqip_mst)',
       `${r3.data.data.summary.total_equipment} == ${r1Count[0].n}`);
  } else {
    bad('Cross-truth R3 total_equipment',
        `report=${r3.data?.data?.summary?.total_equipment} raw=${r1Count[0].n}`);
  }

  // R2 — total_pending should match COUNT WHERE status IN (...).
  const [r2Count] = await conn.query(
    "SELECT COUNT(*) AS n FROM cmms_jobrequest_mst WHERE JR_MVP_STATUS IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','REOPENED')",
  );
  const r2 = await sa.client.get('/reports/pending-jobs', { params: { page: 1, page_size: 1 } });
  if (r2.status === 200 && r2.data?.data?.summary?.total_pending === Number(r2Count[0].n)) {
    ok('Cross-truth R2 total_pending == COUNT(pending statuses)',
       `${r2.data.data.summary.total_pending} == ${r2Count[0].n}`);
  } else {
    bad('Cross-truth R2 total_pending',
        `report=${r2.data?.data?.summary?.total_pending} raw=${r2Count[0].n}`);
  }

  // ── Filter smoke on R6 — apply a known status filter ──────────────
  const [r6Count] = await conn.query(
    "SELECT COUNT(*) AS n FROM cmms_jobrequest_mst WHERE JR_MVP_STATUS = 'VERIFIED_CLOSED'",
  );
  const r6 = await sa.client.get('/reports/job-request-summary',
    { params: { page: 1, page_size: 1, status: 'VERIFIED_CLOSED' } });
  if (r6.status === 200 && r6.data?.data?.total === Number(r6Count[0].n)) {
    ok('Filter smoke R6 status=VERIFIED_CLOSED narrowed correctly',
       `${r6.data.data.total} == ${r6Count[0].n}`);
  } else {
    bad('Filter smoke R6 status=VERIFIED_CLOSED',
        `report=${r6.data?.data?.total} raw=${r6Count[0].n}`);
  }

  // ── Analytics: JSON shape + CSV download ──────────────────────────
  for (const G of CHARTS) {
    const json = await sa.client.get(`/analytics/${G.key}`, { params: { months: 6 } });
    if (json.status !== 200) { bad(`${G.id} ${G.key}`, `${json.status}`); continue; }
    const data = json.data?.data;
    if (!Array.isArray(data)) { bad(`${G.id} ${G.key}`, 'data is not array'); continue; }
    // If non-empty, verify the shape of the first row.
    if (data.length > 0) {
      const missing = G.shape.filter((k) => !(k in data[0]));
      if (missing.length) {
        bad(`${G.id} ${G.key} shape`, `missing: ${missing.join(',')}`);
      } else {
        ok(`${G.id} ${G.key} JSON OK`, `${data.length} rows, keys=${Object.keys(data[0]).join('/')}`);
      }
    } else {
      ok(`${G.id} ${G.key} JSON OK (empty)`);
    }

    // CSV download.
    const csv = await sa.client.get(`/analytics/${G.key}/csv`, { params: { months: 6 } });
    if (csv.status === 200 && csv.contentType.includes('text/csv') && csv.data?.bytes > 0) {
      ok(`${G.id} ${G.key} CSV OK`, `${csv.data.bytes} bytes`);
    } else {
      bad(`${G.id} ${G.key} CSV`, `status=${csv.status} ct=${csv.contentType} bytes=${csv.data?.bytes}`);
    }
  }

  // ── RBAC denied — log in as VIEW_ONLY and hit /pdf which requires export ─
  // Pick a known VIEW_ONLY user from the DB.
  const [vRow] = await conn.query(
    `SELECT u.employee_id FROM users u
        JOIN user_roles ur ON ur.user_id = u.user_id
        JOIN roles r ON r.role_id = ur.role_id
       WHERE r.role_code = 'VIEW_ONLY' AND u.is_active = 1
       LIMIT 1`,
  );
  if (vRow && vRow.length > 0) {
    const empId = vRow[0].employee_id;
    try {
      const vo = await login(empId, empId);
      // View permission → 200
      const v1 = await vo.client.get('/reports/calibration-due', { params: { page: 1, page_size: 5 } });
      if (v1.status === 200) ok(`VIEW_ONLY → /reports/calibration-due 200`);
      else                   bad(`VIEW_ONLY view permission`, `status=${v1.status}`);
      // Export gated → 403
      const v2 = await vo.client.get('/reports/calibration-due/pdf', { params: { page: 1, page_size: 5 } });
      if (v2.status === 403) ok(`VIEW_ONLY → /pdf returns 403 (missing reports:export)`);
      else                   bad(`VIEW_ONLY pdf gate`, `status=${v2.status}`);
    } catch (e) {
      bad(`VIEW_ONLY login as ${empId}`, e.message);
    }
  } else {
    console.log(`${C.yellow}⚠ No active VIEW_ONLY user found — skipping RBAC denial test${C.reset}`);
  }

  await conn.end();

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n${C.bold}${pass} passed${C.reset}, ${fail > 0 ? `${C.red}${fail} failed${C.reset}` : '0 failed'}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`${C.red}FATAL${C.reset}`, e);
  process.exit(2);
});
