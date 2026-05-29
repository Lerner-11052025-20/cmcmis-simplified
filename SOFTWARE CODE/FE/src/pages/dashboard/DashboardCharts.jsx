// ============================================================================
// src/pages/dashboard/DashboardCharts.jsx  —  RBAC Role-Based Dynamic Charts
// ----------------------------------------------------------------------------
// Layout:
//   1. Donut (Metrics RBAC) & Horizontal Progress Chart side-by-side.
//   2. Active Session Security Credentials Full-Length Table.
// ============================================================================

import React from 'react';
import { useAuth } from '../../lib/auth-context.jsx';
import { PieChart, Activity, Lock } from 'lucide-react';
import clsx from 'clsx';

// ── 13 Roles RBACs configurations map with goals ────────────────────────
const ROLE_CHART_CONFIGS = {
  SUPER_ADMIN: {
    roleLabel: "Super Administrator",
    donut: {
      title: "System Transaction Weight",
      labels: ["Requests", "Job Cards", "Verification", "Audits"],
      values: [35, 45, 12, 8],
      colors: ["#4f5dff", "#8b5cf6", "#10b981", "#f59e0b"],
    },
    progress: {
      title: "System Performance Goals",
      items: [
        { label: "Server Cluster Uptime", value: 99, color: "#10b981", valueDisplay: "99.9%" },
        { label: "Job Card Dispatch Rate", value: 85, color: "#4f5dff" },
        { label: "QA Sign-off Compliance", value: 92, color: "#8b5cf6" },
        { label: "DB Telemetry Sync Speed", value: 78, color: "#f59e0b", valueDisplay: "78 ms" }
      ]
    }
  },
  NORMAL_USER: {
    roleLabel: "Standard Requester",
    donut: {
      title: "My Request Categories",
      labels: ["Calibration", "Repair", "General specs"],
      values: [55, 30, 15],
      colors: ["#3b82f6", "#ef4444", "#94a3b8"],
    },
    progress: {
      title: "My Request Dispatch Progress",
      items: [
        { label: "Job Requests Approved", value: 80, color: "#3b82f6" },
        { label: "Equipment Specifications verified", value: 60, color: "#10b981" },
        { label: "Pending Calibrations count", value: 25, color: "#f59e0b", valueDisplay: "3 left" },
        { label: "Active Job Cards assigned", value: 50, color: "#8b5cf6" }
      ]
    }
  },
  VIEW_ONLY: {
    roleLabel: "View Only Observer",
    donut: {
      title: "System Access Metrics",
      labels: ["Active Specs", "Inquiry Runs", "Downloads"],
      values: [60, 25, 15],
      colors: ["#10b981", "#64748b", "#3b82f6"],
    },
    progress: {
      title: "Data Observability Limits",
      items: [
        { label: "Specs Document Access", value: 95, color: "#10b981" },
        { label: "Search Index Health", value: 88, color: "#3b82f6" },
        { label: "Download Limit Status", value: 45, color: "#f59e0b", valueDisplay: "4.5 / 10 GB" },
        { label: "Audit Telemetry Feed", value: 70, color: "#8b5cf6" }
      ]
    }
  },
  LAB_IN_CHARGE: {
    roleLabel: "Laboratory In-Charge",
    donut: {
      title: "Lab Allocations",
      labels: ["Approvals", "Job Cards", "Procurement", "Specs"],
      values: [40, 35, 15, 10],
      colors: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"],
    },
    progress: {
      title: "Lab Metric Throughput",
      items: [
        { label: "Calibration Approvals", value: 90, color: "#8b5cf6" },
        { label: "Active Job Cards Cleared", value: 75, color: "#3b82f6" },
        { label: "Procurement Delivery Rate", value: 65, color: "#10b981" },
        { label: "Inventory Calibration Checks", value: 80, color: "#f59e0b" }
      ]
    }
  },
  DIVISION_HEAD: {
    roleLabel: "Division Head",
    donut: {
      title: "Division Work Breakdown",
      labels: ["Requests", "Approved Cards", "Inventory", "Audit"],
      values: [30, 50, 10, 10],
      colors: ["#3b82f6", "#10b981", "#6366f1", "#f43f5e"],
    },
    progress: {
      title: "Division Operational Goals",
      items: [
        { label: "Request Clearance Index", value: 92, color: "#3b82f6" },
        { label: "Job Card Execution Speed", value: 85, color: "#10b981" },
        { label: "Monthly Procurement Budget", value: 72, color: "#6366f1", valueDisplay: "72.4%" },
        { label: "Division Compliance Audits", value: 90, color: "#f43f5e" }
      ]
    }
  },
  QA_ENGINEER: {
    roleLabel: "Quality Assurance Engineer",
    donut: {
      title: "QA Test Outcomes",
      labels: ["Passed", "Awaiting Verification", "Failed"],
      values: [70, 20, 10],
      colors: ["#10b981", "#f59e0b", "#ef4444"],
    },
    progress: {
      title: "Quality Control Objectives",
      items: [
        { label: "Equipment Testing Coverage", value: 95, color: "#10b981" },
        { label: "Standard Validation Rate", value: 82, color: "#f59e0b" },
        { label: "Instrument Recalibration Cleared", value: 90, color: "#ef4444" },
        { label: "Weekly Audit Verifications", value: 75, color: "#3b82f6" }
      ]
    }
  },
  CALIBRATION_ENGINEER: {
    roleLabel: "Calibration Engineer",
    donut: {
      title: "Calibration Categories",
      labels: ["RF / Microwave", "Time & Frequency", "Electrical"],
      values: [45, 35, 20],
      colors: ["#ec4899", "#8b5cf6", "#0ea5e9"],
    },
    progress: {
      title: "Calibration Target Rates",
      items: [
        { label: "RF Calibration Progress", value: 88, color: "#ec4899" },
        { label: "Precision Clock Testing", value: 76, color: "#8b5cf6" },
        { label: "Electrical Lab Backlog", value: 35, color: "#0ea5e9", valueDisplay: "35% left" },
        { label: "Active Test Bench Sync", value: 92, color: "#10b981" }
      ]
    }
  },
  LAB_TECHNICIAN: {
    roleLabel: "Laboratory Technician",
    donut: {
      title: "Task Log Allocation",
      labels: ["Setup", "Maintenance", "Reporting", "Calibrations"],
      values: [30, 30, 25, 15],
      colors: ["#0ea5e9", "#f59e0b", "#64748b", "#8b5cf6"],
    },
    progress: {
      title: "Lab Task Completions",
      items: [
        { label: "Equipment Setup Speed", value: 85, color: "#0ea5e9" },
        { label: "Maintenance Checklist Run", value: 90, color: "#f59e0b" },
        { label: "Report Telemetry Drafted", value: 72, color: "#64748b" },
        { label: "Laboratory Calibration Help", value: 60, color: "#8b5cf6" }
      ]
    }
  },
  SAFETY_OFFICER: {
    roleLabel: "Safety Officer",
    donut: {
      title: "Safety Audit Targets",
      labels: ["Lab Inspections", "PPE Compliance", "Hazard Logs"],
      values: [50, 35, 15],
      colors: ["#f59e0b", "#10b981", "#ef4444"],
    },
    progress: {
      title: "Safety Program Objectives",
      items: [
        { label: "Quarterly Safety Inspections", value: 92, color: "#f59e0b" },
        { label: "PPE Standards Audit Score", value: 96, color: "#10b981", valueDisplay: "96%" },
        { label: "Hazard Log Resolution Time", value: 78, color: "#ef4444" },
        { label: "First-Aid Bench Sync", value: 85, color: "#3b82f6" }
      ]
    }
  },
  EXTERNAL_AUDITOR: {
    roleLabel: "External Quality Auditor",
    donut: {
      title: "Compliance Checklist",
      labels: ["Verified Logs", "Flagged Items", "Pending Review"],
      values: [80, 12, 8],
      colors: ["#10b981", "#ef4444", "#3b82f6"],
    },
    progress: {
      title: "Auditing Target Milestones",
      items: [
        { label: "Audit Files Reviewed", value: 92, color: "#10b981" },
        { label: "Verification Checks Cleared", value: 88, color: "#ef4444" },
        { label: "Regulatory Compliance Sync", value: 85, color: "#3b82f6" },
        { label: "Pending Flagged Issues Time", value: 40, color: "#64748b" }
      ]
    }
  },
  PROCUREMENT_OFFICER: {
    roleLabel: "Procurement Officer",
    donut: {
      title: "Order Allocations",
      labels: ["Approved Orders", "Pending Quotes", "Delivered"],
      values: [45, 35, 20],
      colors: ["#3b82f6", "#f59e0b", "#10b981"],
    },
    progress: {
      title: "Procurement Execution Limits",
      items: [
        { label: "Approved Purchase Orders", value: 82, color: "#3b82f6" },
        { label: "Pending Vendors Quoted", value: 65, color: "#f59e0b" },
        { label: "Instrument Order Delivery", value: 90, color: "#10b981" },
        { label: "Procurement Budget Utilized", value: 50, color: "#64748b" }
      ]
    }
  },
  LAB_MEMBER: {
    roleLabel: "Lab Member",
    donut: {
      title: "Lab Member Activity",
      labels: ["Job Cards", "My Setups", "General Logs"],
      values: [50, 30, 20],
      colors: ["#8b5cf6", "#0ea5e9", "#64748b"],
    },
    progress: {
      title: "My Operational Target Checks",
      items: [
        { label: "Calibration Job Cards Signed", value: 85, color: "#8b5cf6" },
        { label: "Personal Setup Checklist Clear", value: 90, color: "#0ea5e9" },
        { label: "Lab Diagnostic Checks Made", value: 65, color: "#64748b" },
        { label: "Inquiry Queries Completed", value: 75, color: "#10b981" }
      ]
    }
  },
  GUEST: {
    roleLabel: "Guest Visitor",
    donut: {
      title: "Public Allocations",
      labels: ["Active Specs", "External Inquiries"],
      values: [70, 30],
      colors: ["#64748b", "#3b82f6"],
    },
    progress: {
      title: "Visitor Interaction Rates",
      items: [
        { label: "Specifications Document Lookup", value: 85, color: "#64748b" },
        { label: "Inquiry Sessions Activated", value: 60, color: "#3b82f6" },
        { label: "Portal Search Operations", value: 72, color: "#10b981" },
        { label: "General Workspace Access", value: 35, color: "#ef4444" }
      ]
    }
  }
};

