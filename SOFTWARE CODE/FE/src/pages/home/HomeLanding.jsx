// ============================================================================
// src/pages/home/HomeLanding.jsx — Billion-Dollar-Grade CMCMIS Portal Home
// ----------------------------------------------------------------------------
// SECTIONS (12 total):
//   1. Immersive Hero        — Dark gradient mesh, gradient headline, floating preview
//   2. Live Metrics Ticker   — Animated stat counters with glow
//   3. Live Telemetry Feed   — [NEW] Interactive simulated live activity logs
//   4. Workflow Pipeline     — Visual 5-step operational flow
//   5. Module Showcase       — Bento-grid module cards with glassmorphism
//   6. Schedule Sneak Peek   — [NEW] Visual lab queue & calendar sneak peek
//   7. Core Capabilities     — Premium feature cards with icon glow rings
//   8. Technology Highlights — RBAC, Analytics, Audit Trail, Smart Search
//   9. Mission & Philosophy  — ISRO-branded quote with accent border
//   10. FAQ Accordion        — [NEW] Interactive accordion for common procedures
//   11. Final CTA Banner     — Gradient background with action
//   12. Premium Footer       — Multi-column with branding
// ============================================================================

import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
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
  Sun,
  Moon,
  Radio,
  ChevronDown,
  Clock,
  HelpCircle,
} from 'lucide-react';

