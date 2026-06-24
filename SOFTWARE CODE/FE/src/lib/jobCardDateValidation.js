const DATE_ORDER_PAIRS = [
  {
    start: 'equipment_submitted_date',
    end: 'equipment_received_date_actual',
    startLabel: 'Equipment Submitted Date',
    endLabel: 'Equipment Received Date',
  },
  {
    start: 'instrument_received_date',
    end: 'job_complete_planned_date',
    startLabel: 'Instrument Received Date',
    endLabel: 'Job Complete Planned Date',
  },
  {
    start: 'repair_job_received_date',
    end: 'repair_job_start_planned_date',
    startLabel: 'Job Received Date',
    endLabel: 'Job Start Planned Date',
  },
  {
    start: 'repair_job_start_planned_date',
    end: 'job_complete_planned_date',
    startLabel: 'Job Start Planned Date',
    endLabel: 'Job Complete Planned Date',
  },
  {
    start: 'repair_job_start_planned_date',
    end: 'repair_job_complete_date',
    startLabel: 'Job Start Date',
    endLabel: 'Job Complete Date',
  },
  {
    start: 'awaiting_from_date',
    end: 'awaiting_restarting_date',
    startLabel: 'Awaiting From Date',
    endLabel: 'Restarting Date',
  },
  {
    start: 'awaiting_from_date',
    end: 'awaiting_clear_date',
    startLabel: 'Awaiting From Date',
    endLabel: 'Awaiting Clear Date',
  },
  {
    start: 'awaiting_restarting_date',
    end: 'awaiting_clear_date',
    startLabel: 'Restarting Date',
    endLabel: 'Awaiting Clear Date',
  },
  {
    start: 'intimation_sent_on',
    end: 'sent_to_vendor_date',
    startLabel: 'Intimation Sent On',
    endLabel: 'Sent To Vendor Date',
  },
  {
    start: 'sent_to_vendor_date',
    end: 'received_from_vendor_date',
    startLabel: 'Sent To Vendor Date',
    endLabel: 'Received From Vendor Date',
  },
  {
    start: 'invoice_recd_on',
    end: 'repair_invoice_cleared_on',
    startLabel: 'Invoice Received On',
    endLabel: 'Invoice Cleared On',
  },
  {
    start: 'cal_job_started_date',
    end: 'cal_job_completed_date',
    startLabel: 'Job Start Date',
    endLabel: 'Job Complete Date',
  },
  {
    start: 'cal_sent_to_lab_date',
    end: 'cal_received_from_lab_date',
    startLabel: 'Sent To Lab Date',
    endLabel: 'Received From Lab Date',
  },
];

function dateOnly(value) {
  if (value == null || value === '') return '';
  return String(value).slice(0, 10);
}

export function validateJobCardDateOrder(values, fieldNames = []) {
  const fields = new Set(fieldNames);
  const scopedPairs = DATE_ORDER_PAIRS.filter((pair) => fields.has(pair.start) && fields.has(pair.end));

  return scopedPairs
    .map((pair) => {
      const start = dateOnly(values[pair.start]);
      const end = dateOnly(values[pair.end]);
      if (!start || !end || start <= end) return null;
      return {
        ...pair,
        message: `${pair.startLabel} must be on or before ${pair.endLabel}.`,
      };
    })
    .filter(Boolean);
}

export function dateOrderFieldNames(fieldNames = []) {
  const fields = new Set(fieldNames);
  return DATE_ORDER_PAIRS
    .filter((pair) => fields.has(pair.start) || fields.has(pair.end))
    .flatMap((pair) => [pair.start, pair.end]);
}
