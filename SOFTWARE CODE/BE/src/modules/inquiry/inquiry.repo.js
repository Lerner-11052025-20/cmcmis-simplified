// ============================================================================
// src/modules/inquiry/inquiry.repo.js  —  Four global search queries
// ----------------------------------------------------------------------------
// Per Doctrine 2 + 3: the ONLY file in the inquiry module that knows about
// real DB column names. Every function exposes a canonical row shape via
// `SELECT real_col AS canonical_col`.
//
// SEARCH STRATEGY (P8-D11):
//
//   q.length === 0
//     → no WHERE filter (just paginate the table by primary key DESC)
//
//   q.length < 3
//     → prefix LIKE 'q%' on the entity's primary CODE column only
//        (CMM_CONT_NAME, PROD_NAME, JM_SectionJobNo, EQM_NAME).
//        Cheap — uses existing single-column indexes.
//
//   q.length >= 3
//     → MATCH (...) AGAINST (? IN NATURAL LANGUAGE MODE) on the relevant
//        FULLTEXT index created by migration 121. Returns rows ordered
//        by RELEVANCE first, then primary key (deterministic tie-break).
//
//   Where the entity has no FULLTEXT (e.g. cmms_jobcard_mst) we compose
//   instead: prefix LIKE on the job ID + LEFT JOIN to cmms_eqip_mst with
//   its FULLTEXT index.
//
// SQL INJECTION
//   Every user-bound value is bound via `?` placeholder. The mysql2
//   driver escapes per type; column names are NEVER interpolated.
// ============================================================================

'use strict';

const pool = require('../../config/db');

// Centralised constant — also used by the service to gate `q.length < 3`
// from `q.length >= 3` so the two layers agree.
const FT_MIN_CHARS = 3;

// Allow-list — DB collation rule says column names in our LIKE escape
// helper. We treat the search term as raw text inside `?` binding; the
// % wrappers are applied in JS to avoid double-binding gotchas.
function buildLikePrefix(q) {
  // MySQL LIKE wildcards: % and _ need escaping if the user typed them.
  // We're permissive on what we accept (zod regex allows _ and .), so
  // escape both to keep "EQ_001" from acting as a single-char wildcard.
  return q.replace(/[%_\\]/g, '\\$&') + '%';
}
function buildLikeContains(q) {
  return '%' + q.replace(/[%_\\]/g, '\\$&') + '%';
}

/**
 * Convert a free-text user query into a safe BOOLEAN-mode FULLTEXT
 * expression with prefix wildcards on each word.
 *
 * RATIONALE
 *   MATCH … AGAINST (… IN NATURAL LANGUAGE MODE) only matches WHOLE
 *   words ("oscill" → 0 hits because the indexed tokens are
 *   "oscilloscope" / "oscillator"). UX expectation (per mock-up) is that
 *   typing "oscill" surfaces oscilloscopes. BOOLEAN mode with a trailing
 *   `*` on every term gives MySQL its prefix-match behaviour AND keeps
 *   the index hot.
 *
 * SAFETY
 *   We strip every BOOLEAN-mode operator (+ - < > ( ) ~ " * @ %) from
 *   user input before reassembling, so a malicious or accidental
 *   `+oscill -repair (foo)` becomes `oscill repair foo` then
 *   `oscill* repair* foo*`. The mysql2 driver still binds the result
 *   as a bound parameter (no SQL injection surface).
 *
 * @param {string} q  Raw user input (already trim+regex'd by zod)
 * @returns {string}  Safe BOOLEAN-mode pattern
 */
