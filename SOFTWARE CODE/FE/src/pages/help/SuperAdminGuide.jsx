import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  IdCard,
  Info,
  KeyRound,
  LineChart,
  LogOut,
  ListChecks,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCircle,
  Users,
  Wrench,
} from 'lucide-react';

const superAdminModules = [
  {
    id: 'sa-login',
    group: 'Basic',
    title: 'Login and First Check',
    subtitle: 'Enter CMCMIS safely and confirm Super Admin access.',
    icon: KeyRound,
    accent: 'bg-sky-50 text-sky-600',
    to: '/login',
    action: 'Open Login',
    steps: [
      'Open the CMCMIS portal link.',
      'Enter the Super Admin employee ID and password.',
      'Select Sign In.',
      'Confirm that the top-right profile area shows the Super Admin role.',
      'If the role is incorrect, stop administrative work and verify the account.',
    ],
    tips: ['Use Super Admin only for administration and oversight.', 'Logout after finishing work on shared machines.'],
    visual: 'login',
  },
  {
    id: 'sa-dashboard',
    group: 'Overview',
    title: 'Dashboard',
    subtitle: 'Start with KPIs, work status, equipment status, and latest operational signals.',
    icon: Gauge,
    accent: 'bg-indigo-50 text-indigo-600',
    to: '/dashboard',
    action: 'Open Dashboard',
    steps: [
      'Open Dashboard from the sidebar.',
      'Review KPI cards such as pending jobs, completed jobs, active equipment, users, and audits.',
      'Click clickable KPI cards to move into the related list or detail page.',
      'Use the dashboard as a first health check before opening deeper modules.',
      'Use visible status and trend information to decide which area needs attention.',
    ],
    tips: ['Dashboard is for quick control-room review.', 'Open Reports when exact row-level data is required.'],
    visual: 'dashboard',
  },
  {
    id: 'sa-job-requests',
    group: 'Work Execution',
    title: 'Job Requests',
    subtitle: 'Review submitted requests, search IDs, open details, and understand request status.',
    icon: FileText,
    accent: 'bg-violet-50 text-violet-600',
    to: '/job-requests',
    action: 'Open Job Requests',
    steps: [
      'Open Job Requests from the sidebar.',
      'Use search or filters to find requests by JR ID, equipment, status, category, or submitter.',
      'Open a request detail page to review submitted data.',
      'Check request type, category, status, submitter, equipment, complaint, and timeline.',
      'Use this module for audit and operational visibility before conversion or follow-up.',
    ],
    tips: ['Use exact JR IDs when available.', 'For workflow decisions, also inspect the request timeline.'],
    visual: 'table',
  },
  {
    id: 'sa-conversion',
    group: 'Work Execution',
    title: 'Conversion',
    subtitle: 'Monitor how accepted requests are converted into job cards.',
    icon: RefreshCw,
    accent: 'bg-emerald-50 text-emerald-600',
    to: '/conversion',
    action: 'Open Conversion',
    steps: [
      'Open Conversion from the sidebar.',
      'Review requests waiting for Lab In-Charge action.',
      'Open the request before conversion to confirm equipment, lab, complaint, and category.',
      'Check that assignment and conversion decisions are correct.',
      'Use this area to supervise conversion quality and prevent incorrect job card creation.',
    ],
    tips: ['Conversion connects request intake to job execution.', 'Use this area carefully because it affects job cards.'],
    visual: 'workflow',
  },
  {
    id: 'sa-job-cards',
    group: 'Work Execution',
    title: 'Job Cards',
    subtitle: 'Track assigned work, progress, documents, completion, and job card status.',
    icon: ClipboardList,
    accent: 'bg-amber-50 text-amber-600',
    to: '/job-cards',
    action: 'Open Job Cards',
    steps: [
      'Open Job Cards from the sidebar.',
      'Search by job card number, related JR ID, equipment, engineer, or status.',
      'Open a job card to inspect tabs, status, remarks, documents, and history.',
      'Use filters to separate assigned, in-progress, completed, or closed work.',
      'Review job card details before administrative follow-up or reporting.',
    ],
    tips: ['Job Cards are the main execution record.', 'Use status filters first when the list is large.'],
    visual: 'job-card',
  },
  {
    id: 'sa-equipment',
    group: 'Assets and Lab',
    title: 'Equipment',
    subtitle: 'Search registered equipment, open details, and verify equipment data quality.',
    icon: Wrench,
    accent: 'bg-sky-50 text-sky-600',
    to: '/equipment',
    action: 'Open Equipment',
    steps: [
      'Open Equipment from the sidebar.',
      'Use search to find equipment by ID, name, serial number, division, or status.',
      'Open equipment details to review identity, status, related records, and history.',
      'Check that users create job requests against the correct equipment record.',
      'Use Equipment Verification when administrative approval is required.',
    ],
    tips: ['Correct equipment identity prevents wrong job requests.', 'Use details pages before making administrative decisions.'],
    visual: 'equipment',
  },
  {
    id: 'sa-schedule',
    group: 'Assets and Lab',
    title: 'Schedule',
    subtitle: 'Review planned work, dates, and lab workload alignment.',
    icon: Calendar,
    accent: 'bg-rose-50 text-rose-600',
    to: '/schedule',
    action: 'Open Schedule',
    steps: [
      'Open Schedule from the sidebar.',
      'Review upcoming work by visible date, status, equipment, or lab.',
      'Use schedule information to understand whether workload is balanced.',
      'Coordinate with lab roles when planned work needs correction.',
      'Use Schedule together with Job Cards for daily work tracking.',
    ],
    tips: ['Schedule is planning support.', 'Reports are better for formal extracts and summaries.'],
    visual: 'schedule',
  },
  {
    id: 'sa-inquiry',
    group: 'Assets and Lab',
    title: 'Inquiry',
    subtitle: 'Search across equipment, vendors, job requests, and job cards from a guided inquiry surface.',
    icon: Search,
    accent: 'bg-cyan-50 text-cyan-600',
    to: '/inquiry',
    action: 'Open Inquiry',
    steps: [
      'Open Inquiry from the sidebar.',
      'Choose the correct tab such as equipment, vendors, job requests, or job cards.',
      'Type a short search term or exact ID.',
      'Open the matching result to review details.',
      'Use Inquiry when you know what you need but not where it is stored.',
    ],
    tips: ['Inquiry is the fastest discovery module.', 'Short search terms usually return broader results.'],
    visual: 'search',
  },
  {
    id: 'sa-analytics',
    group: 'Insights',
    title: 'Analytics',
    subtitle: 'Use charts for trend review, workload understanding, and quick visual comparison.',
    icon: LineChart,
    accent: 'bg-fuchsia-50 text-fuchsia-600',
    to: '/analytics',
    action: 'Open Analytics',
    steps: [
      'Open Analytics from the sidebar.',
      'Review charts for workload, status, equipment, job activity, or lab performance.',
      'Use filters when available to narrow the data.',
      'Compare visual trends before opening Reports for exact rows.',
      'Use Analytics for meetings, operational review, and quick performance checks.',
    ],
    tips: ['Charts show patterns quickly.', 'Use Reports when exact rows or exports are required.'],
    visual: 'analytics',
  },
  {
    id: 'sa-reports',
    group: 'Insights',
    title: 'Reports',
    subtitle: 'Open report cards, filter data, review tables, download PDF/Excel, and print.',
    icon: BarChart3,
    accent: 'bg-blue-50 text-blue-600',
    to: '/reports',
    action: 'Open Reports',
    steps: [
      'Open Reports from the sidebar.',
      'Select the report card needed for the task.',
      'Apply available filters such as date, status, lab, division, or category.',
      'Review the table columns and row details.',
      'Use PDF, Excel, or Print when the filtered report must be shared or archived.',
    ],
    tips: ['Reports are best for formal review.', 'Apply filters before downloading to avoid unnecessary rows.'],
    visual: 'reports',
  },
  {
    id: 'sa-admin-users',
    group: 'Administration',
    title: 'Admin Users',
    subtitle: 'Manage user accounts, role assignment, status, and administrative account actions.',
    icon: Users,
    accent: 'bg-indigo-50 text-indigo-600',
    to: '/admin/users',
    action: 'Open Users',
    steps: [
      'Open Admin Users from the sidebar.',
      'Search for a user by name, employee ID, email, or role.',
      'Review the user role and account status before making changes.',
      'Use role/status actions only when the change is approved.',
      'After changes, confirm the user can see only the intended modules.',
    ],
    tips: ['User management affects system access.', 'Check role carefully before updating permissions.'],
    visual: 'admin',
  },
  {
    id: 'sa-admin-employees',
    group: 'Administration',
    title: 'Admin Employees',
    subtitle: 'Maintain employee master records used across the system.',
    icon: IdCard,
    accent: 'bg-emerald-50 text-emerald-600',
    to: '/admin/employees',
    action: 'Open Employees',
    steps: [
      'Open Admin Employees from the sidebar.',
      'Search by employee ID, name, designation, or lab details.',
      'Open or create employee records according to the visible actions.',
      'Verify required employee information before saving.',
      'Use employee records as the identity base for users and workflow assignment.',
    ],
    tips: ['Clean employee records improve assignment accuracy.', 'Avoid duplicate employee entries.'],
    visual: 'admin',
  },
  {
    id: 'sa-equipment-verification',
    group: 'Administration',
    title: 'Equipment Verification',
    subtitle: 'Approve, verify, or review equipment records requiring Super Admin attention.',
    icon: BadgeCheck,
    accent: 'bg-teal-50 text-teal-600',
    to: '/admin/equipment-verification',
    action: 'Open Verification',
    steps: [
      'Open Equipment Verification from the sidebar.',
      'Review equipment entries waiting for verification.',
      'Check identity, serial number, ownership, status, and supporting details.',
      'Approve or take the available action only after confirming correctness.',
      'Return to Equipment details when deeper record context is required.',
    ],
    tips: ['Verification improves equipment master quality.', 'Do not approve unclear or duplicate equipment records.'],
    visual: 'verify',
  },
  {
    id: 'sa-terms',
    group: 'Administration',
    title: 'Terms and Conditions',
    subtitle: 'Maintain terms shown during relevant workflows and submissions.',
    icon: FileText,
    accent: 'bg-amber-50 text-amber-600',
    to: '/admin/terms',
    action: 'Open Terms',
    steps: [
      'Open Admin Terms and Conditions from the sidebar.',
      'Review the current active terms.',
      'Edit or update only approved text.',
      'Confirm that terms are readable and suitable for non-technical users.',
      'Save changes only after checking spelling, meaning, and compliance requirement.',
    ],
    tips: ['Terms text is user-facing.', 'Keep wording simple and official.'],
    visual: 'settings',
  },
  {
    id: 'sa-projects',
    group: 'Administration',
    title: 'Projects',
    subtitle: 'Manage project master information used for categorization and tracking.',
    icon: Settings,
    accent: 'bg-slate-100 text-slate-700',
    to: '/admin/projects',
    action: 'Open Projects',
    steps: [
      'Open Admin Projects from the sidebar.',
      'Search for existing project entries before creating a new one.',
      'Add or update project details using approved naming.',
      'Keep inactive or duplicate project records under control.',
      'Confirm the project appears correctly wherever it is used.',
    ],
    tips: ['Project names should be consistent.', 'Search first to avoid duplicates.'],
    visual: 'settings',
  },
  {
    id: 'sa-tasks',
    group: 'Administration',
    title: 'Tasks',
    subtitle: 'Maintain task master data used for workflow categorization.',
    icon: ClipboardList,
    accent: 'bg-purple-50 text-purple-600',
    to: '/admin/tasks',
    action: 'Open Tasks',
    steps: [
      'Open Admin Tasks from the sidebar.',
      'Review existing task names and categories.',
      'Create or update task entries only when needed.',
      'Keep task names short, meaningful, and easy for users to select.',
      'Confirm changed tasks still make sense in related workflows.',
    ],
    tips: ['Good task names reduce user confusion.', 'Avoid near-duplicate task labels.'],
    visual: 'settings',
  },
  {
    id: 'sa-checklist-mgmt',
    group: 'Administration',
    title: 'Checklist Management',
    subtitle: 'Create and configure task checklists linked to equipment types.',
    icon: ListChecks,
    accent: 'bg-indigo-50 text-indigo-600',
    to: '/admin/checklists',
    action: 'Open Checklists',
    steps: [
      'Open Checklist Mgmt from the sidebar.',
      'Check the metric counters for total checklists, covered equipment, and defined tasks.',
      'Use the search bar to locate specific equipment checklists or names.',
      'Expand any checklist card to view individual task descriptions and NABL/NON-NABL scopes.',
      'To edit, click the Edit icon, resolve the equipment code, and add/remove tasks.',
      'Save the checklist once tasks and scopes are verified.',
    ],
    tips: ['Checklists are fetched dynamically when creating job cards from converted requests.', 'Specify NABL/NON-NABL types carefully to match standard guidelines.'],
    visual: 'checklists',
  },
  {
    id: 'sa-lab-capacity',
    group: 'Administration',
    title: 'Lab Capacity',
    subtitle: 'Monitor technician backlog, turnaround compliance, and allocation density.',
    icon: LineChart,
    accent: 'bg-emerald-50 text-emerald-600',
    to: '/admin/lab-capacity',
    action: 'Open Lab Capacity',
    steps: [
      'Open Lab Capacity from the sidebar.',
      'Review overall SLA compliance rate dials and backlog numbers.',
      'Inspect bottleneck alerts pointing to technicians with heavy workloads.',
      'Scroll to the technician roster to analyze active jobs, average cycle days, and status (e.g. Critical, Low).',
      'Use these capacity insights during meetings or during backlog optimization.',
    ],
    tips: ['Real-time logs are loaded automatically on page load.', 'Refresh stats using the refresh button on top-right.'],
    visual: 'lab-capacity',
  },
  {
    id: 'sa-audit',
    group: 'Administration',
    title: 'Audit Log',
    subtitle: 'Review system activity, user actions, and administrative trace history.',
    icon: ShieldCheck,
    accent: 'bg-rose-50 text-rose-600',
    to: '/audit',
    action: 'Open Audit Log',
    steps: [
      'Open Admin Audit Log from the sidebar.',
      'Use filters to find activity by user, action, module, or date.',
      'Open detail records when more context is required.',
      'Use audit information to verify what changed and who performed the action.',
      'Treat audit logs as read-only evidence.',
    ],
    tips: ['Audit Log is for traceability.', 'Do not use audit review as a replacement for normal workflow checks.'],
    visual: 'audit',
  },
];

