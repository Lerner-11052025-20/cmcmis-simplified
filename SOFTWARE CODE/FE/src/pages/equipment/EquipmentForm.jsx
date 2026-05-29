// ============================================================================
// src/pages/equipment/EquipmentForm.jsx  —  /equipment/new
// ----------------------------------------------------------------------------
// Six sections, matching the reference mockup:
//   §1 Job Type Selection      — Job Category + Job Type (pre-selected)
//   §2 Equipment Details       — Name, Make, Model, Serial, Type, Options
//   §3 Accessories             — Phase-6 park (UI placeholder)
//   §4 Procurement Details     — PO, MIVR, Cost, Currency, Warranty
//   §5 Submitted By            — auto-filled from req.user + contact extras
//   §6 Terms & Conditions      — six MANDATORY checkboxes
//
// Submit-button enabling rule: form must be valid AND tc count === 6.
//
// PHASE-5 K.6 SCOPE NOTE:
// MIVR, lab/room phone, subsystem, project, complaint, accessories, T&Cs
// are SENT to the BE but the BE persists them only as JSON in
// audit_log.notes. Full JR persistence ships Phase 6.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft, Info, Plus, Save, Send, Trash2, AlertCircle,
} from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { equipmentSchema } from '../../lib/schemas/equipmentSchema.js';
import {
  fetchTypes, fetchMakes, fetchDivisions, fetchProjects, createEquipment,
} from '../../lib/api/equipment.js';

// Six T&C bodies — verbatim from the reference image.
const TC_TEXT = [
  'I confirm that all procurement and equipment details provided are accurate and supported by valid documentation.',
  'I understand that the equipment registration process will begin only after verification of PO and MIVR documents.',
  'I acknowledge that a unique Equipment ID will be assigned upon successful registration and physical verification.',
  'I agree to provide all necessary accessories, manuals, and calibration certificates from the manufacturer.',
  'I accept responsibility for maintaining warranty documentation and notifying the lab of any warranty claims.',
  'I understand that registered equipment will be entered into the calibration schedule as per its specified frequency.',
];

const DRAFT_KEY_PREFIX = 'eqp_draft_';

