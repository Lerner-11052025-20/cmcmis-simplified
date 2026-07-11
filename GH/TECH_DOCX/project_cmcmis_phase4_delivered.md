---
name: project-cmcmis-phase4-delivered
description: "Phase 4 (Auth + RBAC HTTP layer) SHIPPED 2026-05-17. 21 BE files + 19 FE files, pure JavaScript, end-to-end verified. Locks the module-template pattern Phase 5+ will clone."
metadata: 
  node_type: memory
  type: project
  originSessionId: 4182e51b-f99c-4287-b57a-d5d3702746a6
---

**Phase 4 — Auth Module — DELIVERED · 2026-05-17 · verified end-to-end in browser.**

Backend lives in `SOFTWARE CODE/BE/` (21 `.js` files, CommonJS). Frontend lives in `SOFTWARE CODE/FE/` (19 `.jsx` / `.js` / `.css` / `.html` / configs). **Zero TypeScript anywhere** — JS+JSDoc+Zod stack per [[feedback-javascript-only]] and locked decision D1.

**Why:** Phase 4's job per the 88-page TECHNICALbaseORDERSphase.pdf was to put the Phase-3 sealed RBAC matrix behind HTTP and a browser-visible login flow. Delivered the 8-step build order (skeleton → middleware → auth module → JWT middleware → /me → FE scaffold → FE auth plumbing → Login/Sidebar/Dashboard) plus a Forbidden page and a Layout shell ([[project-cmcmis-next-phase-code]]).

**How to apply (Phase 5+ scaffold pattern — already proven):**

- **BE module template:** `modules/<name>/{validators, repo, service, controller, routes}.js`. SQL ONLY in repo files; `multipleStatements:false` runtime. Routes use the locked middleware chain `authenticate → authorize('x:y') → validate(zodSchema) → ctrl`. Errors thrown via `errors.foo(...)` factory render the standard envelope.
- **FE module template:** `pages/<Name>{List,Detail,Form}.jsx` + a router entry in `App.jsx` wrapped in `<ProtectedRoute requiredPermission="x:y"><Layout>…</Layout></ProtectedRoute>`. Sidebar auto-includes the route once a `requires` entry is added to `lib/permissions.js#ALL_NAV_ITEMS`.
- **Endpoints live:** `POST /api/v1/auth/{login,refresh,logout}` · `GET /api/v1/me` · `GET /healthz`. Standard envelope: `{ data: ... }` on success, `{ error: { code, message, details } }` on failure.
- **Token model:** access JWT in JS memory only (15-min TTL), refresh JWT in httpOnly `cmcmis_rt` cookie scoped to `/api/v1/auth` (7-day TTL, stored as sha256 hex in `refresh_tokens.token_hash`, rotated on every use with theft-detection sweep). CSRF via double-submit token in JS-readable `cmcmis_csrf` cookie + `X-CSRF-Token` header.
- **Security layers:** helmet CSP · CORS allow-list · express-rate-limit (10/15min on /login, 30/min on /refresh) · zod regex pre-check · bcrypt cost 10 (12 in prod) · `failed_login_count` + `is_locked` columns · every attempt audited to `login_audit` with one of 8 ENUM outcomes.
- **FE design tokens (locked):** 11 colors in `tailwind.config.js` — `base/elev`, `ink/soft`, `border`, `accent/hover`, `success`, `warning`, `danger`, `badge`. Inter font from Google Fonts with OS-stack fallback. No raw hex literals outside the config.
- **The auth-context contract:** `useAuth()` returns `{ user, loading, login, logout, hasPermission, hasAny }`. `hasPermission(code)` is the ONLY gate components should consult — never role names (BR-RBAC-03).
- **Verification command for any future Phase-N work that touches auth:** restart BE+FE, login as SA79900/SA79900 → dashboard shows 7 sidebar items; login as DS00001/DS00001 → sidebar narrower, manual `/admin/users` URL renders Forbidden page without redirect loop.

**Caveat for future me:** when extending the auth surface (password change, session list, etc.), the BE controller pattern is non-negotiable: cookies set/cleared via `utils/cookies.js` helpers, never inline; refresh rotation MUST persist new hash BEFORE issuing it to the wire.
