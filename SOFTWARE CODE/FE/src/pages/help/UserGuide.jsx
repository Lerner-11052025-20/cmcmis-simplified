import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Eye,
  FilePlus2,
  Info,
  KeyRound,
  LineChart,
  ListChecks,
  LogOut,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle,
  Wrench,
} from 'lucide-react';

const normalUserGuide = {
  badge: 'Normal User Guide',
  roleLabel: 'NORMAL USER role',
  title: 'How to use CMCMIS',
  description: 'A simple guide for non-technical users. It explains only the main daily actions: login, creating a job request, viewing request details, and using the equipment page.',
  quickNav: [
    { label: 'Login', id: 'login' },
    { label: 'Create JR', id: 'job-request-create' },
    { label: 'JR Details', id: 'job-request-detail' },
    { label: 'Equipment', id: 'equipment' },
  ],
  flows: [
    {
      id: 'login',
      title: 'Login',
      subtitle: 'Enter the portal safely and reach your dashboard.',
      icon: KeyRound,
      accent: 'bg-sky-50 text-sky-600',
      cta: { label: 'Open Login', to: '/login' },
      steps: [
        'Open the CMCMIS portal link.',
        'Enter your employee ID or registered login details.',
        'Enter your password and select Sign In.',
        'After login, confirm that your name or initials appear in the top bar.',
      ],
      tips: ['If login fails, recheck employee ID and password.', 'For a locked account, contact the administrator.'],
      visual: 'login',
    },
    {
      id: 'job-request-create',
      title: 'Job Request Creation',
      subtitle: 'Create a calibration, repair, inspection, or maintenance request.',
      icon: FilePlus2,
      accent: 'bg-indigo-50 text-indigo-600',
      cta: { label: 'Create Job Request', to: '/job-requests/new' },
      steps: [
        'Open Job Requests from the sidebar.',
        'Select New Job Request.',
        'Complete each form section from Job Type to Terms and Conditions.',
        'Review the entered equipment and complaint details.',
        'Use Submit when the request is ready, or Save Draft if you need to finish later.',
      ],
      tips: ['Fields marked as required must be completed.', 'Use clear complaint remarks so the lab team understands the issue.'],
      visual: 'job-request-create',
    },
    {
      id: 'job-request-detail',
      title: 'Job Request Details View',
      subtitle: 'Check the status, history, and submitted information for your request.',
      icon: Eye,
      accent: 'bg-emerald-50 text-emerald-600',
      cta: { label: 'View Job Requests', to: '/job-requests' },
      steps: [
        'Open Job Requests from the sidebar.',
        'Find your request using the list, search, or visible request ID.',
        'Select the request ID to open the detail page.',
        'Review current status, timeline, equipment details, complaint, and linked job card if available.',
      ],
      tips: ['Normal users can view their own job requests.', 'Use the timeline to understand what has already happened.'],
      visual: 'job-request-detail',
    },
    {
      id: 'equipment',
      title: 'Equipment Page',
      subtitle: 'Search and view registered equipment information.',
      icon: Wrench,
      accent: 'bg-amber-50 text-amber-600',
      cta: { label: 'Open Equipment', to: '/equipment' },
      steps: [
        'Open Equipment from the sidebar.',
        'Use search to find equipment by name, ID, serial number, or related detail.',
        'Use filters if available to narrow the list.',
        'Select a row to view the equipment detail page.',
        'Check equipment status, basic details, and related history before creating a job request.',
      ],
      tips: ['Searching first helps avoid duplicate requests.', 'Use the correct equipment record whenever possible.'],
      visual: 'equipment',
    },
  ],
};

const viewOnlyGuide = {
  badge: 'View Only Guide',
  roleLabel: 'VIEW ONLY role',
  title: 'How to review CMCMIS data',
  description: 'A simple read-only guide for users who need to see information without changing records. It focuses on dashboard review, inquiry/search, equipment lookup, reports, and analytics.',
  quickNav: [
    { label: 'Login', id: 'login' },
    { label: 'Dashboard', id: 'dashboard-review' },
    { label: 'Inquiry', id: 'inquiry-search' },
    { label: 'Reports', id: 'reports-review' },
  ],
  flows: [
    {
      id: 'login',
      title: 'Login',
      subtitle: 'Enter the portal and confirm that you are in read-only mode.',
      icon: KeyRound,
      accent: 'bg-sky-50 text-sky-600',
      cta: { label: 'Open Login', to: '/login' },
      steps: [
        'Open the CMCMIS portal link.',
        'Enter your employee ID and password.',
        'Select Sign In.',
        'Check the top bar for your profile initials and role badge.',
      ],
      tips: ['View Only users can review data but should not see edit or submit actions.', 'If an action button appears unexpectedly, contact the administrator.'],
      visual: 'login',
    },
    {
      id: 'dashboard-review',
      title: 'Dashboard Review',
      subtitle: 'Use the dashboard to understand the current operational picture.',
      icon: Monitor,
      accent: 'bg-violet-50 text-violet-600',
      cta: { label: 'Open Dashboard', to: '/dashboard' },
      steps: [
        'Open Dashboard from the sidebar.',
        'Read the KPI cards at the top of the page.',
        'Review recent activity and status summaries.',
        'Use the dashboard as a starting point before opening detailed modules.',
      ],
      tips: ['Dashboard cards are for quick understanding.', 'For exact rows and filters, use Reports or Inquiry.'],
      visual: 'dashboard',
    },
    {
      id: 'inquiry-search',
      title: 'Inquiry and Search',
      subtitle: 'Search equipment, vendors, job requests, or job cards without editing them.',
      icon: Search,
      accent: 'bg-emerald-50 text-emerald-600',
      cta: { label: 'Open Inquiry', to: '/inquiry' },
      steps: [
        'Open Inquiry from the sidebar.',
        'Choose the correct tab for what you want to find.',
        'Type a search term such as equipment ID, serial number, request ID, or vendor name.',
        'Open the result only to review details.',
      ],
      tips: ['Use shorter search text if no results appear.', 'Inquiry is best for finding records quickly.'],
      visual: 'inquiry',
    },
    {
      id: 'reports-review',
      title: 'Reports and Analytics',
      subtitle: 'Read filtered reports and visual charts for wider understanding.',
      icon: BarChart3,
      accent: 'bg-indigo-50 text-indigo-600',
      cta: { label: 'Open Reports', to: '/reports' },
      steps: [
        'Open Reports or Analytics from the sidebar.',
        'Select the report or chart you need.',
        'Apply date, division, and status filters if available.',
        'Use the table or chart to review information.',
      ],
      tips: ['Reports show rows and summaries.', 'Analytics shows charts for quick comparison.'],
      visual: 'reports',
    },
    {
      id: 'equipment-view',
      title: 'Equipment Page',
      subtitle: 'Look up registered instruments and confirm their status.',
      icon: Wrench,
      accent: 'bg-amber-50 text-amber-600',
      cta: { label: 'Open Equipment', to: '/equipment' },
      steps: [
        'Open Equipment from the sidebar.',
        'Search by equipment ID, name, or serial number.',
        'Use the visible status to understand equipment condition.',
        'Open details only when you need more information.',
      ],
      tips: ['Do not create or edit records from this role.', 'Use Equipment to confirm the correct instrument before reading related requests.'],
      visual: 'equipment',
    },
  ],
};