// ── Master checklist of human-friendly descriptions for permissions ────
const ALL_SYSTEM_PERMISSIONS = {
  'dashboard:view': { category: 'core', module: 'System Dashboard', label: 'View general dashboard KPI telemetry & recap metrics' },
  'job_request:read-own': { category: 'core', module: 'Job Requests Workspace', label: 'Create, edit, and lookup standard laboratory Job Requests' },
  'job_request:approve': { category: 'core', module: 'Job Requests Approval', label: 'Approve, decline, and convert Job Requests into active Job Cards' },
  'job_card:read-list': { category: 'core', module: 'Job Cards Logs', label: 'Lookup, inspect, and update active Laboratory Job Cards' },
  'equipment:read-list': { category: 'lab', module: 'Equipment Inventory', label: 'View active instrumentation and laboratory equipment lists' },
  'schedule:read-list': { category: 'lab', module: 'Calibration Scheduling', label: 'View and configure calendar calibration time-slots' },
  'procurement:read-list': { category: 'lab', module: 'Procurement Pipeline', label: 'View active purchase orders, quotations, and vendors list' },
  'inquiry:search-instruments': { category: 'lab', module: 'Telemetry Inquiries', label: 'Perform real-time inquiries on products, makes, and models' },
  'analytics:view': { category: 'reports', module: 'Analytics Dashboard', label: 'Access comprehensive multi-metric analytical visual panels' },
  'reports:view-analytics': { category: 'reports', module: 'Reports Workspace', label: 'Generate technical documents and compile PDF activity logs' },
  'user:read-list': { category: 'admin', module: 'User Accounts Master', label: 'Manage portal user logins, auth settings, and profile maps' },
  'master:employees:manage': { category: 'admin', module: 'Employees Master', label: 'Configure employee telemetry files, department roles, and designations' },
  'equipment:verify': { category: 'admin', module: 'Equipment Verification', label: 'Verify, sign-off, and close completed calibration loops' },
  'audit:read-list': { category: 'admin', module: 'System Audit Logs', label: 'Inspect cryptographic server audit trails and system activity logs' }
};

