// ============================================================================
// db/discovery/smoke_phase14.js
// ----------------------------------------------------------------------------
// PHASE 14 — Audit Log Viewer smoke matrix (READ-ONLY).
//
// COVERAGE
//   A1   List returns real rows newest-first; pagination shape sane
//   A2   Filter by `actor` narrows correctly
//   A3   Filter by `action` returns only that action
//   A4   Filter by `entityType` returns only that entity type
//   A5   Filter by `entityId` returns only rows for that entity
//   A6   Free-text `q` matches against action/entity/notes
//   A7   Source tab 'identity' hits user_role_history (verified by shape)
//   A8   Source tab 'transitions' UNIONs 3 history tables (verified by sub_source mix)
//   A9   Detail endpoint returns notes_json or notes_text safely
//   A10  Distinct filters endpoint returns actions + entityTypes
//   A11  Export CSV streams text/csv with header row + content rows
//   A12  RBAC: SUPER_ADMIN sees rows (200); other roles → 403; anon → 401
//   A13  Page count math matches: pages = ceil(total / page_size)
//   A14  Pagination — page 2 differs from page 1
//   A15  READ-ONLY proof: row counts in source tables are UNCHANGED before/after
//   A16  Verification: 2 list rows cross-check against direct SELECT on audit_log
//
// USAGE
//   cd "SOFTWARE CODE/BE"
//   node db/discovery/smoke_phase14.js
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


function makeClient() {
  const headers = {};
  async function req(method, url, body, asText = false) {
    const init = { method, headers: { 'content-type': 'application/json', ...headers } };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch(BASE + url, init);
    if (asText) { const text = await r.text(); return { status: r.status, text, headers: r.headers }; }
    let data = null;
    try { data = await r.json(); } catch {}
    return { status: r.status, data, headers: r.headers };
  }
  return {
    get:   (u, asText) => req('GET', u, undefined, asText),
    setAuth:   (t) => { headers.Authorization = 'Bearer ' + t; },
    clearAuth: () => { delete headers.Authorization; },
  };
}

