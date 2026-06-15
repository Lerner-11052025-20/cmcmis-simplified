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
// Phase 8: bust the dashboard KPI cache after equipment mutations.
const kpiCache = require('../../utils/kpiCache');
const { KEYS: KPI_KEYS } = require('../../utils/kpiCache');

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
    category: r.category || null,
    name: r.name,
    type_name: r.type_name || null,
    make: r.make || null,
    model_no: r.model_no || null,
    serial_no: r.serial_no || null,
    next_cal_due_date: r.next_cal_due_date
      ? dayjs(r.next_cal_due_date).format('YYYY-MM-DD')
      : null,
    maintenance_frequency_months: r.maintenance_frequency_months || null,
    division_code: r.division_code || null,
    location_name: r.location_name || null,
    division_abbr: r.division_abbr || null,
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

function parseCompositeId(id) {
  const raw = String(id || '').trim();
  const displayMatch = raw.match(/^EQ-([A-Z]{3})-(\d+)$/i);
  if (displayMatch) {
    const prefix = displayMatch[1].toUpperCase();
    const eqmType = prefix === 'EQU' ? 'Equipment' : prefix === 'INS' ? 'Instrument' : prefix;
    return { eqmType, eqmId: Number(displayMatch[2]) };
  }
  const match = raw.match(/^(.+)-(\d+)$/);
  if (match) {
    const prefix = match[1];
    const eqmType = prefix.toUpperCase() === 'EQU' ? 'Equipment' : prefix.toUpperCase() === 'INS' ? 'Instrument' : prefix;
    return { eqmType, eqmId: Number(match[2]) };
  }
  throw errors.badRequest('Invalid equipment id');
}

async function getEquipmentDetail(id) {
  const { eqmType, eqmId } = parseCompositeId(id);
  const row = await repo.getEquipmentByCompositeId(eqmType, eqmId);
  if (!row) throw errors.notFound('Equipment not found');
  
  const [accessories, fpeRepairHistory] = await Promise.all([
    repo.getEquipmentAccessories(eqmType, eqmId),
    repo.getFpeRepairHistory(eqmType, eqmId),
  ]);
  
  return {
    equipment_id: `${row.eqm_type}-${row.eqm_id}`,
    equipment_code: formatEquipmentCode(row.eqm_type, row.eqm_id),
    ...row,
    accessories: accessories.map(a => ({
      id: a.id,
      accessory_type: a.type,
      accessory_name: a.name,
      model_no: a.model_no,
      serial_no: a.serial_no,
      in_use: a.in_use,
      calibration_required: a.calibration_required,
      remarks: a.remarks,
    })),
    history: {
      fpe_repairs: fpeRepairHistory.map((r) => {
        const reportedDate = r.reported_date || r.created_at;
        const receivedDate = r.repair_job_received_date || r.received_date;
        const completedDate = r.repair_job_complete_date || r.completed_at;
        return {
          section_job_no: r.section_job_no,
          jc_no: r.jc_no,
          jr_no: r.job_request_no || r.jr_no,
          status: r.status,
          repair_status: r.repair_status,
          warranty_status: String(r.repair_type || '').toUpperCase() === 'WARRANTY'
            ? 'Under Warranty'
            : 'Out of Warranty',
          fault_category: r.repair_fault_category || r.repair_fault_analysis_category,
          faulty_section: r.repair_faulty_section,
          reported_date: ymd(reportedDate),
          received_date: ymd(receivedDate),
          started_date: ymd(r.repair_job_start_planned_date),
          completed_date: ymd(completedDate),
          fault_description: r.repair_fault_description,
          action_taken: r.repair_action_taken_description || r.repair_fault_analysis_action_taken,
          fault_analysis: r.repair_fault_analysis_description,
          root_cause: r.repair_fault_analysis_sections || r.repair_fault_analysis_category || r.repair_not_repairable_reason,
          spare_parts_used: r.spare_parts_used,
          repair_cost: r.total_spare_cost == null ? null : Number(r.total_spare_cost),
          reported_by: r.reported_by_name || r.reported_by_employee_id,
          repaired_by: r.repair_attended_by_name || r.repair_attended_by_employee_id,
          remarks: r.repair_remarks,
        };
      }),
    },
  };
}

