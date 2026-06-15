import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  Building2,
  CheckCircle,
  Clock,
  Eye,
  Fingerprint,
  RefreshCw,
  Save,
  ShieldCheck,
  Tag,
  X,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { StandardKpiCard } from '../../../components/StandardKpiCard.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { DataTable } from '../../../components/DataTable.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { ModalPortal } from '../../../components/ui/ModalPortal.jsx';
import { useEquipmentList } from '../../../lib/hooks/useEquipmentList.js';
import {
  fetchDivisions,
  fetchEquipmentDetail,
  fetchMakes,
  fetchProjects,
  fetchTypes,
  rejectEquipment,
  updateEquipment,
  verifyEquipment,
} from '../../../lib/api/equipment.js';

const FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6, 12, 24, 36];

function dateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function emptyForm() {
  return {
    job_category: 'F&PE',
    name: '',
    make_id: '',
    mfg_model_name: '',
    model_no: '',
    serial_no: '',
    equipment_type_id: '',
    options_description: '',
    po_number: '',
    po_date: '',
    cost: '',
    cost_currency: 'INR',
    maintenance_frequency_months: '',
    division_id: '',
    subsystem: '',
    project: '',
  };
}

function formFromDetail(detail) {
  return {
    job_category: detail.category || 'F&PE',
    name: detail.name || '',
    make_id: detail.make_id ? String(detail.make_id) : '',
    mfg_model_name: detail.mfg_model_name || '',
    model_no: detail.model_no || '',
    serial_no: detail.serial_no || '',
    equipment_type_id: detail.equipment_type_id ? String(detail.equipment_type_id) : '',
    options_description: detail.options_description || '',
    po_number: detail.po_number || '',
    po_date: dateInput(detail.po_date),
    cost: detail.cost ?? '',
    cost_currency: detail.currency || 'INR',
    maintenance_frequency_months: detail.maintenance_frequency_months || '',
    division_id: detail.division_id ? String(detail.division_id) : '',
    subsystem: detail.subsystem || '',
    project: detail.project || '',
  };
}

function toPayload(form) {
  return {
    job_category: form.job_category,
    name: form.name.trim(),
    make_id: form.make_id ? Number(form.make_id) : null,
    mfg_model_name: form.mfg_model_name.trim(),
    model_no: form.model_no.trim(),
    serial_no: form.serial_no.trim(),
    equipment_type_id: form.equipment_type_id ? Number(form.equipment_type_id) : null,
    options_description: form.options_description.trim(),
    po_number: form.po_number.trim(),
    po_date: form.po_date,
    cost: Number(form.cost || 0),
    cost_currency: form.cost_currency,
    maintenance_frequency_months: Number(form.maintenance_frequency_months),
    division_id: Number(form.division_id),
    subsystem: form.subsystem.trim(),
    project: form.project,
  };
}

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-bold text-slate-800">{value || '-'}</p>
    </div>
  );
}

