// ============================================================================
// src/pages/dashboard/DashboardCharts.jsx  —  RBAC Role-Based Dynamic Charts
// ----------------------------------------------------------------------------
// Layout:
//   Donut (Metrics RBAC) & Horizontal Progress Chart side-by-side in a
//   balanced 2-column linear space.
// ============================================================================

import React from 'react';
import { useAuth } from '../../lib/auth-context.jsx';
import { PieChart, Activity } from 'lucide-react';
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

// ── Public Orchestrator ────────────────────────────────────────────────
export function DashboardCharts() {
  const { user } = useAuth();
  if (!user) return null;

  const config = ROLE_CHART_CONFIGS[user.role] || ROLE_CHART_CONFIGS.GUEST;
  
  return (
    <section aria-label="Dynamic Role-Based Telemetry Charts" className="space-y-4 font-sans">
      {/* heading banner */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink font-sans tracking-tight">
          System Analytics
          <span className="ml-2 text-xs font-semibold text-ink-soft/60 uppercase tracking-wider">
            · {config.roleLabel} Dashboard ({user.role})
          </span>
        </h2>
      </div>

      {/* Linear Space: Donut (Metrics RBAC) & Horizontal Progress Chart side-by-side */}
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
    </section>
  );
}
