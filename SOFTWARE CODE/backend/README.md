# CMCMIS · Phase 4 · Backend (BE)

Auth + RBAC HTTP layer for the Phase-3-sealed MySQL database (`final`). Pure Node.js + Express + raw SQL — no ORM.

## Quick start

```bash
cd "SOFTWARE CODE/BE"
npm install
cp .env.example .env          # then edit DB creds + JWT secrets
npm run dev                   # node --watch src/server.js
curl http://localhost:3000/healthz
```

A healthy boot prints two log lines: `DB pool ready` then `Server ready`. The `/healthz` curl should return `{"ok":true,...}`.

## Layout (built phase-by-phase)

| Step | Adds                                                         |
| ---- | ------------------------------------------------------------ |
| 1    | `src/server.js`, `src/config/{env,logger,db,jwt}.js`         |
| 2    | `src/middleware/{validate,errorHandler}.js` + wired pipeline |
| 3    | `src/modules/auth/*` (validators → repos → service → controller → routes) |
| 4    | `src/middleware/{authenticate,authorize,rateLimit}.js`       |
| 5    | `src/modules/users/*` (`GET /me`)                            |

## Hard rules

- Repositories are the **only** files containing SQL. Always parameterised `?` placeholders.
- `multipleStatements` is **false** at runtime — the Phase-3 migration runner is the only place it's true.
- Never store tokens in `localStorage`. Refresh token lives in an httpOnly cookie; access token lives in JS memory.
- Permission checks use permission **codes**, never role names (BR-RBAC-03).
