// ============================================================================
// src/pages/jobCards/JobCardDetail.jsx  —  /job-cards/:id orchestrator
// ----------------------------------------------------------------------------
// THE workhorse screen of CMCMIS. 13 conditional tabs + 4 transitions +
// 2 sub-features (tasks + documents). This file is the orchestrator —
// fetches the JC detail, decides which tabs are visible based on status
// + perms + ownership, renders the active tab.
//
// LAYOUT
//   ┌─ Header (back link + JC code + equipment summary + status pill) ──┐
//   ├─ Reopen banner (D-9.6 — only if last_reopened_at is recent) ──────┤
//   ├─ Legacy banner (D-9.14 — read-only) ───────────────────────────────┤
//   ├─ Tab strip (13 tabs, conditional) ─────────────────────────────────┤
//   ├─ Active tab body ────────────────────────────────────────────────────┤
//   └─ TabSaveBar (sticky bottom; hidden on non-form tabs) ───────────────┘
//
// URL  /job-cards/:id?tab=<key>  — deep-linkable.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Play, CheckCircle2, RotateCcw } from 'lucide-react';

import { useAuth } from '../../lib/auth-context.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useJobCardDetail, invalidateJobCardDetail } from '../../lib/hooks/useJobCardDetail.js';
import { invalidateJobCardHistory } from '../../lib/hooks/useJobCardHistory.js';
import { invalidateJobCardTasks } from '../../lib/hooks/useJobCardTasks.js';
import { startWorkJobCard } from '../../lib/api/jobCards.js';
import { formatIstTimestamp } from '../../lib/time.js';

import { DetailHeader } from './components/DetailHeader.jsx';
import { DetailTabBar, CALIBRATION_TABS, REPAIR_TABS } from './components/DetailTabBar.jsx';

// Tab components — all collocated in this folder.
import {
  PlugInAccessoriesTab, SubmittedReceivedTab, JobCardDetailsTab,
  EquipmentsUsedTab, AwaitingInformationTab, ContractWarrantyTab,
  ObservationsTab,
} from './tabs/SimpleDataTabs.jsx';
import {
  ConversionPlanningDetailsTab,
  EquipmentDetailsTab,
  InformationTab,
} from './tabs/OverviewTabs.jsx';
import { MaintenanceDetailsTab } from './tabs/MaintenanceDetailsTab.jsx';
import { SparesUsedTab } from './tabs/SparesUsedTab.jsx';
import { TaskChecklistTab } from './tabs/TaskChecklistTab.jsx';
import { MarkCompleteTab }  from './tabs/MarkCompleteTab.jsx';
import { ClosureTab }       from './tabs/ClosureTab.jsx';
import {
  CalibrationAdjustmentsTab,
  CalibrationDetailsTab,
  CalibrationEquipmentUsedTab,
  CalibrationJobClosingTab,
} from './tabs/CalibrationWorkflowTabs.jsx';
import {
  RepairContractWarrantyTab,
  RepairEquipmentUsedTab,
  RepairFaultAnalysisTab,
  RepairJobCardDetailsTab,
  RepairMaintenanceDetailsTab,
  RepairPlugInAccessoriesTab,
  RepairSubmittedReceivedTab,
} from './tabs/RepairWorkflowTabs.jsx';
import { ReopenModal }      from './modals/ReopenModal.jsx';

const LIC_SA_ROLES = new Set([
  'LAB_IN_CHARGE',
  'SUPER_ADMIN',
  'TME_REPAIR_LAB_IN_CHARGE',
  'TME_CAL_LAB_IN_CHARGE',
  'FPE_REPAIR_LAB_IN_CHARGE',
  'FPE_CAL_LAB_IN_CHARGE',
]);

