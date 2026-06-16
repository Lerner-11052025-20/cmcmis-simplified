// ============================================================================
// pages/jobCards/tabs/CalibrationWorkflowTabs.jsx
// ----------------------------------------------------------------------------
// Dedicated TME/FPE calibration workflow tabs.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';

import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { useCalibrationPeople } from '../../../lib/hooks/useCalibrationPeople.js';
import { searchEquipment } from '../../../lib/api/lookups.js';
import {
  useCalibrationAdjustmentRows,
  useCalibrationEquipmentRows,
  invalidateCalibrationAdjustmentRows,
  invalidateCalibrationEquipmentRows,
} from '../../../lib/hooks/useCalibrationRows.js';
import { useJobCardDocuments, invalidateJobCardDocuments } from '../../../lib/hooks/useJobCardDocuments.js';
import { useJobCardTasks } from '../../../lib/hooks/useJobCardTasks.js';
import {
  addCalibrationAdjustmentRow,
  addCalibrationEquipmentRow,
  deleteCalibrationAdjustmentRow,
  deleteCalibrationEquipmentRow,
  jobCardDocumentDownloadUrl,
  markCompleteJobCard,
  patchCalibrationAdjustmentRow,
  patchCalibrationEquipmentRow,
  patchJobCardTab,
  uploadJobCardDocument,
  deleteJobCardDocument,
} from '../../../lib/api/jobCards.js';
import {
  CALIBRATION_ADJUSTMENT_LABELS,
  CALIBRATION_ADJUSTMENT_OPTIONS,
  CALIBRATION_STATUS_LABELS,
  CALIBRATION_STATUS_OPTIONS,
  EQUIPMENT_RECEIVED_STATUS_LABELS,
  EQUIPMENT_RECEIVED_STATUS_OPTIONS,
  jobCardMarkCompleteSchema,
} from '../../../lib/schemas/jobCardSchemas.js';
import { TabSaveBar } from '../components/TabSaveBar.jsx';
import { ClosureTab } from './ClosureTab.jsx';
import { todayIstIsoDate } from '../../../lib/time.js';

function Label({ htmlFor, children, required = false }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink-soft mb-2">
      {children} {required ? <span className="text-danger">*</span> : null}
    </label>
  );
}

function textAreaClass(extra = '') {
  return [
    'block w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-card',
    'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50',
    extra,
  ].join(' ');
}

function useCalibrationTabForm({ jc, fieldNames, canWrite, invalidateAll, refetch }) {
  const defaults = useMemo(() => {
    const out = {};
    for (const f of fieldNames) out[f] = jc[f] == null ? '' : jc[f];
    return out;
  }, [jc, fieldNames]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty, dirtyFields, isSubmitting },
    reset,
  } = useForm({ defaultValues: defaults });

  // Reset only when the server snapshot changes, so typing is not interrupted
  // by local re-renders while auto-save is pending.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reset(defaults); }, [jc.updated_at]);

  const getDirtyValues = useCallback(() => {
    const values = watch();
    const out = {};
    for (const f of fieldNames) {
      if (dirtyFields[f]) out[f] = values[f];
    }
    return out;
  }, [dirtyFields, fieldNames, watch]);

  async function manualSave() {
    const values = getDirtyValues();
    if (Object.keys(values).length === 0) return;
    await patchJobCardTab(jc.section_job_no, values);
    invalidateAll();
    if (refetch) refetch();
  }

  return {
    registerField: register,
    watch,
    setValue,
    saveBar: (
      <TabSaveBar
        saving={isSubmitting}
        dirty={isDirty}
        onSave={handleSubmit(manualSave)}
        disabled={!canWrite}
        disabledReason={!canWrite ? `Cannot save: status is ${jc.status}` : null}
      />
    ),
  };
}

function PeopleSelect({ id, disabled, registerField, name, placeholder = 'Select employee...' }) {
  const { items, loading } = useCalibrationPeople(true);
  return (
    <Select id={id} disabled={disabled || loading} {...registerField(name)}>
      <option value="">{loading ? 'Loading employees...' : placeholder}</option>
      {(items || []).map((p) => (
        <option key={`${p.employee_id}-${p.role}`} value={p.employee_id}>
          {p.full_name} ({p.employee_id})
        </option>
      ))}
    </Select>
  );
}

