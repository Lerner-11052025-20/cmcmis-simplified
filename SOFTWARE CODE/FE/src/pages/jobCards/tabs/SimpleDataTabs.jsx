// ============================================================================
// pages/jobCards/tabs/SimpleDataTabs.jsx  —  7 grid-form tabs
// ----------------------------------------------------------------------------
// Tabs 1, 2, 3, 5, 6, 8, 9 are all "field grid + save bar" forms with
// no multi-row child tables and no transition logic. They share a
// common shape (useForm + useAutoSave + TabSaveBar) — collocating them
// here avoids 7 tiny near-identical files.
//
// Exports:
//   PlugInAccessoriesTab        (Tab 1)
//   SubmittedReceivedTab        (Tab 2)
//   JobCardDetailsTab           (Tab 3)
//   EquipmentsUsedTab           (Tab 5)
//   AwaitingInformationTab      (Tab 6 — incl. procurement subgroup)
//   ContractWarrantyTab         (Tab 8)
//   ObservationsTab             (Tab 9)
// ============================================================================

import { useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { useAutoSave } from '../../../lib/hooks/useAutoSave.js';
import { patchJobCardTab } from '../../../lib/api/jobCards.js';
import { TabSaveBar } from '../components/TabSaveBar.jsx';
import {
  JOB_TYPE_OPTIONS, REPAIR_TYPE_OPTIONS,
  AWAITING_STATUS_OPTIONS, AWAITING_REPAIR_STATUS_OPTIONS, JOB_STATUS_DISPLAY_OPTIONS,
  JOB_TYPE_LABELS, REPAIR_TYPE_LABELS,
  AWAITING_STATUS_LABELS, JOB_STATUS_DISPLAY_LABELS,
  REPAIR_STATUS_LABELS,
} from '../../../lib/schemas/jobCardSchemas.js';

// ── Date-bug fix: ISO-timestamp → YYYY-MM-DD truncation ──
// The detail service returns these two fields as ISO timestamps with
// time component (e.g. "2026-05-19T10:30:00.000Z"), but the FE renders
// them in <input type="date"> which only accepts "YYYY-MM-DD". Without
// truncation, the browser silently zaps the value → user sees an empty
// field even though data is saved → looks like "can't be stored".
//
// We pre-process these two fields in the form `defaults` builder so the
// input renders with the correct date portion. The BE schema already
// accepts both date and datetime shapes (isoDateTimeOrEmpty regex), so
// sending YYYY-MM-DD on save is fine — the BE column is DATETIME(6) and
// MySQL upcasts the date to midnight UTC.
const DATETIME_FIELDS_AS_DATE = new Set([
  'equipment_submitted_date',
  'equipment_received_date_actual',
]);

// Coerce any value the input expects to its display-safe form.
// • Empty / null   → ''  (so the input is controlled)
// • ISO timestamp  → 'YYYY-MM-DD' (so <input type="date"> shows it)
// • Anything else  → as-is
function coerceFieldForInput(fieldName, raw) {
  if (raw == null || raw === '') return '';
  if (DATETIME_FIELDS_AS_DATE.has(fieldName) && typeof raw === 'string' && raw.length >= 10) {
    return raw.slice(0, 10);          // "2026-05-19T10:30:00.000Z" → "2026-05-19"
  }
  return raw;
}

// ── Shared hook: form + auto-save wiring ───────────────────────────
// Each tab passes:
//   • jc             — the full detail payload
//   • fieldNames     — the subset of column names this tab owns
//   • canWrite       — whether form should be editable
//   • invalidateAll  — cache-buster from the orchestrator
//   • refetch        — *explicit* parent JC refetch from useJobCardDetail
//   • autoSavePref / setAutoSavePref — persisted toggle handlers
//
// STALE-DATA RACE FIX (hotfix 2026-05-19):
//   Previously the save handlers called only invalidateAll(), which
//   clears the cache but doesn't trigger refetch. The next refetch was
//   up to 15 s away (the polling tick), so the Mark-Complete gate panel
//   could show stale state if the user switched tabs immediately after
//   saving observations. We now call refetch() right after the PATCH
//   resolves so the parent jc payload is fresh before the user can
//   re-render any downstream tab.
function useTabForm({ jc, fieldNames, canWrite, invalidateAll, refetch, autoSavePref, setAutoSavePref }) {
  // Default values pulled from the JC detail payload. Convert null to ''
  // so the inputs are controlled (React warns otherwise). For the two
  // datetime-stored-but-rendered-as-date fields, truncate ISO timestamps
  // to YYYY-MM-DD so <input type="date"> can display them.
  const defaults = useMemo(() => {
    const out = {};
    for (const f of fieldNames) {
      out[f] = coerceFieldForInput(f, jc[f]);
    }
    return out;
  }, [jc, fieldNames]);

  const {
    register, handleSubmit, watch, formState: { isDirty, dirtyFields, isSubmitting },
    reset,
  } = useForm({ defaultValues: defaults });

  // When the JC payload refetches (after auto-save), the form must reset
  // to the new server-side baseline so isDirty/dirtyFields recalibrate.
  const lastUpdatedAt = jc.updated_at;
  useMemoResetOnUpdate(reset, defaults, lastUpdatedAt);

  // Build payload of ONLY the dirty fields — what the BE PATCH needs.
  const getDirtyValues = useCallback(() => {
    const values = watch();
    const out = {};
    for (const f of fieldNames) {
      if (dirtyFields[f]) out[f] = values[f];
    }
    return out;
  }, [watch, dirtyFields, fieldNames]);

  // Auto-save hook — fires the same PATCH endpoint the manual buttons use.
  const auto = useAutoSave({
    enabled: canWrite && autoSavePref,
    getDirtyValues,
    onSave: async (values) => {
      await patchJobCardTab(jc.section_job_no, values);
      invalidateAll();
      // STALE-DATA RACE FIX: explicit refetch so the parent jc payload
      // updates IMMEDIATELY (not on the next 15-s polling tick). Without
      // this, the Mark-Complete gate panel can read stale observations_text
      // when the user switches tabs right after auto-save fires.
      if (refetch) refetch();
    },
  });

  // Manual save handler.
  const saveBusy = useRef(false);
  async function manualSave() {
    if (saveBusy.current) return;
    saveBusy.current = true;
    try {
      const values = getDirtyValues();
      if (Object.keys(values).length === 0) return;
      await patchJobCardTab(jc.section_job_no, values);
      invalidateAll();
      // Same race-fix as auto-save above.
      if (refetch) refetch();
    } finally {
      saveBusy.current = false;
    }
  }

  // Wrap register so we can pipe onChange into auto.tick(). The user
  // types → tick → debounced auto-save kicks in 1.5s later.
  function registerField(name, opts) {
    const r = register(name, opts);
    const origOnChange = r.onChange;
    return {
      ...r,
      onChange: (e) => {
        origOnChange(e);
        auto.tick();
      },
    };
  }

  return {
    registerField, isDirty, isSubmitting, watch,
    auto,
    handleSave: handleSubmit(manualSave),
    saveBar: (
      <TabSaveBar
        saving={isSubmitting}
        dirty={isDirty}
        onSave={handleSubmit(manualSave)}
        autoSaveStatus={auto.status}
        lastSavedAt={auto.lastSavedAt}
        consecutiveFails={auto.consecutiveFails}
        autoSavePref={autoSavePref}
        onTogglePref={() => setAutoSavePref(!autoSavePref)}
        disabled={!canWrite}
        disabledReason={!canWrite
          ? (jc._flags?.is_legacy
              ? 'Legacy job card — read-only'
              : (jc.status === 'ASSIGNED'
                  ? 'Call Start Work first to enable editing'
                  : `Cannot save: status is ${jc.status}`))
          : null}
      />
    ),
  };
}

// Tiny helper — force RHF to reset its baseline when the server-side
// updated_at changes (i.e. after a successful save invalidates + refetches
// the JC). Avoids the form staying "dirty" forever after a save.
import { useEffect } from 'react';
function useMemoResetOnUpdate(reset, defaults, lastUpdatedAt) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reset(defaults); }, [lastUpdatedAt]);
}