const labInChargeGuide = {
  badge: 'Lab In-Charge Guide',
  roleLabel: 'LAB IN-CHARGE role',
  title: 'How to manage lab work in CMCMIS',
  description: 'A simple operational guide for Lab In-Charge users. It explains how to review incoming requests, convert work into job cards, monitor job execution, use schedules, and read reports.',
  quickNav: [
    { label: 'Dashboard', id: 'dashboard-review' },
    { label: 'Conversion', id: 'conversion' },
    { label: 'Job Cards', id: 'job-cards' },
    { label: 'Checklists', id: 'checklist-mgmt' },
    { label: 'Lab Capacity', id: 'lab-capacity' },
    { label: 'Reports', id: 'reports-review' },
  ],
  flows: [
    {
      id: 'login',
      title: 'Login',
      subtitle: 'Enter the portal and confirm your Lab In-Charge access.',
      icon: KeyRound,
      accent: 'bg-sky-50 text-sky-600',
      cta: { label: 'Open Login', to: '/login' },
      steps: [
        'Open the CMCMIS portal link.',
        'Enter your employee ID and password.',
        'Select Sign In.',
        'Confirm your role badge in the top bar.',
      ],
      tips: ['Your visible modules depend on your lab scope.', 'If a queue is missing, confirm your assigned role/scope with the administrator.'],
      visual: 'login',
    },
    {
      id: 'dashboard-review',
      title: 'Dashboard Review',
      subtitle: 'Start with workload and status cards before taking action.',
      icon: Monitor,
      accent: 'bg-violet-50 text-violet-600',
      cta: { label: 'Open Dashboard', to: '/dashboard' },
      steps: [
        'Open Dashboard from the sidebar.',
        'Review pending jobs, open job cards, and in-progress work.',
        'Use the latest activity to decide what needs attention first.',
        'Move to Conversion or Job Cards for detailed action.',
      ],
      tips: ['Dashboard is a quick workload snapshot.', 'Use lists and reports for exact filtering.'],
      visual: 'dashboard',
    },
    {
      id: 'conversion',
      title: 'Conversion Workspace',
      subtitle: 'Review submitted requests and convert approved work into job cards.',
      icon: RefreshCw,
      accent: 'bg-indigo-50 text-indigo-600',
      cta: { label: 'Open Conversion', to: '/conversion' },
      steps: [
        'Open Conversion from the sidebar.',
        'Review submitted job requests awaiting lab action.',
        'Open a request and check equipment, category, complaint, and submitter details.',
        'Assign the correct engineer and create the job card when the request is ready.',
      ],
      tips: ['Convert only after checking that the request information is clear.', 'Reject or return unclear requests with a helpful reason.'],
      visual: 'conversion',
    },
    {
      id: 'job-cards',
      title: 'Job Cards Monitoring',
      subtitle: 'Track assigned, in-progress, completed, and verified work.',
      icon: ClipboardList,
      accent: 'bg-emerald-50 text-emerald-600',
      cta: { label: 'Open Job Cards', to: '/job-cards' },
      steps: [
        'Open Job Cards from the sidebar.',
        'Use status filters to find assigned or in-progress work.',
        'Open a job card to review engineer progress, documents, remarks, and completion status.',
        'Verify or close work when the process and required evidence are complete.',
      ],
      tips: ['Use the job card detail tabs to review complete work history.', 'Keep status transitions clear so users can follow progress.'],
      visual: 'job-cards',
    },
    {
      id: 'schedule',
      title: 'Schedule Page',
      subtitle: 'Use scheduling to plan and monitor upcoming lab work.',
      icon: Calendar,
      accent: 'bg-amber-50 text-amber-600',
      cta: { label: 'Open Schedule', to: '/schedule' },
      steps: [
        'Open Schedule from the sidebar.',
        'Check upcoming work and planned lab activity.',
        'Use visible dates and status information to understand workload.',
        'Coordinate work based on priority and equipment availability.',
      ],
      tips: ['Schedule helps avoid missed work.', 'Use it together with Job Cards for day-to-day planning.'],
      visual: 'schedule',
    },
    {
      id: 'checklist-mgmt',
      title: 'Checklist Management',
      subtitle: 'Create and manage calibration checklists for specific equipment.',
      icon: ListChecks,
      accent: 'bg-indigo-50 text-indigo-600',
      cta: { label: 'Manage Checklists', to: '/admin/checklists' },
      steps: [
        'Open Checklist Mgmt from the sidebar.',
        'View the total checklists, equipment covered, and task counts at the top.',
        'Use the search bar to find checklists by name or equipment ID.',
        'Click the arrow icon to expand a checklist card and view its tasks.',
        'Click New Checklist to create a new checklist, type the Equipment ID, and click Fetch.',
        'Add tasks from the master library or click Add Custom Task to type new tasks, then click Create Checklist.',
      ],
      tips: [
        'Each equipment should have a dedicated checklist matching its model requirements.',
        'Ensure tasks match NABL/NON-NABL scopes correctly.',
      ],
      visual: 'checklists',
    },
    {
      id: 'lab-capacity',
      title: 'Lab Capacity & Workloads',
      subtitle: 'Monitor technician workloads and SLA turnaround metrics in real-time.',
      icon: BarChart3,
      accent: 'bg-emerald-50 text-emerald-600',
      cta: { label: 'Open Lab Capacity', to: '/admin/lab-capacity' },
      steps: [
        'Open Lab Capacity from the sidebar.',
        'Check KPIs: Total Active Backlog, Bottleneck Alerts (engineers with >5 active jobs), and Overall SLA Compliance.',
        'Review the SLA Turnaround Tracker circles for Calibration and Repair.',
        'Scroll down to inspect the Technician Workload & Cycle Metrics table.',
        'Check average resolution speed and operational load status for each engineer.',
      ],
      tips: [
        'Review capacity before assigning new job cards in the Conversion Workspace.',
        'Help engineers with Critical Load status by redistributing their pending jobs.',
      ],
      visual: 'lab-capacity',
    },
    {
      id: 'reports-review',
      title: 'Reports and Analytics',
      subtitle: 'Use reports to review lab performance and pending work.',
      icon: LineChart,
      accent: 'bg-rose-50 text-rose-600',
      cta: { label: 'Open Reports', to: '/reports' },
      steps: [
        'Open Reports or Analytics from the sidebar.',
        'Select the relevant report or chart.',
        'Apply filters for date, division, status, or report-specific needs.',
        'Use PDF, Excel, or Print when the report needs to be shared.',
      ],
      tips: ['Reports are best for row-level data.', 'Analytics is best for quick visual review.'],
      visual: 'reports',
    },
  ],
};

