import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchEquipmentDetail } from '../../lib/api/equipment.js';

function formatDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

function Field({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-1 text-sm font-medium text-ink break-words">{value || '—'}</div>
    </div>
  );
}

export function EquipmentDetailPlaceholder() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetchEquipmentDetail(id, ctrl.signal)
      .then(setData)
      .catch((e) => {
        if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
        setError(e);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [id]);

  return (
    <div className="space-y-6">
      <Link
        to="/equipment"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-accent"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Back to Equipment
      </Link>

      {loading ? <div className="text-sm text-ink-soft">Loading equipment details...</div> : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load equipment: {error.response?.data?.error?.message || error.message}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-ink">{data.name}</h1>
              <p className="mt-1 text-sm text-ink-soft">{data.equipment_code}</p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {String(data.status || '').replace(/_/g, ' ') || '—'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Equipment ID" value={data.equipment_code} />
            <Field label="Type" value={data.type_name || data.eqm_type} />
            <Field label="Make" value={data.make} />
            <Field label="Model No" value={data.model_no || data.mfg_model_name} />
            <Field label="Serial No" value={data.serial_no} />
            <Field label="Location" value={data.location_name || data.division_code} />
            <Field label="PO Number" value={data.po_number} />
            <Field label="PO Date" value={formatDate(data.po_date)} />
            <Field label="Cost" value={data.cost ? `${data.cost} ${data.currency || ''}` : ''} />
            <Field label="Warranty Expiry" value={formatDate(data.warranty_expiry_date)} />
            <Field label="Calibration Due" value={formatDate(data.next_cal_due_date)} />
            <Field label="Created By" value={data.created_by} />
          </div>

          <div className="rounded-lg border border-border bg-white p-5 shadow-card">
            <h2 className="text-base font-semibold text-ink">Options / Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
              {data.options_description || data.remarks || 'No description available.'}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