// Create Theme Context for local page-level theme toggling
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

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
  { label: 'Dashboard', to: '/dashboard', icon: Gauge, desc: 'Live operational KPIs, workload status, and activity signals.', accent: 'from-sky-500 to-blue-600', glow: 'shadow-sky-500/20', lightGlow: 'shadow-sky-500/5', size: 'large' },
  { label: 'Job Requests', to: '/job-requests', icon: FileText, desc: 'Create, review, and track service requests end-to-end.', accent: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/20', lightGlow: 'shadow-violet-500/5', size: 'normal' },
  { label: 'Conversion', to: '/conversion', icon: ArrowRight, desc: 'Convert approved requests into actionable job cards.', accent: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20', lightGlow: 'shadow-amber-500/5', size: 'normal' },
  { label: 'Job Cards', to: '/job-cards', icon: ClipboardList, desc: 'Track assigned work, progress, documents, and completion.', accent: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20', lightGlow: 'shadow-emerald-500/5', size: 'large' },
  { label: 'Equipment', to: '/equipment', icon: Wrench, desc: 'Search instruments, view records, and confirm status.', accent: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/20', lightGlow: 'shadow-rose-500/5', size: 'normal' },
  { label: 'Schedule', to: '/schedule', icon: Calendar, desc: 'Review upcoming activity and lab workload timing.', accent: 'from-cyan-500 to-sky-600', glow: 'shadow-cyan-500/20', lightGlow: 'shadow-cyan-500/5', size: 'normal' },
  { label: 'Inquiry', to: '/inquiry', icon: Search, desc: 'Cross-entity search: equipment, vendors, products, and more.', accent: 'from-indigo-500 to-blue-600', glow: 'shadow-indigo-500/20', lightGlow: 'shadow-indigo-500/5', size: 'normal' },
  { label: 'Reports', to: '/reports', icon: BarChart3, desc: 'Filter data, export PDF/Excel, and print summaries.', accent: 'from-fuchsia-500 to-pink-600', glow: 'shadow-fuchsia-500/20', lightGlow: 'shadow-fuchsia-500/5', size: 'normal' },
  { label: 'Analytics', to: '/analytics', icon: TrendingUp, desc: 'Trends, workload charts, utilization, and performance.', accent: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/20', lightGlow: 'shadow-blue-500/5', size: 'large' },
  { label: 'Notifications', to: '/notifications', icon: Bell, desc: 'Alerts, assignments, approvals, and workflow updates.', accent: 'from-yellow-500 to-amber-600', glow: 'shadow-yellow-500/20', lightGlow: 'shadow-yellow-500/5', size: 'normal' },
  { label: 'Administration', to: '/admin/users', icon: Users, desc: 'Users, employees, master data, verification, and audit.', accent: 'from-slate-500 to-gray-600', glow: 'shadow-slate-500/20', lightGlow: 'shadow-slate-500/5', size: 'normal' },
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
  { label: 'Equipment Managed', value: 5700, suffix: '+', icon: Wrench },
  { label: 'Job Cards Processed', value: 23000, suffix: '+', icon: ClipboardList },
  { label: 'Active Users', value: 2000, suffix: '+', icon: Users },
  { label: 'Labs Connected', value: 50, suffix: '', icon: Monitor },
  { label: 'Reports Generated', value: 20, suffix: '+', icon: BarChart3 },
  { label: 'Audit Records', value: 1000, suffix: '+', icon: Database },
];

// ── Simulated live activity logs ──────────────────────────────────────
const simulatedActivities = [
  { time: '10s ago', type: 'calibration', lab: 'TME Calibration Lab', user: 'Lab Engineer A', desc: 'Completed calibration of Spectrum Analyzer #SA-904', status: 'success' },
  { time: '1m ago', type: 'job_request', lab: 'FPE Repair Lab', user: 'Normal User B', desc: 'Created emergency maintenance request for Chamber #CH-04', status: 'info' },
  { time: '3m ago', type: 'conversion', lab: 'TME Repair Lab', user: 'Lab In-Charge C', desc: 'Approved Job Request #JR-2041 and created Job Card #JC-940', status: 'success' },
  { time: '5m ago', type: 'security', lab: 'System Wide', user: 'Super Admin', desc: 'Updated system permissions for normal users role', status: 'warning' },
  { time: '8m ago', type: 'verification', lab: 'TME Calibration Lab', user: 'Lab In-Charge A', desc: 'Verified certificate calibration for Multimeter #MM-1205', status: 'success' },
];

// ── FAQs ──────────────────────────────────────────────────────────────
const faqs = [
  { q: 'How do I submit a new Calibration or Maintenance Request?', a: 'Navigate to the "Job Requests" module and click "Create Job Request". Fill in the equipment identification code, select the type of request (Calibration, Emergency Breakdown, or Regular Maintenance), and describe the symptoms or calibration parameters.' },
  { q: 'What is the "Conversion Workspace" used for?', a: 'The Conversion workspace is scoped for Lab In-Charges and Admins. It displays all approved Job Requests. They can convert an approved request into a structured Job Card, assign it to a Lab Engineer, and define target timelines in a single consolidated workflow.' },
  { q: 'How does the Role-Based Access Control (RBAC) work?', a: 'Every page, element, and API endpoint is permission-gated. For example, normal users can only create and view their own job requests, while Lab In-Charges manage assignments, and Lab Engineers sign off on diagnostic logs.' },
  { q: 'Can I export certificates and log files in offline formats?', a: 'Yes. In the Reports and Job Card detail view, you can generate formal PDF calibration certificates, download detailed Excel worksheets, or launch print-ready formats optimized for auditing requirements.' },
];

// ════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════

export function HomeLanding() {
  // Read persisted theme or default to 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem('cmcmis.home.theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const nextTheme = t === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem('cmcmis.home.theme', nextTheme);
      } catch (e) {
        // Safe fall-through if storage is blocked
      }
      return nextTheme;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`-m-8 min-h-screen transition-colors duration-500 overflow-hidden ${
        theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1 — IMMERSIVE HERO
            ═══════════════════════════════════════════════════════════ */}
        <HeroSection />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2 — LIVE METRICS TICKER
            ═══════════════════════════════════════════════════════════ */}
        <MetricsTicker />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3 — [NEW] LIVE TELEMETRY FEED (ACTIVITY LOGS)
            ═══════════════════════════════════════════════════════════ */}
        <LiveTelemetryFeed />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4 — WORKFLOW PIPELINE
            ═══════════════════════════════════════════════════════════ */}
        <WorkflowPipeline />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 5 — MODULE SHOWCASE (BENTO GRID)
            ═══════════════════════════════════════════════════════════ */}
        <ModuleShowcase />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 6 — [NEW] LABORATORY SCHEDULE SNEAK PEEK
            ═══════════════════════════════════════════════════════════ */}
        <ScheduleCalendarSneakPeek />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 7 — CORE CAPABILITIES
            ═══════════════════════════════════════════════════════════ */}
        <Capabilities />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 8 — TECHNOLOGY HIGHLIGHTS
            ═══════════════════════════════════════════════════════════ */}
        <TechHighlights />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 9 — MISSION & PHILOSOPHY
            ═══════════════════════════════════════════════════════════ */}
        <MissionSection />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 10 — [NEW] FAQ ACCORDION
            ═══════════════════════════════════════════════════════════ */}
        <FaqAccordion />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 11 — FINAL CTA BANNER
            ═══════════════════════════════════════════════════════════ */}
        <CtaBanner />

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 12 — PREMIUM FOOTER
            ═══════════════════════════════════════════════════════════ */}
        <PremiumFooter />
      </div>
    </ThemeContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 1 — HERO
// ════════════════════════════════════════════════════════════════════════

function HeroSection() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [heroRef, heroInView] = useInView();

  return (
    <section ref={heroRef} className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* ── Theme Switcher Button ─────────────────────────────── */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle visual theme"
        className={`absolute top-6 right-6 z-50 p-3.5 rounded-2xl border transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 ${
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-350 shadow-slate-200/50'
        }`}
      >
        {theme === 'dark' ? (
          <Sun size={18} className="text-yellow-400 animate-spin-slow" />
        ) : (
          <Moon size={18} className="text-indigo-600" />
        )}
      </button>

      {/* ── Animated mesh background ─────────────────────────────── */}
      <div className={`absolute inset-0 transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 animate-gradient-shift' 
          : 'bg-gradient-to-br from-white via-slate-50 to-indigo-50/20 animate-gradient-shift'
      }`} />

      {/* Mesh orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] animate-mesh transition-colors duration-500 ${
          theme === 'dark' ? 'bg-indigo-600/20' : 'bg-indigo-400/10'
        }`} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] animate-mesh-delayed transition-colors duration-500 ${
          theme === 'dark' ? 'bg-sky-500/15' : 'bg-sky-300/10'
        }`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] animate-float-slow transition-colors duration-500 ${
          theme === 'dark' ? 'bg-violet-600/10' : 'bg-violet-400/8'
        }`} />
      </div>

      {/* Grid overlay */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${
        theme === 'dark' ? 'opacity-[0.03]' : 'opacity-[0.06]'
      }`} style={{
        backgroundImage: theme === 'dark'
          ? 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)'
          : 'linear-gradient(rgba(79,93,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(79,93,255,0.08) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* ── Hero content ─────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-12 w-full">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          {/* Left — Text content */}
          <div className={`transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2 mb-8 backdrop-blur-sm transition-colors duration-500 ${
              theme === 'dark'
                ? 'border-white/10 bg-white/5 text-slate-300'
                : 'border-slate-200 bg-slate-100/80 text-slate-650'
            }`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-sm font-semibold tracking-wide">ISRO SAC — Operational Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              <span className={`block transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Calibration &</span>
              <span className={`block bg-gradient-to-r bg-clip-text text-transparent animate-text-shimmer mt-1 ${
                theme === 'dark' 
                  ? 'from-sky-400 via-blue-400 to-indigo-400' 
                  : 'from-sky-600 via-blue-600 to-indigo-600'
              }`}>
                Maintenance
              </span>
              <span className={`block mt-1 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Control System</span>
            </h1>

            {/* Subtitle */}
            <p className={`mt-8 text-lg md:text-xl max-w-xl leading-relaxed transition-colors duration-500 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
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
                className={`group inline-flex items-center gap-3 rounded-2xl border px-8 py-4 text-base font-semibold transition-all duration-300 backdrop-blur-sm ${
                  theme === 'dark'
                    ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
                }`}
              >
                View Reports
                <BarChart3 size={18} className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} group-hover:text-current transition-colors`} />
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>RBAC Protected</span>
              </div>
              <div className={`h-4 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Zap size={16} className="text-amber-500" />
                <span>Real-time Data</span>
              </div>
              <div className={`h-4 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Award size={16} className="text-sky-500" />
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
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float pointer-events-none">
        <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Scroll to explore</span>
        <div className={`w-6 h-10 rounded-full border-2 flex justify-center pt-2 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
          <div className={`w-1.5 h-3 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-500' : 'bg-slate-400'}`} />
        </div>
      </div>
    </section>
  );
}