const labEngineerGuide = {
  badge: 'Lab Engineer Guide',
  roleLabel: 'LAB ENGINEER role',
  title: 'How to handle assigned lab work',
  description: 'A simple practical guide for Lab Engineer users. It explains how to find assigned job cards, update work progress, check equipment details, use schedules, and review reports when needed.',
  quickNav: [
    { label: 'Dashboard', id: 'dashboard-review' },
    { label: 'Job Cards', id: 'job-cards' },
    { label: 'Equipment', id: 'equipment-view' },
    { label: 'Schedule', id: 'schedule' },
  ],
  flows: [
    {
      id: 'login',
      title: 'Login',
      subtitle: 'Enter the portal and confirm your Lab Engineer access.',
      icon: KeyRound,
      accent: 'bg-sky-50 text-sky-600',
      cta: { label: 'Open Login', to: '/login' },
      steps: [
        'Open the CMCMIS portal link.',
        'Enter your employee ID and password.',
        'Select Sign In.',
        'Confirm your profile and role badge in the top bar.',
      ],
      tips: ['Your visible job cards depend on your lab assignment.', 'If assigned work is missing, contact your Lab In-Charge.'],
      visual: 'login',
    },
    {
      id: 'dashboard-review',
      title: 'Dashboard Review',
      subtitle: 'Check current work and progress before opening details.',
      icon: Monitor,
      accent: 'bg-violet-50 text-violet-600',
      cta: { label: 'Open Dashboard', to: '/dashboard' },
      steps: [
        'Open Dashboard from the sidebar.',
        'Review assigned, in-progress, and completed work counts.',
        'Use the status cards to decide which job card needs attention.',
        'Move to Job Cards for detailed work updates.',
      ],
      tips: ['Use Dashboard for quick awareness.', 'Use Job Cards for actual work tracking.'],
      visual: 'dashboard',
    },
    {
      id: 'job-cards',
      title: 'Job Cards Work',
      subtitle: 'Open assigned job cards and maintain clear work progress.',
      icon: ClipboardList,
      accent: 'bg-emerald-50 text-emerald-600',
      cta: { label: 'Open Job Cards', to: '/job-cards' },
      steps: [
        'Open Job Cards from the sidebar.',
        'Filter or search for assigned and in-progress job cards.',
        'Open a job card to review request details, equipment information, and instructions.',
        'Update progress, remarks, documents, or completion details according to your access.',
      ],
      tips: ['Keep remarks clear and factual.', 'Attach required evidence before marking work complete.'],
      visual: 'job-cards',
    },
    {
      id: 'equipment-view',
      title: 'Equipment Check',
      subtitle: 'Confirm instrument details before starting work.',
      icon: Wrench,
      accent: 'bg-amber-50 text-amber-600',
      cta: { label: 'Open Equipment', to: '/equipment' },
      steps: [
        'Open Equipment from the sidebar.',
        'Search by equipment ID, name, or serial number.',
        'Review status and basic details before recording work.',
        'Use the correct equipment record when linking job work.',
      ],
      tips: ['Always verify the equipment identity.', 'Avoid working from incomplete or unclear equipment details.'],
      visual: 'equipment',
    },
    {
      id: 'schedule',
      title: 'Schedule and Reports',
      subtitle: 'Use schedule and reports to understand upcoming and completed work.',
      icon: Calendar,
      accent: 'bg-indigo-50 text-indigo-600',
      cta: { label: 'Open Schedule', to: '/schedule' },
      steps: [
        'Open Schedule to view planned or upcoming work.',
        'Use Reports or Analytics when you need broader work summaries.',
        'Apply filters to find the exact date, status, or lab information.',
        'Share report outputs only through the allowed export options.',
      ],
      tips: ['Schedule is useful for daily planning.', 'Reports help with review and follow-up.'],
      visual: 'schedule',
    },
  ],
};

