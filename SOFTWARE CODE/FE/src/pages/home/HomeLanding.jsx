// ============================================================================
// src/pages/home/HomeLanding.jsx — Billion-Dollar-Grade CMCMIS Portal Home
// ----------------------------------------------------------------------------
// SECTIONS (9 total):
//   1. Immersive Hero        — Dark gradient mesh, gradient headline, floating preview
//   2. Live Metrics Ticker   — Animated stat counters with glow
//   3. Workflow Pipeline     — Visual 5-step operational flow
//   4. Module Showcase       — Bento-grid module cards with glassmorphism
//   5. Core Capabilities     — Premium feature cards with icon glow rings
//   6. Technology Highlights — RBAC, Analytics, Audit Trail, Smart Search
//   7. Mission & Philosophy  — ISRO-branded quote with accent border
//   8. Final CTA Banner      — Gradient background with action
//   9. Premium Footer        — Multi-column with branding
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  FileText,
  Gauge,
  Globe,
  Lock,
  Monitor,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  Zap,
  Activity,
  Eye,
  Layers,
  TrendingUp,
  Award,
  Target,
  Cpu,
  Fingerprint,
  BarChart2,
  FileSearch,
} from 'lucide-react';

// ── Animated counter hook ──────────────────────────────────────────────
function useAnimatedCounter(target, duration = 2000, startOnMount = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const start = useCallback(() => {
    if (hasStarted) return;
    setHasStarted(true);
    const startTime = performance.now();
    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, hasStarted]);

  useEffect(() => {
    if (startOnMount) start();
  }, [startOnMount, start]);

  return { count, start };
}

// ── Intersection observer hook for scroll reveal ──────────────────────
function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView];
}

