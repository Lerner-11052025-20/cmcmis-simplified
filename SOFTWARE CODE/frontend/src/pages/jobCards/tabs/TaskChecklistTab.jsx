// ============================================================================
// pages/jobCards/tabs/TaskChecklistTab.jsx
// ----------------------------------------------------------------------------
// Tab 10 — Task Checklist (image 15).
//
// Engineer workflow:
//   1. Dropdown shows library tasks pre-filtered by JC's workflow_type
//      category (D-9.7). "Show all" toggle expands to cross-category.
//   2. "+ Add" copies the library task TEXT into jc_task_checklist
//      (is_custom=0, task_id populated).
//   3. "+ Add Custom Task" reveals inline text input → POST is_custom=1.
//   4. Checkbox toggles → optimistic UI (D-9.9), PATCH /tasks/:id.
//   5. Trash icon → DELETE /tasks/:id (hard delete, Q-5).
//
// Progress bar = completed / total. Used by the Mark Complete gate.
// ============================================================================

import { useMemo, useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { useJobCardTasks, invalidateJobCardTasks } from '../../../lib/hooks/useJobCardTasks.js';
import { useTaskLibrary } from '../../../lib/hooks/useTaskLibrary.js';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import {
  addJobCardTask, toggleJobCardTask, deleteJobCardTask,
} from '../../../lib/api/jobCards.js';

// Map JC's workflow_type to the task library category.
function workflowToCategory(workflowType) {
  if (!workflowType) return null;
  if (workflowType.startsWith('CALIBRATION_'))  return 'CALIBRATION';
  if (workflowType.startsWith('INSPECTION_'))   return 'INSPECTION';
  if (workflowType.startsWith('MASTER_DATA_'))  return 'MAINTENANCE';  // closest fit; spec D-9.7
  return null;
}

export function TaskChecklistTab({ jc, canWrite, invalidateAll }) {
  const { items: tasks, loading: tasksLoading, refetch: refetchTasks } = useJobCardTasks(jc.section_job_no);
  const [showAll, setShowAll] = useState(false);
  const libCategory = showAll ? null : workflowToCategory(jc.workflow_type);
  const { items: library, loading: libLoading } = useTaskLibrary(libCategory);

  const [selectedLibTaskId, setSelectedLibTaskId] = useState('');
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [busy, setBusy] = useState(false);

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
      // eslint-disable-next-line no-alert
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
      // eslint-disable-next-line no-alert
      alert('Could not add custom task: ' + (msg || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  }

  // ── Toggle completion (optimistic per D-9.9) ────────────────────
  async function handleToggle(task) {
    if (!canWrite) return;
    const desired = !task.is_completed;
    try {
      await toggleJobCardTask(jc.section_job_no, task.id, desired);
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      // eslint-disable-next-line no-alert
      alert('Could not toggle task: ' + (msg || 'Unknown error'));
    }
  }

  // ── Delete task ─────────────────────────────────────────────────
  async function handleDelete(task) {
    if (!canWrite) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete task: "${task.task_text.slice(0, 60)}…"? This cannot be undone.`)) return;
    try {
      await deleteJobCardTask(jc.section_job_no, task.id);
      invalidateJobCardTasks(jc.section_job_no);
      refetchTasks();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      // eslint-disable-next-line no-alert
      alert('Could not delete task: ' + (msg || 'Unknown error'));
    }
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
          <label className="text-xs text-ink-soft flex items-center gap-1">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show all categories
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedLibTaskId}
            onChange={(e) => setSelectedLibTaskId(e.target.value)}
            disabled={!canWrite || busy || libLoading}
            className="flex-1"
          >
            <option value="">{libLoading ? 'Loading…' : 'Select a standard task…'}</option>
            {(library || []).map((t) => (
              <option key={t.id} value={t.id}>
                {showAll ? `[${t.category[0]}] ` : ''}{t.task_text}
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
            {jc.workflow_type && workflowToCategory(jc.workflow_type) ? workflowToCategory(jc.workflow_type)[0] + workflowToCategory(jc.workflow_type).slice(1).toLowerCase() + ' Tasks' : 'Tasks'} ({totalCount})
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
                <span className={'flex-1 text-sm ' + (t.is_completed ? 'text-ink-soft line-through' : 'text-ink')}>
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
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
