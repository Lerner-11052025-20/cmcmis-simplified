// ============================================================================
// pages/jobCards/tabs/TaskChecklistTab.jsx
// ----------------------------------------------------------------------------
// Tab 10 — Task Checklist (image 15).
//
// Calibration / Calibration Department Workflow:
//   1. Dropdown shows library tasks from cmms_task_mst (D-9.7).
//   2. "+ Add" copies the library task TEXT into jc_calibration_task_checklist.
//   3. "+ Add Custom Task" reveals inline text input.
//   4. Radio buttons: NABL Task, NON-NABL Task, BOTH NABL & NON-NABL.
//   5. Result Buttons: Pass (Green), Fail (Red), Functional Test (Blue), Not Carried Out (Gray).
//   6. Completed states have specialized background colors, badge indicators, and line-through styles.
//   7. Blue Edit button next to completed tasks reverts completion.
//
// Non-Calibration Workflow (Standard):
//   Acts as a standard checklist with standard checklist mechanics.
// ============================================================================

import { useMemo, useState, useEffect } from 'react';
import { Plus, Trash2, Check, FileText, ClipboardList } from 'lucide-react';
import { useJobCardTasks, invalidateJobCardTasks } from '../../../lib/hooks/useJobCardTasks.js';
import { useTaskLibrary } from '../../../lib/hooks/useTaskLibrary.js';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import {
  addJobCardTask, toggleJobCardTask, deleteJobCardTask,
} from '../../../lib/api/jobCards.js';
import { applyChecklistToJobCard, fetchChecklistsForEquipment } from '../../../lib/api/checklists.js';

// Map JC's workflow_type to the task library category.
function workflowToCategory(workflowType) {
  if (!workflowType) return null;
  if (workflowType.startsWith('CALIBRATION_'))  return 'CALIBRATION';
  if (workflowType.startsWith('INSPECTION_'))   return 'INSPECTION';
  if (workflowType.startsWith('MASTER_DATA_'))  return 'MAINTENANCE';  // closest fit; spec D-9.7
  return null;
}

