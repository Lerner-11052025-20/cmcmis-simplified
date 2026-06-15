// ============================================================================
// pages/jobCards/tabs/OverviewTabs.jsx
// ----------------------------------------------------------------------------
// Read-only overview tabs shared by normal, calibration, and repair job cards.
// ============================================================================

function display(value, fallback = '-') {
  return value == null || value === '' ? fallback : value;
}

function categoryLabel(value) {
  if (value === 'TME') return 'T&ME';
  if (value === 'FPE') return 'F&PE';
  return display(value);
}

function workTypeLabel(value) {
  if (value === 'CALIBRATION') return 'Calibration';
  if (value === 'REPAIR') return 'Repair';
  return display(value);
}

function equipmentCode(equipment) {
  if (!equipment?.type || equipment?.id == null) return '-';
  return `EQ-${equipment.type}-${String(equipment.id).padStart(4, '0')}`;
}

function frequencyText(value) {
  if (!value) return '-';
  return `${value} month${String(value) === '1' ? '' : 's'}`;
}

function calibrationFrequencyText(equipment) {
  if (equipment?.calibration_frequency != null && equipment.calibration_frequency !== '') {
    return equipment.calibration_frequency;
  }
  return frequencyText(equipment?.calibration_frequency_months);
}

function StatusBadge({ children, tone = 'accent' }) {
  const cls = tone === 'green'
    ? 'bg-emerald-100 text-emerald-700'
    : tone === 'amber'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-accent/10 text-accent';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function DetailCard({ title, tone = 'neutral', children }) {
  const cls = tone === 'planning'
    ? 'border-blue-200 bg-blue-50/50'
    : 'border-slate-200 bg-slate-50';
  return (
    <section className={`rounded-lg border ${cls} p-5 md:p-6`}>
      <h2 className={`mb-6 text-sm font-semibold uppercase tracking-wider ${tone === 'planning' ? 'text-indigo-600' : 'text-slate-600'}`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoItem({ label, value, highlight = false, badge = null }) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div
        className={`mt-1 text-base font-semibold ${highlight ? 'text-indigo-600' : 'text-slate-950'}`}
        style={{ color: highlight ? '#4F5DFF' : '#111827' }}
      >
        {display(value)}
        {badge ? <span className="ml-2 align-middle">{badge}</span> : null}
      </div>
    </div>
  );
}

export function InformationTab({ jc }) {
  return (
    <DetailCard title="Information">
      <div className="grid grid-cols-1 gap-x-10 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
        <InfoItem label="Job Card ID" value={jc.card_code} highlight />
        <InfoItem label="Section Job No." value={jc.section_job_no} />
        <InfoItem label="Job Request ID" value={jc.parent_jr_code} highlight />
        <InfoItem label="Category" value={categoryLabel(jc.job_category)} />
        <InfoItem label="Work Type" value={workTypeLabel(jc.work_type)} />
        <InfoItem label="Workflow Type" value={jc.workflow_type} />
        <InfoItem label="Status" value={jc.status} badge={<StatusBadge>{jc.status}</StatusBadge>} />
        <InfoItem label="Assigned To" value={jc.assigned_engineer?.name || jc.assigned_engineer?.employee_id} />
        <InfoItem label="Division" value={jc.division?.name || jc.division?.code} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="text-sm font-medium text-slate-500">Complaint / Work Description</div>
          <p className="mt-2 min-h-20 rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-950">
            {display(jc.complaint_description)}
          </p>
        </div>
        <div>
          <div className="text-sm font-medium text-slate-500">Special Instructions</div>
          <p className="mt-2 min-h-20 rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-950">
            {display(jc.special_instructions)}
          </p>
        </div>
      </div>
    </DetailCard>
  );
}

export function EquipmentDetailsTab({ jc }) {
  const e = jc.equipment || {};
  return (
    <DetailCard title="Equipment Details">
      <div className="grid grid-cols-1 gap-x-12 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
        <InfoItem label="Equipment ID" value={equipmentCode(e)} highlight />
        <InfoItem label="Equipment Name" value={e.name} />
        <InfoItem label="Make / Manufacturer" value={e.make} />
        <InfoItem label="Model No." value={e.model_no} />
        <InfoItem label="Serial No." value={e.serial_no} />
        <InfoItem label="Equipment Type" value={e.equipment_type || e.type} />
        <InfoItem label="Category" value={categoryLabel(e.category)} />
        <InfoItem label="Division" value={e.division || jc.division?.name || jc.division?.code} />
        <InfoItem label="Calibration Frequency" value={calibrationFrequencyText(e)} />
        <InfoItem label="Last Calibration Date" value={e.last_calibration_date} />
      </div>
    </DetailCard>
  );
}

export function ConversionPlanningDetailsTab({ jc }) {
  return (
    <DetailCard title="Conversion & Planning Details" tone="planning">
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
        <InfoItem label="Job Request Received Date" value={jc.job_request_received_date} />
        <InfoItem label="Equipment Received Date" value={jc.jc_recd_date} />
        <InfoItem label="Conversion Date" value={jc.conversion_date} />
        <InfoItem label="Assigned To" value={jc.assigned_engineer?.name || jc.assigned_engineer?.employee_id} />
        <InfoItem
          label="Planned Start Date"
          value={jc.planned_start_date}
          badge={jc.planned_start_date ? <StatusBadge tone="green">Planned</StatusBadge> : null}
        />
        <InfoItem
          label="Planned Completion Date"
          value={jc.planned_completed_date}
          badge={jc.planned_completed_date ? <StatusBadge tone="amber">Target</StatusBadge> : null}
        />
      </div>
    </DetailCard>
  );
}
