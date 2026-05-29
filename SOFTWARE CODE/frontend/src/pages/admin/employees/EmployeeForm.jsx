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
import { ArrowLeft, Save } from 'lucide-react';

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

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <button type="button" onClick={() => navigate('/admin/employees')}
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Back to Employees
        </button>
        <h1 className="text-2xl font-semibold text-ink mt-2">
          {isEdit ? `Edit Employee — ${routeId}` : 'New Employee'}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          {isEdit
            ? 'Update the HR master record. Employee ID cannot be changed.'
            : 'Create a new employee in the master. A user account can be added later.'}
        </p>
      </div>

      {formError ? (
        <div role="alert" className="rounded-md bg-danger/10 text-danger text-xs px-3 py-2 whitespace-pre-line border border-danger/30">
          {formError}
        </div>
      ) : null}

      <section className="bg-white rounded-lg border border-border shadow-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Employee ID" required error={fieldErrors.employee_id}>
            <Input value={form.employee_id}
              onChange={(e) => update('employee_id', e.target.value.toUpperCase())}
              disabled={isEdit} placeholder="e.g. AC12345" />
          </FormField>
          <FormField label="Full Name" required error={fieldErrors.full_name}>
            <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
          </FormField>
          <FormField label="Designation" required error={fieldErrors.designation}>
            <Input value={form.designation} onChange={(e) => update('designation', e.target.value)} />
          </FormField>
          <FormField label="Division" required error={fieldErrors.division_id}>
            <Select value={form.division_id} onChange={(e) => update('division_id', e.target.value)}>
              <option value="">Select division</option>
              {divisions.map((d) => (<option key={d.id} value={d.id}>{d.code} — {d.name}</option>))}
            </Select>
          </FormField>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-border shadow-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Email" error={fieldErrors.email}>
            <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </FormField>
          <FormField label="Mobile" error={fieldErrors.mobile}>
            <Input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
          </FormField>
          <FormField label="Lab Phone" error={fieldErrors.lab_phone}>
            <Input value={form.lab_phone} onChange={(e) => update('lab_phone', e.target.value)} />
          </FormField>
          <FormField label="Room Phone" error={fieldErrors.room_phone}>
            <Input value={form.room_phone} onChange={(e) => update('room_phone', e.target.value)} />
          </FormField>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-border shadow-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Personal (optional)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Date of Birth" error={fieldErrors.date_of_birth}>
            <Input type="date" value={form.date_of_birth}
              onChange={(e) => update('date_of_birth', e.target.value)} />
          </FormField>
          <FormField label="Date of Joining" error={fieldErrors.date_of_joining}>
            <Input type="date" value={form.date_of_joining}
              onChange={(e) => update('date_of_joining', e.target.value)} />
          </FormField>
          <FormField label="Blood Group" error={fieldErrors.blood_group}>
            <Input value={form.blood_group} onChange={(e) => update('blood_group', e.target.value)} />
          </FormField>
          <div className="md:col-span-3">
            <FormField label="Address" error={fieldErrors.address}>
              <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
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
                className="w-full rounded-md border border-border bg-base-elev/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent" />
            </FormField>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between sticky bottom-0 bg-base/80 backdrop-blur py-3">
        <Button variant="secondary" onClick={() => navigate('/admin/employees')} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} disabled={submitting}
          className={!isValid ? 'opacity-60' : undefined}
          title={!isValid ? 'Click to see which fields need attention' : undefined}>
          <Save size={14} strokeWidth={1.75} aria-hidden="true" />
          {isEdit ? 'Save Changes' : 'Create Employee'}
        </Button>
      </div>
    </div>
  );
}
