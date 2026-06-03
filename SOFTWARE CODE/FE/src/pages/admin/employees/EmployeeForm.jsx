// ============================================================================
// src/pages/admin/employees/EmployeeForm.jsx  —  /admin/employees/new + /:id/edit
// ----------------------------------------------------------------------------
// Single-component form used by both /new and /:id/edit routes. Loads the
// existing employee on mount when in edit mode; POSTs on save in create
// mode, PATCHes in edit mode. Validation against employeeCreateSchema /
// employeeUpdateSchema.
//
// Layout mirrors the JR form pattern from Phase 6 — sectioned card with
// click-anyway buttons that show inline + summary errors on failure.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  IdCard,
  Mail,
  MapPin,
  Save,
} from 'lucide-react';

import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { fetchEmployee, createEmployee, updateEmployee } from '../../../lib/api/employees.js';
import { fetchDivisions } from '../../../lib/api/lookups.js';
import { invalidateEmployeeCache } from '../../../lib/hooks/useEmployeeList.js';
import { employeeCreateSchema, employeeUpdateSchema } from '../../../lib/schemas/employeeSchemas.js';

const EMPTY = {
  employee_id: '', full_name: '', designation: '',
  division_id: '', email: '', mobile: '',
  lab_phone: '', room_phone: '',
  blood_group: '',
  date_of_birth: '', date_of_joining: '',
  address: '', city: '', state: '', zip: '',
  remarks: '',
};

