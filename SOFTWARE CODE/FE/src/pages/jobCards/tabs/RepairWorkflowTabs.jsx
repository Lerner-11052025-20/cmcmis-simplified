// ============================================================================
// pages/jobCards/tabs/RepairWorkflowTabs.jsx
// ----------------------------------------------------------------------------
// Dedicated TME/FPE repair workflow tabs.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Calendar, Info, Plus, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { useCalibrationPeople } from '../../../lib/hooks/useCalibrationPeople.js';
import { searchEquipment } from '../../../lib/api/lookups.js';
import { useRepairEquipmentRows, invalidateRepairEquipmentRows } from '../../../lib/hooks/useRepairRows.js';
import {
  addRepairEquipmentRow,
  deleteRepairEquipmentRow,
  patchJobCardTab,
  patchRepairEquipmentRow,
} from '../../../lib/api/jobCards.js';
import {
  JOB_TYPE_LABELS,
  REPAIR_ACCESSORY_LABELS,
  REPAIR_ACCESSORY_OPTIONS,
  REPAIR_FAULT_CATEGORY_LABELS,
  REPAIR_FAULT_CATEGORY_OPTIONS,
  REPAIR_FAULTY_SECTION_LABELS,
  REPAIR_FAULTY_SECTION_OPTIONS,
  REPAIR_NOT_REPAIRABLE_REASON_LABELS,
  REPAIR_NOT_REPAIRABLE_STATUS_OPTIONS,
  REPAIR_NOT_REPAIRABLE_REASON_OPTIONS,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_OPTIONS,
  REPAIR_TYPE_LABELS,
} from '../../../lib/schemas/jobCardSchemas.js';
import { TabSaveBar } from '../components/TabSaveBar.jsx';

const DATETIME_FIELDS_AS_DATE = new Set([
  'equipment_submitted_date',
  'equipment_received_date_actual',
  'repair_job_received_date',
  'instrument_received_date',
  'repair_job_start_planned_date',
  'job_complete_planned_date',
]);

function coerceFieldForInput(fieldName, raw) {
  if (raw == null || raw === '') return '';
  if (DATETIME_FIELDS_AS_DATE.has(fieldName) && typeof raw === 'string' && raw.length >= 10) {
    return raw.slice(0, 10);
  }
  return raw;
}

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