// ── 4 Grouping metadata for security credentials ──────────────────────
const PERM_GROUPS = {
  core: { title: "Core Operations", dotColor: "bg-indigo-500" },
  lab: { title: "Laboratory Modules", dotColor: "bg-sky-500" },
  reports: { title: "Analytics & Reports", dotColor: "bg-violet-500" },
  admin: { title: "System Controls", dotColor: "bg-amber-500" }
};

function classifyPermission(permCode) {
  const code = permCode.toLowerCase();
  if (code.startsWith('dashboard') || code.startsWith('job_request') || code.startsWith('job_card') || code.startsWith('conversion')) {
    return 'core';
  }
  if (code.startsWith('equipment') || code.startsWith('schedule') || code.startsWith('procurement') || code.startsWith('inquiry') || code.startsWith('master:instrument')) {
    return 'lab';
  }
  if (code.startsWith('analytics') || code.startsWith('reports')) {
    return 'reports';
  }
  if (code.startsWith('user') || code.startsWith('master') || code.startsWith('audit') || code.startsWith('permission')) {
    return 'admin';
  }
  return 'core';
}

function formatPermission(permCode) {
  const parts = permCode.split(':');
  let moduleName = parts[0] || '';
  let actionName = parts[1] || '';
  
  if (parts.length > 2) {
    moduleName = parts.slice(0, -1).join(' ');
    actionName = parts[parts.length - 1];
  }
  
  moduleName = moduleName.replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
    
  actionName = actionName.replace(/-/g, ' ')
    .toUpperCase();
    
  return { moduleName, actionName };
}

