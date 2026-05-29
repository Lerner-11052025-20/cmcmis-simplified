// ============================================================================
// src/pages/dashboard/DashboardCharts.jsx  —  RBAC Role-Based Dynamic Charts
// ----------------------------------------------------------------------------
// Layout:
//   Row 1: Donut (Metrics RBAC) & Horizontal Progress Chart side-by-side.
//   Row 2: Full-width Multi-Channel Telemetry Wavy Curve (2-3 waves combination).
// ============================================================================

import React from 'react';
import { useAuth } from '../../lib/auth-context.jsx';
import { PieChart, Activity, AreaChart } from 'lucide-react';
import clsx from 'clsx';

// ── 13 Roles RBACs configurations map with 3-wave curves & goals ────────
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
    },
    wave: {
      title: "Multi-Channel Platform Telemetry (Core Active Signals)",
      waves: [
        {
          label: "Job Card Traffic",
          color: "#4f5dff",
          path: "M 0 50 Q 40 20, 80 45 T 160 15 T 240 35 L 240 100 L 0 100 Z",
          linePath: "M 0 50 Q 40 20, 80 45 T 160 15 T 240 35",
          peakX: 80, peakY: 45,
        },
        {
          label: "Request Approval Load",
          color: "#8b5cf6",
          path: "M 0 65 Q 30 45, 90 25 T 180 50 T 240 40 L 240 100 L 0 100 Z",
          linePath: "M 0 65 Q 30 45, 90 25 T 180 50 T 240 40",
          peakX: 90, peakY: 25,
        },
        {
          label: "Verification Pipeline",
          color: "#10b981",
          path: "M 0 80 Q 50 60, 100 70 T 200 45 T 240 55 L 240 100 L 0 100 Z",
          linePath: "M 0 80 Q 50 60, 100 70 T 200 45 T 240 55",
          peakX: 100, peakY: 70,
        }
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
    },
    wave: {
      title: "Personal Account Telemetry Signals",
      waves: [
        {
          label: "Job Request Stream",
          color: "#3b82f6",
          path: "M 0 70 Q 40 40, 80 60 T 160 30 T 240 50 L 240 100 L 0 100 Z",
          linePath: "M 0 70 Q 40 40, 80 60 T 160 30 T 240 50",
          peakX: 80, peakY: 60,
        },
        {
          label: "Calibration Feed",
          color: "#10b981",
          path: "M 0 80 Q 50 55, 100 70 T 200 45 T 240 60 L 240 100 L 0 100 Z",
          linePath: "M 0 80 Q 50 55, 100 70 T 200 45 T 240 60",
          peakX: 100, peakY: 70,
        }
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
    },
    wave: {
      title: "Observer Telemetry Streams",
      waves: [
        {
          label: "Specifications Lookup",
          color: "#10b981",
          path: "M 0 80 Q 40 60, 80 75 T 160 50 T 240 70 L 240 100 L 0 100 Z",
          linePath: "M 0 80 Q 40 60, 80 75 T 160 50 T 240 70",
          peakX: 80, peakY: 75,
        },
        {
          label: "Active Inquiries",
          color: "#3b82f6",
          path: "M 0 88 Q 30 75, 90 80 T 180 65 T 240 78 L 240 100 L 0 100 Z",
          linePath: "M 0 88 Q 30 75, 90 80 T 180 65 T 240 78",
          peakX: 90, peakY: 80,
        }
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
    },
    wave: {
      title: "Multi-Channel Lab Throughput (Telemetry)",
      waves: [
        {
          label: "Active Approvals",
          color: "#8b5cf6",
          path: "M 0 60 Q 30 30, 60 50 T 120 20 T 180 45 T 240 30 L 240 100 L 0 100 Z",
          linePath: "M 0 60 Q 30 30, 60 50 T 120 20 T 180 45 T 240 30",
          peakX: 60, peakY: 50,
        },
        {
          label: "Calibration Job Cards",
          color: "#3b82f6",
          path: "M 0 75 Q 40 50, 80 65 T 160 30 T 240 45 L 240 100 L 0 100 Z",
          linePath: "M 0 75 Q 40 50, 80 65 T 160 30 T 240 45",
          peakX: 80, peakY: 65,
        },
        {
          label: "Procurement Requests",
          color: "#10b981",
          path: "M 0 85 Q 50 65, 100 75 T 200 50 T 240 68 L 240 100 L 0 100 Z",
          linePath: "M 0 85 Q 50 65, 100 75 T 200 50 T 240 68",
          peakX: 100, peakY: 75,
        }
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
    },
    wave: {
      title: "Division Production Signals (Multi-Wave)",
      waves: [
        {
          label: "Division Requests",
          color: "#6366f1",
          path: "M 0 60 Q 40 20, 80 50 T 160 15 T 240 40 L 240 100 L 0 100 Z",
          linePath: "M 0 60 Q 40 20, 80 50 T 160 15 T 240 40",
          peakX: 80, peakY: 50,
        },
        {
          label: "Approved Job Cards",
          color: "#10b981",
          path: "M 0 75 Q 30 50, 90 60 T 180 35 T 240 50 L 240 100 L 0 100 Z",
          linePath: "M 0 75 Q 30 50, 90 60 T 180 35 T 240 50",
          peakX: 90, peakY: 60,
        }
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
    },
    wave: {
      title: "Quality Inspection Waveforms",
      waves: [
        {
          label: "Passed Inspections",
          color: "#10b981",
          path: "M 0 50 Q 30 70, 60 40 T 120 60 T 180 30 T 240 50 L 240 100 L 0 100 Z",
          linePath: "M 0 50 Q 30 70, 60 40 T 120 60 T 180 30 T 240 50",
          peakX: 60, peakY: 40,
        },
        {
          label: "Verification Queue",
          color: "#f59e0b",
          path: "M 0 80 Q 50 65, 100 75 T 200 50 T 240 68 L 240 100 L 0 100 Z",
          linePath: "M 0 80 Q 50 65, 100 75 T 200 50 T 240 68",
          peakX: 100, peakY: 75,
        }
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
    },
    wave: {
      title: "Multi-Channel Calibration Waves",
      waves: [
        {
          label: "RF & Microwave Specs",
          color: "#ec4899",
          path: "M 0 70 Q 30 30, 60 60 T 120 15 T 180 50 T 240 25 L 240 100 L 0 100 Z",
          linePath: "M 0 70 Q 30 30, 60 60 T 120 15 T 180 50 T 240 25",
          peakX: 60, peakY: 60,
        },
        {
          label: "Electrical Standards",
          color: "#8b5cf6",
          path: "M 0 82 Q 40 55, 80 70 T 160 40 T 240 62 L 240 100 L 0 100 Z",
          linePath: "M 0 82 Q 40 55, 80 70 T 160 40 T 240 62",
          peakX: 80, peakY: 70,
        }
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
    },
    wave: {
      title: "Technician Diagnostic Signals (2-Wave)",
      waves: [
        {
          label: "Equipment Setup Rate",
          color: "#0ea5e9",
          path: "M 0 65 Q 40 45, 80 55 T 160 35 T 240 60 L 240 100 L 0 100 Z",
          linePath: "M 0 65 Q 40 45, 80 55 T 160 35 T 240 60",
          peakX: 80, peakY: 55,
        },
        {
          label: "Maintenance Diagnostics",
          color: "#f59e0b",
          path: "M 0 82 Q 50 68, 100 78 T 200 55 T 240 70 L 240 100 L 0 100 Z",
          linePath: "M 0 82 Q 50 68, 100 78 T 200 55 T 240 70",
          peakX: 100, peakY: 78,
        }
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
    },
    wave: {
      title: "Safety Compliance Metrics (2-Wave)",
      waves: [
        {
          label: "Audit Inspections",
          color: "#f59e0b",
          path: "M 0 50 Q 30 30, 60 45 T 120 20 T 180 35 T 240 15 L 240 100 L 0 100 Z",
          linePath: "M 0 50 Q 30 30, 60 45 T 120 20 T 180 35 T 240 15",
          peakX: 60, peakY: 45,
        },
        {
          label: "Compliance Rating",
          color: "#10b981",
          path: "M 0 72 Q 40 55, 80 65 T 160 40 T 240 58 L 240 100 L 0 100 Z",
          linePath: "M 0 72 Q 40 55, 80 65 T 160 40 T 240 58",
          peakX: 80, peakY: 65,
        }
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
    },
    wave: {
      title: "External Audit Tracking Curves",
      waves: [
        {
          label: "Verification Checklist",
          color: "#10b981",
          path: "M 0 75 Q 40 50, 80 65 T 160 30 T 240 45 L 240 100 L 0 100 Z",
          linePath: "M 0 75 Q 40 50, 80 65 T 160 30 T 240 45",
          peakX: 80, peakY: 65,
        },
        {
          label: "Flagged Anomalies",
          color: "#ef4444",
          path: "M 0 90 Q 50 82, 100 88 T 200 78 T 240 85 L 240 100 L 0 100 Z",
          linePath: "M 0 90 Q 50 82, 100 88 T 200 78 T 240 85",
          peakX: 100, peakY: 88,
        }
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
    },
    wave: {
      title: "Procurement Pipeline Waves",
      waves: [
        {
          label: "Approved Budgets",
          color: "#3b82f6",
          path: "M 0 65 Q 30 35, 60 50 T 120 15 T 180 40 T 240 20 L 240 100 L 0 100 Z",
          linePath: "M 0 65 Q 30 35, 60 50 T 120 15 T 180 40 T 240 20",
          peakX: 60, peakY: 50,
        },
        {
          label: "Delivered Items",
          color: "#10b981",
          path: "M 0 80 Q 40 60, 80 72 T 160 48 T 240 62 L 240 100 L 0 100 Z",
          linePath: "M 0 80 Q 40 60, 80 72 T 160 48 T 240 62",
          peakX: 80, peakY: 72,
        }
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
    },
    wave: {
      title: "Calibration Workload Curves",
      waves: [
        {
          label: "Calibration Job Cards",
          color: "#8b5cf6",
          path: "M 0 70 Q 40 45, 80 60 T 160 30 T 240 50 L 240 100 L 0 100 Z",
          linePath: "M 0 70 Q 40 45, 80 60 T 160 30 T 240 50",
          peakX: 80, peakY: 60,
        },
        {
          label: "Equipment Setups",
          color: "#0ea5e9",
          path: "M 0 82 Q 35 60, 70 75 T 140 45 T 240 65 L 240 100 L 0 100 Z",
          linePath: "M 0 82 Q 35 60, 70 75 T 140 45 T 240 65",
          peakX: 70, peakY: 75,
        }
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
    },
    wave: {
      title: "Session Visitor Waves (2-Wave)",
      waves: [
        {
          label: "Public Specifications Search",
          color: "#64748b",
          path: "M 0 80 Q 45 60, 90 75 T 180 40 T 240 65 L 240 100 L 0 100 Z",
          linePath: "M 0 80 Q 45 60, 90 75 T 180 40 T 240 65",
          peakX: 90, peakY: 75,
        },
        {
          label: "Inquiry Sessions",
          color: "#3b82f6",
          path: "M 0 90 Q 30 78, 80 85 T 160 70 T 240 82 L 240 100 L 0 100 Z",
          linePath: "M 0 90 Q 30 78, 80 85 T 160 70 T 240 82",
          peakX: 80, peakY: 85,
        }
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

// ── Horizontal Progress Chart Graph (Replaces My Monthly Activity) ──────
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
          {/* Progress Track with matching category accent and custom inner shadow */}
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

// ── Multi-Channel Overlapping Wavy Curve Graph Logic ──────────────────
function MultiWavyCurveChart({ config }) {
  const waves = config.wave.waves || [];

  return (
    <div className="flex flex-col justify-between h-full font-sans">
      <div className="relative flex-1 h-44">
        {/* SVG Viewport */}
        <svg viewBox="0 0 240 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            {/* Generate individual gradient definitions for each overlapping wave */}
            {waves.map((w, idx) => (
              <linearGradient key={idx} id={`waveGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={w.color} stopOpacity="0.20" />
                <stop offset="100%" stopColor={w.color} stopOpacity="0.00" />
              </linearGradient>
            ))}
          </defs>

          {/* Grids tracks */}
          <line x1="0" y1="25" x2="240" y2="25" stroke="#f8fafc" strokeWidth="0.75" />
          <line x1="0" y1="50" x2="240" y2="50" stroke="#f1f5f9" strokeWidth="0.75" />
          <line x1="0" y1="75" x2="240" y2="75" stroke="#f8fafc" strokeWidth="0.75" />

          {/* Render each wave area and line dynamically */}
          {waves.map((w, idx) => (
            <g key={idx} className="transition-all duration-500 ease-in-out">
              {/* Overlapping Gradient Area */}
              <path
                d={w.path}
                fill={`url(#waveGrad-${idx})`}
                className="opacity-70 transition-all duration-500 ease-in-out"
              />

              {/* Smooth Bezier Wavy Line */}
              <path
                d={w.linePath}
                fill="none"
                stroke={w.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                className="transition-all duration-500 ease-in-out"
              />

              {/* Glowing peak checkpoint indicators */}
              {w.peakX && w.peakY && (
                <g>
                  <circle cx={w.peakX} cy={w.peakY} r="4.5" fill="#white" stroke={w.color} strokeWidth="2.5" className="animate-pulse" />
                  <circle cx={w.peakX} cy={w.peakY} r="1.5" fill={w.color} />
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Multi-channel telemetry label legends */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 px-1 border-t border-slate-100 pt-3.5 select-none">
        {waves.map((w, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: w.color }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: w.color }} />
            </span>
            <span className="text-[10px] font-bold text-ink-soft font-sans uppercase tracking-wider">
              {w.label} (Channel {idx + 1})
            </span>
          </div>
        ))}
        <div className="ml-auto text-[9px] font-bold text-ink-soft/40 uppercase tracking-widest font-sans flex items-center gap-1.5">
          <span>Active Channels: {waves.length}</span>
          <span>·</span>
          <span>Telemetry Sync: Active</span>
        </div>
      </div>
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

        {/* Horizontal Progress Chart (Replaces My Monthly Activity Bar Graph) */}
        <ChartCard
          title={config.progress.title}
          icon={Activity}
          colorClass="text-sky-600"
          borderClass="border-t-sky-500/80 hover:shadow-sky-500/5 hover:border-sky-200/50"
        >
          <HorizontalProgressBarChart config={config} />
        </ChartCard>
      </div>

      {/* Row 2: Full-width Multi-Channel Telemetry Wavy Curve (2-3 waves combination) */}
      <ChartCard
        title={config.wave.title}
        icon={AreaChart}
        colorClass="text-violet-600"
        borderClass="border-t-violet-500/80 hover:shadow-violet-500/5 hover:border-violet-200/50"
      >
        <MultiWavyCurveChart config={config} />
      </ChartCard>
    </section>
  );
}
