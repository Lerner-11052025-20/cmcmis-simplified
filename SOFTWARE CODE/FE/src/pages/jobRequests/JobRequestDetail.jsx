// ============================================================================
// src/pages/jobRequests/JobRequestDetail.jsx  —  /job-requests/:id
// ----------------------------------------------------------------------------
// Orchestrates the seven sub-cards + the action bar + the two modals.
// All data fetching lives in useJobRequestDetail / useJobRequestHistory
// hooks; this file is pure glue.
//
// LAYOUT (matches the spec's 6-card pattern):
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ ← Back to Job Requests                                                │
//   │ JR-2026-1240         Calibration · TME · Submitted X        [PENDING] │
//   │                                                              Priority │
//   ├──────────────────────────────────────────────────────────────────────┤
//   │ ┌─── Equipment ──┐  ┌─── Submission & Division ──┐                    │
//   │ │ name, make, …  │  │ submitter, designation, …  │                    │
//   │ └────────────────┘  └────────────────────────────┘                    │
//   │ ┌─── Complaint & Accessories (full-width) ───────────────────────┐    │
//   │ │ Complaint text  +  Accessories table                            │    │
//   │ └─────────────────────────────────────────────────────────────────┘    │
//   │ ┌─── Linked Job Card (only if exists) ──┐  ┌─── Status Timeline ──┐    │
//   │ │ section_job_no, status, workflow, …   │  │ ...history rows...   │    │
//   │ └────────────────────────────────────────┘  └──────────────────────┘    │
//   ├──────────────────────────────────────────────────────────────────────┤
//   │ [Reject]              [Convert to Job Card]      ← sticky action bar  │
//   └──────────────────────────────────────────────────────────────────────┘
//
// RBAC:
//   • The page is gated on `job_request:read-own` in App.jsx; the BE
//     enforces row-level scope (a Normal user probing for a foreign id
//     receives 404).
//   • Convert / Reject buttons surface inside DetailActionBar only when
//     the actor has the right perms AND the status is SUBMITTED.
// ============================================================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, Wrench } from 'lucide-react';
import { toast } from 'sonner';


import { useJobRequestDetail, invalidateJobRequestDetail } from '../../lib/hooks/useJobRequestDetail.js';
import { invalidateJobRequestHistory } from '../../lib/hooks/useJobRequestHistory.js';
import { invalidateConversionList } from '../../lib/hooks/useConversionList.js';
import { invalidateEngineersLookup } from '../../lib/hooks/useEngineersLookup.js';
import { invalidateJobRequestCache } from '../../lib/hooks/useJobRequestList.js';

import { DetailHeader }            from './components/DetailHeader.jsx';
import { DetailEquipmentCard }     from './components/DetailEquipmentCard.jsx';
import { DetailSubmissionCard }    from './components/DetailSubmissionCard.jsx';
import { DetailComplaintCard }     from './components/DetailComplaintCard.jsx';
import { DetailTimelineCard }      from './components/DetailTimelineCard.jsx';
import { DetailLinkedJobCardCard } from './components/DetailLinkedJobCardCard.jsx';
import { DetailActionBar }         from './components/DetailActionBar.jsx';
import { deleteJobRequest }        from '../../lib/api/jobRequests.js';

import { ConvertToJobCardModal } from '../conversion/components/ConvertToJobCardModal.jsx';
import { RejectModal }            from '../conversion/components/RejectModal.jsx';

function DetailMetric({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={21} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 truncate text-lg font-semibold text-slate-950">{value || '-'}</p>
        </div>
      </div>
    </div>
  );
}

