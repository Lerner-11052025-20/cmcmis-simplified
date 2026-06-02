// ============================================================================
// src/pages/admin/projects/ProjectManagement.jsx  —  Super Admin Project CRUD
// ----------------------------------------------------------------------------
// Overhauled highly professional, business-oriented, and minimalist dashboard.
// Restricts CRUD control over legacy `cmms_proj_mst` strictly under SUPER_ADMIN.
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import {
  Settings, Plus, Edit2, Trash2, Check, X, AlertCircle, RefreshCw, Shield, Layers, Search
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

import { StandardKpiCard } from '../../../components/StandardKpiCard.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Checkbox } from '../../../components/ui/Checkbox.jsx';
import { DataTable } from '../../../components/DataTable.jsx';
import { Pagination } from '../../../components/Pagination.jsx';
import {
  fetchProjects, createProject, updateProject, deleteProject
} from '../../../lib/api/projects.js';

export function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dynamic KPI aggregates (computed based on unfiltered total lookup counts if possible)
  const [kpis, setKpis] = useState({ totalCount: 0, activeCount: 0 });

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // ── Load projects ───────────────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch search-matched items for roster list
      const data = await fetchProjects({
        page: currentPage,
        pageSize: 10,
        q: searchQuery.trim()
      });
      setProjects(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);

      // 2. Fetch all active items (without query filter) to compute true KPI counts
      const full = await fetchProjects({ page: 1, pageSize: 10000, q: '' });
      const items = full.items || [];
      setKpis({
        totalCount: typeof full.total === 'number' ? full.total : items.length,
        activeCount: items.filter(p => p.is_active === 1 || p.is_active === true).length
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load project listings');
    } finally {
      setLoading(false);
    }
  }

  // Trigger load when page changes
  useEffect(() => {
    loadData();
  }, [currentPage]);

  // Debounced/Triggered search execution on input change
  function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    setCurrentPage(1);
    loadData();
  }

  // ── Handlers ────────────────────────────────────────────────────────
  function resetForm() {
    setEditingId(null);
    setName('');
    setIsActive(true);
    setFormError('');
  }

  function startEdit(p) {
    setEditingId(p.id);
    setName(p.name);
    setIsActive(p.is_active === 1 || p.is_active === true);
    setFormError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setFormError('Project name must be at least 2 characters long.');
      return;
    }
    if (cleanName.length > 50) {
      setFormError('Project name cannot exceed 50 characters.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanName,
        is_active: isActive ? true : false
      };

      if (editingId) {
        await updateProject(editingId, payload);
        toast.success('Project updated successfully');
      } else {
        await createProject(payload);
        toast.success('New project created successfully');
      }

      resetForm();
      setCurrentPage(1);
      await loadData();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error?.message || 'Failed to save project';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, projName) {
    if (!window.confirm(`Are you sure you want to permanently delete this project?\n\n"${projName}"`)) {
      return;
    }

    try {
      await deleteProject(id);
      toast.success('Project deleted successfully');
      if (editingId === id) resetForm();
      setCurrentPage(1);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error?.message || 'Failed to delete project');
    }
  }

  async function toggleActiveStatus(p) {
    try {
      const updatedStatus = !(p.is_active === 1 || p.is_active === true);
      await updateProject(p.id, {
        name: p.name,
        is_active: updatedStatus
      });
      toast.success(`Project "${p.name}" ${updatedStatus ? 'activated' : 'deactivated'}`);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to change project status');
    }
  }

  // ── Data Table Column Setup ─────────────────────────────────────────
  const columns = useMemo(() => [
    {
      header: 'Project ID',
      accessor: 'id',
      className: 'w-24 text-center font-bold text-slate-800 tabular-nums',
      format: (v) => `#${v}`
    },
    {
      header: 'Project Name',
      accessor: 'name',
      className: 'text-slate-700 font-bold leading-relaxed font-sans text-left uppercase tracking-tight',
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
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border border-transparent shadow-sm select-none",
            (v === 1 || v === true)
              ? "bg-emerald-50 border-emerald-150 text-emerald-700 hover:bg-emerald-100/50"
              : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200/60"
          )}
          title="Click to toggle status"
        >
          <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", (v === 1 || v === true) ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
          {(v === 1 || v === true) ? 'Active' : 'Inactive'}
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
            onClick={() => handleDelete(row.id, row.name)}
            className="p-1 text-slate-400 hover:text-danger rounded hover:bg-danger/5 border border-transparent hover:border-danger/10 transition-all"
            title="Delete"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      )
    }
  ], [projects]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-ink">Admin · Project Settings</h1>
        <p className="text-sm text-ink-soft mt-1">
          Manage legacy project directories, calibration scopes, and operational mappings. Super-Admin-only.
        </p>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
        <StandardKpiCard
          loading={loading && !projects.length}
          label="Total Projects Master"
          value={kpis.totalCount}
          icon={Settings}
          accent="indigo"
          subtitle="Database registered entries"
        />
        <StandardKpiCard
          loading={loading && !projects.length}
          label="Active Projects Directory"
          value={kpis.activeCount}
          icon={Layers}
          accent="emerald"
          subtitle="Actively displayed on creator forms"
        />
        <StandardKpiCard
          loading={loading && !projects.length}
          label="Schema Compliance"
          value="v2"
          icon={Shield}
          accent="amber"
          subtitle="Protected legacy cmms_proj_mst structure"
        />
      </div>

      {/* ── Two Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Professional Paginated Search Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(15,23,42,0.01)] p-5 space-y-4">
          
          <div className="flex flex-wrap justify-between items-center pb-3.5 border-b border-slate-100 gap-3 select-none">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-slate-400" />
              Projects Directory Roster
            </h2>
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  type="text"
                  placeholder="Search project name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 sm:w-56 h-8 text-xs font-semibold pl-8 pr-3 py-1 rounded-lg border border-slate-200 focus:ring-2 focus:ring-accent"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </form>
              <button
                type="button"
                onClick={loadData}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-150 transition-colors"
                title="Refresh list"
              >
                <RefreshCw size={13} className={clsx(loading && "animate-spin")} />
              </button>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={projects}
            keyField="id"
            loading={loading}
            emptyMessage={searchQuery.trim() ? "No matched projects found. Try another query." : "No projects found."}
          />

          <div className="flex justify-between items-center pt-2 select-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Showing {projects.length} of {total} items
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>

        {/* Right Side: Professional Compact Editor Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/50 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.01)] space-y-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-1.5 select-none">
            {editingId ? <Edit2 size={12} className="text-purple-500" /> : <Plus size={13} className="text-emerald-500" />}
            {editingId ? 'Edit Project Entry' : 'New Project Entry'}
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

            <FormField label="Project Name (PR_NAME) *">
              <Input
                type="text"
                placeholder="Type name (e.g. GSAT-20, INSAT-4A)..."
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                disabled={saving || !name.trim()}
              >
                {saving ? (
                  <Spinner size={12} className="mr-1" />
                ) : (
                  editingId ? <Check size={12} strokeWidth={2.5} className="mr-1" /> : <Plus size={12} strokeWidth={2.5} className="mr-1" />
                )}
                {editingId ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
