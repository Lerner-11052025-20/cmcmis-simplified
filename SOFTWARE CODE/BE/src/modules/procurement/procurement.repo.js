// ============================================================================
// src/modules/procurement/procurement.repo.js  —  DAL
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// ONLY file in the procurement module that contains SQL. Controllers /
// services speak canonical names; this file owns column-level mapping.
//
// TABLES TOUCHED:
//   purchase_orders        — header (read/write)
//   purchase_order_items   — child  (read/write, txn-scoped)
//   spare_parts            — inventory (read/write)
//   cmms_cont_mst          — vendor lookup (read-only)
//   audit_log              — append-only audit (write, txn-scoped)
// ============================================================================

'use strict';

const pool = require('../../config/db');


// ───────────────────────────────────────────────────────────────────────
//  SOFT-FK CHECKS
// ───────────────────────────────────────────────────────────────────────
/**
 * Vendor existence + canonical label. cmms_cont_mst.CMM_CONT_ID is INT
 * but we accept either INT or string id from the caller (validators have
 * already trimmed it to ≤40 chars). Returns null on miss.
 */
async function findVendorById(vendorId) {
  if (!vendorId) return null;
  const [rows] = await pool.query(
    `SELECT CMM_CONT_ID                              AS vendor_id,
            CMM_CONT_NAME                            AS name,
            CMM_CONT_TYPE                            AS type
       FROM cmms_cont_mst
      WHERE CMM_CONT_ID = ?
        AND CMM_CONT_STATE_FLAG = 1
      LIMIT 1`,
    [vendorId],
  );
  return rows[0] || null;
}


// ───────────────────────────────────────────────────────────────────────
//  CODE GENERATORS
// ───────────────────────────────────────────────────────────────────────
/**
 * PO number = PO-YYYY-NNNN  (4-digit sequence within the year).
 * FOR UPDATE-locked count keeps concurrent inserts safe.
 */
async function nextPoNumber(conn, poDate) {
  const year = parseInt(poDate.slice(0, 4), 10);
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM purchase_orders
      WHERE YEAR(po_date) = ?
      FOR UPDATE`,
    [year],
  );
  const seq = Number(rows[0].n) + 1;
  return `PO-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * Spare part code = SP-NNN  (3-digit, monotonic across all-time).
 * FOR UPDATE-locked count keeps concurrent inserts safe.
 */
async function nextSparePartCode(conn) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM spare_parts FOR UPDATE`,
  );
  const seq = Number(rows[0].n) + 1;
  return `SP-${String(seq).padStart(3, '0')}`;
}


// ────────────────────────────────────────────────────────────────────────
//  PURCHASE ORDERS  —  reads
// ────────────────────────────────────────────────────────────────────────
async function listPurchaseOrders(params) {
  const where = [];
  const args  = [];
  if (params.status) { where.push('po.status = ?');    args.push(params.status); }
  if (params.vendor) { where.push('po.vendor_id = ?'); args.push(params.vendor); }
  if (params.date_from) { where.push('po.po_date >= ?'); args.push(params.date_from); }
  if (params.date_to)   { where.push('po.po_date <= ?'); args.push(params.date_to); }
  if (params.q) {
    where.push('(po.po_number LIKE ? OR po.vendor_label LIKE ? OR po.notes LIKE ?)');
    const like = `%${params.q}%`;
    args.push(like, like, like);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (params.page - 1) * params.page_size;

  // Item count derived in the SELECT so the list shows it without N+1.
  const dataSql = `
    SELECT
      po.id,
      po.po_number,
      po.vendor_id,
      po.vendor_label,
      po.po_date,
      po.warranty_months,
      po.total_cost,
      po.status,
      po.notes,
      po.created_at,
      (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.po_id = po.id) AS items
    FROM purchase_orders po
    ${whereSql}
    ORDER BY po.po_date DESC, po.id DESC
    LIMIT ? OFFSET ?`;

  const countSql = `SELECT COUNT(*) AS n FROM purchase_orders po ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql,  [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) || 0 };
}