const commonGuideFlows = [
  {
    id: 'common-topbar',
    title: 'Top Bar Use Cases',
    subtitle: 'Use the top bar for quick search, notifications, help context, and account actions from any page.',
    icon: Monitor,
    accent: 'bg-sky-50 text-sky-600',
    cta: { label: 'Open Dashboard', to: '/dashboard' },
    steps: [
      'Look at the top area of the screen after login.',
      'Use the menu button to expand or collapse the sidebar when you need more space.',
      'Use the global search box to find equipment, job requests, vendors, or job cards.',
      'Use the right-side icons to open information, notifications, and profile actions.',
    ],
    tips: ['The top bar stays available across most pages.', 'Start from global search when you are not sure which module contains the record.'],
    visual: 'topbar',
  },
  {
    id: 'common-global-search',
    title: 'Global Search Bar',
    subtitle: 'Find important records quickly without opening every module one by one.',
    icon: Search,
    accent: 'bg-indigo-50 text-indigo-600',
    cta: { label: 'Open Inquiry', to: '/inquiry' },
    steps: [
      'Click the search field in the top bar.',
      'Type an equipment ID, job request ID, job card number, vendor name, or keyword.',
      'Review the visible matches.',
      'Select the correct result to open the related page.',
    ],
    tips: ['Use fewer words if search results are too narrow.', 'Use exact IDs when you have them.'],
    visual: 'global-search',
  },
  {
    id: 'common-module-search',
    title: 'In-Module Search and Filters',
    subtitle: 'Use local search boxes inside pages to narrow table rows and lists.',
    icon: LineChart,
    accent: 'bg-emerald-50 text-emerald-600',
    cta: { label: 'Open Reports', to: '/reports' },
    steps: [
      'Open a module such as Equipment, Job Requests, Job Cards, Inquiry, Reports, or Schedule.',
      'Use the page search box to type the exact ID, name, status, or keyword.',
      'Apply filters such as status, category, lab, or date when available.',
      'Clear the search or filter when you want to return to the full list.',
    ],
    tips: ['Module search is best when you already know which module contains the data.', 'Filters help reduce long lists into readable rows.'],
    visual: 'module-search',
  },
  {
    id: 'common-notifications',
    title: 'Notifications',
    subtitle: 'Review system updates, assigned work, approvals, and important activity alerts.',
    icon: Bell,
    accent: 'bg-amber-50 text-amber-600',
    cta: { label: 'Open Notifications', to: '/notifications' },
    steps: [
      'Click the notification icon in the top bar or open Notifications from the sidebar if visible.',
      'Read the latest messages and status updates.',
      'Open any linked record if the notification includes one.',
      'Use notifications to follow changes without manually checking every module.',
    ],
    tips: ['Unread items help identify what needs attention.', 'Some roles may see fewer notifications based on permission.'],
    visual: 'notifications',
  },
  {
    id: 'common-profile-menu',
    title: 'Profile Icon and Logout',
    subtitle: 'Open your account dropdown from the top-right profile area.',
    icon: UserCircle,
    accent: 'bg-violet-50 text-violet-600',
    cta: { label: 'Open Profile', to: '/profile' },
    steps: [
      'Go to the top-right corner of the screen.',
      'Click your initials, profile name, or small dropdown arrow.',
      'Choose Profile to review your account details.',
      'Choose Logout when your work is complete.',
    ],
    tips: ['Always logout from shared systems.', 'The dropdown is the fastest place to open profile settings.'],
    visual: 'account-menu',
  },
  {
    id: 'common-profile-page',
    title: 'Profile Page',
    subtitle: 'Check your role, employee information, and account details.',
    icon: UserCircle,
    accent: 'bg-rose-50 text-rose-600',
    cta: { label: 'Open Profile', to: '/profile' },
    steps: [
      'Open Profile from the sidebar or top-right account dropdown.',
      'Review your name, employee ID, email, role, and account status.',
      'Confirm that the displayed role matches your expected access.',
      'Contact the administrator if any profile information is incorrect.',
    ],
    tips: ['Your role decides which modules are visible.', 'Profile is read-friendly and helps confirm your access level.'],
    visual: 'profile',
  },
  {
    id: 'common-about',
    title: 'About Page',
    subtitle: 'Understand the purpose, team, and system context of CMCMIS.',
    icon: Info,
    accent: 'bg-slate-100 text-slate-700',
    cta: { label: 'Open About', to: '/about' },
    steps: [
      'Open About Us from the sidebar.',
      'Read the system purpose and usage context.',
      'Review project or team information when needed.',
      'Use this page when explaining CMCMIS to a new user.',
    ],
    tips: ['About page is informational only.', 'It is useful during onboarding and demonstrations.'],
    visual: 'about',
  },
];

export function UserGuide() {
  return <GuidePage config={normalUserGuide} />;
}

export function ViewOnlyGuide() {
  return <GuidePage config={viewOnlyGuide} />;
}

export function LabInChargeGuide() {
  return <GuidePage config={labInChargeGuide} />;
}

export function LabEngineerGuide() {
  return <GuidePage config={labEngineerGuide} />;
}