export function EquipmentVerification() {
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [masters, setMasters] = useState({ types: [], makes: [], divisions: [], projects: [] });

  const params = useMemo(() => ({
    page: 1,
    page_size: 100,
    status: 'PENDING_VERIFICATION',
    sort: 'equipment_code',
    order: 'asc',
    _refresh: refreshSeed,
  }), [refreshSeed]);

  const { data, error, loading, invalidateAll } = useEquipmentList(params);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetchTypes(ctrl.signal),
      fetchMakes(ctrl.signal),
      fetchDivisions(ctrl.signal),
      fetchProjects(ctrl.signal),
    ])
      .then(([types, makes, divisions, projects]) => {
        setMasters({ types, makes, divisions, projects });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!selectedId) return undefined;
    const ctrl = new AbortController();
    setDetailLoading(true);
    setDetailError('');
    fetchEquipmentDetail(selectedId, ctrl.signal)
      .then((item) => {
        setDetail(item);
        setForm(formFromDetail(item));
      })
      .catch((err) => {
        setDetailError(err.response?.data?.error?.message || err.message || 'Could not load equipment details.');
      })
      .finally(() => setDetailLoading(false));
    return () => ctrl.abort();
  }, [selectedId]);

  function refreshList() {
    invalidateAll();
    setRefreshSeed((v) => v + 1);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSave() {
    if (!selectedId) return;
    setBusyId(selectedId);
    try {
      const updated = await updateEquipment(selectedId, toPayload(form));
      setDetail(updated);
      setForm(formFromDetail(updated));
      refreshList();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Could not save equipment details.');
    } finally {
      setBusyId(null);
    }
  }

  async function onVerify(rowOrDetail = detail) {
    const id = rowOrDetail?.equipment_id;
    if (!id) return;
    setBusyId(id);
    try {
      await verifyEquipment(id);
      refreshList();
      setSelectedId(null);
      setDetail(null);
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Verification failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(rowOrDetail = detail) {
    const id = rowOrDetail?.equipment_id;
    if (!id) return;
    const label = rowOrDetail?.equipment_code || id;
    if (!window.confirm(`Reject and delete pending equipment registration ${label}?`)) return;
    setBusyId(id);
    try {
      await rejectEquipment(id);
      refreshList();
      setSelectedId(null);
      setDetail(null);
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Rejection failed.');
    } finally {
      setBusyId(null);
    }
  }

  const pendingItems = data?.items || [];

  const columns = [
    {
      header: 'Equipment ID',
      accessor: 'equipment_code',
      className: 'font-medium text-accent',
      format: (value, row) => (
        <button
          type="button"
          onClick={() => setSelectedId(row.equipment_id)}
          className="inline-flex items-center gap-1.5 font-bold text-accent hover:text-accent-hover"
        >
          <Eye size={14} />
          {value}
        </button>
      ),
    },
    { header: 'Name', accessor: 'name', className: 'text-ink' },
    { header: 'Category', accessor: 'category' },
    { header: 'Type', accessor: 'eqm_type' },
    { header: 'Make', accessor: 'make' },
    { header: 'Serial No', accessor: 'serial_no', className: 'text-ink font-medium' },
    { header: 'Location', accessor: 'location_name' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Equipment Verification</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Review newly registered equipment, edit registration details, then verify or reject.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={refreshList} disabled={loading}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StandardKpiCard
          loading={loading && !data}
          label="Pending Review"
          value={pendingItems.length}
          icon={Box}
          accent="indigo"
          subtitle="New registrations awaiting admin decision"
        />
        <StandardKpiCard
          loading={loading && !data}
          label="Ready Queue"
          value={pendingItems.length ? 'Open' : 'Clear'}
          icon={CheckCircle}
          accent="emerald"
          subtitle="Click an Equipment ID to inspect details"
        />
        <StandardKpiCard
          loading={loading && !data}
          label="Admin Action"
          value="Verify / Reject"
          icon={AlertTriangle}
          accent="rose"
          subtitle="Decision controls are inside review drawer"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load pending equipment: {error.response?.data?.error?.message || error.message}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={pendingItems}
        keyField="equipment_id"
        loading={loading}
        emptyMessage="No equipment is pending verification."
      />

      {selectedId ? (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm">
            <div className="absolute inset-y-0 right-0 flex w-full justify-end">
              <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl">
                <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-accent">Pending Registration Review</p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                        {detail?.equipment_code || selectedId}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Edit details if required, save changes, then verify or reject the registration.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
                      aria-label="Close review"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {detailError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {detailError}
                    </div>
                  ) : null}

                  {detailLoading ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                      ))}
                    </div>
                  ) : detail ? (
                    <div className="space-y-6">
                      <div className="grid gap-3 md:grid-cols-4">
                        <InfoChip icon={Fingerprint} label="Equipment ID" value={detail.equipment_code} />
                        <InfoChip icon={ShieldCheck} label="Status" value={detail.status?.replace(/_/g, ' ')} />
                        <InfoChip icon={Tag} label="Stored Type" value={detail.eqm_type} />
                        <InfoChip icon={Building2} label="Location" value={detail.location_name} />
                      </div>

                      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                        <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Box size={19} />
                          </span>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-800">Equipment Details</h3>
                            <p className="text-xs font-semibold text-slate-400">Identity, classification, manufacturer, and serial records</p>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField label="Equipment Category">
                            <Select value={form.job_category} onChange={(e) => updateField('job_category', e.target.value)}>
                              <option value="T&ME">T&ME</option>
                              <option value="F&PE">F&PE</option>
                            </Select>
                          </FormField>
                          <FormField label="Equipment Type">
                            <Input value={detail.eqm_type || ''} disabled />
                          </FormField>
                          <div className="md:col-span-2">
                            <FormField label="Equipment Name">
                              <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                            </FormField>
                          </div>
                          <FormField label="Manufacturer">
                            <Select value={form.make_id} onChange={(e) => updateField('make_id', e.target.value)}>
                              <option value="">Select manufacturer</option>
                              {masters.makes.map((m) => (
                                <option key={m.make_id} value={m.make_id}>{m.name}</option>
                              ))}
                            </Select>
                          </FormField>
                          <FormField label="Instrument / Product Type">
                            <Select value={form.equipment_type_id} onChange={(e) => updateField('equipment_type_id', e.target.value)}>
                              <option value="">Select type</option>
                              {masters.types.map((t) => (
                                <option key={t.type_id} value={t.type_id}>{t.name}</option>
                              ))}
                            </Select>
                          </FormField>
                          <FormField label="Model No.">
                            <Input value={form.model_no} onChange={(e) => updateField('model_no', e.target.value)} />
                          </FormField>
                          <FormField label="Serial No.">
                            <Input value={form.serial_no} onChange={(e) => updateField('serial_no', e.target.value)} />
                          </FormField>
                          <div className="md:col-span-2">
                            <FormField label="Options / Description">
                              <textarea
                                value={form.options_description}
                                onChange={(e) => updateField('options_description', e.target.value)}
                                rows={3}
                                className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink shadow-card transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                              />
                            </FormField>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                        <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Clock size={19} />
                          </span>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-800">Procurement and Maintenance</h3>
                            <p className="text-xs font-semibold text-slate-400">PO data, cost, calibration frequency, and division placement</p>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField label="PO Number">
                            <Input value={form.po_number} onChange={(e) => updateField('po_number', e.target.value)} />
                          </FormField>
                          <FormField label="PO Date">
                            <Input type="date" value={form.po_date} onChange={(e) => updateField('po_date', e.target.value)} />
                          </FormField>
                          <FormField label="Cost">
                            <Input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => updateField('cost', e.target.value)} />
                          </FormField>
                          <FormField label="Currency">
                            <Select value={form.cost_currency} onChange={(e) => updateField('cost_currency', e.target.value)}>
                              <option value="INR">INR</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                            </Select>
                          </FormField>
                          <FormField label="Equipment maintenance/cal frequency (months)">
                            <Input
                              type="number"
                              min="1"
                              max="99"
                              list="verification-frequency-options"
                              value={form.maintenance_frequency_months}
                              onChange={(e) => updateField('maintenance_frequency_months', e.target.value)}
                            />
                            <datalist id="verification-frequency-options">
                              {FREQUENCY_OPTIONS.map((months) => (
                                <option key={months} value={months} />
                              ))}
                            </datalist>
                          </FormField>
                          <FormField label="Division">
                            <Select value={form.division_id} onChange={(e) => updateField('division_id', e.target.value)}>
                              <option value="">Select division</option>
                              {masters.divisions.map((d) => (
                                <option key={d.division_id} value={d.division_id}>
                                  {d.code} - {d.name}
                                </option>
                              ))}
                            </Select>
                          </FormField>
                          <FormField label="Subsystem">
                            <Input value={form.subsystem} onChange={(e) => updateField('subsystem', e.target.value)} />
                          </FormField>
                          <FormField label="Project">
                            <Select value={form.project} onChange={(e) => updateField('project', e.target.value)}>
                              <option value="">Select project</option>
                              {masters.projects.map((p) => (
                                <option key={p.project_id} value={p.name}>{p.name}</option>
                              ))}
                            </Select>
                          </FormField>
                        </div>
                      </section>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-slate-200 bg-white px-6 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      Save edits before verifying if any registration details were corrected.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" onClick={onSave} disabled={!detail || busyId === selectedId}>
                        <Save size={15} />
                        {busyId === selectedId ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button type="button" variant="primary" onClick={() => onVerify()} disabled={!detail || busyId === selectedId}>
                        <CheckCircle size={15} />
                        Verify
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onReject()}
                        disabled={!detail || busyId === selectedId}
                        className={clsx('border-red-200 bg-red-50 text-red-700 hover:bg-red-100')}
                      >
                        <XCircle size={15} />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