function getPermissionDetails(p) {
  if (ALL_SYSTEM_PERMISSIONS[p]) {
    return ALL_SYSTEM_PERMISSIONS[p];
  }
  const { moduleName, actionName } = formatPermission(p);
  const category = classifyPermission(p);
  return {
    category,
    module: `${moduleName} Module`,
    label: `Authorized capability to execute ${actionName.toLowerCase()} transactions inside employee ${moduleName.toLowerCase()} workspace.`
  };
}

// ── Donut Segment Circumference Logic ─────────────────────────────────
function DonutChart({ config }) {
  const radius = 15.915;
  const values = config.donut.values;
  const colors = config.donut.colors;
  const labels = config.donut.labels;

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center justify-between h-full">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="3.5"
          />
          {values.map((val, idx) => {
            const offset = 100 - cumulative + 25; 
            cumulative += val;
            return (
              <circle
                key={idx}
                cx="18"
                cy="18"
                r={radius}
                fill="transparent"
                stroke={colors[idx] || "#94a3b8"}
                strokeWidth="3.5"
                strokeDasharray={`${val} 100`}
                strokeDashoffset={offset}
                className="transition-all duration-500 ease-in-out"
              />
            );
          })}
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-ink-soft/50 uppercase tracking-widest font-sans">Metrics</span>
          <span className="text-[15px] font-extrabold text-ink font-sans leading-none mt-0.5">RBAC</span>
        </div>
      </div>

      {/* Legend labels */}
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 w-full">
        {labels.map((lbl, idx) => (
          <div key={idx} className="flex items-center gap-1.5 min-w-0">
            <span
              className="h-2 w-2 rounded-full shrink-0 border border-white/20"
              style={{ backgroundColor: colors[idx] || "#94a3b8" }}
            />
            <span className="text-[10px] font-semibold text-ink-soft/80 truncate font-sans">
              {lbl} ({values[idx]}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal Progress Chart Graph ───────────────────────────────────
function HorizontalProgressBarChart({ config }) {
  const items = config.progress.items || [];

  return (
    <div className="flex flex-col justify-between h-full font-sans space-y-4 py-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col group/progress">
          <div className="flex items-center justify-between text-xs font-semibold text-ink font-sans">
            <span className="group-hover/progress:text-accent transition-colors duration-200 truncate pr-2 max-w-[200px]">
              {item.label}
            </span>
            <span className="text-[11px] font-bold text-ink-soft/75">
              {item.valueDisplay || `${item.value}%`}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100/80 rounded-full overflow-hidden mt-2 relative border border-slate-200/20 shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${item.value}%`,
                backgroundColor: item.color,
                boxShadow: `0 0 6px ${item.color}40`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Generic card wrapper ────────────────────────────────────────────
function ChartCard({ title, icon: Icon, colorClass, borderClass, children }) {
  return (
    <div className={clsx(
      'bg-white rounded-2xl border border-slate-200/50 p-5 flex flex-col min-h-[300px] border-t-[4px] shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5',
      borderClass
    )}>
      {/* header */}
      <div className="flex items-center justify-between mb-4 select-none">
        <div className="flex items-center gap-2.5">
          <div className={clsx('h-8 w-8 rounded-lg flex items-center justify-center border shadow-[0_1px_2px_rgba(0,0,0,0.01)] bg-slate-50/50 border-slate-100', colorClass ? 'border-transparent' : '')}>
            <Icon size={15} strokeWidth={2} className={colorClass || 'text-ink-soft'} />
          </div>
          <h3 className="text-sm font-bold text-ink tracking-tight font-sans">{title}</h3>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
      </div>

      {/* divider */}
      <div className="border-t border-slate-100 mb-4" />

      {/* chart display block */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

// ── Active Session Security Credentials Full-Length Table ─────────────
function UserPermissionsPanel() {
  const { user } = useAuth();
  if (!user || !user.permissions) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/50 p-6 flex flex-col shadow-[0_2px_8px_rgba(15,23,42,0.015)] hover:shadow-lg transition-all duration-300 font-sans">
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 select-none mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center border shadow-[0_1px_2px_rgba(0,0,0,0.01)] bg-indigo-50/50 border-indigo-100/50 text-indigo-600">
            <Lock size={16} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink tracking-tight font-sans">Active Session Security Credentials</h3>
            <p className="text-[11px] text-ink-soft/70 font-semibold mt-0.5 font-sans">
              Role Authorized: <span className="text-indigo-600 font-bold">{user.role}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 shrink-0">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
          </span>
          <span className="text-[11px] font-bold text-ink-soft/75 tracking-normal font-sans">
            Credentials Active
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 mb-5" />

      {/* Spacious Full-Width Table */}
      <div className="overflow-x-auto w-full no-scrollbar rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/80 text-[13px] font-bold text-slate-600 select-none font-sans">
              <th className="px-5 py-4 w-16"># ID</th>
              <th className="px-5 py-4 w-44 font-semibold text-slate-600">Security Domain</th>
              <th className="px-5 py-4 w-52 font-semibold text-slate-600">Authorized Module</th>
              <th className="px-5 py-4 w-52 font-semibold text-slate-600">Cryptographic Key</th>
              <th className="px-5 py-4 font-semibold text-slate-600">Capability Description</th>
              <th className="px-5 py-4 w-36 text-center font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 font-sans">
            {user.permissions.map((perm, idx) => {
              const details = getPermissionDetails(perm);
              const groupMeta = PERM_GROUPS[details.category] || PERM_GROUPS.core;
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={perm}
                  className={clsx(
                    'transition-all duration-200 text-[13px] font-sans group/row',
                    isEven ? 'bg-slate-50/40 hover:bg-slate-100/50' : 'bg-white hover:bg-slate-50/50'
                  )}
                >
                  {/* # ID */}
                  <td className="px-5 py-4 text-slate-400 font-bold select-none tabular-nums font-sans">
                    #{String(idx + 1).padStart(2, '0')}
                  </td>

                  {/* Security Domain */}
                  <td className="px-5 py-4 select-none">
                    <span className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border font-sans',
                      details.category === 'core' ? 'bg-indigo-50 border-indigo-100/70 text-indigo-700' :
                      details.category === 'lab' ? 'bg-sky-50 border-sky-100/70 text-sky-700' :
                      details.category === 'reports' ? 'bg-violet-50 border-violet-100/70 text-violet-700' :
                      'bg-amber-50 border-amber-100/70 text-amber-700'
                    )}>
                      <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", groupMeta.dotColor)} />
                      {groupMeta.title}
                    </span>
                  </td>

                  {/* Authorized Module */}
                  <td className="px-5 py-4 font-semibold text-slate-800 transition-colors group-hover/row:text-accent font-sans">
                    {details.module}
                  </td>

                  {/* Cryptographic Key */}
                  <td className="px-5 py-4 select-all font-sans">
                    <span className="inline-flex items-center px-3 py-1 rounded-md bg-slate-100/80 border border-slate-200/80 text-slate-700 font-medium text-[13px] font-sans">
                      {perm}
                    </span>
                  </td>

                  {/* Capability Description */}
                  <td className="px-5 py-4 text-slate-600 font-medium font-sans leading-relaxed">
                    {details.label}
                  </td>

                  {/* Authorization Status */}
                  <td className="px-5 py-4 text-center select-none font-sans">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-100/70 text-emerald-700 font-sans shadow-sm">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
                      </span>
                      Authorized
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Public Orchestrator ────────────────────────────────────────────────
export function DashboardCharts() {
  const { user } = useAuth();
  if (!user) return null;

  const config = ROLE_CHART_CONFIGS[user.role] || ROLE_CHART_CONFIGS.GUEST;
  
  return (
    <section aria-label="Dynamic Role-Based Telemetry Charts" className="space-y-6 font-sans">
      {/* heading banner */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink font-sans tracking-tight">
          System Analytics
          <span className="ml-2 text-xs font-semibold text-ink-soft/60 uppercase tracking-wider">
            · {config.roleLabel} Dashboard ({user.role})
          </span>
        </h2>
      </div>

      {/* Row 1: Donut (Metrics RBAC) & Horizontal Progress Chart side-by-side inside md:grid-cols-2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut Chart (Metrics RBAC) */}
        <ChartCard
          title={config.donut.title}
          icon={PieChart}
          colorClass="text-indigo-600"
          borderClass="border-t-indigo-500/80 hover:shadow-indigo-500/5 hover:border-indigo-200/50"
        >
          <DonutChart config={config} />
        </ChartCard>

        {/* Horizontal Progress Chart */}
        <ChartCard
          title={config.progress.title}
          icon={Activity}
          colorClass="text-sky-600"
          borderClass="border-t-sky-500/80 hover:shadow-sky-500/5 hover:border-sky-200/50"
        >
          <HorizontalProgressBarChart config={config} />
        </ChartCard>
      </div>

      {/* Row 2: Active Session Security Credentials Panel */}
      <UserPermissionsPanel />
    </section>
  );
}