const commonSections = [
  {
    id: 'sa-common-topbar',
    title: 'Top Bar Use Cases',
    subtitle: 'Use the top bar for quick search, notifications, help context, and account actions from any page.',
    icon: Monitor,
    accent: 'bg-sky-50 text-sky-600',
    to: '/dashboard',
    action: 'Open Dashboard',
    visual: 'common-topbar',
    steps: [
      'Look at the top area of the screen after login.',
      'Use the menu button to expand or collapse the sidebar when you need more space.',
      'Use the global search box to find equipment, job requests, vendors, or job cards.',
      'Use the right-side icons to open information, notifications, and profile actions.',
    ],
    tips: ['The top bar stays available across most pages.', 'Start from global search when you are not sure which module contains the record.'],
  },
  {
    id: 'sa-common-search',
    title: 'Global Search Bar',
    subtitle: 'Find important records quickly without opening every module one by one.',
    icon: Search,
    accent: 'bg-indigo-50 text-indigo-600',
    to: '/inquiry',
    action: 'Open Inquiry',
    visual: 'common-global-search',
    steps: [
      'Click the search field in the top bar.',
      'Type an equipment ID, job request ID, job card number, vendor name, or keyword.',
      'Review the visible matches.',
      'Select the correct result to open the related page.',
    ],
    tips: ['Use fewer words if search results are too narrow.', 'Use exact IDs when you have them.'],
  },
  {
    id: 'sa-common-module-search',
    title: 'In-Module Search and Filters',
    subtitle: 'Use local search boxes inside pages to narrow table rows and lists.',
    icon: SlidersHorizontal,
    accent: 'bg-emerald-50 text-emerald-600',
    to: '/reports',
    action: 'Open Reports',
    visual: 'common-module-search',
    steps: [
      'Open a module such as Equipment, Job Requests, Job Cards, Inquiry, Reports, or Schedule.',
      'Use the page search box to type the exact ID, name, status, or keyword.',
      'Apply filters such as status, category, lab, or date when available.',
      'Clear the search or filter when you want to return to the full list.',
    ],
    tips: ['Module search is best when you already know which module contains the data.', 'Filters help reduce long lists into readable rows.'],
  },
  {
    id: 'sa-common-notifications',
    title: 'Notifications',
    subtitle: 'Review system updates, assigned work, approvals, and important activity alerts.',
    icon: Bell,
    accent: 'bg-amber-50 text-amber-600',
    to: '/notifications',
    action: 'Open Notifications',
    visual: 'common-notifications',
    steps: [
      'Click the notification icon in the top bar or open Notifications from the sidebar if visible.',
      'Read the latest messages and status updates.',
      'Open any linked record if the notification includes one.',
      'Use notifications to follow changes without manually checking every module.',
    ],
    tips: ['Unread items help identify what needs attention.', 'Some roles may see fewer notifications based on permission.'],
  },
  {
    id: 'sa-common-profile-menu',
    title: 'Top-Right Profile Dropdown and Logout',
    subtitle: 'Open your account dropdown from the top-right profile area.',
    icon: UserCircle,
    accent: 'bg-violet-50 text-violet-600',
    to: '/profile',
    action: 'Open Profile',
    visual: 'common-account-menu',
    steps: [
      'Click the top-right profile avatar, name, or dropdown arrow.',
      'Choose Profile to review your account details.',
      'Choose Logout when your work is complete.',
      'Do not leave a Super Admin session active on shared systems.',
    ],
    tips: ['Always logout from shared systems.', 'The dropdown is the fastest place to open profile settings.'],
  },
  {
    id: 'sa-common-profile-page',
    title: 'Profile Page',
    subtitle: 'Check your role, employee information, and account details.',
    icon: UserCircle,
    accent: 'bg-rose-50 text-rose-600',
    to: '/profile',
    action: 'Open Profile',
    visual: 'common-profile',
    steps: [
      'Open Profile from the sidebar or top-right account dropdown.',
      'Review your name, employee ID, email, role, and account status.',
      'Confirm that the displayed role matches your expected access.',
      'Contact the administrator if any profile information is incorrect.',
    ],
    tips: ['Your role decides which modules are visible.', 'Profile is read-friendly and helps confirm your access level.'],
  },
  {
    id: 'sa-common-about',
    title: 'About Page',
    subtitle: 'Understand the purpose, team, and system context of CMCMIS.',
    icon: Info,
    accent: 'bg-slate-100 text-slate-700',
    to: '/about',
    action: 'Open About',
    visual: 'common-about',
    steps: [
      'Open About Us from the sidebar.',
      'Read the system purpose and usage context.',
      'Review project or team information when needed.',
      'Use this page when explaining CMCMIS to a new user.',
    ],
    tips: ['About page is informational only.', 'It is useful during onboarding and demonstrations.'],
  },
  {
    id: 'sa-common-navigation',
    title: 'Common Navigation and Account Controls',
    subtitle: 'Move around the system safely with consistent sidebar, top-bar, and account controls.',
    icon: MousePointerClick,
    accent: 'bg-cyan-50 text-cyan-600',
    to: '/home',
    action: 'Open Home',
    visual: 'common-navigation',
    steps: [
      'Use the sidebar group labels to find the correct module area.',
      'Click the ISRO logo to return to the CMCMIS home landing page.',
      'Use the Guide badge in the top bar to open the correct role guide.',
      'Use Profile and Logout from the account area when needed.',
    ],
    tips: ['Navigation is designed to stay consistent across modules.', 'Use Home and Guide whenever a new user needs orientation.'],
  },
  {
    id: 'sa-common-core',
    title: 'Main Core Features and UI/UX Ease',
    subtitle: 'Review why CMCMIS is easy to use for administrative and non-technical workflows.',
    icon: Sparkles,
    accent: 'bg-indigo-50 text-indigo-600',
    to: '/home',
    action: 'Open Home',
    visual: 'common-core',
    steps: [
      'Use role-wise modules to avoid unnecessary options.',
      'Use search, filters, and tables to move from broad review to exact records.',
      'Use timelines, status cards, and notifications to understand work progress.',
      'Use reports, exports, and audit views for formal review.',
    ],
    tips: ['The interface is designed around daily work flow.', 'Cards, filters, and exports reduce manual effort.'],
  },
];