async function findPurchaseOrderById(id) {
  const [rows] = await pool.query(
    `SELECT id, po_number, vendor_id, vendor_label, po_date, warranty_months,
            total_cost, status, notes, created_by_employee_id, created_at,
            updated_by_employee_id, updated_at
       FROM purchase_orders
      WHERE id = ?
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findItemsForPo(poId) {
  const [rows] = await pool.query(
    `SELECT id, po_id, item_name, spare_part_id, quantity, unit_cost, line_total
       FROM purchase_order_items
      WHERE po_id = ?
      ORDER BY id ASC`,
    [poId],
  );
  return rows;
}


// ────────────────────────────────────────────────────────────────────────
//  PURCHASE ORDERS  —  writes (txn-scoped)
// ────────────────────────────────────────────────────────────────────────
async function insertPurchaseOrder(conn, row) {
  const [result] = await conn.query(
    `INSERT INTO purchase_orders
       (po_number, vendor_id, vendor_label, po_date, warranty_months,
        total_cost, status, notes, created_by_employee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.po_number,
      row.vendor_id,
      row.vendor_label || null,
      row.po_date,
      row.warranty_months === undefined ? null : row.warranty_months,
      row.total_cost || 0,
      row.status || 'ACTIVE',
      row.notes || null,
      row.created_by_employee_id,
    ],
  );
  return result.insertId;
}

/**
 * Insert one PO item. line_total is computed here (server-side) — the
 * caller never passes a precomputed value.
 */