function ymd(value) {
  return value ? dayjs(value).format('YYYY-MM-DD') : null;
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

  const eqmType = body.eqm_type;

  // Resolve new sections.section_id from the selected Equipment Category.
  const sectionCategory = body.job_category === 'T&ME' ? 'TME' : 'FPE';
  const sectionId = await repo.findSectionByCategory(sectionCategory);
  // sectionId may legitimately be null if `sections` is not seeded — we
  // tolerate that (the row is still valid; legacy EQM_DIVID is authoritative).

  // Compute warranty expiry from PO date + warranty months.
  let warrantyExpiry = null;
  if (body.warranty_months !== undefined && body.warranty_months > 0) {
    warrantyExpiry = dayjs(body.po_date)
      .add(body.warranty_months, 'month')
      .toDate();
  } else if (body.warranty_months === 0) {
    warrantyExpiry = null;
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

    let finalMakeId = body.make_id;
    if (!finalMakeId && body.mfg_model_name) {
      const existingId = await repo.findManufacturerByName(conn, body.mfg_model_name);
      if (existingId) {
        finalMakeId = existingId;
      } else {
        finalMakeId = await repo.insertManufacturer(conn, {
          name: body.mfg_model_name,
          employeeId: actor.employeeId,
        });
      }
    }

    await repo.insertEquipment(conn, {
      category: body.job_category,
      EQM_TYPE: eqmType,
      EQM_ID: eqmId,
      EQM_NAME: body.name,
      EQM_DIVID: body.division_id,
      EQM_INST_TYPE: body.equipment_type_id || null,
      EQM_MFRID: finalMakeId,
      EQM_MFG_MODEL_NAME: body.mfg_model_name || null,
      EQM_SRNO: body.serial_no,
      EQM_MODELNO: body.model_no || null,
      EQM_OPTIONNDESC: body.options_description || null,
      EQM_PONO: body.po_number,
      EQM_PODATE: body.po_date,
      EQM_EQIPCOST: body.cost,
      EQM_COSTCURRENCY: body.cost_currency,
      EQM_CAL_FREQ: String(body.maintenance_frequency_months),
      EQM_WRNTY_EXPIRY_DATE: warrantyExpiry,
      EQM_REMARKS: null,
      EQM_DIV_ABBR: divAbbr,
      EQM_SECTION_ID: sectionId,
      EQM_MVP_STATUS: 'PENDING_VERIFICATION',
      EQM_CREATED_BY: actor.employeeId,
      EQM_UPDATED_BY: actor.employeeId,
    });

    // Transactional persistence for equipment accessories
    if (body.accessories && body.accessories.length > 0) {
      let eiiId = 1;
      for (const acc of body.accessories) {
        await repo.insertEquipmentAccessory(conn, {
          eqm_type: eqmType,
          eqm_id: eqmId,
          eii_id: eiiId++,
          eii_type: (acc.accessory_type || '').slice(0, 50),
          eii_name: (acc.accessory_name || '').slice(0, 50),
          eii_modelno: '',
          eii_srno: (acc.serial_no || '').slice(0, 50),
        });
      }
    }

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
        other_equipment_type: body.other_equipment_type || '',
        equipment_category: body.job_category,
        eqm_type: body.eqm_type,
        maintenance_frequency_months: body.maintenance_frequency_months,
        accessories_count: body.accessories.length,
        tc_all_accepted: true,
      },
    });

    await conn.commit();

    // Phase 8: KPI cache invalidation. New equipment changes:
    //   • ORG "Calibration Due" (denominator + numerator if cal date is set)
    //   • ORG "Equipment Utilization" (denominator: ACTIVE count — though
    //     the row starts PENDING_VERIFICATION so the utilization KPI is
    //     unaffected until verification; bust anyway — TTL is 10 s and
    //     idempotent invalidate is free).
    //   • Personal "Due for Calibration" for the registrar.
    kpiCache.invalidateByPrefix(KPI_KEYS.ORG);
    kpiCache.invalidateByPrefix(KPI_KEYS.personal(actor.employeeId));

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

// ============================================================================
//                     PHASE 15  ·  BULK CALIBRATION DONE
// ============================================================================

/**
 * POST /api/v1/equipment/bulk-cal-done
 *
 * SUPER_ADMIN-only migration helper. For every equipment whose
 * EQM_CAL_DUE_DATE is in the past and whose status is not CONDEMNED or
 * RETIRED:
 *   • Sets EQM_MVP_STATUS  = 'ACTIVE'
 *   • Sets EQM_CAL_DUE_DATE = NULL  (clears the red overdue indicator)
 *
 * Runs inside a single transaction; writes one summary audit_log row
 * (not one per equipment — that would flood the log for 5 700+ rows).
 * Busts the KPI org cache after commit.
 *
 * @param {{ actor: Object, ipAddress: string, userAgent: string }} args
 * @returns {{ updated_count: number }}
 */
