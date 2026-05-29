// ============================================================================
// src/modules/procurement/procurement.service.js  —  Business logic
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// EXPORTED METHODS
//   listPurchaseOrders / getPoDetail / createPo / editPo
//   listSpareParts     / createSpare / editSpare / orderSpare
//   exportPoCsv        / exportSpareCsv
//
// SERVER-COMPUTED TOTALS DOCTRINE
//   `purchase_orders.total_cost` AND `purchase_order_items.line_total` are
//   computed INSIDE the create-or-edit txn from item.quantity * item.unit_
//   cost — never trusted from the client. The client may submit a total,
//   we just ignore it.
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const pool  = require('../../config/db');

const repo  = require('./procurement.repo');
const { errors } = require('../../middleware/errorHandler');

// Phase 12 — workflow notifications.
const { emit: emitNotification } = require('../notifications/notifications.emitter');


// ────────────────────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────────────────────

function fmtMoney(v) {
  if (v === null || v === undefined) return null;
  return Number(Number(v).toFixed(2));
}

function poRowToApi(r) {
  return {
    id:               r.id,
    po_number:        r.po_number,
    vendor_id:        r.vendor_id,
    vendor_label:     r.vendor_label,
    po_date:          r.po_date ? dayjs(r.po_date).format('YYYY-MM-DD') : null,
    warranty_months:  r.warranty_months,
    total_cost:       fmtMoney(r.total_cost),
    status:           r.status,
    notes:            r.notes,
    items:            r.items !== undefined ? Number(r.items) : undefined,
    created_at:       r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss') : null,
    updated_at:       r.updated_at ? dayjs(r.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
  };
}

function poItemToApi(r) {
  return {
    id:            r.id,
    po_id:         r.po_id,
    item_name:     r.item_name,
    spare_part_id: r.spare_part_id,
    quantity:      Number(r.quantity),
    unit_cost:     fmtMoney(r.unit_cost),
    line_total:    fmtMoney(r.line_total),
  };
}

function spareRowToApi(r) {
  return {
    id:               r.id,
    part_code:        r.part_code,
    part_name:        r.part_name,
    equipment_ref:    r.equipment_ref,
    vendor_id:        r.vendor_id,
    vendor_label:     r.vendor_label,
    stock_qty:        Number(r.stock_qty),
    min_stock:        Number(r.min_stock),
    low_stock:        Number(r.stock_qty) <= Number(r.min_stock),
    unit_cost:        fmtMoney(r.unit_cost),
    last_ordered_date:r.last_ordered_date ? dayjs(r.last_ordered_date).format('YYYY-MM-DD') : null,
    notes:            r.notes,
    created_at:       r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss') : null,
    updated_at:       r.updated_at ? dayjs(r.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
  };
}


// ════════════════════════════════════════════════════════════════════════
//  PURCHASE ORDERS
// ════════════════════════════════════════════════════════════════════════

async function listPurchaseOrders(params) {
  const { rows, total } = await repo.listPurchaseOrders(params);
  return {
    items: rows.map(poRowToApi),
    pagination: {
      page:        params.page,
      page_size:   params.page_size,
      total_items: total,
      total_pages: Math.max(1, Math.ceil(total / params.page_size)),
    },
  };
}

async function getPoDetail(id) {
  const row = await repo.findPurchaseOrderById(id);
  if (!row) throw errors.notFound(`Purchase Order ${id} not found`);
  const items = await repo.findItemsForPo(id);
  return {
    ...poRowToApi(row),
    items_list: items.map(poItemToApi),
  };
}

async function createPo({ body, actor, ipAddress, userAgent }) {
  // 1) Vendor existence check.
  const vendor = await repo.findVendorById(body.vendor_id);
  if (!vendor) {
    throw errors.badRequest('vendor_id does not exist', { field: 'vendor_id' });
  }

  // 2) Transaction.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const poNumber = await repo.nextPoNumber(conn, body.po_date);
    const poId = await repo.insertPurchaseOrder(conn, {
      po_number:        poNumber,
      vendor_id:        body.vendor_id,
      vendor_label:     body.vendor_label || vendor.name || null,
      po_date:          body.po_date,
      warranty_months:  body.warranty_months,
      total_cost:       0,                                 // re-stamped below
      status:           body.status || 'ACTIVE',
      notes:            body.notes || null,
      created_by_employee_id: actor.employeeId,
    });

    // Insert items; line_total is computed inside insertPoItem().
    let runningTotal = 0;
    for (const item of body.items) {
      const lineTotal = await repo.insertPoItem(conn, poId, item);
      runningTotal += lineTotal;
    }

    // Defence-in-depth: re-sum from the rows we just wrote. Any FP drift
    // is healed because we round each line_total to 2 dp.
    const canonicalTotal = await repo.computePoTotal(conn, poId);
    await repo.setPoTotal(conn, poId, canonicalTotal);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'PO_CREATE',
      entityType:      'purchase_order',
      entityId:        poId,
      ipAddress, userAgent,
      details: {
        po_number:   poNumber,
        vendor_id:   body.vendor_id,
        items:       body.items.length,
        total_cost:  canonicalTotal,
      },
    });

    await conn.commit();

    return { id: poId, po_number: poNumber, total_cost: canonicalTotal };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function editPo({ id, patch, actor, ipAddress, userAgent }) {
  const existing = await repo.findPurchaseOrderById(id);
  if (!existing) throw errors.notFound(`Purchase Order ${id} not found`);

  // Cannot edit EXPIRED POs (terminal). COMPLETED can still receive notes
  // / status flips; ACTIVE is fully editable (sans line items in Phase 13).
  if (existing.status === 'EXPIRED') {
    throw errors.conflict('Cannot edit an expired Purchase Order');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const affected = await repo.updatePurchaseOrder(conn, id, patch, actor.employeeId);
    if (affected === 0) throw errors.notFound(`Purchase Order ${id} not found`);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'PO_UPDATE',
      entityType:      'purchase_order',
      entityId:        id,
      ipAddress, userAgent,
      details: { changed: Object.keys(patch) },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
  return getPoDetail(id);
}


// ════════════════════════════════════════════════════════════════════════
//  SPARE PARTS
// ════════════════════════════════════════════════════════════════════════

async function listSpareParts(params) {
  const { rows, total } = await repo.listSpareParts(params);
  return {
    items: rows.map(spareRowToApi),
    pagination: {
      page:        params.page,
      page_size:   params.page_size,
      total_items: total,
      total_pages: Math.max(1, Math.ceil(total / params.page_size)),
    },
  };
}

async function getSpareDetail(id) {
  const row = await repo.findSparePartById(id);
  if (!row) throw errors.notFound(`Spare part ${id} not found`);
  return spareRowToApi(row);
}

async function createSpare({ body, actor, ipAddress, userAgent }) {
  // Vendor is optional on spares (you may inventory a part before a
  // formal vendor is chosen). Validate it ONLY if provided.
  let vendor = null;
  if (body.vendor_id) {
    vendor = await repo.findVendorById(body.vendor_id);
    if (!vendor) throw errors.badRequest('vendor_id does not exist', { field: 'vendor_id' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const partCode = await repo.nextSparePartCode(conn);
    const newId = await repo.insertSparePart(conn, {
      part_code:        partCode,
      part_name:        body.part_name,
      equipment_ref:    body.equipment_ref || null,
      vendor_id:        body.vendor_id || null,
      vendor_label:     body.vendor_label || (vendor ? vendor.name : null),
      stock_qty:        body.stock_qty || 0,
      min_stock:        body.min_stock || 0,
      unit_cost:        body.unit_cost === undefined ? null : body.unit_cost,
      last_ordered_date:body.last_ordered_date || null,
      notes:            body.notes || null,
      created_by_employee_id: actor.employeeId,
    });

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'SPARE_CREATE',
      entityType:      'spare_part',
      entityId:        newId,
      ipAddress, userAgent,
      details: { part_code: partCode, part_name: body.part_name, vendor_id: body.vendor_id || null },
    });

    await conn.commit();

    return { id: newId, part_code: partCode };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function editSpare({ id, patch, actor, ipAddress, userAgent }) {
  const existing = await repo.findSparePartById(id);
  if (!existing) throw errors.notFound(`Spare part ${id} not found`);

  if (patch.vendor_id) {
    const vendor = await repo.findVendorById(patch.vendor_id);
    if (!vendor) throw errors.badRequest('vendor_id does not exist', { field: 'vendor_id' });
    if (!patch.vendor_label) patch.vendor_label = vendor.name || null;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const affected = await repo.updateSparePart(conn, id, patch, actor.employeeId);
    if (affected === 0) throw errors.notFound(`Spare part ${id} not found`);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          'SPARE_UPDATE',
      entityType:      'spare_part',
      entityId:        id,
      ipAddress, userAgent,
      details: { changed: Object.keys(patch) },
    });

    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
  return getSpareDetail(id);
}

/**
 * Order action — clerk asks "order N units of this spare". If an ACTIVE
 * PO exists for the same vendor on TODAY, we append a line item to it;
 * otherwise we create a new PO. Either way:
 *   • a PO row exists,
 *   • a line item exists,
 *   • the spare's last_ordered_date = today,
 *   • PO total_cost is server-recomputed.
 */
async function orderSpare({ id, body, actor, ipAddress, userAgent }) {
  const spare = await repo.findSparePartById(id);
  if (!spare) throw errors.notFound(`Spare part ${id} not found`);
  if (!spare.vendor_id) {
    throw errors.badRequest('Cannot order a spare with no vendor', { field: 'vendor_id' });
  }

  // Effective unit_cost: request override > spare.unit_cost > 0.
  const effUnitCost = body.unit_cost !== null && body.unit_cost !== undefined
    ? Number(body.unit_cost)
    : Number(spare.unit_cost || 0);
  if (!Number.isFinite(effUnitCost) || effUnitCost < 0) {
    throw errors.badRequest('Unit cost is required for ordering — set it on the spare or pass it in the order',
      { field: 'unit_cost' });
  }
  const today = dayjs().format('YYYY-MM-DD');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Try to reuse an open PO for this vendor + today.
    let po = await repo.findOpenPoForVendor(conn, spare.vendor_id, today);
    let createdNewPo = false;
    if (!po) {
      // Need a vendor label — try the cmms_cont_mst lookup (outside txn fine).
      // But we already may have it on the spare row; prefer the spare's label.
      const poNumber = await repo.nextPoNumber(conn, today);
      const poId = await repo.insertPurchaseOrder(conn, {
        po_number:       poNumber,
        vendor_id:       spare.vendor_id,
        vendor_label:    spare.vendor_label || null,
        po_date:         today,
        warranty_months: body.warranty_months,
        total_cost:      0,
        status:          'ACTIVE',
        notes:           body.notes || `Order for ${spare.part_code} (${spare.part_name})`,
        created_by_employee_id: actor.employeeId,
      });
      po = { id: poId, po_number: poNumber, vendor_id: spare.vendor_id };
      createdNewPo = true;
    }

    // Append the line item.
    await repo.insertPoItem(conn, po.id, {
      item_name:     `${spare.part_code} · ${spare.part_name}`,
      spare_part_id: spare.id,
      quantity:      body.quantity,
      unit_cost:     effUnitCost,
    });

    // Recompute server-side total.
    const newTotal = await repo.computePoTotal(conn, po.id);
    await repo.setPoTotal(conn, po.id, newTotal);

    // Stamp last_ordered_date on the spare.
    await repo.stampSpareLastOrdered(conn, spare.id, today);

    await repo.writeAuditLog(conn, {
      actorEmployeeId: actor.employeeId,
      actorRoleCode:   actor.role,
      action:          createdNewPo ? 'PO_CREATE_VIA_ORDER' : 'PO_APPEND_VIA_ORDER',
      entityType:      'purchase_order',
      entityId:        po.id,
      ipAddress, userAgent,
      details: {
        spare_id:   spare.id,
        spare_code: spare.part_code,
        quantity:   body.quantity,
        unit_cost:  effUnitCost,
        new_total:  newTotal,
      },
    });

    await conn.commit();
    return {
      po_id:        po.id,
      po_number:    po.po_number,
      created_new:  createdNewPo,
      total_cost:   newTotal,
    };
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}


// ════════════════════════════════════════════════════════════════════════
//  CSV EXPORTS  —  streamed strings
// ════════════════════════════════════════════════════════════════════════
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exportPoCsv(params) {
  // Lift the page cap so the export includes everything that matches.
  const { rows } = await repo.listPurchaseOrders({ ...params, page: 1, page_size: 10000 });
  const head = ['PO Number','Vendor ID','Vendor','PO Date','Warranty (months)','Items','Total Cost','Status','Notes'];
  const lines = [head.join(',')];
  for (const r of rows) {
    lines.push([
      r.po_number, r.vendor_id, r.vendor_label,
      r.po_date ? dayjs(r.po_date).format('YYYY-MM-DD') : '',
      r.warranty_months ?? '',
      r.items ?? 0,
      Number(r.total_cost).toFixed(2),
      r.status,
      r.notes ?? '',
    ].map(csvEscape).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

async function exportSpareCsv(params) {
  const { rows } = await repo.listSpareParts({ ...params, page: 1, page_size: 10000 });
  const head = ['Part ID','Part Name','Equipment','Vendor ID','Vendor','Stock','Min Stock','Unit Cost','Last Ordered','Notes'];
  const lines = [head.join(',')];
  for (const r of rows) {
    lines.push([
      r.part_code, r.part_name, r.equipment_ref ?? '',
      r.vendor_id ?? '', r.vendor_label ?? '',
      r.stock_qty, r.min_stock,
      r.unit_cost != null ? Number(r.unit_cost).toFixed(2) : '',
      r.last_ordered_date ? dayjs(r.last_ordered_date).format('YYYY-MM-DD') : '',
      r.notes ?? '',
    ].map(csvEscape).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}


module.exports = {
  // PO
  listPurchaseOrders, getPoDetail, createPo, editPo, exportPoCsv,
  // Spares
  listSpareParts, getSpareDetail, createSpare, editSpare, orderSpare, exportSpareCsv,
};
