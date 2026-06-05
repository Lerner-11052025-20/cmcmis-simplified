import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

import { Button } from '../../../components/ui/Button.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import {
  approveMasterDataCorrection,
  fetchMasterDataCorrections,
  rejectMasterDataCorrection,
} from '../../../lib/api/masterDataCorrections.js';

const STATUS_OPTIONS = ['SUBMITTED', 'APPROVED', 'REJECTED'];

export function MasterDataCorrectionReview() {
  const [status, setStatus] = useState('SUBMITTED');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load(signal) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMasterDataCorrections({ status, page_size: 50 }, signal);
      setItems(data.items || []);
      setPagination(data.pagination || null);
    } catch (err) {
      const apiErr = err?.response?.data?.error;
      setError(apiErr?.message || err.message || 'Could not load correction requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [status]);

  async function review(row, action) {
    const notes = window.prompt(action === 'approve' ? 'Approval notes' : 'Rejection notes') || '';
    try {
      if (action === 'approve') {
        await approveMasterDataCorrection(row.request_id, { notes });
      } else {
        await rejectMasterDataCorrection(row.request_id, { notes });
      }
      await load();
    } catch (err) {
      const apiErr = err?.response?.data?.error;
      window.alert(apiErr?.message || err.message || 'Review action failed.');
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Master Data Corrections</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Review SSO equipment division correction requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Button type="button" variant="secondary" onClick={() => load()} disabled={loading}>
            <RefreshCw size={14} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Division Change</th>
              <th className="px-4 py-3">Submitted By</th>
              <th className="px-4 py-3">Heads</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center font-semibold text-slate-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center font-semibold text-slate-400">No requests found.</td></tr>
            ) : items.map((row) => (
              <tr key={row.request_id} className="align-top hover:bg-slate-50/50">
                <td className="px-4 py-4 font-extrabold text-slate-700">#{row.request_id}</td>
                <td className="px-4 py-4">
                  <div className="font-bold text-slate-900">{row.equipment_name}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{row.eqm_type}-{row.eqm_id}</div>
                </td>
                <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                  <div>{row.current_division_code || '-'}</div>
                  <div className="my-1 text-slate-400">to</div>
                  <div className="text-emerald-700">{row.proposed_division_code}</div>
                </td>
                <td className="px-4 py-4 text-xs">
                  <div className="font-bold text-slate-800">{row.submitted_by_name}</div>
                  <div className="mt-1 font-semibold text-slate-500">{row.submitted_by_employee_id}</div>
                  <div className="mt-1 text-slate-500">{row.submitted_by_email || '-'}</div>
                </td>
                <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                  <div>Sec: {row.sec_head_employee_id || '-'}</div>
                  <div>Div: {row.div_head_employee_id || '-'}</div>
                  <div>Group: {row.group_head_employee_id || '-'}</div>
                  <div>Entity: {row.entity_head_employee_id || '-'}</div>
                  <div>Centre: {row.centre_head_employee_id || '-'}</div>
                </td>
                <td className="max-w-xs px-4 py-4 text-xs font-medium leading-relaxed text-slate-600">
                  {row.reason || '-'}
                </td>
                <td className="px-4 py-4">
                  {row.status === 'SUBMITTED' ? (
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => review(row, 'reject')} className="text-red-600">
                        <XCircle size={14} className="mr-1" />
                        Reject
                      </Button>
                      <Button type="button" variant="primary" onClick={() => review(row, 'approve')}>
                        <CheckCircle2 size={14} className="mr-1" />
                        Approve
                      </Button>
                    </div>
                  ) : (
                    <span className="block text-right text-xs font-extrabold text-slate-500">{row.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <p className="text-xs font-semibold text-slate-500">
          Showing {items.length} of {pagination.total_items} requests.
        </p>
      ) : null}
    </div>
  );
}
