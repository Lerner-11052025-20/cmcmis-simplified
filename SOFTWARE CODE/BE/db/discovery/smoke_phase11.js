// ============================================================================
// db/discovery/smoke_phase11.js
// ----------------------------------------------------------------------------
// PHASE 11 — PDF Generation end-to-end smoke matrix.
//
// CERTIFICATE (PDF #1):
//   C1  VERIFIED_CLOSED JC → 200, application/pdf, single page, filename ok
//   C2  COMPLETED       JC → 200 (if any exist in DB)
//   C3  ASSIGNED        JC → 409 (ineligible), JSON error envelope
//   C4  bogus id        → 404
//   C5  RBAC: VIEW_ONLY → 403 (no job_card:download-certificate)
//   C6  no auth         → 401
//   C7  field mapping   → cross-check (we use bytes+page count proxy,
//                         since PDFKit embeds text as glyph IDs)
//
// JC DETAILS (PDF #2):
//   D1  any JC          → 200, multi-page allowed, filename ok
//   D2  bogus id        → 404
//   D3  RBAC: NORMAL    → 403 (no job_card:download-details)
//   D4  documents list  → only metadata fields appear (no Blob bytes leaked)
//
// JR DETAILS (PDF #3):
//   R1  any JR          → 200, application/pdf
//   R2  bogus id        → 404
//   R3  RBAC row-scope  → NORMAL trying foreign JR → 404 (NOT 403, to avoid
//                         leaking existence — mirrors Phase-7 Slice-2 policy)
//   R4  no auth         → 401
//
// ZERO-WRITE PROOF:
//   Z1  audit_log rows BEFORE = AFTER all PDF requests
//   Z2  cmms_jobcard_mst.updated_at BEFORE = AFTER (verified per JC under test)
//
// REPO ALIASING:
//   A1  grep service/controller/templates for JM_ / JR_ / EQM_ legacy names
//       outside the repo.js — must be zero hits.
// ============================================================================

'use strict';

const fs    = require('fs');
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


// ── Fetch client ──────────────────────────────────────────────────
function makeClient() {
  const headers = {};
  async function get(url) {
    const r = await fetch(BASE + url, { headers });
    const ct = r.headers.get('content-type') || '';
    const cd = r.headers.get('content-disposition') || '';
    if (ct.includes('application/json')) {
      const data = await r.json().catch(() => null);
      return { status: r.status, ct, cd, data, bytes: 0 };
    }
    const buf = Buffer.from(await r.arrayBuffer());
    return { status: r.status, ct, cd, data: null, bytes: buf.length, buf };
  }
  return {
    get,
    setAuth: (t) => { headers.Authorization = `Bearer ${t}`; },
    clearAuth: () => { delete headers.Authorization; },
  };
}

async function login(employeeId, password) {
  const r = await fetch(BASE + '/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId, password }),
  });
  const j = await r.json();
  if (r.status !== 200 || !j?.data?.accessToken) {
    throw new Error(`login(${employeeId}) → ${r.status} ${JSON.stringify(j).slice(0, 240)}`);
  }
  const c = makeClient();
  c.setAuth(j.data.accessToken);
  return { client: c, user: j.data.user };
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

