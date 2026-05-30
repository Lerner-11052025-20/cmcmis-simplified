// ============================================================================
// src/pages/admin/terms/TermsManagement.jsx  —  Super Admin dynamic T&C CRUD
// ----------------------------------------------------------------------------
// Overhauled highly professional, business-oriented, and minimalist dashboard.
// Features:
//   - Three local KPI cards at the top (Total Items, Active Items, Schema Integrity).
//   - A clean dynamic data table mapping indices, reorder arrows, text statements,
//     emerald status badges, and action buttons.
//   - A cohesive side panel for creating/editing terms with pristine styling.
//   - Visual compliance with other CMCMIS ISRO SAC admin layout structures.
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import {
  ScrollText, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Check, X, AlertCircle, RefreshCw, Shield, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Checkbox } from '../../../components/ui/Checkbox.jsx';
import { DataTable } from '../../../components/DataTable.jsx';
import {
  fetchAllTerms, createTerm, updateTerm, deleteTerm
} from '../../../lib/api/terms.js';

// ── Custom Local KPI Card (Matches Admin Style) ──────────────────────
function LocalKpiCard({ label, value, icon: Icon, accent, subtitle, loading }) {
  const ACCENT_COLORS = {
    indigo:  { bg: 'bg-indigo-50/60',   text: 'text-indigo-600',   topBorder: 'border-t-indigo-500/80',  glow: 'hover:shadow-[0_20px_25px_-5px_rgba(79,93,255,0.06)] hover:border-indigo-200', indicator: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50/60', text: 'text-emerald-600', topBorder: 'border-t-emerald-500/80', glow: 'hover:shadow-[0_20px_25px_-5px_rgba(16,185,129,0.06)] hover:border-emerald-200', indicator: 'bg-emerald-500' },
    amber:   { bg: 'bg-amber-50/60',   text: 'text-amber-600',   topBorder: 'border-t-amber-500/80',   glow: 'hover:shadow-[0_20px_25px_-5px_rgba(245,158,11,0.06)] hover:border-amber-200', indicator: 'bg-amber-500' },
  };

  const color = ACCENT_COLORS[accent] || ACCENT_COLORS.indigo;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/40 border-t-[4px] border-t-slate-200 p-5 animate-pulse flex flex-col font-sans">
        <div className="w-10 h-10 rounded-xl bg-slate-100/80" />
        <div className="mt-4 h-7 w-16 bg-slate-100 rounded" />
        <div className="mt-2.5 h-3 w-28 bg-slate-100 rounded" />
        <div className="mt-2 h-2.5 w-32 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group bg-white rounded-2xl border border-slate-200/50 p-5 border-t-[4px] transition-all duration-300 shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-lg font-sans antialiased',
        color.topBorder,
        color.glow,
        'hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between">
        <div className={clsx('inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all duration-300 group-hover:scale-105', color.bg)}>
          <Icon size={18} strokeWidth={2} className={color.text} />
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors duration-300" />
      </div>

      <div className="mt-4 text-2xl font-bold tracking-tight text-slate-800 font-sans leading-none transition-colors duration-300">
        {value}
      </div>
      
      <div className="mt-2 text-xs font-semibold text-slate-500 font-sans">
        {label}
      </div>
      
      <div className="mt-1.5 text-xs text-slate-400 font-medium font-sans flex items-center gap-1.5 leading-relaxed">
        <span className={clsx("h-1 w-1 rounded-full shrink-0", color.indicator)} />
        {subtitle}
      </div>
    </div>
  );
}

