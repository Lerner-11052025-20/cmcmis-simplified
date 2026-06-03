// ============================================================================
// src/modules/pdf/templates/equipmentList.js
// ----------------------------------------------------------------------------
// PDF — EQUIPMENT LIST REPORT (landscape multi-page)
//
// PHASE 15 — PDF Export Feature
//
// Professional, landscape report listing equipment inside the specified range.
// Shows a header metadata band (User details, export metrics) followed by a
// beautiful, high-contrast, alternating color row table.
// ============================================================================

'use strict';

const PDFDocument = require('pdfkit');
const {
  PAGE_MARGIN_X,
  PAGE_MARGIN_BOTTOM,
  FOOTER_HEIGHT,
  COLORS,
  drawHeader,
  stampPageNumbers,
  fmtDate,
  fmtDateTime,
  fmtText,
} = require('./_isroHeader');

const ODD_ROW_BG = '#EDF1F7'; // pronounce slate-grey contrast color from FE DataTable
const EVEN_ROW_BG = '#FFFFFF';

function ensureRoomFor(doc, neededHeight) {
  if (doc.y + neededHeight > doc.page.height - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT) {
    doc.addPage();
  }
}

function addNewPage(doc, columns, widths, tableW) {
  doc.addPage();
  
  // Draw the standard compact page header
  drawHeader(doc, {
    title: 'EQUIPMENT INVENTORY EXPORT REPORT',
    subtitle: 'CMCMIS · Space Applications Centre TIMCD',
    compact: true,
  });
  
  const hy = doc.y;
  const x = PAGE_MARGIN_X;
  const HEADER_H = 20;
  const PAD = 5;
  
  // Draw the table header box
  doc.rect(x, hy, tableW, HEADER_H).fillAndStroke(COLORS.accent, COLORS.border);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');

  let cx = x;
  columns.forEach((c, i) => {
    doc.text(c.header, cx + PAD, hy + 6, {
      width: widths[i] - 2 * PAD,
      align: 'left',
      lineBreak: false,
      ellipsis: true,
    });
    cx += widths[i];
  });
  doc.y = hy + HEADER_H;
}

function drawMetadataBox(doc, { requester, rangeText, stats }) {
  const x = PAGE_MARGIN_X;
  const w = doc.page.width - PAGE_MARGIN_X * 2;
  const h = 54;
  const y = doc.y;

  // Background and border
  doc.rect(x, y, w, h).fillAndStroke('#F8FAFC', COLORS.border);
  
  // Royal Blue dynamic left accent bar
  doc.rect(x, y, 4, h).fill(COLORS.accent);

  // Left Column - Requester User Info
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.accent);
  doc.text('EXPORTED BY USER', x + 15, y + 8);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.title);
  doc.text(`${requester.name} (${requester.employeeId}) — ${requester.role}`, x + 15, y + 18);
  
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.inkSoft);
  doc.text('EXPORT DATE / TIME', x + 15, y + 30);
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.title);
  // Matches "29-05-2026 13:19" formatting
  doc.text(fmtDateTime(new Date()), x + 15, y + 40);

  // Middle Column - Range and Records Info
  const col2X = x + w / 3 + 10;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#D97706'); // amber
  doc.text('EQUIPMENT ID EXPORT RANGE', col2X, y + 8);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.title);
  doc.text(rangeText, col2X, y + 18);
  
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.inkSoft);
  doc.text('TOTAL EXPORTED RECORD COUNT', col2X, y + 30);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#16A34A'); // green status color
  doc.text(`${stats.count} Active/Pending Records`, col2X, y + 40);

  // Right Column - Context and Security Info
  const col3X = x + (w * 2) / 3 + 20;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.inkSoft);
  doc.text('SYSTEM CONTEXT', col3X, y + 8);
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.title);
  doc.text('🟢 CMCMIS Online & Synced', col3X, y + 18);
  
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.inkSoft);
  doc.text('REPORT SECURITY & SCOPE', col3X, y + 30);
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.inkSoft);
  doc.text('Official Internal Document · SAC Ahmedabad', col3X, y + 40);

  doc.y = y + h + 15;
}

