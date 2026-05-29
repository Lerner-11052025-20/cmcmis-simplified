import { useMemo, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { DataTable } from '../../../components/DataTable.jsx';
import { useEquipmentList } from '../../../lib/hooks/useEquipmentList.js';
import { verifyEquipment, rejectEquipment } from '../../../lib/api/equipment.js';

export function EquipmentVerification() {
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const params = useMemo(() => ({
    page: 1,
    page_size: 100,
    status: 'PENDING_VERIFICATION',
    sort: 'equipment_code',
    order: 'asc',
    _refresh: refreshSeed,
  }), [refreshSeed]);

  const { data, error, loading, invalidateAll } = useEquipmentList(params);

  async function onVerify(row) {
    setBusyId(row.equipment_id);
    try {
      await verifyEquipment(row.equipment_id);
      invalidateAll();
      setRefreshSeed((v) => v + 1);
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Verification failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(row) {
    if (!window.confirm(`Are you sure you want to reject and delete equipment "${row.name}" (${row.equipment_code})?`)) {
      return;
    }
    setBusyId(row.equipment_id);
    try {
      await rejectEquipment(row.equipment_id);
      invalidateAll();
      setRefreshSeed((v) => v + 1);
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Rejection failed.');
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { header: 'Equipment ID', accessor: 'equipment_code', className: 'font-medium text-accent' },
    { header: 'Name', accessor: 'name', className: 'text-ink' },
    { header: 'Make', accessor: 'make' },
    { header: 'Serial No', accessor: 'serial_no', className: 'text-ink font-medium' },
    { header: 'Location', accessor: 'location_name' },
    {
      header: 'Action',
      accessor: 'equipment_id',
      format: (_v, row) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={busyId === row.equipment_id}
            onClick={() => onVerify(row)}
          >
            <CheckCircle size={14} strokeWidth={1.75} aria-hidden="true" />
            {busyId === row.equipment_id ? 'Verifying...' : 'Verify'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={busyId === row.equipment_id}
            onClick={() => onReject(row)}
          >
            <XCircle size={14} strokeWidth={1.75} aria-hidden="true" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Equipment Verification</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Review newly registered equipment and activate verified records.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load pending equipment: {error.response?.data?.error?.message || error.message}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={data?.items || []}
        keyField="equipment_id"
        loading={loading}
        emptyMessage="No equipment is pending verification."
      />
    </div>
  );
}
