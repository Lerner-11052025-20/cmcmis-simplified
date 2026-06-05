import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Send } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { fetchDivisions } from '../../lib/api/lookups.js';
import {
  createMasterDataCorrection,
  fetchMasterDataCorrectionContext,
} from '../../lib/api/masterDataCorrections.js';

function headOptionLabel(row, key) {
  const id = row?.[`${key}_employee_id`];
  const name = row?.[`${key}_name`];
  const designation = row?.[`${key}_designation`];
  if (!id) return '';
  return [id, name, designation].filter(Boolean).join(' - ');
}

function uniqueOptions(rows, key) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const id = row?.[`${key}_employee_id`];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ value: id, label: headOptionLabel(row, key) });
  }
  return out;
}

export function MasterDataCorrectionNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const eqmType = params.get('eqm_type') || '';
  const eqmId = params.get('eqm_id') || '';

  const [context, setContext] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [form, setForm] = useState({
    proposed_division_id: '',
    lab_phone: '',
    room_phone: '',
    subsystem: '',
    reason: '',
    sec_head_employee_id: '',
    div_head_employee_id: '',
    group_head_employee_id: '',
    entity_head_employee_id: '',
    centre_head_employee_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetchMasterDataCorrectionContext({ eqm_type: eqmType, eqm_id: eqmId }, ctrl.signal),
      fetchDivisions(ctrl.signal),
    ])
      .then(([ctx, divs]) => {
        setContext(ctx);
        setDivisions(divs || []);
        const firstHead = (ctx.heads || [])[0] || {};
        setForm((f) => ({
          ...f,
          lab_phone: ctx.submitter?.lab_telephone || '',
          room_phone: ctx.submitter?.telephone || '',
          sec_head_employee_id: firstHead.sec_head_employee_id || '',
          div_head_employee_id: firstHead.div_head_employee_id || '',
          group_head_employee_id: firstHead.group_head_employee_id || '',
          entity_head_employee_id: firstHead.entity_head_employee_id || '',
          centre_head_employee_id: firstHead.centre_head_employee_id || '',
        }));
      })
      .catch((err) => {
        const apiErr = err?.response?.data?.error;
        setError(apiErr?.message || err.message || 'Could not load correction context.');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [eqmType, eqmId]);

  const options = useMemo(() => ({
    sec: uniqueOptions(context?.heads, 'sec_head'),
    div: uniqueOptions(context?.heads, 'div_head'),
    group: uniqueOptions(context?.heads, 'group_head'),
    entity: uniqueOptions(context?.heads, 'entity_head'),
    centre: uniqueOptions(context?.heads, 'centre_head'),
  }), [context]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError(null);
    if (!form.proposed_division_id) {
      setError('Please select the proposed correct equipment division.');
      return;
    }
    if (form.reason.trim().length < 10) {
      setError('Please enter a clear correction reason.');
      return;
    }
    setSaving(true);
    try {
      const result = await createMasterDataCorrection({
        eqm_type: eqmType,
        eqm_id: Number(eqmId),
        proposed_division_id: Number(form.proposed_division_id),
        lab_phone: form.lab_phone,
        room_phone: form.room_phone,
        subsystem: form.subsystem,
        reason: form.reason.trim(),
        sec_head_employee_id: form.sec_head_employee_id || null,
        div_head_employee_id: form.div_head_employee_id || null,
        group_head_employee_id: form.group_head_employee_id || null,
        entity_head_employee_id: form.entity_head_employee_id || null,
        centre_head_employee_id: form.centre_head_employee_id || null,
      });
      setSuccess(`Correction request submitted. Request ID: ${result.request_id}`);
    } catch (err) {
      const apiErr = err?.response?.data?.error;
      setError(apiErr?.message || err.message || 'Could not submit correction request.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm font-semibold text-slate-500">Loading correction form...</div>;
  }

  const submitter = context?.submitter || {};
  const equipment = context?.equipment || {};

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button
        type="button"
        onClick={() => navigate('/job-requests/new')}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
      >
        <ArrowLeft size={14} />
        Back to Job Request
      </button>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Master Data Correction</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Equipment division mismatch request for TIMCD review.
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertTriangle size={18} className="shrink-0" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div role="status" className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={18} className="shrink-0" />
          {success}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-800">Equipment</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField label="Equipment ID">
            <Input value={`${equipment.eqm_type || eqmType}-${equipment.eqm_id || eqmId}`} disabled readOnly />
          </FormField>
          <FormField label="Equipment Name">
            <Input value={equipment.equipment_name || ''} disabled readOnly />
          </FormField>
          <FormField label="Current Equipment Division">
            <Input value={`${equipment.current_division_code || '-'} --- ${equipment.current_division_name || ''}`} disabled readOnly />
          </FormField>
          <FormField label="Correct / Proposed Division" required>
            <Select value={form.proposed_division_id} onChange={(e) => update('proposed_division_id', e.target.value)}>
              <option value="">Select proposed division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.code} --- {d.name}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-800">Submitted By</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField label="Full Name"><Input value={submitter.full_name || ''} disabled readOnly /></FormField>
          <FormField label="SAC Employee ID"><Input value={submitter.employee_id || ''} disabled readOnly /></FormField>
          <FormField label="Designation"><Input value={submitter.designation || ''} disabled readOnly /></FormField>
          <FormField label="Email Address"><Input value={submitter.email || ''} disabled readOnly /></FormField>
          <FormField label="Lab Phone / Extension"><Input value={form.lab_phone} onChange={(e) => update('lab_phone', e.target.value)} /></FormField>
          <FormField label="Room Phone"><Input value={form.room_phone} onChange={(e) => update('room_phone', e.target.value)} /></FormField>
          <FormField label="Division"><Input value={submitter.egd_name || ''} disabled readOnly /></FormField>
          <FormField label="Subsystem"><Input value={form.subsystem} onChange={(e) => update('subsystem', e.target.value)} /></FormField>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-800">Reporting Heads</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <HeadSelect label="Section Head" value={form.sec_head_employee_id} options={options.sec} onChange={(v) => update('sec_head_employee_id', v)} />
          <HeadSelect label="Division Head" value={form.div_head_employee_id} options={options.div} onChange={(v) => update('div_head_employee_id', v)} />
          <HeadSelect label="Group Head" value={form.group_head_employee_id} options={options.group} onChange={(v) => update('group_head_employee_id', v)} />
          <HeadSelect label="Entity Head" value={form.entity_head_employee_id} options={options.entity} onChange={(v) => update('entity_head_employee_id', v)} />
          <HeadSelect label="Centre Head" value={form.centre_head_employee_id} options={options.centre} onChange={(v) => update('centre_head_employee_id', v)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <FormField label="Correction Reason / TIMCD Note" required>
          <textarea
            rows={5}
            value={form.reason}
            onChange={(e) => update('reason', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Describe why the equipment division should be corrected."
          />
        </FormField>
      </section>

      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={submit} disabled={saving || !!success}>
          <Send size={14} className="mr-2" />
          Submit Correction
        </Button>
      </div>
    </div>
  );
}

function HeadSelect({ label, value, options, onChange }) {
  return (
    <FormField label={label}>
      <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select {label.toLowerCase()}</option>
        {(options || []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </FormField>
  );
}
