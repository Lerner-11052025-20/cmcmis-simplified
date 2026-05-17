// ============================================================================
// src/modules/equipment/equipment.service.js  —  Business logic
// ----------------------------------------------------------------------------
// Two service functions:
//   • listEquipment({ params })            — pagination + filter + sort
//   • createEquipment({ body, actor })     — transactional insert + audit
//
// PHASE-5 K.6 SCOPE:
//   • No DDL. We write to existing cmms_eqip_mst columns.
//   • Form fields without a column home (MIVR, lab phone, complaint, T&Cs,
//     accessories) are persisted to audit_log.notes as JSON.
//   • Full JR persistence ships Phase 6.
//
// SECURITY:
//   • createEquipment IGNORES any submitter_* in the body and uses
//     req.user.employeeId for EQM_CREATED_BY / EQM_UPDATED_BY / audit.
//   • Serial-number uniqueness enforced in code (no DB UNIQUE on EQM_SRNO).
//   • Transactional: nextEqmIdForType + insertEquipment + writeAuditLog
//     all run on one pooled connection inside BEGIN / COMMIT.
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const pool = require('../../config/db');
const repo = require('./equipment.repo');
const { errors } = require('../../middleware/errorHandler');
const { JOB_CATEGORY_TO_EQM_TYPE } = require('./equipment.validators');

// ────────────────────────────────────────────────────────────────────────
//  LIST
// ────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} params  Already-validated query schema output.
 * @returns {Promise<{ items: object[], pagination: object }>}
 */
async function listEquipment(params) {
  const { rows, total } = await repo.listEquipment(params);

  // Shape rows for the FE. Composite PK becomes a string id "Type-N"
  // (used as React key + future URL slug); equipment_code is a computed
  // display string per K.6 Q4.
  const items = rows.map((r) => ({
    equipment_id: `${r.eqm_type}-${r.eqm_id}`,
    equipment_code: formatEquipmentCode(r.eqm_type, r.eqm_id),
    eqm_type: r.eqm_type,
    eqm_id: r.eqm_id,
    name: r.name,
    type_name: r.type_name || null,
    make: r.make || null,
    model_no: r.model_no || null,
    serial_no: r.serial_no || null,
    next_cal_due_date: r.next_cal_due_date
      ? dayjs(r.next_cal_due_date).format('YYYY-MM-DD')
      : null,
    division_code: r.division_code || null,
    location_name: r.location_name || null,
    status: r.status,
  }));

  const totalPages = Math.max(1, Math.ceil(total / params.page_size));

  return {
    items,
    pagination: {
      page: params.page,
      page_size: params.page_size,
      total_items: total,
      total_pages: totalPages,
    },
  };
}

/**
 * EQ-<3-letter-type>-<padded-id>  → "EQ-INS-0001" / "EQ-EQU-0001"
 * Reference image shows "EQ-SA-9000" style codes, but the seeded data
 * has no such column — this is the Phase-5 K.6 computed-display path.
 */
function formatEquipmentCode(eqmType, eqmId) {
  const prefix = (eqmType || 'EQ').slice(0, 3).toUpperCase();
  return `EQ-${prefix}-${String(eqmId).padStart(4, '0')}`;
}

// ────────────────────────────────────────────────────────────────────────
//  HELPERS (for FE dropdowns)
// ────────────────────────────────────────────────────────────────────────
async function listTypes() {
  const rows = await repo.listEquipmentTypes();
  return rows.map((r) => ({ type_id: r.type_id, name: r.name }));
}

async function listMakes() {
  const rows = await repo.listMakes();
  return rows.map((r) => ({ make_id: r.make_id, name: r.name }));
}

async function listDivisions() {
  const rows = await repo.listDivisions();
  return rows.map((r) => ({ division_id: r.division_id, code: r.code, name: r.name }));
}

// ────────────────────────────────────────────────────────────────────────
//  CREATE — transactional
// ────────────────────────────────────────────────────────────────────────
/**
 * @param {Object} args
 * @param {Object} args.body   Validated body (createEquipmentSchema)
 * @param {Object} args.actor  { employeeId, role, userId }
 * @param {string} args.ipAddress
 * @param {string} args.userAgent
 */
