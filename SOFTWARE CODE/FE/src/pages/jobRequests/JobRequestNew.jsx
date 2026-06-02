// ============================================================================
// src/pages/jobRequests/JobRequestNew.jsx  —  /job-requests/new route
// ----------------------------------------------------------------------------
// Responsive two-column form redesign with a natural bottom action footer.
// The stepper sits as a sticky right-side vertical sidebar on desktop screens,
// while the form controls and cancel/save/submit footer actions reside in a
// unified vertical card column on the left (without any overlapping sticky behaviors).
// All Zod validators, draft checks, lookup endpoints, and state flows remain intact.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  AlertCircle, 
  Plus, 
  X, 
  Lock, 
  ClipboardList, 
  Wrench, 
  User, 
  FileText, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

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
import { fetchActiveTerms } from '../../lib/api/terms.js';
import { Spinner } from '../../components/ui/Spinner.jsx';

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

  // ── Step Navigation State ─────────────────────────────────────────
  const SECTIONS = [
    { id: 'sec-1', label: 'Job Type' },
    { id: 'sec-2', label: 'Equipment' },
    { id: 'sec-3', label: 'Accessories' },
    { id: 'sec-4', label: 'Submitter' },
    { id: 'sec-5', label: 'Terms & Conditions' }
  ];
  const [activeSection, setActiveSection] = useState('sec-1');
  const activeSectionIndex = SECTIONS.findIndex(s => s.id === activeSection);

  function scrollToSection(id) {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Auto-scroll section sync
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.25, rootMargin: '-10% 0px -50% 0px' }
    );
    SECTIONS.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

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

  // ── Section-5 T&C state — dynamic checklist from DB ────────────────
  const [dynamicTerms, setDynamicTerms] = useState([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const [tnc, setTnc] = useState([]);
  const tncAcceptedCount = tnc.filter(Boolean).length;
  const allTncAccepted = dynamicTerms.length > 0 && tncAcceptedCount === dynamicTerms.length;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchActiveTerms(ctrl.signal)
      .then((items) => {
        setDynamicTerms(items || []);
        setTnc((items || []).map(() => false));
      })
      .catch(() => {
        // Fallback to static T&C in case of error
        setDynamicTerms(TERMS);
        setTnc(TERMS.map(() => false));
      })
      .finally(() => setTermsLoading(false));
    return () => ctrl.abort();
  }, []);

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
    
    let parsedId = null;
    const displayMatch = text.match(/^EQ-([A-Z]{3})-(\d+)$/i);
    if (displayMatch) {
      parsedId = parseInt(displayMatch[2], 10);
    } else {
      const match = text.match(/^(.+)-(\d+)$/);
      if (match) {
        parsedId = parseInt(match[2], 10);
      } else {
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

  // ── Validity checks (two-tier) ──────────────────────────
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

  const FIELD_LABELS = {
    job_category:           'Job Category',
    job_type:               'Job Type',
    equipment_name:         'Equipment Name',
    division_id:            'Division',
    complaint_description:  'Complaint Description',
    tnc_accepted:           'Terms & Conditions',
    accessories:            'Accessories',
  };

  function zodErrorsToFieldMap(zodError) {
    const f = {};
    if (!zodError) return f;
    for (const issue of zodError.errors) {
      const key = (issue.path && issue.path.length) ? String(issue.path[0]) : '_';
      if (!f[key]) f[key] = issue.message;
    }
    return f;
  }

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
    for (const key of Object.keys(fieldMap)) {
      if (!seen.has(key)) {
        out.push({ key, label: FIELD_LABELS[key] || key, msg: fieldMap[key] });
      }
    }
    return out;
  }

  // ── Submit handlers ──────────────────────────────────────────────
  async function handleSave(submitNow) {
    setFormError(null);
    setFieldErrors({});

    const parse = submitNow ? submitParse : draftParse;
    if (!parse.success) {
      const f = zodErrorsToFieldMap(parse.error);
      setFieldErrors(f);
      const summary = buildErrorSummary(f);
      const lines = summary.map((s) => `· ${s.label}: ${s.msg}`).join('\n');
      setFormError(
        (submitNow
          ? 'Cannot submit yet — please fix the following:'
          : 'Cannot save draft yet — please fix the following:') + '\n' + lines,
      );
      
      window.requestAnimationFrame(() => {
        const banner = document.querySelector('[role="alert"]');
        if (banner && typeof banner.scrollIntoView === 'function') {
          banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createJobRequest({
        ...payload,
        submit_now: submitNow,
        tnc_accepted: submitNow ? allTncAccepted : false,
      });
      invalidateJobRequestCache();
      window.alert(
        submitNow
          ? `Job request submitted successfully (${result.request_code})`
          : `Saved as draft successfully (${result.request_code})`,
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
    <div className="max-w-6xl mx-auto space-y-8 pb-12 font-sans antialiased">
      {/* ── Back link + Title Header ── */}
      <div className="flex flex-col gap-2.5">
        <div>
          <button
            type="button"
            onClick={() => navigate('/job-requests')}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-all duration-200 group"
          >
            <ArrowLeft size={13} strokeWidth={2.5} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to Job Requests
          </button>
        </div>
        <div className="flex items-center justify-between border-b border-slate-150 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              New Job Request
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-2">
              Initiate calibration standard or inspection repair workflows in our lab
            </p>
          </div>
        </div>
      </div>

      {/* ── Mobile/Tablet Fallback Progress Indicator ── */}
      {/* Displayed as horizontal steps on screens < lg */}
      <div className="block lg:hidden bg-white rounded-2xl border border-slate-200/50 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.012)] select-none">
        <nav aria-label="Progress Mobile" className="relative">
          <div className="absolute left-0 top-4 -translate-y-1/2 h-[3px] bg-slate-100 w-full rounded-full" aria-hidden="true" />
          <ol className="relative flex justify-between w-full items-center">
            {SECTIONS.map((sec, i) => {
              const isActive = activeSection === sec.id;
              const isPast = activeSectionIndex > i;
              return (
                <li key={sec.id} className="flex flex-col items-center gap-2 relative z-10">
                  <button
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={clsx(
                      "flex items-center justify-center w-8 h-8 rounded-full border-[3px] font-bold text-xs transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent/20",
                      isActive
                        ? "bg-accent border-accent text-white shadow-md scale-105"
                        : isPast
                        ? "bg-accent border-accent text-white"
                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                    )}
                  >
                    {i + 1}
                  </button>
                  <span className={clsx(
                    "text-[10px] sm:text-xs font-bold uppercase tracking-wider font-sans hidden sm:block transition-colors",
                    isActive ? "text-slate-900 font-extrabold" : "text-slate-400 font-semibold"
                  )}>
                    {sec.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* ── Split Grid Layout (Form left, Sticky Progress Stepper right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-8 items-start">
        
        {/* Left Column: Form Sections & Natural Footer Actions */}
        <div className="space-y-8 flex-1 min-w-0">
          
          {/* Top-level validation errors summary banner */}
          {formError ? (
            <div
              role="alert"
              className="rounded-2xl bg-danger/5 border border-danger/20 p-5 flex gap-3 shadow-[0_2px_10px_rgba(239,68,68,0.05)] animate-shake"
            >
              <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-danger">Validation Flags</h3>
                <p className="text-xs font-medium text-slate-600 whitespace-pre-line leading-relaxed mt-2">
                  {formError}
                </p>
              </div>
            </div>
          ) : null}

          {/* ─────────────────────── SECTION 1: JOB TYPE ─────────────────────── */}
          <section 
            id="sec-1" 
            className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300 border-l-[6px] border-l-accent"
          >
            <div className="flex items-center gap-3.5 mb-6 border-b border-slate-100 pb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/5 text-accent border border-accent/10">
                <ClipboardList size={20} strokeWidth={2} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans leading-none">1. Job Type Selection</h2>
                <p className="text-xs font-semibold text-slate-400 font-sans mt-2">Choose the correct laboratory classification and operational scope</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
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

          {/* ─────────────────────── SECTION 2: EQUIPMENT DETAILS ─────────────────────── */}
          <section 
            id="sec-2" 
            className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300 border-l-[6px] border-l-emerald-500"
          >
            <div className="flex items-center gap-3.5 mb-6 border-b border-slate-100 pb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                <Wrench size={20} strokeWidth={2} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans leading-none">2. Equipment Details</h2>
                <p className="text-xs font-semibold text-slate-400 font-sans mt-2">Search our equipment master registry or enter custom technical specs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <FormField label="Equipment ID Search (Typeahead)" error={fieldErrors.equipment_name}>
                <div className="relative">
                  <Input
                    placeholder="Search by ID e.g. EQ-INS-0020"
                    value={equipmentSearchText}
                    onChange={(e) => onEquipmentQueryChange(e.target.value)}
                    onFocus={() => eqOpts.length && setEqOpen(true)}
                    onBlur={() => setTimeout(() => setEqOpen(false), 150)}
                  />
                  {eqOpen && eqOpts.length > 0 ? (
                    <ul className="absolute z-20 mt-1.5 w-full bg-white border border-slate-200/60 rounded-xl shadow-lg max-h-64 overflow-auto divide-y divide-slate-50">
                      {eqOpts.map((o) => (
                        <li
                          key={`${o.eqm_type}-${o.eqm_id}`}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm transition-colors duration-150"
                          onMouseDown={(e) => { e.preventDefault(); pickEquipment(o); }}
                        >
                          <div className="font-semibold text-slate-800">{o.name}</div>
                          <div className="text-xs font-bold text-indigo-600 mt-1 flex items-center gap-1.5">
                            <span className="bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded text-[10px]">
                              {o.eqm_type}-{o.eqm_id}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 font-semibold">{o.make || 'No Make'}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 font-normal">SN: {o.serial_no || '—'}</span>
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
              <FormField label="Make / Manufacturer" error={fieldErrors.make}>
                <Input
                  value={form.make}
                  onChange={(e) => update('make', e.target.value)}
                  placeholder="Enter manufacturer"
                />
              </FormField>
              <FormField label="Model Number" error={fieldErrors.model_no}>
                <Input
                  value={form.model_no}
                  onChange={(e) => update('model_no', e.target.value)}
                  placeholder="Enter model number"
                />
              </FormField>
              <FormField label="Serial Number" error={fieldErrors.serial_no}>
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

          {/* ─────────────────────── SECTION 3: ACCESSORIES ─────────────────────── */}
          <section 
            id="sec-3" 
            className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300 border-l-[6px] border-l-rose-500"
          >
            <div className="flex items-center gap-3.5 mb-2 border-b border-slate-100 pb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/50">
                <Plus size={20} strokeWidth={2} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans leading-none">3. Accessories</h2>
                <p className="text-xs font-semibold text-slate-400 font-sans mt-2">Log auxiliary items accompanying the equipment (Probes, Cables, Carrying Cases)</p>
              </div>
            </div>

            {form.accessories.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)] animate-scaleUp">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase tracking-widest font-sans font-extrabold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Accessory Type</th>
                      <th className="px-4 py-3">Accessory Name</th>
                      <th className="px-4 py-3">Serial Number</th>
                      <th className="px-4 py-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.accessories.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-50/40 transition-colors text-[13px] font-semibold text-slate-700 font-sans">
                        <td className="px-4 py-3 text-slate-900 font-extrabold">
                          <span className="bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-600">
                            {a.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">{a.name}</td>
                        <td className="px-4 py-3 text-slate-400 font-normal">{a.serial_no || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeAccessory(i)}
                            className="p-1 rounded-lg text-slate-400 hover:text-danger hover:bg-danger/5 transition-colors"
                            aria-label={`Remove accessory ${i + 1}`}
                          >
                            <X size={14} strokeWidth={2.3} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 italic text-xs font-semibold font-sans border-b border-slate-100/50 mb-6">
                No accessories added yet. You can register up to 20 helper accessories below.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-200/40">
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
                    placeholder="Enter name or descriptor"
                  />
                </FormField>
              </div>
              <div className="md:col-span-3">
                <FormField label="Serial Number">
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
                  className="w-full flex justify-center py-2 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Plus size={13} strokeWidth={2.5} aria-hidden="true" className="mr-1" />
                  Add Item
                </Button>
              </div>
            </div>
          </section>

          {/* ─────────────────────── SECTION 4: SUBMITTED BY ─────────────────────── */}
          <section 
            id="sec-4" 
            className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300 border-l-[6px] border-l-amber-500"
          >
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50">
                  <User size={20} strokeWidth={2} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans leading-none">4. Submitted By</h2>
                  <p className="text-xs font-semibold text-slate-400 font-sans mt-2">Verified secure submitter information and contact logs</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/60 rounded-full text-[10px] font-extrabold text-slate-500 uppercase tracking-wider select-none shadow-sm">
                <Lock size={10} className="text-slate-400" />
                Profile Auto-Fill Locked
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <FormField label="Full Name (Read-Only)">
                <div className="relative">
                  <Input value={user?.display_name || ''} disabled readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200/80 pr-10 font-bold" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                    <Lock size={12} />
                  </span>
                </div>
              </FormField>
              <FormField label="SAC Employee ID (Read-Only)">
                <div className="relative">
                  <Input value={user?.employeeId || user?.sub || ''} disabled readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200/80 pr-10 font-bold" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                    <Lock size={12} />
                  </span>
                </div>
              </FormField>
              <FormField label="Designation (Read-Only)">
                <div className="relative">
                  <Input value={user?.designation || ''} disabled readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200/80 pr-10 font-bold" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                    <Lock size={12} />
                  </span>
                </div>
              </FormField>
              <FormField label="Email Address (Read-Only)">
                <div className="relative">
                  <Input value={user?.email || ''} disabled readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200/80 pr-10 font-bold" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                    <Lock size={12} />
                  </span>
                </div>
              </FormField>
              <FormField label="Lab Phone / Extension">
                <Input
                  value={form.lab_phone}
                  onChange={(e) => update('lab_phone', e.target.value)}
                  placeholder="Enter lab extension"
                />
              </FormField>
              <FormField label="Room Phone">
                <Input
                  value={form.room_phone}
                  onChange={(e) => update('room_phone', e.target.value)}
                  placeholder="Enter room extension"
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
                      {d.code} --- {d.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Subsystem">
                <Input
                  value={form.subsystem}
                  onChange={(e) => update('subsystem', e.target.value)}
                  placeholder="Enter subsystem designation"
                />
              </FormField>
              <FormField label="Project Scope">
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
                <Checkbox
                  checked={form.equipment_sent_after_repair}
                  onChange={(e) => update('equipment_sent_after_repair', e.target.checked)}
                  label="Equipment sent after repair (Check if calibration needed post-rehabilitation)"
                />
              </div>

              <div className="md:col-span-2">
                <FormField label="Complaint Description & Detailed Diagnostic Context" error={fieldErrors.complaint_description}>
                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed transition-all duration-200 hover:border-slate-350"
                    value={form.complaint_description}
                    onChange={(e) => update('complaint_description', e.target.value)}
                    placeholder="Describe the issue, operational failure details, parameters out of tolerance, or custom diagnostic requirements"
                  />
                </FormField>
              </div>
            </div>
          </section>

          {/* ─────────────────────── SECTION 5: TERMS & CONDITIONS ─────────────────────── */}
          <section 
            id="sec-5" 
            className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300 border-l-[6px] border-l-purple-500 animate-scaleUp"
          >
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100/50">
                  <FileText size={20} strokeWidth={2} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans leading-none">5. Terms and Conditions</h2>
                  <p className="text-xs font-semibold text-slate-400 font-sans mt-2">Please review and check each operational guideline statement</p>
                </div>
              </div>
              <div className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border shadow-sm select-none",
                allTncAccepted ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-amber-50 text-amber-700 border-amber-150"
              )}>
                <span>Accepted:</span>
                <span className="text-sm font-black">{tncAcceptedCount}</span>
                <span>/</span>
                <span>{dynamicTerms.length}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 mb-5 pb-3.5 border-b border-slate-100/60 select-none">
              <Checkbox
                checked={allTncAccepted}
                onChange={(e) => {
                  const val = e.target.checked;
                  setTnc(dynamicTerms.map(() => val));
                }}
                label={
                  <span className="font-extrabold text-accent hover:text-accent-hover transition-colors text-xs uppercase tracking-widest leading-none">
                    Toggle Accept All Conditions
                  </span>
                }
              />
            </div>

            <ul className="space-y-3.5">
              {termsLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner size={20} className="text-purple-600 animate-spin" />
                </div>
              ) : dynamicTerms.map((t, i) => (
                <li
                  key={t.id || t.index}
                  className={clsx(
                    "px-4 py-4 rounded-xl border transition-all duration-200 select-none",
                    tnc[i] 
                      ? "bg-slate-50/60 border-slate-200/80 shadow-sm" 
                      : "bg-white border-slate-200/50 hover:bg-slate-50/20"
                  )}
                >
                  <Checkbox
                    checked={!!tnc[i]}
                    onChange={(e) => {
                      const next = [...tnc];
                      next[i] = e.target.checked;
                      setTnc(next);
                    }}
                    label={
                      <span className="text-slate-700 leading-relaxed font-sans text-xs sm:text-sm font-semibold">
                        <span className="font-black text-slate-800 mr-1.5 uppercase text-[11px] tracking-wider">
                          Item {t.index_no || t.index || (i + 1)}:
                        </span>{' '}
                        {t.text}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>

            {!allTncAccepted ? (
              <div
                role="status"
                className="mt-5 rounded-xl bg-warning/5 border border-warning/20 text-amber-700 text-xs px-4 py-3 flex items-center gap-2.5 font-semibold animate-pulse-radar"
              >
                <AlertCircle size={15} strokeWidth={2.3} aria-hidden="true" className="shrink-0" />
                You must read and tick all conditions to submit this request for formal review.
              </div>
            ) : null}
          </section>

          {/* ── NATURAL FOOTER ACTIONS (At the bottom of the form column, no overlap) ── */}
          <div className="bg-white border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] px-6 py-5 flex items-center justify-between rounded-2xl gap-4 select-none transition-all duration-350 hover:shadow-md hover:border-slate-200/80">
            <Button 
              variant="secondary" 
              onClick={() => navigate('/job-requests')} 
              disabled={submitting}
              className="text-slate-600 hover:bg-slate-50 border-slate-200 shadow-sm transition-transform duration-150 hover:-translate-x-0.5 active:scale-95"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={() => handleSave(false)}
                disabled={submitting}
                className={clsx(
                  "shadow-sm transition-all duration-150 hover:bg-slate-50 border-slate-200 text-slate-700 active:scale-95",
                  !canSaveDraft ? 'opacity-65 cursor-pointer' : undefined
                )}
                title={
                  !canSaveDraft
                    ? 'Click to see which fields still need values before saving as draft'
                    : 'Save what you have so far without submitting'
                }
              >
                <Save size={14} strokeWidth={2.2} aria-hidden="true" className="mr-1" />
                Save Draft
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSave(true)}
                disabled={submitting}
                className={clsx(
                  "shadow-md shadow-accent/15 transition-all duration-150 active:scale-95 hover:bg-accent-hover",
                  !canSubmit ? 'opacity-65 cursor-pointer' : undefined
                )}
                title={
                  !canSubmit
                    ? 'Click to see which fields still need values before submitting'
                    : 'Submit the request for approval'
                }
              >
                <Send size={14} strokeWidth={2.2} aria-hidden="true" className="mr-1" />
                Submit Request
              </Button>
            </div>
          </div>

        </div>

        {/* Right Column: Sticky Vertical Stepper */}
        <div className="hidden lg:block sticky top-24 self-start bg-white rounded-2xl border border-slate-200/50 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.012)] select-none w-full">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-5 font-sans">
            Job Progress
          </h3>
          <nav aria-label="Progress Desktop" className="relative">
            {/* Vertical Line aligned exactly centered under buttons */}
            <div className="absolute left-[15px] top-4 bottom-4 w-[3px] bg-slate-100 -translate-x-1/2 rounded-full" aria-hidden="true" />
            <ol className="relative flex flex-col gap-6 w-full">
              {SECTIONS.map((sec, i) => {
                const isActive = activeSection === sec.id;
                const isPast = activeSectionIndex > i;
                return (
                  <li 
                    key={sec.id} 
                    className="flex items-center gap-3.5 relative z-10 group cursor-pointer"
                    onClick={() => scrollToSection(sec.id)}
                  >
                    <button
                      type="button"
                      className={clsx(
                        "flex items-center justify-center w-8 h-8 rounded-full border-[3px] font-bold text-xs transition-all duration-300 shrink-0 focus:outline-none focus:ring-2 focus:ring-accent/15",
                        isActive
                          ? "bg-accent border-accent text-white shadow-md scale-105"
                          : isPast
                          ? "bg-accent border-accent text-white"
                          : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-350"
                      )}
                    >
                      {i + 1}
                    </button>
                    <span className={clsx(
                      "text-xs font-bold uppercase tracking-wider font-sans transition-colors duration-150",
                      isActive ? "text-slate-900 font-extrabold" : "text-slate-400 font-semibold group-hover:text-slate-600"
                    )}>
                      {sec.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

      </div>
    </div>
  );
}
