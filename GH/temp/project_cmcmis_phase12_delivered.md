---
name: project-cmcmis-phase12-delivered
description: "Phase 12 Notifications + Token capsules shipped 2026-05-20, 14/14 smoke green, atomic emit inside JR/JC transactions"
metadata: 
  node_type: memory
  type: project
  originSessionId: 068c4547-4284-45e7-a76b-c45fb8354d63
---

# Phase 12 — Notifications + Token Capsules DELIVERED (2026-05-20)

Two systems shipped together:

1. **Persistent in-app notifications** — recipient-scoped, emitted atomically with every JR/JC workflow event, surfaced via the existing TopBar bell + dropdown + dedicated /notifications page.
2. **Transient token capsules** — client-only pill-shaped pop-ups in the strip below the navbar, 2 s auto-dismiss, × close, timestamped, fire on every successful mutation via a universal axios interceptor.

**Smoke matrix: 14/14 green** · Phase 10 (49/49) + Phase 11 (23/23) no regression.

## Decisions register (P12-D1..P12-D8 LOCKED)

| ID | Topic | Decision |
|----|-------|----------|
| P12-D1 | Atomicity model | `emit()` is called INSIDE the JR/JC service's existing transaction (alongside audit + status-history). If insert throws, the whole txn rolls back → no orphan rows |
| P12-D2 | Actor stripping | The acting user is ALWAYS removed from the recipient list by `emitter.cleanRecipients`. You never notify yourself, including self-submits |
| P12-D3 | Recipient resolution | By PERMISSION, not role-name. `getManagerialRecipients()` resolves all active users holding `job_request:approve` (i.e. SA + LIC) with a 60-s in-process cache |
| P12-D4 | SQL-layer scope | Every read + write query in `notifications.repo.js` filters by `recipient_employee_id = ?`. A user cannot read/mark another user's row even with a guessed id. Cross-user PATCH returns 404 (not 403) so existence never leaks |
| P12-D5 | View-Only exclusion | Encoded as PERMISSION ABSENCE: `notifications:read-own` is not granted to View-Only (mig 431). FE bell, /notifications page, and pushToken gate all read this permission. No role-name check anywhere |
| P12-D6 | Token persistence | NONE. Tokens are pure Zustand client state. No DB row, no audit, no log. Distinct from sonner toasts — own shape (capsule) + own position (strip below navbar) |
| P12-D7 | Token wiring | Centralised via a SINGLE axios response interceptor (`tokenInterceptor.js`). Every successful 2xx POST/PATCH/DELETE fires a contextual token; every 4xx/5xx (except 401) fires a danger-variant token. Permission gate stashed in a module variable updated by AuthProvider |
| P12-D8 | Bell freshness | react-query polls `/notifications/unread-count` every 30 s + on focus. The token interceptor also invalidates the `['notifications']` cache after every workflow mutation so the badge ticks instantly without waiting for the poll |

## Files delivered

**Backend** (8 new + 4 edits):
- `db/migrations/430__phase12_notifications.sql` — CREATE TABLE notifications + 2 indexes
- `db/migrations/431__phase12_notifications_permissions.sql` — 2 perms × 4 roles (View-Only excluded)
- `src/modules/notifications/notifications.validators.js` — Zod (list query, :id param, empty body)
- `src/modules/notifications/notifications.repo.js` — `insertOne(conn,row)`, `listForUser`, `countUnread`, `markRead`, `markAllRead` — all recipient-scoped
- `src/modules/notifications/notifications.emitter.js` — `emit({conn, event_type, entity_type, entity_id, entity, actor, recipients})` with TEMPLATES dictionary
- `src/modules/notifications/notifications.recipients.js` — `getActiveEmployeesWithPermission(perm)` + `getManagerialRecipients()` with 60-s cache
- `src/modules/notifications/notifications.service.js` — facade (list/count/markRead/markAllRead)
- `src/modules/notifications/notifications.controller.js` — 4 thin HTTP shims
- `src/modules/notifications/notifications.routes.js` — 4 routes (read-own + mark-own gates)
- `src/server.js` (edited) — mounted /api/v1/notifications
- `src/modules/jobRequests/jobRequests.service.js` (edited) — emitter wired into 5 paths: createJrFromDraft, submit, editDraft, cancelDraft, convert (2 events: JR_APPROVED_CONVERTED + JC_CREATED), reject
- `src/modules/jobCards/jobCards.service.js` (edited) — emitter wired into 5 paths: patchJobCardTab (JC_TAB_UPDATED with tabHint inference), startWork, markComplete, verifyClose (notifies JR owner too), reopen
- `db/discovery/smoke_phase12.js` — 14-check matrix