export function JobRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const jrNo = Number(id);

  const { data: jr, loading, error, refetch } = useJobRequestDetail(jrNo);

  const [convertOpen, setConvertOpen] = useState(false);
  const [rejectOpen,  setRejectOpen]  = useState(false);

  // ── Loading / error states ──────────────────────────────────────
  if (loading && !jr) {
    return (
      <div className="text-sm text-ink-soft">Loading job request {id}…</div>
    );
  }
  if (error) {
    const status = error?.response?.status;
    const msg    = error?.response?.data?.error?.message || error?.message;
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-lg font-semibold text-ink">Cannot open this Job Request</h1>
        {status === 403 ? (
          <p className="text-sm text-ink-soft">
            You do not have permission to view this request. Normal users
            can only see Job Requests they submitted themselves.
          </p>
        ) : status === 404 ? (
          <p className="text-sm text-ink-soft">
            Job Request <span className="font-medium text-ink">{id}</span>{' '}
            was not found, or you do not have permission to view it.
          </p>
        ) : (
          <p className="text-sm text-ink-soft">{msg || 'Unknown error.'}</p>
        )}
      </div>
    );
  }
  if (!jr) return null;

  // After Convert/Reject success — invalidate every relevant cache layer
  // and refetch this detail. The user stays on the page; the action bar
  // disappears (since status is no longer SUBMITTED) and the timeline +
  // linked-JC card update on the next render.
  function handleAfterMutation() {
    invalidateJobRequestDetail(jrNo);
    invalidateJobRequestHistory(jrNo);
    invalidateConversionList();
    invalidateEngineersLookup();
    invalidateJobRequestCache();
    refetch();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete Job Request ${jr.request_code}? This action cannot be undone and will delete all accessories, history, and audit log entries.`
    );
    if (!confirmed) return;

    try {
      await deleteJobRequest(jrNo);
      toast.success(`Job request ${jr.request_code} has been successfully deleted.`);
      invalidateJobRequestCache();
      navigate('/job-requests');
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || 'Failed to delete Job Request';
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <DetailHeader jr={jr} />

      <div className="grid gap-4 md:grid-cols-4">
        <DetailMetric
          label="Request type"
          value={jr.job_type}
          icon={FileText}
          tone="bg-indigo-50 text-indigo-600"
        />
        <DetailMetric
          label="Category"
          value={jr.job_category}
          icon={Wrench}
          tone="bg-sky-50 text-sky-600"
        />
        <DetailMetric
          label="Status"
          value={jr.status}
          icon={CheckCircle2}
          tone="bg-emerald-50 text-emerald-600"
        />
        <DetailMetric
          label="Timeline"
          value="Live history"
          icon={Clock}
          tone="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Status Timeline — directly below header */}
      <DetailTimelineCard jrId={jrNo} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetailEquipmentCard equipment={jr.equipment} />
        <DetailSubmissionCard
          submitter={jr.submitter}
          division={jr.division}
          project_name={jr.project_name}
          subsystem={jr.subsystem}
        />
      </div>

      {/* Linked Job Card + Accessories side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jr.linked_job_card ? (
          <DetailLinkedJobCardCard
            linkedJobCard={jr.linked_job_card}
            assignedEngineer={jr.assigned_engineer}
          />
        ) : <div />}
        <DetailComplaintCard
          accessories={jr.accessories}
        />
      </div>

      <DetailActionBar
        jr={jr}
        onConvertClick={() => setConvertOpen(true)}
        onRejectClick={()  => setRejectOpen(true)}
        onDeleteClick={handleDelete}
      />

      {/* ── Modals (rendered conditionally to keep the DOM lean) ──── */}
      {convertOpen ? (
        <ConvertToJobCardModal
          jr={jr}
          onClose={() => setConvertOpen(false)}
          onSuccess={(_payload) => {
            setConvertOpen(false);
            handleAfterMutation();
          }}
        />
      ) : null}

      {rejectOpen ? (
        <RejectModal
          jr={jr}
          onClose={() => setRejectOpen(false)}
          onSuccess={() => {
            setRejectOpen(false);
            handleAfterMutation();
          }}
        />
      ) : null}
    </div>
  );
}
