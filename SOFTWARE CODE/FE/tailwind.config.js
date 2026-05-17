// ============================================================================
// tailwind.config.js  —  Design tokens (60-30-10 enterprise palette)
// ----------------------------------------------------------------------------
// PURPOSE
//   The single source of truth for every color in the UI. Components
//   reference these by name (`bg-base`, `text-ink`, `border-border`,
//   `bg-accent hover:bg-accent-hover`) and NEVER hard-code hex values.
//   Grep the codebase for raw `#` hex literals — anything outside this
//   file or globals.css is a design-system violation.
//
// 60-30-10 RATIO (enterprise dashboard convention)
//   60% — base + base-elev (neutral page surfaces)
//   30% — ink, ink-soft, border (text & hairlines)
//   10% — accent (CTAs, active nav, focus rings)
//   Status colors (success / warning / danger / badge) appear sparsely
//   in pills, banners, and the role tag.
// ============================================================================

import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind scans these files for class names; anything not referenced
  // is tree-shaken from the production CSS bundle.
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      // ── Color tokens (11 total, locked by spec) ───────────────────────
      colors: {
        // 60% — Neutral surfaces
        base: {
          DEFAULT: '#F5F6FA', // page background, sidebar fill
          elev: '#EEF1F7',    // cards, form fields, hover surfaces
        },

        // 30% — Text & hairlines
        ink: {
          DEFAULT: '#2F3545', // primary body text, headings, icons
          soft: '#4B5563',    // secondary text, captions, table headers
        },
        border: '#E5E7EB',    // 1px hairlines, input borders

        // 10% — Accent
        accent: {
          DEFAULT: '#4F5DFF', // CTA buttons, active nav, links, focus rings
          hover: '#5B6CFF',   // hover state for accent
        },

        // Status
        success: '#4CAF50',   // OK / active dots
        warning: '#F59E0B',   // soft alerts
        danger: '#EF4444',    // errors, 403 banner
        badge: '#8B5CF6',     // role pills (e.g. SUPER_ADMIN)
      },

      // Inter loads via Google Fonts <link> in index.html; falls back
      // to the OS font stack if Fonts is blocked.
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },

      // Soft shadows only — this is an enterprise dashboard, not a
      // Material demo. Heavy drop shadows look toy-like at scale.
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 1px 0 rgb(15 23 42 / 0.03)',
      },
    },
  },

  plugins: [
    // @tailwindcss/forms normalises browser-default form styling so our
    // utility classes actually take effect across Firefox / Safari /
    // Chrome.
    forms,
  ],
};
