// ============================================================================
// db/discovery/smoke_phase9_hotfix.js
// ----------------------------------------------------------------------------
// Smoke test for the Phase 9 hotfix (2026-05-19):
//   H1..H6 — maintenance + spares CRUD
//   H7..H8 — date field round-trip (the "can't be stored" bug)
// ============================================================================

'use strict';

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const BASE = 'http://localhost:3000/api/v1';

const C = { reset:'\x1b[0m', green:'\x1b[32m', red:'\x1b[31m', gray:'\x1b[90m', cyan:'\x1b[36m', bold:'\x1b[1m' };
let pass = 0, fail = 0;
function ok(label, extra = '')  { console.log(`${C.green}✓ ${C.reset}${label} ${C.gray}${extra}${C.reset}`); pass++; }
function bad(label, extra = '') { console.log(`${C.red}✗ ${C.reset}${label} ${C.gray}${extra}${C.reset}`); fail++; }

function makeClient() {
  const headers = {};
  async function request(method, url, body) {
    const init = { method, headers: { 'content-type': 'application/json', ...headers } };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch(BASE + url, init);
    let data = null;
    const txt = await r.text();
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    return { status: r.status, data };
  }
  return {
    get:    (url) => request('GET',    url),
    post:   (url, body) => request('POST',   url, body),
    patch:  (url, body) => request('PATCH',  url, body),
    delete: (url) => request('DELETE', url),
    setAuth: (token) => { headers.Authorization = `Bearer ${token}`; },
  };
}

async function login(empId, pw) {
  const c = makeClient();
  const r = await c.post('/auth/login', { employee_id: empId, password: pw });
  if (r.status !== 200) throw new Error(`login(${empId}) → ${r.status}`);
  c.setAuth(r.data.data.accessToken);
  return c;
}

async function db() {
  return mysql.createConnection({
    host:'localhost', port:3306, user:'root', password:'',
    database: process.env.DB_NAME || 'final',
  });
}

