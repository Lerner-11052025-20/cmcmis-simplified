const CATEGORY_LABELS = {
  TME: 'T&ME',
  FPE: 'F&PE',
};

const TYPE_LABELS = {
  CALIBRATION: 'Calibration',
  REPAIR: 'Repair',
  REGISTRATION: 'Registration',
};

const LANE_LABELS = {
  TME_CAL: 'T&ME Calibration',
  TME_REPAIR: 'T&ME Repair',
  FPE_CAL: 'F&PE Calibration',
  FPE_REPAIR: 'F&PE Repair',
};

export function formatJobCategoryType(row = {}) {
  const laneLabel = LANE_LABELS[row.lane_code];
  if (laneLabel) return laneLabel;

  const category = CATEGORY_LABELS[row.job_category] || row.job_category;
  const rawType = row.job_type || row.work_type;
  const type = TYPE_LABELS[rawType] || rawType;

  if (category && type) return `${category} ${type}`;
  return type || category || null;
}
