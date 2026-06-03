import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  FilePlus2,
  KeyRound,
  Monitor,
  MousePointerClick,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

const guideFlows = [
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
];

const quickNav = [
  { label: 'Login', id: 'login' },
  { label: 'Create JR', id: 'job-request-create' },
  { label: 'JR Details', id: 'job-request-detail' },
  { label: 'Equipment', id: 'equipment' },
];

export function UserGuide() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 font-sans">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
                <ShieldCheck size={14} strokeWidth={2.2} aria-hidden="true" />
                Normal User Guide
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                How to use CMCMIS
              </h1>
              <p className="mt-4 max-w-3xl text-base font-normal leading-7 text-black">
                A simple guide for non-technical users. It explains only the main daily actions:
                login, creating a job request, viewing request details, and using the equipment page.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Monitor size={23} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Designed For</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">NORMAL USER role</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {quickNav.map((item) => (
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

        <div className="grid gap-4 px-6 py-5 md:grid-cols-4 md:px-8">
          {guideFlows.map((flow, index) => {
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
        {guideFlows.map((flow, index) => (
          <GuideSection key={flow.id} flow={flow} index={index} />
        ))}
      </div>
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
  return <EquipmentVisual />;
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
      <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <KeyRound size={24} strokeWidth={1.9} />
        </div>
        <div className="mt-5 space-y-3">
          <VisualInput label="Employee ID" value="SA79900" />
          <VisualInput label="Password" value="********" />
          <div className="rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-semibold text-white">
            Sign In
          </div>
        </div>
        <Callout top="top-[154px]" left="left-[245px]" text="Click Sign In" />
      </div>
    </BrowserFrame>
  );
}

function JobRequestCreateVisual() {
  return (
    <BrowserFrame title="/job-requests/new">
      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
        <MiniNav active="Job Requests" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="mt-2 h-2 w-44 rounded bg-slate-100" />
            </div>
            <div className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white">Submit</div>
          </div>
          <div className="mt-5 grid gap-3">
            {['Job Type', 'Equipment', 'Complaint', 'Submitter', 'Terms'].map((item, idx) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">{idx + 1}</span>
                <span className="text-sm font-semibold text-slate-700">{item}</span>
                <span className="ml-auto h-2 w-20 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <Callout top="top-[80px]" left="left-[250px]" text="Fill sections in order" />
        </div>
      </div>
    </BrowserFrame>
  );
}

function JobRequestDetailVisual() {
  return (
    <BrowserFrame title="/job-requests/:id">
      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
        <MiniNav active="Job Requests" />
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-indigo-600" size={24} />
              <div>
                <div className="text-xl font-semibold text-slate-950">JR-2026-2430</div>
                <div className="mt-1 text-xs font-semibold text-emerald-700">Current Status: Approved</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 text-sm font-semibold text-slate-900">Status Timeline</div>
            <div className="flex items-center gap-2">
              {['Draft', 'Pending', 'Approved'].map((item, idx) => (
                <div key={item} className="flex flex-1 items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">{idx + 1}</span>
                  <span className="text-xs font-semibold text-slate-600">{item}</span>
                  {idx < 2 ? <span className="h-0.5 flex-1 bg-slate-200" /> : null}
                </div>
              ))}
            </div>
          </div>
          <Callout top="top-[104px]" left="left-[250px]" text="Check status here" />
        </div>
      </div>
    </BrowserFrame>
  );
}

function EquipmentVisual() {
  return (
    <BrowserFrame title="/equipment">
      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
        <MiniNav active="Equipment" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-400">Search equipment, serial number, or ID</span>
          </div>
          <div className="mt-4 space-y-2">
            {['Equipment-1', 'Signal Analyzer', 'Calibration Unit'].map((item, idx) => (
              <div key={item} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item}</div>
                  <div className="mt-1 text-xs text-slate-500">Status: Active</div>
                </div>
                <div className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">View</div>
                {idx === 0 ? <Callout top="top-[120px]" left="left-[235px]" text="Open details" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function MiniNav({ active }) {
  const items = ['Dashboard', 'Job Requests', 'Equipment'];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 h-8 rounded-xl bg-slate-100" />
      <div className="space-y-2">
        {items.map((item) => (
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

function Callout({ top, left, text }) {
  return (
    <div className={`pointer-events-none absolute ${top} ${left} hidden items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-xl lg:flex`}>
      <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      {text}
    </div>
  );
}