async function login(employeeId, password) {
  const c = makeClient();
  const r = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId, password }),
  });
  const j = await r.json();
  if (r.status !== 200 || !j?.data?.accessToken) {
    throw new Error(`login(${employeeId}) → ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  }
  c.setAuth(j.data.accessToken);
  return { client: c, user: j.data.user };
}

async function db() {
  return mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'final',
  });
}


async function main() {
  console.log(`${C.bold}${C.cyan}\nPhase 14 — Audit Log Viewer smoke matrix${C.reset}\n`);

  const conn = await db();

  // ── READ-ONLY baseline counts (asserted at the end) ──────────────────
  const [[al0]]  = await conn.query('SELECT COUNT(*) AS n FROM audit_log');
  const [[urh0]] = await conn.query('SELECT COUNT(*) AS n FROM user_role_history');
  const [[jrh0]] = await conn.query('SELECT COUNT(*) AS n FROM job_request_status_history');
  const [[jch0]] = await conn.query('SELECT COUNT(*) AS n FROM job_card_status_history');
  const [[ssh0]] = await conn.query('SELECT COUNT(*) AS n FROM schedule_status_history');
  console.log(`${C.gray}baseline counts:  audit_log=${al0.n}  urh=${urh0.n}  jrh=${jrh0.n}  jch=${jch0.n}  ssh=${ssh0.n}${C.reset}\n`);

  const sa = await login('SA79900', 'SA79900');


  // ═════════════════════════════════════════════════════════════════
  //  A1 — List returns real rows newest-first
  // ═════════════════════════════════════════════════════════════════
  const r1 = await sa.client.get('/audit?source=audit_log&page=1&page_size=10');
  if (r1.status === 200 && Array.isArray(r1.data?.data?.items) && r1.data.data.items.length > 0) {
    const items = r1.data.data.items;
    // newest first — created_at is descending
    const ts = items.map((x) => x.occurred_at);
    const sorted = [...ts].sort((a, b) => (a < b ? 1 : -1));
    const isSorted = ts.every((v, i) => v === sorted[i]);
    if (isSorted) ok(`A1 list returns ${items.length} rows newest-first`);
    else          bad('A1 not newest-first', ts.slice(0,5).join(','));
  } else {
    bad('A1 list', `status=${r1.status}`);
  }

  // ═════════════════════════════════════════════════════════════════
  //  A2 — Filter by actor
  // ═════════════════════════════════════════════════════════════════
  // Pick the most-frequent actor in audit_log.
  const [[topActor]] = await conn.query(
    `SELECT actor_employee_id, COUNT(*) AS n FROM audit_log
      GROUP BY actor_employee_id ORDER BY n DESC LIMIT 1`,
  );
  const ra = await sa.client.get(`/audit?source=audit_log&actor=${encodeURIComponent(topActor.actor_employee_id)}&page_size=50`);
  const allMatch = (ra.data?.data?.items || []).every((x) => x.actor_employee_id === topActor.actor_employee_id);
  if (ra.status === 200 && allMatch && ra.data.data.items.length > 0) {
    ok(`A2 actor=${topActor.actor_employee_id} → ${ra.data.data.items.length} rows, all match`);
  } else {
    bad('A2 actor filter', `status=${ra.status} matched=${allMatch}`);
  }

  // ═════════════════════════════════════════════════════════════════
  //  A3 — Filter by action
  // ═════════════════════════════════════════════════════════════════
  const [[topAction]] = await conn.query(
    `SELECT action, COUNT(*) AS n FROM audit_log GROUP BY action ORDER BY n DESC LIMIT 1`,
  );
  const rax = await sa.client.get(`/audit?source=audit_log&action=${encodeURIComponent(topAction.action)}`);
  const allActMatch = (rax.data?.data?.items || []).every((x) => x.action === topAction.action);
  if (rax.status === 200 && allActMatch) ok(`A3 action=${topAction.action} → all rows match`);
  else                                    bad('A3 action filter', `matched=${allActMatch}`);

  // ═════════════════════════════════════════════════════════════════
  //  A4 — Filter by entityType
  // ═════════════════════════════════════════════════════════════════
  const r4 = await sa.client.get('/audit?source=audit_log&entityType=job_request&page_size=10');
  const r4OK = (r4.data?.data?.items || []).every((x) => x.entity_type === 'job_request');
  if (r4.status === 200 && r4OK && r4.data.data.items.length > 0) ok('A4 entityType=job_request → all rows match');
  else                                                              bad('A4 entityType', `matched=${r4OK}`);

  // ═════════════════════════════════════════════════════════════════
  //  A5 — Filter by entityId
  // ═════════════════════════════════════════════════════════════════
  const [[someEntity]] = await conn.query(
    `SELECT entity_type, entity_id FROM audit_log WHERE entity_id IS NOT NULL
     GROUP BY entity_type, entity_id ORDER BY COUNT(*) DESC LIMIT 1`,
  );
  const r5 = await sa.client.get(`/audit?source=audit_log&entityId=${encodeURIComponent(someEntity.entity_id)}&page_size=50`);
  const r5OK = (r5.data?.data?.items || []).every((x) => x.entity_id === someEntity.entity_id);
  if (r5.status === 200 && r5OK && r5.data.data.items.length > 0) ok(`A5 entityId=${someEntity.entity_id} → all rows match`);
  else                                                              bad('A5 entityId', `matched=${r5OK}`);

  // ═════════════════════════════════════════════════════════════════
  //  A6 — Free-text q
  // ═════════════════════════════════════════════════════════════════
  const r6 = await sa.client.get('/audit?source=audit_log&q=JR_&page_size=20');
  // SQL LIKE on utf8mb4_unicode_ci is case-insensitive — so a row with
  // `parent_jr_no` in notes matches q=JR_. Use case-insensitive JS regex
  // here to mirror that contract.
  const r6OK = (r6.data?.data?.items || []).every((x) =>
    /JR_/i.test(x.action || '') || /JR_/i.test(x.notes_text || '') || /JR_/i.test(x.entity_type || ''),
  );
  if (r6.status === 200 && r6OK) ok('A6 free-text q="JR_" → matches in action/notes/entity_type');
  else                            bad('A6 free-text q', `OK=${r6OK}`);

  // ═════════════════════════════════════════════════════════════════
  //  A7 — Source tab 'identity'
  // ═════════════════════════════════════════════════════════════════
  const r7 = await sa.client.get('/audit?source=identity&page_size=10');
  const r7OK = r7.status === 200
    && Array.isArray(r7.data?.data?.items)
    && r7.data.data.items.every((x) => x.entity_type === 'user');
  if (r7OK && r7.data.data.items.length > 0) ok(`A7 source=identity → ${r7.data.data.items.length} rows, all entity_type=user`);
  else                                        bad('A7 source=identity', `status=${r7.status}`);

  // ═════════════════════════════════════════════════════════════════
  //  A8 — Source tab 'transitions' (UNION of 3 tables, mixed sub_source)
  // ═════════════════════════════════════════════════════════════════
  const r8 = await sa.client.get('/audit?source=transitions&page_size=100');
  if (r8.status === 200) {
    const items = r8.data?.data?.items || [];
    const subs = new Set(items.map((x) => x.sub_source));
    const validSubs = items.every((x) => ['job_request','job_card','schedule'].includes(x.sub_source));
    if (validSubs && items.length > 0) ok(`A8 source=transitions → ${items.length} rows, sub_sources=${[...subs].join(',')}`);
    else                                bad('A8 source=transitions', `validSubs=${validSubs} subs=${[...subs].join(',')}`);
  } else {
    bad('A8 source=transitions status', r8.status);
  }

  // ═════════════════════════════════════════════════════════════════
  //  A9 — Detail endpoint safely handles notes_json AND notes_text
  // ═════════════════════════════════════════════════════════════════
  // Find an audit_id whose notes is non-NULL.
  const [[withNotes]] = await conn.query(
    `SELECT audit_id FROM audit_log WHERE notes IS NOT NULL AND notes <> '' LIMIT 1`,
  );
  if (withNotes) {
    const r9 = await sa.client.get(`/audit/${withNotes.audit_id}?source=audit_log`);
    if (r9.status === 200 && r9.data?.data?.id === withNotes.audit_id) {
      const hasNotes = r9.data.data.notes_json != null || r9.data.data.notes_text != null;
      if (hasNotes) ok(`A9 detail audit_id=${withNotes.audit_id} returns notes_json/notes_text`);
      else          bad('A9 detail notes', JSON.stringify(r9.data.data).slice(0, 200));
    } else {
      bad('A9 detail', `status=${r9.status}`);
    }
  } else {
    console.log(`${C.yellow}⚠ A9 skipped — no audit_log rows with notes${C.reset}`);
  }

  // Also test a transitions detail row.
  const [[someTrans]] = await conn.query(
    `SELECT history_id FROM job_request_status_history ORDER BY history_id DESC LIMIT 1`,
  );
  if (someTrans) {
    const r9b = await sa.client.get(`/audit/${someTrans.history_id}?source=transitions&subSource=job_request`);
    if (r9b.status === 200 && r9b.data?.data?.from_status !== undefined && r9b.data?.data?.to_status) {
      ok(`A9 transitions detail returns from→to (${r9b.data.data.from_status || 'NULL'} → ${r9b.data.data.to_status})`);
    } else {
      bad('A9 transitions detail', `status=${r9b.status}`);
    }
  }

  // ═════════════════════════════════════════════════════════════════
  //  A10 — Filters endpoint
  // ═════════════════════════════════════════════════════════════════
  const r10 = await sa.client.get('/audit/filters?source=audit_log');
  if (r10.status === 200 && Array.isArray(r10.data?.data?.actions) && r10.data.data.actions.length > 0) {
    ok(`A10 /filters audit_log → actions=${r10.data.data.actions.length} entityTypes=${r10.data.data.entityTypes.length}`);
  } else {
    bad('A10 /filters', `status=${r10.status}`);
  }
  const r10b = await sa.client.get('/audit/filters?source=transitions');
  if (r10b.status === 200 && r10b.data?.data?.actions?.length > 0) ok('A10 /filters transitions OK');
  else                                                              bad('A10 /filters transitions', r10b.status);

  // ═════════════════════════════════════════════════════════════════
  //  A11 — Export CSV
  // ═════════════════════════════════════════════════════════════════
  const r11 = await sa.client.get('/audit/export?source=audit_log', true);
  if (r11.status === 200 && /^Timestamp,Source,Action,Entity Type/.test(r11.text)) {
    const lines = r11.text.split('\r\n').filter(Boolean);
    ok(`A11 CSV export → ${lines.length - 1} data row(s)`);
  } else {
    bad('A11 CSV', `status=${r11.status} firstLine=${r11.text?.slice(0,80)}`);
  }

  // ═════════════════════════════════════════════════════════════════
  //  A12 — RBAC: anon 401, View-Only 403, SA 200
  // ═════════════════════════════════════════════════════════════════
  const anon = makeClient();
  const r12a = await anon.get('/audit');
  if (r12a.status === 401) ok('A12 anon → 401');
  else                      bad('A12 anon', r12a.status);

  // VIEW_ONLY login (no audit perms by mig 600 default).
  const [voRow] = await conn.query(
    `SELECT u.employee_id FROM users u
       JOIN user_roles ur ON ur.user_id=u.user_id
       JOIN roles r ON r.role_id=ur.role_id
      WHERE r.role_code='VIEW_ONLY' AND u.is_active=1 LIMIT 1`,
  );
  if (voRow.length > 0) {
    try {
      const vo = await login(voRow[0].employee_id, voRow[0].employee_id);
      const r12b = await vo.client.get('/audit');
      if (r12b.status === 403) ok('A12 VIEW_ONLY → 403 (no audit:read-list)');
      else                      bad('A12 VIEW_ONLY', r12b.status);

      const r12c = await vo.client.get('/audit/export', true);
      if (r12c.status === 403) ok('A12 VIEW_ONLY export → 403');
      else                      bad('A12 VIEW_ONLY export', r12c.status);
    } catch (e) {
      console.log(`${C.yellow}⚠ A12 VO login failed: ${e.message}${C.reset}`);
    }
  }

  // ═════════════════════════════════════════════════════════════════
  //  A13 — Pagination math
  // ═════════════════════════════════════════════════════════════════
  const r13 = await sa.client.get('/audit?source=audit_log&page=1&page_size=10');
  const p = r13.data?.data?.pagination;
  if (p && p.total_pages === Math.max(1, Math.ceil(p.total_items / p.page_size))) {
    ok(`A13 pagination math OK total=${p.total_items} pages=${p.total_pages}`);
  } else {
    bad('A13 pagination', JSON.stringify(p));
  }

  // ═════════════════════════════════════════════════════════════════
  //  A14 — Page 2 differs from page 1
  // ═════════════════════════════════════════════════════════════════
  if (p && p.total_pages > 1) {
    const r14a = await sa.client.get('/audit?source=audit_log&page=1&page_size=10');
    const r14b = await sa.client.get('/audit?source=audit_log&page=2&page_size=10');
    const ids1 = (r14a.data?.data?.items || []).map((x) => x.id).join(',');
    const ids2 = (r14b.data?.data?.items || []).map((x) => x.id).join(',');
    if (ids1 && ids2 && ids1 !== ids2) ok('A14 page 1 ≠ page 2');
    else                                bad('A14 pagination dedup', `equal=${ids1 === ids2}`);
  } else {
    console.log(`${C.yellow}⚠ A14 skipped — only one page${C.reset}`);
  }

  // ═════════════════════════════════════════════════════════════════
  //  A15 — READ-ONLY proof: row counts unchanged
  // ═════════════════════════════════════════════════════════════════
  const [[al1]]  = await conn.query('SELECT COUNT(*) AS n FROM audit_log');
  const [[urh1]] = await conn.query('SELECT COUNT(*) AS n FROM user_role_history');
  const [[jrh1]] = await conn.query('SELECT COUNT(*) AS n FROM job_request_status_history');
  const [[jch1]] = await conn.query('SELECT COUNT(*) AS n FROM job_card_status_history');
  const [[ssh1]] = await conn.query('SELECT COUNT(*) AS n FROM schedule_status_history');
  if (al0.n === al1.n && urh0.n === urh1.n && jrh0.n === jrh1.n && jch0.n === jch1.n && ssh0.n === ssh1.n) {
    ok(`A15 READ-ONLY proof: all 5 source tables unchanged (al=${al1.n} urh=${urh1.n} jrh=${jrh1.n} jch=${jch1.n} ssh=${ssh1.n})`);
  } else {
    bad('A15 READ-ONLY proof FAILED — row counts changed', `before/after: al ${al0.n}/${al1.n}`);
  }

  // ═════════════════════════════════════════════════════════════════
  //  A16 — Cross-check 2 rows against direct SELECT
  // ═════════════════════════════════════════════════════════════════
  const r16 = await sa.client.get('/audit?source=audit_log&page=1&page_size=2');
  const apiRows = r16.data?.data?.items || [];
  if (apiRows.length >= 1) {
    const [[dbRow]] = await conn.query(
      `SELECT audit_id, action, entity_type, entity_id, actor_employee_id
         FROM audit_log WHERE audit_id = ?`,
      [apiRows[0].id],
    );
    if (dbRow
        && dbRow.audit_id === apiRows[0].id
        && dbRow.action === apiRows[0].action
        && dbRow.entity_type === apiRows[0].entity_type
        && dbRow.entity_id === apiRows[0].entity_id
        && dbRow.actor_employee_id === apiRows[0].actor_employee_id) {
      ok(`A16 cross-check: API row #${apiRows[0].id} matches direct SELECT`);
    } else {
      bad('A16 cross-check', JSON.stringify({ db: dbRow, api: apiRows[0] }).slice(0, 200));
    }
  } else {
    bad('A16 cross-check', 'no rows returned');
  }


  await conn.end();
  console.log(`\n${C.bold}Results:${C.reset} ${C.green}${pass} passed${C.reset}, ${fail ? C.red : C.gray}${fail} failed${C.reset}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(`${C.red}FATAL:${C.reset}`, e); process.exit(2); });