// ── Reusable layouts ────────────────────────────────────────────────
function Label({ htmlFor, children }) {
  return <label htmlFor={htmlFor} className="block text-xs font-medium text-ink mb-1">{children}</label>;
}

function Help({ children }) {
  return <p className="text-xs text-ink-soft mt-1">{children}</p>;
}

// ============================================================================
//  TAB 1 — Plug In / Accessories  (image 13)
// ============================================================================
export function PlugInAccessoriesTab(props) {
  const FIELDS = ['plug_in_accessories'];
  const t = useTabForm({ ...props, fieldNames: FIELDS });
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="plug_in_accessories">List of Accessories Received</Label>
        <textarea
          id="plug_in_accessories"
          rows={8}
          className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-card focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          placeholder="Enter accessories received with equipment…"
          disabled={!props.canWrite}
          {...t.registerField('plug_in_accessories')}
        />
      </div>
      {t.saveBar}
    </div>
  );
}

// ============================================================================
//  TAB 2 — Submitted & Received  (image 11)
// ============================================================================
export function SubmittedReceivedTab(props) {
  const FIELDS = [
    'equipment_submitted_date', 'submitted_by',
    'equipment_received_date_actual', 'received_by',
  ];
  const t = useTabForm({ ...props, fieldNames: FIELDS });

  // For datetime fields, use type="date" — keeps UX simple. The BE accepts
  // "YYYY-MM-DD" and stores as DATETIME at midnight.
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
        <div>
          <Label htmlFor="esd">Equipment Submitted Date</Label>
          <Input id="esd" type="date" disabled={!props.canWrite}
                 {...t.registerField('equipment_submitted_date')} />
        </div>
        <div>
          <Label htmlFor="sb">Submitted By</Label>
          <Input id="sb" type="text" disabled={!props.canWrite}
                 {...t.registerField('submitted_by')} />
        </div>
        <div>
          <Label htmlFor="erda">Equipment Received Date</Label>
          <Input id="erda" type="date" disabled={!props.canWrite}
                 {...t.registerField('equipment_received_date_actual')} />
        </div>
        <div>
          <Label htmlFor="rb">Received By</Label>
          <Input id="rb" type="text" disabled={!props.canWrite}
                 {...t.registerField('received_by')} />
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

// ============================================================================
//  TAB 3 — Job Card Details  (image 10)
// ============================================================================
export function JobCardDetailsTab(props) {
  const FIELDS = [
    'instrument_received_date', 'job_complete_planned_date',
    'job_type', 'repair_type', 'job_request_remarks',
  ];
  const t = useTabForm({ ...props, fieldNames: FIELDS });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ird">Instrument Received Date</Label>
          <Input id="ird" type="date" disabled={!props.canWrite}
                 {...t.registerField('instrument_received_date')} />
        </div>
        <div>
          <Label htmlFor="jcpd">Job Complete Planned Date</Label>
          <Input id="jcpd" type="date" disabled={!props.canWrite}
                 {...t.registerField('job_complete_planned_date')} />
        </div>
        <div>
          <Label htmlFor="jt">Job Type</Label>
          <Select id="jt" disabled={!props.canWrite} {...t.registerField('job_type')}>
            <option value="">— Choose —</option>
            {JOB_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{JOB_TYPE_LABELS[v]}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="rt">Repair Type</Label>
          <Select id="rt" disabled={!props.canWrite} {...t.registerField('repair_type')}>
            <option value="">— Choose —</option>
            {REPAIR_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{REPAIR_TYPE_LABELS[v]}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="jrr">Job Request Remarks</Label>
        <textarea id="jrr" rows={4} disabled={!props.canWrite}
          className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-card focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          {...t.registerField('job_request_remarks')} />
      </div>
      {t.saveBar}
    </div>
  );
}

// ============================================================================
//  TAB 5 — Equipments Used  (image 9)
// ============================================================================
export function EquipmentsUsedTab(props) {
  const FIELDS = ['equipments_used'];
  const t = useTabForm({ ...props, fieldNames: FIELDS });
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="eu">Equipment/Tools Used for Repair</Label>
        <textarea id="eu" rows={8} disabled={!props.canWrite}
          className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-card focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          placeholder="List equipment and tools used…"
          {...t.registerField('equipments_used')} />
      </div>
      {t.saveBar}
    </div>
  );
}

// ============================================================================
//  TAB 6 — Awaiting Information (image 8) + Procurement sub-block
// ============================================================================
export function AwaitingInformationTab(props) {
  const FIELDS = [
    'awaiting_for', 'awaiting_status', 'supplier_name',
    'awaiting_from_date', 'awaiting_restarting_date', 'awaiting_clear_date', 'attended_by',
    'indent_no', 'indent_date', 'mirv_no', 'mirv_date',
    'po_no', 'po_date', 'procurement_cost',
  ];
  const t = useTabForm({ ...props, fieldNames: FIELDS });
  const isRepair = props.jc?.work_type === 'REPAIR'
    || String(props.jc?.workflow_type || '').startsWith('REPAIR');
  const awaitingOptions = isRepair ? AWAITING_REPAIR_STATUS_OPTIONS : AWAITING_STATUS_OPTIONS;
  const awaitingLabels = isRepair ? REPAIR_STATUS_LABELS : AWAITING_STATUS_LABELS;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="af">Awaiting For</Label>
          <Input id="af" disabled={!props.canWrite} {...t.registerField('awaiting_for')} />
        </div>
        <div>
          <Label htmlFor="as">Awaiting Status</Label>
          <Select id="as" disabled={!props.canWrite} {...t.registerField('awaiting_status')}>
            <option value="">— Choose —</option>
            {awaitingOptions.map((v) => <option key={v} value={v}>{awaitingLabels[v]}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="sn">Supplier&apos;s Name</Label>
          <Input id="sn" disabled={!props.canWrite} {...t.registerField('supplier_name')} />
        </div>
        <div>
          <Label htmlFor="afd">Awaiting From Date</Label>
          <Input id="afd" type="date" disabled={!props.canWrite} {...t.registerField('awaiting_from_date')} />
        </div>
        <div>
          <Label htmlFor="restart_date">Restarting Date</Label>
          <Input id="restart_date" type="date" disabled={!props.canWrite} {...t.registerField('awaiting_restarting_date')} />
        </div>
        <div>
          <Label htmlFor="acd">Awaiting Clear Date</Label>
          <Input id="acd" type="date" disabled={!props.canWrite} {...t.registerField('awaiting_clear_date')} />
        </div>
        <div>
          <Label htmlFor="ab">Attended By</Label>
          <Input id="ab" disabled={!props.canWrite} {...t.registerField('attended_by')} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-ink mb-3">Procurement Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="indent_no">Indent No.</Label>
            <Input id="indent_no" disabled={!props.canWrite} {...t.registerField('indent_no')} />
          </div>
          <div>
            <Label htmlFor="indent_date">Indent Date</Label>
            <Input id="indent_date" type="date" disabled={!props.canWrite} {...t.registerField('indent_date')} />
          </div>
          <div>
            <Label htmlFor="mirv_no">MIRV No.</Label>
            <Input id="mirv_no" disabled={!props.canWrite} {...t.registerField('mirv_no')} />
          </div>
          <div>
            <Label htmlFor="mirv_date">MIRV Date</Label>
            <Input id="mirv_date" type="date" disabled={!props.canWrite} {...t.registerField('mirv_date')} />
          </div>
          <div>
            <Label htmlFor="po_no">PO No.</Label>
            <Input id="po_no" disabled={!props.canWrite} {...t.registerField('po_no')} />
          </div>
          <div>
            <Label htmlFor="po_date">PO Date</Label>
            <Input id="po_date" type="date" disabled={!props.canWrite} {...t.registerField('po_date')} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="proc_cost">Cost (Rs.)</Label>
            <Input id="proc_cost" type="number" step="0.01" min="0" disabled={!props.canWrite}
                   {...t.registerField('procurement_cost', { valueAsNumber: false })} />
          </div>
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

// ============================================================================
//  TAB 8 — Contract / Warranty  (image 6)
// ============================================================================
export function ContractWarrantyTab(props) {
  const FIELDS = [
    'vendor_supplier_name', 'intimation_sent_on',
    'sent_to_vendor_date', 'received_from_vendor_date',
    'gate_pass_no', 'gate_pass_issued_date',
    'cost_of_component', 'labour_charges',
    'invoice_no', 'invoice_recd_on',
  ];
  const t = useTabForm({ ...props, fieldNames: FIELDS });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vsn">Vendor / Supplier&apos;s Name</Label>
          <Input id="vsn" disabled={!props.canWrite} {...t.registerField('vendor_supplier_name')} />
        </div>
        <div>
          <Label htmlFor="iso">Intimation Sent On</Label>
          <Input id="iso" type="date" disabled={!props.canWrite} {...t.registerField('intimation_sent_on')} />
        </div>
        <div>
          <Label htmlFor="stv">Sent To Vendor (1st Visit On)</Label>
          <Input id="stv" type="date" disabled={!props.canWrite} {...t.registerField('sent_to_vendor_date')} />
        </div>
        <div>
          <Label htmlFor="rfv">Received From Vendor (Completed) Date</Label>
          <Input id="rfv" type="date" disabled={!props.canWrite} {...t.registerField('received_from_vendor_date')} />
        </div>
        <div>
          <Label htmlFor="gpn">Gate Pass No.</Label>
          <Input id="gpn" disabled={!props.canWrite} {...t.registerField('gate_pass_no')} />
        </div>
        <div>
          <Label htmlFor="gpid">Gate Pass Issued Date</Label>
          <Input id="gpid" type="date" disabled={!props.canWrite} {...t.registerField('gate_pass_issued_date')} />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-ink mb-3">Cost Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="coc">Cost of Component (Rs.)</Label>
            <Input id="coc" type="number" step="0.01" min="0" disabled={!props.canWrite}
                   {...t.registerField('cost_of_component')} />
          </div>
          <div>
            <Label htmlFor="lc">Labour Charges (Rs.)</Label>
            <Input id="lc" type="number" step="0.01" min="0" disabled={!props.canWrite}
                   {...t.registerField('labour_charges')} />
          </div>
          <div>
            <Label htmlFor="invn">Invoice No.</Label>
            <Input id="invn" disabled={!props.canWrite} {...t.registerField('invoice_no')} />
          </div>
          <div>
            <Label htmlFor="invd">Invoice Recd. On</Label>
            <Input id="invd" type="date" disabled={!props.canWrite} {...t.registerField('invoice_recd_on')} />
          </div>
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}

// ============================================================================
//  TAB 9 — Observations  (image 2 + image 19 readings table)
// ============================================================================
export function ObservationsTab(props) {
  const FIELDS = ['observations_text', 'job_status_display'];
  const t = useTabForm({ ...props, fieldNames: FIELDS });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Label htmlFor="obs">Observations</Label>
          <textarea id="obs" rows={6} disabled={!props.canWrite}
            className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-card focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            placeholder="Enter observations…"
            {...t.registerField('observations_text')} />
          <Help>For numerical readings, prefer the structured readings entry below (coming Phase 9 slice 2). Plain-text observations are fine for now.</Help>
        </div>
        <div>
          <Label htmlFor="jsd">Job Status (engineer-facing label)</Label>
          <Select id="jsd" disabled={!props.canWrite} {...t.registerField('job_status_display')}>
            <option value="">— Choose —</option>
            {JOB_STATUS_DISPLAY_OPTIONS.map((v) => <option key={v} value={v}>{JOB_STATUS_DISPLAY_LABELS[v]}</option>)}
          </Select>
          <Help>This is a display label only — distinct from the system status above (Q-8 locked).</Help>
        </div>
      </div>
      {t.saveBar}
    </div>
  );
}
