// scripts/migrate-legacy-employees.js
// Standalone seeder: cmms_emp_mst (legacy) -> users + user_roles
// Idempotent: safe to run multiple times.
// Run from phase3/ folder:  npm run migrate:legacy-users

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// ─── Config ────────────────────────────────────────────────────────────────
const EMPLOYEE_ID_REGEX = /^[A-Z]{2}[0-9]{5}$/;
const DEFAULT_ROLE_CODE = 'NORMAL_USER';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

// ─── Pool (self-contained, reads from phase3/.env) ─────────────────────────
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'final',
    connectionLimit: 5,
    charset: 'utf8mb4',
    timezone: 'Z',
});

// ─── Tiny logger (no pino dependency) ──────────────────────────────────────
const log = (msg, meta) =>
    console.log(
        `[${new Date().toISOString().slice(11, 19)}] ${msg}`,
        meta ? JSON.stringify(meta) : ''
    );

async function main() {
    const conn = await pool.getConnection();
    let inserted = 0, skipped = 0, invalid = 0, inactiveCount = 0;

    try {
        await conn.query('SELECT 1');
        log('DB pool ready', { db: process.env.DB_NAME });

        await conn.beginTransaction();

        // 1) Resolve default role -----------------------------------------------
        const [roleRows] = await conn.query(
            `SELECT role_id FROM roles WHERE role_code = ? LIMIT 1`,
            [DEFAULT_ROLE_CODE]
        );
        if (roleRows.length === 0) {
            throw new Error(`Default role '${DEFAULT_ROLE_CODE}' not found in roles table`);
        }
        const defaultRoleId = roleRows[0].role_id;
        log(`Default role resolved -> ${DEFAULT_ROLE_CODE} (id=${defaultRoleId})`);

        // 2) Pull legacy candidates --------------------------------------------
        const [legacy] = await conn.query(
            `SELECT EMM_ID, EMM_NAME, EMM_INACTIVE
       FROM cmms_emp_mst
       WHERE EMM_ID REGEXP '^[A-Z]{2}[0-9]{5}$'`
        );
        log('Legacy candidates fetched', { count: legacy.length });

        // 3) Existing users to skip --------------------------------------------
        const [existing] = await conn.query(`SELECT employee_id FROM users`);
        const already = new Set(existing.map(r => r.employee_id));
        log('Existing users in target', { count: already.size });

        // 4) Migrate ------------------------------------------------------------
        for (const emp of legacy) {
            const eid = emp.EMM_ID;

            if (!EMPLOYEE_ID_REGEX.test(eid)) { invalid++; continue; }
            if (already.has(eid)) { skipped++; continue; }

            const passwordHash = await bcrypt.hash(eid, BCRYPT_ROUNDS);
            const isActive = emp.EMM_INACTIVE === 0 ? 1 : 0;
            if (!isActive) inactiveCount++;

            const [ins] = await conn.query(
                `INSERT INTO users
           (employee_id, password_hash, is_active, is_locked, failed_login_count)
         VALUES (?, ?, ?, 0, 0)`,
                [eid, passwordHash, isActive]
            );

            await conn.query(
                `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
                [ins.insertId, defaultRoleId]
            );

            log(`migrated  ${eid.padEnd(7)}  ${emp.EMM_NAME}`, { is_active: isActive });
            inserted++;
        }

        await conn.commit();
        log('Migration complete', {
            inserted,
            skipped,
            invalid,
            inactiveSeededAsLockedOut: inactiveCount,
            totalLegacy: legacy.length,
        });
    } catch (err) {
        await conn.rollback();
        console.error('Migration failed — rolled back:', err.message);
        throw err;
    } finally {
        conn.release();
        await pool.end();
    }
}

main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));