async function createEquipment({ body, actor, ipAddress, userAgent }) {
  // BR-EQP-01 — serial number must be unique system-wide.
  // The DB column has no UNIQUE constraint, so we enforce here.
  const dup = await repo.findBySerialNo(body.serial_no);
  if (dup) {
    throw errors.conflict('Serial number already registered', { field: 'serial_no' });
  }

  // Resolve EQM_TYPE from Job Category (T&ME → Instrument, F&PE → Equipment).
  const eqmType = JOB_CATEGORY_TO_EQM_TYPE[body.job_category];
  if (!eqmType) {
    // Should never reach here — zod enum guarantees it. Defensive only.
    throw errors.badRequest('Unknown job_category');
  }

  // Resolve new sections.section_id from Job Category equipment_category.
  const sectionCategory = body.job_category === 'T&ME' ? 'TME' : 'FPE';
  const sectionId = await repo.findSectionByCategory(sectionCategory);
  // sectionId may legitimately be null if `sections` is not seeded — we
  // tolerate that (the row is still valid; legacy EQM_DIVID is authoritative).

  // Compute warranty expiry from PO date + warranty months.
  let warrantyExpiry = null;
  if (body.warranty_months && body.warranty_months > 0) {
    warrantyExpiry = dayjs(body.po_date)
      .add(body.warranty_months, 'month')
      .toDate();
  }

  // Resolve a placeholder EQM_DIV_ABBR if we can — use first 4 chars of
  // the division's SM_SHORTNAME. The full denormalised cache is filled
  // by a downstream PM job in Phase 8.
  let divAbbr = null;
  if (body.division_id) {
    const divs = await repo.listDivisions();
    const found = divs.find((d) => d.division_id === body.division_id);
    if (found) divAbbr = (found.code || '').slice(0, 50);
  }

  // ── Transaction ─────────────────────────────────────────────────────
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const eqmId = await repo.nextEqmIdForType(conn, eqmType);

    await repo.insertEquipment(conn, {
      EQM_TYPE: eqmType,
      EQM_ID: eqmId,
      EQM_NAME: body.name,
      EQM_DIVID: body.division_id,
      EQM_INST_TYPE: body.equipment_type_id || null,
      EQM_MFRID: body.make_id,
      EQM_MFG_MODEL_NAME: body.mfg_model_name || null,
      EQM_SRNO: body.serial_no,
      EQM_MODELNO: body.model_no || null,
      EQM_OPTIONNDESC: body.options_description || null,
      EQM_PONO: body.po_number,
      EQM_PODATE: body.po_date,
      EQM_EQIPCOST: body.cost,
      EQM_COSTCURRENCY: body.cost_currency,
      EQM_WRNTY_EXPIRY_DATE: warrantyExpiry,
      EQM_REMARKS: body.remarks || null,
      EQM_DIV_ABBR: divAbbr,
      EQM_SECTION_ID: sectionId,
      EQM_MVP_STATUS: 'PENDING_VERIFICATION',
      EQM_CREATED_BY: actor.employeeId,
      EQM_UPDATED_BY: actor.employeeId,
    });

    // Phase-6 park: everything the cmms_eqip_mst schema can't hold lives
    // in the audit row's `notes` JSON for traceability.
    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode: actor.role,
      eqmType,
      eqmId,
      ipAddress,
      userAgent,
      details: {
        mivr_number: body.mivr_number,
        mivr_date: body.mivr_date,
        line_item_code: body.line_item_code,
        lab_phone: body.lab_phone || '',
        room_phone: body.room_phone || '',
        subsystem: body.subsystem || '',
        project: body.project || '',
        complaint_description: body.complaint_description,
        accessories_count: body.accessories.length,
        tc_all_accepted: true,
      },
    });

    await conn.commit();

    return {
      equipment_id: `${eqmType}-${eqmId}`,
      equipment_code: formatEquipmentCode(eqmType, eqmId),
      eqm_type: eqmType,
      eqm_id: eqmId,
      status: 'PENDING_VERIFICATION',
    };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore secondary fault */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  listEquipment,
  listTypes,
  listMakes,
  listDivisions,
  createEquipment,
  formatEquipmentCode,
};
