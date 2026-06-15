// ============================================================================
// pages/jobCards/tabs/RepairWorkflowTabs.jsx
// ----------------------------------------------------------------------------
// Dedicated TME/FPE repair workflow tabs.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { useCalibrationPeople } from '../../../lib/hooks/useCalibrationPeople.js';
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
  REPAIR_MAINTENANCE_TYPE_LABELS,
  REPAIR_MAINTENANCE_TYPE_OPTIONS,
  REPAIR_NOT_REPAIRABLE_REASON_LABELS,
  REPAIR_NOT_REPAIRABLE_REASON_OPTIONS,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_OPTIONS,
  REPAIR_TYPE_LABELS,
} from '../../../lib/schemas/jobCardSchemas.js';
import { TabSaveBar } from '../components/TabSaveBar.jsx';

const DATETIME_FIELDS_AS_DATE = new Set([
  'equipment_submitted_date',
  'equipment_received_date_actual',
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
    'submitted_by',
    'equipment_received_date_actual',
    'received_by',
  ];
  const t = useRepairTabForm({ ...props, fieldNames: FIELDS });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
      <div>
        <Label htmlFor="equipment_submitted_date">Equipment Submitted Date</Label>
        <Input id="equipment_submitted_date" type="date" disabled={!props.canWrite} {...t.registerField('equipment_submitted_date')} />
      </div>
      <div>
        <Label htmlFor="submitted_by">Submitted By</Label>
        <Input id="submitted_by" disabled={!props.canWrite} {...t.registerField('submitted_by')} />
      </div>
      <div>
        <Label htmlFor="equipment_received_date_actual">Equipment Received Date</Label>
        <Input id="equipment_received_date_actual" type="date" disabled={!props.canWrite} {...t.registerField('equipment_received_date_actual')} />
      </div>
      <div>
        <Label htmlFor="received_by">Received By</Label>
        <Input id="received_by" disabled={!props.canWrite} {...t.registerField('received_by')} />
      </div>
      <div className="lg:col-span-2">{t.saveBar}</div>
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
  const FIELDS = [
    'repair_maintenance_type',
    'repair_faulty_section',
    'repair_fault_category',
    'repair_attended_by_employee_id',
    'repair_fault_description',
    'repair_action_taken_description',
    'repair_sent_to_cal_lab_on',
    'repair_equipment_received_from_cal_lab',
    'repair_job_complete_date',
    'repair_status',
    'repair_not_repairable_reason',
    'repair_remarks',
  ];
  const t = useRepairTabForm({ ...props, fieldNames: FIELDS });
  const repairStatus = t.watch('repair_status');

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink">Maintenance Details</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <Label htmlFor="repair_maintenance_type" required>Maintenance Type</Label>
          <OptionSelect
            id="repair_maintenance_type"
            name="repair_maintenance_type"
            disabled={!props.canWrite}
            registerField={t.registerField}
            placeholder="Select maintenance type..."
            options={REPAIR_MAINTENANCE_TYPE_OPTIONS}
            labels={REPAIR_MAINTENANCE_TYPE_LABELS}
          />
        </div>
        <div>
          <Label htmlFor="repair_faulty_section" required>Faulty Section</Label>
          <OptionSelect
            id="repair_faulty_section"
            name="repair_faulty_section"
            disabled={!props.canWrite}
            registerField={t.registerField}
            placeholder="Select faulty section..."
            options={REPAIR_FAULTY_SECTION_OPTIONS}
            labels={REPAIR_FAULTY_SECTION_LABELS}
          />
        </div>
        <div>
          <Label htmlFor="repair_fault_category" required>Fault Category</Label>
          <OptionSelect
            id="repair_fault_category"
            name="repair_fault_category"
            disabled={!props.canWrite}
            registerField={t.registerField}
            placeholder="Select fault category..."
            options={REPAIR_FAULT_CATEGORY_OPTIONS}
            labels={REPAIR_FAULT_CATEGORY_LABELS}
          />
        </div>
        <div>
          <Label htmlFor="repair_attended_by_employee_id" required>Attended By</Label>
          <PeopleSelect
            id="repair_attended_by_employee_id"
            name="repair_attended_by_employee_id"
            disabled={!props.canWrite}
            registerField={t.registerField}
          />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="repair_fault_description" required>Fault Description</Label>
          <textarea
            id="repair_fault_description"
            rows={5}
            disabled={!props.canWrite}
            className={textAreaClass()}
            placeholder="Describe the fault in detail..."
            {...t.registerField('repair_fault_description')}
          />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="repair_action_taken_description" required>Action Taken Description</Label>
          <textarea
            id="repair_action_taken_description"
            rows={5}
            disabled={!props.canWrite}
            className={textAreaClass()}
            placeholder="Describe the action taken to resolve the issue..."
            {...t.registerField('repair_action_taken_description')}
          />
        </div>
        <div>
          <Label htmlFor="repair_sent_to_cal_lab_on">Sent to Cal Lab On</Label>
          <Input id="repair_sent_to_cal_lab_on" type="date" disabled={!props.canWrite} {...t.registerField('repair_sent_to_cal_lab_on')} />
        </div>
        <div>
          <Label htmlFor="repair_equipment_received_from_cal_lab">Equipment Received from Cal Lab</Label>
          <Input id="repair_equipment_received_from_cal_lab" type="date" disabled={!props.canWrite} {...t.registerField('repair_equipment_received_from_cal_lab')} />
        </div>
        <div>
          <Label htmlFor="repair_job_complete_date">Job Complete Date</Label>
          <Input id="repair_job_complete_date" type="date" disabled={!props.canWrite} {...t.registerField('repair_job_complete_date')} />
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
        </div>
        <div>
          <Label htmlFor="repair_not_repairable_reason">Not Repairable Reason</Label>
          <OptionSelect
            id="repair_not_repairable_reason"
            name="repair_not_repairable_reason"
            disabled={!props.canWrite || repairStatus !== 'NOT_REPAIRABLE'}
            registerField={t.registerField}
            placeholder="Select reason..."
            options={REPAIR_NOT_REPAIRABLE_REASON_OPTIONS}
            labels={REPAIR_NOT_REPAIRABLE_REASON_LABELS}
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Equipments Used for Repair</h2>
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
                  <Input
                    placeholder="e.g., EQ-CAL-2024-001"
                    {...tableInputProps({
                      drafts, setDrafts, rowId: row.id, field: 'equipment_id',
                      disabled: !canWrite || busyRow === row.id, commitField,
                    })}
                  />
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
        Add calibrated equipment and tools from the equipment database used during the repair process
      </p>
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