async function main() {
  console.log(`${C.bold}${C.cyan}\nPhase 9 hotfix smoke — Maintenance + Spares + Date round-trip${C.reset}\n`);

  const eng = await login('TE00225', 'TE00225');
  const lic = await login('AC08248', 'AC08248');

  // Find an IN_PROGRESS JC for the engineer (created by smoke_phase9 earlier).
  // Reopen if needed so we can write.
  const conn = await db();
  const [list] = await conn.query(
    `SELECT JM_SectionJobNo FROM cmms_jobcard_mst
      WHERE JM_ASSIGNED_ENGINEER = 'TE00225'
        AND JM_MVP_STATUS IN ('IN_PROGRESS','ASSIGNED')
      ORDER BY JM_CREATED_ON DESC LIMIT 1`,
  );
  if (!list.length) {
    // Try VERIFIED_CLOSED then reopen.
    const [vc] = await conn.query(
      `SELECT JM_SectionJobNo FROM cmms_jobcard_mst
        WHERE JM_ASSIGNED_ENGINEER = 'TE00225' AND JM_MVP_STATUS = 'VERIFIED_CLOSED'
        ORDER BY JM_CREATED_ON DESC LIMIT 1`,
    );
    if (!vc.length) { bad('SETUP no JC for TE00225'); return summary(); }
    await lic.post(`/job-cards/${vc[0].JM_SectionJobNo}/reopen`, {
      reason: 'Hotfix smoke needs an IN_PROGRESS JC for maintenance + spares tests.',
    });
    list.push({ JM_SectionJobNo: vc[0].JM_SectionJobNo });
  }
  // Ensure it's IN_PROGRESS (start-work if still ASSIGNED).
  const jcId = list[0].JM_SectionJobNo;
  const [[st]] = await conn.query(`SELECT JM_MVP_STATUS s FROM cmms_jobcard_mst WHERE JM_SectionJobNo = ?`, [jcId]);
  if (st.s === 'ASSIGNED') await eng.post(`/job-cards/${jcId}/start-work`, {});
  await conn.end();
  ok('SETUP using JC', jcId);

  // ── H1: POST maintenance-rows → 201 ─────────────────────────────
  let maintRowId = null;
  {
    const r = await eng.post(`/job-cards/${jcId}/maintenance-rows`, {
      defect_description: 'H1 smoke: power supply ripple > 10mV at full load',
      observation: 'Verified with oscilloscope, ripple peak 12mV',
      action_taken: 'Replaced filter capacitor C12 (220uF)',
      remarks: 'Tested after repair, ripple now 3mV',
    });
    if (r.status === 201) {
      maintRowId = r.data.data.id;
      ok('H1 add maintenance row', `id=${maintRowId} sr_no=${r.data.data.sr_no}`);
    } else bad('H1 add maintenance row', `${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  }

  // ── H2: GET list returns the new row ────────────────────────────
  {
    const r = await eng.get(`/job-cards/${jcId}/maintenance-rows`);
    if (r.status === 200 && (r.data.data.items || []).some((it) => it.id === maintRowId)) {
      ok('H2 list maintenance rows', `${r.data.data.items.length} rows total`);
    } else bad('H2 list maintenance rows', `${r.status}`);
  }

  // ── H3: PATCH a field, verify it persisted ──────────────────────
  {
    const r = await eng.patch(`/job-cards/${jcId}/maintenance-rows/${maintRowId}`, {
      remarks: 'H3 updated — ripple now 2mV after 2-hour soak test',
    });
    if (r.status !== 200) { bad('H3 patch'); }
    else {
      const get = await eng.get(`/job-cards/${jcId}/maintenance-rows`);
      const row = (get.data.data.items || []).find((it) => it.id === maintRowId);
      if (row && row.remarks.includes('2-hour soak')) ok('H3 patch maintenance row', 'remarks updated');
      else bad('H3 patch maintenance row', 'value did not persist');
    }
  }

  // ── H4: POST spares-rows with body={} → 201 (defaults) ──────────
  let spareRowId = null;
  {
    const r = await eng.post(`/job-cards/${jcId}/spares-rows`, {});
    if (r.status === 201) {
      spareRowId = r.data.data.id;
      ok('H4 add empty spare row', `id=${spareRowId}`);
    } else bad('H4 add empty spare row', `${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  }

  // ── H5: PATCH spare row with fields → 200 ───────────────────────
  {
    const r = await eng.patch(`/job-cards/${jcId}/spares-rows/${spareRowId}`, {
      spare_type:       'Capacitor',
      source:           'VENDOR',
      part_no:          'C12-220UF-25V',
      part_description: 'Electrolytic filter capacitor, 220uF, 25V, 105°C, low-ESR',
      quantity:         '1',
      cost:             '85.50',
    });
    if (r.status === 200) {
      const get = await eng.get(`/job-cards/${jcId}/spares-rows`);
      const row = (get.data.data.items || []).find((it) => it.id === spareRowId);
      if (row && row.spare_type === 'Capacitor' && Number(row.cost) === 85.5) {
        ok('H5 patch spare row', `cost=${row.cost} source=${row.source}`);
      } else bad('H5 patch spare row', 'values did not persist');
    } else bad('H5 patch spare row', `${r.status}`);
  }

  // ── H6: DELETE rows ─────────────────────────────────────────────
  {
    const dM = await eng.delete(`/job-cards/${jcId}/maintenance-rows/${maintRowId}`);
    const dS = await eng.delete(`/job-cards/${jcId}/spares-rows/${spareRowId}`);
    if (dM.status === 200 && dS.status === 200) ok('H6 delete both rows', 'maint + spare gone');
    else bad('H6 delete both rows', `maint=${dM.status} spare=${dS.status}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // H7: Date round-trip for a "ymd-only" column (instrument_received_date)
  //     PATCH "2026-04-10" → GET should return "2026-04-10"
  // ──────────────────────────────────────────────────────────────────
  {
    const r = await eng.patch(`/job-cards/${jcId}`, {
      instrument_received_date: '2026-04-10',
    });
    if (r.status === 200) {
      const get = await eng.get(`/job-cards/${jcId}`);
      const v = get.data?.data?.instrument_received_date;
      if (v === '2026-04-10') ok('H7 date round-trip (YMD col)', `stored=${v}`);
      else bad('H7 date round-trip (YMD col)', `expected "2026-04-10", got "${v}"`);
    } else bad('H7 PATCH ymd date', `${r.status}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // H8: Date round-trip for a "datetime" column (equipment_submitted_date)
  //     PATCH "2026-04-10" (YYYY-MM-DD) → GET should return ISO timestamp
  //     starting with "2026-04-10"
  //     This is the exact bug DS reported: input type=date sends YMD;
  //     BE stores as DATETIME; GET returns full ISO; FE form coerces back.
  // ──────────────────────────────────────────────────────────────────
  {
    const r = await eng.patch(`/job-cards/${jcId}`, {
      equipment_submitted_date: '2026-04-10',
    });
    if (r.status === 200) {
      const get = await eng.get(`/job-cards/${jcId}`);
      const v = get.data?.data?.equipment_submitted_date;
      if (typeof v === 'string' && v.startsWith('2026-04-10')) {
        ok('H8 datetime stored as YMD-date', `wire format="${v}" · FE truncates to "${v.slice(0, 10)}"`);
      } else bad('H8 datetime round-trip', `expected starts-with "2026-04-10", got "${v}"`);
    } else bad('H8 PATCH datetime', `${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // H9: Empty-string date clears the field on the BE
  // ──────────────────────────────────────────────────────────────────
  {
    const r = await eng.patch(`/job-cards/${jcId}`, {
      instrument_received_date: '',
    });
    if (r.status === 200) {
      const get = await eng.get(`/job-cards/${jcId}`);
      const v = get.data?.data?.instrument_received_date;
      if (v === null) ok('H9 empty-string date → null', 'BE converts "" → NULL correctly');
      else bad('H9 empty-string date', `expected null, got "${v}"`);
    } else bad('H9 PATCH empty date', `${r.status}`);
  }

  summary();
}

function summary() {
  console.log('');
  if (fail === 0) console.log(`${C.green}${C.bold}ALL ${pass} CHECKS PASSED${C.reset}\n`);
  else console.log(`${C.red}${C.bold}${fail} FAILED${C.reset}${C.gray} (${pass} passed)${C.reset}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