async function bulkMarkCalibrationDone({ actor, ipAddress, userAgent }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const updatedCount = await repo.bulkMarkCalibrationDone(conn, actor.employeeId);

    await conn.commit();

    // Bust the org KPI cache — equipment counts / statuses have changed.
    kpiCache.invalidateByPrefix(KPI_KEYS.ORG);

    return { updated_count: updatedCount };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function verifyEquipment({ id, actor }) {
  const { eqmType, eqmId } = parseCompositeId(id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const affected = await repo.verifyEquipment(conn, eqmType, eqmId, actor.employeeId);
    if (!affected) throw errors.conflict('Equipment is not pending verification or was not found');
    await conn.commit();
    kpiCache.invalidateByPrefix(KPI_KEYS.ORG);
    kpiCache.invalidateByPrefix(KPI_KEYS.PERSONAL_PREFIX);
    return { equipment_id: `${eqmType}-${eqmId}`, status: 'ACTIVE' };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function updateEquipment({ id, body, actor }) {
  const { eqmType, eqmId } = parseCompositeId(id);

  const existing = await repo.getEquipmentByCompositeId(eqmType, eqmId);
  if (!existing) throw errors.notFound('Equipment not found');
  if (existing.status !== 'PENDING_VERIFICATION') {
    throw errors.conflict('Only pending equipment registrations can be edited before verification');
  }

  const dup = await repo.findBySerialNoExcept(body.serial_no, eqmType, eqmId);
  if (dup) {
    throw errors.conflict('Serial number already registered', { field: 'serial_no' });
  }

  let warrantyExpiry = null;
  if (body.warranty_months && body.warranty_months > 0) {
    warrantyExpiry = dayjs(body.po_date)
      .add(body.warranty_months, 'month')
      .toDate();
  }

  const sectionCategory = body.job_category === 'T&ME' ? 'TME' : 'FPE';
  const sectionId = await repo.findSectionByCategory(sectionCategory);

  let divAbbr = null;
  if (body.division_id) {
    const divs = await repo.listDivisions();
    const found = divs.find((d) => d.division_id === body.division_id);
    if (found) divAbbr = (found.code || '').slice(0, 50);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const affected = await repo.updateEquipmentDetails(conn, eqmType, eqmId, {
      category: body.job_category,
      EQM_NAME: body.name,
      EQM_DIVID: body.division_id,
      EQM_INST_TYPE: body.equipment_type_id || null,
      EQM_MFRID: body.make_id || null,
      EQM_MFG_MODEL_NAME: body.mfg_model_name || null,
      EQM_SRNO: body.serial_no,
      EQM_MODELNO: body.model_no || null,
      EQM_OPTIONNDESC: body.options_description || null,
      EQM_PONO: body.po_number,
      EQM_PODATE: body.po_date,
      EQM_EQIPCOST: body.cost,
      EQM_COSTCURRENCY: body.cost_currency,
      EQM_CAL_FREQ: String(body.maintenance_frequency_months),
      EQM_WRNTY_EXPIRY_DATE: warrantyExpiry,
      EQM_DIV_ABBR: divAbbr,
      EQM_SECTION_ID: sectionId,
      EQM_UPDATED_BY: actor.employeeId,
    });
    if (!affected) throw errors.conflict('Equipment is not pending verification or was not found');
    await conn.commit();
    kpiCache.invalidateByPrefix(KPI_KEYS.ORG);
    kpiCache.invalidateByPrefix(KPI_KEYS.PERSONAL_PREFIX);
    return getEquipmentDetail(id);
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteEquipment({ id, actor }) {
  const { eqmType, eqmId } = parseCompositeId(id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await repo.deleteEquipmentAccessories(conn, eqmType, eqmId);

    const affected = await repo.deleteEquipment(conn, eqmType, eqmId);
    if (!affected) {
      throw errors.notFound('Equipment not found or already deleted');
    }

    await conn.commit();
    kpiCache.invalidateByPrefix(KPI_KEYS.ORG);
    kpiCache.invalidateByPrefix(KPI_KEYS.PERSONAL_PREFIX);

    return { equipment_id: `${eqmType}-${eqmId}`, deleted: true };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function listProjects() {
  return repo.listProjects();
}

const { renderEquipmentListPdf } = require('../pdf/templates/equipmentList');

async function prepareEquipmentPdfExport({ startId, endId, actor }) {
  const rows = await repo.getEquipmentForExport(startId, endId);

  const items = rows.map((r) => ({
    code: formatEquipmentCode(r.eqm_type, r.eqm_id),
    name: r.name,
    model_no: r.model_no || '—',
    make: r.make || '—',
    serial_no: r.serial_no || '—',
    status: r.status,
    division_abbr: r.division_abbr || '—',
  }));

  const rangeText = `${startId} to ${endId}`;
  const filename = `equipment_inventory_${startId}_to_${endId}.pdf`;

  const requester = {
    name: actor.name || actor.fullName || '',
    employeeId: actor.employeeId || actor.employee_id || '',
    role: actor.role || '',
  };

  return {
    filename,
    render: async (stream) => {
      await renderEquipmentListPdf({
        rows: items,
        requester,
        rangeText,
      }, stream);
    },
  };
}

module.exports = {
  listEquipment,
  listTypes,
  listMakes,
  listDivisions,
  listProjects,
  getEquipmentDetail,
  createEquipment,
  formatEquipmentCode,
  deleteEquipment,
  // Phase 15 addition:
  bulkMarkCalibrationDone,
  verifyEquipment,
  updateEquipment,
  prepareEquipmentPdfExport,
};