export function TaskChecklistTab({ jc, canWrite, invalidateAll }) {
  const isCalibration = jc.work_type === 'CALIBRATION'
    || jc.workflow_type === 'CALIBRATION_STANDARD'
    || jc.workflow_type === 'CALIBRATION_PRECISION';

  const { items: tasks, loading: tasksLoading, refetch: refetchTasks } = useJobCardTasks(jc.section_job_no);
  const [showAll, setShowAll] = useState(false);
  const libCategory = showAll ? null : workflowToCategory(jc.workflow_type);
  const { items: library, loading: libLoading } = useTaskLibrary(libCategory);

  const [selectedLibTaskId, setSelectedLibTaskId] = useState('');
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [busy, setBusy] = useState(false);
  const [availableChecklists, setAvailableChecklists] = useState([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [selectedChecklistId, setSelectedChecklistId] = useState('');

  // Calibration checklist state
  const [selectedTypes, setSelectedTypes] = useState({}); // task.id -> 'NABL' | 'NON-NABL' | 'BOTH'
  const [warnings, setWarnings] = useState({}); // task.id -> string

  // Initialize selected types when tasks load
  useEffect(() => {
    if (tasks && isCalibration) {
      const types = {};
      for (const t of tasks) {
        if (t.task_type) {
          types[t.id] = t.task_type;
        }
      }
      setSelectedTypes(types);
    }
  }, [tasks, isCalibration]);

  useEffect(() => {
    if (!isCalibration || !jc.equipment?.type || !jc.equipment?.id) return;
    const ctrl = new AbortController();
    setChecklistsLoading(true);
    fetchChecklistsForEquipment(jc.equipment.type, jc.equipment.id, ctrl.signal)
      .then((items) => setAvailableChecklists(items || []))
      .catch((e) => {
        if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return;
        setAvailableChecklists([]);
      })
      .finally(() => setChecklistsLoading(false));
    return () => ctrl.abort();
  }, [isCalibration, jc.equipment?.type, jc.equipment?.id]);

  const completedCount = useMemo(() => (tasks || []).filter((t) => t.is_completed).length, [tasks]);
  const totalCount = tasks?.length || 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── Add library task ────────────────────────────────────────────
  async function handleAddLibrary() {
    if (!selectedLibTaskId) return;
    setBusy(true);
    try {
      await addJobCardTask(jc.section_job_no, { task_id: Number(selectedLibTaskId) });
      setSelectedLibTaskId('');
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      alert('Could not add task: ' + (msg || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  }

  // ── Add custom task ─────────────────────────────────────────────
  async function handleAddCustom() {
    const t = customText.trim();
    if (t.length < 3) return;
    setBusy(true);
    try {
      await addJobCardTask(jc.section_job_no, { task_text: t, is_custom: true });
      setCustomText('');
      setShowCustomInput(false);
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      alert('Could not add custom task: ' + (msg || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  }

  // ── Toggle completion (Standard Flow) ───────────────────────────
  async function handleToggle(task) {
    if (!canWrite) return;
    const desired = !task.is_completed;
    try {
      await toggleJobCardTask(jc.section_job_no, task.id, desired);
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      alert('Could not toggle task: ' + (msg || 'Unknown error'));
    }
  }

  // ── Save Calibration Task Result ────────────────────────────────
  async function handleSaveCalibrationResult(task, result) {
    if (!canWrite) return;
    const type = selectedTypes[task.id];
    if (!type) {
      setWarnings((prev) => ({ ...prev, [task.id]: 'Please select NABL, NON-NABL or BOTH option.' }));
      return;
    }
    setWarnings((prev) => ({ ...prev, [task.id]: null }));
    setBusy(true);
    try {
      await toggleJobCardTask(jc.section_job_no, task.id, {
        is_completed: true,
        task_type: type,
        task_result: result,
      });
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      alert('Could not save task result: ' + (msg || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  }

  // ── Edit/Reopen Calibration Task ────────────────────────────────
  async function handleReopenCalibration(task) {
    if (!canWrite) return;
    try {
      await toggleJobCardTask(jc.section_job_no, task.id, {
        is_completed: false,
        task_type: task.task_type,
        task_result: task.task_result,
      });
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      alert('Could not reopen task: ' + (msg || 'Unknown error'));
    }
  }

  // ── Delete task ─────────────────────────────────────────────────
  async function handleDelete(task) {
    if (!canWrite) return;
    if (!window.confirm(`Delete task: "${task.task_text.slice(0, 60)}…"? This cannot be undone.`)) return;
    try {
      await deleteJobCardTask(jc.section_job_no, task.id);
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      alert('Could not delete task: ' + (msg || 'Unknown error'));
    }
  }

  async function handleApplyChecklist() {
    if (!selectedChecklistId || !canWrite) return;
    const hasExisting = totalCount > 0;
    if (hasExisting && !window.confirm('This will add all tasks from the selected checklist to the current task list. Continue?')) {
      return;
    }
    setBusy(true);
    try {
      await applyChecklistToJobCard(jc.section_job_no, Number(selectedChecklistId));
      setSelectedChecklistId('');
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      alert('Could not apply checklist: ' + (msg || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  }

  // Calibration Task Row Rendering
  function renderCalibrationRow(t, i) {
    const isCompleted = !!t.is_completed;
    const taskType = selectedTypes[t.id] || t.task_type || '';

    // Badges classes & styles
    const typeBadge = (() => {
      const type = t.task_type;
      if (type === 'NABL') {
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded shadow-sm border border-blue-200">NABL</span>;
      }
      if (type === 'NON-NABL') {
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded shadow-sm border border-purple-200">NON-NABL</span>;
      }
      if (type === 'BOTH') {
        return <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded shadow-sm border border-indigo-200">BOTH NABL & NON-NABL</span>;
      }
      return null;
    })();

    const resultBadge = (() => {
      const res = t.task_result;
      if (res === 'PASS') {
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded shadow-sm border border-emerald-200">PASS</span>;
      }
      if (res === 'FAIL') {
        return <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded shadow-sm border border-red-200">FAIL</span>;
      }
      if (res === 'Functional Test') {
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded shadow-sm border border-blue-200">Functional Test</span>;
      }
      if (res === 'Not Carried Out') {
        return <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-0.5 rounded shadow-sm border border-gray-200">Not Carried Out</span>;
      }
      return null;
    })();

    if (isCompleted) {
      // Completed row visual states
      let rowClass = 'border-border bg-white';
      let textClass = 'text-ink';
      if (t.task_result === 'PASS') {
        rowClass = 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/60';
        textClass = 'text-ink';
      } else if (t.task_result === 'FAIL') {
        rowClass = 'border-red-200 bg-red-50/40 hover:bg-red-50/60';
        textClass = 'text-red-700 font-semibold';
      } else if (t.task_result === 'Functional Test') {
        rowClass = 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/60';
        textClass = 'text-blue-700 font-medium';
      } else if (t.task_result === 'Not Carried Out') {
        rowClass = 'border-gray-200 bg-gray-50/40 hover:bg-gray-50/60';
        textClass = 'text-ink-soft';
      }

      return (
        <li key={t.id} className={`flex items-center gap-3 rounded-lg border p-3.5 transition-colors shadow-sm ${rowClass}`}>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base border border-border text-xs font-semibold text-ink-soft">{i + 1}</span>
          <span className={`flex-1 text-sm ${textClass}`}>
            {t.task_text}
            {t.is_custom ? <span className="ml-2 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">Custom</span> : null}
          </span>
          <div className="flex items-center gap-2 mr-2">
            {typeBadge}
            {resultBadge}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleReopenCalibration(t)}
              disabled={!canWrite || busy}
              aria-label="Edit result"
              title="Edit Task Result"
              className="p-1.5 rounded text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors"
            >
              <FileText size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(t)}
              disabled={!canWrite || busy}
              aria-label="Delete task"
              title="Delete Task"
              className="p-1.5 rounded text-ink-soft hover:text-danger disabled:opacity-30 transition-colors"
            >
              <Trash2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        </li>
      );
    }

    // In-Progress / Uncompleted Row with radio selectors and results buttons
    return (
      <li key={t.id} className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-sm hover:border-accent/40 transition-colors">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base border border-border text-xs font-semibold text-ink-soft shrink-0 mt-0.5">{i + 1}</span>
          <span className="flex-1 text-sm font-medium text-ink">
            {t.task_text}
            {t.is_custom ? <span className="ml-2 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">Custom</span> : null}
          </span>
          <button
            type="button"
            onClick={() => handleDelete(t)}
            disabled={!canWrite || busy}
            aria-label="Delete task"
            title="Delete Task"
            className="p-1.5 rounded text-ink-soft hover:text-danger disabled:opacity-30 transition-colors shrink-0"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Dynamic Warning Message */}
        {warnings[t.id] && (
          <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded">
            ⚠️ {warnings[t.id]}
          </div>
        )}

        <div className="border-t border-dashed border-border/80 pt-3 flex flex-col gap-3">
          {/* Radio Buttons for Task Type */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span className="font-semibold text-ink-soft">Task Type:</span>
            <label className="flex items-center gap-2 font-medium text-ink cursor-pointer">
              <input
                type="radio"
                name={`task_type_${t.id}`}
                value="NABL"
                checked={taskType === 'NABL'}
                disabled={!canWrite}
                onChange={() => setSelectedTypes((prev) => ({ ...prev, [t.id]: 'NABL' }))}
                className="w-4 h-4 text-purple-600 border-border focus:ring-purple-500 cursor-pointer"
              />
              NABL Task
            </label>
            <label className="flex items-center gap-2 font-medium text-ink cursor-pointer">
              <input
                type="radio"
                name={`task_type_${t.id}`}
                value="NON-NABL"
                checked={taskType === 'NON-NABL'}
                disabled={!canWrite}
                onChange={() => setSelectedTypes((prev) => ({ ...prev, [t.id]: 'NON-NABL' }))}
                className="w-4 h-4 text-purple-600 border-border focus:ring-purple-500 cursor-pointer"
              />
              NON-NABL Task
            </label>
            <label className="flex items-center gap-2 font-medium text-ink cursor-pointer">
              <input
                type="radio"
                name={`task_type_${t.id}`}
                value="BOTH"
                checked={taskType === 'BOTH'}
                disabled={!canWrite}
                onChange={() => setSelectedTypes((prev) => ({ ...prev, [t.id]: 'BOTH' }))}
                className="w-4 h-4 text-purple-600 border-border focus:ring-purple-500 cursor-pointer"
              />
              BOTH NABL & NON-NABL Task
            </label>
          </div>

          {/* Action buttons for Results */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-ink-soft mr-2">Task Result:</span>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => handleSaveCalibrationResult(t, 'PASS')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Pass
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => handleSaveCalibrationResult(t, 'FAIL')}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Fail
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => handleSaveCalibrationResult(t, 'Functional Test')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Functional Test
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => handleSaveCalibrationResult(t, 'Not Carried Out')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-1.5 px-3 rounded shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Not Carried Out
            </button>
          </div>
        </div>
      </li>
    );
  }

  if (isCalibration) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Task Checklist</h2>
          <p className="mt-2 text-sm text-slate-600">
            Select a checklist configured for this equipment. Tasks and their types will be loaded automatically.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-indigo-700">
            <ClipboardList size={22} />
            <span className="text-base font-semibold text-indigo-900">Select Checklist</span>
            <span className="text-sm font-medium text-indigo-700">
              filtered for Equipment: {jc.equipment?.type || '-'}-{jc.equipment?.id || '-'}
            </span>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Select
              value={selectedChecklistId}
              onChange={(e) => setSelectedChecklistId(e.target.value)}
              disabled={!canWrite || busy || checklistsLoading}
              className="h-12 flex-1 rounded-xl border-blue-300 bg-white text-sm"
            >
              <option value="">{checklistsLoading ? 'Loading checklists...' : '- Select a checklist -'}</option>
              {availableChecklists.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.checklist_name} ({Number(item.task_count || 0)} tasks)
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="primary"
              onClick={handleApplyChecklist}
              disabled={!canWrite || !selectedChecklistId || busy}
              className="h-12 rounded-xl bg-indigo-600 px-5 hover:bg-indigo-700"
            >
              <Plus size={16} />
              Add Checklist Tasks
            </Button>
          </div>
          {!checklistsLoading && availableChecklists.length === 0 ? (
            <p className="mt-3 text-sm font-medium text-slate-500">
              No checklist has been configured for this equipment yet.
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="mb-3 text-base font-semibold text-slate-700">
            Calibration Tasks ({totalCount})
          </h3>
          {tasksLoading && !tasks ? (
            <div className="text-sm text-slate-500">Loading tasks...</div>
          ) : totalCount === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-base font-medium text-slate-500">No checklist selected</p>
              <p className="mt-2 text-sm text-slate-400">Select a checklist above to load the task list for this equipment.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {tasks.map((t, i) => renderCalibrationRow(t, i))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Task Checklist</h2>
        <p className="text-xs text-ink-soft mt-0.5">
          Build your {jc.workflow_type ? workflowToCategory(jc.workflow_type)?.toLowerCase() : ''} workflow by adding tasks from the library or creating custom ones.
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <div>
            <span className="font-semibold text-ink">Progress</span>
            <span className="text-ink-soft ml-2">{completedCount} of {totalCount} tasks completed</span>
          </div>
          <div className="text-accent font-semibold text-lg">{progressPct}%</div>
        </div>
        <div className="w-full bg-base-elev rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 h-2 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Add from library */}
      <div className="rounded-lg border border-border bg-base p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">📋 Add from Task Library</span>
          {!isCalibration && (
            <label className="text-xs text-ink-soft flex items-center gap-1">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Show all categories
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedLibTaskId}
            onChange={(e) => setSelectedLibTaskId(e.target.value)}
            disabled={!canWrite || busy || libLoading}
            className="flex-1"
          >
            <option value="">{libLoading ? 'Loading…' : isCalibration ? 'Select a standard calibration task…' : 'Select a standard task…'}</option>
            {(library || []).map((t) => (
              <option key={t.id} value={t.id}>
                {!isCalibration && showAll ? `[${t.category[0]}] ` : ''}{t.task_text}
              </option>
            ))}
          </Select>
          <Button variant="primary" size="md" onClick={handleAddLibrary} disabled={!canWrite || !selectedLibTaskId || busy}>
            <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
            Add
          </Button>
        </div>
      </div>

      {/* Add custom */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => canWrite && setShowCustomInput(true)}
            disabled={!canWrite}
            className="w-full text-sm text-emerald-700 font-medium hover:text-emerald-900 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
            Add Custom Task (for specific equipment requirements)
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Describe the custom task…"
              autoFocus
              className="flex-1"
              maxLength={500}
            />
            <Button variant="primary" size="md" onClick={handleAddCustom} disabled={busy || customText.trim().length < 3}>
              Save
            </Button>
            <Button variant="secondary" size="md" onClick={() => { setCustomText(''); setShowCustomInput(false); }}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Task list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-ink">
            {isCalibration ? 'Calibration Tasks' : jc.workflow_type && workflowToCategory(jc.workflow_type) ? workflowToCategory(jc.workflow_type)[0] + workflowToCategory(jc.workflow_type).slice(1).toLowerCase() + ' Tasks' : 'Tasks'} ({totalCount})
          </h3>
        </div>
        {tasksLoading && !tasks ? (
          <div className="text-xs text-ink-soft">Loading tasks…</div>
        ) : totalCount === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-ink-soft">
            No tasks yet. Add from the library or create a custom task above.
          </div>
        ) : (
          <ol className="space-y-2">
            {tasks.map((t, i) => (
              isCalibration ? renderCalibrationRow(t, i) : (
                <li
                  key={t.id}
                  className={
                    'flex items-center gap-3 rounded-lg border p-2.5 transition-colors '
                    + (t.is_completed ? 'border-emerald-200 bg-emerald-50/40' : 'border-border bg-white')
                  }
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base text-xs text-ink-soft">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(t)}
                    disabled={!canWrite}
                    aria-label={t.is_completed ? 'Mark task as incomplete' : 'Mark task as complete'}
                    className={
                      'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors '
                      + (t.is_completed
                        ? 'bg-violet-500 border-violet-500 text-white'
                        : 'border-border bg-white hover:border-accent')
                    }
                  >
                    {t.is_completed ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
                  </button>
                  <span className={'flex-1 text-sm ' + (t.is_completed ? 'text-ink-soft' : 'text-ink')}>
                    {t.task_text}
                    {t.is_custom ? <span className="ml-2 text-xs text-emerald-700">[custom]</span> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(t)}
                    disabled={!canWrite}
                    aria-label="Delete task"
                    className="p-1.5 text-ink-soft hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </li>
              )
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
