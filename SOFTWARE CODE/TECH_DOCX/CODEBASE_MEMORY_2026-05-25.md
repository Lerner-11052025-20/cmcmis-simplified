# CMCMIS Codebase Memory - 2026-05-25

## Naming and user style
- FE means the frontend folder.
- BE means the backend folder.
- DATABASE means the database folder and schema/migration assets.
- Preferred explanation style: color-coded, table-based, flowchart/diagram heavy, beginner-to-advanced.

## Project identity
- CMCMIS is a Computerized Maintenance and Calibration MIS.
- The app is an industry-style workflow system, not a simple CRUD demo.
- Runtime stack: React/Vite frontend, Express/mysql2 backend, MariaDB/MySQL database, phpMyAdmin administration.
- Current active runtime DB: `cmcmis_simplified`.

## Verified current state
- MariaDB is reachable at localhost:3306.
- phpMyAdmin opens the `cmcmis_simplified` structure route.
- Backend DB pool check succeeds.
- Frontend production build succeeds.
- Live DB has 104 tables, 5 roles, 73 permissions, 61 users.

## Architecture memory
- FE routes are permission-protected.
- BE modules follow route/controller/service/repository patterns.
- Database uses legacy CMMS tables plus newer MVP/security/workflow tables.
- RBAC must be permission-code based, not role-name based.
- Job Request and Job Card state machines are the core business rules.

## Attention items
- FE bundle is large; consider lazy loading/manual chunks later.
- Equipment detail/update/verify/condemn/delete backend routes are still reserved/stub style.
- One legacy Job Card PDF route remains while `.pdf` endpoints exist.
- FE token capsule route patterns should be checked against current BE routes.
- DATABASE/phase3 `.env` differs from BE runtime DB name.
