import {
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  Brush,
  Code2,
  Database,
  GraduationCap,
  Handshake,
  Layers3,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import deepPhoto from '../../assets/about/deep-sorathiya.webp';
import mokshPhoto from '../../assets/about/moksh-gandhi.webp';

const platformHighlights = [
  {
    title: 'Operational Workflow',
    text: 'Equipment registration, verification, job requests, job cards, calibration, repair, scheduling, reports, and audit records are connected into one practical system.',
    icon: Layers3,
  },
  {
    title: 'Secure Access',
    text: 'Role-based access, protected routes, backend validation, and permission-gated actions keep the system aligned with real responsibility levels.',
    icon: ShieldCheck,
  },
  {
    title: 'Reliable Data Flow',
    text: 'The application focuses on structured database-backed forms, traceable status movement, searchable records, and report-ready information.',
    icon: Database,
  },
];

const team = [
  {
    name: 'Deep Sorathiya',
    role: 'Core Developer',
    icon: Code2,
    image: deepPhoto,
    imagePosition: 'object-[center_18%]',
    education: 'Nirma University - B.Tech CSE Student',
    bullets: [
      'Developed the core CMCMIS application structure across frontend and backend modules.',
      'Implemented secure authentication flows, protected routes, permission-aware screens, and role-based access behavior.',
      'Built database-connected workflows for equipment registration, verification, job requests, job cards, reports, dashboards, notifications, and audit-aware operations.',
      'Focused on practical engineering usability so daily users can search, review, update, verify, and track maintenance information quickly.',
      'Worked on API integration, form validation, status handling, table views, admin workflows, and deployment-focused fixes throughout the project.',
    ],
  },
  {
    name: 'Moksh Gandhi',
    role: 'Designer',
    icon: Brush,
    image: mokshPhoto,
    imagePosition: 'object-[center_28%]',
    education: 'Nirma University - Bachelor Student, Computer Science and Engineering',
    bullets: [
      'Designed the visual direction and user experience for a professional maintenance management application.',
      'Worked on page structure, spacing, visual hierarchy, typography, cards, tables, badges, and clear module presentation.',
      'Helped shape screens that are readable, organized, and suitable for repeated daily use by technical and non-technical users.',
      'Focused on keeping the interface clean, modern, and operational instead of decorative, so users can complete tasks with clarity.',
      'Contributed to the consistency of the application experience across dashboard, forms, detail pages, lists, and admin sections.',
    ],
  },
];

const requirementGuides = [
  'RAVI SIR',
  'BRIJESH SIR',
  "HETVI MA'AM",
  'RAHUL SIR',
  'VIJAY SIR',
  'Entire T&ME Department Employees',
  'Entire F&PE Department Employees',
];

export function AboutUs() {
  return (
    <div className="mx-auto max-w-7xl space-y-7 font-sans antialiased">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
          <div className="p-6 md:p-8 lg:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-700">
              <Rocket size={14} strokeWidth={2.3} />
              CMCMIS Simplified
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-950 md:text-4xl">
              A modern maintenance information system built for real engineering workflows.
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-slate-600 md:text-[15px]">
              CMCMIS brings equipment, job requests, job cards, calibration, repair, verification, schedules, analytics, reports, notifications, and audit records into a single role-aware application for daily operational use.
            </p>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600 md:text-[15px]">
              The project was developed during the internship with continuous attention to usability, security, traceability, and the practical needs of T&ME and F&PE workflows at Space Applications Centre.
            </p>
          </div>

          <div className="border-t border-slate-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0 md:p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-200 ring-1 ring-white/15">
                <Sparkles size={22} strokeWidth={2.3} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Project Focus</p>
                <p className="mt-1 text-xl font-bold tracking-tight">Secure, usable, and deployment-ready</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold text-sky-200">RBAC</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Role-aware access</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold text-emerald-200">Audit</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Traceable actions</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold text-amber-200">Forms</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Database backed</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-bold text-rose-200">Live</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Operational UI</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {platformHighlights.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 text-base font-bold tracking-tight text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-sky-700">
              <Users size={14} strokeWidth={2.4} />
              Developer Team
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">People Behind This Software</h2>
          </div>
          <p className="max-w-xl text-sm font-medium leading-6 text-slate-500">
            A compact team effort shaped around engineering needs, clean execution, and respectful collaboration during the internship.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {team.map((member) => {
            const Icon = member.icon;
            return (
              <article key={member.name} className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white bg-slate-200 shadow-sm">
                    <img
                      src={member.image}
                      alt={`${member.name} - ${member.role}`}
                      className={`h-full w-full object-cover ${member.imagePosition}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
                        <Icon size={18} strokeWidth={2.2} />
                      </div>
                      <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {member.role}
                      </p>
                    </div>
                    <h3 className="mt-3 truncate text-xl font-bold tracking-tight text-slate-950">{member.name}</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{member.education}</p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3 text-sm font-medium leading-6 text-slate-600">
                  {member.bullets.map((point) => (
                    <li key={point} className="flex gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.2} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <GraduationCap size={24} strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Main Guide & Mentor
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                श्रीयांश कुमार गोल्हनी / Shreeyansh Kumar Golhani
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-5 text-sm font-semibold leading-6 text-slate-700">
            <p>वैज्ञानिक अभियंता-एसएफ / SCI/ENGR-SF</p>
            <p>टीआईएमसीडी / ईएफएमजी / TIMCD/EFMG</p>
            <p>अंतरिक्ष उपयोग केन्द्र (इसरो) / Space Applications Centre (ISRO)</p>
          </div>

          <p className="mt-5 text-sm font-medium leading-7 text-slate-600">
            We respectfully acknowledge Shreeyansh Kumar Golhani Sir as the main mentor throughout the internship project. His guidance helped the team understand the department environment, stay aligned with real operational expectations, and approach the work with discipline, clarity, and responsibility.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <BookOpenCheck size={24} strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                Project Requirement Guidance
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                With sincere respect and gratitude
              </h2>
            </div>
          </div>

          <p className="mt-5 text-sm font-medium leading-7 text-slate-600">
            The project requirements were shaped through valuable inputs, reviews, and practical guidance from the respected officers and department members who helped connect the software with real working needs.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {requirementGuides.map((name) => (
              <span
                key={name}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-600"
              >
                {name}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex gap-3">
              <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" strokeWidth={2.2} />
              <p className="text-sm font-medium leading-7 text-slate-600">
                Their support helped us understand expected workflows, user responsibilities, equipment handling needs, verification practices, and the practical improvements required for a useful CMCMIS platform.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
              <BrainCircuit size={23} strokeWidth={2.3} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Project Note</p>
              <p className="text-lg font-bold text-slate-900">Built with purpose</p>
            </div>
          </div>
          <p className="text-sm font-medium leading-7 text-slate-600">
            CMCMIS is the result of technical learning, department guidance, mentor support, and continuous improvement. The goal was to create a respectful, dependable, and modern software experience that supports maintenance teams in their daily work.
          </p>
        </div>
      </section>
    </div>
  );
}