// ── Module definitions ────────────────────────────────────────────────
const modules = [
  { label: 'Dashboard', to: '/dashboard', icon: Gauge, desc: 'Live operational KPIs, workload status, and activity signals.', accent: 'from-sky-500 to-blue-600', glow: 'shadow-sky-500/20', size: 'large' },
  { label: 'Job Requests', to: '/job-requests', icon: FileText, desc: 'Create, review, and track service requests end-to-end.', accent: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/20', size: 'normal' },
  { label: 'Conversion', to: '/conversion', icon: ArrowRight, desc: 'Convert approved requests into actionable job cards.', accent: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20', size: 'normal' },
  { label: 'Job Cards', to: '/job-cards', icon: ClipboardList, desc: 'Track assigned work, progress, documents, and completion.', accent: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20', size: 'large' },
  { label: 'Equipment', to: '/equipment', icon: Wrench, desc: 'Search instruments, view records, and confirm status.', accent: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/20', size: 'normal' },
  { label: 'Schedule', to: '/schedule', icon: Calendar, desc: 'Review upcoming activity and lab workload timing.', accent: 'from-cyan-500 to-sky-600', glow: 'shadow-cyan-500/20', size: 'normal' },
  { label: 'Inquiry', to: '/inquiry', icon: Search, desc: 'Cross-entity search: equipment, vendors, products, and more.', accent: 'from-indigo-500 to-blue-600', glow: 'shadow-indigo-500/20', size: 'normal' },
  { label: 'Reports', to: '/reports', icon: BarChart3, desc: 'Filter data, export PDF/Excel, and print summaries.', accent: 'from-fuchsia-500 to-pink-600', glow: 'shadow-fuchsia-500/20', size: 'normal' },
  { label: 'Analytics', to: '/analytics', icon: TrendingUp, desc: 'Trends, workload charts, utilization, and performance.', accent: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/20', size: 'large' },
  { label: 'Notifications', to: '/notifications', icon: Bell, desc: 'Alerts, assignments, approvals, and workflow updates.', accent: 'from-yellow-500 to-amber-600', glow: 'shadow-yellow-500/20', size: 'normal' },
  { label: 'Administration', to: '/admin/users', icon: Users, desc: 'Users, employees, master data, verification, and audit.', accent: 'from-slate-500 to-gray-600', glow: 'shadow-slate-500/20', size: 'normal' },
];

// ── Workflow steps ────────────────────────────────────────────────────
const workflowSteps = [
  { step: '01', title: 'Request', desc: 'User submits a calibration or maintenance request', icon: FileText, color: 'from-sky-400 to-blue-500' },
  { step: '02', title: 'Review', desc: 'Lab In-Charge reviews and approves the request', icon: Eye, color: 'from-violet-400 to-purple-500' },
  { step: '03', title: 'Assign', desc: 'Approved request converts into a structured Job Card', icon: ClipboardList, color: 'from-amber-400 to-orange-500' },
  { step: '04', title: 'Execute', desc: 'Lab Engineer performs the calibration or repair work', icon: Wrench, color: 'from-emerald-400 to-teal-500' },
  { step: '05', title: 'Report', desc: 'Results are documented, certified, and archived', icon: BarChart3, color: 'from-rose-400 to-pink-500' },
];

// ── Capabilities ──────────────────────────────────────────────────────
const capabilities = [
  { title: 'Role-Based Access Control', desc: 'Every action is permission-gated. 10 roles, 50+ permissions, zero unauthorized access.', icon: Shield },
  { title: 'Real-Time Analytics', desc: 'Live dashboards with workload distribution, trend charts, and utilization metrics.', icon: Activity },
  { title: 'Complete Audit Trail', desc: 'Every mutation is logged. Full traceability from request to completion.', icon: Fingerprint },
  { title: 'Intelligent Search', desc: 'Global Ctrl+K search across equipment, vendors, job requests, cards, and products.', icon: FileSearch },
  { title: 'Multi-Format Export', desc: 'Generate PDF certificates, Excel data dumps, and print-ready formal reports.', icon: Layers },
  { title: 'Lab Capacity Planning', desc: 'Visualize lab workload, engineer assignments, and capacity utilization.', icon: BarChart2 },
];

// ── Technology features ───────────────────────────────────────────────
const techFeatures = [
  { title: 'Defense-in-Depth Security', desc: 'CSRF tokens, cookie-based sessions, dual FE+BE permission enforcement, and encrypted transport.', icon: Lock, color: 'from-red-500 to-rose-600' },
  { title: 'Instant Data Sync', desc: 'React Query with 30s stale windows, optimistic updates, and automatic background refetching.', icon: Zap, color: 'from-amber-500 to-yellow-600' },
  { title: 'Operational Intelligence', desc: 'KPI-driven dashboard with clickable metrics that deep-link into filtered module views.', icon: Cpu, color: 'from-blue-500 to-cyan-600' },
  { title: 'Enterprise-Grade Reliability', desc: 'Built for ISRO SAC operations — zero-downtime architecture with graceful error recovery.', icon: Globe, color: 'from-emerald-500 to-green-600' },
];

// ── Stats data ────────────────────────────────────────────────────────
const stats = [
  { label: 'Equipment Managed', value: 12000, suffix: '+', icon: Wrench },
  { label: 'Job Cards Processed', value: 50000, suffix: '+', icon: ClipboardList },
  { label: 'Active Users', value: 500, suffix: '+', icon: Users },
  { label: 'Labs Connected', value: 24, suffix: '', icon: Monitor },
  { label: 'Reports Generated', value: 8500, suffix: '+', icon: BarChart3 },
  { label: 'Audit Records', value: 120000, suffix: '+', icon: Database },
];


// ════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════

export function HomeLanding() {
  return (
    <div className="-m-8 min-h-screen bg-slate-950 text-white overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — IMMERSIVE HERO
          ═══════════════════════════════════════════════════════════ */}
      <HeroSection />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — LIVE METRICS TICKER
          ═══════════════════════════════════════════════════════════ */}
      <MetricsTicker />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — WORKFLOW PIPELINE
          ═══════════════════════════════════════════════════════════ */}
      <WorkflowPipeline />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — MODULE SHOWCASE (BENTO GRID)
          ═══════════════════════════════════════════════════════════ */}
      <ModuleShowcase />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — CORE CAPABILITIES
          ═══════════════════════════════════════════════════════════ */}
      <Capabilities />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6 — TECHNOLOGY HIGHLIGHTS
          ═══════════════════════════════════════════════════════════ */}
      <TechHighlights />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7 — MISSION & PHILOSOPHY
          ═══════════════════════════════════════════════════════════ */}
      <MissionSection />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8 — FINAL CTA BANNER
          ═══════════════════════════════════════════════════════════ */}
      <CtaBanner />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 9 — PREMIUM FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <PremiumFooter />
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 1 — HERO
// ════════════════════════════════════════════════════════════════════════

