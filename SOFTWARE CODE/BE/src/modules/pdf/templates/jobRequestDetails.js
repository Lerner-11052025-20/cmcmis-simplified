// ============================================================================
// src/modules/pdf/templates/jobRequestDetails.js
// ----------------------------------------------------------------------------
// PDF #3 — JOB REQUEST DETAILS (own design, multi-page)
//
// PHASE 11 — PDF Generation
//
// One professional document per Job Request showing its full lifecycle:
// classification, equipment snapshot, division, submitter snapshot,
// approval / rejection / engineer assignment, linked Job Card summary,
// accessories list, and the chronological status history.
//
// LAYOUT
//   Page 1: ISRO + SAC header → JR-summary band → sections A..G.
//   Multi-page allowed (history can be long; we auto-paginate with the
//   shared header re-drawn at the top of each page via 'pageAdded').
//
//   Sections:
//     A. Classification
//     B. Equipment Snapshot
//     C. Division & Project
//     D. Submitter
//     E. Workflow Actors (Approval / Rejection / Assigned Engineer)
//     F. Linked Job Card
//     G. Accessories
//     H. Status History
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

function formatStatus(status) {
  if (!status) return '—';
  const MAP = {
    DRAFT: 'Draft',
    SUBMITTED: 'Pending For Conversion',
    ASSIGNED: 'Job In Queue',
    IN_PROGRESS: 'Job On Hand',
    COMPLETED: 'Review Pending',
    VERIFIED_CLOSED: 'Completed',
    REJECTED: 'Rejected',
    REOPENED: 'Reopened',
    CANCELLED: 'Cancelled',
  };
  return MAP[status] || status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

// ── Layout helpers (mirror the JC details template) ────────────────────

function sectionBanner(doc, letter, title) {
  const x = PAGE_MARGIN_X;
  const w = doc.page.width - PAGE_MARGIN_X * 2;
  const y = doc.y;
  const h = 16;
  doc.rect(x, y, w, h).fillAndStroke(COLORS.headerBg, COLORS.border);
  doc.fillColor(COLORS.title).font('Helvetica-Bold').fontSize(9.5);
  doc.text(`${letter}. ${title}`, x + 6, y + 3, { lineBreak: false });
  doc.y = y + h + 4;
}

// Flow-disciplined grid (see jobCardDetails.js for the rationale on why we
// MUST NOT use naïve absolute-Y rendering — PDFKit auto-paginates inside
// doc.text() and produces near-empty pages when items overflow).
function gridKV(doc, items, columns = 2) {
  const ROW_H = 30;
  const VALUE_H = 20;
  const x = PAGE_MARGIN_X;
  const w = doc.page.width - PAGE_MARGIN_X * 2;
  const colW = (w - (columns - 1) * 12) / columns;

  let col = 0;
  let rowY = doc.y;
  items.forEach((item) => {
    if (!item) return;
    if (col === 0) {
      ensureRoomFor(doc, ROW_H);
      rowY = doc.y;
    }
    const cx = x + col * (colW + 12);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.inkSoft);
    doc.text(item.label, cx, rowY,
             { width: colW, lineBreak: false, ellipsis: true });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.title);
    doc.text(fmtText(item.value, '—'), cx, rowY + 10,
             { width: colW, height: VALUE_H, lineBreak: true, ellipsis: true });
    col += 1;
    if (col >= columns) {
      col = 0;
      doc.y = rowY + ROW_H;
    }
  });
  if (col > 0) doc.y = rowY + ROW_H;
}

function blockText(doc, label, text) {
  const BLOCK_H = 60;
  const x = PAGE_MARGIN_X;
  const w = doc.page.width - PAGE_MARGIN_X * 2;
  ensureRoomFor(doc, BLOCK_H + 14);

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.inkSoft);
  doc.text(label, x, doc.y, { lineBreak: false });
  const y0 = doc.y + 10;
  doc.lineWidth(0.4).strokeColor(COLORS.border).rect(x, y0, w, BLOCK_H).stroke();
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.title);
  doc.text(fmtText(text, '—'), x + 4, y0 + 3,
           { width: w - 8, height: BLOCK_H - 6, lineBreak: true, ellipsis: true });
  doc.y = y0 + BLOCK_H + 6;
}

function ensureRoomFor(doc, neededHeight) {
  if (doc.y + neededHeight > doc.page.height - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT) {
    doc.addPage();
  }
}