// ── Floating System Preview ───────────────────────────────────────────

function SystemPreviewCard() {
  const { theme } = useContext(ThemeContext);

  return (
    <div className="relative animate-float">
      {/* Glow behind */}
      <div className={`absolute -inset-4 bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-violet-500/20 rounded-3xl blur-2xl transition-opacity duration-500 ${
        theme === 'dark' ? 'opacity-100' : 'opacity-50'
      }`} />

      {/* Card */}
      <div className={`relative rounded-3xl border backdrop-blur-xl p-6 shadow-2xl transition-all duration-500 ${
        theme === 'dark'
          ? 'border-white/10 bg-white/5'
          : 'border-slate-200/80 bg-white shadow-slate-200/60'
      }`}>
        {/* Title bar */}
        <div className={`flex items-center gap-2 pb-4 border-b transition-colors duration-500 ${
          theme === 'dark' ? 'border-white/10 text-slate-500' : 'border-slate-100 text-slate-400'
        }`}>
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs font-semibold">CMCMIS — Live Dashboard</span>
        </div>

        {/* Mini dashboard */}
        <div className="mt-5 grid grid-cols-[110px_1fr] gap-4">
          {/* Mini sidebar */}
          <div className={`rounded-2xl p-3 space-y-2 transition-colors duration-500 ${
            theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'
          }`}>
            {['Dashboard', 'Requests', 'Job Cards', 'Equipment', 'Reports'].map((item, i) => (
              <div
                key={item}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  i === 0
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30'
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-350'
                      : 'text-slate-500 hover:text-slate-800'
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
                { label: 'Active Jobs', value: '147', trend: '+12%', color: 'text-emerald-500' },
                { label: 'Pending', value: '38', trend: '-5%', color: 'text-amber-500' },
                { label: 'Equipment', value: '2.4K', trend: '+8%', color: 'text-sky-500' },
                { label: 'Completed', value: '892', trend: '+24%', color: 'text-violet-500' },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-xl p-3 transition-all duration-500 ${
                  theme === 'dark' ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-800 border border-slate-100/50'
                }`}>
                  <div className="text-lg font-bold">{kpi.value}</div>
                  <div className={`text-[11px] font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-450'}`}>{kpi.label}</div>
                  <div className={`text-[10px] font-bold mt-1 ${kpi.color}`}>{kpi.trend}</div>
                </div>
              ))}
            </div>

            {/* Mini chart */}
            <div className={`rounded-xl p-4 h-24 flex items-end gap-1.5 transition-all duration-500 ${
              theme === 'dark' ? 'bg-white/5' : 'bg-slate-50 border border-slate-100/50'
            }`}>
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
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className={`relative border-y transition-colors duration-500 ${
      theme === 'dark'
        ? 'border-white/5 bg-slate-950/80 backdrop-blur-sm'
        : 'border-slate-200 bg-white shadow-sm'
    }`}>
      {/* Subtle gradient line on top */}
      <div className={`absolute top-0 left-0 right-0 h-px transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-sky-500/50 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-sky-400/30 to-transparent'
      }`} />

      <div className="mx-auto max-w-7xl px-6 py-16 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {stats.map((stat, index) => (
            <StatCounter key={stat.label} stat={stat} index={index} animate={inView} />
          ))}
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className={`absolute bottom-0 left-0 right-0 h-px transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent'
      }`} />
    </section>
  );
}

