// ============================================================================
// src/modules/schedule/schedule.service.js  —  Business logic
// ----------------------------------------------------------------------------
// PHASE 13 — Schedule sub-module
//
// EXPORTED METHODS
//   listSchedules(params)
//   getScheduleDetail(id)
//   createSchedule({ body, actor, ipAddress, userAgent })
//   editSchedule({ id, patch, actor, ipAddress, userAgent })
//   transitionSchedule({ id, body, actor, ipAddress, userAgent })
//   cancelSchedule({ id, reason, actor, ipAddress, userAgent })
//   getIcsForSchedule(id)             → string (ICS body)
//   getIcsForFilter(filter)           → string (ICS body for N schedules)
//
// DOCTRINE
//   • Every write opens its own transaction. The schedule row, status
//     history row, and audit_log row are committed atomically. Phase 12
//     notification emit() runs INSIDE the same txn so a failed write
//     leaves no orphan.
//   • DUE is derived AND lazily persisted on read (see lazyMarkDue).
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const pool  = require('../../config/db');

const repo  = require('./schedule.repo');
const sm    = require('./schedule.stateMachine');
const ics   = require('./schedule.ics');
const { errors } = require('../../middleware/errorHandler');

// Phase 12 — workflow notifications.
const { emit: emitNotification } = require('../notifications/notifications.emitter');

const MAX_FEED_ROWS = 500;


// ───────────────────────────────────────────────────────────────────────
//  HELPERS
// ───────────────────────────────────────────────────────────────────────

/** Map a raw repo row → canonical FE payload shape. */
function toApi(row) {
  if (!row) return null;
  return {
    id:                            row.id,
    schedule_code:                 row.schedule_code,
    schedule_type:                 row.schedule_type,
    equipment_id:                  row.equipment_id,
    equipment_label:               row.equipment_label,
    scheduled_date:                row.scheduled_date
                                     ? dayjs(row.scheduled_date).format('YYYY-MM-DD')
                                     : null,
    priority:                      row.priority,
    status:                        row.status,
    assigned_engineer_employee_id: row.assigned_engineer_employee_id,
    assigned_engineer_name:        row.assigned_engineer_employee_id
                                     ? row.assigned_engineer_name
                                     : null,
    recurrence:                    row.recurrence,
    notes:                         row.notes,
    created_by_employee_id:        row.created_by_employee_id,
    created_at:                    row.created_at
                                     ? dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss')
                                     : null,
    updated_at:                    row.updated_at
                                     ? dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss')
                                     : null,
  };
}


// ───────────────────────────────────────────────────────────────────────
//  LIST
// ───────────────────────────────────────────────────────────────────────
async function listSchedules(params) {
  // Calendar view: bump the page_size cap so the visible month always
  // returns in one round-trip. The validator already capped at 500.
  if (params.view === 'calendar' && !params.page_size_override) {
    params = { ...params, page_size: 500, page: 1 };
  }
  const { rows, total } = await repo.listSchedules(params);

  // DUE-derivation overlay — rows that should be DUE are shown as DUE.
  // The actual DB flip happens on the next write touch (lazyMarkDue() is
  // also called on read of a single detail page).
  const items = rows.map((r) => {
    const derived = sm.deriveStatus(r.status, r.scheduled_date);
    return toApi({ ...r, status: derived });
  });
  return {
    items,
    pagination: {
      page:        params.page,
      page_size:   params.page_size,
      total_items: total,
      total_pages: Math.max(1, Math.ceil(total / params.page_size)),
    },
  };
}


// ───────────────────────────────────────────────────────────────────────
//  DETAIL
// ───────────────────────────────────────────────────────────────────────
async function getScheduleDetail(id) {
  // Lazy DUE flip — keeps the persisted row honest. Idempotent.
  await repo.lazyMarkDue(id);
  const row = await repo.findById(id);
  if (!row) throw errors.notFound(`Schedule ${id} not found`);
  return toApi(row);
}


// ───────────────────────────────────────────────────────────────────────
//  CREATE
// ───────────────────────────────────────────────────────────────────────
async function createSchedule({ body, actor, ipAddress, userAgent }) {
  // 1) Soft-FK validation — equipment must exist; engineer (if any) must exist.
  const equipment = await repo.findEquipmentByCompositeId(body.equipment_id);
  if (!equipment) {
    throw errors.badRequest('equipment_id does not exist', { field: 'equipment_id' });
  }
  if (body.assigned_engineer_employee_id) {
    const eng = await repo.findEmployeeByEmployeeId(body.assigned_engineer_employee_id);
    if (!eng) {
      throw errors.badRequest('assigned_engineer_employee_id does not exist',
        { field: 'assigned_engineer_employee_id' });
    }
  }

  // 2) Transaction.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const code = await repo.nextScheduleCode(conn, body.schedule_type, body.scheduled_date);

    const insertRow = {
      schedule_code:  code,
      schedule_type:  body.schedule_type,
      equipment_id:   body.equipment_id,
      // Default label = equipment name from the JOIN; FE can override.
      equipment_label: body.equipment_label || equipment.name || null,
      scheduled_date: body.scheduled_date,
      priority:       body.priority || 'MEDIUM',
      status:         'PLANNED',
      assigned_engineer_employee_id: body.assigned_engineer_employee_id || null,
      recurrence:     body.recurrence || 'NONE',
      notes:          body.notes || null,
      created_by_employee_id: actor.employeeId,
    };
    const newId = await repo.insertSchedule(conn, insertRow);

    await repo.appendStatusHistory(conn, newId, null, 'PLANNED', actor.employeeId, 'Created');

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'SCHEDULE_CREATE',
      scheduleId:      newId,
      ipAddress,
      userAgent,
      details: {
        schedule_code: code,
        type:          body.schedule_type,
        equipment_id:  body.equipment_id,
        scheduled_date:body.scheduled_date,
        engineer:      body.assigned_engineer_employee_id || null,
      },
    });

    // Phase 12 — emit a JC_TAB_UPDATED-style notification only if an engineer
    // is assigned (otherwise nobody to notify). We reuse the EQUIPMENT_REGISTERED
    // template for brevity; future Phase-13 templates can specialise the copy.
    if (body.assigned_engineer_employee_id) {
      await emitNotification({
        conn,
        event_type:  'EQUIPMENT_VERIFIED', // closest existing template (informational)
        entity_type: 'EQUIPMENT',
        entity_id:   body.equipment_id,
        entity: {
          equipmentName: insertRow.equipment_label,
        },
        actor:       { employeeId: actor.employeeId, fullName: actor.fullName },
        recipients:  [body.assigned_engineer_employee_id],
      });
    }

    await conn.commit();

    return { id: newId, schedule_code: code, status: 'PLANNED' };
  } catch (err) {
    try { await conn.rollback(); } catch { /* secondary fault ignored */ }
    throw err;
  } finally {
    conn.release();
  }
}


