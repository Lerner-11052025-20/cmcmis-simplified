/**
 * CMCMIS_SIMPLIFIED - Migration 804
 * Purpose: Import organization hierarchy heads for SSO employees.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_BATCH = 'response_PRIMARY_HIEARCHY';

function clean(value, maxLen = 7) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return null;
  return text.toUpperCase().slice(0, maxLen);
}

function parseUpdateDate(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return null;

  const match = text.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!match) return null;

  const months = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
  };
  const month = months[match[1].toUpperCase()];
  if (!month) return null;

  const day = String(Number(match[2])).padStart(2, '0');
  return `${match[3]}-${String(month).padStart(2, '0')}-${day}`;
}

function loadRows() {
  const filePath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'reports PDFs',
    'DATA',
    'response_PRIMARY_HIEARCHY.json',
  );
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!parsed || !Array.isArray(parsed.data)) {
    throw new Error('[804] response_PRIMARY_HIEARCHY.json must contain a data array');
  }
  return parsed.data;
}

async function up(conn) {
  const rows = loadRows();
  let imported = 0;
  let skipped = 0;
  let badDate = 0;

  await conn.beginTransaction();
  try {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const employeeId = clean(row.employeeCode);
      if (!employeeId) {
        skipped += 1;
        continue;
      }

      const updateDate = parseUpdateDate(row.updateDate);
      if (row.updateDate && !updateDate) badDate += 1;

      await conn.query(
        `INSERT INTO employee_sso_heads
           (employee_id, sec_head_employee_id, div_head_employee_id,
            group_head_employee_id, entity_head_employee_id, centre_head_employee_id,
            update_date, source_batch, source_row_no, created_at, updated_at, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6), ?)
         ON DUPLICATE KEY UPDATE
           employee_id             = VALUES(employee_id),
           sec_head_employee_id    = VALUES(sec_head_employee_id),
           div_head_employee_id    = VALUES(div_head_employee_id),
           group_head_employee_id  = VALUES(group_head_employee_id),
           entity_head_employee_id = VALUES(entity_head_employee_id),
           centre_head_employee_id = VALUES(centre_head_employee_id),
           update_date             = VALUES(update_date),
           updated_at              = NOW(6),
           raw_payload             = VALUES(raw_payload)`,
        [
          employeeId,
          clean(row.secHead),
          clean(row.divHead),
          clean(row.groupHead),
          clean(row.entityHead),
          clean(row.centreHead),
          updateDate,
          SOURCE_BATCH,
          i + 1,
          JSON.stringify(row),
        ],
      );
      imported += 1;
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  }

  console.log(
    `[804] SSO heads import complete. rows=${rows.length}, imported=${imported}, ` +
    `skipped=${skipped}, bad_date=${badDate}`,
  );
}

module.exports = { up };
