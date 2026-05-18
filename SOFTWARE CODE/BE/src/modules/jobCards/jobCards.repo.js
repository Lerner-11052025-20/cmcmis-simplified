// ============================================================================
// src/modules/jobCards/jobCards.repo.js  —  DAL for cmms_jobcard_mst (read-only)
// ----------------------------------------------------------------------------
// ONLY file in the jobCards module that contains SQL. Slice 1 is read-only
// list. Joins to:
//   cmms_jobrequest_mst — for JR_JOBREQUESTNO + JR_JOBREQUESTDATE + JR_ASSIGNED_ENGINEER
//   cmms_eqip_mst       — for equipment_name
//   cmms_emp_mst        — for assigned_engineer_name (LEFT JOIN keyed on JR_ASSIGNED_ENGINEER)
//
// All canonical aliases applied here. Service / controller never see
// JM_* / JR_* names.
// ============================================================================

'use strict';

const pool = require('../../config/db');

const SORT_MAP = {
  '-created_at': 'jc.JM_CREATED_ON DESC, jc.JM_JobCardNO DESC',
  'created_at':  'jc.JM_CREATED_ON ASC, jc.JM_JobCardNO ASC',
  '-due_date':   'jc.JM_PlannedComletedDate DESC, jc.JM_JobCardNO DESC',
  'due_date':    'jc.JM_PlannedComletedDate ASC, jc.JM_JobCardNO ASC',
  'card_code':   'jc.JM_JCRecdDate ASC, jc.JM_JobCardNO ASC',
  '-card_code':  'jc.JM_JCRecdDate DESC, jc.JM_JobCardNO DESC',
};

async function listJobCards(params) {
  const where = [];
  const args = [];

  if (params.q) {
    where.push(`(
      jc.JM_JobCardNO   LIKE ?
      OR jc.JM_SectionJobNo LIKE ?
      OR e.EQM_NAME     LIKE ?
      OR emp.EMM_NAME   LIKE ?
    )`);
    const like = `%${params.q}%`;
    args.push(like, like, like, like);
  }

  if (params.status) {
    where.push('jc.JM_MVP_STATUS = ?');
    args.push(params.status);
  }

  if (params.assigned_engineer_id) {
    where.push('jr.JR_ASSIGNED_ENGINEER = ?');
    args.push(params.assigned_engineer_id);
  }

  if (params.date_from) {
    where.push('jc.JM_CREATED_ON >= ?');
    args.push(params.date_from + ' 00:00:00');
  }
  if (params.date_to) {
    where.push('jc.JM_CREATED_ON <= ?');
    args.push(params.date_to + ' 23:59:59');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = SORT_MAP[params.sort] || SORT_MAP['-created_at'];
  const offset = (params.page - 1) * params.page_size;

  const dataSql = `
    SELECT
      jc.JM_JobCardNO                AS jc_no,
      jc.JM_SectionJobNo             AS section_job_no,
      jc.JM_JCRecdDate               AS recd_date,
      jc.JM_JobStartDate             AS start_date,
      jc.JM_PlannedComletedDate      AS due_date,
      jc.JM_JobEndDate               AS completed_at,
      jc.JM_CREATED_ON               AS created_at,
      jc.JM_UPDATED_ON               AS updated_at,
      jc.JM_MVP_STATUS               AS status,
      jc.JM_EQM_ID                   AS equipment_id,
      jc.JM_EQM_TYPE                 AS equipment_type,
      e.EQM_NAME                     AS equipment_name,
      jr.JR_JOBREQUESTNO             AS jr_no,
      jr.JR_JOBREQUESTDATE           AS jr_date,
      jr.JR_ASSIGNED_ENGINEER        AS engineer_employee_id,
      emp.EMM_NAME                   AS engineer_name
    FROM cmms_jobcard_mst jc
    LEFT JOIN cmms_eqip_mst    e   ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
    LEFT JOIN cmms_jobrequest_mst jr ON jr.JR_SECTIONJOB_NO = jc.JM_SectionJobNo
    LEFT JOIN cmms_emp_mst     emp ON emp.EMM_ID = jr.JR_ASSIGNED_ENGINEER
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`;

  // IMPORTANT: countSql must mirror dataSql's JOIN tree exactly. The WHERE
  // clause can reference e.EQM_NAME (equipment search) and emp.EMM_NAME
  // (engineer search), so both LEFT JOINs are required here too — otherwise
  // a search hits "Unknown column 'e.EQM_NAME' in 'where clause'".
  const countSql = `
    SELECT COUNT(*) AS n
    FROM cmms_jobcard_mst jc
    LEFT JOIN cmms_eqip_mst       e   ON e.EQM_TYPE = jc.JM_EQM_TYPE AND e.EQM_ID = jc.JM_EQM_ID
    LEFT JOIN cmms_jobrequest_mst jr  ON jr.JR_SECTIONJOB_NO = jc.JM_SectionJobNo
    LEFT JOIN cmms_emp_mst        emp ON emp.EMM_ID = jr.JR_ASSIGNED_ENGINEER
    ${whereSql}`;

  const [[rows], [countRows]] = await Promise.all([
    pool.query(dataSql, [...args, params.page_size, offset]),
    pool.query(countSql, args),
  ]);

  return { rows, total: countRows[0].n };
}

module.exports = { listJobCards };