// ───────────────────────────────────────────────────────────────────────
//  EDIT  (partial fields)
// ───────────────────────────────────────────────────────────────────────
async function editSchedule({ id, patch, actor, ipAddress, userAgent }) {
  // Load + 404 guard.
  const existing = await repo.findById(id);
  if (!existing) throw errors.notFound(`Schedule ${id} not found`);

  // Terminal-state guard — locked rows cannot be edited. CANCELLED + COMPLETED
  // are terminal; resurrecting requires creating a new schedule.
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw errors.conflict(
      `Cannot edit a ${existing.status.toLowerCase()} schedule. Create a new one.`,
    );
  }

  // Soft-FK validation only on changed fields.
  if (patch.equipment_id && patch.equipment_id !== existing.equipment_id) {
    const eq = await repo.findEquipmentByCompositeId(patch.equipment_id);
    if (!eq) throw errors.badRequest('equipment_id does not exist', { field: 'equipment_id' });
    // Auto-update label if FE didn't pass one.
    if (patch.equipment_label === undefined) patch.equipment_label = eq.name || null;
  }
  if (patch.assigned_engineer_employee_id) {
    const eng = await repo.findEmployeeByEmployeeId(patch.assigned_engineer_employee_id);
    if (!eng) {
      throw errors.badRequest('assigned_engineer_employee_id does not exist',
        { field: 'assigned_engineer_employee_id' });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const affected = await repo.updateSchedule(conn, id, patch, actor.employeeId);
    if (affected === 0) throw errors.notFound(`Schedule ${id} not found`);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'SCHEDULE_UPDATE',
      scheduleId:      id,
      ipAddress,
      userAgent,
      details: { changed: Object.keys(patch) },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
  return getScheduleDetail(id);
}


// ───────────────────────────────────────────────────────────────────────
//  STATUS TRANSITION
// ───────────────────────────────────────────────────────────────────────
async function transitionSchedule({ id, body, actor, ipAddress, userAgent }) {
  const existing = await repo.findById(id);
  if (!existing) throw errors.notFound(`Schedule ${id} not found`);

  // Apply DUE-derivation BEFORE the transition check so a stale PLANNED
  // row whose date has passed is transitioned from DUE (not PLANNED).
  const effectiveFrom = sm.deriveStatus(existing.status, existing.scheduled_date);
  const { from, to } = sm.transition(effectiveFrom, body.to);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const affected = await repo.transitionStatus(conn, id, to, actor.employeeId);
    if (affected === 0) throw errors.notFound(`Schedule ${id} not found`);

    await repo.appendStatusHistory(conn, id, from, to, actor.employeeId, body.reason || null);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          `SCHEDULE_${to}`,
      scheduleId:      id,
      ipAddress,
      userAgent,
      details: { from, to, reason: body.reason || null },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
  return getScheduleDetail(id);
}


// ───────────────────────────────────────────────────────────────────────
//  CANCEL  (logical delete — DELETE verb under the hood)
// ───────────────────────────────────────────────────────────────────────
/**
 * Logical-cancel — same as transitionSchedule({ to: 'CANCELLED', reason }).
 * Surfaced separately so DELETE /schedules/:id has a single entry point.
 */
async function cancelSchedule({ id, reason, actor, ipAddress, userAgent }) {
  return transitionSchedule({
    id,
    body: { to: 'CANCELLED', reason: reason || 'Cancelled' },
    actor, ipAddress, userAgent,
  });
}


// ───────────────────────────────────────────────────────────────────────
//  ICS EXPORTS
// ───────────────────────────────────────────────────────────────────────
async function getIcsForSchedule(id) {
  const detail = await getScheduleDetail(id);     // throws 404 if missing
  return ics.buildCalendar([detail]);
}

/**
 * Build a multi-VEVENT calendar for an arbitrary filter. Used by the
 * "Export Calendar (.ics)" bulk button on the Schedule page. Capped at
 * MAX_FEED_ROWS to keep the feed bounded.
 */
async function getIcsForFilter(filter) {
  const { rows } = await repo.listSchedules({
    ...filter,
    page:      1,
    page_size: MAX_FEED_ROWS,
  });
  const events = rows.map((r) => {
    const derived = sm.deriveStatus(r.status, r.scheduled_date);
    return toApi({ ...r, status: derived });
  });
  return ics.buildCalendar(events);
}


module.exports = {
  listSchedules,
  getScheduleDetail,
  createSchedule,
  editSchedule,
  transitionSchedule,
  cancelSchedule,
  getIcsForSchedule,
  getIcsForFilter,
};