const advancedGuidelines = [
  'Always search before creating or changing master data.',
  'Review details before approving, verifying, assigning, or changing status.',
  'Use reports and audit logs to confirm important administrative decisions.',
  'Keep role access clean: users should see only what they need for work.',
  'Prefer clear remarks and official names because they appear in reports and history.',
  'Use exports only after applying correct filters.',
];

export function SuperAdminGuide() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 font-sans">
      <Hero />
      <QuickIndex />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={ShieldCheck} title="Basic to advanced" text="Starts with login and navigation, then moves into work execution, assets, insights, and administration." />
        <SummaryCard icon={Users} title="SA only" text="This guide is visible only to the Super Admin role and replaces other role guides for SA." />
        <SummaryCard icon={MousePointerClick} title="Step by step" text="Each sidebar module includes clear actions, practical tips, and a visual preview." />
      </section>

      <SectionHeader
        eyebrow="Super Admin sidebar modules"
        title="End-to-end module guide"
        text="Follow these sections in the same order as daily Super Admin work: review, inspect, manage, verify, and audit."
      />

      <div className="space-y-6">
        {superAdminModules.map((module, index) => (
          <ModuleGuide key={module.id} module={module} index={index} />
        ))}
      </div>

      <SectionHeader
        eyebrow="Common modules"
        title="Controls used across every page"
        text="These common controls make daily administration faster and safer."
      />

      <div className="space-y-6">
        {commonSections.map((section, index) => (
          <CommonUseCase key={section.id} section={section} index={superAdminModules.length + index} />
        ))}
      </div>

      <Guidelines />
      <CoreFeatures />
    </div>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
        <div className="p-6 md:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-100">
            <ShieldCheck size={14} strokeWidth={2.2} aria-hidden="true" />
            Super Admin Role Guide
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Complete CMCMIS guide for Super Admin
          </h1>
          <p className="mt-4 max-w-3xl text-base font-normal leading-7 text-black">
            This guide explains CMCMIS from basic login to advanced administration. It covers every Super Admin sidebar module,
            common top-bar controls, search, profile, logout, reports, audit, and safe administration guidelines.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              ['Basic', 'basic'],
              ['Work Execution', 'work-execution'],
              ['Assets and Lab', 'assets-and-lab'],
              ['Insights', 'insights'],
              ['Administration', 'administration'],
              ['Guidelines', 'guidelines'],
            ].map(([label, id]) => (
              <a key={id} href={`#${id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 p-6 lg:border-l lg:border-t-0">
          <AdminConsoleVisual />
        </div>
      </div>
    </section>
  );
}

function QuickIndex() {
  const groups = ['Basic', 'Overview', 'Work Execution', 'Assets and Lab', 'Insights', 'Administration'];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <SlidersHorizontal size={20} strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Fast navigation</h2>
          <p className="text-sm text-slate-500">Jump to any Super Admin area quickly.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <a key={group} href={`#${slug(group)}`} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-700">
            {group}
          </a>
        ))}
      </div>
    </section>
  );
}

function SummaryCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <Icon size={21} strokeWidth={1.9} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }) {
  return (
    <section id={slug(title.includes('module') ? 'modules' : eyebrow)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{text}</p>
    </section>
  );
}

function ModuleGuide({ module, index }) {
  const Icon = module.icon;
  const isFirstInGroup = index === 0 || superAdminModules[index - 1].group !== module.group;

  return (
    <>
      {isFirstInGroup ? (
        <div id={slug(module.group)} className="scroll-mt-8 pt-1">
          <div className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
            {module.group}
          </div>
        </div>
      ) : null}
      <section id={module.id} className="scroll-mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-slate-100 p-6 md:p-8 lg:border-b-0 lg:border-r">
            <div className="flex items-start gap-4">
              <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${module.accent}`}>
                <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Step {index + 1}</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{module.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{module.subtitle}</p>
              </div>
            </div>

            <ol className="mt-6 space-y-3">
              {module.steps.map((step, stepIndex) => (
                <li key={step} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-sky-700 ring-1 ring-sky-100">
                    {stepIndex + 1}
                  </span>
                  <span className="text-sm font-medium leading-6 text-slate-700">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 size={17} strokeWidth={2} />
                Super Admin notes
              </p>
              <ul className="mt-2 space-y-1.5">
                {module.tips.map((tip) => (
                  <li key={tip} className="text-sm leading-6 text-emerald-900">{tip}</li>
                ))}
              </ul>
            </div>

            <Link to={module.to} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100">
              {module.action}
              <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>
          <div className="bg-slate-50 p-6 md:p-8">
            <ModuleVisual type={module.visual} title={module.title} />
          </div>
        </div>
      </section>
    </>
  );
}

function CommonCard({ section }) {
  const Icon = section.icon;
  return (
    <article id={section.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <Icon size={21} strokeWidth={1.9} />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{section.subtitle}</p>
        </div>
      </div>
      <ol className="mt-4 space-y-2">
        {section.steps.map((step, index) => (
          <li key={step} className="flex gap-2 text-sm leading-6 text-slate-700">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </article>
  );
}

function CommonUseCase({ section, index }) {
  const Icon = section.icon;
  return (
    <section id={section.id} className="scroll-mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-slate-100 p-6 md:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-4">
            <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${section.accent}`}>
              <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Use Case {index + 1}</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{section.subtitle}</p>
            </div>
          </div>

          <ol className="mt-6 space-y-3">
            {section.steps.map((step, stepIndex) => (
              <li key={step} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-sky-700 ring-1 ring-sky-100">
                  {stepIndex + 1}
                </span>
                <span className="text-sm font-medium leading-6 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={17} strokeWidth={2} aria-hidden="true" />
              Helpful notes
            </p>
            <ul className="mt-2 space-y-1.5">
              {section.tips.map((tip) => (
                <li key={tip} className="text-sm leading-6 text-emerald-900">{tip}</li>
              ))}
            </ul>
          </div>

          <Link to={section.to} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100">
            {section.action}
            <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
          </Link>
        </div>
        <div className="bg-slate-50 p-6 md:p-8">
          <ModuleVisual type={section.visual} title={section.title} />
        </div>
      </div>
    </section>
  );
}

function Guidelines() {
  return (
    <section id="guidelines" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm md:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 ring-1 ring-amber-100">
          <ShieldCheck size={23} strokeWidth={1.9} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Guidelines</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Safe Super Admin working rules</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">Use these rules before making changes that affect users, master data, equipment, or reports.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {advancedGuidelines.map((item) => (
          <div key={item} className="rounded-xl border border-amber-100 bg-white p-4 text-sm font-medium leading-6 text-slate-700 shadow-sm">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function CoreFeatures() {
  const features = [
    ['Role-wise clarity', 'Every role sees a focused set of modules, while SA gets full operational visibility.'],
    ['Search-first work', 'Global and local search make records easy to find without technical knowledge.'],
    ['Traceable decisions', 'Reports and audit logs help verify what happened and who performed the action.'],
    ['Workflow continuity', 'Job Requests, Conversion, Job Cards, Schedule, and Reports follow the real work journey.'],
    ['Readable UI', 'Cards, tables, filters, status pills, and actions use consistent visual language.'],
    ['Export-ready review', 'PDF, Excel, and print options support formal reporting and sharing.'],
  ];
  return (
    <section className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-[0_16px_42px_rgba(14,165,233,0.12)]">
      <div className="border-b border-sky-100/70 px-6 py-6 md:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
          <CheckCircle2 size={14} strokeWidth={2.2} />
          Main core features
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          What makes CMCMIS easy for Super Admin
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          The software is organized so SA can move from overview to action, from action to verification, and from verification to audit without losing context.
        </p>
      </div>
      <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3 md:px-8">
        {features.map(([title, text]) => (
          <div key={title} className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm ring-1 ring-sky-50">
            <h3 className="text-base font-semibold text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminConsoleVisual() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
      <TopBarMock />
      <div className="mt-4 grid gap-3 md:grid-cols-[130px_1fr]">
        <MiniSidebar active="Dashboard" />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {['Users', 'Jobs', 'Equipment', 'Audit'].map((item) => (
              <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-lg font-semibold text-slate-950">24</div>
                <div className="text-xs font-semibold text-slate-500">{item}</div>
              </div>
            ))}
          </div>
          <div className="h-24 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function ModuleVisual({ type, title }) {
  if (type === 'login') return <LoginVisual />;
  if (type === 'dashboard') return <DashboardVisual />;
  if (type === 'workflow') return <WorkflowVisual />;
  if (type === 'job-card') return <JobCardVisual />;
  if (type === 'equipment') return <EquipmentVisual />;
  if (type === 'schedule') return <ScheduleVisual />;
  if (type === 'search') return <SearchVisual />;
  if (type === 'analytics') return <AnalyticsVisual />;
  if (type === 'reports') return <ReportsVisual />;
  if (type === 'verify') return <VerifyVisual />;
  if (type === 'settings') return <SettingsVisual title={title} />;
  if (type === 'audit') return <AuditVisual />;
  if (type === 'checklists') return <ChecklistsVisual />;
  if (type === 'lab-capacity') return <LabCapacityVisual />;
  if (type === 'common-topbar') return <CommonTopBarVisual />;
  if (type === 'common-global-search') return <CommonGlobalSearchVisual />;
  if (type === 'common-module-search') return <CommonModuleSearchVisual />;
  if (type === 'common-notifications') return <CommonNotificationsVisual />;
  if (type === 'common-account-menu') return <CommonAccountMenuVisual />;
  if (type === 'common-profile') return <CommonProfileVisual />;
  if (type === 'common-about') return <CommonAboutVisual />;
  if (type === 'common-navigation') return <CommonNavigationVisual />;
  if (type === 'common-core') return <CommonCoreVisual />;
  return <TableVisual title={title} />;
}

function BrowserFrame({ title, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-2 truncate text-xs font-semibold text-slate-400">{title}</span>
      </div>
      <div className="min-h-[310px] bg-slate-50 p-4">{children}</div>
    </div>
  );
}

function LoginVisual() {
  return (
    <BrowserFrame title="/login">
      <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-left">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-605 mb-2">
            <KeyRound size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">CMCMIS Admin Portal</h3>
          <p className="text-[10px] text-slate-400">ISRO Space Applications Centre</p>
        </div>
        <div className="space-y-4">
          <InputPreview label="Employee ID" value="SA79900" />
          <InputPreview label="Password" value="••••••••" />
          <div className="mt-4 rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white shadow hover:bg-indigo-700 transition">Sign In</div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function DashboardVisual() {
  return (
    <BrowserFrame title="/dashboard">
      <TopBarMock />
      <div className="mt-4 grid grid-cols-2 gap-3 select-none">
        <div className="rounded-xl border border-slate-150 bg-white p-3 shadow-sm text-left">
          <div className="text-xl font-bold text-slate-850">148</div>
          <div className="text-[9px] font-bold text-slate-455 uppercase tracking-wide">Total Registered Assets</div>
        </div>
        <div className="rounded-xl border border-slate-150 bg-white p-3 shadow-sm text-left">
          <div className="text-xl font-bold text-indigo-600">32</div>
          <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide">Jobs In Calibration</div>
        </div>
        <div className="rounded-xl border border-slate-150 bg-white p-3 shadow-sm text-left">
          <div className="text-xl font-bold text-slate-850">1,248</div>
          <div className="text-[9px] font-bold text-slate-455 uppercase tracking-wide">Security Audits Logged</div>
        </div>
        <div className="rounded-xl border border-slate-150 bg-white p-3 shadow-sm text-left">
          <div className="text-xl font-bold text-emerald-600">96.8%</div>
          <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide">SLA Compliance Rate</div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function TableVisual({ title }) {
  if (title === 'Job Requests') {
    return (
      <BrowserFrame title="/job-requests">
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center">
            <SearchBar text="Filter requests..." />
            <span className="text-[10px] font-bold text-indigo-600 cursor-pointer">+ Create</span>
          </div>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-[10px] font-semibold text-slate-700">
              <thead className="bg-slate-50 border-b text-[8px] text-slate-450 uppercase">
                <tr>
                  <th className="p-2">Code</th>
                  <th className="p-2">Equipment</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2 text-indigo-650">JR-2026-0842</td>
                  <td className="p-2">Spectrum Analyzer</td>
                  <td className="p-2 text-center">
                    <span className="bg-emerald-50 border border-emerald-205 text-emerald-700 px-1 py-0.5 rounded text-[8px] font-bold">Approved</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-indigo-650">JR-2026-0841</td>
                  <td className="p-2">RF Generator</td>
                  <td className="p-2 text-center">
                    <span className="bg-amber-50 border border-amber-250/20 text-amber-700 px-1 py-0.5 rounded text-[8px] font-bold">Pending</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </BrowserFrame>
    );
  }

  if (title === 'Admin Users' || title === 'Users') {
    return (
      <BrowserFrame title="/admin/users">
        <div className="space-y-4 text-left">
          <SearchBar text="Search user directory..." />
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-[10px] font-semibold text-slate-700">
              <thead className="bg-slate-50 border-b text-[8px] text-slate-450 uppercase">
                <tr>
                  <th className="p-2">Name / ID</th>
                  <th className="p-2">Role</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2">
                    <p className="font-bold text-slate-805">Dr. K. Kumar</p>
                    <p className="text-[8px] text-slate-400">ID: SA79900</p>
                  </td>
                  <td className="p-2 text-indigo-650">LAB_IN_CHARGE</td>
                  <td className="p-2 text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-bold">Active</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2">
                    <p className="font-bold text-slate-805">S. Verma</p>
                    <p className="text-[8px] text-slate-400">ID: ENG9001</p>
                  </td>
                  <td className="p-2 text-indigo-650">LAB_ENGINEER</td>
                  <td className="p-2 text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-bold">Active</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </BrowserFrame>
    );
  }

  if (title === 'Admin Employees' || title === 'Employees') {
    return (
      <BrowserFrame title="/admin/employees">
        <div className="space-y-4 text-left">
          <SearchBar text="Filter employees roster..." />
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-[10px] font-semibold text-slate-700">
              <thead className="bg-slate-50 border-b text-[8px] text-slate-450 uppercase">
                <tr>
                  <th className="p-2">Emp ID</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Designation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2 text-indigo-650">SA79900</td>
                  <td className="p-2 font-bold text-slate-805">Dr. K. Kumar</td>
                  <td className="p-2">Senior Scientist (TME)</td>
                </tr>
                <tr>
                  <td className="p-2 text-indigo-650">ENG9001</td>
                  <td className="p-2 font-bold text-slate-805">S. Verma</td>
                  <td className="p-2">Technical Engineer (FPE)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </BrowserFrame>
    );
  }

  return (
    <BrowserFrame title={title}>
      <SearchBar text={`Search ${title}`} />
      <div className="mt-4 space-y-2 text-left">
        <RowPreview title={`${title} record`} subtitle="Status and owner details" tag="Open" />
        <RowPreview title="Recent item" subtitle="Linked workflow information" tag="View" />
      </div>
    </BrowserFrame>
  );
}

function WorkflowVisual() {
  return (
    <BrowserFrame title="/conversion">
      <div className="space-y-3.5 text-left">
        <SearchBar text="Review incoming conversion queue..." />
        <div className="p-3 border border-indigo-150 bg-indigo-50/5 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-850">JR-2026-0842 (Calibration)</span>
            <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">Unassigned</span>
          </div>
          <div className="flex gap-2 text-[10px] font-semibold border-t pt-2.5">
            <div className="flex-1 rounded-lg border px-2.5 py-1 text-slate-500 bg-white">Assign: S. Verma (FPE Cal)</div>
            <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer">Convert to Job Card</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function JobCardVisual() {
  return (
    <BrowserFrame title="/job-cards">
      <div className="space-y-4 text-left">
        <div className="flex border-b text-[10px] font-bold text-slate-400 gap-4 select-none pb-1.5">
          <span className="text-indigo-600 border-b-2 border-indigo-600 pb-1.5">All Cards</span>
          <span>Assigned</span>
          <span>In Progress</span>
        </div>
        <div className="p-3 border rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800">JC-2026-1004</span>
            <span className="bg-sky-50 text-sky-700 border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">In Progress</span>
          </div>
          <div className="text-[10px] text-slate-500 leading-tight space-y-0.5 font-semibold">
            <p>Instrument: Agilent Oscilloscope (EQ-10024)</p>
            <p>Engineer: S. Verma</p>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function EquipmentVisual() {
  return (
    <BrowserFrame title="/equipment">
      <div className="space-y-4 text-left">
        <SearchBar text="Search equipment catalog..." />
        <div className="p-3 border rounded-xl flex items-center justify-between">
          <div className="leading-tight">
            <h4 className="text-xs font-bold text-slate-800">Agilent Spectrum Analyzer</h4>
            <p className="text-[10px] text-slate-400">EQ-10024 | Serial: SN-10442 | Div: TME</p>
          </div>
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250/20 px-2 py-0.5 rounded uppercase">Active</span>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ScheduleVisual() {
  return (
    <BrowserFrame title="/schedule">
      <div className="space-y-3.5 text-left">
        <div className="flex items-center justify-between border-b pb-2 select-none">
          <h4 className="text-xs font-bold text-slate-800">Live Calibration Schedules</h4>
          <span className="text-[9px] text-indigo-650 font-bold cursor-pointer">Week View</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
          <div className="border border-indigo-150 p-2.5 bg-indigo-50/10 rounded-xl relative">
            <p className="text-[8px] font-bold text-indigo-500 uppercase">Mon - 04 Jun</p>
            <p className="text-slate-800 mt-1">JC-2026-1004</p>
            <p className="text-[9px] text-slate-450 mt-0.5">S. Verma (FPE Cal)</p>
          </div>
          <div className="border p-2.5 bg-slate-50/50 rounded-xl">
            <p className="text-[8px] font-bold text-slate-400 uppercase">Tue - 05 Jun</p>
            <p className="text-slate-550 mt-1">Free Slot</p>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function SearchVisual() {
  return (
    <BrowserFrame title="/inquiry">
      <div className="space-y-4 text-left">
        <div className="flex border-b text-xs font-semibold text-slate-400 gap-4 pb-2">
          <span className="text-indigo-600 border-b-2 border-indigo-600 pb-2">Equipment</span>
          <span>Vendors</span>
          <span>Job Requests</span>
        </div>
        <SearchBar text="Search serial or model..." />
        <div className="p-3 border rounded-xl hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs">
          <div>
            <h4 className="font-bold text-slate-800">Agilent Spectrum Analyzer</h4>
            <p className="text-[10px] text-slate-400">EQ-10024 | Serial: MY52102</p>
          </div>
          <span className="bg-indigo-50 text-indigo-600 border px-1.5 py-0.5 rounded font-bold text-[9px]">Open</span>
        </div>
      </div>
    </BrowserFrame>
  );
}

function AnalyticsVisual() {
  return (
    <BrowserFrame title="/analytics">
      <div className="space-y-4 text-left select-none">
        <h4 className="text-xs font-bold text-slate-700">Analytical Throughput KPI</h4>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 border rounded-xl bg-slate-50/30">
            <p className="text-[8px] font-bold text-slate-400 uppercase">Calibration Load</p>
            <div className="mt-2 text-md font-bold text-slate-850">28 Active</div>
            <div className="mt-1.5 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-3/4"></div>
            </div>
          </div>
          <div className="p-3 border rounded-xl bg-slate-50/30">
            <p className="text-[8px] font-bold text-slate-400 uppercase">Repair Load</p>
            <div className="mt-2 text-md font-bold text-slate-850">4 Active</div>
            <div className="mt-1.5 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-[15%]"></div>
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
      <div className="space-y-4 text-left">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/5 cursor-pointer">
            <h4 className="font-bold text-slate-850">NABL Audit Summary</h4>
            <p className="text-[9px] text-slate-400">All calibration checks this month</p>
          </div>
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
            <h4 className="font-bold text-slate-850">Technician Utilization</h4>
            <p className="text-[9px] text-slate-400">Technician load report</p>
          </div>
        </div>
        <div className="border-t pt-3 flex items-center justify-between text-xs font-semibold text-slate-655">
          <span>Format: Excel Spreadsheet</span>
          <span className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer">Export Report</span>
        </div>
      </div>
    </BrowserFrame>
  );
}

function VerifyVisual() {
  return (
    <BrowserFrame title="/admin/equipment-verification">
      <div className="space-y-3.5 text-left">
        <SearchBar text="Search pending verification..." />
        <div className="p-3 border border-indigo-150 bg-indigo-50/5 rounded-xl space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-850">Spectrum Analyzer (EQ-10024)</span>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-250/20 px-1.5 py-0.5 rounded font-bold uppercase">Pending SA Verify</span>
          </div>
          <div className="text-[10px] leading-tight space-y-1 text-slate-550 border-t pt-2 font-semibold">
            <p>Serial Number: SN-MY52102</p>
            <p>Ownership Division: TME Division</p>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <span className="bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded text-[9px] cursor-pointer">Return</span>
            <span className="bg-emerald-650 text-white font-bold px-3 py-1 rounded text-[9px] cursor-pointer">Approve Assets</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function SettingsVisual({ title }) {
  if (title === 'Terms and Conditions' || title === 'Terms') {
    return (
      <BrowserFrame title="/admin/terms">
        <div className="space-y-4 text-left">
          <SearchBar text="Search terms database..." />
          <div className="p-3 border rounded-xl bg-white space-y-2">
            <div className="flex justify-between items-center text-xs border-b pb-1.5">
              <span className="font-bold text-slate-800">SAC Standard Calibration Terms v1.2</span>
              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-bold border border-emerald-200">Active</span>
            </div>
            <textarea
              className="w-full text-[10px] border rounded bg-slate-50/50 p-2 font-mono h-16 text-slate-655"
              defaultValue="I hereby declare that this equipment is under ISRO SAC possession and requires standard NABL calibration."
              readOnly
            />
            <div className="flex justify-end text-[10px]">
              <span className="bg-indigo-650 text-white px-2.5 py-1 rounded font-bold cursor-pointer">Update Terms</span>
            </div>
          </div>
        </div>
      </BrowserFrame>
    );
  }

  if (title === 'Projects') {
    return (
      <BrowserFrame title="/admin/projects">
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center">
            <SearchBar text="Search project tags..." />
            <span className="text-[10px] font-bold text-indigo-600 cursor-pointer">+ Add Project</span>
          </div>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-[10px] font-semibold text-slate-700">
              <thead className="bg-slate-50 border-b text-[8px] text-slate-450 uppercase">
                <tr>
                  <th className="p-2">Project Code</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-center">Division</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2 text-indigo-650">SAC-TME-2026</td>
                  <td className="p-2">Telemetry Module Calibrations</td>
                  <td className="p-2 text-center">TME</td>
                </tr>
                <tr>
                  <td className="p-2 text-indigo-650">SAC-FPE-2026</td>
                  <td className="p-2">Frequency Payload Electronics</td>
                  <td className="p-2 text-center">FPE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </BrowserFrame>
    );
  }

  if (title === 'Tasks') {
    return (
      <BrowserFrame title="/admin/tasks">
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center">
            <SearchBar text="Search master task library..." />
            <span className="text-[10px] font-bold text-indigo-600 cursor-pointer">+ Add Task</span>
          </div>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-[10px] font-semibold text-slate-700">
              <thead className="bg-slate-50 border-b text-[8px] text-slate-455 uppercase">
                <tr>
                  <th className="p-2">Task Description</th>
                  <th className="p-2 text-center">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-2">Visual Inspection and power-up diagnostics</td>
                  <td className="p-2 text-center">
                    <span className="bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded text-[8px] font-bold border border-indigo-150">BOTH</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2">NABL compliant phase noise calibration</td>
                  <td className="p-2 text-center">
                    <span className="bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded text-[8px] font-bold border border-indigo-150">NABL</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </BrowserFrame>
    );
  }

  return (
    <BrowserFrame title={title}>
      <SearchBar text={`Search ${title}`} />
      <div className="mt-4 space-y-2 text-left">
        <RowPreview title={`${title} record`} subtitle="Status and owner details" tag="Open" />
        <RowPreview title="Recent item" subtitle="Linked workflow information" tag="View" />
      </div>
    </BrowserFrame>
  );
}

function AuditVisual() {
  return (
    <BrowserFrame title="/audit">
      <div className="space-y-4 text-left">
        <SearchBar text="Filter audit trails..." />
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-[9px] font-semibold text-slate-700">
            <thead className="bg-slate-50 border-b text-[8px] text-slate-455 uppercase">
              <tr>
                <th className="p-2">Timestamp</th>
                <th className="p-2">Actor ID</th>
                <th className="p-2">Action Event</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-2 text-slate-400">04-Jun 02:08:42</td>
                <td className="p-2 font-bold text-slate-805">SA79900</td>
                <td className="p-2 text-indigo-650">Convented JR to Job Card</td>
              </tr>
              <tr>
                <td className="p-2 text-slate-400">04-Jun 01:55:12</td>
                <td className="p-2 font-bold text-slate-805">SA79900</td>
                <td className="p-2 text-indigo-650">Updated Equipment Master EQ-10024</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ChecklistsVisual() {
  return (
    <BrowserFrame title="/admin/checklists">
      <div className="grid gap-4 md:grid-cols-[130px_1fr] text-left">
        <MiniSidebar active="Admin" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-xs font-bold text-slate-800">Checklists Directory</h4>
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer">+ New Checklist</span>
          </div>
          <div className="space-y-2 text-xs font-semibold">
            <div className="p-3 border rounded-xl bg-slate-50/30">
              <div className="flex items-center justify-between">
                <span className="text-slate-850">Spectrum Analyzer Checklist</span>
                <span className="bg-indigo-50 text-indigo-755 border border-indigo-200 px-2 py-0.5 rounded text-[8px] font-bold uppercase">6 Tasks</span>
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
      <div className="grid gap-4 md:grid-cols-[130px_1fr] text-left">
        <MiniSidebar active="Admin" />
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2.5 border rounded-xl bg-slate-50/50 shadow-inner">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Active Backlog</p>
              <p className="text-lg font-extrabold text-slate-850 mt-1">24 Jobs</p>
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

function CommonTopBarVisual() {
  return (
    <BrowserFrame title="Common top bar">
      <div className="space-y-4 text-left">
        <TopBarMock />
        <div className="grid gap-3 md:grid-cols-3">
          <MiniFeature icon={Search} label="Search records" />
          <MiniFeature icon={Bell} label="Read alerts" />
          <MiniFeature icon={UserCircle} label="Open account" />
        </div>
        <div className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-center text-xs font-bold text-white">Use this from any page</div>
      </div>
    </BrowserFrame>
  );
}

function CommonGlobalSearchVisual() {
  return (
    <BrowserFrame title="Global search">
      <TopBarMock />
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left">
        <SearchBar text="JR-2026" />
        <div className="mt-3 space-y-1 text-xs">
          <div className="px-2 pb-1 text-[9px] font-bold text-indigo-650 uppercase border-b select-none">Autocomplete matches</div>
          <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between">
            <div>
              <p className="font-bold text-slate-805">JR-2026-0842</p>
              <p className="text-[10px] text-slate-450">Spectrum Analyzer Calibration</p>
            </div>
            <span className="text-[9px] text-emerald-650 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 self-center">Approved</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function CommonModuleSearchVisual() {
  return (
    <BrowserFrame title="In-module search and filters">
      <div className="space-y-4 text-left">
        <SearchBar text="Search inside this module" />
        <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold select-none">
          <span className="rounded bg-indigo-50 text-indigo-600 border px-2 py-1">Category: TME</span>
          <span className="rounded bg-slate-50 text-slate-500 border px-2 py-1">Status: Active</span>
          <span className="rounded bg-slate-50 text-slate-550 border px-2 py-1">Date: 30 Days</span>
        </div>
      </div>
    </BrowserFrame>
  );
}

function CommonNotificationsVisual() {
  return (
    <BrowserFrame title="/notifications">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Bell size={18} className="text-amber-600" />
          Notifications
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
    </BrowserFrame>
  );
}

function CommonAccountMenuVisual() {
  return (
    <BrowserFrame title="Profile dropdown">
      <TopBarMock />
      <div className="ml-auto mt-4 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl text-left">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-md">SA</span>
          <div className="leading-tight">
            <p className="text-xs font-bold text-slate-808">System Super Admin</p>
            <p className="text-[9px] text-slate-455 mt-0.5 uppercase tracking-wider font-semibold">Super Admin</p>
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
    </BrowserFrame>
  );
}

function CommonProfileVisual() {
  return (
    <BrowserFrame title="/profile">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-left">
        <div className="flex items-center gap-4 border-b pb-3.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-base font-bold text-white shadow-md">SA</span>
          <div className="leading-tight">
            <p className="text-base font-bold text-slate-808">System Super Admin</p>
            <p className="text-xs text-slate-550">Employee ID: SA79900</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Division</p>
            <p className="mt-1 font-bold text-slate-750">Super Admin Office</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase">System Role</p>
            <p className="mt-1 font-bold text-slate-750">Super Admin</p>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function CommonAboutVisual() {
  return (
    <BrowserFrame title="/about">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-left space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-sm">
            <Info size={22} />
          </span>
          <div className="leading-tight">
            <p className="text-md font-bold text-slate-808">CMCMIS SAC</p>
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

function CommonNavigationVisual() {
  return (
    <BrowserFrame title="Common navigation">
      <div className="grid gap-4 md:grid-cols-[130px_1fr] text-left">
        <MiniSidebar active="Dashboard" />
        <div className="space-y-3">
          <RowPreview title="ISRO logo" subtitle="Opens CMCMIS home" tag="Home" />
          <RowPreview title="Guide badge" subtitle="Opens role-specific guide" tag="Guide" />
          <RowPreview title="Account menu" subtitle="Profile and logout controls" tag="Menu" />
        </div>
      </div>
    </BrowserFrame>
  );
}

function CommonCoreVisual() {
  return (
    <BrowserFrame title="Main core features">
      <div className="grid gap-3 md:grid-cols-2 text-left">
        {['Role-wise access', 'Fast search', 'Status tracking', 'Reports export', 'Audit review', 'Readable UI'].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <p className="mt-3 text-sm font-semibold text-slate-900">{item}</p>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

function TopBarMock() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm text-left">
      <div className="h-9 w-9 rounded-xl bg-slate-100" />
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <Search size={16} className="text-slate-400" />
        <span className="truncate text-xs font-semibold text-slate-400">Search equipment, job requests, vendors...</span>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Bell size={17} /></span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">SA</span>
    </div>
  );
}

function MiniSidebar({ active }) {
  const items = ['Dashboard', 'Job Requests', 'Equipment', 'Reports', 'Admin'];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm select-none">
      <div className="mb-3 h-8 rounded-xl bg-slate-100" />
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className={`rounded-xl px-3 py-2 text-xs font-semibold ${item === active ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100' : 'text-slate-400'}`}>
            {item}
          </div>
        ))}
      </div>
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
    <div className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}>
      <Icon size={16} />
      {label}
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

function KpiPreview({ label }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-9 w-9 rounded-xl bg-sky-50" />
      <div className="mt-4 text-lg font-semibold text-slate-900">24</div>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
}

function RowPreview({ title, subtitle, tag }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
      </div>
      <div className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{tag}</div>
    </div>
  );
}

function InputPreview({ label, value }) {
  return (
    <div className="mt-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">{value}</div>
    </div>
  );
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
