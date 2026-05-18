// ============================================================================
// src/pages/jobRequests/JobRequestNew.jsx  —  /job-requests/new route
// ----------------------------------------------------------------------------
// Multi-section creation form. Sections 1-5 stack vertically; sticky footer
// has [Cancel] [Save as Draft] [Submit Request].
//
//   1. Job Type Selection
//   2. Equipment Details
//   3. Accessories  (repeatable rows, ≤ 20)
//   4. Submitted By  (★ auto-fill from /me — BR-JR-06)
//   5. Terms and Conditions (6 checkboxes + X/6 counter)
//
// SUBMIT GATE
//   The "Submit Request" button is disabled unless ALL of:
//     • All 6 T&C boxes ticked
//     • Form is zod-valid
//   If the user bypasses the FE via curl, the BE re-checks tnc_accepted=true
//   and rejects with 400 (defence in depth — R10).
//
// AUTO-FILL (BR-JR-06)
//   Section 4's Name, SAC Employee ID, Designation, Email come from /me
//   and are readonly. The server IGNORES any submitter_* in the request
//   body and uses req.user.employeeId — so a tampered payload is harmless.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Send, AlertCircle, Plus, X } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { createJobRequest } from '../../lib/api/jobRequests.js';
import { fetchDivisions, searchEquipment } from '../../lib/api/lookups.js';
import { invalidateJobRequestCache } from '../../lib/hooks/useJobRequestList.js';
import { jobRequestCreateSchema } from '../../lib/schemas/jobRequestSchemas.js';
import { TERMS, TNC_VERSION } from './form/tncContent.js';

