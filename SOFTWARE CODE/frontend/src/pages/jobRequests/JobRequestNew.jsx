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
// TWO-TIER VALIDATION (2026-05-18 — fixes greyed-button-with-no-feedback bug)
//   • Save as Draft uses jobRequestDraftSchema (LOOSE):
//        only job_category, job_type, equipment_name (≥2), division_id
//        are required. Drafts intentionally accept partial work.
//   • Submit Request uses jobRequestSubmitSchema (STRICT):
//        adds tnc_accepted === true; complaint_description is optional.
//   The BE jobRequests.validators enforces the same two-tier rule based
//   on submit_now=true|false (defence in depth — R10).
//
// CLICK-ANYWAY UX
//   The buttons VISUALLY look disabled when prerequisites aren't met, but
//   the click handler still fires. On click of an "ineligible" button, the
//   handler runs zod safeParse and surfaces every failing field as an
//   inline error + a top-of-form summary banner. This replaces the old
//   "greyed button with no explanation" failure mode.
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
import {
  fetchDivisions,
  fetchProjects,
  fetchEquipmentAccessories,
  searchEquipment,
} from '../../lib/api/lookups.js';
import { invalidateJobRequestCache } from '../../lib/hooks/useJobRequestList.js';
import {
  jobRequestDraftSchema,
  jobRequestSubmitSchema,
} from '../../lib/schemas/jobRequestSchemas.js';
import { TERMS, TNC_VERSION } from './form/tncContent.js';

// ── Static select options (locked to BE enums) ──────────────────────
const JOB_CATEGORIES = [
  { value: 'TME', label: 'T&ME (Test & Measurement)' },
  { value: 'FPE', label: 'F&PE (Fabrication & Production)' },
];
const JOB_TYPES = [
  { value: 'CALIBRATION',  label: 'Calibration' },
  { value: 'REPAIR',       label: 'Repair' },
];
const EQUIPMENT_TYPE_OPTIONS = ['Instrument', 'Equipment'];
const ACCESSORY_TYPE_OPTIONS = ['Probe', 'Cable', 'Adapter', 'Carrying Case', 'Power Supply', 'Manual', 'Other'];

function normalizeEquipmentType(value) {
  return String(value || '').toLowerCase() === 'equipment' ? 'Equipment' : 'Instrument';
}

function accessoryTypeFromDb(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const match = ACCESSORY_TYPE_OPTIONS.find((item) => item.toLowerCase() === normalized);
  return match || 'Other';
}

function equipmentIdDisplay(opt) {
  return opt?.eqm_id ? String(opt.eqm_id) : '';
}