function useRepairTabForm({ jc, fieldNames, canWrite, invalidateAll, refetch }) {
  const defaults = useMemo(() => {
    const out = {};
    for (const f of fieldNames) out[f] = coerceFieldForInput(f, jc[f]);
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

function PeopleCheckboxes({ disabled, registerField, name, selectedIds }) {
  const { items, loading } = useCalibrationPeople(true);
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : selectedIds ? [selectedIds] : []);
  const selectedPeople = (items || []).filter((p) => selected.has(p.employee_id));

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        {loading ? (
          <div className="px-4 py-3 text-sm text-ink-soft">Loading employees...</div>
        ) : (items || []).length === 0 ? (
          <div className="px-4 py-3 text-sm text-ink-soft">No employees found.</div>
        ) : (
          <div className="divide-y divide-border/70">
            {(items || []).map((p) => (
              <label key={`${p.employee_id}-${p.role}`} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  value={p.employee_id}
                  disabled={disabled}
                  className="h-4 w-4 accent-slate-800 disabled:opacity-50"
                  {...registerField(name)}
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

function OptionSelect({ id, disabled, registerField, name, placeholder, options, labels }) {
  return (
    <Select id={id} disabled={disabled} {...registerField(name)}>
      <option value="">{placeholder}</option>
      {options.map((v) => (
        <option key={v} value={v}>{labels[v]}</option>
      ))}
    </Select>
  );
}

function RadioOption({ name, value, label, disabled, registerField }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink mr-8 mb-3">
      <input
        type="radio"
        value={value}
        disabled={disabled}
        className="h-4 w-4 accent-accent disabled:opacity-50"
        {...registerField(name)}
      />
      {label}
    </label>
  );
}

function DetailValue({ label, value, required = false, tall = false }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-ink-soft">
        {label} {required ? <span className="text-danger">*</span> : null}
      </div>
      <div className={[
        'rounded-md border border-border bg-slate-50 px-3 py-2 text-sm font-medium text-ink',
        tall ? 'min-h-28 whitespace-pre-wrap' : 'min-h-10',
      ].join(' ')}
      >
        {value || '-'}
      </div>
    </div>
  );
}

function splitMulti(value) {
  return String(value || '')
    .split('|')
    .map((v) => v.trim())
    .filter(Boolean);
}

function CheckboxStrip({ disabled, values, selectedValue, labels, onToggle }) {
  const selected = new Set(splitMulti(selectedValue));
  return (
    <div className="rounded-lg border border-border bg-slate-50/70 px-4 py-3">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {values.map((value) => (
          <label key={value} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={selected.has(value)}
              disabled={disabled}
              onChange={() => onToggle(value)}
              className="h-4 w-4 accent-slate-800 disabled:opacity-50"
            />
            <span>{labels[value]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function equipmentOptionCode(option) {
  if (!option) return '';
  if (option.eqm_id == null) return '';
  return String(option.eqm_id);
}

function formatDate(value) {
  return value ? dayjs(value).format('DD-MM-YYYY') : '';
}

function EquipmentMasterSearchInput({
  value,
  disabled,
  jobCategory,
  placeholder,
  onTextChange,
  onBlurCommit,
  onSelect,
}) {
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const isFocusedRef = useRef(false);
  const ignoreBlurRef = useRef(false);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return undefined;
    }
    if (!isFocusedRef.current) return undefined;

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
        if (isFocusedRef.current) setOpen(true);
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
    isFocusedRef.current = true;
    setQuery(next);
    setOpen(true);
    onTextChange(next);
  }

  function handleBlur() {
    isFocusedRef.current = false;
    window.setTimeout(() => {
      if (ignoreBlurRef.current) {
        ignoreBlurRef.current = false;
        isFocusedRef.current = true;
        return;
      }
      setOpen(false);
      onBlurCommit(query);
    }, 120);
  }

  async function chooseOption(option) {
    const code = equipmentOptionCode(option);
    justSelectedRef.current = true;
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
          isFocusedRef.current = true;
          if (options.length) setOpen(true);
        }}
        onBlur={handleBlur}
        className="h-10 font-semibold"
      />
      {open && !disabled ? (
        <div className="absolute z-30 mt-2 max-h-72 w-[min(680px,calc(100vw-7rem))] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl">
          {loading ? (
            <div className="px-4 py-3 text-sm text-ink-soft">Searching...</div>
          ) : options.length ? options.map((option) => (
            <button
              key={option.id || `${option.eqm_type}-${option.eqm_id}`}
              type="button"
              className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none"
              onMouseDown={(e) => {
                e.preventDefault();
                ignoreBlurRef.current = true;
              }}
              onClick={() => chooseOption(option)}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {equipmentOptionCode(option)}
                </span>
                <span className="text-sm font-semibold text-slate-900">{option.name || 'Unnamed equipment'}</span>
                {option.cal_due_date ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Validity {formatDate(option.cal_due_date)}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {[option.model_no, option.make, option.serial_no].filter(Boolean).join(' | ') || 'Equipment master'}
              </span>
            </button>
          )) : (
            <div className="px-4 py-3 text-sm text-ink-soft">No equipment found.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function RepairPlugInAccessoriesTab(props) {
  const FIELDS = ['repair_accessory_selected'];
  const t = useRepairTabForm({ ...props, fieldNames: FIELDS });

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="repair_accessory_selected">Select Accessory to Add</Label>
        <OptionSelect
          id="repair_accessory_selected"
          name="repair_accessory_selected"
          disabled={!props.canWrite}
          registerField={t.registerField}
          placeholder="Choose accessory from list..."
          options={REPAIR_ACCESSORY_OPTIONS}
          labels={REPAIR_ACCESSORY_LABELS}
        />
      </div>
      {t.saveBar}
    </div>
  );
}

export function RepairSubmittedReceivedTab(props) {
  const FIELDS = [
    'equipment_submitted_date',
    'equipment_received_date_actual',
    'received_by',
  ];
  const t = useRepairTabForm({ ...props, fieldNames: FIELDS });
  const submitter = props.jc.submitter || {};
  const divisionText = props.jc.division?.code
    ? `${props.jc.division.code}${props.jc.division.name ? ` - ${props.jc.division.name}` : ''}`
    : props.jc.division?.name;

  return (
    <div className="space-y-7">
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-ink">Submitted By</h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          <DetailValue label="Submitted By" required value={submitter.name || props.jc.submitted_by} />
          <DetailValue label="SAC Employee ID" required value={submitter.employee_id} />
          <DetailValue label="Designation" value={submitter.designation} />
          <DetailValue label="Division" value={divisionText} />
          <DetailValue label="Phone (Lab)" value={submitter.lab_phone} />
          <DetailValue label="Phone (Room)" value={submitter.room_phone} />
          <DetailValue label="Name of Project" value={props.jc.project_name} />
          <DetailValue label="Sub System" value={props.jc.subsystem} />
          <div className="lg:col-span-2">
            <DetailValue label="Complaints / Symptoms" required tall value={props.jc.complaint_description} />
          </div>
          <div className="lg:col-span-2">
            <DetailValue label="Email" value={submitter.email} />
          </div>
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-ink">Equipment Received Information</h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          <div>
            <Label htmlFor="received_by" required>Engineer's Name</Label>
            <Input id="received_by" disabled={!props.canWrite} {...t.registerField('received_by')} />
          </div>
          <div>
            <Label htmlFor="equipment_received_date_actual" required>Date</Label>
            <Input id="equipment_received_date_actual" type="date" disabled={!props.canWrite} {...t.registerField('equipment_received_date_actual')} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
        <div>
          <Label htmlFor="equipment_submitted_date">Equipment Submitted Date</Label>
          <Input id="equipment_submitted_date" type="date" disabled={!props.canWrite} {...t.registerField('equipment_submitted_date')} />
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

export function RepairJobCardDetailsTab(props) {
  const FIELDS = [
    'repair_job_received_date',
    'instrument_received_date',
    'repair_job_start_planned_date',
    'job_complete_planned_date',
    'job_type',
    'repair_type',
    'job_request_remarks',
  ];
  const t = useRepairTabForm({ ...props, fieldNames: FIELDS });

  const repairTypeOrder = ['BREAK_DOWN', 'WARRANTY', 'PM', 'NEED_BASED'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <Label htmlFor="repair_job_received_date">Job Received Date</Label>
          <Input id="repair_job_received_date" type="date" disabled={!props.canWrite} {...t.registerField('repair_job_received_date')} />
        </div>
        <div>
          <Label htmlFor="instrument_received_date">Instrument Received Date</Label>
          <Input id="instrument_received_date" type="date" disabled={!props.canWrite} {...t.registerField('instrument_received_date')} />
        </div>
        <div>
          <Label htmlFor="repair_job_start_planned_date">Job Start Planned Date</Label>
          <Input id="repair_job_start_planned_date" type="date" disabled={!props.canWrite} {...t.registerField('repair_job_start_planned_date')} />
        </div>
        <div>
          <Label htmlFor="job_complete_planned_date">Job Complete Planned Date</Label>
          <Input id="job_complete_planned_date" type="date" disabled={!props.canWrite} {...t.registerField('job_complete_planned_date')} />
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-ink-soft mb-3">Job Type</div>
        <RadioOption name="job_type" value="IN_HOUSE" label={JOB_TYPE_LABELS.IN_HOUSE} disabled={!props.canWrite} registerField={t.registerField} />
        <RadioOption name="job_type" value="VENDOR" label={JOB_TYPE_LABELS.VENDOR} disabled={!props.canWrite} registerField={t.registerField} />
      </div>

      <div>
        <div className="text-sm font-semibold text-ink-soft mb-3">Repair Type</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {repairTypeOrder.map((v) => (
            <RadioOption key={v} name="repair_type" value={v} label={REPAIR_TYPE_LABELS[v]} disabled={!props.canWrite} registerField={t.registerField} />
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="job_request_remarks">Job Request Remarks</Label>
        <textarea
          id="job_request_remarks"
          rows={6}
          disabled={!props.canWrite}
          className={textAreaClass()}
          {...t.registerField('job_request_remarks')}
        />
      </div>
      {t.saveBar}
    </div>
  );
}

export function RepairMaintenanceDetailsTab(props) {
  const repairAttendedByEmployeeIds = props.jc.repair_attended_by_employee_ids?.length
    ? props.jc.repair_attended_by_employee_ids
    : props.jc.repair_attended_by_employee_id
      ? [props.jc.repair_attended_by_employee_id]
      : [];
  const jcForForm = {
    ...props.jc,
    repair_job_start_planned_date: props.jc.repair_job_start_planned_date || props.jc.planned_start_date || '',
    repair_attended_by_employee_ids: repairAttendedByEmployeeIds,
  };
  const FIELDS = [
    'repair_job_start_planned_date',
    'repair_faulty_section',
    'repair_fault_category',
    'repair_attended_by_employee_ids',
    'repair_fault_description',
    'repair_action_taken_description',
    'repair_sent_to_cal_lab_on',
    'repair_equipment_received_from_cal_lab_flag',
    'repair_job_complete_date',
    'repair_status',
    'repair_not_repairable_reason',
    'repair_remarks',
  ];
  const t = useRepairTabForm({ ...props, jc: jcForForm, fieldNames: FIELDS });
  const repairStatus = t.watch('repair_status');
  const attendedByIds = t.watch('repair_attended_by_employee_ids');
  const faultySection = t.watch('repair_faulty_section');
  const faultCategory = t.watch('repair_fault_category');
  const showNotRepairableReason = REPAIR_NOT_REPAIRABLE_STATUS_OPTIONS.includes(repairStatus);

  function togglePipeValue(field, value) {
    const selected = new Set(splitMulti(t.watch(field)));
    if (selected.has(value)) selected.delete(value);
    else selected.add(value);
    t.setValue(field, Array.from(selected).join('|'), { shouldDirty: true });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink">Maintenance Details</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
        <div>
          <Label htmlFor="repair_job_start_planned_date" required>Job Start Date</Label>
          <Input id="repair_job_start_planned_date" type="date" disabled={!props.canWrite} {...t.registerField('repair_job_start_planned_date')} />
        </div>
        <div>
          <Label htmlFor="repair_job_complete_date">Job Complete Date</Label>
          <Input id="repair_job_complete_date" type="date" disabled={!props.canWrite} {...t.registerField('repair_job_complete_date')} />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-soft mb-3">Eqpt. Received from Cal Lab</div>
          <RadioOption name="repair_equipment_received_from_cal_lab_flag" value="YES" label="Yes" disabled={!props.canWrite} registerField={t.registerField} />
          <RadioOption name="repair_equipment_received_from_cal_lab_flag" value="NO" label="No" disabled={!props.canWrite} registerField={t.registerField} />
        </div>
        <div>
          <Label htmlFor="repair_sent_to_cal_lab_on">Sent To Cal Lab On</Label>
          <Input id="repair_sent_to_cal_lab_on" type="date" disabled={!props.canWrite} {...t.registerField('repair_sent_to_cal_lab_on')} />
        </div>
        <div>
          <Label required>Attended By</Label>
          <PeopleCheckboxes
            name="repair_attended_by_employee_ids"
            disabled={!props.canWrite}
            registerField={t.registerField}
            selectedIds={attendedByIds}
          />
        </div>
        <div>
          <Label htmlFor="repair_status" required>Repair Status</Label>
          <OptionSelect
            id="repair_status"
            name="repair_status"
            disabled={!props.canWrite}
            registerField={t.registerField}
            placeholder="Select repair status..."
            options={REPAIR_STATUS_OPTIONS}
            labels={REPAIR_STATUS_LABELS}
          />
          {showNotRepairableReason ? (
            <div className="mt-5">
              <Label htmlFor="repair_not_repairable_reason" required>Not Repairable Reason</Label>
              <OptionSelect
                id="repair_not_repairable_reason"
                name="repair_not_repairable_reason"
                disabled={!props.canWrite}
                registerField={t.registerField}
                placeholder="Select reason..."
                options={REPAIR_NOT_REPAIRABLE_REASON_OPTIONS}
                labels={REPAIR_NOT_REPAIRABLE_REASON_LABELS}
              />
            </div>
          ) : null}
        </div>
        <div>
          <Label htmlFor="repair_fault_description">Fault Description</Label>
          <textarea
            id="repair_fault_description"
            rows={6}
            disabled={!props.canWrite}
            className={textAreaClass()}
            placeholder="Describe the fault in detail..."
            {...t.registerField('repair_fault_description')}
          />
        </div>
        <div>
          <Label htmlFor="repair_action_taken_description">Action Taken Description</Label>
          <textarea
            id="repair_action_taken_description"
            rows={6}
            disabled={!props.canWrite}
            className={textAreaClass()}
            placeholder="Describe the action taken to resolve the issue..."
            {...t.registerField('repair_action_taken_description')}
          />
        </div>
        <div className="lg:col-span-2">
          <input type="hidden" {...t.registerField('repair_faulty_section')} />
          <div className="mb-2 text-sm font-semibold text-ink-soft">Faulty Section(s)</div>
          <CheckboxStrip
            values={REPAIR_FAULTY_SECTION_OPTIONS}
            selectedValue={faultySection}
            labels={REPAIR_FAULTY_SECTION_LABELS}
            disabled={!props.canWrite}
            onToggle={(value) => togglePipeValue('repair_faulty_section', value)}
          />
        </div>
        <div className="lg:col-span-2">
          <input type="hidden" {...t.registerField('repair_fault_category')} />
          <div className="mb-2 text-sm font-semibold text-ink-soft">Fault Category</div>
          <CheckboxStrip
            values={REPAIR_FAULT_CATEGORY_OPTIONS}
            selectedValue={faultCategory}
            labels={REPAIR_FAULT_CATEGORY_LABELS}
            disabled={!props.canWrite}
            onToggle={(value) => togglePipeValue('repair_fault_category', value)}
          />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="repair_remarks">Remarks</Label>
          <textarea
            id="repair_remarks"
            rows={4}
            disabled={!props.canWrite}
            className={textAreaClass()}
            placeholder="Additional remarks or notes..."
            {...t.registerField('repair_remarks')}
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

export function RepairEquipmentUsedTab({ jc, canWrite }) {
  const { items: rows, loading, refetch } = useRepairEquipmentRows(jc.section_job_no);
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
      await addRepairEquipmentRow(jc.section_job_no, {});
      invalidateRepairEquipmentRows(jc.section_job_no);
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
      await patchRepairEquipmentRow(jc.section_job_no, rowId, { [field]: value });
      setDrafts((p) => ({ ...p, [rowId]: { ...p[rowId], _dirty: false } }));
      invalidateRepairEquipmentRows(jc.section_job_no);
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
      await patchRepairEquipmentRow(jc.section_job_no, rowId, {
        equipment_id: next.equipment_id,
        equipment_name: next.equipment_name,
      });
      invalidateRepairEquipmentRows(jc.section_job_no);
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
      await deleteRepairEquipmentRow(jc.section_job_no, rowId);
      invalidateRepairEquipmentRows(jc.section_job_no);
      refetch();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not delete equipment row.');
    }
  }

  const rowCount = rows?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Equipments Used for Repair</h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">
              {rowCount} {rowCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            Select tools or reference equipment from the equipment master. Equipment details are fetched automatically after selection.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleAddRow}
          disabled={!canWrite}
          className="shrink-0 self-start shadow-sm transition-all active:scale-[0.98] sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden="true" className="mr-1.5" />
          Add Equipment
        </Button>
      </div>
      <RowError error={error} />

      {loading && !rows ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-16 shadow-sm">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading equipment rows...</p>
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Info size={20} strokeWidth={2} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No equipment rows yet</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Add a repair equipment row, then search the master database.
          </p>
          {canWrite ? (
            <Button variant="secondary" size="sm" className="mt-4 shadow-sm" onClick={handleAddRow}>
              <Plus size={14} className="mr-1.5" />
              Add Row
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((row, idx) => {
            const draft = drafts[row.id] || {};
            const isRowBusy = busyRow === row.id;
            const hasSelection = !!draft.equipment_id;

            return (
              <div
                key={row.id}
                className={`relative overflow-visible rounded-xl border bg-white shadow-sm transition-all duration-200 ${
                  isRowBusy ? 'border-indigo-200 opacity-95 ring-2 ring-indigo-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between rounded-t-xl border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {row.sr_no || idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Repair Equipment
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isRowBusy ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-indigo-600" />
                        Saving...
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      disabled={!canWrite || isRowBusy}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-30"
                      aria-label="Delete equipment row"
                      title="Delete row"
                    >
                      <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Search Equipment ID
                    </label>
                    <EquipmentMasterSearchInput
                      placeholder="Search ID, name, model, serial..."
                      value={draft.equipment_id || ''}
                      disabled={!canWrite || isRowBusy}
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
                    <p className="text-[11px] leading-normal text-slate-400">
                      Search and select equipment from master to automatically fetch linked details.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Selected Equipment Details
                    </label>
                    {!hasSelection ? (
                      <div className="flex h-[76px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/30 px-4 py-5 text-center">
                        <p className="text-xs font-medium text-slate-400">
                          No equipment linked. Type an ID or query on the left to select.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50/80">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="inline-block rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white">
                              ID: {draft.equipment_id}
                            </span>
                            <Input
                              placeholder="Equipment name"
                              {...tableInputProps({
                                drafts, setDrafts, rowId: row.id, field: 'equipment_name',
                                disabled: !canWrite || isRowBusy, commitField,
                              })}
                            />
                          </div>
                          {draft.cal_due_date ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                              <Calendar size={12} className="text-emerald-500" />
                              Valid till {formatDate(draft.cal_due_date)}
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                              No Validity Date
                            </span>
                          )}
                        </div>
                        {(draft.model_no || draft.make) ? (
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200/60 pt-3 text-xs">
                            {draft.make ? (
                              <div className="text-slate-600">
                                <span className="mr-1 font-medium text-slate-400">Make:</span>
                                <span className="font-semibold text-slate-700">{draft.make}</span>
                              </div>
                            ) : null}
                            {draft.model_no ? (
                              <div className="text-slate-600">
                                <span className="mr-1 font-medium text-slate-400">Model:</span>
                                <span className="font-semibold text-slate-700">{draft.model_no}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RepairContractWarrantyTab(props) {
  const FIELDS = [
    'vendor_supplier_name',
    'intimation_sent_on',
    'sent_to_vendor_date',
    'received_from_vendor_date',
    'repair_sent_to_store_on',
    'repair_store_ref_number',
    'gate_pass_no',
    'gate_pass_issued_date',
    'cost_of_component',
    'labour_charges',
    'repair_transport_charge',
    'invoice_no',
    'invoice_recd_on',
    'repair_invoice_cleared_on',
  ];
  const t = useRepairTabForm({ ...props, fieldNames: FIELDS });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <Label htmlFor="vendor_supplier_name">Vendor / Supplier's Name</Label>
          <Input id="vendor_supplier_name" disabled={!props.canWrite} {...t.registerField('vendor_supplier_name')} />
        </div>
        <div>
          <Label htmlFor="intimation_sent_on">Intimation Sent On</Label>
          <Input id="intimation_sent_on" type="date" disabled={!props.canWrite} {...t.registerField('intimation_sent_on')} />
        </div>
        <div>
          <Label htmlFor="sent_to_vendor_date">Sent To Vendor (1st Visit On)</Label>
          <Input id="sent_to_vendor_date" type="date" disabled={!props.canWrite} {...t.registerField('sent_to_vendor_date')} />
        </div>
        <div>
          <Label htmlFor="received_from_vendor_date">Received From Vendor (Completed) Date</Label>
          <Input id="received_from_vendor_date" type="date" disabled={!props.canWrite} {...t.registerField('received_from_vendor_date')} />
        </div>
        <div>
          <Label htmlFor="repair_sent_to_store_on">Sent to Store On</Label>
          <Input id="repair_sent_to_store_on" type="date" disabled={!props.canWrite} {...t.registerField('repair_sent_to_store_on')} />
        </div>
        <div>
          <Label htmlFor="repair_store_ref_number">Store Ref Number</Label>
          <Input id="repair_store_ref_number" disabled={!props.canWrite} placeholder="Store reference number" {...t.registerField('repair_store_ref_number')} />
        </div>
        <div>
          <Label htmlFor="gate_pass_no">Gate Pass No.</Label>
          <Input id="gate_pass_no" disabled={!props.canWrite} {...t.registerField('gate_pass_no')} />
        </div>
        <div>
          <Label htmlFor="gate_pass_issued_date">Gate Pass Issued Date</Label>
          <Input id="gate_pass_issued_date" type="date" disabled={!props.canWrite} {...t.registerField('gate_pass_issued_date')} />
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-ink mb-5">Cost Details</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <Label htmlFor="cost_of_component">Cost of Component (Rs.)</Label>
            <Input id="cost_of_component" type="number" step="0.01" min="0" disabled={!props.canWrite} {...t.registerField('cost_of_component')} />
          </div>
          <div>
            <Label htmlFor="labour_charges">Labour Charges (Rs.)</Label>
            <Input id="labour_charges" type="number" step="0.01" min="0" disabled={!props.canWrite} {...t.registerField('labour_charges')} />
          </div>
          <div>
            <Label htmlFor="repair_transport_charge">Transport Charge (Rs.)</Label>
            <Input id="repair_transport_charge" type="number" step="0.01" min="0" disabled={!props.canWrite} placeholder="0.00" {...t.registerField('repair_transport_charge')} />
          </div>
          <div>
            <Label htmlFor="invoice_no">Invoice No.</Label>
            <Input id="invoice_no" disabled={!props.canWrite} {...t.registerField('invoice_no')} />
          </div>
          <div>
            <Label htmlFor="invoice_recd_on">Invoice Recd. On</Label>
            <Input id="invoice_recd_on" type="date" disabled={!props.canWrite} {...t.registerField('invoice_recd_on')} />
          </div>
          <div>
            <Label htmlFor="repair_invoice_cleared_on">Invoice Cleared On</Label>
            <Input id="repair_invoice_cleared_on" type="date" disabled={!props.canWrite} {...t.registerField('repair_invoice_cleared_on')} />
          </div>
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

function splitSections(value) {
  return String(value || '')
    .split('|')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function RepairFaultAnalysisTab(props) {
  const FIELDS = [
    'repair_fault_analysis_description',
    'repair_fault_analysis_action_taken',
    'repair_fault_analysis_sections',
    'repair_fault_analysis_category',
  ];
  const t = useRepairTabForm({ ...props, fieldNames: FIELDS });
  const sectionsRaw = t.watch('repair_fault_analysis_sections') || '';
  const selected = useMemo(() => new Set(splitSections(sectionsRaw)), [sectionsRaw]);

  function toggleSection(value) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    t.setValue('repair_fault_analysis_sections', Array.from(next).join('|'), { shouldDirty: true });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink">Fault Analysis</h2>
      <div>
        <Label htmlFor="repair_fault_analysis_description" required>Fault Description</Label>
        <textarea
          id="repair_fault_analysis_description"
          rows={5}
          disabled={!props.canWrite}
          className={textAreaClass()}
          placeholder="Describe the fault/issue identified..."
          {...t.registerField('repair_fault_analysis_description')}
        />
      </div>
      <div>
        <Label htmlFor="repair_fault_analysis_action_taken" required>Action Taken Description</Label>
        <textarea
          id="repair_fault_analysis_action_taken"
          rows={5}
          disabled={!props.canWrite}
          className={textAreaClass()}
          placeholder="Describe the action taken to resolve the fault..."
          {...t.registerField('repair_fault_analysis_action_taken')}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <div className="block text-sm font-semibold text-ink-soft mb-2">
            Faulty Section(s) <span className="text-danger">*</span>
          </div>
          <input type="hidden" {...t.registerField('repair_fault_analysis_sections')} />
          <div className="rounded-md border border-border bg-white px-4 py-3 max-h-56 overflow-y-auto space-y-3">
            {REPAIR_FAULTY_SECTION_OPTIONS.map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={selected.has(v)}
                  disabled={!props.canWrite}
                  onChange={() => toggleSection(v)}
                  className="h-4 w-4 accent-accent disabled:opacity-50"
                />
                {REPAIR_FAULTY_SECTION_LABELS[v]}
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-soft mt-2">Select all applicable sections</p>
        </div>
        <div>
          <Label htmlFor="repair_fault_analysis_category" required>Fault Category</Label>
          <OptionSelect
            id="repair_fault_analysis_category"
            name="repair_fault_analysis_category"
            disabled={!props.canWrite}
            registerField={t.registerField}
            placeholder="Select fault category..."
            options={REPAIR_FAULT_CATEGORY_OPTIONS}
            labels={REPAIR_FAULT_CATEGORY_LABELS}
          />
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}