export function EquipmentForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');

  // ── Master-data dropdowns ───────────────────────────────────────────
  const [types, setTypes] = useState([]);
  const [makes, setMakes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [mastersLoading, setMastersLoading] = useState(true);
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetchTypes(ctrl.signal),
      fetchMakes(ctrl.signal),
      fetchDivisions(ctrl.signal),
      fetchProjects(ctrl.signal),
    ])
      .then(([t, m, d, p]) => { setTypes(t); setMakes(m); setDivisions(d); setProjects(p); })
      .catch(() => {/* fields will be empty; user sees a banner below */})
      .finally(() => setMastersLoading(false));
    return () => ctrl.abort();
  }, []);

  // ── react-hook-form ─────────────────────────────────────────────────
  const draftKey = user ? DRAFT_KEY_PREFIX + user.userId : null;
  const initialValues = useMemo(() => {
    const base = {
      job_category: 'F&PE',
      job_type: 'Registration',
      name: '',
      make_id: '',
      model_no: '',
      mfg_model_name: '',
      serial_no: '',
      equipment_type_id: '',
      other_equipment_type: '',
      options_description: '',
      accessories: [],
      po_number: '',
      po_date: '',
      mivr_number: '',
      mivr_date: '',
      line_item_code: '',
      cost: '',
      cost_currency: 'INR',
      warranty_months: '',
      lab_phone: '',
      room_phone: '',
      division_id: '',
      subsystem: '',
      project: '',
      tc_accepted: { tc_1: false, tc_2: false, tc_3: false, tc_4: false, tc_5: false, tc_6: false },
    };
    if (!draftKey) return base;
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? { ...base, ...JSON.parse(raw) } : base;
    } catch { return base; }
  }, [draftKey]);

  const {
    register, handleSubmit, watch, setValue, getValues, control,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
    resolver: zodResolver(equipmentSchema),
    defaultValues: initialValues,
    mode: 'onChange',
  });

  const { fields: accFields, append: accAppend, remove: accRemove } = useFieldArray({
    control, name: 'accessories',
  });

  // ── Accessory add-row state (lives outside the field-array's
  //    repeated rows because the row only joins after the user clicks +) ──
  const [accType, setAccType] = useState('');
  const [accName, setAccName] = useState('');
  const [accSerial, setAccSerial] = useState('');

  // ── T&C live counter (drives the yellow banner + submit button) ─────
  const tc = watch('tc_accepted');
  const tcCount = Object.values(tc || {}).filter(Boolean).length;

  const selectedMake = watch('make_id');
  const selectedType = watch('equipment_type_id');

  // ── Auto-save draft to localStorage on change (250ms throttle) ──────
  useEffect(() => {
    if (!draftKey) return undefined;
    const id = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(getValues())); } catch {/*quota*/}
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch()]);

  // ── Submit ────────────────────────────────────────────────────────
  async function onSubmit(values) {
    setSubmitError('');
    try {
      const payload = { ...values };
      if (payload.make_id === 'other') {
        payload.make_id = null;
      } else {
        payload.mfg_model_name = '';
      }
      if (payload.equipment_type_id === 'other') {
        payload.equipment_type_id = null;
      } else {
        payload.other_equipment_type = '';
      }

      const result = await createEquipment(payload);
      if (draftKey) localStorage.removeItem(draftKey);
      // navigate back to list with a (very simple) success hint via state
      navigate('/equipment', {
        replace: true,
        state: { justRegistered: result.equipment_code },
      });
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message;
      if (code === 'CONFLICT') {
        setSubmitError(msg || 'Duplicate detected.');
      } else if (code === 'VALIDATION_ERROR') {
        setSubmitError(msg || 'Some fields are invalid. Please review.');
      } else {
        setSubmitError(msg || 'Submission failed. Please retry.');
      }
    }
  }

  function saveDraft() {
    if (!draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(getValues()));
      // Lightweight toast
      // eslint-disable-next-line no-alert
      alert('Draft saved locally.');
    } catch {
      // eslint-disable-next-line no-alert
      alert('Could not save draft (storage full?).');
    }
  }

  function cancel() {
    // eslint-disable-next-line no-alert
    if (window.confirm('Discard your changes?')) navigate('/equipment');
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl space-y-4">
      <Link
        to="/equipment"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-accent"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Back to Equipment
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink">New Job Request</h1>
        <p className="text-sm text-ink-soft mt-1">
          Submit a new calibration, repair, or registration request
        </p>
      </div>

      {/* Header explainer card */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-start gap-3">
        <Info size={18} className="text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <div className="text-sm font-medium text-ink">Equipment Registration</div>
          <p className="text-xs text-ink-soft mt-0.5">
            You are registering new equipment. Please fill in all equipment details and procurement information.
            An Equipment ID will be auto-generated upon successful registration.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        <input type="hidden" {...register('job_category')} />
        <input type="hidden" {...register('job_type')} />

        {/* ─── §1 Equipment Details ──────────────────────────────── */}
        <Section title="1. Equipment Details">
          <div className="rounded-md bg-accent/5 text-accent text-xs px-3 py-2 mb-3">
            <span className="font-medium">New Equipment Registration:</span>{' '}
            Equipment ID will be auto-generated after successful registration and verification.
          </div>
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Equipment Name *" error={errors.name?.message}>
              <Input placeholder="Enter equipment name" {...register('name')} />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Manufacturer Name *" error={errors.make_id?.message}>
                <Select {...register('make_id')}>
                  <option value="">{mastersLoading ? 'Loading…' : 'Select manufacturer'}</option>
                  {makes.map((m) => (
                    <option key={m.make_id} value={m.make_id}>{m.name}</option>
                  ))}
                  {!mastersLoading && <option value="other">Other</option>}
                </Select>
              </FormField>
              <FormField label="Model No." error={errors.model_no?.message}>
                <Input placeholder="Enter model number" {...register('model_no')} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedMake === 'other' ? (
                <FormField label="Other Manufacturer Name *" error={errors.mfg_model_name?.message}>
                  <Input placeholder="Enter other manufacturer name" {...register('mfg_model_name')} />
                </FormField>
              ) : (
                <div />
              )}
              <FormField label="Serial No. *" error={errors.serial_no?.message}>
                <Input placeholder="Enter serial number" {...register('serial_no')} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Equipment Type" error={errors.equipment_type_id?.message}>
                <Select {...register('equipment_type_id')}>
                  <option value="">{mastersLoading ? 'Loading…' : 'Select type'}</option>
                  {types.map((t) => (
                    <option key={t.type_id} value={t.type_id}>{t.name}</option>
                  ))}
                  {!mastersLoading && <option value="other">Other</option>}
                </Select>
              </FormField>
              {selectedType === 'other' ? (
                <FormField label="Other Equipment Type *" error={errors.other_equipment_type?.message}>
                  <Input placeholder="Enter other equipment type" {...register('other_equipment_type')} />
                </FormField>
              ) : (
                <div />
              )}
            </div>
            <FormField label="Options / Description" error={errors.options_description?.message}>
              <textarea
                rows={3}
                placeholder="Enter additional options or description (max 250 chars)"
                className="block w-full rounded-md border border-border bg-white text-ink shadow-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                {...register('options_description')}
              />
            </FormField>
          </div>
        </Section>

        {/* ─── §2 Accessories ─────────────────────── */}
        <Section
          title="2. Accessories"
          subtitle="Add any accessories or additional instruments required with the main equipment"
        >
          <div className="rounded-md border border-border bg-base-elev/40 p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-ink mb-1">Accessory Type</label>
                <Select value={accType} onChange={(e) => setAccType(e.target.value)}>
                  <option value="">Select type</option>
                  <option value="Probe">Probe</option>
                  <option value="Cable">Cable</option>
                  <option value="Adapter">Adapter</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-ink mb-1">Accessory Name</label>
                <Input
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Enter accessory name"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-ink mb-1">Serial No.</label>
                <Input
                  value={accSerial}
                  onChange={(e) => setAccSerial(e.target.value)}
                  placeholder="Enter serial number"
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!accName.trim() || !accType}
                  onClick={() => {
                    accAppend({
                      accessory_type: accType,
                      accessory_name: accName.trim(),
                      serial_no: accSerial.trim(),
                    });
                    setAccType(''); setAccName(''); setAccSerial('');
                  }}
                  aria-label="Add accessory"
                >
                  <Plus size={14} strokeWidth={1.75} />
                </Button>
              </div>
            </div>
          </div>

          {accFields.length === 0 ? (
            <p className="mt-3 text-center text-xs text-ink-soft">No accessories added yet</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {accFields.map((row, idx) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between text-xs text-ink bg-white border border-border rounded-md px-3 py-2"
                >
                  <span>
                    <span className="font-medium">{row.accessory_type || '—'}</span>
                    {' · '}
                    {row.accessory_name}
                    {row.serial_no ? <span className="text-ink-soft"> (SN {row.serial_no})</span> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => accRemove(idx)}
                    className="text-ink-soft hover:text-danger"
                    aria-label="Remove accessory"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ─── §3 Procurement Details ────────────────────────────── */}
        <Section
          title="3. Procurement Details"
          subtitle="Provide procurement information for equipment registration"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="PO Number *" error={errors.po_number?.message}>
              <Input placeholder="Enter PO number" {...register('po_number')} />
            </FormField>
            <FormField label="PO Date *" error={errors.po_date?.message}>
              <Input type="date" {...register('po_date')} />
            </FormField>
            <FormField label="MIVR Number *" error={errors.mivr_number?.message}>
              <Input placeholder="Enter MIVR number" {...register('mivr_number')} />
            </FormField>
            <FormField label="MIVR Date *" error={errors.mivr_date?.message}>
              <Input type="date" {...register('mivr_date')} />
            </FormField>
            <FormField label="Line Item Code *" error={errors.line_item_code?.message}>
              <Input placeholder="Enter line item code" {...register('line_item_code')} />
            </FormField>
            <FormField label="Cost *" error={errors.cost?.message}>
              <Input type="number" step="0.01" min="0" placeholder="Enter cost" {...register('cost')} />
            </FormField>
            <FormField label="Cost Currency *" error={errors.cost_currency?.message}>
              <Select {...register('cost_currency')}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </FormField>
            <FormField label="Warranty Period (months)" error={errors.warranty_months?.message}>
              <Input type="number" min="0" placeholder="Enter warranty period" {...register('warranty_months')} />
            </FormField>
          </div>
        </Section>

        {/* ─── §4 Submitted By ───────────────────────────────────── */}
        <Section title="4. Submitted By">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Name *">
              <Input value={user?.display_name || ''} disabled />
            </FormField>
            <FormField label="SAC Employee ID *">
              <Input value={user?.employeeId || user?.sub || ''} disabled />
            </FormField>
            <FormField label="Designation *">
              <Input value={user?.designation || ''} disabled />
            </FormField>
            <FormField label="Email *">
              <Input value={user?.email || ''} disabled />
            </FormField>
            <FormField label="Lab Phone" error={errors.lab_phone?.message}>
              <Input placeholder="Enter lab phone" {...register('lab_phone')} />
            </FormField>
            <FormField label="Room Phone" error={errors.room_phone?.message}>
              <Input placeholder="Enter room phone" {...register('room_phone')} />
            </FormField>
            <FormField label="Division *" error={errors.division_id?.message}>
              <Select {...register('division_id')}>
                <option value="">{mastersLoading ? 'Loading…' : 'Select division'}</option>
                {divisions.map((d) => (
                  <option key={d.division_id} value={d.division_id}>
                    {d.division_id} --- {d.code} --- {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Subsystem" error={errors.subsystem?.message}>
              <Input placeholder="Enter subsystem" {...register('subsystem')} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 mt-4">
            <FormField label="Project" error={errors.project?.message}>
              <Select {...register('project')}>
                <option value="">{mastersLoading ? 'Loading…' : 'Select project'}</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </Section>

        {/* ─── §5 Terms and Conditions ───────────────────────────── */}
        <Section
          title="5. Terms and Conditions"
          subtitle="Please read and accept all terms and conditions before submitting your registration"
          icon={<AlertCircle size={18} className="text-accent" strokeWidth={1.5} />}
        >
          <div className="mb-4 pb-3 border-b border-border">
            <Checkbox
              checked={tcCount === 6}
              onChange={(e) => {
                const checked = e.target.checked;
                setValue('tc_accepted.tc_1', checked, { shouldValidate: true });
                setValue('tc_accepted.tc_2', checked, { shouldValidate: true });
                setValue('tc_accepted.tc_3', checked, { shouldValidate: true });
                setValue('tc_accepted.tc_4', checked, { shouldValidate: true });
                setValue('tc_accepted.tc_5', checked, { shouldValidate: true });
                setValue('tc_accepted.tc_6', checked, { shouldValidate: true });
              }}
              label={<span className="font-semibold text-sm">Mark as all ticked</span>}
            />
          </div>
          <div className="space-y-2">
            {TC_TEXT.map((text, i) => {
              const key = `tc_${i + 1}`;
              return (
                <div
                  key={key}
                  className="rounded-md border border-border px-4 py-3 bg-white"
                >
                  <Checkbox
                    {...register(`tc_accepted.${key}`)}
                    label={
                      <span>
                        <span className="font-medium">T&amp;C {i + 1}:</span> {text}
                      </span>
                    }
                  />
                </div>
              );
            })}
          </div>

          <div
            role="status"
            className="mt-4 rounded-md bg-warning/10 text-warning text-xs px-3 py-2 flex items-center gap-2"
          >
            <AlertCircle size={14} strokeWidth={1.5} />
            <span>
              You must accept all terms and conditions to submit this registration.{' '}
              <span className="font-semibold">({tcCount}/6 accepted)</span>
            </span>
          </div>
        </Section>

        {/* ─── Server error banner ──────────────────────────────── */}
        {submitError ? (
          <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
            {submitError}
          </div>
        ) : null}

        {/* ─── Bottom action bar ────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={saveDraft}>
              <Save size={14} strokeWidth={1.5} />
              Save as Draft
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isValid || tcCount !== 6 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner size={14} className="text-white" /> Submitting…
                </>
              ) : (
                <>
                  <Send size={14} strokeWidth={1.5} />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────
function Section({ title, subtitle, icon, children }) {
  return (
    <section className="bg-white rounded-lg border border-border shadow-card p-6">
      <div className="mb-4 flex items-start gap-2">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
