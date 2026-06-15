import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, ChevronDown, ChevronUp, Edit2, Trash2, X, Check, Info, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

import {
  fetchChecklists,
  fetchChecklistTaskMaster,
  resolveChecklistEquipment,
  createChecklist,
  updateChecklist,
  deleteChecklist,
} from '../../../lib/api/checklists.js';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { ModalPortal } from '../../../components/ui/ModalPortal.jsx';
import { formatIstDate } from '../../../lib/time.js';

const TASK_TYPES = ['NABL', 'NON-NABL', 'BOTH'];

function taskMasterLabel(task) {
  return `${task.id} ${task.name}`;
}

function emptyForm() {
  return {
    id: null,
    equipment_code: '',
    checklist_name: '',
    tasks: [],
    is_active: true,
  };
}

export function ChecklistManagement() {
  const [items, setItems] = useState([]);
  const [taskMaster, setTaskMaster] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [checklists, master] = await Promise.all([
        fetchChecklists({ q: search.trim() }),
        fetchChecklistTaskMaster({ limit: 5000 }),
      ]);
      setItems(checklists || []);
      setTaskMaster(master || []);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    const equipmentCount = new Set(items.map((item) => `${item.equipment_type}-${item.equipment_id}`)).size;
    const taskCount = items.reduce((sum, item) => sum + Number(item.task_count || 0), 0);
    return { total: items.length, equipmentCount, taskCount };
  }, [items]);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setModalOpen(true);
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete checklist "${item.checklist_name}"?`)) return;
    try {
      await deleteChecklist(item.id);
      toast.success('Checklist deleted');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not delete checklist');
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Checklist Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage calibration checklists linked to specific equipment.
          </p>
        </div>
        <Button variant="primary" onClick={openNew} className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold shadow-sm hover:bg-indigo-700">
          <Plus size={18} />
          New Checklist
        </Button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
        className="relative max-w-md"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or equipment ID..."
          className="h-12 rounded-xl border-slate-300 pl-12 text-sm"
        />
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Checklists" value={kpis.total} />
        <MetricCard label="Equipment Covered" value={kpis.equipmentCount} accent="text-indigo-600" />
        <MetricCard label="Total Tasks Defined" value={kpis.taskCount} accent="text-emerald-600" />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Spinner className="mx-auto" />
          <p className="mt-3 text-sm font-medium text-slate-500">Loading checklists...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">No checklists found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ChecklistCard
              key={item.id}
              item={item}
              expanded={expanded === item.id}
              onToggle={() => setExpanded((current) => current === item.id ? null : item.id)}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {modalOpen ? (
        <ChecklistModal
          initial={editing}
          taskMaster={taskMaster}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, accent = 'text-slate-950' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={clsx('mt-4 text-2xl font-semibold tabular-nums', accent)}>{value}</p>
    </div>
  );
}

function ChecklistCard({ item, expanded, onToggle, onEdit, onDelete }) {
  const tasks = item.tasks || [];
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.checklist_code}</span>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
              {Number(item.task_count || tasks.length)} tasks
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-950">{item.checklist_name}</h2>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {item.equipment_code} <span className="text-slate-400">-</span> {item.equipment_name || 'Equipment'}{' '}
            <span className="mx-3 text-slate-300">|</span> Model: {item.equipment_model_no || '-'}{' '}
            <span className="mx-3 text-slate-300">|</span> Created: {formatIstDate(item.created_at)} by {item.created_by_employee_id || '-'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <button type="button" onClick={onToggle} className="rounded-xl p-2 hover:bg-slate-100 hover:text-slate-700" title={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          <button type="button" onClick={onEdit} className="rounded-xl p-2 hover:bg-slate-100 hover:text-indigo-600" title="Edit checklist">
            <Edit2 size={20} />
          </button>
          <button type="button" onClick={onDelete} className="rounded-xl p-2 hover:bg-red-50 hover:text-red-600" title="Delete checklist">
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/70 p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Task List</p>
          {(item.tasks || []).length ? (
            <ol className="space-y-3">
              {item.tasks.map((task, index) => (
                <TaskLine key={task.id || `${task.task_text}-${index}`} task={task} index={index} />
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">Open edit to load task rows for this checklist.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function TaskLine({ task, index, onRemove, onTypeChange }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">
        {task.task_text}
        {task.is_custom ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Custom</span> : null}
      </span>
      {onTypeChange ? (
        <select
          value={task.task_type || 'NABL'}
          onChange={(event) => onTypeChange(event.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
        >
          {TASK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      ) : (
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">{task.task_type || 'NABL'}</span>
      )}
      {onRemove ? (
        <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
          <X size={18} />
        </button>
      ) : null}
    </li>
  );
}

function ChecklistModal({ initial, taskMaster, onClose, onSaved }) {
  const [form, setForm] = useState(() => initial ? {
    id: initial.id,
    equipment_code: initial.equipment_code || '',
    checklist_name: initial.checklist_name || '',
    tasks: [],
    is_active: initial.is_active !== 0,
  } : emptyForm());
  const [equipment, setEquipment] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customType, setCustomType] = useState('NABL');
  const [saving, setSaving] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setEquipment({
      equipment_code: initial.equipment_code,
      equipment_name: initial.equipment_name,
      equipment_model_no: initial.equipment_model_no,
      equipment_serial_no: initial.equipment_serial_no,
      equipment_make: initial.equipment_make,
      equipment_division: initial.equipment_division,
      equipment_category: initial.equipment_category,
    });
    setForm((current) => ({ ...current, tasks: initial.tasks || [] }));
  }, [initial]);

  async function resolveEquipment() {
    const code = form.equipment_code.trim();
    if (!code) return;
    setLoadingEquipment(true);
    try {
      const item = await resolveChecklistEquipment(code);
      setEquipment(item);
      setForm((current) => ({ ...current, equipment_code: item.equipment_code || code }));
    } catch (err) {
      setEquipment(null);
      toast.error(err?.response?.data?.error?.message || 'Equipment not found');
    } finally {
      setLoadingEquipment(false);
    }
  }

  function addMasterTask() {
    const task = taskMaster.find((item) => String(item.id) === String(selectedTaskId));
    if (!task) return;
    setForm((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          task_id: task.id,
          task_text: task.name,
          task_type: 'NABL',
          is_custom: false,
        },
      ],
    }));
    setSelectedTaskId('');
  }

  function addCustomTask() {
    const clean = customText.trim();
    if (clean.length < 3) return;
    setForm((current) => ({
      ...current,
      tasks: [...current.tasks, { task_id: null, task_text: clean, task_type: customType, is_custom: true }],
    }));
    setCustomText('');
    setCustomType('NABL');
    setCustomOpen(false);
  }

  async function save() {
    if (!equipment) {
      toast.error('Please enter and resolve a valid Equipment ID');
      return;
    }
    if (form.checklist_name.trim().length < 3) {
      toast.error('Checklist name is required');
      return;
    }
    if (form.tasks.length === 0) {
      toast.error('Add at least one task');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        equipment_code: form.equipment_code,
        checklist_name: form.checklist_name.trim(),
        is_active: form.is_active,
        tasks: form.tasks.map((task) => ({
          task_id: task.task_id || null,
          task_text: task.task_text,
          task_type: task.task_type || 'NABL',
          is_custom: !!task.is_custom,
        })),
      };
      if (form.id) {
        await updateChecklist(form.id, payload);
        toast.success('Checklist updated');
      } else {
        await createChecklist(payload);
        toast.success('Checklist created');
      }
      await onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not save checklist');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6 shrink-0">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <ClipboardList size={24} />
              </span>
              <h2 className="text-2xl font-semibold text-slate-950">{form.id ? 'Edit Checklist' : 'New Checklist'}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={28} />
            </button>
          </div>

          <div className="space-y-6 px-8 py-7 overflow-y-auto flex-1 min-h-0">
            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
              <div className="mb-4 flex items-center gap-2 text-indigo-700">
                <Info size={20} />
                <h3 className="text-base font-semibold text-indigo-700">Equipment</h3>
              </div>
              <label className="text-sm font-semibold text-slate-700">Equipment ID <span className="text-red-500">*</span></label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={form.equipment_code}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, equipment_code: event.target.value }));
                    setEquipment(null);
                  }}
                  onBlur={resolveEquipment}
                  placeholder="e.g. EQ-SA-9000"
                  className="h-12 rounded-xl border-slate-300 bg-white text-sm"
                />
                <Button type="button" variant="secondary" onClick={resolveEquipment} disabled={loadingEquipment || !form.equipment_code.trim()} className="h-12 rounded-xl">
                  {loadingEquipment ? <Spinner size={16} /> : 'Fetch'}
                </Button>
              </div>

              {equipment ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoPair label="Equipment Name" value={equipment.equipment_name} strong />
                  <InfoPair label="Model No." value={equipment.equipment_model_no} />
                  <InfoPair label="Serial No." value={equipment.equipment_serial_no} />
                  <InfoPair label="Division" value={equipment.equipment_division} />
                  <InfoPair label="Manufacturer" value={equipment.equipment_make} />
                  <InfoPair label="Category" value={equipment.equipment_category} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Enter an equipment ID and fetch details to auto-fill equipment information.</p>
              )}
            </section>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Checklist Name <span className="text-red-500">*</span></span>
              <Input
                value={form.checklist_name}
                onChange={(event) => setForm((current) => ({ ...current, checklist_name: event.target.value }))}
                placeholder="e.g. Spectrum Analyzer Full Calibration"
                className="mt-2 h-12 rounded-xl border-slate-300 text-sm"
              />
            </label>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Tasks <span className="text-red-500">*</span></h3>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-600">Add from Task Library</p>
                <div className="flex gap-3">
                  <select
                    value={selectedTaskId}
                    onChange={(event) => setSelectedTaskId(event.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select a task from master library...</option>
                    {taskMaster.map((task) => (
                      <option key={task.id} value={task.id}>{taskMasterLabel(task)}</option>
                    ))}
                  </select>
                  <Button type="button" variant="primary" onClick={addMasterTask} disabled={!selectedTaskId} className="h-12 rounded-xl">
                    <Plus size={18} />
                    Add
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70">
                {!customOpen ? (
                  <button type="button" onClick={() => setCustomOpen(true)} className="flex w-full items-center gap-2 px-5 py-4 text-left text-base font-semibold text-emerald-700">
                    <Plus size={20} />
                    Add Custom Task
                  </button>
                ) : (
                  <div className="space-y-4 p-4">
                    <Input
                      value={customText}
                      onChange={(event) => setCustomText(event.target.value)}
                      placeholder="Custom task description..."
                      className="h-12 rounded-xl border-slate-950 bg-white text-sm"
                      autoFocus
                    />
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-sm font-semibold text-slate-700">Task Type:</span>
                      {TASK_TYPES.map((type) => (
                        <label key={type} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <input type="radio" checked={customType === type} onChange={() => setCustomType(type)} />
                          {type}
                        </label>
                      ))}
                      <Button type="button" variant="primary" onClick={addCustomTask} disabled={customText.trim().length < 3} className="ml-auto h-10 rounded-xl">
                        <Check size={16} />
                        Add
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setCustomOpen(false)} className="h-10 rounded-xl">
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {form.tasks.length ? (
                <ol className="space-y-3">
                  {form.tasks.map((task, index) => (
                    <TaskLine
                      key={`${task.task_id || 'custom'}-${task.task_text}-${index}`}
                      task={task}
                      index={index}
                      onTypeChange={(value) => setForm((current) => ({
                        ...current,
                        tasks: current.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, task_type: value } : item),
                      }))}
                      onRemove={() => setForm((current) => ({
                        ...current,
                        tasks: current.tasks.filter((_, itemIndex) => itemIndex !== index),
                      }))}
                    />
                  ))}
                </ol>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                  <ListChecks className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-sm font-medium text-slate-400">No tasks added yet. Add from the library or create custom tasks.</p>
                </div>
              )}
              <p className="text-sm text-slate-400">{form.tasks.length} tasks in checklist</p>
            </section>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-8 py-5 shrink-0">
            <Button type="button" variant="secondary" onClick={onClose} className="h-11 rounded-xl px-5">Cancel</Button>
            <Button type="button" variant="primary" onClick={save} disabled={saving} className="h-11 rounded-xl bg-indigo-600 px-6 hover:bg-indigo-700">
              {saving ? <Spinner size={16} /> : <Check size={18} />}
              {form.id ? 'Update Checklist' : 'Create Checklist'}
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function InfoPair({ label, value, strong }) {
  return (
    <div>
      <p className="text-sm font-semibold text-indigo-600">{label}</p>
      <p className={clsx('mt-1 text-sm text-slate-700', strong && 'font-semibold text-slate-950')}>{value || '-'}</p>
    </div>
  );
}
