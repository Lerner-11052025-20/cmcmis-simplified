'use strict';

const repo = require('./masterDataCorrections.repo');
const { errors, AppError } = require('../../middleware/errorHandler');

function normalizeDivisionCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .split('-')
    .map((part) => part.trim().replace(/\s+/g, ''))
    .filter(Boolean)
    .join('-');
}

function reverseDivisionCode(value) {
  const normalized = normalizeDivisionCode(value);
  return normalized.split('-').filter(Boolean).reverse().join('-');
}

function isDivisionMatch(ssoEgdName, equipmentDivisionCode) {
  const sso = normalizeDivisionCode(ssoEgdName);
  const equipment = normalizeDivisionCode(equipmentDivisionCode);
  if (!sso || !equipment) return false;
  return sso === equipment || sso === reverseDivisionCode(equipment);
}

function divisionMismatchError({ ssoProfile, equipment }) {
  return new AppError(
    'DIVISION_MISMATCH',
    'Your division and equipment division are mismatched. Please call or email TIMCD, then raise a master data correction request.',
    409,
    {
      sso_employee_id: ssoProfile.employee_id,
      sso_egd_name: ssoProfile.egd_name || null,
      equipment: {
        eqm_type: equipment.eqm_type,
        eqm_id: equipment.eqm_id,
        equipment_name: equipment.equipment_name,
        division_id: equipment.current_division_id,
        division_code: equipment.current_division_code,
        division_name: equipment.current_division_name,
      },
    },
  );
}

async function assertSsoEquipmentDivisionAllowed({ actor, body }) {
  if (actor.authSource !== 'SSO') return null;
  if (!body.equipment_id) return null;

  const ssoProfile = await repo.findSsoEmployee(actor.employeeId);
  if (!ssoProfile) throw errors.unauthorized('SSO employee is no longer active');

  const equipment = await repo.findEquipment(body.equipment_master_type || body.equipment_type, body.equipment_id);
  if (!equipment) {
    throw errors.badRequest('Selected equipment was not found in equipment master', {
      field: 'equipment_id',
    });
  }

  if (!isDivisionMatch(ssoProfile.egd_name, equipment.current_division_code)) {
    throw divisionMismatchError({ ssoProfile, equipment });
  }

  return { ssoProfile, equipment };
}

async function getContext({ actor, query }) {
  if (actor.authSource !== 'SSO') {
    throw errors.forbidden('Master data correction submission is available for SSO users only');
  }

  const [ssoProfile, equipment, heads] = await Promise.all([
    repo.findSsoEmployee(actor.employeeId),
    repo.findEquipment(query.eqm_type, query.eqm_id),
    repo.listHeadsForEmployee(actor.employeeId),
  ]);

  if (!ssoProfile) throw errors.unauthorized('SSO employee is no longer active');
  if (!equipment) throw errors.notFound('Equipment not found');

  return { submitter: ssoProfile, equipment, heads };
}

async function snapshotHead(employeeId) {
  const row = await repo.findHeadEmployee(employeeId);
  return {
    employee_id: row?.employee_id || employeeId || null,
    name: row?.full_name || null,
    designation: row?.designation || null,
  };
}