function CalibratedByCheckboxes({ disabled, registerField, selectedIds }) {
  const { items, loading } = useCalibrationPeople(true);
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : selectedIds ? [selectedIds] : []);
  const selectedPeople = (items || []).filter((p) => selected.has(p.employee_id));

  return (
    <div className="space-y-3">
      <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-white p-3">
        {loading ? (
          <div className="text-sm text-slate-500">Loading employees...</div>
        ) : (items || []).length === 0 ? (
          <div className="text-sm text-slate-500">No employees found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(items || []).map((p) => (
              <label key={`${p.employee_id}-${p.role}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  value={p.employee_id}
                  disabled={disabled}
                  className="h-4 w-4 accent-indigo-600 disabled:opacity-50"
                  {...registerField('calibrated_by_employee_ids')}
                />
                <span>{p.full_name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {selectedPeople.length > 0 ? (
        <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Selected</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {selectedPeople.map((p) => (
              <span key={p.employee_id} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {p.full_name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const EQUIPMENT_STATUS_OPTIONS_REF = ['O.K.', 'Defective', 'Out Of Specs.', 'Jobcard - Cal Closed'];
const CAL_STATUS_OPTIONS_REF = ['Valid Cal', 'Partial / Limited Cal', 'No Cal'];
const NO_CAL_REASONS = [
  'Cal Not Required',
  'Cal Withdrawn',
  'Needs Repair',
  'No Facility',
  'No Manual',
  'Not Responsible',
  'Not Sent For Cal',
];
const PARTIAL_LIMITED_REASONS = ['Needs Repair', 'No Facility'];

function defaultCalRefNo(jc) {
  const raw = jc?.jc_no || jc?.section_job_no || '';
  const digits = String(raw).replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `TIMCD/UL/17/${digits}`;
}

function Field({ children }) {
  return <div className="min-w-0">{children}</div>;
}

function CheckItem({ id, label, suffix, disabled, registerField, name }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
      <input
        id={id}
        type="checkbox"
        disabled={disabled}
        className="h-4 w-4 accent-indigo-600 disabled:opacity-50"
        {...registerField(name)}
      />
      <span>{label}</span>
      <span className="text-xs font-semibold text-slate-400">({suffix})</span>
    </label>
  );
}

export function CalibrationDetailsTab(props) {
  const jcForForm = {
    ...props.jc,
    cal_ref_no: props.jc.cal_ref_no || defaultCalRefNo(props.jc),
    cal_due_date: props.jc.cal_due_date || props.jc.cal_due_date_from_equipment || '',
    cal_rh_min: props.jc.cal_rh_min || '35',
    cal_rh_max: props.jc.cal_rh_max || '75',
    cal_temperature_value: props.jc.cal_temperature_value || '25',
    cal_temperature_range: props.jc.cal_temperature_range || '+/-4.0',
    calibrated_by_employee_ids: props.jc.calibrated_by_employee_ids?.length
      ? props.jc.calibrated_by_employee_ids
      : props.jc.calibrated_by_employee_id
        ? [props.jc.calibrated_by_employee_id]
        : [],
  };
  const FIELDS = [
    'cal_job_started_date',
    'cal_job_completed_date',
    'cal_equipment_received_status',
    'cal_repair_carried_out_by',
    'cal_sent_to_lab_date',
    'cal_received_from_lab_date',
    'cal_calibration_status',
    'cal_limited_reason',
    'cal_ref_no',
    'cal_due_date',
    'cal_rh_min',
    'cal_rh_max',
    'cal_temperature_value',
    'cal_temperature_range',
    'calibrated_by_employee_ids',
    'cal_procedure_ref',
    'cal_adjustment_mechanical',
    'cal_adjustment_nil',
    'cal_adjustment_electrical',
    'cal_adjustment_software',
    'cal_timeshare',
    'cal_remarks',
  ];
  const t = useCalibrationTabForm({ ...props, jc: jcForForm, fieldNames: FIELDS });
  const equipmentStatus = t.watch('cal_equipment_received_status');
  const completedDate = t.watch('cal_job_completed_date');
  const currentDueDate = t.watch('cal_due_date');
  const calStatus = t.watch('cal_calibration_status');
  const calibratedByIds = t.watch('calibrated_by_employee_ids');
  const repairEnabled = !!equipmentStatus && equipmentStatus !== 'O.K.';
  const reasonOptions = calStatus === 'No Cal'
    ? NO_CAL_REASONS
    : calStatus === 'Partial / Limited Cal'
      ? PARTIAL_LIMITED_REASONS
      : [];
  const reasonLabel = calStatus === 'No Cal' ? 'Reason For No Cal' : 'Reason For Partial/Limited Cal';

  useEffect(() => {
    const calculated = addMonthsIso(completedDate, props.jc?.equipment?.calibration_frequency_months || props.jc?.equipment?.calibration_frequency);
    if (!calculated) return;
    if (currentDueDate === calculated) return;
    t.setValue('cal_due_date', calculated, { shouldDirty: true });
  }, [completedDate, currentDueDate, props.jc?.equipment?.calibration_frequency_months, props.jc?.equipment?.calibration_frequency, t.setValue]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-950">Calibration Details</h2>
      <div className="grid grid-cols-1 gap-x-10 gap-y-5 lg:grid-cols-2">
        <Field>
          <Label htmlFor="cal_job_started_date" required>Job Start Date</Label>
          <Input id="cal_job_started_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_job_started_date')} />
        </Field>
        <Field>
          <Label htmlFor="cal_job_completed_date" required>Job Complete Date</Label>
          <Input id="cal_job_completed_date" type="date" disabled={!props.canWrite} className="border-red-400 bg-red-50/40" {...t.registerField('cal_job_completed_date')} />
        </Field>

        <Field>
          <Label htmlFor="cal_equipment_received_status" required>Status Of Equipment Received</Label>
          <Select id="cal_equipment_received_status" disabled={!props.canWrite} {...t.registerField('cal_equipment_received_status')}>
            <option value="">Select status...</option>
            {EQUIPMENT_STATUS_OPTIONS_REF.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="cal_repair_carried_out_by" required={repairEnabled}>Repair/Adjustment Carried Out By</Label>
          <Input
            id="cal_repair_carried_out_by"
            disabled={!props.canWrite || !repairEnabled}
            placeholder={repairEnabled ? 'Enter name...' : '-'}
            className={!repairEnabled ? 'bg-slate-100 text-slate-400' : ''}
            {...t.registerField('cal_repair_carried_out_by')}
          />
        </Field>

        <Field>
          <Label htmlFor="cal_sent_to_lab_date">Send To Lab Date</Label>
          <Input id="cal_sent_to_lab_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_sent_to_lab_date')} />
        </Field>
        <Field>
          <Label htmlFor="cal_received_from_lab_date">Received From Lab Date</Label>
          <Input id="cal_received_from_lab_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_received_from_lab_date')} />
        </Field>

        <Field>
          <Label htmlFor="cal_calibration_status" required>Calibration Status</Label>
          <Select id="cal_calibration_status" disabled={!props.canWrite} {...t.registerField('cal_calibration_status')}>
            <option value="">Select status...</option>
            {CAL_STATUS_OPTIONS_REF.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <Field>
          {reasonOptions.length > 0 ? (
            <>
              <Label htmlFor="cal_limited_reason" required>{reasonLabel}</Label>
              <Select id="cal_limited_reason" disabled={!props.canWrite} {...t.registerField('cal_limited_reason')}>
                <option value="">Select reason...</option>
                {reasonOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </>
          ) : (
            <p className="pt-9 text-sm italic text-slate-400">No reason required for Valid Cal</p>
          )}
        </Field>

        <Field>
          <Label htmlFor="cal_ref_no" required>Calibration Ref. No.</Label>
          <Input id="cal_ref_no" disabled={!props.canWrite} {...t.registerField('cal_ref_no')} />
        </Field>
        <Field>
          <Label htmlFor="cal_due_date" required>Calibration Due Date</Label>
          <Input id="cal_due_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_due_date')} />
        </Field>

        <Field>
          <Label htmlFor="cal_rh_min" required>RH %</Label>
          <div className="flex max-w-lg items-center gap-3">
            <Input id="cal_rh_min" type="number" disabled={!props.canWrite} className="w-24" {...t.registerField('cal_rh_min')} />
            <span className="text-sm font-medium text-slate-500">% To RH</span>
            <Input id="cal_rh_max" type="number" disabled={!props.canWrite} className="w-24" {...t.registerField('cal_rh_max')} />
            <span className="text-sm font-medium text-slate-500">%</span>
          </div>
        </Field>
        <Field>
          <Label htmlFor="cal_temperature_value" required>Temperature (&deg;C)</Label>
          <div className="flex max-w-md items-center gap-3">
            <Input id="cal_temperature_value" type="number" disabled={!props.canWrite} className="w-24" {...t.registerField('cal_temperature_value')} />
            <span className="text-sm font-medium text-slate-500">&deg;C</span>
            <Input id="cal_temperature_range" disabled={!props.canWrite} className="w-28" {...t.registerField('cal_temperature_range')} />
          </div>
        </Field>

        <Field>
          <Label required>Calibrated By</Label>
          <CalibratedByCheckboxes
            disabled={!props.canWrite}
            registerField={t.registerField}
            selectedIds={calibratedByIds}
          />
        </Field>
        <Field>
          <Label htmlFor="cal_procedure_ref" required>Cal Procedure Ref</Label>
          <Input id="cal_procedure_ref" disabled={!props.canWrite} placeholder="Enter calibration procedure reference" {...t.registerField('cal_procedure_ref')} />
        </Field>

        <Field>
          <Label required>Adjustment(s)</Label>
          <div className="flex flex-wrap gap-x-7 gap-y-3">
            <CheckItem id="cal_adjustment_mechanical" name="cal_adjustment_mechanical" label="Mechanical" suffix="M" disabled={!props.canWrite} registerField={t.registerField} />
            <CheckItem id="cal_adjustment_nil" name="cal_adjustment_nil" label="Nil" suffix="N" disabled={!props.canWrite} registerField={t.registerField} />
            <CheckItem id="cal_adjustment_electrical" name="cal_adjustment_electrical" label="Electrical" suffix="E" disabled={!props.canWrite} registerField={t.registerField} />
            <CheckItem id="cal_adjustment_software" name="cal_adjustment_software" label="Software" suffix="S" disabled={!props.canWrite} registerField={t.registerField} />
          </div>
        </Field>
        <Field>
          <Label>Timeshare</Label>
          <CheckItem id="cal_timeshare" name="cal_timeshare" label="Timeshare" suffix="T" disabled={!props.canWrite} registerField={t.registerField} />
        </Field>

        <div className="lg:col-span-2">
          <Label htmlFor="cal_remarks">Remarks</Label>
          <textarea
            id="cal_remarks"
            rows={5}
            disabled={!props.canWrite}
            className={textAreaClass()}
            placeholder="Performance of the Equipment is within the specifications except..."
            {...t.registerField('cal_remarks')}
          />
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

export function CalibrationJobCardDetailsTab(props) {
  const FIELDS = [
    'cal_job_started_date',
    'cal_job_completed_date',
    'cal_calibration_status',
    'cal_temperature_c',
    'cal_relative_humidity',
    'cal_ref_no',
    'cal_due_date',
    'calibrated_by_employee_id',
  ];
  const t = useCalibrationTabForm({ ...props, fieldNames: FIELDS });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink">Job Card Details</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <Label htmlFor="cal_job_started_date" required>Job Started Date</Label>
          <Input id="cal_job_started_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_job_started_date')} />
        </div>
        <div>
          <Label htmlFor="cal_job_completed_date" required>Job Completed Date</Label>
          <Input id="cal_job_completed_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_job_completed_date')} />
        </div>
        <div>
          <Label htmlFor="cal_calibration_status" required>Calibration Status</Label>
          <Select id="cal_calibration_status" disabled={!props.canWrite} {...t.registerField('cal_calibration_status')}>
            <option value="">Select status...</option>
            {CALIBRATION_STATUS_OPTIONS.map((v) => (
              <option key={v} value={v}>{CALIBRATION_STATUS_LABELS[v]}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cal_temperature_c" required>Temperature (deg C)</Label>
          <Input id="cal_temperature_c" disabled={!props.canWrite} placeholder="25 +/- 4.0" {...t.registerField('cal_temperature_c')} />
        </div>
        <div>
          <Label htmlFor="cal_relative_humidity" required>Relative Humidity</Label>
          <Input id="cal_relative_humidity" disabled={!props.canWrite} placeholder="30% - 75%" {...t.registerField('cal_relative_humidity')} />
        </div>
        <div>
          <Label htmlFor="cal_ref_no" required>Cal. Ref. No.</Label>
          <Input id="cal_ref_no" disabled={!props.canWrite} placeholder="TIMCD/UL/17/0350" {...t.registerField('cal_ref_no')} />
        </div>
        <div>
          <Label htmlFor="cal_due_date" required>Cal. Due Date</Label>
          <Input id="cal_due_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_due_date')} />
        </div>
        <div>
          <Label htmlFor="calibrated_by_employee_id" required>Calibrated By: Name</Label>
          <PeopleSelect
            id="calibrated_by_employee_id"
            name="calibrated_by_employee_id"
            disabled={!props.canWrite}
            registerField={t.registerField}
          />
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

export function CalibrationStatusTab(props) {
  const FIELDS = [
    'cal_equipment_received_status',
    'cal_repair_carried_out_by',
    'cal_sent_to_lab_date',
    'cal_received_from_lab_date',
    'cal_adjustment_status',
    'cal_limited_reason',
  ];
  const t = useCalibrationTabForm({ ...props, fieldNames: FIELDS });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink">Calibration Status</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <Label htmlFor="cal_equipment_received_status" required>Status of Equipment as Received</Label>
          <Select id="cal_equipment_received_status" disabled={!props.canWrite} {...t.registerField('cal_equipment_received_status')}>
            <option value="">Select status...</option>
            {EQUIPMENT_RECEIVED_STATUS_OPTIONS.map((v) => (
              <option key={v} value={v}>{EQUIPMENT_RECEIVED_STATUS_LABELS[v]}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cal_repair_carried_out_by">Repaired Carried Out By</Label>
          <Input
            id="cal_repair_carried_out_by"
            disabled={!props.canWrite}
            placeholder="Name of person who repaired"
            {...t.registerField('cal_repair_carried_out_by')}
          />
        </div>
        <div>
          <Label htmlFor="cal_sent_to_lab_date">Sent to Lab Date</Label>
          <Input id="cal_sent_to_lab_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_sent_to_lab_date')} />
        </div>
        <div>
          <Label htmlFor="cal_received_from_lab_date">Received from Lab Date</Label>
          <Input id="cal_received_from_lab_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_received_from_lab_date')} />
        </div>
        <div>
          <Label htmlFor="cal_adjustment_status" required>Adjustment(s)</Label>
          <Select id="cal_adjustment_status" disabled={!props.canWrite} {...t.registerField('cal_adjustment_status')}>
            <option value="">Select adjustment...</option>
            {CALIBRATION_ADJUSTMENT_OPTIONS.map((v) => (
              <option key={v} value={v}>{CALIBRATION_ADJUSTMENT_LABELS[v]}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cal_limited_reason">Reason for Limited / Partial / No CAL</Label>
          <Input
            id="cal_limited_reason"
            disabled={!props.canWrite}
            placeholder="Enter reason if applicable"
            {...t.registerField('cal_limited_reason')}
          />
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

function RowError({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 flex items-start gap-2">
      <AlertTriangle size={13} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden="true" />
      {error}
    </div>
  );
}

function tableInputProps({ drafts, setDrafts, rowId, field, disabled, commitField }) {
  const d = drafts[rowId] || {};
  return {
    value: d[field] != null ? d[field] : '',
    disabled,
    onChange: (e) => {
      const v = e.target.value;
      setDrafts((p) => ({ ...p, [rowId]: { ...(p[rowId] || {}), [field]: v, _dirty: true } }));
    },
    onBlur: (e) => {
      if (!disabled) commitField(rowId, field, e.target.value);
    },
  };
}

function equipmentOptionCode(option) {
  if (!option) return '';
  if (option.eqm_id == null) return '';
  return String(option.eqm_id);
}

function formatDate(value) {
  return value ? dayjs(value).format('DD-MM-YYYY') : '';
}

function addMonthsIso(dateValue, monthsValue) {
  const months = Number(monthsValue);
  if (!dateValue || !Number.isFinite(months) || months <= 0) return '';
  const next = dayjs(dateValue).add(months, 'month');
  return next.isValid() ? next.format('YYYY-MM-DD') : '';
}

function EquipmentMasterSearchInput({
  value,
  disabled,
  placeholder,
  jobCategory,
  onTextChange,
  onBlurCommit,
  onSelect,
}) {
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ignoreBlurRef = useRef(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }
    const clean = String(query || '').trim();
    if (clean.length < 1) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchEquipment(clean, 12, ctrl.signal, jobCategory || null);
        setOptions(Array.isArray(items) ? items : []);
        setOpen(true);
      } catch (e) {
        if (e?.name !== 'CanceledError' && e?.name !== 'AbortError') setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, disabled, jobCategory]);

  function handleChange(e) {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    onTextChange(next);
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (ignoreBlurRef.current) {
        ignoreBlurRef.current = false;
        return;
      }
      setOpen(false);
      onBlurCommit(query);
    }, 120);
  }

  async function chooseOption(option) {
    const code = equipmentOptionCode(option);
    setQuery(code);
    setOpen(false);
    await onSelect(option);
  }

  return (
    <div className="relative">
      <Input
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => {
          if (options.length) setOpen(true);
        }}
        onBlur={handleBlur}
      />
      {open && !disabled ? (
        <div className="absolute z-20 mt-2 h-56 w-full overflow-y-auto rounded-md border border-border bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-sm text-ink-soft">Searching...</div>
          ) : options.length ? options.map((option) => (
            <button
              key={option.id || `${option.eqm_type}-${option.eqm_id}`}
              type="button"
              className="block w-full px-3 py-2 text-left hover:bg-accent/10 focus:bg-accent/10 focus:outline-none"
              onMouseDown={(e) => {
                e.preventDefault();
                ignoreBlurRef.current = true;
              }}
              onClick={() => chooseOption(option)}
            >
              <span className="block text-sm font-semibold text-ink">
                {equipmentOptionCode(option)} {option.name ? `- ${option.name}` : ''}
              </span>
              <span className="block text-xs text-ink-soft">
                {[option.model_no, option.make, option.serial_no].filter(Boolean).join(' | ') || 'Equipment master'}
              </span>
              {option.cal_due_date ? (
                <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Validity {formatDate(option.cal_due_date)}
                </span>
              ) : null}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-ink-soft">No equipment found.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CalibrationEquipmentUsedTab({ jc, canWrite }) {
  const { items: rows, loading, refetch } = useCalibrationEquipmentRows(jc.section_job_no);
  const [drafts, setDrafts] = useState({});
  const [busyRow, setBusyRow] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rows) return;
    setDrafts((prev) => {
      const next = {};
      for (const r of rows) {
        const existing = prev[r.id];
        next[r.id] = existing?._dirty ? existing : {
          equipment_id: r.equipment_id || '',
          equipment_name: r.equipment_name || '',
          make: r.make || '',
          model_no: r.model_no || '',
          cal_due_date: r.cal_due_date || '',
          _dirty: false,
        };
      }
      return next;
    });
  }, [rows]);

  async function handleAddRow() {
    setError(null);
    try {
      await addCalibrationEquipmentRow(jc.section_job_no, {});
      invalidateCalibrationEquipmentRows(jc.section_job_no);
      refetch();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not add equipment row.');
    }
  }

  async function commitField(rowId, field, value) {
    const server = (rows || []).find((r) => r.id === rowId);
    if (server && (server[field] || '') === (value || '')) {
      setDrafts((p) => ({ ...p, [rowId]: { ...p[rowId], _dirty: false } }));
      return;
    }
    setBusyRow(rowId);
    setError(null);
    try {
      await patchCalibrationEquipmentRow(jc.section_job_no, rowId, { [field]: value });
      setDrafts((p) => ({ ...p, [rowId]: { ...p[rowId], _dirty: false } }));
      invalidateCalibrationEquipmentRows(jc.section_job_no);
      refetch();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not save equipment row.');
    } finally {
      setBusyRow(null);
    }
  }

  async function commitEquipmentSelection(rowId, option) {
    const next = {
      equipment_id: equipmentOptionCode(option),
      equipment_name: option?.name || '',
      make: option?.make || '',
      model_no: option?.model_no || '',
      cal_due_date: option?.cal_due_date || '',
    };
    setDrafts((p) => ({
      ...p,
      [rowId]: { ...(p[rowId] || {}), ...next, _dirty: false },
    }));
    setBusyRow(rowId);
    setError(null);
    try {
      await patchCalibrationEquipmentRow(jc.section_job_no, rowId, {
        equipment_id: next.equipment_id,
        equipment_name: next.equipment_name,
      });
      invalidateCalibrationEquipmentRows(jc.section_job_no);
      refetch();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not save selected equipment.');
    } finally {
      setBusyRow(null);
    }
  }

  async function handleDelete(rowId) {
    if (!window.confirm('Delete this equipment row? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteCalibrationEquipmentRow(jc.section_job_no, rowId);
      invalidateCalibrationEquipmentRows(jc.section_job_no);
      refetch();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not delete equipment row.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Equipments Used for Calibration</h2>
        <Button variant="primary" size="md" onClick={handleAddRow} disabled={!canWrite}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Add Equipment
        </Button>
      </div>
      <RowError error={error} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border">
          <thead className="bg-base">
            <tr className="text-left text-ink">
              <th className="px-3 py-3 font-semibold w-16">Sr. No</th>
              <th className="px-3 py-3 font-semibold">Equipment ID</th>
              <th className="px-3 py-3 font-semibold">Equipment Name</th>
              <th className="px-3 py-3 font-semibold w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-ink-soft">Loading...</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-ink-soft">No equipment rows yet.</td></tr>
            ) : rows.map((row, idx) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-3 text-center">{row.sr_no || idx + 1}</td>
                <td className="px-3 py-2">
                  <EquipmentMasterSearchInput
                    placeholder="1481"
                    value={drafts[row.id]?.equipment_id || ''}
                    disabled={!canWrite || busyRow === row.id}
                    jobCategory={jc.job_category}
                    onTextChange={(v) => {
                      setDrafts((p) => ({
                        ...p,
                        [row.id]: { ...(p[row.id] || {}), equipment_id: v, _dirty: true },
                      }));
                    }}
                    onBlurCommit={(v) => commitField(row.id, 'equipment_id', v)}
                    onSelect={(option) => commitEquipmentSelection(row.id, option)}
                  />
                  {drafts[row.id]?.cal_due_date ? (
                    <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Validity {formatDate(drafts[row.id].cal_due_date)}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Input
                    placeholder="e.g., Digital Multimeter DMM-5000"
                    {...tableInputProps({
                      drafts, setDrafts, rowId: row.id, field: 'equipment_name',
                      disabled: !canWrite || busyRow === row.id, commitField,
                    })}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    disabled={!canWrite || busyRow === row.id}
                    className="p-2 text-danger hover:bg-danger/10 rounded disabled:opacity-30"
                    aria-label="Delete equipment row"
                    title="Delete row"
                  >
                    <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-ink-soft">
        Add calibrated equipment and tools from the equipment database used during the calibration process
      </p>
    </div>
  );
}

export function CalibrationAdjustmentsTab({ jc, canWrite }) {
  const { items: rows, loading, refetch } = useCalibrationAdjustmentRows(jc.section_job_no);
  const [drafts, setDrafts] = useState({});
  const [busyRow, setBusyRow] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rows) return;
    setDrafts((prev) => {
      const next = {};
      for (const r of rows) {
        const existing = prev[r.id];
        next[r.id] = existing?._dirty ? existing : {
          parameter_name: r.parameter_name || '',
          test_value: r.test_value || '',
          specifications_limits: r.specifications_limits || '',
          observation_before: r.observation_before || '',
          observation_after: r.observation_after || '',
          _dirty: false,
        };
      }
      return next;
    });
  }, [rows]);

  async function handleAddRow() {
    setError(null);
    try {
      await addCalibrationAdjustmentRow(jc.section_job_no, {});
      invalidateCalibrationAdjustmentRows(jc.section_job_no);
      refetch();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not add adjustment row.');
    }
  }

  async function commitField(rowId, field, value) {
    const server = (rows || []).find((r) => r.id === rowId);
    if (server && (server[field] || '') === (value || '')) {
      setDrafts((p) => ({ ...p, [rowId]: { ...p[rowId], _dirty: false } }));
      return;
    }
    setBusyRow(rowId);
    setError(null);
    try {
      await patchCalibrationAdjustmentRow(jc.section_job_no, rowId, { [field]: value });
      setDrafts((p) => ({ ...p, [rowId]: { ...p[rowId], _dirty: false } }));
      invalidateCalibrationAdjustmentRows(jc.section_job_no);
      refetch();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not save adjustment row.');
    } finally {
      setBusyRow(null);
    }
  }

  async function handleDelete(rowId) {
    if (!window.confirm('Delete this adjustment row? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteCalibrationAdjustmentRow(jc.section_job_no, rowId);
      invalidateCalibrationAdjustmentRows(jc.section_job_no);
      refetch();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not delete adjustment row.');
    }
  }

  const input = (rowId, field, placeholder) => (
    <Input
      placeholder={placeholder}
      {...tableInputProps({
        drafts, setDrafts, rowId, field,
        disabled: !canWrite || busyRow === rowId,
        commitField,
      })}
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Adjustments Details</h2>
        <Button variant="primary" size="md" onClick={handleAddRow} disabled={!canWrite}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Add Row
        </Button>
      </div>
      <RowError error={error} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border">
          <thead className="bg-base">
            <tr className="text-left text-ink">
              <th className="px-3 py-3 font-semibold w-16" rowSpan={2}>Sr. No</th>
              <th className="px-3 py-3 font-semibold" rowSpan={2}>Parameters</th>
              <th className="px-3 py-3 font-semibold" rowSpan={2}>Test Value</th>
              <th className="px-3 py-3 font-semibold" rowSpan={2}>Specifications/Limits</th>
              <th className="px-3 py-3 font-semibold text-center" colSpan={2}>OBSERVATIONS</th>
              <th className="px-3 py-3 font-semibold w-24 text-center" rowSpan={2}>Action</th>
            </tr>
            <tr className="text-left text-ink">
              <th className="px-3 py-3 font-semibold">Before Adjustment</th>
              <th className="px-3 py-3 font-semibold">After Adjustment</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-soft">Loading...</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-soft">No adjustment rows yet.</td></tr>
            ) : rows.map((row, idx) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-3 text-center">{row.sr_no || idx + 1}</td>
                <td className="px-3 py-2">{input(row.id, 'parameter_name', 'Parameter name')}</td>
                <td className="px-3 py-2">{input(row.id, 'test_value', 'Test value')}</td>
                <td className="px-3 py-2">{input(row.id, 'specifications_limits', 'Spec/Limits')}</td>
                <td className="px-3 py-2">{input(row.id, 'observation_before', 'Before')}</td>
                <td className="px-3 py-2">{input(row.id, 'observation_after', 'After')}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    disabled={!canWrite || busyRow === row.id}
                    className="p-2 text-danger hover:bg-danger/10 rounded disabled:opacity-30"
                    aria-label="Delete adjustment row"
                    title="Delete row"
                  >
                    <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CalibrationRemarksTab(props) {
  const FIELDS = ['cal_remarks', 'cal_incharge_employee_id', 'cal_incharge_date'];
  const t = useCalibrationTabForm({ ...props, fieldNames: FIELDS });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink">Remarks</h2>
      <div>
        <Label htmlFor="cal_remarks">REMARKS</Label>
        <textarea
          id="cal_remarks"
          rows={7}
          disabled={!props.canWrite}
          className={textAreaClass()}
          placeholder="Enter remarks about the calibration, equipment performance, etc."
          {...t.registerField('cal_remarks')}
        />
      </div>
      <div className="border-t border-border pt-5">
        <h3 className="text-base font-semibold text-ink-soft mb-4">Signature of In-charge</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <Label htmlFor="cal_incharge_employee_id">Name</Label>
            <PeopleSelect
              id="cal_incharge_employee_id"
              name="cal_incharge_employee_id"
              placeholder="Select In-charge..."
              disabled={!props.canWrite}
              registerField={t.registerField}
            />
          </div>
          <div>
            <Label htmlFor="cal_incharge_date">Date</Label>
            <Input id="cal_incharge_date" type="date" disabled={!props.canWrite} {...t.registerField('cal_incharge_date')} />
          </div>
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

function formatBytes(b) {
  if (b == null) return '-';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function CalibrationDocumentsTab({ jc, canWrite }) {
  const { items: docs, loading, refetch } = useJobCardDocuments(jc.section_job_no);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadJobCardDocument(jc.section_job_no, file, 'CALIBRATION_CERT');
      if (fileRef.current) fileRef.current.value = '';
      invalidateJobCardDocuments(jc.section_job_no);
      refetch();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return;
    try {
      await deleteJobCardDocument(jc.section_job_no, doc.id);
      invalidateJobCardDocuments(jc.section_job_no);
      refetch();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Could not delete document.');
    }
  }

  const count = docs?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Documents</h2>
          <p className="mt-4 text-base text-danger">
            <span className="font-semibold">* Mandatory:</span> At least one document must be uploaded before job closing
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => fileRef.current?.click()} disabled={!canWrite || uploading}>
          <Upload size={18} strokeWidth={1.75} aria-hidden="true" />
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
          onChange={handlePick}
          disabled={!canWrite || uploading}
        />
      </div>

      {error ? <RowError error={error} /> : null}

      {loading && !docs ? (
        <div className="rounded-lg border border-dashed border-border p-16 text-center text-sm text-ink-soft">Loading documents...</div>
      ) : count === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-16 min-h-56 flex flex-col items-center justify-center text-center">
          <FileText size={48} strokeWidth={1.5} className="text-ink-soft/40 mb-4" aria-hidden="true" />
          <div className="text-base text-ink-soft">No documents uploaded yet</div>
          <div className="text-sm text-danger mt-2">Upload at least one document to enable job closing</div>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-md border border-border bg-white p-3">
              <FileText size={20} strokeWidth={1.75} className="text-accent shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate">{d.filename}</div>
                <div className="text-xs text-ink-soft">{formatBytes(d.size_bytes)} - Uploaded by {d.uploaded_by_employee_id}</div>
              </div>
              <a
                href={jobCardDocumentDownloadUrl(jc.section_job_no, d.id)}
                className="p-2 rounded-md text-accent hover:bg-accent/10"
                title="Download"
                aria-label={`Download ${d.filename}`}
              >
                <Download size={16} strokeWidth={1.75} aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => handleDelete(d)}
                disabled={!canWrite}
                className="p-2 rounded-md text-danger hover:bg-danger/10 disabled:opacity-30"
                title="Delete"
                aria-label="Delete document"
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <span className="font-semibold">Accepted formats:</span> PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG
      </div>
    </div>
  );
}

function GateRow({ label, ok, hint }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 size={16} strokeWidth={1.75} className="text-emerald-600 shrink-0" aria-hidden="true" />
      ) : (
        <Square size={16} strokeWidth={1.75} className="text-ink-soft shrink-0" aria-hidden="true" />
      )}
      <span className={ok ? 'text-ink' : 'text-ink-soft'}>{label}</span>
      {hint ? <span className={ok ? 'text-emerald-700 text-xs' : 'text-amber-700 text-xs'}>- {hint}</span> : null}
    </div>
  );
}

function todayIso() { return todayIstIsoDate(); }

export function CalibrationJobClosingTab(props) {
  const { jc, canWrite, invalidateAll, refetch } = props;
  const { items: tasks } = useJobCardTasks(jc.section_job_no);
  const { items: adjustmentRows } = useCalibrationAdjustmentRows(jc.section_job_no);

  const totalTasks = (tasks || []).length;
  const completedTasks = (tasks || []).filter((t) => t.is_completed).length;
  const tasksOk = totalTasks === 0 || completedTasks === totalTasks;
  const calWorkOk = !!jc.cal_calibration_status || !!jc.cal_remarks || (adjustmentRows || []).length > 0;
  const allGatesOk = tasksOk && calWorkOk;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jobCardMarkCompleteSchema),
    defaultValues: {
      completion_summary: '',
      actual_completion_date: todayIso(),
      total_hours_spent: '',
    },
  });
  const [serverError, setServerError] = useState(null);

  async function onSubmit(values) {
    setServerError(null);
    try {
      await markCompleteJobCard(jc.section_job_no, values);
      invalidateAll();
      if (refetch) refetch();
    } catch (e) {
      setServerError(e?.response?.data?.error?.message || 'Could not close job work.');
    }
  }

  if (jc.status === 'COMPLETED') {
    return <ClosureTab {...props} />;
  }

  if (jc.status === 'VERIFIED_CLOSED') {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-ink">
        <span className="font-semibold text-emerald-700">This calibration job card is verified and closed.</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-ink">Job Closing</h2>
      {jc.status === 'ASSIGNED' ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-ink">
          Start Work must be completed before job closing is available.
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-base p-4 space-y-2">
        <div className="text-sm font-semibold text-ink mb-2">Pre-Closing Verification</div>
        <GateRow label="All checklist tasks completed" ok={tasksOk} hint={totalTasks === 0 ? 'no tasks added' : `${completedTasks}/${totalTasks} complete`} />
        <GateRow label="Calibration status or remarks filled" ok={calWorkOk} hint={calWorkOk ? 'present' : 'fill Calibration Status or Remarks'} />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="completion_summary" required>Completion Summary</Label>
          <textarea
            id="completion_summary"
            rows={5}
            disabled={!canWrite || isSubmitting || jc.status !== 'IN_PROGRESS'}
            className={textAreaClass(errors.completion_summary ? 'border-danger' : '')}
            placeholder="Brief summary of calibration work completed, findings, and recommendations..."
            {...register('completion_summary')}
          />
          {errors.completion_summary ? <p className="mt-1 text-xs text-danger">{errors.completion_summary.message}</p> : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="actual_completion_date" required>Actual Completion Date</Label>
            <Input
              id="actual_completion_date"
              type="date"
              disabled={!canWrite || isSubmitting || jc.status !== 'IN_PROGRESS'}
              invalid={!!errors.actual_completion_date}
              {...register('actual_completion_date')}
            />
          </div>
          <div>
            <Label htmlFor="total_hours_spent" required>Total Hours Spent</Label>
            <Input
              id="total_hours_spent"
              type="number"
              step="0.25"
              min="0"
              disabled={!canWrite || isSubmitting || jc.status !== 'IN_PROGRESS'}
              invalid={!!errors.total_hours_spent}
              {...register('total_hours_spent')}
            />
          </div>
        </div>

        {serverError ? <RowError error={serverError} /> : null}

        <div className="sticky bottom-2 bg-base-elev border border-border rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="text-xs text-ink-soft">Job closing requires calibration data and completed checklist tasks.</div>
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!canWrite || isSubmitting || !allGatesOk || jc.status !== 'IN_PROGRESS'}
            className="!bg-emerald-600 hover:!bg-emerald-700"
          >
            <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
            {isSubmitting ? 'Closing...' : 'Mark Calibration Complete'}
          </Button>
        </div>
      </form>
    </div>
  );
}
