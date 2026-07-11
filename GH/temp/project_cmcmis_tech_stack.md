---
name: project-cmcmis-tech-stack
description: CMCMIS tech stack — LOCKED v3 with full lib list (Express+mysql2+zod+pdfkit BE; React18+Vite+TW+TanStack Query+Zustand FE; dayjs+zod symmetric across stack)
metadata: 
  node_type: memory
  type: project
  originSessionId: b9863bb4-3873-480d-9bae-b15d6a527c82
---

## Frontend (React 18 + Vite + Tailwind v3)

| Concern | Library | Why |
|---|---|---|
| Build | `vite` | Fast HMR, modern, 2026 default |
| Framework | `react@18` | User-locked |
| Routing | `react-router-dom@v6` | Standard SPA routing |
| State (local) | React `useState` / `useReducer` | Built-in |
| State (global) | `zustand` | ~1KB, no boilerplate, scales |
| Server state | `@tanstack/react-query` | Caching, refetch, mutations — saves ~30% FE code |
| HTTP | `axios` | Interceptors for auth + error handling |
| Forms | `react-hook-form` + `zod` | Performant, schema-shared with backend |
| UI primitives | Custom on top of Tailwind | Avoid design lock-in of shadcn/MUI |
| Icons | `lucide-react` | Clean, tree-shakable |
| Charts | `recharts` | Dashboard widgets |
| Date | `dayjs` | Same as backend → code symmetry |
| Toasts | `sonner` | Lightweight, beautiful defaults |
| Styling | `tailwindcss@v3` | Locked |
| Lint/Format | `eslint` + `prettier` + `husky` + `lint-staged` | Pre-commit enforced |

## Backend (Node + Express 4)

| Concern | Library | Version | Why |
|---|---|---|---|
| Web framework | `express` | ^4.x | Stable, ubiquitous, simple |
| DB driver | `mysql2/promise` | ^3.x | Fastest MySQL driver, native promises |
| Validation | `zod` | ^3.x | Single source of truth for schemas (shared with FE) |
| Auth tokens | `jsonwebtoken` | ^9.x | Industry standard |
| Password hash | `bcryptjs` | ^2.x | Pure-JS bcrypt — no native build pain (Windows-friendly) |
| Logger | `pino` + `pino-pretty` (dev) | ^8.x | Faster than Winston, structured JSON |
| Env loader | `dotenv` | ^16.x | Standard |
| Env validation | `envalid` | ^8.x | Fail at boot if env missing |
| Date | `dayjs` | ^1.x | Same as FE → code symmetry, 2KB |
| PDF | `pdfkit` | ^0.14.x | Programmatic, lightweight, server-friendly (no Chromium) |
| Rate limit | `express-rate-limit` | ^7.x | In-memory, sufficient for v1 |
| Security headers | `helmet` | ^7.x | OWASP-friendly defaults |
| CORS | `cors` | ^2.x | Standard |
| Process mgr | `pm2` | latest | Cluster mode, restarts, logs (on-prem fit) |
| Lint/Format | `eslint` + `prettier` + `husky` + `lint-staged` | latest | Pre-commit enforced |

## Architectural decisions implicit in this stack

- **Symmetric validation:** `zod` on both FE + BE → one schema, two consumers. FE form validation + BE input validation share definitions (copy-paste or shared package).
- **Symmetric date math:** `dayjs` on both sides → calibration date computations behave identically.
- **No cloud lock-in:** `pdfkit` (not Puppeteer) → no Chromium dependency → fits ISRO-SAC on-prem reality.
- **No cookies-on-frontend tradeoff:** axios interceptors handle JWT injection; refresh cookie is httpOnly.
- **Process resilience:** PM2 cluster mode + auto-restart → matches NFR "99% uptime in business hours".
- **Boot-time safety:** `envalid` rejects missing env at startup → no half-broken deploys.
- **Modern, lean state:** zustand + react-query → no Redux/RTK bloat for this size of app.

## Gaps / additions to confirm with user before locking 100%

1. `cookie-parser` middleware — needed because httpOnly refresh cookie must be parsed by Express. Add.
2. `compression` middleware — gzip/brotli for API responses → helps NFR p95 < 500ms target.
3. CSRF approach — `csurf` is deprecated. Recommend custom double-submit token pattern, applied only on `/api/v1/auth/refresh` (other endpoints use Authorization header → CSRF-safe).
4. Frontend table lib — heavy lists (equipment, jobs) need sort/filter/paginate. Recommend `@tanstack/react-table` (headless, pairs perfectly with Tailwind).
5. Tailwind plugin: `@tailwindcss/forms` — sane form defaults.
6. Testing: not specified. Recommend `vitest` (FE) + `vitest`/`supertest` (BE) — same runner, fast.
7. API docs: not specified. Could add `swagger-ui-express` + zod-to-openapi (Phase 2-friendly).

**Why:** User shared this stack via the §6.1 + §6.2 images. The 7 gaps above are practical needs implied by NFR/BR but not in the table. I'll confirm before adding any of them.

**How to apply:**
- Treat the listed libs as LOCKED — no swaps without explicit user OK.
- For each MVP feature, trace the relevant libraries used (e.g., "login screen → react-hook-form + zod + axios → bcryptjs verify → jsonwebtoken sign → response with httpOnly refresh").
- Pre-commit hooks (husky + lint-staged) are mandatory on day 1 of repo scaffold.
- Folder structure: separate `routes / controllers / services / models / utils` per NFR maintainability requirement.

See [[project-cmcmis-overview]], [[project-cmcmis-modules-roles]], [[project-cmcmis-business-rules]], [[project-cmcmis-constraints]].