export function JobRequestNew() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Section-1 + 2 + 3 + 4 form state (single flat object) ─────────
  const [form, setForm] = useState({
    job_category: JOB_CATEGORIES[0].value,
    job_type: JOB_TYPES[0].value,
    equipment_id: null,
    equipment_name: '',
    make: '',
    model_no: '',
    serial_no: '',
    equipment_type: EQUIPMENT_TYPE_OPTIONS[0],
    options_description: '',
    lab_phone: '',
    room_phone: '',
    division_id: '',
    subsystem: '',
    project_name: '',
    complaint_description: '',
    remarks: '',
    equipment_sent_after_repair: false,
    accessories: [],
  });

  // ── Section-5 T&C state — six independent booleans ────────────────
  const [tnc, setTnc] = useState(() => TERMS.map(() => true));
  const tncAcceptedCount = tnc.filter(Boolean).length;
  const allTncAccepted = tncAcceptedCount === TERMS.length;

  // ── Submission state ─────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Division + Project dropdowns — fetched once on mount ──────────
  const [divisions, setDivisions] = useState([]);
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetchDivisions(ctrl.signal),
      fetchProjects(ctrl.signal),
    ])
      .then(([divisionItems, projectItems]) => {
        setDivisions(divisionItems);
        setProjects(projectItems);
      })
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
  const [equipmentSearchText, setEquipmentSearchText] = useState('');
  const [equipmentDbAccessories, setEquipmentDbAccessories] = useState([]);
  const eqDebRef = useRef(null);

  // ── Real-time Equipment Lookup on Search Text change ─────────────
  useEffect(() => {
    const text = String(equipmentSearchText || '').trim();
    if (!text) {
      setEquipmentDbAccessories([]);
      return;
    }
    
    // Check if the search text is a numeric ID or a fully formatted display code
    // like "5", "20", "EQ-INS-0020", "EQ-EQU-0005"
    let parsedId = null;
    
    const displayMatch = text.match(/^EQ-([A-Z]{3})-(\d+)$/i);
    if (displayMatch) {
      parsedId = parseInt(displayMatch[2], 10);
    } else {
      const match = text.match(/^(.+)-(\d+)$/);
      if (match) {
        parsedId = parseInt(match[2], 10);
      } else {
        // Raw numeric ID
        const num = parseInt(text, 10);
        if (!isNaN(num) && String(num) === text) {
          parsedId = num;
        }
      }
    }

    if (!parsedId) return;

    const timer = setTimeout(async () => {
      try {
        const items = await searchEquipment(text, 1);
        if (items && items.length > 0) {
          const matched = items[0];
          // Check if it's an exact match of ID or Code
          if (matched.eqm_id === parsedId || matched.id.toLowerCase() === text.toLowerCase()) {
            setForm((f) => {
              if (f.equipment_id === matched.eqm_id) return f;
              return {
                ...f,
                equipment_id: matched.eqm_id,
                equipment_name: matched.name || '',
                make: matched.make || '',
                model_no: matched.model_no || '',
                serial_no: matched.serial_no || '',
                equipment_type: normalizeEquipmentType(matched.eqm_type),
                accessories: [],
              };
            });
            
            const rows = await fetchEquipmentAccessories(matched.eqm_type, matched.eqm_id);
            if (rows && rows.length > 0) {
              setEquipmentDbAccessories(rows);
              setForm((f) => ({
                ...f,
                accessories: rows.slice(0, 20).map((row) => ({
                  type: accessoryTypeFromDb(row.type),
                  name: row.name || row.model_no || `Accessory ${row.id}`,
                  serial_no: row.serial_no || '',
                })),
              }));
            } else {
              setEquipmentDbAccessories([]);
            }
          }
        }
      } catch (err) {
        console.error("Real-time equipment search error:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [equipmentSearchText]);

  function onEquipmentQueryChange(value) {
    setEquipmentSearchText(value);
    update('equipment_id', null);
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
  async function pickEquipment(opt) {
    setForm((f) => ({
      ...f,
      equipment_id: opt.eqm_id,
      equipment_name: opt.name || '',
      make: opt.make || '',
      model_no: opt.model_no || '',
      serial_no: opt.serial_no || '',
      equipment_type: normalizeEquipmentType(opt.eqm_type),
      accessories: [],
    }));
    setEquipmentSearchText(equipmentIdDisplay(opt));
    setEqOpen(false);
    try {
      const rows = await fetchEquipmentAccessories(opt.eqm_type, opt.eqm_id);
      if (!rows?.length) {
        setEquipmentDbAccessories([]);
        return;
      }
      setEquipmentDbAccessories(rows);
      setForm((f) => ({
        ...f,
        accessories: rows.slice(0, 20).map((row) => ({
          type: accessoryTypeFromDb(row.type),
          name: row.name || row.model_no || `Accessory ${row.id}`,
          serial_no: row.serial_no || '',
        })),
      }));
    } catch {
      setEquipmentDbAccessories([]);
    }
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
    tnc_version: TNC_VERSION,
  }), [form]);

  // ── Validity checks (two-tier — see top-of-file comment) ──────────
  // Each useMemo runs zod safeParse against the relevant schema; we don't
  // surface the errors yet — that only happens when the user clicks a
  // button. The validity booleans drive the button STYLING (greyed when
  // ineligible), but the buttons themselves are clickable regardless.
  const draftParse = useMemo(
    () => jobRequestDraftSchema.safeParse({ ...payload, submit_now: false }),
    [payload],
  );
  const submitParse = useMemo(
    () => jobRequestSubmitSchema.safeParse({
      ...payload,
      submit_now: true,
      tnc_accepted: allTncAccepted,
    }),
    [payload, allTncAccepted],
  );
  const canSaveDraft = draftParse.success && !submitting;
  const canSubmit    = submitParse.success && !submitting;

  // Friendly field labels for the inline-error summary banner. Falls back
  // to the raw path when a label isn't listed (extra-key zod errors, etc).
  const FIELD_LABELS = {
    job_category:           'Job Category',
    job_type:               'Job Type',
    equipment_name:         'Equipment Name',
    division_id:            'Division',
    complaint_description:  'Complaint Description',
    tnc_accepted:           'Terms & Conditions',
    accessories:            'Accessories',
  };

  // Convert a zod ZodError into a { fieldName -> message } map for the
  // inline error renderers under each FormField.
  function zodErrorsToFieldMap(zodError) {
    const f = {};
    if (!zodError) return f;
    for (const issue of zodError.errors) {
      const key = (issue.path && issue.path.length) ? String(issue.path[0]) : '_';
      if (!f[key]) f[key] = issue.message;
    }
    return f;
  }

  // Build the top-of-form error summary banner — listed in form order so
  // the user can scan from top to bottom of the page.
  function buildErrorSummary(fieldMap) {
    const ORDER = [
      'job_category', 'job_type', 'equipment_name', 'division_id',
      'complaint_description', 'tnc_accepted', 'accessories',
    ];
    const seen = new Set();
    const out = [];
    for (const key of ORDER) {
      if (fieldMap[key] && !seen.has(key)) {
        out.push({ key, label: FIELD_LABELS[key] || key, msg: fieldMap[key] });
        seen.add(key);
      }
    }
    // Any unknown keys (defensive — shouldn't happen)
    for (const key of Object.keys(fieldMap)) {
      if (!seen.has(key)) {
        out.push({ key, label: FIELD_LABELS[key] || key, msg: fieldMap[key] });
      }
    }
    return out;
  }

  // ── Submit handlers ──────────────────────────────────────────────
  // Each handler is the same shape:
  //   1. Run the right zod schema. If invalid → surface field errors,
  //      banner, scroll to first field. STOP. (No network call.)
  //   2. If valid, POST. On success: invalidate cache + navigate.
  //      On failure: pull BE field errors into the same renderer.
  async function handleSave(submitNow) {
    setFormError(null);
    setFieldErrors({});

    // 1. FE validation gate — strict for submit, loose for draft.
    const parse = submitNow ? submitParse : draftParse;
    if (!parse.success) {
      const f = zodErrorsToFieldMap(parse.error);
      setFieldErrors(f);
      // Show a top-of-form summary; user can click each item to focus the field.
      const summary = buildErrorSummary(f);
      const lines = summary.map((s) => `· ${s.label}: ${s.msg}`).join('\n');
      setFormError(
        (submitNow
          ? 'Cannot submit yet — please fix the following:'
          : 'Cannot save draft yet — please fix the following:') + '\n' + lines,
      );
      // Scroll the top-of-form error banner into view so the user actually
      // sees the explanation (the form is multi-screen tall — the user is
      // usually scrolled to the footer when they click Submit).
      // requestAnimationFrame waits for React to render the banner first.
      window.requestAnimationFrame(() => {
        const banner = document.querySelector('[role="alert"]');
        if (banner && typeof banner.scrollIntoView === 'function') {
          banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      return;
    }

    // 2. Network round-trip.
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
        const summary = buildErrorSummary(f);
        const lines = summary.map((s) => `· ${s.label}: ${s.msg}`).join('\n');
        setFormError((apiErr.message || 'Validation failed.') + '\n' + lines);
      } else {
        setFormError(apiErr?.message || err.message || 'Could not save the request.');
      }
    } finally {
      setSubmitting(false);
    }
  }

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
          Submit a new calibration or repair request
        </p>
      </div>

      {/* ── Top-level error banner (multi-line via whitespace-pre-line) ── */}
      {formError ? (
        <div
          role="alert"
          className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 whitespace-pre-line border border-danger/30"
        >
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
                value={equipmentSearchText}
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
              {EQUIPMENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </FormField>
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
                onChange={(e) => {
                  const val = e.target.value;
                  const dbAcc = (equipmentDbAccessories || []).find((a) => a.name === val);
                  if (dbAcc) {
                    setAccDraft({
                      type: accessoryTypeFromDb(dbAcc.type),
                      name: dbAcc.name,
                      serial_no: dbAcc.serial_no || '',
                    });
                  } else {
                    setAccDraft((d) => ({ ...d, type: val }));
                  }
                }}
              >
                <option value="">Select type</option>
                <optgroup label="Default Types">
                  {ACCESSORY_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </optgroup>
                {equipmentDbAccessories && equipmentDbAccessories.length > 0 ? (
                  <optgroup label="Registered Accessories">
                    {equipmentDbAccessories.map((a) => (
                      <option key={`db-acc-${a.id}`} value={a.name}>
                        {a.name} ({a.type || 'Other'})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
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
                <option key={d.id} value={d.id}>
                  {d.id} --- {d.code} --- {d.name}
                </option>
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
            <Select
              value={form.project_name}
              onChange={(e) => update('project_name', e.target.value)}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Complaint Description" error={fieldErrors.complaint_description}>
              <textarea
                rows={4}
                className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                value={form.complaint_description}
                onChange={(e) => update('complaint_description', e.target.value)}
                placeholder="Describe the issue or requirements in detail"
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

        <div className="mb-4 pb-3 border-b border-border/60">
          <Checkbox
            checked={allTncAccepted}
            onChange={(e) => {
              const val = e.target.checked;
              setTnc(TERMS.map(() => val));
            }}
            label={
              <span className="font-bold text-accent">Mark as all ticked</span>
            }
          />
        </div>

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
      {/*
        Buttons are CLICKABLE EVEN WHEN ineligible — the click handler runs
        the relevant zod schema and surfaces inline + summary errors so the
        user can see WHICH field is blocking them. Visual styling reflects
        eligibility, but never `disabled` (which suppresses the click).
        Only `submitting` truly disables the buttons during the network call.
      */}
      <div className="flex items-center justify-between sticky bottom-0 bg-base/80 backdrop-blur py-3">
        <Button variant="secondary" onClick={() => navigate('/job-requests')} disabled={submitting}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={submitting}
            className={!canSaveDraft ? 'opacity-60' : undefined}
            title={
              !canSaveDraft
                ? 'Click to see which fields still need values before saving as draft'
                : 'Save what you have so far without submitting'
            }
          >
            <Save size={14} strokeWidth={1.75} aria-hidden="true" />
            Save as Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(true)}
            disabled={submitting}
            className={!canSubmit ? 'opacity-60' : undefined}
            title={
              !canSubmit
                ? 'Click to see which fields still need values before submitting'
                : 'Submit the request for approval'
            }
          >
            <Send size={14} strokeWidth={1.75} aria-hidden="true" />
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}