function drawTable(doc, title, columns, rows) {
  const x = PAGE_MARGIN_X;
  const tableW = doc.page.width - PAGE_MARGIN_X * 2;
  const totalRaw = columns.reduce((a, c) => a + c.width, 0);
  const widths = columns.map((c) => (c.width / totalRaw) * tableW);
  const HEADER_H = 18;
  const PAD = 4;

  if (title) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.title);
    doc.text(title, x, doc.y);
    doc.y += 2;
  }
  ensureRoomFor(doc, HEADER_H + 18);
  const hy = doc.y;
  doc.rect(x, hy, tableW, HEADER_H).fillAndStroke(COLORS.headerBg, COLORS.border);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.title);
  let cx = x;
  columns.forEach((c, i) => {
    doc.text(c.header, cx + PAD, hy + 4,
             { width: widths[i] - 2 * PAD, align: c.align || 'left', lineBreak: false });
    cx += widths[i];
  });
  doc.y = hy + HEADER_H;

  if (!rows || rows.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.inkSoft);
    doc.text('No data recorded.', x + 4, doc.y + 3);
    doc.y += 16;
    return;
  }

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.title);
  rows.forEach((row) => {
    let needed = 18;
    columns.forEach((c, i) => {
      const v = c.format ? c.format(row[c.key], row) : (row[c.key] ?? '');
      const chars = String(v).length;
      const cpl = Math.max(8, Math.floor((widths[i] - 2 * PAD) / 4.5));
      const lines = Math.min(4, Math.max(1, Math.ceil(chars / cpl)));
      const h = 6 + lines * 10;
      if (h > needed) needed = h;
    });
    ensureRoomFor(doc, needed);
    const ry = doc.y;
    doc.lineWidth(0.3).strokeColor(COLORS.border).rect(x, ry, tableW, needed).stroke();
    cx = x;
    columns.forEach((c, i) => {
      const v = c.format ? c.format(row[c.key], row) : (row[c.key] ?? '');
      doc.text(String(v ?? ''), cx + PAD, ry + 3, {
        width: widths[i] - 2 * PAD,
        align: c.align || 'left',
        height: needed - 6,
        ellipsis: true,
      });
      cx += widths[i];
    });
    doc.y = ry + needed;
  });
  doc.y += 4;
}

function jrCode(main) {
  const year = main.submitted_at_legacy ? new Date(main.submitted_at_legacy).getUTCFullYear()
              : main.created_at ? new Date(main.created_at).getUTCFullYear()
              : '----';
  return `JR-${year}-${String(main.jr_no || '').padStart(4, '0')}`;
}


// ── MAIN RENDERER ──────────────────────────────────────────────────────