async function insertPoItem(conn, poId, item) {
  const lineTotal = Number((item.quantity * item.unit_cost).toFixed(2));
  await conn.query(
    `INSERT INTO purchase_order_items
       (po_id, item_name, spare_part_id, quantity, unit_cost, line_total)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [poId, item.item_name, item.spare_part_id || null, item.quantity, item.unit_cost, lineTotal],
  );
  return lineTotal;
}

/**
 * Compute the canonical total_cost for a PO from its rows (sum of
 * line_total). Used after each line item insert OR after an item delete
 * (future). The service writes this back to the parent row.
 */
async function computePoTotal(conn, poId) {
  const [rows] = await conn.query(
    `SELECT COALESCE(SUM(line_total), 0) AS total
       FROM purchase_order_items
      WHERE po_id = ?`,
    [poId],
  );
  return Number(rows[0].total) || 0;
}

async function setPoTotal(conn, poId, total) {
  await conn.query(
    `UPDATE purchase_orders SET total_cost = ?, updated_at = NOW(6) WHERE id = ?`,
    [total, poId],
  );
}

async function updatePurchaseOrder(conn, id, patch, actorEmployeeId) {
  const sets = [];
  const args = [];
  if (patch.vendor_label    !== undefined) { sets.push('vendor_label = ?');    args.push(patch.vendor_label || null); }
  if (patch.po_date         !== undefined) { sets.push('po_date = ?');         args.push(patch.po_date); }
  if (patch.warranty_months !== undefined) { sets.push('warranty_months = ?'); args.push(patch.warranty_months === null ? null : patch.warranty_months); }
  if (patch.status          !== undefined) { sets.push('status = ?');          args.push(patch.status); }
  if (patch.notes           !== undefined) { sets.push('notes = ?');           args.push(patch.notes || null); }
  sets.push('updated_by_employee_id = ?'); args.push(actorEmployeeId);
  sets.push('updated_at = NOW(6)');
  args.push(id);
  const [result] = await conn.query(
    `UPDATE purchase_orders SET ${sets.join(', ')} WHERE id = ?`, args,
  );
  return result.affectedRows;
}

// Find an OPEN PO for this vendor today (used by the spare /order action
// to append a line item instead of creating an N-th PO).
async function findOpenPoForVendor(conn, vendorId, poDate) {
  const [rows] = await conn.query(
    `SELECT id, po_number, vendor_id, vendor_label, po_date, warranty_months,
            total_cost, status, notes, created_by_employee_id, created_at,
            updated_by_employee_id, updated_at
       FROM purchase_orders
      WHERE vendor_id = ? AND po_date = ? AND status = 'ACTIVE'
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE`,
    [vendorId, poDate],
  );
  return rows[0] || null;
}


// ────────────────────────────────────────────────────────────────────────
//  SPARE PARTS  —  reads
// ────────────────────────────────────────────────────────────────────────
async function listSpareParts(params) {
  const where = [];
  const args  = [];
  if (params.vendor)    { where.push('vendor_id = ?'); args.push(params.vendor); }
  if (params.low_stock) { where.push('stock_qty <= min_stock'); }
  if (params.q) {
    where.push('(part_code LIKE ? OR part_name LIKE ? OR equipment_ref LIKE ? OR vendor_label LIKE ?)');
    const like = `%${params.q}%`;
    args.push(like, like, like, like);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (params.page - 1) * params.page_size;

  const dataSql = `
    SELECT id, part_code, part_name, equipment_ref, vendor_id, vendor_label,
           stock_qty, min_stock, unit_cost, last_ordered_date,
           notes, created_at, updated_at
      FROM spare_parts
      ${whereSql}
      ORDER BY part_code ASC
      LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS n FROM spare_parts ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql,  [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);
  return { rows, total: Number(countRows[0].n) || 0 };
}

async function findSparePartById(id) {
  const [rows] = await pool.query(
    `SELECT id, part_code, part_name, equipment_ref, vendor_id, vendor_label,
            stock_qty, min_stock, unit_cost, last_ordered_date, notes,
            created_at, updated_at
       FROM spare_parts
      WHERE id = ?
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findSparePartByIdForUpdate(conn, id) {
  const [rows] = await conn.query(
    `SELECT id, part_code, part_name, equipment_ref, vendor_id, vendor_label,
            stock_qty, min_stock, unit_cost, last_ordered_date, notes,
            created_at, updated_at
       FROM spare_parts
      WHERE id = ?
      LIMIT 1
      FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}


// ────────────────────────────────────────────────────────────────────────
//  SPARE PARTS  —  writes (txn-scoped)
// ────────────────────────────────────────────────────────────────────────
async function insertSparePart(conn, row) {
  const [result] = await conn.query(
    `INSERT INTO spare_parts
       (part_code, part_name, equipment_ref, vendor_id, vendor_label,
        stock_qty, min_stock, unit_cost, last_ordered_date, notes,
        created_by_employee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.part_code,
      row.part_name,
      row.equipment_ref || null,
      row.vendor_id     || null,
      row.vendor_label  || null,
      row.stock_qty     || 0,
      row.min_stock     || 0,
      row.unit_cost === undefined ? null : row.unit_cost,
      row.last_ordered_date || null,
      row.notes || null,
      row.created_by_employee_id,
    ],
  );
  return result.insertId;
}

async function updateSparePart(conn, id, patch, actorEmployeeId) {
  const sets = [];
  const args = [];
  if (patch.part_name        !== undefined) { sets.push('part_name = ?');         args.push(patch.part_name); }
  if (patch.equipment_ref    !== undefined) { sets.push('equipment_ref = ?');     args.push(patch.equipment_ref || null); }
  if (patch.vendor_id        !== undefined) { sets.push('vendor_id = ?');         args.push(patch.vendor_id || null); }
  if (patch.vendor_label     !== undefined) { sets.push('vendor_label = ?');      args.push(patch.vendor_label || null); }
  if (patch.stock_qty        !== undefined) { sets.push('stock_qty = ?');         args.push(patch.stock_qty); }
  if (patch.min_stock        !== undefined) { sets.push('min_stock = ?');         args.push(patch.min_stock); }
  if (patch.unit_cost        !== undefined) { sets.push('unit_cost = ?');         args.push(patch.unit_cost); }
  if (patch.last_ordered_date!== undefined) { sets.push('last_ordered_date = ?'); args.push(patch.last_ordered_date || null); }
  if (patch.notes            !== undefined) { sets.push('notes = ?');             args.push(patch.notes || null); }
  sets.push('updated_by_employee_id = ?'); args.push(actorEmployeeId);
  sets.push('updated_at = NOW(6)');
  args.push(id);
  const [result] = await conn.query(
    `UPDATE spare_parts SET ${sets.join(', ')} WHERE id = ?`, args,
  );
  return result.affectedRows;
}

async function stampSpareLastOrdered(conn, id, date) {
  await conn.query(
    `UPDATE spare_parts SET last_ordered_date = ?, updated_at = NOW(6) WHERE id = ?`,
    [date, id],
  );
}


// ────────────────────────────────────────────────────────────────────────
//  AUDIT (shared)
// ────────────────────────────────────────────────────────────────────────
async function writeAuditLog(conn, { actorEmployeeId, actorRoleCode, action, entityType, entityId, ipAddress, userAgent, details }) {
  await conn.query(
    `INSERT INTO audit_log
       (action, actor_employee_id, actor_role_code, entity_type, entity_id, ip_address, user_agent, notes, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      action,
      actorEmployeeId,
      actorRoleCode || null,
      entityType,
      String(entityId),
      ipAddress || null,
      userAgent || null,
      stringifyNotes(details || {}),
    ],
  );
}

function stringifyNotes(details) {
  let s = JSON.stringify(details);
  if (s.length > 500) s = s.slice(0, 497) + '...';
  return s;
}


module.exports = {
  // Soft-FK
  findVendorById,
  // Code generators
  nextPoNumber,
  nextSparePartCode,
  // PO
  listPurchaseOrders,
  findPurchaseOrderById,
  findItemsForPo,
  findOpenPoForVendor,
  insertPurchaseOrder,
  insertPoItem,
  computePoTotal,
  setPoTotal,
  updatePurchaseOrder,
  // Spares
  listSpareParts,
  findSparePartById,
  findSparePartByIdForUpdate,
  insertSparePart,
  updateSparePart,
  stampSpareLastOrdered,
  // Audit
  writeAuditLog,
};