async function drawEquipmentTableAsync(doc, rows) {
  const x = PAGE_MARGIN_X;
  const tableW = doc.page.width - PAGE_MARGIN_X * 2;

  // 7 columns matching the data table layout in Landscape
  const columns = [
    { header: 'Equipment ID',      key: 'code',         width: 110 },
    { header: 'Name',              key: 'name',         width: 170 },
    { header: 'Model No',          key: 'model_no',     width: 100 },
    { header: 'Manufacturer Name',  key: 'make',         width: 120 },
    { header: 'Serial No',         key: 'serial_no',    width: 100 },
    { header: 'Status',            key: 'status',       width: 80 },
    { header: 'EQM Division',      key: 'division_abbr',width: 90 },
  ];

  const totalRaw = columns.reduce((a, c) => a + c.width, 0);
  const widths = columns.map((c) => (c.width / totalRaw) * tableW);
  const HEADER_H = 20;
  const PAD = 5;

  const ensureRoomForTable = (neededHeight) => {
    if (doc.y + neededHeight > doc.page.height - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT) {
      addNewPage(doc, columns, widths, tableW);
    }
  };

  // Draw Header on first page
  ensureRoomForTable(HEADER_H + 20);
  const hy = doc.y;
  doc.rect(x, hy, tableW, HEADER_H).fillAndStroke(COLORS.accent, COLORS.border);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');

  let cx = x;
  columns.forEach((c, i) => {
    doc.text(c.header, cx + PAD, hy + 6, {
      width: widths[i] - 2 * PAD,
      align: 'left',
      lineBreak: false,
      ellipsis: true,
    });
    cx += widths[i];
  });
  doc.y = hy + HEADER_H;

  if (!rows || rows.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.inkSoft);
    doc.text('No equipment records found inside this ID range.', x + 10, doc.y + 10);
    doc.y += 24;
    return;
  }

  // Draw rows with chunk-based yielding to event loop
  let rowIdx = 0;
  const CHUNK_SIZE = 50;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const isOdd = rowIdx % 2 !== 0;
    const rowBgColor = isOdd ? ODD_ROW_BG : EVEN_ROW_BG;
    rowIdx++;

    let needed = 18;
    columns.forEach((c, i) => {
      const v = row[c.key] ?? '—';
      const chars = String(v).length;
      const cpl = Math.max(8, Math.floor((widths[i] - 2 * PAD) / 4.8));
      const lines = Math.min(4, Math.max(1, Math.ceil(chars / cpl)));
      const h = 6 + lines * 10;
      if (h > needed) needed = h;
    });

    ensureRoomForTable(needed);
    const ry = doc.y;

    // Draw background and outer border
    doc.rect(x, ry, tableW, needed).fillAndStroke(rowBgColor, COLORS.border);

    // Draw row cell values
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.title);
    cx = x;
    columns.forEach((c, i) => {
      let v = row[c.key];
      if (v === null || v === undefined || v === '') v = '—';
      doc.text(String(v), cx + PAD, ry + 4, {
        width: widths[i] - 2 * PAD,
        align: 'left',
        height: needed - 8,
        ellipsis: true,
      });
      cx += widths[i];
    });

    doc.y = ry + needed;

    // Yield control back to the event loop
    if (idx > 0 && idx % CHUNK_SIZE === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}

async function renderEquipmentListPdf({ rows, requester, rangeText }, stream) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape', // Landscape is perfect for wide columns
    margin: PAGE_MARGIN_X,
    bufferPages: true,
    autoFirstPage: true,
  });
  doc.pipe(stream);

  drawHeader(doc, {
    title: 'EQUIPMENT INVENTORY EXPORT REPORT',
    subtitle: 'CMCMIS · Space Applications Centre TIMCD',
    compact: true,
  });

  // User details & Range block
  drawMetadataBox(doc, {
    requester,
    rangeText,
    stats: { count: rows.length },
  });

  // Data table (async)
  await drawEquipmentTableAsync(doc, rows);

  stampPageNumbers(doc, { docId: 'EQUIPMENT-INVENTORY' });
  doc.end();
}

module.exports = {
  renderEquipmentListPdf,
};