// ── Static select options (locked to BE enums) ──────────────────────
const JOB_CATEGORIES = [
  { value: 'TME', label: 'T&ME (Test & Measurement)' },
  { value: 'FPE', label: 'F&PE (Fabrication & Production)' },
];
const JOB_TYPES = [
  { value: 'CALIBRATION',  label: 'Calibration' },
  { value: 'REPAIR',       label: 'Repair' },
  { value: 'REGISTRATION', label: 'Registration' },
];
const EQUIPMENT_TYPE_OPTIONS = ['Instrument', 'Equipment', 'System', 'Component', 'Other'];
const ACCESSORY_TYPE_OPTIONS = ['Probe', 'Cable', 'Adapter', 'Carrying Case', 'Power Supply', 'Manual', 'Other'];
const PRIORITIES = [
  { value: 'LOW',    label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH',   label: 'High' },
];

export function JobRequestNew() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Section-1 + 2 + 3 + 4 form state (single flat object) ─────────
  const [form, setForm] = useState({
    job_category: '',
    job_type: '',
    equipment_id: null,
    equipment_name: '',
    make: '',
    model_no: '',
    serial_no: '',
    equipment_type: '',
    options_description: '',
    lab_phone: '',
    room_phone: '',
    division_id: '',
    subsystem: '',
    project_name: '',
    complaint_description: '',
    remarks: '',
    equipment_sent_after_repair: false,
    priority: 'MEDIUM',
    accessories: [],
  });

  // ── Section-5 T&C state — six independent booleans ────────────────
  const [tnc, setTnc] = useState(() => TERMS.map(() => false));
  const tncAcceptedCount = tnc.filter(Boolean).length;
  const allTncAccepted = tncAcceptedCount === TERMS.length;

  // ── Submission state ─────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Divisions dropdown — fetched once on mount ────────────────────
  const [divisions, setDivisions] = useState([]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchDivisions(ctrl.signal)
      .then(setDivisions)
      .catch(() => { /* dropdown stays empty; field shows placeholder */ });
    return () => ctrl.abort();
  }, []);

  // ── Auto-fill Section 4 from /me once user becomes available ──────
  // We split this into a one-shot effect so user-edits to lab_phone /
  // room_phone / division_id / subsystem / project don't get clobbered
  // on every re-render.
  const filledFromMeRef = useRef(false);
  useEffect(() => {
    if (filledFromMeRef.current || !user) return;
    filledFromMeRef.current = true;
    setForm((f) => ({
      ...f,
      lab_phone:   f.lab_phone   || user.lab_phone || '',
      room_phone:  f.room_phone  || user.room_phone || '',
      division_id: f.division_id || (user.division_id ? String(user.division_id) : ''),
    }));
  }, [user]);

  // ── Equipment ID typeahead state ─────────────────────────────────
  const [eqOpts, setEqOpts] = useState([]);
  const [eqOpen, setEqOpen] = useState(false);
  const eqDebRef = useRef(null);
  function onEquipmentQueryChange(value) {
    update('equipment_name', value);
    if (eqDebRef.current) clearTimeout(eqDebRef.current);
    if (!value || value.length < 2) { setEqOpts([]); return; }
    eqDebRef.current = setTimeout(async () => {
      try {
        const items = await searchEquipment(value, 10);
        setEqOpts(items || []);
        setEqOpen(true);
      } catch {
        setEqOpts([]);
      }
    }, 300);
  }
  function pickEquipment(opt) {
    setForm((f) => ({
      ...f,
      equipment_id: opt.eqm_id,
      equipment_name: opt.name || '',
      make: opt.make || '',
      model_no: opt.model_no || '',
      serial_no: opt.serial_no || '',
      equipment_type: opt.eqm_type || '',
    }));
    setEqOpen(false);
  }

  // ── Update helper ────────────────────────────────────────────────
  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((e) => ({ ...e, [key]: undefined }));
    }
  }

  // ── Accessories repeatable rows ──────────────────────────────────
  const [accDraft, setAccDraft] = useState({ type: '', name: '', serial_no: '' });
  const accDraftValid = accDraft.type && accDraft.name;
  function addAccessory() {
    if (!accDraftValid) return;
    if (form.accessories.length >= 20) {
      setFormError('Maximum 20 accessories allowed.');
      return;
    }
    setForm((f) => ({
      ...f,
      accessories: [
        ...f.accessories,
        { type: accDraft.type, name: accDraft.name, serial_no: accDraft.serial_no || '' },
      ],
    }));
    setAccDraft({ type: '', name: '', serial_no: '' });
  }
  function removeAccessory(idx) {
    setForm((f) => ({
      ...f,
      accessories: f.accessories.filter((_, i) => i !== idx),
    }));
  }

  // ── Build the payload + validate via zod ──────────────────────────
  const payload = useMemo(() => ({
    job_category: form.job_category || undefined,
    job_type: form.job_type || undefined,
    equipment_id: form.equipment_id || null,
    equipment_name: form.equipment_name.trim(),
    make: form.make.trim(),
    model_no: form.model_no.trim(),
    serial_no: form.serial_no.trim(),
    equipment_type: form.equipment_type || '',
    options_description: form.options_description.trim(),
    accessories: form.accessories,
    lab_phone: form.lab_phone.trim(),
    room_phone: form.room_phone.trim(),
    division_id: form.division_id ? Number(form.division_id) : undefined,
    subsystem: form.subsystem.trim(),
    project_name: form.project_name.trim(),
    complaint_description: form.complaint_description.trim(),
    remarks: form.remarks.trim(),
    equipment_sent_after_repair: !!form.equipment_sent_after_repair,
    priority: form.priority,
    tnc_version: TNC_VERSION,
  }), [form]);

  // Cheap "is the form structurally valid?" check, used to enable/disable
  // the Submit button. We don't surface per-field errors here — those
  // only appear after the user clicks Save/Submit and the server pushes
  // back. (Per-field on-type would be noisy.)
  const isStructurallyValid = useMemo(() => {
    const parsed = jobRequestCreateSchema.safeParse({ ...payload, submit_now: false });
    return parsed.success;
  }, [payload]);

  // ── Submit handlers ──────────────────────────────────────────────
  async function handleSave(submitNow) {
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await createJobRequest({
        ...payload,
        submit_now: submitNow,
        tnc_accepted: submitNow ? allTncAccepted : false,
      });
      invalidateJobRequestCache();
      // Browser-native success notification — keeps the toast lib zero-dep.
      // (sonner is in the spec but not in package.json; alert() is the
      // present-mode placeholder until we install one in Phase 7.)
      window.alert(
        submitNow
          ? `Job request submitted (${result.request_code})`
          : `Saved as draft (${result.request_code})`,
      );
      navigate('/job-requests');
    } catch (err) {
      const apiErr = err?.response?.data?.error;
      if (apiErr?.details && Array.isArray(apiErr.details)) {
        const f = {};
        apiErr.details.forEach((d) => { if (d.path) f[d.path] = d.message; });
        setFieldErrors(f);
      }
      setFormError(apiErr?.message || err.message || 'Could not save the request.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting && isStructurallyValid && allTncAccepted;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Back link + Title ────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/job-requests')}
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Back to Job Requests
        </button>
        <h1 className="text-2xl font-semibold text-ink mt-2">New Job Request</h1>
        <p className="text-sm text-ink-soft mt-1">
          Submit a new calibration, repair, or registration request
        </p>
      </div>

      {/* ── Top-level error banner ──────────────────────────── */}
      {formError ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2">
          {formError}
        </div>
      ) : null}

      {/* ─────────────────────── SECTION 1 ─────────────────────── */}
      <section className="bg-white rounded-lg border border-border shadow-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">1. Job Type Selection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Job Category" required error={fieldErrors.job_category}>
            <Select
              value={form.job_category}
              onChange={(e) => update('job_category', e.target.value)}
              aria-required="true"
            >
              <option value="">Select category</option>
              {JOB_CATEGORIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Job Type" required error={fieldErrors.job_type}>
            <Select
              value={form.job_type}
              onChange={(e) => update('job_type', e.target.value)}
              aria-required="true"
            >
              <option value="">Select type</option>
              {JOB_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </section>

      {/* ─────────────────────── SECTION 2 ─────────────────────── */}
      <section className="bg-white rounded-lg border border-border shadow-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">2. Equipment Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Equipment ID / Search" error={fieldErrors.equipment_name}>
            <div className="relative">
              <Input
                placeholder="Search or enter equipment ID"
                value={form.equipment_name}
                onChange={(e) => onEquipmentQueryChange(e.target.value)}
                onFocus={() => eqOpts.length && setEqOpen(true)}
                onBlur={() => setTimeout(() => setEqOpen(false), 150)}
              />
              {eqOpen && eqOpts.length > 0 ? (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-border rounded-md shadow-card max-h-64 overflow-auto">
                  {eqOpts.map((o) => (
                    <li
                      key={`${o.eqm_type}-${o.eqm_id}`}
                      className="px-3 py-2 hover:bg-base-elev cursor-pointer text-sm"
                      onMouseDown={(e) => { e.preventDefault(); pickEquipment(o); }}
                    >
                      <div className="font-medium text-ink">{o.name}</div>
                      <div className="text-xs text-ink-soft">
                        {o.eqm_type}-{o.eqm_id} · {o.make || '—'} · SN {o.serial_no || '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </FormField>
          <FormField label="Equipment Name" required error={fieldErrors.equipment_name}>
            <Input
              value={form.equipment_name}
              onChange={(e) => update('equipment_name', e.target.value)}
              placeholder="Enter equipment name"
            />
          </FormField>
          <FormField label="Make" error={fieldErrors.make}>
            <Input
              value={form.make}
              onChange={(e) => update('make', e.target.value)}
              placeholder="Enter manufacturer"
            />
          </FormField>
          <FormField label="Model No." error={fieldErrors.model_no}>
            <Input
              value={form.model_no}
              onChange={(e) => update('model_no', e.target.value)}
              placeholder="Enter model number"
            />
          </FormField>
          <FormField label="Serial No." error={fieldErrors.serial_no}>
            <Input
              value={form.serial_no}
              onChange={(e) => update('serial_no', e.target.value)}
              placeholder="Enter serial number"
            />
          </FormField>
          <FormField label="Equipment Type" error={fieldErrors.equipment_type}>
            <Select
              value={form.equipment_type}
              onChange={(e) => update('equipment_type', e.target.value)}
            >
              <option value="">Select type</option>
              {EQUIPMENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Options / Description" error={fieldErrors.options_description}>
              <textarea
                rows={3}
                className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                value={form.options_description}
                onChange={(e) => update('options_description', e.target.value)}
                placeholder="Enter additional options or description"
              />
            </FormField>
          </div>
        </div>
      </section>

      {/* ─────────────────────── SECTION 3 ─────────────────────── */}
      <section className="bg-white rounded-lg border border-border shadow-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-1">3. Accessories</h2>
        <p className="text-xs text-ink-soft mb-4">
          Add any accessories or additional instruments required with the main equipment
        </p>

        {form.accessories.length > 0 ? (
          <ul className="mb-4 divide-y divide-border rounded-md border border-border">
            {form.accessories.map((a, i) => (
              <li key={i} className="px-3 py-2 flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium text-ink">{a.type}</span>
                  <span className="text-ink-soft"> · {a.name}</span>
                  {a.serial_no ? <span className="text-ink-soft"> · SN {a.serial_no}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => removeAccessory(i)}
                  className="text-ink-soft hover:text-danger"
                  aria-label={`Remove accessory ${i + 1}`}
                >
                  <X size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <FormField label="Accessory Type">
              <Select
                value={accDraft.type}
                onChange={(e) => setAccDraft((d) => ({ ...d, type: e.target.value }))}
              >
                <option value="">Select type</option>
                {ACCESSORY_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="md:col-span-4">
            <FormField label="Accessory Name">
              <Input
                value={accDraft.name}
                onChange={(e) => setAccDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Enter accessory name"
              />
            </FormField>
          </div>
          <div className="md:col-span-3">
            <FormField label="Serial No.">
              <Input
                value={accDraft.serial_no}
                onChange={(e) => setAccDraft((d) => ({ ...d, serial_no: e.target.value }))}
                placeholder="Enter serial number"
              />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={addAccessory}
              disabled={!accDraftValid}
            >
              <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
              Add Accessory
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────────────── SECTION 4 ─────────────────────── */}
      <section className="bg-white rounded-lg border border-border shadow-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-1">4. Submitted By</h2>
        <p className="text-xs text-ink-soft mb-4">
          Auto-filled from your profile. Star-marked fields are read-only (server-set).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Name" required>
            <Input value={user?.display_name || ''} disabled readOnly />
          </FormField>
          <FormField label="SAC Employee ID" required>
            <Input value={user?.employeeId || user?.sub || ''} disabled readOnly />
          </FormField>
          <FormField label="Designation" required>
            <Input value={user?.designation || ''} disabled readOnly />
          </FormField>
          <FormField label="Email" required>
            <Input value={user?.email || ''} disabled readOnly />
          </FormField>
          <FormField label="Lab Phone">
            <Input
              value={form.lab_phone}
              onChange={(e) => update('lab_phone', e.target.value)}
              placeholder="Enter lab phone"
            />
          </FormField>
          <FormField label="Room Phone">
            <Input
              value={form.room_phone}
              onChange={(e) => update('room_phone', e.target.value)}
              placeholder="Enter room phone"
            />
          </FormField>
          <FormField label="Division" required error={fieldErrors.division_id}>
            <Select
              value={form.division_id}
              onChange={(e) => update('division_id', e.target.value)}
            >
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Subsystem">
            <Input
              value={form.subsystem}
              onChange={(e) => update('subsystem', e.target.value)}
              placeholder="Enter subsystem"
            />
          </FormField>
          <FormField label="Project">
            <Input
              value={form.project_name}
              onChange={(e) => update('project_name', e.target.value)}
              placeholder="Enter project name"
            />
          </FormField>
          <FormField label="Priority">
            <Select
              value={form.priority}
              onChange={(e) => update('priority', e.target.value)}
            >
              {PRIORITIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Complaint Description" required error={fieldErrors.complaint_description}>
              <textarea
                rows={4}
                className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                value={form.complaint_description}
                onChange={(e) => update('complaint_description', e.target.value)}
                placeholder="Describe the issue or requirements in detail (min 10 characters)"
              />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Remarks">
              <textarea
                rows={2}
                className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                value={form.remarks}
                onChange={(e) => update('remarks', e.target.value)}
                placeholder="Additional remarks or notes"
              />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <Checkbox
              checked={form.equipment_sent_after_repair}
              onChange={(e) => update('equipment_sent_after_repair', e.target.checked)}
              label="Equipment sent after repair"
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────── SECTION 5 ─────────────────────── */}
      <section className="bg-white rounded-lg border border-border shadow-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={18} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink">5. Terms and Conditions</h2>
        </div>
        <p className="text-xs text-ink-soft mb-4">
          Please read and accept all terms and conditions before submitting your request
        </p>

        <ul className="space-y-2">
          {TERMS.map((t, i) => (
            <li
              key={t.index}
              className="px-3 py-3 rounded-md border border-border bg-base-elev/30"
            >
              <Checkbox
                checked={tnc[i]}
                onChange={(e) => {
                  const next = [...tnc];
                  next[i] = e.target.checked;
                  setTnc(next);
                }}
                label={
                  <>
                    <span className="font-semibold">T&amp;C {t.index}:</span> {t.text}
                  </>
                }
              />
            </li>
          ))}
        </ul>

        {!allTncAccepted ? (
          <div
            role="status"
            className="mt-4 rounded-md bg-warning/15 text-amber-700 text-xs px-3 py-2 flex items-center gap-2"
          >
            <AlertCircle size={14} strokeWidth={1.75} aria-hidden="true" />
            You must accept all terms and conditions to submit this request.{' '}
            <span className="font-medium">({tncAcceptedCount}/{TERMS.length} accepted)</span>
          </div>
        ) : null}
      </section>

      {/* ──────────────────────── FOOTER ──────────────────────── */}
      <div className="flex items-center justify-between sticky bottom-0 bg-base/80 backdrop-blur py-3">
        <Button variant="secondary" onClick={() => navigate('/job-requests')} disabled={submitting}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={submitting || !isStructurallyValid}
          >
            <Save size={14} strokeWidth={1.75} aria-hidden="true" />
            Save as Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(true)}
            disabled={!canSubmit}
            title={!allTncAccepted ? 'Accept all 6 T&Cs to enable' : undefined}
          >
            <Send size={14} strokeWidth={1.75} aria-hidden="true" />
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}
