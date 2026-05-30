import {
  BadgeCheck,
  Brush,
  Code2,
  Database,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import deepPhoto from '../../assets/about/deep-sorathiya.png';
import mokshPhoto from '../../assets/about/moksh-gandhi.png';

const buildSteps = [
  {
    title: 'System Study',
    text: 'The software was shaped around real CMC, calibration, repair, equipment, job-card, reporting, audit, and role-based workflow requirements.',
    icon: Database,
  },
  {
    title: 'Secure Development',
    text: 'Each module was developed with permission gates, protected routes, audit visibility, and backend validation so users only access what their role allows.',
    icon: ShieldCheck,
  },
  {
    title: 'Operational UI',
    text: 'The interface was designed for daily engineering work: fast scanning, clear actions, organized forms, status visibility, and report-ready data.',
    icon: BadgeCheck,
  },
];

const team = [
  {
    name: 'Deep Sorathiya',
    role: 'Core Developer',
    icon: Code2,
    image: deepPhoto,
    imagePosition: 'object-[center_18%]',
    accent: 'from-sky-500 to-blue-700',
    education: 'Nirma University - B.Tech CSE Student',
    text: [
      'Deep Sorathiya is a Nirma University student pursuing B.Tech in Computer Science and Engineering. As the Core Developer of CMCMIS, he worked on converting the project idea into a functional, secure, and module-based software system.',
      'His contribution includes the application structure, frontend modules, backend integration flow, authentication handling, protected routing, role-based access control, database-connected workflows, job request and job card features, reporting surfaces, notifications, and audit-aware screens.',
      'Deep focused on making the software practical for real maintenance operations: reliable navigation, permission-safe actions, clear data flow, and pages that support day-to-day engineering work without unnecessary complexity.',
    ],
  },
  {
    name: 'Moksh Gandhi',
    role: 'Designer',
    icon: Brush,
    image: mokshPhoto,
    imagePosition: 'object-[center_28%]',
    accent: 'from-orange-500 to-amber-500',
    education: 'Nirma University - Bachelor Student, Computer Science and Engineering',
    text: [
      'Moksh Gandhi is a Nirma University bachelor student with a focus on Computer Science and Engineering. As the Designer of CMCMIS, he shaped how the software feels, reads, and guides users through important maintenance workflows.',
      'His work focused on visual clarity, page structure, spacing, typography, readable data cards, navigation behavior, module presentation, and a clean interface style that fits an operational system rather than a decorative website.',
      'Moksh helped keep the experience user-friendly for repeated daily usage, making sure pages feel organized, professional, and easy to understand for users working with equipment, requests, job cards, reports, and system records.',
    ],
  },
];

export function AboutUs() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 font-sans antialiased">
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <div className="relative px-6 py-8 md:px-10 md:py-10">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-500 via-orange-400 to-blue-700" />

          <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-sky-600">
                <Rocket size={14} strokeWidth={2.4} />
                CMCMIS Development Story
              </span>
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl">
                About Us
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-slate-600 md:text-[15px]">
                CMCMIS was developed as a focused, role-aware maintenance information system for managing equipment, job requests, job cards, calibration, repair workflows, schedules, analytics, reports, notifications, and audit records in one connected platform.
              </p>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600 md:text-[15px]">
                The software was built module by module with attention to security, traceability, usability, and clean operational flow. Every major area of the application is connected through protected routes, permission-based visibility, structured data handling, and screens designed for real users who need quick, reliable access to maintenance information.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <Sparkles size={22} strokeWidth={2.3} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Project Suite</p>
                  <p className="text-lg font-bold tracking-tight text-slate-800">CMCMIS Simplified</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold text-sky-600">15+</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Modules</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold text-orange-500">RBAC</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Secured</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-orange-500">
            <Users size={14} strokeWidth={2.4} />
            Developer Team
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">People Behind This Software</h2>
        </div>

        <div className="space-y-6">
          {team.map((member) => {
            const Icon = member.icon;
            return (
              <article key={member.name} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">
                <div className={`h-2 bg-gradient-to-r ${member.accent}`} />
                <div className="grid gap-0 lg:grid-cols-[310px_1fr]">
                  <div className="relative h-[430px] overflow-hidden bg-slate-100 lg:h-full">
                    <img
                      src={member.image}
                      alt={`${member.name} - ${member.role}`}
                      className={`h-full w-full object-cover ${member.imagePosition}`}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/45 to-transparent" />
                    <div className={`absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${member.accent} text-white shadow-lg ring-2 ring-white/70`}>
                      <Icon size={21} strokeWidth={2.3} />
                    </div>
                  </div>

                  <div className="p-6 md:p-8 lg:p-10">
                    <div>
                      <h3 className="text-3xl font-bold tracking-tight text-slate-900">{member.name}</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <p className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                          {member.role}
                        </p>
                        <p className="inline-flex rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                          {member.education}
                        </p>
                      </div>
                    </div>
                    <div className="mt-7 space-y-4">
                      {member.text.map((paragraph) => (
                        <p key={paragraph} className="text-[15px] font-medium leading-7 text-slate-600">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {buildSteps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Icon size={21} strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 text-base font-bold tracking-tight text-slate-800">{step.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{step.text}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