function renderJobRequestDetails(payload, stream, meta = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margin: PAGE_MARGIN_X,
    bufferPages: true,
    autoFirstPage: true,
  });
  doc.pipe(stream);

  // Header on page 1 only. Subsequent pages rely on the stamped footer
  // (docId + Page X of Y) for provenance — re-drawing the full header
  // on every page causes re-entrant rendering inside text() auto-pagination
  // and produces near-empty pages.
  drawHeader(doc, {
    title: 'JOB REQUEST — DETAILS REPORT',
    subtitle: 'CMCMIS · Internal Document',
    compact: true,
  });

  const code = jrCode(payload);
  gridKV(doc, [
    { label: 'Job Request Code', value: code },
    { label: 'Status',           value: formatStatus(payload.status) },
    { label: 'Priority',         value: payload.priority_db },
    { label: 'Submitted On',     value: fmtDate(payload.created_at || payload.submitted_at_legacy) },
    { label: 'Generated On',     value: fmtDateTime(new Date()) },
    { label: 'Generated By',     value: meta.generated_by
        ? `${meta.generated_by.name || meta.generated_by.employee_id || '—'} (${meta.generated_by.role || '—'})`
        : '—' },
    { label: 'Updated At',       value: fmtDateTime(payload.updated_at) },
    { label: 'Status Changed At',value: fmtDateTime(payload.status_at) },
  ], 4);

  // ── A. Classification ─────────────────────────────────────────────
  sectionBanner(doc, 'A', 'Classification');
  gridKV(doc, [
    { label: 'Job Category',          value: payload.job_category },
    { label: 'Job Type',              value: payload.job_type },
    { label: 'Equipment sent after repair?',
      value: (payload.equipment_sent_after_repair === 1 || payload.equipment_sent_after_repair === true) ? 'Yes' : 'No' },
    { label: 'T&C Accepted',
      value: payload.tnc_accepted_at
        ? `Yes (${fmtDateTime(payload.tnc_accepted_at)}, ${payload.tnc_version || 'v1'})`
        : 'No' },
  ], 2);

  // ── B. Equipment Snapshot ─────────────────────────────────────────
  sectionBanner(doc, 'B', 'Equipment Snapshot');
  gridKV(doc, [
    { label: 'Equipment ID',     value: `${payload.equipment_type || ''}-${payload.equipment_id || ''}` },
    { label: 'Equipment Name',   value: payload.equipment_name },
    { label: 'Make',             value: payload.make },
    { label: 'Model No.',        value: payload.model_no },
    { label: 'Serial No.',       value: payload.serial_no },
    { label: 'Options',          value: payload.options_description },
  ], 2);
  if (payload.complaint_description) blockText(doc, 'Complaint / Symptoms', payload.complaint_description);
  if (payload.remarks)               blockText(doc, 'Remarks',              payload.remarks);

  // ── C. Division & Project ─────────────────────────────────────────
  sectionBanner(doc, 'C', 'Division & Project');
  gridKV(doc, [
    { label: 'Division',     value: payload.division_code
        ? `${payload.division_code} — ${payload.division_name || ''}`.trim()
        : payload.division_name },
    { label: 'Sub System',   value: payload.subsystem },
    { label: 'Project Name', value: payload.project_name },
    { label: 'Lab Phone',    value: payload.lab_phone },
    { label: 'Room Phone',   value: payload.room_phone },
  ], 2);

  // ── D. Submitter ──────────────────────────────────────────────────
  sectionBanner(doc, 'D', 'Submitter');
  gridKV(doc, [
    { label: 'Employee ID',  value: payload.submitted_by_employee_id },
    { label: 'Name',         value: payload.submitted_by_name },
    { label: 'Designation',  value: payload.submitted_by_designation },
    { label: 'Email',        value: payload.submitted_by_email },
  ], 2);

  // ── E. Workflow Actors ────────────────────────────────────────────
  sectionBanner(doc, 'E', 'Workflow Actors');

  if (payload.approving_authority_employee_id) {
    const authText = [
      payload.approving_authority_name
        ? `${payload.approving_authority_name} (${payload.approving_authority_employee_id})`
        : payload.approving_authority_employee_id,
      payload.approving_authority_designation,
      payload.approving_authority_egd_name,
      payload.approving_authority_email,
      payload.approving_authority_telephone ? `Tel: ${payload.approving_authority_telephone}` : null,
      payload.approving_authority_lab_telephone ? `Lab: ${payload.approving_authority_lab_telephone}` : null,
    ].filter(Boolean).join('  |  ');
    
    gridKV(doc, [
      { label: 'Approving Authority', value: authText },
    ], 1);
  }

  gridKV(doc, [
    { label: 'Approved By',           value: payload.approved_by_employee_id
        ? `${payload.approved_by_name || ''} (${payload.approved_by_employee_id})` : '—' },
    { label: 'Approved At',           value: fmtDateTime(payload.approved_at) },
    { label: 'Rejected By',           value: payload.rejected_by_employee_id
        ? `${payload.rejected_by_name || ''} (${payload.rejected_by_employee_id})` : '—' },
    { label: 'Rejected At',           value: fmtDateTime(payload.rejected_at) },
    { label: 'Assigned Engineer',     value: payload.assigned_engineer_employee_id
        ? `${payload.assigned_engineer_name || ''} (${payload.assigned_engineer_employee_id})` : '—' },
  ], 2);
  if (payload.rejection_reason) blockText(doc, 'Rejection Reason', payload.rejection_reason);

  // ── F. Linked Job Card ────────────────────────────────────────────
  sectionBanner(doc, 'F', 'Linked Job Card');
  if (payload.linked_job_card_section_no) {
    gridKV(doc, [
      { label: 'Section Job No.',      value: payload.linked_job_card_section_no },
      { label: 'JC No.',               value: payload.linked_job_card_no },
      { label: 'Status',               value: formatStatus(payload.linked_job_card_status) },
      { label: 'Workflow Type',        value: payload.linked_job_card_workflow_type },
      { label: 'Target Completion',    value: fmtDate(payload.linked_job_card_target_end_date) },
      { label: 'JC Created At',        value: fmtDateTime(payload.linked_job_card_created_at) },
    ], 2);
  } else {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.inkSoft);
    doc.text('No Job Card linked to this request yet.', PAGE_MARGIN_X + 4, doc.y);
    doc.y += 14;
  }

  // ── G. Accessories ────────────────────────────────────────────────
  sectionBanner(doc, 'G', `Accessories (${(payload.children?.accessories || []).length} entries)`);
  drawTable(doc, null, [
    { header: '#',         key: 'position',  width: 30, align: 'right' },
    { header: 'Type',      key: 'type',      width: 110 },
    { header: 'Name',      key: 'name',      width: 220 },
    { header: 'Serial No.',key: 'serial_no', width: 140 },
  ], payload.children?.accessories || []);

  // ── H. Status History ─────────────────────────────────────────────
  sectionBanner(doc, 'H', `Status Transition History (${(payload.children?.history || []).length} entries)`);
  drawTable(doc, null, [
    { header: 'From',          key: 'from_status',     width: 100, format: formatStatus },
    { header: 'To',            key: 'to_status',       width: 100, format: formatStatus },
    { header: 'When',          key: 'transitioned_at', width: 130, format: fmtDateTime },
    { header: 'By',            key: 'transitioned_by', width: 100 },
    { header: 'Reason',        key: 'reason',          width: 170 },
  ], payload.children?.history || []);

  stampPageNumbers(doc, { docId: code });
  doc.end();
}


module.exports = {
  renderJobRequestDetails,
};
