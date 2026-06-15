// ============================================================================
// src/modules/pdf/templates/tmeCalibrationCertificateBase/tmeCalibrationCertificateBase.js
// ----------------------------------------------------------------------------
// Shared renderer for T&ME Calibration NABL / Non-NABL / combined certificates.
// Category-specific folders call this with logo/header/task-filter options.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { COLORS, fmtDate, fmtText } = require('../_isroHeader');

const M = 34;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - M * 2;
const LINE = '#111111';
const PAGE_TOP_Y = 34;
const FOOTER_Y = PAGE_H - 58;
const CONTENT_BOTTOM_Y = FOOTER_Y - 16;

function assetPath(filename) {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', '..', 'assets', filename),
    path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'reports PDFs', 'logo', filename),
  ];
  return candidates.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
  }) || null;
}

const LOGOS = {
  isro: assetPath('isro-logo.png'),
  sac: assetPath('sac-logo.png'),
  nabl: assetPath('nabl-logo.png'),
};

function clean(v) {
  return fmtText(v, '');
}

function firstText(...values) {
  return values.map(clean).find(Boolean) || '';
}

function dateText(d) {
  const s = fmtDate(d, '');
  return s === '-' ? '' : s;
}

function longDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${String(dt.getUTCDate()).padStart(2, '0')}-${months[dt.getUTCMonth()]}-${dt.getUTCFullYear()}`;
}

function jcCode(payload) {
  const d = payload.jc_recd_date || payload.created_at;
  const year = d ? new Date(d).getUTCFullYear() : '----';
  return `JC-${year}-${String(payload.jc_no || '').padStart(4, '0')}`;
}

function equipmentId(payload) {
  return [payload.equipment_type, payload.equipment_id].map(clean).filter(Boolean).join('-');
}

function cell(doc, x, y, w, h, text = '', opts = {}) {
  doc.lineWidth(0.45).strokeColor(LINE).rect(x, y, w, h).stroke();
  const pad = opts.pad ?? 3;
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 7.2).fillColor(COLORS.title);
  doc.text(clean(text), x + pad, y + 3, {
    width: w - pad * 2,
    height: h - 4,
    align: opts.align || 'left',
    ellipsis: true,
    lineBreak: true,
  });
}

function fittedLabelWidth(doc, label, labelW, valueW, opts = {}) {
  const text = clean(label);
  if (!text) return labelW;
  const pad = opts.pad ?? 3;
  const size = opts.size || 7.1;
  const totalW = labelW + valueW;
  const minValueW = opts.minValueW ?? 24;
  doc.font('Helvetica-Bold').fontSize(size);
  const naturalW = Math.ceil(doc.widthOfString(text) + pad * 2 + 4);
  return Math.min(totalW - minValueW, Math.max(12, naturalW));
}

function labelValueRow(doc, y, specs, h = 18) {
  let cx = M;
  specs.forEach((s) => {
    const totalW = s.lw + s.vw;
    const labelSize = s.labelSize || 7.1;
    const labelW = fittedLabelWidth(doc, s.label, s.lw, s.vw, { size: labelSize });
    const valueW = totalW - labelW;
    cell(doc, cx, y, labelW, h, s.label, { bold: true, size: labelSize });
    cell(doc, cx + labelW, y, valueW, h, s.value, { size: s.valueSize || 7.2 });
    cx += totalW;
  });
}

function sectionTitle(doc, title, y) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.title);
  doc.text(title, M, y, { width: CONTENT_W, lineBreak: false });
  doc.moveTo(M, y + 13).lineTo(PAGE_W - M, y + 13).strokeColor(LINE).lineWidth(0.55).stroke();
  return y + 19;
}

function header(doc, options) {
  const y = 24;
  if (LOGOS.isro) doc.image(LOGOS.isro, M + 2, y, { fit: [58, 50], align: 'center', valign: 'center' });
  const rightLogo = options.logo === 'nabl' ? LOGOS.nabl : LOGOS.sac;
  if (rightLogo) doc.image(rightLogo, PAGE_W - M - 62, y, { fit: [58, 50], align: 'center', valign: 'center' });

  const cx = M + 70;
  const cw = CONTENT_W - 140;
  doc.font('Helvetica-Bold').fontSize(8.8).fillColor(COLORS.title);
  options.headerLines.forEach((line, i) => {
    doc.text(line, cx, y + i * 10, { width: cw, align: 'center', lineBreak: false });
  });
  doc.font('Helvetica-Bold').fontSize(14)
    .text('CALIBRATION CERTIFICATE', M, y + 68, { width: CONTENT_W, align: 'center' });
  return y + 92;
}

function drawFooter(doc, payload, y, pageNo, totalPages) {
  doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor(LINE).lineWidth(0.55).stroke();
  const parts = [
    { text: `Document No. ${jcCode(payload)}`, width: 94 },
    { text: `Revised on ${longDate(payload.created_at || payload.jc_recd_date)}`, width: 116 },
    { text: 'Form No: FR/GN/10', width: 78 },
    { text: 'Issue No: 01', width: 62 },
    { text: 'Rev: 01', width: 44 },
    { text: `Page ${pageNo} of ${totalPages}`, width: 62 },
    { text: 'SAC, ISRO, Ahmedabad', width: CONTENT_W - 456 },
  ];
  let x = M;
  doc.font('Helvetica').fontSize(6.1).fillColor(COLORS.title);
  parts.forEach((part) => {
    doc.text(part.text, x, y + 8, {
      width: part.width,
      height: 9,
      lineBreak: false,
      ellipsis: true,
    });
    x += part.width;
  });
}

function taskTypeKey(row) {
  return clean(row.task_type || row.master_task_type)
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function filteredTasks(payload, variant) {
  const rows = payload.children?.certificate_tasks || payload.children?.tasks || [];
  if (variant === 'all') return rows;
  return rows.filter((row) => {
    const key = taskTypeKey(row);
    if (variant === 'nabl') return key === 'NABL' || key === 'BOTH';
    if (variant === 'non-nabl') return key === 'NONNABL' || key === 'BOTH';
    return true;
  });
}

function standardsText(row) {
  return [
    row.equipment_name,
    row.equipment_id,
  ].map(clean).filter(Boolean).join(' - ');
}

function renderTmeCalibrationCertificate(payload, stream, options) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: M,
    bufferPages: true,
    autoFirstPage: true,
  });
  doc.pipe(stream);

  let currentPage = 1;
  function newPage() {
    doc.addPage();
    currentPage += 1;
    return PAGE_TOP_Y;
  }

  function ensure(yPos, h) {
    return yPos + h > CONTENT_BOTTOM_Y ? newPage() : yPos;
  }

  let y = header(doc, options);

  y = ensure(y, 20);
  labelValueRow(doc, y, [
    { label: 'Certificate No.', value: options.certificateNo || jcCode(payload), lw: 86, vw: 166 },
    { label: 'ULR No.', value: payload.ulr_no || payload.cal_ulr_no, lw: 64, vw: CONTENT_W - 86 - 166 - 64 },
  ]);
  y += 26;

  y = ensure(y, 19 + 18 * 4);
  y = sectionTitle(doc, 'CALIBRATION INFORMATION', y);
  labelValueRow(doc, y, [
    { label: 'Equipment Received Date', value: dateText(payload.repair_job_received_date || payload.equipment_received_date_actual || payload.jc_recd_date), lw: 142, vw: 112 },
    { label: 'Certificate Issue Date', value: dateText(payload.verified_closed_at || payload.cal_incharge_date || payload.updated_at), lw: 128, vw: CONTENT_W - 142 - 112 - 128 },
  ]);
  y += 18;
  labelValueRow(doc, y, [
    { label: 'Date(s) of Calibration', value: dateText(payload.cal_job_completed_date || payload.job_end_date), lw: 128, vw: 126 },
    { label: 'Calibration Due Date', value: dateText(payload.cal_due_date), lw: 118, vw: CONTENT_W - 128 - 126 - 118 },
  ]);
  y += 18;
  labelValueRow(doc, y, [
    { label: 'Job Number', value: jcCode(payload), lw: 78, vw: 176 },
    { label: 'Procedure Reference', value: payload.cal_ref_no, lw: 124, vw: CONTENT_W - 78 - 176 - 124 },
  ]);
  y += 18;
  labelValueRow(doc, y, [
    { label: 'Calibration Location', value: 'SAC, ISRO, Ahmedabad', lw: 120, vw: CONTENT_W - 120 },
  ]);
  y += 25;

  y = ensure(y, 19 + 18 * 5);
  y = sectionTitle(doc, 'EQUIPMENT DESCRIPTION', y);
  [
    ['Equipment ID', equipmentId(payload)],
    ['Equipment Name', payload.equipment_name],
    ['Make', payload.equipment_make],
    ['Model Number', firstText(payload.equipment_model_no, payload.equipment_mfg_model_name)],
    ['Serial Number', payload.equipment_serial_no],
  ].forEach(([label, value]) => {
    labelValueRow(doc, y, [{ label, value, lw: 96, vw: CONTENT_W - 96 }]);
    y += 18;
  });
  y += 8;

  y = ensure(y, 19 + 20);
  y = sectionTitle(doc, 'ACCESSORIES', y);
  let widths = [34, 262, 100, CONTENT_W - 34 - 262 - 100];
  ['Sr. No.', 'Accessory Description', 'Model No.', 'Serial No.'].forEach((h, i) => {
    cell(doc, M + widths.slice(0, i).reduce((a, b) => a + b, 0), y, widths[i], 20, h, { bold: true, align: i === 0 ? 'center' : 'left' });
  });
  y += 20;
  (payload.children?.parent_accessories || []).forEach((row, idx) => {
    if (y + 22 > CONTENT_BOTTOM_Y) y = newPage();
    const values = [idx + 1, firstText(row.name, row.type), row.model_no, row.serial_no];
    let cx = M;
    values.forEach((v, i) => {
      cell(doc, cx, y, widths[i], 22, v, { size: 6.9, align: i === 0 ? 'center' : 'left' });
      cx += widths[i];
    });
    y += 22;
  });
  y += 8;

  y = ensure(y, 19 + 18 * 3);
  y = sectionTitle(doc, 'CUSTOMER INFORMATION', y);
  labelValueRow(doc, y, [
    { label: 'Submitted By', value: payload.jr_submitter_name, lw: 90, vw: 164 },
    { label: 'Division', value: payload.division_code || payload.division_name, lw: 68, vw: CONTENT_W - 90 - 164 - 68 },
  ]);
  y += 18;
  labelValueRow(doc, y, [
    { label: 'Group', value: payload.jr_subsystem, lw: 54, vw: 200 },
    { label: 'Project', value: payload.jr_project_name, lw: 64, vw: CONTENT_W - 54 - 200 - 64 },
  ]);
  y += 18;
  labelValueRow(doc, y, [
    { label: 'Phone (Lab)', value: payload.jr_lab_phone, lw: 76, vw: 178 },
    { label: 'Phone (Room)', value: payload.jr_room_phone, lw: 86, vw: CONTENT_W - 76 - 178 - 86 },
  ]);
  y += 25;

  y = ensure(y, 19 + 18);
  y = sectionTitle(doc, 'ENVIRONMENTAL CONDITIONS', y);
  labelValueRow(doc, y, [
    { label: 'Temperature', value: payload.cal_temperature_c, lw: 86, vw: 168 },
    { label: 'Relative Humidity', value: payload.cal_relative_humidity, lw: 116, vw: CONTENT_W - 86 - 168 - 116 },
  ]);
  y += 25;

  y = ensure(y, 19 + 20);
  y = sectionTitle(doc, 'STANDARDS USED', y);
  widths = [44, 174, 142, 102, CONTENT_W - 44 - 174 - 142 - 102];
  ['ID', 'Standard Used', 'Make / Model', 'Calibrated At', 'Validity'].forEach((h, i) => {
    cell(doc, M + widths.slice(0, i).reduce((a, b) => a + b, 0), y, widths[i], 20, h, { bold: true, align: i === 0 ? 'center' : 'left' });
  });
  y += 20;
  (payload.children?.calibration_equipment || []).forEach((row, idx) => {
    if (y + 22 > CONTENT_BOTTOM_Y) y = newPage();
    const values = [row.equipment_id || idx + 1, standardsText(row), '', 'SAC', ''];
    let cx = M;
    values.forEach((v, i) => {
      cell(doc, cx, y, widths[i], 22, v, { size: 6.8, align: i === 0 ? 'center' : 'left' });
      cx += widths[i];
    });
    y += 22;
  });
  y += 12;
  doc.font('Helvetica').fontSize(7.2).fillColor(COLORS.title)
    .text('Measurements are traceable to National / International Standards', M, y, { width: CONTENT_W, align: 'center' });

  y = currentPage === 1 ? newPage() : ensure(y, 19 + 20);
  y = sectionTitle(doc, 'PARAMETER CHECK LIST', y);
  widths = [34, CONTENT_W - 34 - 120, 120];
  ['No', 'Parameters Checked', 'Observations / Remarks'].forEach((h, i) => {
    cell(doc, M + widths.slice(0, i).reduce((a, b) => a + b, 0), y, widths[i], 20, h, { bold: true, align: i === 0 ? 'center' : 'left' });
  });
  y += 20;
  filteredTasks(payload, options.variant).forEach((row, idx) => {
    if (y + 22 > CONTENT_BOTTOM_Y) {
      y = newPage();
      y = sectionTitle(doc, 'PARAMETER CHECK LIST (CONTINUED)', y);
      ['No', 'Parameters Checked', 'Observations / Remarks'].forEach((h, i) => {
        cell(doc, M + widths.slice(0, i).reduce((a, b) => a + b, 0), y, widths[i], 20, h, { bold: true, align: i === 0 ? 'center' : 'left' });
      });
      y += 20;
    }
    const values = [idx + 1, firstText(row.master_task_name, row.task_text), row.task_result];
    let cx = M;
    values.forEach((v, i) => {
      cell(doc, cx, y, widths[i], 22, v, { size: 6.9, align: i === 0 ? 'center' : 'left' });
      cx += widths[i];
    });
    y += 22;
  });
  y += 10;

  y = ensure(y, 19 + 20);
  y = sectionTitle(doc, 'ADJUSTMENT DETAILS', y);
  widths = [34, 110, 78, 104, 95, CONTENT_W - 34 - 110 - 78 - 104 - 95];
  ['Sr.No.', 'Parameter', 'Test Value', 'Specification / Limits', 'Before Adjustment', 'After Adjustment'].forEach((h, i) => {
    cell(doc, M + widths.slice(0, i).reduce((a, b) => a + b, 0), y, widths[i], 20, h, { bold: true, size: 6.8 });
  });
  y += 20;
  (payload.children?.calibration_adjustments || []).forEach((row) => {
    if (y + 22 > CONTENT_BOTTOM_Y) y = newPage();
    const values = [row.sr_no, row.parameter_name, row.test_value, row.specifications_limits, row.observation_before, row.observation_after];
    let cx = M;
    values.forEach((v, i) => {
      cell(doc, cx, y, widths[i], 22, v, { size: 6.6 });
      cx += widths[i];
    });
    y += 22;
  });
  y += 10;

  y = ensure(y, 126);
  doc.font('Helvetica-Bold').fontSize(7.3).fillColor(COLORS.title)
    .text('Detailed Observation Report of ______ pages for above parameters are attached.', M, y, { width: CONTENT_W });
  y += 22;
  y = sectionTitle(doc, 'NOTES', y);
  cell(doc, M, y, CONTENT_W, 54, [
    '1. The result in this report refers only to this particular item submitted for calibration.',
    '2. This report shall not be reproduced except in full without written approval from HEAD TIMCD.',
    '3. The calibration results recorded in this report are valid at the time and under the stated conditions of measurements.',
    '4. Confidence level is approximately 95% and coverage factor k=2.',
  ].join('\n'), { size: 6.8 });
  y += 64;
  y = ensure(y, 19 + 30 + 42 + 18 + 64);
  y = sectionTitle(doc, 'REMARKS', y);
  cell(doc, M, y, CONTENT_W, 30, firstText(payload.cal_remarks, 'Performance of the Equipment is within the specifications.'), { size: 7 });
  y += 42;
  y = ensure(y, 22 + 18 + 64);
  doc.font('Helvetica-Bold').fontSize(7.1).text('Observation with calculation of expanded uncertainty is available with CAL LAB and will be provided on request.', M, y, { width: CONTENT_W });
  y += 22;
  y = ensure(y, 18 + 64);
  labelValueRow(doc, y, [{ label: 'Calibration Status', value: firstText(payload.cal_calibration_status, 'VALID CAL'), lw: 108, vw: CONTENT_W - 108 }]);
  y += 46;
  y = ensure(y, 58);
  doc.font('Helvetica').fontSize(7.3);
  ['CALIBRATED BY', 'REVIEWED BY', 'AUTHORISED BY'].forEach((label, i) => {
    const x = M + (CONTENT_W / 3) * i;
    doc.text('Sign:', x, y, { width: CONTENT_W / 3, align: 'center' });
    doc.text(label, x, y + 36, { width: CONTENT_W / 3, align: 'center' });
  });

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    const pageNo = i - range.start + 1;
    doc.switchToPage(i);
    drawFooter(doc, payload, FOOTER_Y, pageNo, range.count);
  }
  doc.end();
}

module.exports = {
  renderTmeCalibrationCertificate,
};
