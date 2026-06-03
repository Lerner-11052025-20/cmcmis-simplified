import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wrench,
} from 'lucide-react';

const moduleLinks = [
  { label: 'Dashboard', to: '/dashboard', icon: Gauge, desc: 'Live operational KPIs, workload status, equipment summary, and activity signals.' },
  { label: 'Job Requests', to: '/job-requests', icon: FileText, desc: 'Create, review, search, and track service requests from submission to action.' },
  { label: 'Conversion', to: '/conversion', icon: ArrowRight, desc: 'Convert approved requests into job cards with lab assignment and workflow control.' },
  { label: 'Job Cards', to: '/job-cards', icon: ClipboardList, desc: 'Track assigned work, progress, documents, completion, and history.' },
  { label: 'Equipment', to: '/equipment', icon: Wrench, desc: 'Search instruments, view equipment records, and confirm status before work.' },
  { label: 'Schedule', to: '/schedule', icon: Calendar, desc: 'Review upcoming activity, planned work, and lab workload timing.' },
  { label: 'Inquiry', to: '/inquiry', icon: Search, desc: 'Find records across equipment, vendors, job requests, job cards, and products.' },
  { label: 'Reports', to: '/reports', icon: BarChart3, desc: 'Filter data, review tables, export PDF/Excel, and print formal summaries.' },
  { label: 'Analytics', to: '/analytics', icon: BarChart3, desc: 'Use charts to understand trends, workload, utilization, and performance.' },
  { label: 'Notifications', to: '/notifications', icon: Bell, desc: 'Read alerts, assignments, approvals, and important workflow updates.' },
  { label: 'Administration', to: '/admin/users', icon: Users, desc: 'Manage users, employees, master data, verification, and audit where permitted.' },
];

const coreFeatures = [
  'Role-based guided access',
  'Clickable KPI navigation',
  'Global record search',
  'In-module table search',
  'Status timeline tracking',
  'PDF, Excel, and print reports',
];

const easeFeatures = [
  'Readable cards',
  'Clear sidebar groups',
  'Sticky top bar',
  'Quick guide badge',
  'Smart filters',
  'Visible status pills',
  'Simple profile menu',
  'Safe logout access',
  'Audit visibility',
  'Equipment lookup',
  'Report downloads',
  'Non-technical guides',
];

