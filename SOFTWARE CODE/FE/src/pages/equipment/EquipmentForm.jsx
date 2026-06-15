// ============================================================================
// src/pages/equipment/EquipmentForm.jsx  —  /equipment/new
// ----------------------------------------------------------------------------
// Overhauled "JORDAR" and highly professional centered multi-section creation form.
// Features a responsive two-column grid:
//   - On widescreen desktops (lg and up), the steps display as a sticky right-side
//     vertical progress tracker (scrollspy). On mobile/tablet, it falls back to a
//     clean horizontal stepper at the top.
//   - Includes verified padlock icons for autofilled subfields, dynamic T&C counters,
//     gorgeous accessories tables, and a natural non-overlapping action footer at the bottom.
// All react-hook-form Zod bindings, makes/types api lookups, and localStorage drafts
// remain fully operational.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft, Info, Plus, Save, Send, Trash2, AlertCircle, Lock, Wrench, User, FileText, AlertTriangle, ClipboardList
} from 'lucide-react';
import clsx from 'clsx';

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
import { fetchActiveTerms } from '../../lib/api/terms.js';

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
const MAINTENANCE_FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6, 12, 24, 36];

export function EquipmentForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');

  // ── Step Navigation State ─────────────────────────────────────────
  const SECTIONS = [
    { id: 'sec-1', label: 'Equipment' },
    { id: 'sec-2', label: 'Accessories' },
    { id: 'sec-3', label: 'Procurement' },
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
      .catch(() => {/* dropdowns stay empty; handled gracefully */})
      .finally(() => setMastersLoading(false));
    return () => ctrl.abort();
  }, []);

  // ── Dynamic T&C checklist states ───────────────────────────────────
  const [dynamicTerms, setDynamicTerms] = useState([]);
  const [termsLoading, setTermsLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchActiveTerms('EQM', ctrl.signal)
      .then((items) => {
        setDynamicTerms(items || []);
      })
      .catch((err) => {
        console.error(err);
        // Fallback to static T&C in case of error
        const fallback = TC_TEXT.map((text, idx) => ({
          id: `static_${idx}`,
          index_no: idx + 1,
          text
        }));
        setDynamicTerms(fallback);
      })
      .finally(() => setTermsLoading(false));
    return () => ctrl.abort();
  }, []);

  // ── react-hook-form ─────────────────────────────────────────────────
  const draftKey = user ? DRAFT_KEY_PREFIX + user.userId : null;
  const initialValues = useMemo(() => {
    const base = {
      job_category: 'F&PE',
      job_type: 'Registration',
      eqm_type: 'Equipment',
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
      maintenance_frequency_months: '',
      lab_phone: '',
      room_phone: '',
      division_id: '',
      subsystem: '',
      project: '',
      tc_accepted: {},
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

  // ── Accessory add-row state ─────────────────────────────────────────
  const [accType, setAccType] = useState('');
  const [accName, setAccName] = useState('');
  const [accSerial, setAccSerial] = useState('');

  // ── T&C live counter ────────────────────────────────────────────────
  const tc = watch('tc_accepted');
  const tcCount = Object.values(tc || {}).filter(Boolean).length;
  const allTncAccepted = dynamicTerms.length > 0 && tcCount === dynamicTerms.length;

  const selectedMake = watch('make_id');
  const selectedType = watch('equipment_type_id');

  const FIELD_LABELS = {
    name: 'Equipment Name',
    job_category: 'Equipment Category',
    eqm_type: 'Equipment Type',
    make_id: 'Manufacturer Name',
    mfg_model_name: 'Other Manufacturer Name',
    serial_no: 'Serial No.',
    equipment_type_id: 'Instrument / Product Type',
    other_equipment_type: 'Other Equipment Type',
    po_number: 'PO Number',
    po_date: 'PO Date',
    mivr_number: 'MIVR Number',
    mivr_date: 'MIVR Date',
    line_item_code: 'Line Item Code',
    cost: 'Cost',
    cost_currency: 'Cost Currency',
    warranty_months: 'Warranty Period',
    maintenance_frequency_months: 'Equipment maintenance/cal frequency',
    lab_phone: 'Lab Phone',
    room_phone: 'Room Phone',
    division_id: 'Division',
    subsystem: 'Subsystem',
    project: 'Project',
    tc_accepted: 'Terms and Conditions',
  };

  // ── Auto-save draft to localStorage on change ──────────────────────
  useEffect(() => {
    if (!draftKey) return undefined;
    const id = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(getValues())); } catch {/*quota*/}
    }, 250);
    return () => clearTimeout(id);
  }, [watch(), draftKey, getValues]);

  // ── Submit ────────────────────────────────────────────────────────
  async function onSubmit(values) {
    setSubmitError('');
    if (!allTncAccepted) {
      setSubmitError('Please accept all Terms and Conditions before submitting this registration request.');
      scrollToSection('sec-5');
      return;
    }

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
      payload.tc_accepted = dynamicTerms.reduce((accepted, t, i) => {
        const key = `tc_${t.id || i + 1}`;
        accepted[key] = true;
        return accepted;
      }, {});

      const result = await createEquipment(payload);
      if (draftKey) localStorage.removeItem(draftKey);
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

  function onInvalid(formErrors) {
    const entries = Object.entries(formErrors || {});
    const lines = entries.slice(0, 8).map(([field, error]) => {
      const label = FIELD_LABELS[field] || field;
      return `- ${label}: ${error?.message || 'Please review this field'}`;
    });

    if (!allTncAccepted) {
      lines.push('- Terms and Conditions: accept all listed conditions');
    }

    setSubmitError(
      'Cannot submit yet. Please fix the following:\n' +
      (lines.length ? lines.join('\n') : '- Please review the highlighted fields.'),
    );

    const firstField = entries[0]?.[0];
    if (firstField && ['po_number', 'po_date', 'mivr_number', 'mivr_date', 'line_item_code', 'cost', 'cost_currency', 'warranty_months', 'maintenance_frequency_months'].includes(firstField)) {
      scrollToSection('sec-3');
    } else if (firstField && ['lab_phone', 'room_phone', 'division_id', 'subsystem', 'project'].includes(firstField)) {
      scrollToSection('sec-4');
    } else if (firstField === 'tc_accepted' || !allTncAccepted) {
      scrollToSection('sec-5');
    } else {
      scrollToSection('sec-1');
    }
  }

  const submitRegistration = handleSubmit(onSubmit, onInvalid);

  function saveDraft() {
    if (!draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(getValues()));
      window.alert('Draft saved locally.');
    } catch {
      window.alert('Could not save draft (storage full?).');
    }
  }

  function cancel() {
    if (window.confirm('Discard your changes?')) navigate('/equipment');
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 font-sans antialiased">
      {/* ── Back link + Title Header ── */}
      <div className="flex flex-col gap-2.5">
        <div>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-all duration-200 group"
          >
            <ArrowLeft size={13} strokeWidth={2.5} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to Equipment
          </button>
        </div>
        <div className="flex items-center justify-between border-b border-slate-150 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              New Equipment Registration
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-2">
              Register new instruments and equipment into our master calibration registry
            </p>
          </div>
        </div>
      </div>

      {/* ── Mobile/Tablet Fallback Progress Indicator ── */}
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

      <form onSubmit={submitRegistration} noValidate className="space-y-8">
        
        <input type="hidden" {...register('job_type')} />

        {/* ── Split Grid Layout (Form left, Sticky Progress Stepper right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-8 items-start">
          
          {/* Left Column: Form Sections & Natural Footer Actions */}
          <div className="space-y-8 flex-1 min-w-0">
            
            {/* Top-level validation errors summary banner */}
            {submitError ? (
              <div
                role="alert"
                className="rounded-2xl bg-danger/5 border border-danger/20 p-5 flex gap-3 shadow-[0_2px_10px_rgba(239,68,68,0.05)] animate-shake"
              >
                <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-danger">Validation Flags</h3>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed mt-2 whitespace-pre-line">
                    {submitError}
                  </p>
                </div>
              </div>
            ) : null}

            {/* ─────────────────────── SECTION 1: EQUIPMENT DETAILS ─────────────────────── */}
            <section 
              id="sec-1" 
              className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3.5 mb-6 border-b border-slate-100 pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/5 text-accent border border-accent/10">
                  <Wrench size={20} strokeWidth={2} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans leading-none">1. Equipment Details</h2>
                  <p className="text-xs font-semibold text-slate-400 font-sans mt-2">Enter model name, serial numbers, and custom descriptions</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="col-span-1 md:col-span-2">
                  <div className="rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 text-xs px-4 py-3 font-semibold select-none flex items-center gap-2">
                    <Info size={14} className="text-slate-400" />
                    Equipment ID will be auto-generated upon successful registration and physical verification.
                  </div>
                </div>

                <FormField label="Equipment Category *" error={errors.job_category?.message}>
                  <Select {...register('job_category')}>
                    <option value="T&ME">T&ME</option>
                    <option value="F&PE">F&PE</option>
                  </Select>
                </FormField>

                <FormField label="Equipment Type *" error={errors.eqm_type?.message}>
                  <Select {...register('eqm_type')}>
                    <option value="Instrument">Instrument</option>
                    <option value="Equipment">Equipment</option>
                  </Select>
                </FormField>

                <div className="col-span-1 md:col-span-2">
                  <FormField label="Equipment Name *" error={errors.name?.message}>
                    <Input placeholder="Enter equipment name" {...register('name')} />
                  </FormField>
                </div>

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

                {selectedMake === 'other' ? (
                  <div className="col-span-1 md:col-span-2">
                    <FormField label="Other Manufacturer Name *" error={errors.mfg_model_name?.message}>
                      <Input placeholder="Enter other manufacturer name" {...register('mfg_model_name')} />
                    </FormField>
                  </div>
                ) : null}

                <FormField label="Serial No. *" error={errors.serial_no?.message}>
                  <Input placeholder="Enter serial number" {...register('serial_no')} />
                </FormField>

                <FormField label="Instrument / Product Type" error={errors.equipment_type_id?.message}>
                  <Select {...register('equipment_type_id')}>
                    <option value="">{mastersLoading ? 'Loading…' : 'Select type'}</option>
                    {types.map((t) => (
                      <option key={t.type_id} value={t.type_id}>{t.name}</option>
                    ))}
                    {!mastersLoading && <option value="other">Other</option>}
                  </Select>
                </FormField>

                {selectedType === 'other' ? (
                  <div className="col-span-1 md:col-span-2 animate-scaleUp">
                    <FormField label="Other Equipment Type *" error={errors.other_equipment_type?.message}>
                      <Input placeholder="Enter other equipment type" {...register('other_equipment_type')} />
                    </FormField>
                  </div>
                ) : null}

                <div className="col-span-1 md:col-span-2">
                  <FormField label="Options / Description" error={errors.options_description?.message}>
                    <textarea
                      rows={3}
                      placeholder="Enter additional options or description (max 250 chars)"
                      className="block w-full rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.01)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed transition-all duration-200 hover:border-slate-350"
                      {...register('options_description')}
                    />
                  </FormField>
                </div>
              </div>
            </section>

            {/* ─────────────────────── SECTION 2: ACCESSORIES ─────────────────────── */}
            <section 
              id="sec-2" 
              className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3.5 mb-2 border-b border-slate-100 pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                  <Plus size={20} strokeWidth={2} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans leading-none">2. Accessories</h2>
                  <p className="text-xs font-semibold text-slate-400 font-sans mt-2">Log auxiliary items accompanying the equipment (Probes, Cables, Carrying Cases)</p>
                </div>
              </div>

              {accFields.length > 0 ? (
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
                      {accFields.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors text-[13px] font-semibold text-slate-700 font-sans">
                          <td className="px-4 py-3 text-slate-900 font-extrabold">
                            <span className="bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-600">
                              {row.accessory_type || 'Other'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{row.accessory_name}</td>
                          <td className="px-4 py-3 text-slate-400 font-normal">{row.serial_no || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => accRemove(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-danger hover:bg-danger/5 transition-colors"
                              aria-label="Remove accessory"
                            >
                              <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs font-semibold font-sans border-b border-slate-100/50 mb-6">
                  No accessories added yet. You can register accessories below.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-200/40">
                <div className="md:col-span-3">
                  <FormField label="Accessory Type">
                    <Select value={accType} onChange={(e) => setAccType(e.target.value)}>
                      <option value="">Select type</option>
                      <option value="Probe">Probe</option>
                      <option value="Cable">Cable</option>
                      <option value="Adapter">Adapter</option>
                      <option value="Other">Other</option>
                    </Select>
                  </FormField>
                </div>
                <div className="md:col-span-4">
                  <FormField label="Accessory Name">
                    <Input
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="Enter name or descriptor"
                    />
                  </FormField>
                </div>
                <div className="md:col-span-3">
                  <FormField label="Serial Number">
                    <Input
                      value={accSerial}
                      onChange={(e) => setAccSerial(e.target.value)}
                      placeholder="Enter serial number"
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!accName.trim() || !accType}
                    onClick={() => {
                      accAppend({
                        accessory_type: accType,
                        accessory_name: accName.trim(),
                        serial_no: accSerial.trim(),
                      });
                      setAccType(''); setAccName(''); setAccSerial('');
                    }}
                    className="w-full flex justify-center py-2 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <Plus size={13} strokeWidth={2.5} aria-hidden="true" className="mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>
            </section>

            {/* ─────────────────────── SECTION 3: PROCUREMENT DETAILS ─────────────────────── */}
            <section 
              id="sec-3" 
              className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3.5 mb-6 border-b border-slate-100 pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/50">
                  <ClipboardList size={20} strokeWidth={2} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans leading-none">3. Procurement Details</h2>
                  <p className="text-xs font-semibold text-slate-400 font-sans mt-2">Log PO purchase orders, line item indices, cost models, and warranty dates</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
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
                <FormField label="Equipment maintenance/cal frequency (months) *" error={errors.maintenance_frequency_months?.message}>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    list="maintenance-frequency-options"
                    placeholder="Select or enter months"
                    {...register('maintenance_frequency_months')}
                  />
                  <datalist id="maintenance-frequency-options">
                    {MAINTENANCE_FREQUENCY_OPTIONS.map((months) => (
                      <option key={months} value={months} />
                    ))}
                  </datalist>
                </FormField>
              </div>
            </section>

            {/* ─────────────────────── SECTION 4: SUBMITTED BY ─────────────────────── */}
            <section 
              id="sec-4" 
              className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300"
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
                <FormField label="Lab Phone" error={errors.lab_phone?.message}>
                  <Input placeholder="Enter lab extension" {...register('lab_phone')} />
                </FormField>
                <FormField label="Room Phone" error={errors.room_phone?.message}>
                  <Input placeholder="Enter room extension" {...register('room_phone')} />
                </FormField>
                <FormField label="Division *" error={errors.division_id?.message}>
                  <Select {...register('division_id')}>
                    <option value="">{mastersLoading ? 'Loading…' : 'Select division'}</option>
                    {divisions.map((d) => (
                      <option key={d.division_id} value={d.division_id}>
                        {d.code} --- {d.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Subsystem" error={errors.subsystem?.message}>
                  <Input placeholder="Enter subsystem" {...register('subsystem')} />
                </FormField>
                <div className="col-span-1 md:col-span-2">
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
              </div>
            </section>

            {/* ─────────────────────── SECTION 5: TERMS & CONDITIONS ─────────────────────── */}
            <section 
              id="sec-5" 
              className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300 animate-scaleUp"
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
                  <span className="text-sm font-black">{tcCount}</span>
                  <span>/</span>
                  <span>{dynamicTerms.length || 6}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 mb-5 pb-3.5 border-b border-slate-100/60 select-none">
                <Checkbox
                  checked={dynamicTerms.length > 0 && tcCount === dynamicTerms.length}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    dynamicTerms.forEach((t, i) => {
                      const key = `tc_${t.id || i + 1}`;
                      setValue(`tc_accepted.${key}`, checked, { shouldValidate: true });
                    });
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
                ) : dynamicTerms.map((t, i) => {
                  const key = `tc_${t.id || i + 1}`;
                  return (
                    <li
                      key={t.id || i}
                      className={clsx(
                        "px-4 py-4 rounded-xl border transition-all duration-200 select-none",
                        tc?.[key] 
                          ? "bg-slate-50/60 border-slate-200/80 shadow-sm" 
                          : "bg-white border-slate-200/50 hover:bg-slate-50/20"
                      )}
                    >
                      <Checkbox
                        {...register(`tc_accepted.${key}`)}
                        label={
                          <span className="text-slate-700 leading-relaxed font-sans text-xs sm:text-sm font-semibold">
                            <span className="font-black text-slate-800 mr-1.5 uppercase text-[11px] tracking-wider">
                              Item {t.index_no || (i + 1)}:
                            </span>{' '}
                            {t.text}
                          </span>
                        }
                      />
                    </li>
                  );
                })}
              </ul>

              {!allTncAccepted ? (
                <div
                  role="status"
                  className="mt-5 rounded-xl bg-warning/5 border border-warning/20 text-amber-700 text-xs px-4 py-3 flex items-center gap-2.5 font-semibold animate-pulse-radar"
                >
                  <AlertCircle size={15} strokeWidth={2.3} aria-hidden="true" className="shrink-0" />
                  You must read and tick all conditions to submit this registration request.
                </div>
              ) : null}
            </section>

            {/* ── NATURAL FOOTER ACTIONS (At the bottom of left column, no overlap) ── */}
            <div className="relative z-20 bg-white border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] px-6 py-5 flex items-center justify-between rounded-2xl gap-4 select-none transition-all duration-350 hover:shadow-md hover:border-slate-200/80">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={cancel}
                disabled={isSubmitting}
                className="text-slate-600 hover:bg-slate-50 border-slate-200 shadow-sm transition-transform duration-150 hover:-translate-x-0.5 active:scale-95"
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={saveDraft}
                  disabled={isSubmitting}
                  className="shadow-sm transition-all duration-150 hover:bg-slate-50 border-slate-200 text-slate-700 active:scale-95"
                >
                  <Save size={14} strokeWidth={2.2} className="mr-1" />
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={submitRegistration}
                  disabled={isSubmitting}
                  className={clsx(
                    "shadow-md shadow-accent/15 transition-all duration-150 active:scale-95 hover:bg-accent-hover",
                    (!isValid || !allTncAccepted) ? 'opacity-65' : undefined
                  )}
                  title={
                    !isValid || !allTncAccepted
                      ? 'Click to see which fields still need attention before submitting'
                      : 'Submit the equipment registration request'
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size={14} className="text-white mr-1" /> Submitting…
                    </>
                  ) : (
                    <>
                      <Send size={14} strokeWidth={2.2} className="mr-1" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </div>

          </div>

          {/* Right Column: Sticky Vertical Stepper */}
          <div className="hidden lg:block sticky top-24 self-start bg-white rounded-2xl border border-slate-200/50 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.012)] select-none w-full">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-5 font-sans">
              Registration Progress
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
      </form>
    </div>
  );
}