async function createRequest({ body, actor, ipAddress, userAgent }) {
  if (actor.authSource !== 'SSO') {
    throw errors.forbidden('Master data correction submission is available for SSO users only');
  }

  const [ssoProfile, equipment, proposedDivision] = await Promise.all([
    repo.findSsoEmployee(actor.employeeId),
    repo.findEquipment(body.eqm_type, body.eqm_id),
    repo.findDivision(body.proposed_division_id),
  ]);

  if (!ssoProfile) throw errors.unauthorized('SSO employee is no longer active');
  if (!equipment) throw errors.notFound('Equipment not found');
  if (!proposedDivision) throw errors.badRequest('Proposed division was not found', { field: 'proposed_division_id' });

  const [sec, divh, group, entity, centre] = await Promise.all([
    snapshotHead(body.sec_head_employee_id),
    snapshotHead(body.div_head_employee_id),
    snapshotHead(body.group_head_employee_id),
    snapshotHead(body.entity_head_employee_id),
    snapshotHead(body.centre_head_employee_id),
  ]);

  const conn = await repo.pool.getConnection();
  try {
    await conn.beginTransaction();
    const requestId = await repo.insertRequest(conn, {
      eqm_type: equipment.eqm_type,
      eqm_id: equipment.eqm_id,
      equipment_name: equipment.equipment_name,
      current_division_id: equipment.current_division_id,
      current_division_code: equipment.current_division_code,
      current_division_name: equipment.current_division_name,
      proposed_division_id: proposedDivision.id,
      proposed_division_code: proposedDivision.code,
      proposed_division_name: proposedDivision.name,
      submitted_by_employee_id: ssoProfile.employee_id,
      submitted_by_name: ssoProfile.full_name || ssoProfile.employee_id,
      submitted_by_designation: ssoProfile.designation || null,
      submitted_by_email: ssoProfile.email || null,
      submitted_by_lab_phone: body.lab_phone || ssoProfile.lab_telephone || null,
      submitted_by_room_phone: body.room_phone || ssoProfile.telephone || null,
      submitted_by_egd_name: ssoProfile.egd_name || null,
      submitted_by_subsystem: body.subsystem || null,
      sec_head_employee_id: sec.employee_id,
      sec_head_name: sec.name,
      sec_head_designation: sec.designation,
      div_head_employee_id: divh.employee_id,
      div_head_name: divh.name,
      div_head_designation: divh.designation,
      group_head_employee_id: group.employee_id,
      group_head_name: group.name,
      group_head_designation: group.designation,
      entity_head_employee_id: entity.employee_id,
      entity_head_name: entity.name,
      entity_head_designation: entity.designation,
      centre_head_employee_id: centre.employee_id,
      centre_head_name: centre.name,
      centre_head_designation: centre.designation,
      reason: body.reason,
      raw_payload: body,
    });

    await repo.writeAuditLog(conn, {
      actor,
      action: 'MDC_CREATE',
      requestId,
      ipAddress,
      userAgent,
      details: {
        eqm_type: equipment.eqm_type,
        eqm_id: equipment.eqm_id,
        current_division_code: equipment.current_division_code,
        proposed_division_code: proposedDivision.code,
      },
    });

    await conn.commit();
    return { request_id: requestId, status: 'SUBMITTED' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function listRequests(params) {
  const { rows, total } = await repo.listRequests(params);
  return {
    items: rows,
    pagination: {
      page: params.page,
      page_size: params.page_size,
      total_items: total,
      total_pages: Math.max(1, Math.ceil(total / params.page_size)),
    },
  };
}

async function approveRequest({ requestId, body, actor, ipAddress, userAgent }) {
  const conn = await repo.pool.getConnection();
  try {
    await conn.beginTransaction();
    const row = await repo.findRequestForUpdate(conn, requestId);
    if (!row) throw errors.notFound('Master data correction request not found');
    if (row.status !== 'SUBMITTED') throw errors.conflict('Only submitted requests can be approved');

    await repo.updateEquipmentDivision(conn, row, actor);
    await repo.markApproved(conn, requestId, actor, body.notes || null);
    await repo.writeAuditLog(conn, {
      actor,
      action: 'MDC_APPROVE',
      requestId,
      ipAddress,
      userAgent,
      details: {
        eqm_type: row.eqm_type,
        eqm_id: row.eqm_id,
        current_division_code: row.current_division_code,
        proposed_division_code: row.proposed_division_code,
      },
    });
    await conn.commit();
    return { request_id: requestId, status: 'APPROVED' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function rejectRequest({ requestId, body, actor, ipAddress, userAgent }) {
  const conn = await repo.pool.getConnection();
  try {
    await conn.beginTransaction();
    const row = await repo.findRequestForUpdate(conn, requestId);
    if (!row) throw errors.notFound('Master data correction request not found');
    if (row.status !== 'SUBMITTED') throw errors.conflict('Only submitted requests can be rejected');

    await repo.markRejected(conn, requestId, actor, body.notes || null);
    await repo.writeAuditLog(conn, {
      actor,
      action: 'MDC_REJECT',
      requestId,
      ipAddress,
      userAgent,
      details: { notes: body.notes || null },
    });
    await conn.commit();
    return { request_id: requestId, status: 'REJECTED' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  normalizeDivisionCode,
  reverseDivisionCode,
  isDivisionMatch,
  assertSsoEquipmentDivisionAllowed,
  getContext,
  createRequest,
  listRequests,
  approveRequest,
  rejectRequest,
};