export function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasPermission } = useAuth();

  const { data: jc, loading, error, refetch } = useJobCardDetail(id);

  // ── Compute permissions + ownership flags ───────────────────────────
  const role = user?.role;
  const isLicSa = LIC_SA_ROLES.has(role);
  const isOwnEngineer = !!(jc?.assigned_engineer?.employee_id
    && jc.assigned_engineer.employee_id === user?.sub);
  const isLegacy = !!jc?._flags?.is_legacy;
  const isCalibrationWorkflow = jc?.work_type === 'CALIBRATION'
    || jc?.workflow_type === 'CALIBRATION_STANDARD'
    || jc?.workflow_type === 'CALIBRATION_PRECISION';
  const isRepairWorkflow = jc?.work_type === 'REPAIR'
    || jc?.workflow_type === 'REPAIR_STANDARD'
    || jc?.workflow_type === 'REPAIR_VENDOR'
    || jc?.workflow_type === 'REPAIR_INHOUSE';

  // Write access summary — used by every tab + the action bar.
  const canWrite = !isLegacy && (isOwnEngineer || isLicSa)
                && (jc?.status === 'IN_PROGRESS');
  const canStartWork = !isLegacy
                    && (isOwnEngineer || isLicSa)
                    && (jc?.status === 'ASSIGNED');
  const canMarkComplete = !isLegacy
                       && (isOwnEngineer || isLicSa)
                       && (jc?.status === 'IN_PROGRESS')
                       && hasPermission('job_card:complete');
  const canVerifyClose = !isLegacy
                      && isLicSa
                      && (jc?.status === 'COMPLETED')
                      && hasPermission('job_card:verify-close');
  const canReopen = !isLegacy
                 && isLicSa
                 && (jc?.status === 'COMPLETED' || jc?.status === 'VERIFIED_CLOSED')
                 && hasPermission('job_card:reopen');

  // ── Tab visibility (D-9.1 conditional tabs) ─────────────────────────
  const visibleKeys = useMemo(() => {
    if (isCalibrationWorkflow) {
      return new Set([
        'information',
        'equipment-details',
        'conversion-planning',
        'tasks',
        'cal-details',
        'cal-equipment-used',
        'cal-adjustments',
        'job-closing',
      ]);
    }
    if (isRepairWorkflow) {
      const keys = new Set([
        'information',
        'equipment-details',
        'conversion-planning',
        'repair-plug-in',
        'repair-submitted-recv',
        'repair-job-card-details',
        'repair-maintenance',
        'repair-equipment-used',
        'awaiting',
        'spares',
        'repair-contract',
        'repair-fault-analysis',
      ]);
      if (canMarkComplete) keys.add('mark-complete');
      if (canVerifyClose) keys.add('closure');
      return keys;
    }
    const keys = new Set([
      'information', 'equipment-details', 'conversion-planning',
      'plug-in', 'submitted-recv', 'job-card-details',
      'maintenance', 'equipments-used', 'awaiting',
      'spares', 'contract', 'observations',
      'tasks',
    ]);
    if (canMarkComplete) keys.add('mark-complete');
    if (canVerifyClose) keys.add('closure');
    return keys;
  }, [canMarkComplete, canVerifyClose, isCalibrationWorkflow, isRepairWorkflow]);

  // Active tab from URL (?tab=...) or default to first allowed.
  const requestedTab = searchParams.get('tab');
  const defaultTab = 'information';
  const activeTab = visibleKeys.has(requestedTab) ? requestedTab : defaultTab;

  function changeTab(key) {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', key);
    setSearchParams(sp, { replace: true });
  }

  // ── Reopen modal state ──────────────────────────────────────────────
  const [reopenOpen, setReopenOpen] = useState(false);
  // ── Start-work action busy state ────────────────────────────────────
  const [startBusy, setStartBusy] = useState(false);

  async function handleStartWork() {
    if (!jc) return;
    setStartBusy(true);
    try {
      await startWorkJobCard(jc.section_job_no);
      invalidateAll();
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message;
      // eslint-disable-next-line no-alert
      alert('Cannot start work: ' + (msg || 'Unknown error'));
    } finally {
      setStartBusy(false);
    }
  }

  function invalidateAll() {
    invalidateJobCardDetail(id);
    invalidateJobCardHistory(id);
    invalidateJobCardTasks(id);
  }

  // ── Loading / error states ─────────────────────────────────────────
  if (loading && !jc) {
    return <div className="text-sm text-ink-soft">Loading job card {id}…</div>;
  }
  if (error) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.error?.message || error?.message;
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-lg font-semibold text-ink">Cannot open this Job Card</h1>
        {status === 403 ? (
          <p className="text-sm text-ink-soft">You do not have permission to view this job card.</p>
        ) : status === 404 ? (
          <p className="text-sm text-ink-soft">Job card <span className="font-medium text-ink">{id}</span> not found.</p>
        ) : (
          <p className="text-sm text-ink-soft">{msg || 'Unknown error.'}</p>
        )}
      </div>
    );
  }
  if (!jc) return null;

  // ── Per-tab write-gate resolution (hotfix 2026-05-19) ───────────────
  //
  // `canWrite` (computed near the top of this function) is the gate for
  // the 9 data tabs + Task Checklist — all of which require
  // status='IN_PROGRESS'. But two tabs have DIFFERENT status requirements:
  //
  //   • Mark Complete tab : requires status='IN_PROGRESS'  (canMarkComplete)
  //   • Closure tab       : requires status='COMPLETED'    (canVerifyClose)
  //
  // The original code passed the same `canWrite` to every tab — meaning
  // the Closure tab's Close button was PERMANENTLY DISABLED because the
  // LIC only lands on it once status='COMPLETED' (and canWrite is false
  // at that moment). Resolve the right gate per-tab here.
  let activeTabCanWrite = canWrite;
  if (activeTab === 'closure')       activeTabCanWrite = canVerifyClose;
  if (activeTab === 'job-closing')   activeTabCanWrite = jc?.status === 'COMPLETED' ? canVerifyClose : canMarkComplete;
  // Mark Complete works correctly with the shared canWrite (it only
  // renders when status='IN_PROGRESS', when canWrite IS true), but we
  // make the resolution explicit for symmetry + future-proofing.
  if (activeTab === 'mark-complete') activeTabCanWrite = canMarkComplete;

  // ── Active tab component (selected from the URL param) ─────────────
  const tabProps = {
    jc, canWrite: activeTabCanWrite, isLegacy, refetch, invalidateAll,
    autoSavePref: getAutoSavePref(),
    setAutoSavePref: setAutoSavePrefAndSave,
  };

  let body = null;
  switch (activeTab) {
    case 'information':     body = <InformationTab {...tabProps} />; break;
    case 'equipment-details': body = <EquipmentDetailsTab {...tabProps} />; break;
    case 'conversion-planning': body = <ConversionPlanningDetailsTab {...tabProps} />; break;
    case 'plug-in':         body = <PlugInAccessoriesTab {...tabProps} />; break;
    case 'submitted-recv':  body = <SubmittedReceivedTab {...tabProps} />; break;
    case 'job-card-details': body = <JobCardDetailsTab {...tabProps} />; break;
    case 'maintenance':     body = <MaintenanceDetailsTab {...tabProps} />; break;
    case 'equipments-used': body = <EquipmentsUsedTab {...tabProps} />; break;
    case 'awaiting':        body = <AwaitingInformationTab {...tabProps} />; break;
    case 'spares':          body = <SparesUsedTab {...tabProps} />; break;
    case 'contract':        body = <ContractWarrantyTab {...tabProps} />; break;
    case 'observations':    body = <ObservationsTab {...tabProps} />; break;
    case 'tasks':           body = <TaskChecklistTab {...tabProps} />; break;
    case 'mark-complete':   body = <MarkCompleteTab {...tabProps} />; break;
    case 'closure':         body = <ClosureTab {...tabProps} />; break;
    case 'cal-details':     body = <CalibrationDetailsTab {...tabProps} />; break;
    case 'cal-equipment-used': body = <CalibrationEquipmentUsedTab {...tabProps} />; break;
    case 'cal-adjustments': body = <CalibrationAdjustmentsTab {...tabProps} />; break;
    case 'job-closing':     body = <CalibrationJobClosingTab {...tabProps} />; break;
    case 'repair-plug-in': body = <RepairPlugInAccessoriesTab {...tabProps} />; break;
    case 'repair-submitted-recv': body = <RepairSubmittedReceivedTab {...tabProps} />; break;
    case 'repair-job-card-details': body = <RepairJobCardDetailsTab {...tabProps} />; break;
    case 'repair-maintenance': body = <RepairMaintenanceDetailsTab {...tabProps} />; break;
    case 'repair-equipment-used': body = <RepairEquipmentUsedTab {...tabProps} />; break;
    case 'repair-contract': body = <RepairContractWarrantyTab {...tabProps} />; break;
    case 'repair-fault-analysis': body = <RepairFaultAnalysisTab {...tabProps} />; break;
    default:                body = <PlugInAccessoriesTab {...tabProps} />;
  }

  return (
    <div className="space-y-4 pb-6">
      <DetailHeader jc={jc} />

      {/* Banners */}
      {isLegacy ? (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
          <AlertTriangle size={16} strokeWidth={1.75} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-ink">
            <span className="font-semibold text-amber-700">Legacy Job Card — read-only view.</span>{' '}
            This card predates the MVP. The Phase 9 lifecycle does not apply; no edits, transitions,
            or uploads are permitted. Use the read-only view for historical reference.
          </div>
        </div>
      ) : null}

      {!isLegacy && jc.last_reopened_at && jc.status === 'IN_PROGRESS' ? (
        <div role="alert" className="rounded-lg border border-orange-300 bg-orange-50 p-3 flex items-start gap-2">
          <RotateCcw size={16} strokeWidth={1.75} className="text-orange-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-ink">
            <span className="font-semibold text-orange-700">This job card was reopened.</span>{' '}
            Total reopens: {jc.reopen_count}. Last reopened by{' '}
            <span className="font-medium">{jc.last_reopened_by?.name || jc.last_reopened_by?.employee_id || '—'}</span>
            {' '}on {formatIstTimestamp(jc.last_reopened_at)}.
            Review the rejection reason in the Status Timeline before continuing.
          </div>
        </div>
      ) : null}

      {!isCalibrationWorkflow && !isRepairWorkflow ? (
        <DetailTabBar
          active={activeTab}
          onChange={changeTab}
          visibleKeys={visibleKeys}
        />
      ) : null}

      {/* Action bar — visible above the active tab when an actionable
          transition is available. Engineer's "Start Work" lives here for
          ASSIGNED status; verify-close lives in its own tab. */}
      {!isLegacy ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="text-ink-soft">
            Status: <span className="font-medium text-ink">{jc.status}</span>
            {jc.job_status_display ? (
              <>{' · '}Engineer label: <span className="font-medium text-ink">{jc.job_status_display}</span></>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {canStartWork ? (
              <Button variant="primary" size="sm" onClick={handleStartWork} disabled={startBusy}>
                <Play size={14} strokeWidth={1.75} aria-hidden="true" />
                {startBusy ? 'Starting…' : 'Start Work'}
              </Button>
            ) : null}
            {canReopen ? (
              <Button variant="secondary" size="sm" onClick={() => setReopenOpen(true)}>
                <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
                Reopen
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Active tab body */}
      {isCalibrationWorkflow || isRepairWorkflow ? (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="px-3 pt-3">
            <DetailTabBar
              active={activeTab}
              onChange={changeTab}
              visibleKeys={visibleKeys}
              tabs={isCalibrationWorkflow ? CALIBRATION_TABS : REPAIR_TABS}
            />
          </div>
          <div className="p-4">
            {body}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg p-4">
          {body}
        </div>
      )}

      {/* Reopen modal */}
      {reopenOpen ? (
        <ReopenModal
          jc={jc}
          onClose={() => setReopenOpen(false)}
          onSuccess={() => {
            setReopenOpen(false);
            invalidateAll();
            refetch();
          }}
        />
      ) : null}
    </div>
  );
}

// ── Auto-save preference persistence helpers ─────────────────────────
const AUTOSAVE_KEY = 'cmcmis_autosave';
function getAutoSavePref() {
  try {
    const v = localStorage.getItem(AUTOSAVE_KEY);
    return v === null ? true : v === 'true';
  } catch { return true; }
}
function setAutoSavePrefAndSave(v) {
  try { localStorage.setItem(AUTOSAVE_KEY, String(!!v)); } catch { /* ignore */ }
}