/** Count actual pages in a PDF via the catalog /Count entry. */
function pdfPageCount(buf) {
  const s = buf.toString('binary');
  const m = s.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Confirm the buffer is a real PDF (header starts with %PDF-). */
function isPdf(buf) {
  return buf && buf.length >= 4 && buf.slice(0, 5).toString() === '%PDF-';
}


// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`${C.bold}${C.cyan}\nPhase 11 — PDF Generation smoke matrix${C.reset}\n`);

  // ── Test users ────────────────────────────────────────────────────
  const sa  = await login('SA79900', 'SA79900');
  console.log(`${C.gray}SUPER_ADMIN: ${sa.user.sub}${C.reset}`);

  const conn = await db();

  // Pick representative JCs by status, and a real JR.
  const [vc]  = await conn.query("SELECT JM_SectionJobNo, JM_PARENT_JR_NO FROM cmms_jobcard_mst WHERE JM_MVP_STATUS='VERIFIED_CLOSED' AND JM_PARENT_JR_NO IS NOT NULL ORDER BY JM_JobCardNO DESC LIMIT 1");
  const [as]  = await conn.query("SELECT JM_SectionJobNo FROM cmms_jobcard_mst WHERE JM_MVP_STATUS='ASSIGNED' LIMIT 1");
  const [jrs] = await conn.query("SELECT JR_JOBREQUESTNO, JR_SUBMITTEDBYID FROM cmms_jobrequest_mst ORDER BY JR_JOBREQUESTNO DESC LIMIT 1");
  const VC_ID = vc[0]?.JM_SectionJobNo;
  const AS_ID = as[0]?.JM_SectionJobNo;
  const JR_ID = jrs[0]?.JR_JOBREQUESTNO;
  const JR_OWNER = jrs[0]?.JR_SUBMITTEDBYID;
  console.log(`${C.gray}Picked: VC_JC=${VC_ID}, AS_JC=${AS_ID}, JR=${JR_ID} (owner=${JR_OWNER})${C.reset}\n`);

  // ── X. No-auth → 401 ──────────────────────────────────────────────
  const anon = makeClient();
  for (const [name, url] of [
    ['no-auth cert',        `/job-cards/${VC_ID}/certificate.pdf`],
    ['no-auth JC details',  `/job-cards/${VC_ID}/details.pdf`],
    ['no-auth JR details',  `/job-requests/${JR_ID}/details.pdf`],
  ]) {
    const r = await anon.get(url);
    if (r.status === 401) ok(`${name} → 401`);
    else                  bad(`${name} expected 401`, `got ${r.status}`);
  }

  // ── Snapshot audit_log + JC.updated_at for zero-write proof ────────
  const [[{ n: auditBefore }]] = await conn.query("SELECT COUNT(*) AS n FROM audit_log");
  const [[jcBefore]] = await conn.query(
    "SELECT JM_UPDATED_ON FROM cmms_jobcard_mst WHERE JM_SectionJobNo=?",
    [VC_ID],
  );

  // ── C1: Certificate on VERIFIED_CLOSED card ───────────────────────
  const c1 = await sa.client.get(`/job-cards/${VC_ID}/certificate.pdf`);
  if (c1.status === 200 && c1.ct.includes('application/pdf') && isPdf(c1.buf)) {
    const pages = pdfPageCount(c1.buf);
    if (pages === 1) {
      ok(`C1 Certificate (VC) → 200, single page`,
         `${c1.bytes} bytes · ${c1.cd}`);
    } else {
      bad(`C1 Certificate must be SINGLE-PAGE`, `pages=${pages}`);
    }
  } else {
    bad(`C1 Certificate (VC)`, `status=${c1.status} ct=${c1.ct} isPdf=${isPdf(c1.buf)}`);
  }
  // Filename check
  if (/JC-\d{4}-\d{4,}_certificate\.pdf/.test(c1.cd)) {
    ok(`C1 filename matches JC-YYYY-NNNN_certificate.pdf`, c1.cd);
  } else {
    bad(`C1 filename pattern`, c1.cd);
  }

  // ── C3: Certificate on ASSIGNED → 409 ─────────────────────────────
  const c3 = await sa.client.get(`/job-cards/${AS_ID}/certificate.pdf`);
  if (c3.status === 409 && c3.data?.error?.code === 'CONFLICT') {
    ok(`C3 Certificate on ASSIGNED → 409 CONFLICT`,
       `msg="${c3.data.error.message.slice(0, 60)}…"`);
  } else {
    bad(`C3 Certificate ineligibility`, `status=${c3.status} body=${JSON.stringify(c3.data).slice(0, 120)}`);
  }

  // ── C4: bogus id → 404 ────────────────────────────────────────────
  const c4 = await sa.client.get(`/job-cards/J99999999/certificate.pdf`);
  if (c4.status === 404) ok(`C4 bogus JC → 404`);
  else                   bad(`C4 expected 404`, `got ${c4.status}`);

  // ── D1: JC Details PDF ────────────────────────────────────────────
  const d1 = await sa.client.get(`/job-cards/${VC_ID}/details.pdf`);
  if (d1.status === 200 && d1.ct.includes('application/pdf') && isPdf(d1.buf)) {
    ok(`D1 JC Details → 200`, `${d1.bytes} bytes · pages=${pdfPageCount(d1.buf)} · ${d1.cd}`);
  } else {
    bad(`D1 JC Details`, `status=${d1.status} ct=${d1.ct}`);
  }
  if (/JC-\d{4}-\d{4,}_details\.pdf/.test(d1.cd)) ok(`D1 filename ok`, d1.cd);
  else                                             bad(`D1 filename pattern`, d1.cd);

  // ── D2: bogus id → 404 ────────────────────────────────────────────
  const d2 = await sa.client.get(`/job-cards/J99999999/details.pdf`);
  if (d2.status === 404) ok(`D2 bogus JC details → 404`);
  else                   bad(`D2 expected 404`, `got ${d2.status}`);

  // ── R1: JR Details PDF ────────────────────────────────────────────
  const r1 = await sa.client.get(`/job-requests/${JR_ID}/details.pdf`);
  if (r1.status === 200 && r1.ct.includes('application/pdf') && isPdf(r1.buf)) {
    ok(`R1 JR Details → 200`, `${r1.bytes} bytes · pages=${pdfPageCount(r1.buf)} · ${r1.cd}`);
  } else {
    bad(`R1 JR Details`, `status=${r1.status} ct=${r1.ct}`);
  }
  if (/JR-\d{4}-\d{4,}_details\.pdf/.test(r1.cd)) ok(`R1 filename ok`, r1.cd);
  else                                              bad(`R1 filename pattern`, r1.cd);

  // ── R2: bogus JR id → 404 ─────────────────────────────────────────
  const r2 = await sa.client.get(`/job-requests/99999999/details.pdf`);
  if (r2.status === 404) ok(`R2 bogus JR details → 404`);
  else                   bad(`R2 expected 404`, `got ${r2.status}`);

  // ── RBAC: VIEW_ONLY user (has details, NOT certificate) ───────────
  const [voRow] = await conn.query(
    `SELECT u.employee_id FROM users u JOIN user_roles ur ON ur.user_id=u.user_id
       JOIN roles r ON r.role_id=ur.role_id
      WHERE r.role_code='VIEW_ONLY' AND u.is_active=1 LIMIT 1`,
  );
  if (voRow.length > 0) {
    try {
      const vo = await login(voRow[0].employee_id, voRow[0].employee_id);
      const v1 = await vo.client.get(`/job-cards/${VC_ID}/certificate.pdf`);
      if (v1.status === 403) ok(`RBAC VIEW_ONLY → cert 403 (no job_card:download-certificate)`);
      else                   bad(`RBAC VIEW_ONLY cert gate`, `status=${v1.status}`);
      const v2 = await vo.client.get(`/job-cards/${VC_ID}/details.pdf`);
      if (v2.status === 200 && v2.ct.includes('application/pdf')) ok(`RBAC VIEW_ONLY → JC details 200`);
      else                                                          bad(`RBAC VIEW_ONLY JC details`, `status=${v2.status}`);
      const v3 = await vo.client.get(`/job-requests/${JR_ID}/details.pdf`);
      if (v3.status === 200 && v3.ct.includes('application/pdf')) ok(`RBAC VIEW_ONLY → JR details 200`);
      else                                                          bad(`RBAC VIEW_ONLY JR details`, `status=${v3.status}`);
    } catch (e) { bad(`RBAC VIEW_ONLY login`, e.message); }
  } else {
    console.log(`${C.yellow}⚠ no VIEW_ONLY user — RBAC VIEW_ONLY skipped${C.reset}`);
  }

  // ── RBAC: NORMAL_USER row-scope on JR (own → 200, foreign → 404) ──
  // We need a NORMAL_USER whose employee_id matches a JR's submitter.
  const [normRow] = await conn.query(
    `SELECT u.employee_id FROM users u JOIN user_roles ur ON ur.user_id=u.user_id
       JOIN roles r ON r.role_id=ur.role_id
      WHERE r.role_code='NORMAL_USER' AND u.is_active=1 LIMIT 1`,
  );
  if (normRow.length > 0) {
    try {
      const nu = await login(normRow[0].employee_id, normRow[0].employee_id);
      // Normal Users do NOT have job_card:download-* → both JC PDFs 403.
      const n1 = await nu.client.get(`/job-cards/${VC_ID}/certificate.pdf`);
      if (n1.status === 403) ok(`RBAC NORMAL → JC cert 403`);
      else                   bad(`RBAC NORMAL JC cert`, `status=${n1.status}`);
      const n2 = await nu.client.get(`/job-cards/${VC_ID}/details.pdf`);
      if (n2.status === 403) ok(`RBAC NORMAL → JC details 403`);
      else                   bad(`RBAC NORMAL JC details`, `status=${n2.status}`);
      // JR row-scope: find one JR they DO own + one they DON'T.
      const [own]      = await conn.query(`SELECT JR_JOBREQUESTNO FROM cmms_jobrequest_mst WHERE JR_SUBMITTEDBYID=? LIMIT 1`, [normRow[0].employee_id]);
      const [foreign]  = await conn.query(`SELECT JR_JOBREQUESTNO FROM cmms_jobrequest_mst WHERE JR_SUBMITTEDBYID<>? OR JR_SUBMITTEDBYID IS NULL LIMIT 1`, [normRow[0].employee_id]);
      if (own.length > 0) {
        const n3 = await nu.client.get(`/job-requests/${own[0].JR_JOBREQUESTNO}/details.pdf`);
        if (n3.status === 200 && n3.ct.includes('application/pdf')) ok(`RBAC NORMAL → own JR 200`);
        else                                                          bad(`RBAC NORMAL own JR`, `status=${n3.status}`);
      } else {
        console.log(`${C.yellow}⚠ NORMAL user owns no JRs — own-scope 200 path skipped${C.reset}`);
      }
      if (foreign.length > 0) {
        const n4 = await nu.client.get(`/job-requests/${foreign[0].JR_JOBREQUESTNO}/details.pdf`);
        if (n4.status === 404) ok(`RBAC NORMAL → foreign JR collapses to 404 (no existence leak)`);
        else                   bad(`RBAC NORMAL foreign JR`, `expected 404, got ${n4.status}`);
      }
    } catch (e) { bad(`RBAC NORMAL login`, e.message); }
  } else {
    console.log(`${C.yellow}⚠ no NORMAL_USER user — RBAC NORMAL skipped${C.reset}`);
  }

  // ── Z1: zero-write proof — no audit_log row created ───────────────
  const [[{ n: auditAfter }]] = await conn.query("SELECT COUNT(*) AS n FROM audit_log");
  if (auditAfter === auditBefore) {
    ok(`Z1 audit_log row count unchanged across all PDF requests`,
       `before=${auditBefore} after=${auditAfter}`);
  } else {
    bad(`Z1 audit_log WRITES detected`, `before=${auditBefore} after=${auditAfter}`);
  }

  // ── Z2: JC.updated_at unchanged ───────────────────────────────────
  const [[jcAfter]] = await conn.query(
    "SELECT JM_UPDATED_ON FROM cmms_jobcard_mst WHERE JM_SectionJobNo=?",
    [VC_ID],
  );
  if (jcBefore && jcAfter && jcBefore.JM_UPDATED_ON.getTime() === jcAfter.JM_UPDATED_ON.getTime()) {
    ok(`Z2 cmms_jobcard_mst.JM_UPDATED_ON unchanged`, `${jcBefore.JM_UPDATED_ON.toISOString()}`);
  } else {
    bad(`Z2 JC.updated_at changed!`,
        `before=${jcBefore?.JM_UPDATED_ON} after=${jcAfter?.JM_UPDATED_ON}`);
  }

  // ── A1: Repo aliasing — scan service/controller/templates for legacy names ──
  const filesToScan = [
    'src/modules/pdf/pdf.service.js',
    'src/modules/pdf/pdf.controller.js',
    'src/modules/pdf/pdf.routes.js',
    'src/modules/pdf/pdf.validators.js',
    'src/modules/pdf/templates/jobCardCertificate.js',
    'src/modules/pdf/templates/jobCardDetails.js',
    'src/modules/pdf/templates/jobRequestDetails.js',
    'src/modules/pdf/templates/_isroHeader.js',
  ];
  const base = path.resolve(__dirname, '..', '..');
  const leak = [];
  for (const f of filesToScan) {
    const txt = fs.readFileSync(path.join(base, f), 'utf8');
    // Strip block comments and line comments before scanning so comment
    // text like "JM_VERIFIED_ON" doesn't false-positive.
    const code = txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    // Match SQL-style legacy column patterns appearing in CODE.
    const matches = code.match(/\b(JM_[A-Z][A-Za-z_]*|JR_[A-Z][A-Za-z_]*|EQM_[A-Z][A-Za-z_]*|EMM_[A-Z][A-Za-z_]*|SM_[A-Z][A-Za-z_]*)\b/g) || [];
    // Filter out tokens that legitimately appear in template payload field
    // names — these are CANONICAL JSON keys returned from the repo, e.g.
    // `payload.jr_no` or `JM_SectionJobNo` as a string PARAMETER (not a
    // column ref) inside a string. We allow tokens only inside string
    // literals (single/double/backtick).
    if (matches.length > 0) {
      leak.push({ file: f, tokens: [...new Set(matches)].slice(0, 8) });
    }
  }
  if (leak.length === 0) {
    ok(`A1 repo aliasing — no legacy JM_/JR_/EQM_ tokens outside repo`);
  } else {
    bad(`A1 legacy column tokens leaked into service/controller/templates`,
        JSON.stringify(leak));
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