function SectionCard({ icon: Icon, eyebrow, title, children, tone = 'accent' }) {
  const tones = {
    accent: 'bg-accent/5 text-accent border-accent/10',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100/70',
    amber: 'bg-amber-50 text-amber-600 border-amber-100/70',
    slate: 'bg-slate-50 text-slate-600 border-slate-200/70',
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] p-6 md:p-8 hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-3.5 mb-6 border-b border-slate-100 pb-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone] || tones.accent}`}>
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{eyebrow}</p>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight leading-none mt-1.5">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function EmployeeForm({ mode /* 'new' | 'edit' */ }) {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(EMPTY);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(isEdit);  // only edit needs an initial fetch
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Divisions dropdown ───────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    fetchDivisions(ctrl.signal).then(setDivisions).catch(() => { /* dropdown stays empty */ });
    return () => ctrl.abort();
  }, []);

  // ── Edit mode — load existing employee ───────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    const ctrl = new AbortController();
    fetchEmployee(routeId, ctrl.signal)
      .then((emp) => {
        setForm({
          employee_id:      emp.employee_id || '',
          full_name:        emp.full_name || '',
          designation:      emp.designation || '',
          division_id:      emp.division_id ? String(emp.division_id) : '',
          email:            emp.email || '',
          mobile:           emp.mobile || '',
          lab_phone:        emp.lab_phone || '',
          room_phone:       emp.room_phone || '',
          blood_group:      emp.blood_group || '',
          date_of_birth:    emp.date_of_birth || '',
          date_of_joining:  emp.date_of_joining || '',
          address:          emp.address || '',
          city:             emp.city || '',
          state:            emp.state || '',
          zip:              emp.zip || '',
          remarks:          emp.remarks || '',
        });
      })
      .catch((e) => {
        setFormError(e?.response?.data?.error?.message || e.message || 'Could not load employee.');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [routeId, isEdit]);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    if (fieldErrors[k]) setFieldErrors((e) => ({ ...e, [k]: undefined }));
  }

  // ── Build payload (only fields the user touched, for edit) ──────
  const payload = useMemo(() => {
    const base = { ...form };
    if (isEdit) {
      // Remove employee_id (immutable). Remove empty strings so backend
      // sees an actual "no change" rather than overwriting with ''.
      const out = {};
      for (const k of Object.keys(base)) {
        if (k === 'employee_id') continue;
        if (base[k] !== '' && base[k] != null) out[k] = base[k];
      }
      // division_id must be a number
      if (out.division_id) out.division_id = Number(out.division_id);
      return out;
    }
    return {
      ...base,
      division_id: base.division_id ? Number(base.division_id) : undefined,
    };
  }, [form, isEdit]);

  const schema = isEdit ? employeeUpdateSchema : employeeCreateSchema;
  const parse = useMemo(() => schema.safeParse(payload), [schema, payload]);
  const isValid = parse.success && !submitting;

  async function submit() {
    setFormError(null);
    setFieldErrors({});

    if (!parse.success) {
      const f = {};
      for (const issue of parse.error.errors) {
        const k = issue.path?.[0];
        if (k && !f[k]) f[k] = issue.message;
      }
      setFieldErrors(f);
      const lines = Object.entries(f).map(([k, m]) => `· ${k}: ${m}`).join('\n');
      setFormError((isEdit ? 'Cannot save changes:' : 'Cannot create employee:') + '\n' + lines);
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateEmployee(routeId, payload);
      } else {
        await createEmployee(payload);
      }
      invalidateEmployeeCache();
      window.alert(isEdit ? `Updated ${routeId}` : `Created ${form.employee_id}`);
      navigate('/admin/employees');
    } catch (e) {
      const apiErr = e?.response?.data?.error;
      if (apiErr?.details && Array.isArray(apiErr.details)) {
        const f = {};
        apiErr.details.forEach((d) => { if (d.path) f[d.path] = d.message; });
        setFieldErrors(f);
      }
      setFormError(apiErr?.message || e.message || 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex min-h-[42vh] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm font-semibold text-slate-500">Loading employee record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 font-sans antialiased">
      <div className="flex flex-col gap-2.5">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/employees')}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-all duration-200 group"
          >
            <ArrowLeft size={13} strokeWidth={2.5} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to Employees
          </button>
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {isEdit ? 'Edit Employee' : 'New Employee'}
          </h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">
            {isEdit
              ? `Update the HR master record for ${routeId}. Employee ID remains locked.`
              : 'Create an employee master record for personnel, division, and contact routing.'}
          </p>
        </div>
      </div>

      {formError ? (
        <div
          role="alert"
          className="rounded-2xl bg-danger/5 border border-danger/20 p-5 flex gap-3 shadow-[0_2px_10px_rgba(239,68,68,0.05)]"
        >
          <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-danger">Validation Flags</h3>
            <p className="text-xs font-medium text-slate-600 leading-relaxed mt-2 whitespace-pre-line">
              {formError}
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-8">
        <SectionCard icon={IdCard} eyebrow="Section 1" title="Identity and Division">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <FormField label="Employee ID" required error={fieldErrors.employee_id}>
            <Input value={form.employee_id}
              onChange={(e) => update('employee_id', e.target.value.toUpperCase())}
              disabled={isEdit}
              placeholder="e.g. AC12345"
              className={isEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200/80 font-bold' : undefined}
            />
          </FormField>
          <FormField label="Full Name" required error={fieldErrors.full_name}>
            <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} placeholder="Enter full name" />
          </FormField>
          <FormField label="Designation" required error={fieldErrors.designation}>
            <Input value={form.designation} onChange={(e) => update('designation', e.target.value)} placeholder="Enter designation" />
          </FormField>
          <FormField label="Division" required error={fieldErrors.division_id}>
            <Select value={form.division_id} onChange={(e) => update('division_id', e.target.value)}>
              <option value="">Select division</option>
              {divisions.map((d) => {
                const divisionId = d.id ?? d.division_id ?? d.SM_ID;
                const code = d.code ?? d.division_code ?? d.SM_SHORTNAME;
                const name = d.name ?? d.division_name ?? d.SM_NAME;
                return (
                  <option key={divisionId} value={divisionId}>
                    {code ? `${code} - ` : ''}{name || `Division ${divisionId}`}
                  </option>
                );
              })}
            </Select>
          </FormField>
          </div>
        </SectionCard>

        <SectionCard icon={Mail} eyebrow="Section 2" title="Contact Channels" tone="emerald">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <FormField label="Email" error={fieldErrors.email}>
            <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="name@example.com" />
          </FormField>
          <FormField label="Mobile" error={fieldErrors.mobile}>
            <Input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} placeholder="Enter mobile number" />
          </FormField>
          <FormField label="Lab Phone" error={fieldErrors.lab_phone}>
            <Input value={form.lab_phone} onChange={(e) => update('lab_phone', e.target.value)} placeholder="Enter lab extension" />
          </FormField>
          <FormField label="Room Phone" error={fieldErrors.room_phone}>
            <Input value={form.room_phone} onChange={(e) => update('room_phone', e.target.value)} placeholder="Enter room extension" />
          </FormField>
          </div>
        </SectionCard>

        <SectionCard icon={CalendarDays} eyebrow="Section 3" title="Personal Details" tone="amber">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <FormField label="Date of Birth" error={fieldErrors.date_of_birth}>
            <Input type="date" value={form.date_of_birth}
              onChange={(e) => update('date_of_birth', e.target.value)} />
          </FormField>
          <FormField label="Date of Joining" error={fieldErrors.date_of_joining}>
            <Input type="date" value={form.date_of_joining}
              onChange={(e) => update('date_of_joining', e.target.value)} />
          </FormField>
          <FormField label="Blood Group" error={fieldErrors.blood_group}>
            <Input value={form.blood_group} onChange={(e) => update('blood_group', e.target.value.toUpperCase())} placeholder="e.g. B+" />
          </FormField>
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} eyebrow="Section 4" title="Address and Notes" tone="slate">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="md:col-span-3">
            <FormField label="Address" error={fieldErrors.address}>
              <Input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Enter office or residential address" />
            </FormField>
          </div>
          <FormField label="City" error={fieldErrors.city}>
            <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
          </FormField>
          <FormField label="State" error={fieldErrors.state}>
            <Input value={form.state} onChange={(e) => update('state', e.target.value)} />
          </FormField>
          <FormField label="ZIP" error={fieldErrors.zip}>
            <Input value={form.zip} onChange={(e) => update('zip', e.target.value)} />
          </FormField>
          <div className="md:col-span-3">
            <FormField label="Remarks" error={fieldErrors.remarks}>
              <textarea rows={2} value={form.remarks}
                onChange={(e) => update('remarks', e.target.value)}
                placeholder="Add any administrative notes"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed transition-all duration-200 hover:border-slate-300" />
            </FormField>
          </div>
          </div>
        </SectionCard>

        <div className="bg-white border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.015)] px-6 py-5 flex items-center justify-between rounded-2xl gap-4 select-none transition-all duration-300 hover:shadow-md hover:border-slate-200/80">
        <Button
          variant="secondary"
          onClick={() => navigate('/admin/employees')}
          disabled={submitting}
          className="text-slate-600 hover:bg-slate-50 border-slate-200 shadow-sm transition-transform duration-150 hover:-translate-x-0.5 active:scale-95"
        >
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} disabled={submitting}
          className={!isValid ? 'opacity-65 cursor-pointer' : 'shadow-md shadow-accent/15 transition-all duration-150 active:scale-95'}
          title={!isValid ? 'Click to see which fields need attention' : undefined}>
          {submitting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
          ) : (
            <Save size={14} strokeWidth={2.2} aria-hidden="true" />
          )}
          {isEdit ? 'Save Changes' : 'Create Employee'}
        </Button>
        </div>
      </div>
    </div>
  );
}
