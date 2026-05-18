// ============================================================================
// src/modules/jobCards/jobCards.service.js  —  Business logic
// ----------------------------------------------------------------------------
// Slice 1 has just one function: paginated list. Mirrors the shape of
// jobRequests.service.listJobRequests for FE consistency.
// ============================================================================

'use strict';

const dayjs = require('dayjs');
const repo = require('./jobCards.repo');
const { formatJcCode, formatJrCode } = require('../../utils/jrCodeGenerator');

async function listJobCards(params /* scope ignored: slice 1 has no row-level filter */) {
  const { rows, total } = await repo.listJobCards(params);

  const items = rows.map((r) => ({
    id:                     r.jc_no,
    card_code:              formatJcCode(r.jc_no, r.recd_date || r.created_at),
    section_job_no:         r.section_job_no || null,
    job_request_id:         r.jr_no || null,
    job_request_code:       r.jr_no ? formatJrCode(r.jr_no, r.jr_date) : null,
    equipment_id:           r.equipment_id ? `${r.equipment_type}-${r.equipment_id}` : null,
    equipment_name:         r.equipment_name || null,
    assigned_engineer_id:   r.engineer_employee_id || null,
    assigned_engineer_name: r.engineer_name || null,
    status:                 r.status,
    start_date:             r.start_date  ? dayjs(r.start_date).format('YYYY-MM-DD') : null,
    due_date:               r.due_date    ? dayjs(r.due_date).format('YYYY-MM-DD')   : null,
    completed_at:           r.completed_at? dayjs(r.completed_at).format('YYYY-MM-DD'): null,
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
    applied_filters: {
      q: params.q || null,
      status: params.status || null,
      assigned_engineer_id: params.assigned_engineer_id || null,
      date_from: params.date_from || null,
      date_to: params.date_to || null,
      sort: params.sort,
    },
  };
}

module.exports = { listJobCards };