function HeroSection() {
  const [heroRef, heroInView] = useInView();

  return (
    <section ref={heroRef} className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* ── Animated mesh background ─────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 animate-gradient-shift" />

      {/* Mesh orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-mesh" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/15 rounded-full blur-[100px] animate-mesh-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px] animate-float-slow" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* ── Hero content ─────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          {/* Left — Text content */}
          <div className={`transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2 mb-8">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-sm font-medium text-slate-300">ISRO SAC — Operational Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              <span className="block text-white">Calibration &</span>
              <span className="block bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent animate-text-shimmer mt-1">
                Maintenance
              </span>
              <span className="block text-white mt-1">Control System</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-8 text-lg md:text-xl text-slate-400 max-w-xl leading-relaxed">
              The unified platform powering equipment management, lab workflows,
              job execution, scheduling, analytics, and administrative controls
              for India's premier space research organization.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/dashboard"
                className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-sky-500/25 transition-all duration-300 hover:shadow-sky-500/40 hover:scale-[1.02] shimmer-effect"
              >
                Open Dashboard
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/reports"
                className="group inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/25"
              >
                View Reports
                <BarChart3 size={18} className="text-slate-400 group-hover:text-white transition-colors" />
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>RBAC Protected</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Zap size={16} className="text-amber-400" />
                <span>Real-time Data</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Award size={16} className="text-sky-400" />
                <span>ISRO SAC</span>
              </div>
            </div>
          </div>

          {/* Right — Floating system preview */}
          <div className={`hidden lg:block transition-all duration-1000 delay-300 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <SystemPreviewCard />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
        <span className="text-xs text-slate-500 font-medium">Scroll to explore</span>
        <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex justify-center pt-2">
          <div className="w-1.5 h-3 rounded-full bg-slate-400 animate-pulse" />
        </div>
      </div>
    </section>
  );
}


// ── Floating System Preview ───────────────────────────────────────────

function SystemPreviewCard() {
  return (
    <div className="relative animate-float">
      {/* Glow behind */}
      <div className="absolute -inset-4 bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-violet-500/20 rounded-3xl blur-2xl" />

      {/* Card */}
      <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 pb-4 border-b border-white/10">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs text-slate-500 font-medium">CMCMIS — Live Dashboard</span>
        </div>

        {/* Mini dashboard */}
        <div className="mt-5 grid grid-cols-[110px_1fr] gap-4">
          {/* Mini sidebar */}
          <div className="rounded-2xl bg-white/5 p-3 space-y-2">
            {['Dashboard', 'Requests', 'Job Cards', 'Equipment', 'Reports'].map((item, i) => (
              <div
                key={item}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  i === 0
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Mini content */}
          <div className="space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Active Jobs', value: '147', trend: '+12%', color: 'text-emerald-400' },
                { label: 'Pending', value: '38', trend: '-5%', color: 'text-amber-400' },
                { label: 'Equipment', value: '2.4K', trend: '+8%', color: 'text-sky-400' },
                { label: 'Completed', value: '892', trend: '+24%', color: 'text-violet-400' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl bg-white/5 p-3">
                  <div className="text-lg font-bold text-white">{kpi.value}</div>
                  <div className="text-[11px] text-slate-500">{kpi.label}</div>
                  <div className={`text-[10px] font-semibold mt-1 ${kpi.color}`}>{kpi.trend}</div>
                </div>
              ))}
            </div>

            {/* Mini chart */}
            <div className="rounded-xl bg-white/5 p-4 h-24 flex items-end gap-1.5">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-sky-500/60 to-sky-400/30 transition-all"
                  style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 2 — METRICS TICKER
// ════════════════════════════════════════════════════════════════════════

function MetricsTicker() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative border-y border-white/5 bg-slate-950/80 backdrop-blur-sm">
      {/* Subtle gradient line on top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 py-16 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {stats.map((stat, index) => (
            <StatCounter key={stat.label} stat={stat} index={index} animate={inView} />
          ))}
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
    </section>
  );
}

function StatCounter({ stat, index, animate }) {
  const { count } = useAnimatedCounter(stat.value, 2000 + index * 200, animate);
  const Icon = stat.icon;

  return (
    <div
      className="text-center group animate-count-up"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mb-4 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
        <Icon size={20} className="text-sky-400" />
      </div>
      <div className="text-3xl md:text-4xl font-bold text-white tabular-nums">
        {count.toLocaleString()}{stat.suffix}
      </div>
      <div className="mt-2 text-sm text-slate-500 font-medium">{stat.label}</div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 3 — WORKFLOW PIPELINE
// ════════════════════════════════════════════════════════════════════════

function WorkflowPipeline() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Section header */}
        <div className={`text-center mb-20 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 mb-6">
            <Sparkles size={14} className="text-sky-400" />
            <span className="text-sm font-medium text-sky-300">How It Works</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            End-to-End <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Operational Flow</span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto">
            From request submission to final certification — every step is tracked, audited, and role-protected.
          </p>
        </div>

        {/* Pipeline steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className={`relative transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Connector line (not on last) */}
                {index < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] right-0 h-px">
                    <div className={`h-full bg-gradient-to-r ${step.color} opacity-30 transition-all duration-1000 ${inView ? 'w-full' : 'w-0'}`} style={{ transitionDelay: `${index * 200 + 500}ms` }} />
                  </div>
                )}

                {/* Step card */}
                <div className="group relative flex flex-col items-center text-center p-6 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                  {/* Step number */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center justify-center h-7 px-3 rounded-full bg-slate-800 border border-white/10 text-xs font-bold text-slate-400">
                      {step.step}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`mt-4 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={26} className="text-white" />
                  </div>

                  {/* Text */}
                  <h3 className="mt-5 text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 4 — MODULE SHOWCASE (BENTO GRID)
// ════════════════════════════════════════════════════════════════════════

function ModuleShowcase() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900/80" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 mb-6">
            <Layers size={14} className="text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">Modules</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Everything You Need, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">One Platform</span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto">
            Access any module directly. Permission-protected, role-aware navigation for every operational need.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod, index) => {
            const Icon = mod.icon;
            const isLarge = mod.size === 'large';

            return (
              <Link
                key={mod.label}
                to={mod.to}
                className={`group relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-7 transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-1 hover:shadow-2xl ${mod.glow} ${isLarge ? 'lg:col-span-1 lg:row-span-1' : ''} ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                {/* Gradient border glow on hover */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${mod.accent} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500`} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.accent} shadow-lg ${mod.glow} group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    {/* Arrow */}
                    <ChevronRight
                      size={20}
                      className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 mt-2"
                    />
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-white group-hover:text-white">
                    {mod.label}
                  </h3>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                    {mod.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 5 — CAPABILITIES
// ════════════════════════════════════════════════════════════════════════

function Capabilities() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950" />

      {/* Accent orb */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 mb-6">
            <Target size={14} className="text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Capabilities</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Built for <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Operational Clarity</span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto">
            Every feature is designed to reduce friction, increase visibility, and enforce accountability.
          </p>
        </div>

        {/* Capability grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, index) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className={`group relative rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Icon with glow ring */}
                <div className="relative inline-flex">
                  <div className="absolute inset-0 rounded-2xl bg-sky-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 group-hover:border-sky-500/30 transition-all duration-300">
                    <Icon size={24} className="text-sky-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>

                <h3 className="mt-6 text-lg font-bold text-white">{cap.title}</h3>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{cap.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 6 — TECHNOLOGY HIGHLIGHTS
// ════════════════════════════════════════════════════════════════════════

function TechHighlights() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36">
      <div className="absolute inset-0 bg-slate-950" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 mb-6">
            <Cpu size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Technology</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Enterprise-Grade <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Infrastructure</span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto">
            Mission-critical architecture built for reliability, security, and performance at scale.
          </p>
        </div>

        {/* Feature cards — 2x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {techFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`group relative rounded-3xl border border-white/[0.06] bg-white/[0.02] p-10 transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

                <div className="relative z-10 flex items-start gap-6">
                  <div className={`shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 7 — MISSION & PHILOSOPHY
// ════════════════════════════════════════════════════════════════════════

function MissionSection() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950" />

      {/* Background accent */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-80 h-80 bg-sky-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 md:px-12">
        <div className={`text-center transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Quote mark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-xl shadow-sky-500/25 mb-10">
            <Sparkles size={28} className="text-white" />
          </div>

          {/* Quote */}
          <blockquote className="text-3xl md:text-4xl font-bold text-white leading-snug">
            "Precision in measurement is the foundation of{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              excellence in space technology.
            </span>{' '}
            CMCMIS ensures every instrument is calibrated, every workflow is tracked, and every decision is data-driven."
          </blockquote>

          <div className="mt-10 flex flex-col items-center gap-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
            <p className="text-sm font-semibold text-sky-400">CMCMIS — ISRO Space Applications Centre</p>
            <p className="text-xs text-slate-500">Calibration & Maintenance Control Management Information System</p>
          </div>
        </div>
      </div>
    </section>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 8 — FINAL CTA BANNER
// ════════════════════════════════════════════════════════════════════════

function CtaBanner() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div className="absolute inset-0 bg-slate-950" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-12">
        <div className={`relative rounded-[2rem] overflow-hidden transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 animate-gradient-shift" />

          {/* Mesh overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />

          {/* Content */}
          <div className="relative z-10 px-10 py-16 md:px-16 md:py-20 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              Ready to Start Working?
            </h2>
            <p className="mt-5 text-lg text-sky-100/80 max-w-2xl mx-auto">
              Access your dashboard, manage equipment, track job cards, and generate reports — all in one unified platform.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-slate-900 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
              >
                Go to Dashboard
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/job-requests/new"
                className="group inline-flex items-center gap-3 rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:bg-white/20 hover:border-white/50"
              >
                Create Job Request
                <FileText size={18} className="text-sky-200" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// ════════════════════════════════════════════════════════════════════════
// SECTION 9 — PREMIUM FOOTER
// ════════════════════════════════════════════════════════════════════════

function PremiumFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/5 bg-slate-950">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <div className="text-base font-bold text-white">CMCMIS</div>
                <div className="text-xs text-slate-500">ISRO SAC Portal</div>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Calibration & Maintenance Control Management Information System for India's Space Applications Centre.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-bold text-white mb-5">Operations</h4>
            <ul className="space-y-3">
              {[
                { label: 'Dashboard', to: '/dashboard' },
                { label: 'Job Requests', to: '/job-requests' },
                { label: 'Job Cards', to: '/job-cards' },
                { label: 'Equipment', to: '/equipment' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-slate-500 hover:text-sky-400 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-5">Insights</h4>
            <ul className="space-y-3">
              {[
                { label: 'Reports', to: '/reports' },
                { label: 'Analytics', to: '/analytics' },
                { label: 'Schedule', to: '/schedule' },
                { label: 'Inquiry', to: '/inquiry' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-slate-500 hover:text-sky-400 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-5">System</h4>
            <ul className="space-y-3">
              {[
                { label: 'Administration', to: '/admin/users' },
                { label: 'Notifications', to: '/notifications' },
                { label: 'Profile', to: '/profile' },
                { label: 'About', to: '/about' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-slate-500 hover:text-sky-400 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            © {currentYear} CMCMIS — ISRO Space Applications Centre. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>System Operational</span>
            </div>
            <span className="text-xs text-slate-700">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