**Frontend** (6 new + 4 edits):
- `src/lib/api/notifications.js` — 4 axios wrappers
- `src/lib/hooks/useNotifications.js` — `useUnreadCount`, `useNotificationList`, `useNotificationActions`, `useCanReadNotifications` gate helper
- `src/lib/tokens/tokenStore.js` — Zustand store (push, dismiss, MAX_VISIBLE=3, AUTO_DISMISS_MS=2000)
- `src/lib/tokens/useToken.js` — permission-gated `usePushToken()` hook
- `src/lib/tokens/tokenInterceptor.js` — universal axios interceptor with URL→message inference; cache-bust hook
- `src/components/notifications/NotificationDropdown.jsx` — bell dropdown (up to 10 rows, mark-all, deep-link)
- `src/components/tokens/TokenHost.jsx` — capsule strip renderer (pill shape, variants, × close, timestamp)
- `src/pages/notifications/Notifications.jsx` — full inbox page (paginated, unread filter, mark-all)
- `src/components/TopBar.jsx` (edited) — bell wired to real unread count + dropdown; hidden for View-Only
- `src/components/Layout.jsx` (edited) — `<TokenHost />` mounted between TopBar and main
- `src/styles/globals.css` (edited) — `@keyframes fadeSlideDown` for token entrance
- `src/lib/auth-context.jsx` (edited) — `setAuthSnapshot(user)` keeps interceptor permission cache fresh
- `src/main.jsx` (edited) — `setQueryClient(queryClient)` so the interceptor can invalidate notifications cache
- `src/App.jsx` (edited) — `/notifications` route gated by `notifications:read-own`
- FE dep added: `zustand` (1 package)

## Permissions (mig 431 — 2 new perms)

| Permission | SA | LIC | LE | NU | VO |
|---|:-:|:-:|:-:|:-:|:-:|
| notifications:read-own | ✓ | ✓ | ✓ | ✓ |   |
| notifications:mark-own | ✓ | ✓ | ✓ | ✓ |   |

## Endpoints (4 total)

| Endpoint | Method | Permission |
|---|---|---|
| `/api/v1/notifications` | GET | notifications:read-own |
| `/api/v1/notifications/unread-count` | GET | notifications:read-own |
| `/api/v1/notifications/read-all` | PATCH | notifications:mark-own |
| `/api/v1/notifications/:id/read` | PATCH | notifications:mark-own |

## Event vocabulary (TEMPLATES dictionary)

JR lifecycle: `JR_DRAFT_SAVED`, `JR_SUBMITTED`, `JR_EDIT_DRAFT`, `JR_APPROVED_CONVERTED`, `JR_REJECTED`, `JR_CANCELLED`

JC lifecycle: `JC_CREATED`, `JC_START_WORK`, `JC_TAB_UPDATED` (with tab hint), `JC_CHILD_ROW_ADDED`, `JC_MARKED_COMPLETE`, `JC_VERIFIED_CLOSED`, `JC_REOPENED`

Equipment (light coverage): `EQUIPMENT_REGISTERED`, `EQUIPMENT_VERIFIED`

## Smoke matrix highlights

```
14 passed · 0 failed
─────────────────────────────────────
✓ E7 anon → 401, VIEW_ONLY → 403 (no notifications:read-own)
✓ E1 JR submit → 4 notification rows (managers SA+LIC notified, actor stripped, unrelated NORMAL user NOT notified)
✓ E4 recipient isolation — DS00001 cannot PATCH SA79900's notif → 404
✓ E4 list-scope clean — every list row belongs to caller
✓ E5 mark-read flips unread + stamps read_at
✓ E8 atomicity — failed transition (422 Zod) leaves notification count UNCHANGED
✓ E9 repo aliasing — zero legacy SQL column refs in service/controller/routes/validators
```

## Token capsule UX

- Pill-shape (`rounded-full`), inline-flex, ring + soft bg per variant (success=emerald, info=sky, danger=red)
- Single-line message + optional sub-line + `HH:mm:ss` timestamp + × close
- Auto-dismiss exactly 2 s · max 3 visible (oldest drops on overflow) · newest on top
- Mounted in `<Layout>` between TopBar and main content — non-blocking flex container, NOT position:fixed
- `fadeSlideDown` 180 ms entrance · respects `motion-reduce`
- URL→message inference covers JR/JC/equipment/admin endpoints; catch-all `Saved`/`Created`/`Removed` for unmapped routes

## Related
- [[project-cmcmis-phase9-delivered]] — JC state machine + audit + status_history (the txn boundaries Phase 12 hooks)
- [[project-cmcmis-phase7-slice2-delivered]] — JR Convert atomic txn (5 emit points wired here)
- [[project-cmcmis-modules-roles]] — 5-role RBAC (View-Only exclusion via permission absence)