export function TermsManagement() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [text, setText] = useState('');
  const [indexNo, setIndexNo] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // ── Load terms on mount ─────────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchAllTerms();
      const sorted = [...data].sort((a, b) => a.index_no - b.index_no);
      setTerms(sorted);
      if (sorted.length > 0) {
        setIndexNo(Math.max(...sorted.map(t => t.index_no)) + 1);
      } else {
        setIndexNo(1);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load terms and conditions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────
  function resetForm() {
    setEditingId(null);
    setText('');
    setFormError('');
    if (terms.length > 0) {
      setIndexNo(Math.max(...terms.map(t => t.index_no)) + 1);
    } else {
      setIndexNo(1);
    }
    setIsActive(true);
  }

  function startEdit(t) {
    setEditingId(t.id);
    setText(t.text);
    setIndexNo(t.index_no);
    setIsActive(!!t.is_active);
    setFormError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    
    const cleanText = text.trim();
    if (cleanText.length < 10) {
      setFormError('Terms and Conditions text must be at least 10 characters long.');
      return;
    }
    if (cleanText.length > 500) {
      setFormError('Terms and Conditions text cannot exceed 500 characters.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        text: cleanText,
        index_no: Number(indexNo),
        is_active: isActive ? 1 : 0
      };

      if (editingId) {
        await updateTerm(editingId, payload);
        toast.success('Terms item updated successfully');
      } else {
        await createTerm(payload);
        toast.success('New terms item added successfully');
      }
      
      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error?.message || 'Failed to save terms item';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, termText) {
    if (!window.confirm(`Are you sure you want to permanently delete this terms item?\n\n"${termText.slice(0, 80)}..."`)) {
      return;
    }

    try {
      await deleteTerm(id);
      toast.success('Terms item deleted successfully');
      if (editingId === id) resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error?.message || 'Failed to delete terms item');
    }
  }

  async function toggleActiveStatus(t) {
    try {
      const updatedStatus = !t.is_active;
      await updateTerm(t.id, {
        text: t.text,
        index_no: t.index_no,
        is_active: updatedStatus
      });
      toast.success(`Terms item #${t.index_no} ${updatedStatus ? 'activated' : 'deactivated'}`);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to change terms item status');
    }
  }

  async function moveItem(index, direction) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= terms.length) return;

    const current = terms[index];
    const target = terms[targetIndex];

    try {
      const tempIndex = current.index_no;
      
      // Pass only strictly valid parameters to bypass Zod .strict() payload filter
      await updateTerm(current.id, {
        text: current.text,
        index_no: target.index_no,
        is_active: !!current.is_active
      });
      await updateTerm(target.id, {
        text: target.text,
        index_no: tempIndex,
        is_active: !!target.is_active
      });

      toast.success('Ordering updated successfully');
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reorder terms item');
    }
  }

  // ── Data Table Column Setup ─────────────────────────────────────────
  const columns = useMemo(() => [
    {
      header: 'Order',
      accessor: 'index_no',
      className: 'w-20 text-center font-semibold text-slate-700',
      format: (index, row) => {
        const idx = terms.findIndex(t => t.id === row.id);
        return (
          <div className="flex items-center gap-1.5 justify-center select-none">
            <button
              type="button"
              onClick={() => moveItem(idx, 'up')}
              disabled={idx === 0}
              className={clsx(
                "p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition-all",
                idx === 0 && "cursor-not-allowed"
              )}
              title="Move Up"
            >
              <ArrowUp size={13} strokeWidth={2.5} />
            </button>
            <span className="text-xs font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
              {index}
            </span>
            <button
              type="button"
              onClick={() => moveItem(idx, 'down')}
              disabled={idx === terms.length - 1}
              className={clsx(
                "p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition-all",
                idx === terms.length - 1 && "cursor-not-allowed"
              )}
              title="Move Down"
            >
              <ArrowDown size={13} strokeWidth={2.5} />
            </button>
          </div>
        );
      }
    },
    {
      header: 'Term Statement',
      accessor: 'text',
      className: 'text-slate-700 font-medium leading-relaxed font-sans max-w-lg whitespace-pre-wrap select-text text-left',
    },
    {
      header: 'Status',
      accessor: 'is_active',
      className: 'w-28 text-center',
      format: (v, row) => (
        <button
          type="button"
          onClick={() => toggleActiveStatus(row)}
          className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border shadow-sm select-none",
            v
              ? "bg-emerald-50 border-emerald-150 text-emerald-700 hover:bg-emerald-100/50"
              : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200/60"
          )}
          title="Click to toggle status"
        >
          <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", v ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
          {v ? 'Active' : 'Inactive'}
        </button>
      )
    },
    {
      header: 'Actions',
      accessor: (row) => row,
      className: 'w-24 text-center',
      format: (_, row) => (
        <div className="flex items-center gap-1.5 justify-center select-none">
          <button
            type="button"
            onClick={() => startEdit(row)}
            className="p-1 text-slate-500 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
            title="Edit"
          >
            <Edit2 size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row.id, row.text)}
            className="p-1 text-slate-400 hover:text-danger rounded hover:bg-danger/5 border border-transparent hover:border-danger/10 transition-all"
            title="Delete"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      )
    }
  ], [terms]);

  const totalCount = terms.length;
  const activeCount = terms.filter(t => t.is_active).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-ink">Admin · Terms & Conditions</h1>
        <p className="text-sm text-ink-soft mt-1">
          Manage dynamic checklist items and operational compliance guidelines. Super-Admin-only.
        </p>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
        <LocalKpiCard
          loading={loading && !terms.length}
          label="Total Checklist Items"
          value={totalCount}
          icon={ScrollText}
          accent="indigo"
          subtitle="Database registered statements"
        />
        <LocalKpiCard
          loading={loading && !terms.length}
          label="Active Checklist Terms"
          value={activeCount}
          icon={Layers}
          accent="emerald"
          subtitle="Actively rendered on creator page"
        />
        <LocalKpiCard
          loading={loading && !terms.length}
          label="Schema Integrity"
          value="v1"
          icon={Shield}
          accent="amber"
          subtitle="Secured flat-boolean Zod model"
        />
      </div>

      {/* ── Two Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Professional Structured Data Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.01)] p-5 space-y-4">
          <div className="flex justify-between items-center pb-3.5 border-b border-slate-100 select-none">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ScrollText size={16} className="text-slate-400" />
              Guidelines Roster
            </h2>
            <button
              onClick={loadData}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh list"
            >
              <RefreshCw size={13} className={clsx(loading && "animate-spin")} />
            </button>
          </div>

          <DataTable
            columns={columns}
            rows={terms}
            keyField="id"
            loading={loading}
            emptyMessage="No terms found. Please create one on the right."
          />
        </div>

        {/* Right Side: Professional Compact Editor Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/50 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.01)] space-y-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-1.5 select-none">
            {editingId ? <Edit2 size={12} className="text-purple-500" /> : <Plus size={13} className="text-emerald-500" />}
            {editingId ? 'Edit Guideline Item' : 'New Guideline Item'}
          </h3>

          <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold select-none">
            {formError ? (
              <div role="alert" className="rounded-xl bg-danger/5 border border-danger/20 p-4 flex gap-2 shadow-sm animate-shake">
                <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />
                <div className="text-[11px] font-bold text-danger leading-normal">
                  {formError}
                </div>
              </div>
            ) : null}

            <FormField label="Order Index (index_no) *">
              <Input
                type="number"
                min="1"
                value={indexNo}
                onChange={(e) => setIndexNo(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Terms Checklist Text *">
              <textarea
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed transition-all duration-200 hover:border-slate-350"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type dynamic checklist statement verbatim..."
                required
              />
            </FormField>

            <div className="py-1">
              <Checkbox
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                label={
                  <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider select-none">
                    Active & Rendered
                  </span>
                }
              />
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  className="flex-1 text-slate-500 border-slate-200 font-bold"
                  disabled={saving}
                >
                  <X size={12} strokeWidth={2.5} className="mr-1" />
                  Cancel
                </Button>
              ) : null}
              <Button
                type="submit"
                variant={editingId ? 'secondary' : 'primary'}
                className={clsx(
                  "flex-1 font-bold shadow-sm transition-all duration-150 active:scale-95",
                  editingId 
                    ? 'bg-purple-50 text-purple-700 border-purple-200/50 hover:bg-purple-100/50 hover:border-purple-250' 
                    : 'bg-accent hover:bg-accent-hover text-white shadow-md shadow-accent/10'
                )}
                disabled={saving || !text.trim()}
              >
                {saving ? (
                  <Spinner size={12} className="mr-1" />
                ) : (
                  editingId ? <Check size={12} strokeWidth={2.5} className="mr-1" /> : <Plus size={12} strokeWidth={2.5} className="mr-1" />
                )}
                {editingId ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