export function HomeLanding() {
  const [dark, setDark] = useState(false);
  const theme = useMemo(() => ({
    page: dark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-950',
    panel: dark ? 'border-white/10 bg-white/[0.06] text-white shadow-none' : 'border-slate-200 bg-white text-slate-950 shadow-sm',
    soft: dark ? 'text-slate-300' : 'text-slate-600',
    muted: dark ? 'text-slate-400' : 'text-slate-500',
    band: dark ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white',
    chip: dark ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }), [dark]);

  return (
    <div className={`-m-6 min-h-[calc(100vh-4rem)] ${theme.page} transition-colors duration-300`}>
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        <section className={`overflow-hidden rounded-3xl border ${theme.band}`}>
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-6 md:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${theme.chip}`}>
                  <ShieldCheck size={14} strokeWidth={2.2} />
                  CMCMIS Portal Home
                </span>
                <button
                  type="button"
                  onClick={() => setDark((value) => !value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${dark ? 'border-white/15 bg-white/10 text-white hover:bg-white/15' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {dark ? <Sun size={14} /> : <Moon size={14} />}
                  {dark ? 'Light Theme' : 'Dark Theme'}
                </button>
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">
                Calibration and Maintenance Control Management Information System
              </h1>
              <p className={`mt-5 max-w-3xl text-base leading-8 ${theme.soft}`}>
                CMCMIS is a role-based platform for managing equipment, job requests, job cards,
                lab workflow, schedules, reports, analytics, and administrative controls in one structured system.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
                  Open Dashboard
                  <ArrowRight size={16} strokeWidth={1.9} />
                </Link>
                <Link to="/reports" className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${dark ? 'border-white/15 bg-white/10 text-white hover:bg-white/15' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  View Reports
                  <BarChart3 size={16} strokeWidth={1.9} />
                </Link>
              </div>
            </div>

            <div className={`border-t p-6 md:p-10 lg:border-l lg:border-t-0 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
              <SystemPreview dark={dark} />
            </div>
          </div>
        </section>

        <SectionHeader dark={dark} eyebrow="Module links" title="Open the right CMCMIS module" text="Use these links as a role-aware launchpad. If a module is outside your role, the system protection remains active." />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moduleLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} to={item.to} className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 ${theme.panel} ${dark ? 'hover:border-sky-400/40 hover:bg-sky-400/10' : 'hover:border-sky-200 hover:shadow-[0_14px_32px_rgba(14,165,233,0.12)]'}`}>
                <div className="flex items-center justify-between gap-4">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${dark ? 'bg-sky-400/10 text-sky-200' : 'bg-sky-50 text-sky-600'}`}>
                    <Icon size={21} strokeWidth={1.9} />
                  </span>
                  <ArrowRight className={`transition group-hover:translate-x-1 ${theme.muted}`} size={17} />
                </div>
                <h3 className={`mt-4 text-base font-semibold ${dark ? 'text-white' : 'text-slate-950'}`}>{item.label}</h3>
                <p className={`mt-2 text-sm leading-6 ${theme.soft}`}>{item.desc}</p>
              </Link>
            );
          })}
        </section>

        <SectionHeader dark={dark} eyebrow="Core features" title="Built for operational clarity" text="The system connects request creation, lab execution, equipment control, reporting, and administration into one workflow." />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coreFeatures.map((feature) => (
            <FeatureCard key={feature} dark={dark} icon={CheckCircle2} title={feature} />
          ))}
        </section>

        <SectionHeader dark={dark} eyebrow="Ease of using CMCMIS" title="12 special user-friendly features" text="Small interface details make the software easier for non-technical and technical users alike." />
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {easeFeatures.map((feature, index) => (
            <div key={feature} className={`rounded-2xl border p-4 ${theme.panel}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${dark ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'}`}>
                  {index + 1}
                </span>
                <span className="text-sm font-semibold">{feature}</span>
              </div>
            </div>
          ))}
        </section>

        <footer className={`mt-8 rounded-2xl border px-6 py-5 ${theme.panel}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">CMCMIS - ISRO SAC Portal</p>
              <p className={`mt-1 text-xs ${theme.muted}`}>Calibration, maintenance, equipment, reports, and lab workflow management.</p>
            </div>
            <div className={`text-xs font-semibold ${theme.muted}`}>Frontend landing page for all signed-in roles</div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SectionHeader({ dark, eyebrow, title, text }) {
  return (
    <section className="mt-8 mb-4">
      <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-sky-300' : 'text-sky-700'}`}>{eyebrow}</p>
      <h2 className={`mt-2 text-2xl font-semibold tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      <p className={`mt-2 max-w-3xl text-sm leading-6 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p>
    </section>
  );
}

function FeatureCard({ dark, icon: Icon, title }) {
  return (
    <div className={`rounded-2xl border p-5 ${dark ? 'border-white/10 bg-white/[0.06]' : 'border-slate-200 bg-white shadow-sm'}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${dark ? 'bg-indigo-400/10 text-indigo-200' : 'bg-indigo-50 text-indigo-600'}`}>
        <Icon size={20} strokeWidth={1.9} />
      </span>
      <p className={`mt-4 text-sm font-semibold ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</p>
    </div>
  );
}

function SystemPreview({ dark }) {
  return (
    <div className={`rounded-3xl border p-4 ${dark ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-white shadow-xl'}`}>
      <div className="flex items-center gap-2 border-b border-slate-200/40 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className={`ml-2 text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-400'}`}>CMCMIS workspace</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[130px_1fr]">
        <div className={`rounded-2xl p-3 ${dark ? 'bg-white/[0.06]' : 'bg-slate-50'}`}>
          {['Dashboard', 'Requests', 'Equipment', 'Reports'].map((item, index) => (
            <div key={item} className={`mb-2 rounded-xl px-3 py-2 text-xs font-semibold ${index === 0 ? 'bg-sky-600 text-white' : dark ? 'text-slate-300' : 'text-slate-500'}`}>{item}</div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {['Jobs', 'Assets', 'Users', 'Reports'].map((item) => (
              <div key={item} className={`rounded-2xl p-4 ${dark ? 'bg-white/[0.06]' : 'bg-slate-50'}`}>
                <div className="text-xl font-semibold">24</div>
                <div className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{item}</div>
              </div>
            ))}
          </div>
          <div className={`h-28 rounded-2xl ${dark ? 'bg-sky-400/10' : 'bg-sky-50'}`} />
        </div>
      </div>
    </div>
  );
}
