'use strict';

// Operational lanes combine the existing Job Category and Job Type fields.
// From: one global LAB_IN_CHARGE / LAB_ENGINEER queue.
// To: four optional row-level lanes for new department-specific roles.
const LANE_CODES = Object.freeze([
  'TME_CAL',
  'TME_REPAIR',
  'FPE_CAL',
  'FPE_REPAIR',
]);

const LANE_BY_CATEGORY_TYPE = Object.freeze({
  TME: Object.freeze({
    CALIBRATION: 'TME_CAL',
    REPAIR: 'TME_REPAIR',
  }),
  FPE: Object.freeze({
    CALIBRATION: 'FPE_CAL',
    REPAIR: 'FPE_REPAIR',
  }),
});

const ROLE_DEFAULT_LANE = Object.freeze({
  TME_REPAIR_LAB_IN_CHARGE: 'TME_REPAIR',
  TME_CAL_LAB_IN_CHARGE: 'TME_CAL',
  FPE_REPAIR_LAB_IN_CHARGE: 'FPE_REPAIR',
  FPE_CAL_LAB_IN_CHARGE: 'FPE_CAL',
  TME_REPAIR_LAB_ENG: 'TME_REPAIR',
  TME_CAL_LAB_ENG: 'TME_CAL',
  FPE_REPAIR_LAB_ENG: 'FPE_REPAIR',
  FPE_CAL_LAB_ENG: 'FPE_CAL',
});

const SCOPED_LAB_IN_CHARGE_ROLES = Object.freeze([
  'TME_REPAIR_LAB_IN_CHARGE',
  'TME_CAL_LAB_IN_CHARGE',
  'FPE_REPAIR_LAB_IN_CHARGE',
  'FPE_CAL_LAB_IN_CHARGE',
]);

const SCOPED_LAB_ENGINEER_ROLES = Object.freeze([
  'TME_REPAIR_LAB_ENG',
  'TME_CAL_LAB_ENG',
  'FPE_REPAIR_LAB_ENG',
  'FPE_CAL_LAB_ENG',
]);

const BASE_ROLE_CODES = Object.freeze([
  'SUPER_ADMIN',
  'LAB_IN_CHARGE',
  'LAB_ENGINEER',
  'NORMAL_USER',
  'VIEW_ONLY',
]);

const ALL_ROLE_CODES = Object.freeze([
  ...BASE_ROLE_CODES,
  ...SCOPED_LAB_IN_CHARGE_ROLES,
  ...SCOPED_LAB_ENGINEER_ROLES,
]);

const MANAGER_ROLES = new Set([
  'SUPER_ADMIN',
  'LAB_IN_CHARGE',
  ...SCOPED_LAB_IN_CHARGE_ROLES,
]);

const ENGINEER_ROLES = new Set([
  'LAB_ENGINEER',
  ...SCOPED_LAB_ENGINEER_ROLES,
]);

function deriveLaneCode(jobCategory, jobType) {
  const cat = jobCategory ? String(jobCategory).toUpperCase() : '';
  const type = jobType ? String(jobType).toUpperCase() : '';
  return LANE_BY_CATEGORY_TYPE[cat]?.[type] || null;
}

function defaultLaneForRole(roleCode) {
  return ROLE_DEFAULT_LANE[roleCode] || null;
}

function normalizeLaneScopes(roleCode, laneScopes) {
  const seen = new Set();
  const out = [];
  const add = (lane) => {
    if (LANE_CODES.includes(lane) && !seen.has(lane)) {
      seen.add(lane);
      out.push(lane);
    }
  };

  if (Array.isArray(laneScopes)) {
    laneScopes.forEach((lane) => add(String(lane || '').trim()));
  } else if (typeof laneScopes === 'string' && laneScopes.trim()) {
    laneScopes.split(',').forEach((lane) => add(lane.trim()));
  }

  // DB rows are the source of truth, but the role code is also deterministic.
  // This fallback keeps newly assigned lane roles safe even if a scope row is
  // missing due to a manual SQL role change outside the application.
  if (out.length === 0) add(defaultLaneForRole(roleCode));
  return out;
}

function actorLaneScopes(actor) {
  if (!actor) return [];
  return normalizeLaneScopes(actor.role, actor.laneScopes);
}

function canAccessLane(actor, laneCode) {
  const scopes = actorLaneScopes(actor);
  if (scopes.length === 0) return true;
  return !!laneCode && scopes.includes(laneCode);
}

function scopeCanAccessLane(scope, laneCode) {
  const scopes = Array.isArray(scope?.laneScopes) ? scope.laneScopes : [];
  if (scopes.length === 0) return true;
  return !!laneCode && scopes.includes(laneCode);
}

function buildLaneWhere(columnSql, laneScopes) {
  const lanes = normalizeLaneScopes(null, laneScopes);
  if (lanes.length === 0) return { sql: '', args: [] };
  return {
    sql: `${columnSql} IN (${lanes.map(() => '?').join(', ')})`,
    args: lanes,
  };
}

function isManagerRole(roleCode) {
  return MANAGER_ROLES.has(roleCode);
}

function isEngineerRole(roleCode) {
  return ENGINEER_ROLES.has(roleCode);
}

module.exports = {
  LANE_CODES,
  BASE_ROLE_CODES,
  ALL_ROLE_CODES,
  SCOPED_LAB_IN_CHARGE_ROLES,
  SCOPED_LAB_ENGINEER_ROLES,
  deriveLaneCode,
  defaultLaneForRole,
  normalizeLaneScopes,
  actorLaneScopes,
  canAccessLane,
  scopeCanAccessLane,
  buildLaneWhere,
  isManagerRole,
  isEngineerRole,
};