function GuidePage({ config }) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 font-sans">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
                <ShieldCheck size={14} strokeWidth={2.2} aria-hidden="true" />
                {config.badge}
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                {config.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-normal leading-7 text-black">
                {config.description}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Monitor size={23} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Designed For</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{config.roleLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {config.quickNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              >
                <MousePointerClick size={15} strokeWidth={1.8} aria-hidden="true" />
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-4 md:px-8">
          {config.flows.map((flow, index) => {
            const Icon = flow.icon;
            return (
              <a
                key={flow.id}
                href={`#${flow.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_12px_28px_rgba(14,165,233,0.12)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${flow.accent}`}>
                    <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-slate-300">0{index + 1}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">{flow.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{flow.subtitle}</p>
              </a>
            );
          })}
        </div>
      </section>

      <div className="space-y-6">
        {config.flows.map((flow, index) => (
          <GuideSection key={flow.id} flow={flow} index={index} />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.045)] md:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Common modules for every role</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Everyday controls used across CMCMIS</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            These actions are common across the software. They help non-technical users search, open their profile,
            read notifications, use page filters, and safely logout.
          </p>
        </div>
      </section>

      <div className="space-y-6">
        {commonGuideFlows.map((flow, index) => (
          <GuideSection key={flow.id} flow={flow} index={config.flows.length + index} />
        ))}
      </div>

      <CoreFeatureHighlights />
    </div>
  );
}

function GuideSection({ flow, index }) {
  const Icon = flow.icon;
  return (
    <section id={flow.id} className="scroll-mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-slate-100 p-6 md:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-4">
            <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${flow.accent}`}>
              <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Use Case {index + 1}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{flow.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{flow.subtitle}</p>
            </div>
          </div>

          <ol className="mt-6 space-y-3">
            {flow.steps.map((step, stepIndex) => (
              <li key={step} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-sky-700 ring-1 ring-sky-100">
                  {stepIndex + 1}
                </span>
                <span className="text-sm font-medium leading-6 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={17} strokeWidth={2} aria-hidden="true" />
              Helpful notes
            </p>
            <ul className="mt-2 space-y-1.5">
              {flow.tips.map((tip) => (
                <li key={tip} className="text-sm leading-6 text-emerald-900">{tip}</li>
              ))}
            </ul>
          </div>

          <Link
            to={flow.cta.to}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100"
          >
            {flow.cta.label}
            <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
          </Link>
        </div>

        <div className="bg-slate-50 p-6 md:p-8">
          <VisualGuide type={flow.visual} />
        </div>
      </div>
    </section>
  );
}

function VisualGuide({ type }) {
  if (type === 'login') return <LoginVisual />;
  if (type === 'job-request-create') return <JobRequestCreateVisual />;
  if (type === 'job-request-detail') return <JobRequestDetailVisual />;
  if (type === 'equipment') return <EquipmentVisual />;
  if (type === 'dashboard') return <DashboardVisual />;
  if (type === 'inquiry') return <InquiryVisual />;
  if (type === 'reports') return <ReportsVisual />;
  if (type === 'conversion') return <ConversionVisual />;
  if (type === 'job-cards') return <JobCardsVisual />;
  if (type === 'schedule') return <ScheduleVisual />;
  if (type === 'checklists') return <ChecklistsVisual />;
  if (type === 'lab-capacity') return <LabCapacityVisual />;
  if (type === 'topbar') return <TopBarVisual />;
  if (type === 'global-search') return <GlobalSearchVisual />;
  if (type === 'module-search') return <ModuleSearchVisual />;
  if (type === 'notifications') return <NotificationsVisual />;
  if (type === 'account-menu') return <AccountMenuVisual />;
  if (type === 'profile') return <ProfileVisual />;
  if (type === 'about') return <AboutVisual />;
  return <DashboardVisual />;
}

function BrowserFrame({ children, title }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-2 truncate text-xs font-semibold text-slate-400">{title}</span>
      </div>
      <div className="relative min-h-[330px] bg-slate-50 p-4">{children}</div>
    </div>
  );
}

function LoginVisual() {
  return (
    <BrowserFrame title="/login">
      <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-650 mb-2">
            <KeyRound size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">CMCMIS SAC Portal</h3>
          <p className="text-[10px] text-slate-400">Secure Administrative Authentication</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee ID</label>
            <div className="mt-1 rounded-xl border border-indigo-150 bg-indigo-50/20 px-3 py-2 text-xs font-semibold text-slate-700">SA79900</div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
            <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">••••••••</div>
          </div>
          <div className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-xs font-bold text-white shadow-sm shadow-indigo-150 hover:bg-indigo-700 transition">Sign In</div>
        </div>
        <Callout top="top-[185px]" left="left-[230px]" text="Click Sign In" />
      </div>
    </BrowserFrame>
  );
}

function JobRequestCreateVisual() {
  return (
    <BrowserFrame title="/job-requests/new">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Job Requests" />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Create New Request</h3>
              <p className="text-[10px] text-slate-400">Fill calibration or repair details</p>
            </div>
            <span className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Submit</span>
          </div>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Job Type</label>
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-semibold text-slate-700">Calibration (NABL)</div>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Category</label>
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-semibold text-slate-700">TME Instruments</div>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Equipment Reference</label>
              <div className="mt-1 rounded-lg border border-indigo-200 bg-indigo-50/20 px-2 py-1.5 font-semibold text-indigo-700 flex justify-between items-center">
                <span>EQ-10442 (Spectrum Analyzer)</span>
                <span className="text-[9px] text-emerald-650 bg-emerald-50 px-1.5 py-0.5 rounded-md">Verified</span>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Complaint / Remarks</label>
              <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-655 font-medium">Display flickers on power up; check RF attenuation values.</div>
            </div>
          </div>
          <Callout top="top-[190px]" left="left-[240px]" text="Confirm & click Submit" />
        </div>
      </div>
    </BrowserFrame>
  );
}

function JobRequestDetailVisual() {
  return (
    <BrowserFrame title="/job-requests/JR-2026-0842">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Job Requests" />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">JR-2026-0842</h3>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Approved</span>
              </div>
              <p className="text-[10px] text-slate-400">Submitted by Dr. K. Kumar (TME Division)</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-555 cursor-pointer">View PDF</span>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-lg">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Instrument</p>
                <p className="font-semibold text-slate-700 mt-0.5">Signal Generator (EQ-10024)</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Calibration Due</p>
                <p className="font-semibold text-slate-700 mt-0.5">14-Sep-2026</p>
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-150 p-3 rounded-lg space-y-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Workflow Journey</p>
              <div className="flex items-center text-[10px] font-semibold text-slate-500">
                <span className="h-4 w-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold">1</span>
                <span className="ml-1 text-slate-700">Drafted</span>
                <span className="flex-1 h-[2px] bg-indigo-600 mx-1"></span>
                <span className="h-4 w-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold">2</span>
                <span className="ml-1 text-slate-700">Submitted</span>
                <span className="flex-1 h-[2px] bg-indigo-600 mx-1"></span>
                <span className="h-4 w-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold">3</span>
                <span className="ml-1 text-slate-700">Approved</span>
              </div>
            </div>
          </div>
          <Callout top="top-[80px]" left="left-[240px]" text="Track real-time updates" />
        </div>
      </div>
    </BrowserFrame>
  );
}

function EquipmentVisual() {
  return (
    <BrowserFrame title="/equipment">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Equipment" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <SearchBar text="Search equipment by serial number..." />
            <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 cursor-pointer">Filter</span>
          </div>
          
          <div className="overflow-hidden rounded-xl border border-slate-150">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b">
                <tr>
                  <th className="py-2 px-3">Code / ID</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Division</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold text-slate-700">
                <tr className="hover:bg-slate-50 cursor-pointer bg-slate-50/30">
                  <td className="py-2.5 px-3 text-indigo-600">EQ-10024</td>
                  <td className="py-2.5 px-3">Spectrum Analyzer</td>
                  <td className="py-2.5 px-3">TME</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">Active</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-2.5 px-3 text-indigo-600">EQ-10041</td>
                  <td className="py-2.5 px-3">RF Calibrator</td>
                  <td className="py-2.5 px-3">FPE</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">Active</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function DashboardVisual() {
  return (
    <BrowserFrame title="/dashboard">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Dashboard" />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-4 shadow-sm relative overflow-hidden">
              <span className="absolute right-3 top-3 inline-flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <div className="text-xl font-bold text-slate-800">14</div>
              <div className="text-[10px] font-semibold text-slate-550">Pending Job Requests</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-4 shadow-sm">
              <div className="text-xl font-bold text-slate-800">28</div>
              <div className="text-[10px] font-semibold text-slate-555">Completed Job Cards</div>
            </div>
          </div>
          
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Live Calibration Timeline</h4>
            <div className="flex gap-2 h-16 items-end pb-1 select-none">
              <div className="flex-1 bg-indigo-500 h-10 rounded-md" title="Mon"></div>
              <div className="flex-1 bg-indigo-500 h-14 rounded-md" title="Tue"></div>
              <div className="flex-1 bg-indigo-300 h-6 rounded-md" title="Wed"></div>
              <div className="flex-1 bg-indigo-500 h-16 rounded-md" title="Thu"></div>
              <div className="flex-1 bg-emerald-500 h-8 rounded-md" title="Fri"></div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function InquiryVisual() {
  return (
    <BrowserFrame title="/inquiry">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Inquiry" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex border-b text-xs font-semibold text-slate-400 gap-4 select-none pb-2">
            <span className="text-indigo-600 border-b-2 border-indigo-600 pb-2">Instruments</span>
            <span>Vendors</span>
            <span>Job Requests</span>
          </div>
          <SearchBar text="Search across entire portal..." />
          <div className="space-y-2.5">
            <div className="p-3 border rounded-xl hover:bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Agilent Oscilloscope</h4>
                <p className="text-[10px] text-slate-400">Model: DSOX3024A | Serial: MY52102</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-lg">EQ-10024</span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ReportsVisual() {
  return (
    <BrowserFrame title="/reports">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Reports" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-2 select-none">
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-indigo-200 hover:bg-indigo-50/10 cursor-pointer">
              <h4 className="text-xs font-bold text-slate-800">Calibration Due Report</h4>
              <p className="text-[9px] text-slate-400">Instruments due in next 30 days</p>
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-indigo-200 hover:bg-indigo-50/10 cursor-pointer">
              <h4 className="text-xs font-bold text-slate-800">Job Cards Status Log</h4>
              <p className="text-[9px] text-slate-400">Real-time technician roster</p>
            </div>
          </div>
          <div className="border-t pt-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Form: PDF Document</span>
            <div className="flex gap-2">
              <span className="bg-emerald-600 px-3 py-1.5 rounded-lg text-white font-bold cursor-pointer">Export Excel</span>
              <span className="bg-indigo-600 px-3 py-1.5 rounded-lg text-white font-bold cursor-pointer">View Report</span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ConversionVisual() {
  return (
    <BrowserFrame title="/conversion">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Conversion" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <SearchBar text="Filter pending approvals..." />
          <div className="space-y-3">
            <div className="p-3 border border-indigo-100 bg-indigo-50/5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">JR-2026-0842</span>
                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">Awaiting LIC Action</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Spectrum Analyzer (EQ-10024) - Cal Calibration</p>
              <div className="flex gap-2 items-center text-xs border-t pt-2.5">
                <div className="flex-1 rounded-lg border px-2.5 py-1 text-slate-500 bg-white text-[10px]">Assign Technician: R. Sharma</div>
                <span className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-[10px] cursor-pointer">Convert to JC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

// 
function JobCardsVisual() {
  return (
    <BrowserFrame title="/job-cards">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Job Cards" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex border-b text-xs font-semibold text-slate-400 gap-4 pb-2">
            <span className="text-indigo-600 border-b-2 border-indigo-600 pb-2">Details</span>
            <span>Tasks Checklist</span>
            <span>Attachments</span>
          </div>
          <div className="p-3 border rounded-xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <h4 className="font-bold text-slate-800">JC-2026-1004</h4>
              <span className="bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">In Progress</span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-550 font-semibold">
              <p>Technician: R. Sharma (TME Lab)</p>
              <p>Start Date: 03-Jun-2026</p>
            </div>
            <div className="border-t pt-2 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Completed: 2/5 Tasks</span>
              <span className="text-indigo-600 font-bold cursor-pointer">View Workspace</span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ScheduleVisual() {
  return (
    <BrowserFrame title="/schedule">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Schedule" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2 select-none">
            <h4 className="text-xs font-bold text-slate-800">Weekly Cal Allocations</h4>
            <span className="text-[10px] text-indigo-600 font-bold cursor-pointer">Next Week</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold">
            <div className="border rounded-xl p-2 bg-slate-50/50">
              <p className="text-slate-400 font-bold uppercase text-[8px]">04 Jun</p>
              <p className="text-slate-800 mt-1">EQ-10024</p>
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="border border-indigo-200 rounded-xl p-2 bg-indigo-50/10">
              <p className="text-indigo-500 font-bold uppercase text-[8px]">05 Jun</p>
              <p className="text-slate-800 mt-1">EQ-10041</p>
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            </div>
            <div className="border rounded-xl p-2 bg-slate-50/50">
              <p className="text-slate-400 font-bold uppercase text-[8px]">06 Jun</p>
              <p className="text-slate-500 mt-1">Free Slot</p>
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-slate-300"></span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ChecklistsVisual() {
  return (
    <BrowserFrame title="/admin/checklists">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Checklists" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-xs font-bold text-slate-800">Checklists Directory</h4>
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer">+ New Checklist</span>
          </div>
          <div className="space-y-2 text-xs font-semibold">
            <div className="p-3 border rounded-xl bg-slate-50/30">
              <div className="flex items-center justify-between">
                <span className="text-slate-800">Spectrum Analyzer Checklist</span>
                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[8px] font-bold uppercase border border-indigo-150">6 Tasks</span>
              </div>
              <p className="text-[10px] text-slate-450 mt-1">For Equipment Type: TME-SA-04</p>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function LabCapacityVisual() {
  return (
    <BrowserFrame title="/admin/lab-capacity">
      <div className="grid gap-4 grid-cols-[110px_1fr]">
        <MiniNav active="Lab Capacity" />
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2.5 border rounded-xl bg-slate-50/50 shadow-inner">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Active Backlog</p>
              <p className="text-lg font-extrabold text-slate-800 mt-1">24 Jobs</p>
            </div>
            <div className="p-2.5 border border-red-100 bg-red-50/10 rounded-xl shadow-inner">
              <p className="text-[9px] font-bold text-red-500 uppercase">Alerts Density</p>
              <p className="text-lg font-extrabold text-red-700 mt-1">2 Technicians</p>
            </div>
          </div>
          <div className="rounded-xl border p-3 bg-white space-y-2">
            <h4 className="text-[10px] font-bold text-slate-700">Roster Distribution</h4>
            <div className="space-y-1.5 text-[10px] font-semibold text-slate-600">
              <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-150">
                <span>R. Sharma (ID: 104)</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-250/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase">Low Load</span>
              </div>
              <div className="flex justify-between items-center bg-red-50/5 p-1.5 rounded-lg border border-red-150/40">
                <span>S. Verma (ID: 105)</span>
                <span className="bg-red-50 text-red-700 border border-red-250/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase">Critical (6 Jobs)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function TopBarVisual() {
  return (
    <BrowserFrame title="Common top bar">
      <div className="space-y-4">
        <TopBarMock active="topbar" />
        <div className="grid gap-3 md:grid-cols-3">
          <MiniFeature icon={Search} label="Search records" />
          <MiniFeature icon={Bell} label="Read alerts" />
          <MiniFeature icon={UserCircle} label="Open account" />
        </div>
        <Callout top="top-[36px]" left="left-[250px]" text="Use this from any page" />
      </div>
    </BrowserFrame>
  );
}

function GlobalSearchVisual() {
  return (
    <BrowserFrame title="Global search">
      <div className="space-y-4">
        <TopBarMock active="search" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left">
          <SearchBar text="JR-2026" />
          <div className="mt-3 space-y-1 text-xs">
            <div className="px-2 pb-1 text-[9px] font-bold text-indigo-650 uppercase border-b select-none">Autocomplete matches</div>
            <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between">
              <div>
                <p className="font-bold text-slate-800">JR-2026-0842</p>
                <p className="text-[10px] text-slate-450">Spectrum Analyzer Calibration</p>
              </div>
              <span className="text-[9px] text-emerald-650 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 self-center">Approved</span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ModuleSearchVisual() {
  return (
    <BrowserFrame title="Module search and filters">
      <div className="grid gap-4 md:grid-cols-[110px_1fr]">
        <MiniNav active="Reports" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <SearchBar text="Search inside this module" />
          <div className="flex flex-wrap gap-1.5 text-[9px] font-bold select-none">
            <span className="rounded bg-indigo-50 text-indigo-600 border px-2 py-1">Category: TME</span>
            <span className="rounded bg-slate-50 text-slate-500 border px-2 py-1">Status: Active</span>
            <span className="rounded bg-slate-50 text-slate-500 border px-2 py-1">Date: 30 Days</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left text-[10px] font-semibold text-slate-700">
              <tr className="bg-slate-50 border-b text-[8px] text-slate-450 uppercase font-bold">
                <th className="p-2">Code</th>
                <th className="p-2">Owner</th>
              </tr>
              <tr>
                <td className="p-2 text-indigo-600">EQ-10024</td>
                <td className="p-2">TME Lab</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function NotificationsVisual() {
  return (
    <BrowserFrame title="/notifications">
      <div className="grid gap-4 md:grid-cols-[110px_1fr]">
        <MiniNav active="Notifications" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="mb-2 flex items-center justify-between border-b pb-2 select-none">
            <span className="text-xs font-bold text-slate-800">System Notifications</span>
            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer">Mark all read</span>
          </div>
          <div className="space-y-2 text-xs font-semibold">
            <div className="p-2 bg-indigo-50/20 border border-indigo-100/60 rounded-xl relative">
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
              <p className="text-slate-800 text-[11px] font-bold">Job request JR-2026-0842 Approved</p>
              <p className="text-[9px] text-slate-400 mt-1">LIC converted this request into Job Card JC-2026-1004.</p>
            </div>
            <div className="p-2 bg-slate-50/40 border border-slate-150 rounded-xl">
              <p className="text-slate-700 text-[11px]">Job card JC-2026-0924 assigned to you</p>
              <p className="text-[9px] text-slate-400 mt-1">Assigned by Lab In-Charge on 02-Jun-2026.</p>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function AccountMenuVisual() {
  return (
    <BrowserFrame title="Profile dropdown">
      <div className="space-y-4">
        <TopBarMock active="account" />
        <div className="ml-auto w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl text-left">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-md">SA</span>
            <div className="leading-tight">
              <p className="text-xs font-bold text-slate-800">Dr. K. Kumar</p>
              <p className="text-[9px] text-slate-450 mt-0.5 uppercase tracking-wider font-semibold">TME In-Charge</p>
            </div>
          </div>
          <div className="mt-2.5 space-y-1 text-xs font-bold">
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <UserCircle size={15} className="text-slate-400" />
              <span>My Profile</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-rose-500 hover:bg-rose-50/50 cursor-pointer">
              <LogOut size={15} />
              <span>Sign Out</span>
            </div>
          </div>
        </div>
        <Callout top="top-[42px]" left="left-[270px]" text="Click profile area" />
      </div>
    </BrowserFrame>
  );
}

function ProfileVisual() {
  return (
    <BrowserFrame title="/profile">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-4 border-b pb-3.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-base font-bold text-white shadow-md">KK</span>
          <div className="leading-tight">
            <p className="text-base font-bold text-slate-800">Dr. K. Kumar</p>
            <p className="text-xs text-slate-500">Employee ID: SA79900</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Division</p>
            <p className="mt-1 font-bold text-slate-750">TME Calibrations</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase">System Role</p>
            <p className="mt-1 font-bold text-slate-750">Lab In-Charge</p>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function AboutVisual() {
  return (
    <BrowserFrame title="/about">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-sm">
            <Info size={22} />
          </span>
          <div className="leading-tight">
            <p className="text-md font-bold text-slate-800">CMCMIS SAC</p>
            <p className="text-xs text-slate-400">Version 2.4.0 (Simplified)</p>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-655 leading-relaxed space-y-2 border-t pt-3">
          <p>Calibration & Maintenance Management Information System designed for ISRO Space Applications Centre.</p>
          <p>Provides end-to-end telemetry workflows, NABL checklist enforcement, and technician capacity forecasting.</p>
        </div>
      </div>
    </BrowserFrame>
  );
}

function MiniNav({ active }) {
  const primaryItems = ['Dashboard', 'Job Requests', 'Conversion', 'Job Cards', 'Equipment'];
  const items = primaryItems.includes(active)
    ? primaryItems
    : [active, ...primaryItems.filter((item) => item !== active)].slice(0, 5);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 h-8 rounded-xl bg-slate-100" />
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div
            key={item}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              item === active ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100' : 'text-slate-400'
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopBarMock({ active }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="h-9 w-9 rounded-xl bg-slate-100" />
      <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${active === 'search' ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
        <Search size={16} className="text-slate-400" />
        <span className="truncate text-xs font-semibold text-slate-400">Search equipment, job requests, vendors...</span>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><Info size={17} /></span>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Bell size={17} /></span>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${active === 'account' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>SS</span>
    </div>
  );
}

function MiniFeature({ icon: Icon, label }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <Icon className="mx-auto text-sky-600" size={22} />
      <p className="mt-2 text-xs font-semibold text-slate-700">{label}</p>
    </div>
  );
}

function MiniMenuRow({ icon: Icon, label, danger }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}>
      <Icon size={16} />
      {label}
    </div>
  );
}

function VisualInput({ label, value }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}

function VisualRow({ index, label }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">{index}</span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="ml-auto h-2 w-20 rounded bg-slate-200" />
    </div>
  );
}

function HeaderCard({ icon: Icon, title, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Icon className="text-indigo-600" size={24} />
        <div>
          <div className="text-xl font-semibold text-slate-950">{title}</div>
          <div className="mt-1 text-xs font-semibold text-emerald-700">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function Timeline({ labels }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-slate-900">Status Timeline</div>
      <div className="flex items-center gap-2">
        {labels.map((item, idx) => (
          <div key={item} className="flex flex-1 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">{idx + 1}</span>
            <span className="text-xs font-semibold text-slate-600">{item}</span>
            {idx < labels.length - 1 ? <span className="h-0.5 flex-1 bg-slate-200" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchBar({ text }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <Search size={17} className="text-slate-400" />
      <span className="text-sm font-medium text-slate-400">{text}</span>
    </div>
  );
}

function ListRow({ title, subtitle, tag, showCallout }) {
  return (
    <div className="relative flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
      </div>
      <div className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{tag}</div>
      {showCallout ? <Callout top="top-[4px]" left="left-[235px]" text="Open details" /> : null}
    </div>
  );
}

function CoreFeatureHighlights() {
  const features = [
    {
      icon: Search,
      title: 'One search mindset',
      text: 'Global search and in-module search reduce confusion by helping users find records through IDs, names, statuses, or keywords.',
    },
    {
      icon: ShieldCheck,
      title: 'Role-wise simple access',
      text: 'Every role sees only the modules needed for daily work, which keeps the screen clean and prevents accidental actions.',
    },
    {
      icon: ClipboardList,
      title: 'Clear work journey',
      text: 'Job requests, conversion, job cards, schedules, reports, and notifications follow a natural work sequence.',
    },
    {
      icon: Bell,
      title: 'Action awareness',
      text: 'Notifications and status cards help users know what changed and what needs attention without checking every page.',
    },
    {
      icon: BarChart3,
      title: 'Readable reports',
      text: 'Reports, tables, filters, PDF, Excel, and print actions support quick review and easy sharing.',
    },
    {
      icon: UserCircle,
      title: 'Simple account control',
      text: 'Profile, role information, and logout are available from predictable common places.',
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-[0_16px_42px_rgba(14,165,233,0.12)]">
      <div className="border-b border-sky-100/70 px-6 py-6 md:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
          <CheckCircle2 size={14} strokeWidth={2.2} aria-hidden="true" />
          Main core features
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          What makes CMCMIS easy to use
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          CMCMIS is designed so users can move from search to action to review with minimum confusion.
          The interface keeps important actions visible, uses consistent cards and tables, and separates role work clearly.
        </p>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3 md:px-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm ring-1 ring-sky-50">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <h3 className="text-base font-semibold text-slate-950">{feature.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Callout({ top, left, text }) {
  return (
    <div className={`pointer-events-none absolute ${top} ${left} hidden items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-xl lg:flex`}>
      <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      {text}
    </div>
  );
}