function StatCounter({ stat, index, animate }) {
  const { theme } = useContext(ThemeContext);
  const { count } = useAnimatedCounter(stat.value, 2000 + index * 200, animate);
  const Icon = stat.icon;

  return (
    <div
      className="text-center group animate-count-up"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border mb-4 transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-white/5 border-white/10 group-hover:bg-white/10 group-hover:border-white/20'
          : 'bg-slate-50 border-slate-200 group-hover:bg-slate-100 group-hover:border-slate-300'
      }`}>
        <Icon size={20} className="text-sky-500" />
      </div>
      <div className={`text-3xl md:text-4xl font-bold tabular-nums transition-colors duration-500 ${
        theme === 'dark' ? 'text-white' : 'text-slate-900'
      }`}>
        {count.toLocaleString()}{stat.suffix}
      </div>
      <div className="mt-2 text-sm text-slate-500 font-semibold">{stat.label}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 3 — [NEW] LIVE TELEMETRY FEED (ACTIVITY LOGS)
// ════════════════════════════════════════════════════════════════════════

function LiveTelemetryFeed() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-16 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 transition-all duration-700 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}>
          <div className="flex items-center gap-3">
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Radio size={20} className="text-rose-500 animate-pulse" />
                Live System Telemetry Feed
              </h2>
              <p className={`text-sm mt-1 font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Simulated real-time audit trail of actions executing across labs.
              </p>
            </div>
          </div>
          <span className={`text-xs px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider ${
            theme === 'dark' ? 'bg-slate-800 text-slate-400 border border-white/5' : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            Status: Synchronized
          </span>
        </div>

        <div className={`space-y-4 transition-all duration-1000 ${
          inView ? 'opacity-100' : 'opacity-0'
        }`}>
          {simulatedActivities.map((act, index) => (
            <div
              key={index}
              className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border transition-all duration-300 hover:-translate-x-1 ${
                theme === 'dark'
                  ? 'bg-slate-900/40 border-white/5 hover:bg-slate-900/70 hover:border-white/10'
                  : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-slate-350 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-xl border ${
                  act.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  act.status === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-sky-500/10 border-sky-500/20 text-sky-500'
                }`}>
                  <Activity size={16} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                    {act.desc}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      theme === 'dark' ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-650'
                    }`}>
                      {act.lab}
                    </span>
                    <span className="text-[11px] text-slate-450 flex items-center gap-1 font-semibold">
                      <Users size={12} /> {act.user}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0 text-slate-450 font-bold text-xs">
                <Clock size={12} />
                <span>{act.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 4 — WORKFLOW PIPELINE
// ════════════════════════════════════════════════════════════════════════

function WorkflowPipeline() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36 overflow-hidden">
      {/* Background */}
      <div className={`absolute inset-0 transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950' 
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-50'
      }`} />
      
      {/* Grid overlay */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${
        theme === 'dark' ? 'opacity-[0.02]' : 'opacity-[0.04]'
      }`} style={{
        backgroundImage: theme === 'dark'
          ? 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)'
          : 'radial-gradient(circle at 1px 1px, rgba(79,93,255,0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Section header */}
        <div className={`text-center mb-20 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6 transition-colors duration-500 ${
            theme === 'dark'
              ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
              : 'border-sky-200 bg-sky-50 text-sky-700'
          }`}>
            <Sparkles size={14} className="text-sky-500" />
            <span className="text-sm font-semibold">How It Works</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            End-to-End <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' ? 'from-sky-400 to-indigo-400' : 'from-sky-600 to-indigo-600'
            }`}>Operational Flow</span>
          </h2>
          <p className={`mt-5 text-lg max-w-2xl mx-auto transition-colors duration-500 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-655'
          }`}>
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
                    <div className={`h-full bg-gradient-to-r ${step.color} transition-all duration-1000 ${
                      inView ? 'w-full' : 'w-0'
                    } ${
                      theme === 'dark' ? 'opacity-30' : 'opacity-40'
                    }`} style={{ transitionDelay: `${index * 200 + 500}ms` }} />
                  </div>
                )}

                {/* Step card */}
                <div className={`group relative flex flex-col items-center text-center p-6 rounded-3xl border transition-all duration-300 ${
                  theme === 'dark'
                    ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-350 hover:shadow-md shadow-sm'
                }`}>
                  {/* Step number */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center justify-center h-7 px-3 rounded-full border text-xs font-bold transition-all duration-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-white/10 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      {step.step}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`mt-4 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={26} className="text-white" />
                  </div>

                  {/* Text */}
                  <h3 className={`mt-5 text-lg font-bold transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{step.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed transition-colors duration-500 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{step.desc}</p>
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
// SECTION 5 — MODULE SHOWCASE (BENTO GRID)
// ════════════════════════════════════════════════════════════════════════

function ModuleShowcase() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36">
      <div className={`absolute inset-0 transition-colors duration-500 ${
        theme === 'dark' ? 'bg-gradient-to-b from-slate-950 to-slate-900/80' : 'bg-gradient-to-b from-slate-50 to-white'
      }`} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6 transition-colors duration-500 ${
            theme === 'dark'
              ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
              : 'border-indigo-200 bg-indigo-50 text-indigo-700'
          }`}>
            <Layers size={14} className="text-indigo-500" />
            <span className="text-sm font-semibold">Modules</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Everything You Need, <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' ? 'from-indigo-400 to-violet-400' : 'from-indigo-600 to-violet-600'
            }`}>One Platform</span>
          </h2>
          <p className={`mt-5 text-lg max-w-2xl mx-auto transition-colors duration-500 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-650'
          }`}>
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
                className={`group relative rounded-3xl border p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${
                  theme === 'dark'
                    ? `border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.12] ${mod.glow}`
                    : `border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-350 shadow-sm ${mod.lightGlow}`
                } ${isLarge ? 'lg:col-span-1 lg:row-span-1' : ''} ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                {/* Gradient border glow on hover */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${mod.accent} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500`} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.accent} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 ${
                      theme === 'dark' ? mod.glow : mod.lightGlow
                    }`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    {/* Arrow */}
                    <ChevronRight
                      size={20}
                      className={`transition-all duration-300 mt-2 ${
                        theme === 'dark'
                          ? 'text-slate-650 group-hover:text-white group-hover:translate-x-1'
                          : 'text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1'
                      }`}
                    />
                  </div>

                  <h3 className={`mt-6 text-xl font-bold transition-colors duration-500 ${
                    theme === 'dark' ? 'text-white' : 'text-slate-800'
                  }`}>
                    {mod.label}
                  </h3>
                  <p className={`mt-3 text-sm leading-relaxed transition-colors duration-500 ${
                    theme === 'dark' 
                      ? 'text-slate-400 group-hover:text-slate-300' 
                      : 'text-slate-600 group-hover:text-slate-700'
                  }`}>
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
// SECTION 6 — [NEW] LABORATORY SCHEDULE SNEAK PEEK
// ════════════════════════════════════════════════════════════════════════

function ScheduleCalendarSneakPeek() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mockWorkloads = [
    { lab: 'TME Calibration', tasks: [
      { day: 0, title: 'Cal: Spectrum Analyzer', code: '#SA-904', status: 'completed' },
      { day: 2, title: 'Cal: Signal Gen', code: '#SG-082', status: 'pending' },
      { day: 4, title: 'Cal: Power Meter', code: '#PM-102', status: 'pending' },
    ]},
    { lab: 'TME Repair', tasks: [
      { day: 1, title: 'Rep: Oscilloscope', code: '#OS-882', status: 'progress' },
      { day: 3, title: 'Rep: Power Supply', code: '#PS-493', status: 'pending' },
    ]},
    { lab: 'FPE Calibration', tasks: [
      { day: 2, title: 'Cal: Temp Sensor', code: '#TS-221', status: 'completed' },
      { day: 5, title: 'Cal: Press Gauge', code: '#PG-943', status: 'pending' },
    ]}
  ];

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6 transition-colors duration-500 ${
            theme === 'dark'
              ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
              : 'border-cyan-200 bg-cyan-50 text-cyan-700'
          }`}>
            <Calendar size={14} className="text-cyan-500" />
            <span className="text-sm font-semibold">Weekly Schedule</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Lab Utilization & <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' ? 'from-cyan-400 to-sky-400' : 'from-cyan-600 to-sky-600'
            }`}>Schedule Preview</span>
          </h2>
          <p className={`mt-5 text-lg max-w-2xl mx-auto transition-colors duration-500 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-650'
          }`}>
            Visual preview of weekly laboratory workloads, active repair lines, and upcoming test timings.
          </p>
        </div>

        {/* Visual Calendar Grid */}
        <div className={`rounded-3xl border p-6 md:p-8 transition-all duration-550 shadow-lg ${
          theme === 'dark'
            ? 'bg-slate-900/30 border-white/5 shadow-slate-950/50'
            : 'bg-white border-slate-200 shadow-slate-200/50'
        } ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          
          {/* Day Headers */}
          <div className="grid grid-cols-[120px_1fr] md:grid-cols-[180px_1fr] border-b pb-4 mb-4 border-slate-200/30 font-bold text-xs uppercase tracking-wider text-slate-500">
            <span>Laboratory</span>
            <div className="grid grid-cols-6 text-center">
              {daysOfWeek.map((day) => <span key={day}>{day}</span>)}
            </div>
          </div>

          {/* Lab Rows */}
          <div className="space-y-6">
            {mockWorkloads.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[120px_1fr] md:grid-cols-[180px_1fr] items-center py-2">
                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-250' : 'text-slate-800'}`}>
                  {row.lab}
                </span>

                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 6 }).map((_, dIdx) => {
                    const activeTask = row.tasks.find((t) => t.day === dIdx);

                    return (
                      <div key={dIdx} className={`min-h-[70px] rounded-xl p-2 flex flex-col justify-between text-[11px] transition-all duration-300 hover:scale-[1.02] border ${
                        activeTask
                          ? activeTask.status === 'completed'
                            ? theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : activeTask.status === 'progress'
                              ? theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                              : theme === 'dark' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-700'
                          : theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100'
                      }`}>
                        {activeTask ? (
                          <>
                            <span className="font-bold line-clamp-2 leading-tight">{activeTask.title}</span>
                            <span className="opacity-70 font-semibold">{activeTask.code}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-center m-auto font-semibold">+ Free</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 7 — CORE CAPABILITIES
// ════════════════════════════════════════════════════════════════════════

function Capabilities() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36 overflow-hidden">
      <div className={`absolute inset-0 transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950' 
          : 'bg-gradient-to-b from-white via-slate-50 to-slate-50'
      }`} />

      {/* Accent orb */}
      <div className={`absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 rounded-full blur-[150px] transition-colors duration-500 ${
        theme === 'dark' ? 'bg-indigo-600/10' : 'bg-indigo-400/5'
      }`} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6 transition-colors duration-500 ${
            theme === 'dark'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-emerald-250 bg-emerald-50 text-emerald-700'
          }`}>
            <Target size={14} className="text-emerald-500" />
            <span className="text-sm font-semibold">Capabilities</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Built for <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' ? 'from-emerald-400 to-cyan-400' : 'from-emerald-600 to-cyan-600'
            }`}>Operational Clarity</span>
          </h2>
          <p className={`mt-5 text-lg max-w-2xl mx-auto transition-colors duration-500 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-650'
          }`}>
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
                className={`group relative rounded-3xl border p-8 transition-all duration-500 ${
                  theme === 'dark'
                    ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350 hover:shadow-md shadow-sm shadow-slate-100/50'
                } ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Icon with glow ring */}
                <div className="relative inline-flex">
                  <div className="absolute inset-0 rounded-2xl bg-sky-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl border transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 group-hover:border-sky-500/30'
                      : 'bg-slate-50 border-slate-200 group-hover:border-sky-500/30'
                  }`}>
                    <Icon size={24} className="text-sky-500 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>

                <h3 className={`mt-6 text-lg font-bold transition-colors duration-500 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-800'
                }`}>{cap.title}</h3>
                <p className={`mt-3 text-sm leading-relaxed transition-colors duration-500 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-655'
                }`}>{cap.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 8 — TECHNOLOGY HIGHLIGHTS
// ════════════════════════════════════════════════════════════════════════

function TechHighlights() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36">
      <div className={`absolute inset-0 transition-colors duration-500 ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
      }`} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6 transition-colors duration-500 ${
            theme === 'dark'
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
              : 'border-amber-250 bg-amber-50 text-amber-700'
          }`}>
            <Cpu size={14} className="text-amber-505" />
            <span className="text-sm font-semibold">Technology</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Enterprise-Grade <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' ? 'from-amber-400 to-orange-400' : 'from-amber-600 to-orange-600'
            }`}>Infrastructure</span>
          </h2>
          <p className={`mt-5 text-lg max-w-2xl mx-auto transition-colors duration-500 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-650'
          }`}>
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
                className={`group relative rounded-3xl border p-10 transition-all duration-500 ${
                  theme === 'dark'
                    ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350 hover:shadow-md shadow-sm'
                } ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

                <div className="relative z-10 flex items-start gap-6">
                  <div className={`shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold transition-colors duration-500 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-800'
                    }`}>{feature.title}</h3>
                    <p className={`mt-3 text-sm leading-relaxed transition-colors duration-500 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>{feature.desc}</p>
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
// SECTION 9 — MISSION & PHILOSOPHY
// ════════════════════════════════════════════════════════════════════════

function MissionSection() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-28 md:py-36 overflow-hidden">
      <div className={`absolute inset-0 transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950' 
          : 'bg-gradient-to-b from-slate-50 via-indigo-50/5 to-slate-50'
      }`} />

      {/* Background accent */}
      <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-80 h-80 rounded-full blur-[120px] transition-colors duration-500 ${
        theme === 'dark' ? 'bg-sky-500/10' : 'bg-sky-400/5'
      }`} />

      <div className="relative z-10 mx-auto max-w-4xl px-6 md:px-12">
        <div className={`text-center transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Icon mark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-xl shadow-sky-500/25 mb-10">
            <Sparkles size={28} className="text-white" />
          </div>

          {/* Quote */}
          <blockquote className={`text-3xl md:text-4xl font-bold leading-snug transition-colors duration-500 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            "Precision in measurement is the foundation of{' '}
            <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' ? 'from-sky-400 to-indigo-400' : 'from-sky-600 to-indigo-600'
            }`}>
              excellence in space technology.
            </span>{' '}
            CMCMIS ensures every instrument is calibrated, every workflow is tracked, and every decision is data-driven."
          </blockquote>

          <div className="mt-10 flex flex-col items-center gap-2">
            <div className={`h-px w-16 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent`} />
            <p className={`text-sm font-bold ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>CMCMIS — ISRO Space Applications Centre</p>
            <p className="text-xs text-slate-500">Calibration & Maintenance Control Management Information System</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 10 — [NEW] FAQ ACCORDION
// ════════════════════════════════════════════════════════════════════════

function FaqAccordion() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();
  const [openIdx, setOpenIdx] = useState(null);

  const toggleFaq = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6 transition-colors duration-500 ${
            theme === 'dark'
              ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
              : 'border-indigo-200 bg-indigo-50 text-indigo-700'
          }`}>
            <HelpCircle size={14} className="text-indigo-500" />
            <span className="text-sm font-semibold">Common Queries</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-center">
            Frequently Asked <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' ? 'from-indigo-400 to-violet-400' : 'from-indigo-600 to-violet-600'
            }`}>Questions</span>
          </h2>
          <p className={`mt-5 text-lg max-w-2xl mx-auto transition-colors duration-500 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-655'
          }`}>
            Quick answers to standard operational procedures, RBAC parameters, and user flows.
          </p>
        </div>

        {/* Accordion List */}
        <div className={`space-y-4 transition-all duration-700 ${inView ? 'opacity-100' : 'opacity-0'}`}>
          {faqs.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-slate-900/30 border-white/5 hover:border-white/10'
                    : 'bg-white border-slate-200 hover:border-slate-350 shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className={`w-full flex items-center justify-between p-6 text-left font-bold text-base md:text-lg transition-colors duration-250 ${
                    theme === 'dark'
                      ? 'text-slate-200 hover:text-white'
                      : 'text-slate-800 hover:text-slate-950'
                  }`}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-350 ${
                      isOpen ? 'rotate-180 text-sky-505' : 'text-slate-400'
                    }`}
                  />
                </button>

                <div className={`transition-all duration-350 ease-in-out ${
                  isOpen ? 'max-h-[300px] border-t border-slate-200/10' : 'max-h-0'
                } overflow-hidden`}>
                  <p className={`p-6 text-sm leading-relaxed font-semibold transition-colors duration-500 ${
                    theme === 'dark' ? 'text-slate-400 bg-slate-950/20' : 'text-slate-650 bg-slate-50/50'
                  }`}>
                    {item.a}
                  </p>
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
// SECTION 11 — FINAL CTA BANNER
// ════════════════════════════════════════════════════════════════════════

function CtaBanner() {
  const { theme } = useContext(ThemeContext);
  const [ref, inView] = useInView();

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div className={`absolute inset-0 transition-colors duration-500 ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
      }`} />

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
// SECTION 12 — PREMIUM FOOTER
// ════════════════════════════════════════════════════════════════════════

function PremiumFooter() {
  const { theme } = useContext(ThemeContext);
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`relative border-t transition-colors duration-500 ${
      theme === 'dark' ? 'border-white/5 bg-slate-950' : 'border-slate-200 bg-white'
    }`}>
      {/* Top gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-px transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-slate-200 to-transparent'
      }`} />

      <div className="mx-auto max-w-7xl px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <div className={`text-base font-bold transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>CMCMIS</div>
                <div className="text-xs text-slate-500 font-semibold">ISRO SAC Portal</div>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-semibold">
              Calibration & Maintenance Control Management Information System for India's Space Applications Centre.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className={`text-sm font-bold mb-5 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Operations</h4>
            <ul className="space-y-3">
              {[
                { label: 'Dashboard', to: '/dashboard' },
                { label: 'Job Requests', to: '/job-requests' },
                { label: 'Job Cards', to: '/job-cards' },
                { label: 'Equipment', to: '/equipment' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={`text-sm font-semibold transition-colors duration-200 ${
                    theme === 'dark' ? 'text-slate-500 hover:text-sky-400' : 'text-slate-500 hover:text-sky-600'
                  }`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`text-sm font-bold mb-5 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Insights</h4>
            <ul className="space-y-3">
              {[
                { label: 'Reports', to: '/reports' },
                { label: 'Analytics', to: '/analytics' },
                { label: 'Schedule', to: '/schedule' },
                { label: 'Inquiry', to: '/inquiry' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={`text-sm font-semibold transition-colors duration-200 ${
                    theme === 'dark' ? 'text-slate-500 hover:text-sky-400' : 'text-slate-500 hover:text-sky-600'
                  }`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`text-sm font-bold mb-5 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>System</h4>
            <ul className="space-y-3">
              {[
                { label: 'Administration', to: '/admin/users' },
                { label: 'Notifications', to: '/notifications' },
                { label: 'Profile', to: '/profile' },
                { label: 'About', to: '/about' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={`text-sm font-semibold transition-colors duration-200 ${
                    theme === 'dark' ? 'text-slate-500 hover:text-sky-400' : 'text-slate-500 hover:text-sky-600'
                  }`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className={`mt-16 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-500 ${
          theme === 'dark' ? 'border-white/5' : 'border-slate-200'
        }`}>
          <div className="text-sm text-slate-500 font-semibold">
            © {currentYear} CMCMIS — ISRO Space Applications Centre. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>System Operational</span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