function buildBooleanFtPattern(q) {
  // Whitelist letters, digits, spaces, hyphens-within-words, and dots.
  // Everything else becomes a space (effectively splitting tokens).
  const cleaned = q.replace(/[^\p{L}\p{N}\-.]+/gu, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .filter((tok) => tok.length >= 2) // FT default minToken is 3; we trim noise
    .map((tok) => `${tok}*`)
    .join(' ');
}

// ────────────────────────────────────────────────────────────────────
//  VENDOR TAB  — cmms_cont_mst
// ────────────────────────────────────────────────────────────────────
/**
 * @param {{ q: string, type?: 'MANUFACTURER'|'SUPPLIER', page: number, page_size: number }} params
 */
async function searchVendors({ q, type, page, page_size }) {
  const where = [];
  const args = [];

  // Type filter: canonical → legacy enum families (P8-D7).
  // MANUFACTURER groups MFR + OEM + BOTH; SUPPLIER groups VENDOR + BOTH.
  if (type === 'MANUFACTURER') {
    where.push("CMM_CONT_TYPE IN ('MFR','OEM','BOTH')");
  } else if (type === 'SUPPLIER') {
    where.push("CMM_CONT_TYPE IN ('VENDOR','BOTH')");
  }
  // Only show active vendors by default — matches existing list endpoints.
  where.push('CMM_CONT_STATE_FLAG = 1');

  let orderBy = 'CMM_CONT_ID ASC';
  let selectExtra = '';

  // Build the FULLTEXT pattern lazily — we may fall back to LIKE if the
  // user's query reduces to fewer than FT_MIN_CHARS of significant text.
  let ftPattern = null;
  if (q && q.length >= FT_MIN_CHARS) {
    ftPattern = buildBooleanFtPattern(q);
  }

  if (ftPattern) {
    where.push('MATCH (CMM_CONT_NAME, CMM_CONT_CONTACT_PERSON, CMM_CONT_EMAIL) AGAINST (? IN BOOLEAN MODE)');
    args.push(ftPattern);
    selectExtra = ', MATCH (CMM_CONT_NAME, CMM_CONT_CONTACT_PERSON, CMM_CONT_EMAIL) AGAINST (? IN BOOLEAN MODE) AS _score';
    // Note: MySQL requires the same MATCH expression repeated for SELECT
    // score column. The arg list grows by 1 — we bind it just before SELECT.
    orderBy = '_score DESC, CMM_CONT_ID ASC';
  } else if (q && q.length > 0) {
    // Short query OR FT pattern collapsed to empty — prefix LIKE on name only.
    where.push('CMM_CONT_NAME LIKE ?');
    args.push(buildLikePrefix(q));
    orderBy = 'CMM_CONT_NAME ASC, CMM_CONT_ID ASC';
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * page_size;

  // Data query — the MATCH score is included only if we hit the FULLTEXT branch.
  const dataArgs = ftPattern
    ? [ftPattern, ...args, page_size, offset]   // first ? = SELECT score, rest = WHERE
    : [...args, page_size, offset];

  const dataSql = `
    SELECT
      CMM_CONT_ID                                                AS id,
      CONCAT('V-', LPAD(CMM_CONT_ID, 3, '0'))                    AS vendor_code,
      CMM_CONT_NAME                                              AS name,
      CASE CMM_CONT_TYPE
        WHEN 'MFR'    THEN 'Manufacturer'
        WHEN 'OEM'    THEN 'Manufacturer'
        WHEN 'BOTH'   THEN 'Manufacturer'
        WHEN 'VENDOR' THEN 'Supplier'
        ELSE CMM_CONT_TYPE
      END                                                        AS type,
      CMM_CONT_CONTACT_PERSON                                    AS contact_person,
      COALESCE(CMM_CONT_MOBILE, CMM_CONT_PHONE, '')              AS contact,
      CMM_CONT_EMAIL                                             AS email,
      TRIM(CONCAT_WS(', ',
        NULLIF(CMM_CONT_CITY, ''),
        NULLIF(CMM_CONT_STATE, '')
      ))                                                         AS address
      ${selectExtra}
    FROM cmms_cont_mst
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
    FROM cmms_cont_mst
    ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, dataArgs),
    pool.query(countSql, args),
  ]);

  return { rows, total: countRows[0].n };
}

// ────────────────────────────────────────────────────────────────────
//  PRODUCT TAB  — cmms_product_mst (+ derived columns)
// ────────────────────────────────────────────────────────────────────
/**
 * @param {{ q: string, page: number, page_size: number }} params
 */
async function searchProducts({ q, page, page_size }) {
  const where = [];
  const args = [];

  // Active flag — PROD_STATE in legacy DB. Per Phase 3 review, value 1
  // = active. We default to active-only to match the UI mock-up (which
  // implies "current" products only).
  // Skipped here to match the data — the dev DB has all rows PROD_STATE=0
  // so a filter would return zero results. P8-D8 lock: show all rows.

  let selectExtra = '';
  let orderBy = 'PROD_ID ASC';

  let ftPattern = null;
  if (q && q.length >= FT_MIN_CHARS) ftPattern = buildBooleanFtPattern(q);

  if (ftPattern) {
    where.push('MATCH (PROD_NAME, PROD_DESC) AGAINST (? IN BOOLEAN MODE)');
    args.push(ftPattern);
    selectExtra = ', MATCH (PROD_NAME, PROD_DESC) AGAINST (? IN BOOLEAN MODE) AS _score';
    orderBy = '_score DESC, PROD_ID ASC';
  } else if (q && q.length > 0) {
    where.push('PROD_NAME LIKE ?');
    args.push(buildLikePrefix(q));
    orderBy = 'PROD_NAME ASC, PROD_ID ASC';
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * page_size;

  const dataArgs = ftPattern
    ? [ftPattern, ...args, page_size, offset]
    : [...args, page_size, offset];

  // Derived columns (P8-D8):
  //   equipment_count  = COUNT of rows in cmms_eqip_mst pointing at this PROD_ID
  //   top_manufacturer = name of the most-frequent CMM_CONT_NAME via that join
  // Correlated subqueries — cheap because cmms_product_mst has only 32 rows
  // and cmms_eqip_mst.EQM_INST_TYPE is FK-indexed.
  const dataSql = `
    SELECT
      p.PROD_ID                                       AS id,
      CONCAT('P-', LPAD(p.PROD_ID, 3, '0'))           AS product_code,
      p.PROD_NAME                                     AS name,
      p.PROD_DESC                                     AS description,
      (
        SELECT COUNT(*)
          FROM cmms_eqip_mst e
         WHERE e.EQM_INST_TYPE = p.PROD_ID
      )                                               AS equipment_count,
      (
        SELECT c.CMM_CONT_NAME
          FROM cmms_eqip_mst e
          JOIN cmms_cont_mst c ON c.CMM_CONT_ID = e.EQM_MFRID
         WHERE e.EQM_INST_TYPE = p.PROD_ID
         GROUP BY c.CMM_CONT_ID, c.CMM_CONT_NAME
         ORDER BY COUNT(*) DESC, c.CMM_CONT_NAME ASC
         LIMIT 1
      )                                               AS top_manufacturer
      ${selectExtra}
    FROM cmms_product_mst p
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
      FROM cmms_product_mst p
      ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, dataArgs),
    pool.query(countSql, args),
  ]);

  return { rows, total: countRows[0].n };
}

