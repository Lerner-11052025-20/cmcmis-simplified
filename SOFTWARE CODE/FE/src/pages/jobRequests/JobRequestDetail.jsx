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

import { ConvertToJobCardModal } from '../conversion/components/ConvertToJobCardModal.jsx';
import { RejectModal }            from '../conversion/components/RejectModal.jsx';

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

  return (
    <div className="space-y-5 pb-6">
      <DetailHeader jr={jr} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailEquipmentCard equipment={jr.equipment} />
        <DetailSubmissionCard
          submitter={jr.submitter}
          division={jr.division}
          project_name={jr.project_name}
          subsystem={jr.subsystem}
        />
      </div>

      <DetailComplaintCard
        complaint_description={jr.complaint_description}
        remarks={jr.remarks}
        accessories={jr.accessories}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jr.linked_job_card ? (
          <DetailLinkedJobCardCard
            linkedJobCard={jr.linked_job_card}
            assignedEngineer={jr.assigned_engineer}
          />
        ) : <div />}
        <DetailTimelineCard jrId={jrNo} />
      </div>

      <DetailActionBar
        jr={jr}
        onConvertClick={() => setConvertOpen(true)}
        onRejectClick={()  => setRejectOpen(true)}
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
