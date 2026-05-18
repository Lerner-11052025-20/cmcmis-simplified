// ============================================================================
// src/modules/lookups/lookups.repo.js  —  DAL for FE-dropdown lookups
// ----------------------------------------------------------------------------
// Helper read-only queries used by the FE form to populate dropdowns +
// typeahead. Each query is narrow, indexed, and LIMITed to a sensible
// cap so a stray request can't pull the entire master.
// ============================================================================

'use strict';

const pool = require('../../config/db');

/**
 * Divisions (sections-master) — Division dropdown on the JR form.
 * Source: cmms_section_mst (legacy). See SCHEMA_PHASE6.md decision P6-D11.
 */
async function listDivisions() {
  const [rows] = await pool.query(
    `SELECT SM_ID AS id, SM_SHORTNAME AS code, SM_NAME AS name
       FROM cmms_section_mst
      WHERE SM_STATE = 1
      ORDER BY SM_SHORTNAME ASC
      LIMIT 2000`,
  );
  return rows;
}

/**
 * Equipment typeahead — feeds the "Equipment ID" search on the JR form.
 * The "id" field returned is the canonical composite string used as URL
 * slug + React key everywhere downstream.
 */
async function searchEquipment(q, limit = 20) {
  // Empty q? Return an empty list — the FE should not call this without a
  // query, but defending against the empty-string case avoids a full scan.
  if (!q || !String(q).trim()) return [];
  const like = `%${q}%`;
  const cap = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const [rows] = await pool.query(
    `SELECT
       e.EQM_TYPE                            AS eqm_type,
       e.EQM_ID                              AS eqm_id,
       e.EQM_NAME                            AS name,
       m.CMM_CONT_NAME                       AS make,
       e.EQM_MODELNO                         AS model_no,
       e.EQM_SRNO                            AS serial_no,
       p.PROD_NAME                           AS type_name
     FROM cmms_eqip_mst e
     LEFT JOIN cmms_cont_mst    m ON m.CMM_CONT_ID = e.EQM_MFRID
     LEFT JOIN cmms_product_mst p ON p.PROD_ID     = e.EQM_INST_TYPE
     WHERE e.EQM_NAME    LIKE ?
        OR e.EQM_MODELNO LIKE ?
        OR e.EQM_SRNO    LIKE ?
     ORDER BY e.EQM_NAME ASC, e.EQM_ID ASC
     LIMIT ?`,
    [like, like, like, cap],
  );

  return rows.map((r) => ({
    id:               `${r.eqm_type}-${r.eqm_id}`,
    eqm_type:         r.eqm_type,
    eqm_id:           r.eqm_id,
    name:             r.name,
    make:             r.make || null,
    model_no:         r.model_no || null,
    serial_no:        r.serial_no || null,
    type:             r.type_name || null,
  }));
}

module.exports = { listDivisions, searchEquipment };