// ────────────────────────────────────────────────────────────────────
//  JOB-CARD TAB  — cmms_jobcard_mst JOIN cmms_eqip_mst
// ────────────────────────────────────────────────────────────────────
/**
 * @param {{ q: string, page: number, page_size: number }} params
 */
async function searchJobCards({ q, page, page_size }) {
  const where = [];
  const args = [];
  let orderBy = 'jc.JM_JCRecdDate DESC, jc.JM_SectionJobNo DESC';

  let ftPattern = null;
  if (q && q.length >= FT_MIN_CHARS) ftPattern = buildBooleanFtPattern(q);

  if (ftPattern) {
    // Two-pronged: equipment FULLTEXT (BOOLEAN prefix) OR job-code prefix.
    where.push(`(
      MATCH (eq.EQM_NAME, eq.EQM_MODELNO, eq.EQM_SRNO) AGAINST (? IN BOOLEAN MODE)
      OR jc.JM_SectionJobNo LIKE ?
    )`);
    args.push(ftPattern, buildLikePrefix(q));
  } else if (q && q.length > 0) {
    // Short query — prefix on job code OR equipment name.
    where.push('(jc.JM_SectionJobNo LIKE ? OR eq.EQM_NAME LIKE ?)');
    args.push(buildLikePrefix(q), buildLikePrefix(q));
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * page_size;

  // Join is LEFT — show JCs even when the linked equipment row is missing
  // (data quality varies in the 19k legacy rows).
  const dataSql = `
    SELECT
      jc.JM_SectionJobNo                          AS id,
      jc.JM_SectionJobNo                          AS job_code,
      jc.JM_EQM_TYPE                              AS eqm_type,
      jc.JM_EQM_ID                                AS eqm_id,
      eq.EQM_NAME                                 AS equipment_name,
      jc.JM_MVP_STATUS                            AS status,
      jc.JM_AttendedBy                            AS assigned_engineer,
      jc.JM_JCRecdDate                            AS received_at,
      jc.JM_JobEndDate                            AS completed_at,
      jc.JM_VERIFIED_ON                           AS verified_at
    FROM cmms_jobcard_mst jc
    LEFT JOIN cmms_eqip_mst eq
      ON eq.EQM_TYPE = jc.JM_EQM_TYPE AND eq.EQM_ID = jc.JM_EQM_ID
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
    FROM cmms_jobcard_mst jc
    LEFT JOIN cmms_eqip_mst eq
      ON eq.EQM_TYPE = jc.JM_EQM_TYPE AND eq.EQM_ID = jc.JM_EQM_ID
    ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, page_size, offset]),
    pool.query(countSql, args),
  ]);

  return { rows, total: countRows[0].n };
}

// ────────────────────────────────────────────────────────────────────
//  INSTRUMENT TAB  — cmms_eqip_mst JOIN cmms_section_mst
// ────────────────────────────────────────────────────────────────────
/**
 * @param {{ q: string, page: number, page_size: number }} params
 */
async function searchInstruments({ q, page, page_size }) {
  const where = [];
  const args = [];
  let orderBy = 'e.EQM_TYPE ASC, e.EQM_ID ASC';
  let selectExtra = '';

  let ftPattern = null;
  if (q && q.length >= FT_MIN_CHARS) ftPattern = buildBooleanFtPattern(q);

  if (ftPattern) {
    // Composite ID lookup: "EQ-TIME-123" or just "123" should also match
    // the primary key. We accept FULLTEXT (BOOLEAN prefix) OR equip-ID-equals.
    where.push(`(
      MATCH (e.EQM_NAME, e.EQM_MODELNO, e.EQM_SRNO) AGAINST (? IN BOOLEAN MODE)
      OR CAST(e.EQM_ID AS CHAR) LIKE ?
    )`);
    args.push(ftPattern, buildLikePrefix(q));
    selectExtra = ', MATCH (e.EQM_NAME, e.EQM_MODELNO, e.EQM_SRNO) AGAINST (? IN BOOLEAN MODE) AS _score';
    orderBy = '_score DESC, e.EQM_TYPE ASC, e.EQM_ID ASC';
  } else if (q && q.length > 0) {
    where.push('(e.EQM_NAME LIKE ? OR CAST(e.EQM_ID AS CHAR) LIKE ?)');
    args.push(buildLikePrefix(q), buildLikePrefix(q));
    orderBy = 'e.EQM_NAME ASC, e.EQM_TYPE ASC, e.EQM_ID ASC';
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * page_size;

  // mysql2 binds `?` placeholders in textual order. The final SQL is:
  //   SELECT … , MATCH(…) AGAINST(?)     ← arg #1: ftPattern (score)
  //   FROM   …
  //   WHERE  ( MATCH(…) AGAINST(?)        ← arg #2: ftPattern (filter)
  //            OR CAST(e.EQM_ID AS CHAR) LIKE ?  ← arg #3: prefixed_q
  //          )
  //   ORDER BY _score DESC, …
  //   LIMIT ? OFFSET ?                    ← args #4, #5
  // So the bind order is: [ftPattern, ftPattern, prefixed_q, page_size, offset].
  const dataArgs = ftPattern
    ? [ftPattern, ...args, page_size, offset]
    : [...args, page_size, offset];

  const dataSql = `
    SELECT
      CONCAT('EQ-', e.EQM_TYPE, '-', e.EQM_ID)                AS id,
      CONCAT('EQ-', e.EQM_TYPE, '-', e.EQM_ID)                AS equipment_code,
      e.EQM_TYPE                                              AS eqm_type,
      e.EQM_ID                                                AS eqm_id,
      e.EQM_NAME                                              AS name,
      e.EQM_MODELNO                                           AS model_no,
      e.EQM_SRNO                                              AS serial_no,
      COALESCE(s.SM_SHORTNAME, e.EQM_DIV_ABBR, '')            AS division_code,
      COALESCE(s.SM_NAME, '')                                 AS location_name,
      e.EQM_MVP_STATUS                                        AS status,
      e.EQM_CAL_DUE_DATE                                      AS next_cal_due_date,
      -- "Last calibration" = most recent JM_VERIFIED_ON for this equipment
      (
        SELECT MAX(jc.JM_VERIFIED_ON)
          FROM cmms_jobcard_mst jc
         WHERE jc.JM_EQM_TYPE = e.EQM_TYPE
           AND jc.JM_EQM_ID   = e.EQM_ID
           AND jc.JM_MVP_STATUS = 'VERIFIED_CLOSED'
      )                                                       AS last_cal_date
      ${selectExtra}
    FROM cmms_eqip_mst e
    LEFT JOIN cmms_section_mst s ON s.SM_ID = e.EQM_DIVID
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  const countSql = `
    SELECT COUNT(*) AS n
    FROM cmms_eqip_mst e
    ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, dataArgs),
    pool.query(countSql, args),
  ]);

  return { rows, total: countRows[0].n };
}

module.exports = {
  FT_MIN_CHARS,
  searchVendors,
  searchProducts,
  searchJobCards,
  searchInstruments,
};
