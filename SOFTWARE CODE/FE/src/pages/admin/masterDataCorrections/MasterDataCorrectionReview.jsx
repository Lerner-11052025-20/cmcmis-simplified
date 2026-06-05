import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle, ArrowRight, Calendar, Phone, Mail, Building, FileText, X, Search } from 'lucide-react';
import clsx from 'clsx';

import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Pagination } from '../../../components/Pagination.jsx';
import { ModalPortal } from '../../../components/ui/ModalPortal.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import {
  approveMasterDataCorrection,
  fetchMasterDataCorrections,
  rejectMasterDataCorrection,
} from '../../../lib/api/masterDataCorrections.js';

const STATUS_TABS = [
  { value: 'SUBMITTED', label: 'Pending Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return '—';
  }
}

export function MasterDataCorrectionReview() {
  const [status, setStatus] = useState('SUBMITTED');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  // Custom modal state
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    row: null,
    action: '', // 'approve' or 'reject'
    notes: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadCountRef = useRef(0);
  const debTimer = useRef(null);

  // Debouncing search
  useEffect(() => {
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => debTimer.current && clearTimeout(debTimer.current);
  }, [qInput]);

  // Reset page when status changes
  useEffect(() => {
    setPage(1);
  }, [status]);

  async function load(signal) {
    const currentCount = ++loadCountRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMasterDataCorrections({ status, page, page_size: 10, ...(q ? { q } : {}) }, signal);
      if (currentCount !== loadCountRef.current) return;
      setItems(data.items || []);
      setPagination(data.pagination || null);
    } catch (err) {
      if (currentCount !== loadCountRef.current) return;
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.name === 'AbortError') return;
      const apiErr = err?.response?.data?.error;
      setError(apiErr?.message || err.message || 'Could not load correction requests.');
    } finally {
      if (currentCount === loadCountRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [status, page, q]);

  function openReview(row, action) {
    setReviewModal({
      isOpen: true,
      row,
      action,
      notes: '',
    });
  }

  async function submitReview() {
    const { row, action, notes } = reviewModal;
    setSubmittingReview(true);
    try {
      if (action === 'approve') {
        await approveMasterDataCorrection(row.request_id, { notes });
      } else {
        await rejectMasterDataCorrection(row.request_id, { notes });
      }
      setReviewModal({ isOpen: false, row: null, action: '', notes: '' });
      await load();
    } catch (err) {
      const apiErr = err?.response?.data?.error;
      window.alert(apiErr?.message || err.message || 'Review action failed.');
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Master Data Corrections</h1>
          <p className="text-sm text-ink-soft mt-1">
            Review SSO equipment division correction requests and resolve division mismatches.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search requests..."
              className="pl-9 text-xs font-normal"
            />
          </div>

          <Button type="button" variant="secondary" onClick={() => load()} disabled={loading} className="shrink-0">
            <RefreshCw size={14} className={clsx("mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {/* Tab Selectors & Stats Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/15",
                  isActive 
                    ? "bg-white text-ink shadow-sm border border-slate-200" 
                    : "text-ink-soft hover:text-ink hover:bg-white/40"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="text-xs font-semibold text-ink-soft px-3">
          {pagination ? `Total: ${pagination.total_items} requests` : 'Loading...'}
        </div>
      </div>

      {/* Request Cards Grid / Spinner / Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Spinner size={32} className="text-accent animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft mt-3 animate-pulse">Fetching Requests...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-slate-200 shadow-sm text-center animate-[scaleUp_150ms_ease-out]">
          <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-150 text-ink-soft mb-4">
            <FileText size={20} />
          </div>
          <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">No Correction Requests</h3>
          <p className="text-xs font-medium text-ink-soft max-w-sm mt-2 leading-relaxed">
            {q ? `No requests found matching "${q}". Try clearing filters or refining your search.` : `There are currently no master data correction requests in this state.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {items.map((row) => (
            <div 
              key={row.request_id} 
              className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:shadow-md hover:border-slate-300 transition-all duration-205 p-6 space-y-5"
            >
              {/* Card Header: Request info and Submitter */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-ink font-bold text-xs rounded-lg uppercase">
                    #{row.request_id}
                  </span>
                  <div className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>{formatDate(row.created_at)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border select-none",
                    row.status === 'SUBMITTED' && "bg-amber-50 text-amber-700 border-amber-200",
                    row.status === 'APPROVED' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                    row.status === 'REJECTED' && "bg-rose-50 text-rose-700 border-rose-200"
                  )}>
                    {row.status === 'SUBMITTED' ? 'Pending Action' : row.status}
                  </span>
                </div>
              </div>

              {/* Card Body: Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Column 1: Submitter and Contact info (lg:col-span-5) */}
                <div className="lg:col-span-5 space-y-4 bg-slate-50/50 rounded-xl border border-slate-200/30 p-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-150">
                    <div className="h-9 w-9 rounded-lg bg-accent/5 text-accent border border-accent/10 flex items-center justify-center font-bold text-sm">
                      {row.submitted_by_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-ink">{row.submitted_by_name}</span>
                      <span className="block text-[10px] font-semibold text-ink-soft uppercase tracking-wide mt-0.5">SAC ID: {row.submitted_by_employee_id}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-ink">
                    <div className="flex items-center gap-2 font-medium">
                      <Mail size={13} className="text-ink-soft shrink-0" />
                      <span className="truncate" title={row.submitted_by_email}>{row.submitted_by_email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <Phone size={13} className="text-ink-soft shrink-0" />
                      <span>Ext: {row.submitted_by_lab_phone || '—'} / Room: {row.submitted_by_room_phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <Building size={13} className="text-ink-soft shrink-0" />
                      <span>Div: {row.submitted_by_egd_name || '—'}</span>
                    </div>
                    {row.submitted_by_subsystem && (
                      <div className="flex items-center gap-2 font-medium">
                        <FileText size={13} className="text-ink-soft shrink-0" />
                        <span>Subsystem: {row.submitted_by_subsystem}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Equipment and Division Change details (lg:col-span-7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">Target Equipment</span>
                    <div className="font-semibold text-ink text-sm mt-1">{row.equipment_name}</div>
                    <div className="text-xs font-semibold text-ink-soft mt-1 flex items-center gap-1.5">
                      <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                        {row.eqm_type}
                      </span>
                      <span className="text-slate-350">·</span>
                      <span>ID: {row.eqm_id}</span>
                    </div>
                  </div>

                  {/* Division Change Visual Component */}
                  <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200/50 rounded-xl shadow-sm">
                    <div className="flex-1 text-center">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-ink-soft">Current Division</span>
                      <span className="inline-block mt-1.5 px-2.5 py-1 bg-slate-200 text-ink text-xs font-bold rounded-lg uppercase">
                        {row.current_division_code || '—'}
                      </span>
                      <span className="block text-[10px] font-medium text-ink-soft mt-1 truncate" title={row.current_division_name}>
                        {row.current_division_name || 'No Division'}
                      </span>
                    </div>
                    
                    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-200/50 text-ink-soft">
                      <ArrowRight size={16} strokeWidth={2} className="animate-pulse" />
                    </div>

                    <div className="flex-1 text-center">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-ink-soft">Proposed Division</span>
                      <span className="inline-block mt-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg uppercase border border-emerald-200">
                        {row.proposed_division_code}
                      </span>
                      <span className="block text-[10px] font-medium text-emerald-600 mt-1 truncate" title={row.proposed_division_name}>
                        {row.proposed_division_name || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Section: Reporting Heads & Reason */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                {/* Reason Blockquote */}
                <div className="bg-slate-50 border-l-4 border-indigo-500/60 p-4 rounded-r-xl">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft block mb-1">Reason for Correction</span>
                  <p className="text-xs font-semibold leading-relaxed text-ink italic">
                    "{row.reason || 'No detailed reason provided.'}"
                  </p>
                </div>

                {/* Reporting Heads */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft block">Workflow Route Reporting Heads</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    <HeadBadge roleName="Section Head" id={row.sec_head_employee_id} name={row.sec_head_name} />
                    <HeadBadge roleName="Division Head" id={row.div_head_employee_id} name={row.div_head_name} />
                    <HeadBadge roleName="Group Head" id={row.group_head_employee_id} name={row.group_head_name} />
                    <HeadBadge roleName="Entity Head" id={row.entity_head_employee_id} name={row.entity_head_name} />
                    <HeadBadge roleName="Centre Head" id={row.centre_head_employee_id} name={row.centre_head_name} />
                  </div>
                </div>
              </div>

              {/* Review Action Controls or Review Metadata */}
              {row.status === 'SUBMITTED' ? (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 select-none">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => openReview(row, 'reject')} 
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <XCircle size={14} className="mr-1.5" />
                    Reject Request
                  </Button>
                  <Button 
                    type="button" 
                    variant="primary" 
                    onClick={() => openReview(row, 'approve')}
                    className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-md shadow-emerald-600/10 text-white"
                  >
                    <CheckCircle2 size={14} className="mr-1.5" />
                    Approve & Update
                  </Button>
                </div>
              ) : (
                <div className={clsx(
                  "p-4 rounded-xl border text-xs font-semibold leading-relaxed space-y-2.5",
                  row.status === 'APPROVED' ? "bg-emerald-50/50 border-emerald-200 text-emerald-800" : "bg-rose-50/50 border-rose-200 text-rose-800"
                )}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      {row.status === 'APPROVED' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      <span className="uppercase tracking-wide">
                        {row.status === 'APPROVED' ? 'Correction Request Approved' : 'Correction Request Rejected'}
                      </span>
                    </div>
                    <div className="font-semibold text-[11px] opacity-80">
                      Reviewed by: {row.reviewed_by_employee_id} ({row.reviewed_by_role}) at {formatDate(row.reviewed_at)}
                    </div>
                  </div>
                  {row.review_notes ? (
                    <div>
                      <span className="font-semibold block opacity-85 text-[10px] uppercase tracking-wider">Reviewer Notes:</span>
                      <p className="mt-1 font-medium italic">"{row.review_notes}"</p>
                    </div>
                  ) : (
                    <span className="italic opacity-60">No reviewer notes provided.</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination component */}
      {pagination && pagination.total_pages > 1 ? (
        <div className="flex items-center justify-between pt-4 select-none">
          <div className="text-xs font-semibold text-ink-soft">
            Page {pagination.page} of {pagination.total_pages}
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.total_pages}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      {/* Custom Review Modal */}
      {reviewModal.isOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => !submittingReview && setReviewModal(prev => ({ ...prev, isOpen: false }))}
            />
            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transform transition-all animate-[scaleUp_150ms_ease-out] z-10">
              <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                  {reviewModal.action === 'approve' ? (
                    <CheckCircle2 className="text-emerald-600" size={18} />
                  ) : (
                    <XCircle className="text-rose-600" size={18} />
                  )}
                  {reviewModal.action === 'approve' ? 'Approve Correction' : 'Reject Correction'}
                </h3>
                <button 
                  type="button" 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1.5 transition"
                  onClick={() => !submittingReview && setReviewModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={submittingReview}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Please enter your {reviewModal.action === 'approve' ? 'approval' : 'rejection'} notes below:
                </div>
                <textarea
                  rows={4}
                  value={reviewModal.notes}
                  onChange={(e) => setReviewModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={reviewModal.action === 'approve' ? 'Optional approval details...' : 'Required rejection reason...'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed transition-all duration-200"
                  disabled={submittingReview}
                />
              </div>

              <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex items-center justify-end gap-3 select-none">
                <Button
                  variant="secondary"
                  onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={submittingReview}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className={reviewModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md border-emerald-600 text-white' : 'bg-rose-600 hover:bg-rose-700 shadow-md border-rose-600 text-white'}
                  onClick={submitReview}
                  disabled={submittingReview || (reviewModal.action === 'reject' && !reviewModal.notes.trim())}
                >
                  {submittingReview ? (
                    <>
                      <Spinner size={14} className="text-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    reviewModal.action === 'approve' ? 'Approve' : 'Reject'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function HeadBadge({ roleName, id, name }) {
  if (!id) return null;
  return (
    <div className="bg-slate-50/80 border border-slate-200/50 rounded-xl p-2.5 text-center hover:bg-slate-100/50 transition-colors duration-200">
      <span className="block text-[8px] font-semibold text-ink-soft uppercase tracking-widest leading-none">{roleName}</span>
      <span className="block text-[11px] font-semibold text-ink truncate mt-1.5" title={name}>{name || '—'}</span>
      <span className="block text-[9px] font-medium text-ink-soft mt-1 uppercase">SAC ID: {id}</span>
    </div>
  );
}
