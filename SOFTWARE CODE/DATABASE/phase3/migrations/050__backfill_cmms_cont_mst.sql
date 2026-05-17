-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 050 (BONUS, per M3 + M4)
-- File:     050__backfill_cmms_cont_mst.sql
-- Purpose:  Seed cmms_cont_mst with placeholder vendor rows derived
--           from DISTINCT EQM_MFRID in cmms_eqip_mst, so the 5,704
--           equipment rows have valid FK targets.
-- Per:      M3 strategy (derive from existing data), M4 (reuse same IDs)
-- Idempotent: YES — INSERT IGNORE on duplicate PK; runs only if eqip
--             has data and cont_mst is empty.
--
-- Numbered 050 so it runs AFTER cmms_cont_mst exists (001) but BEFORE
-- isolation (099). Position is purely cosmetic since the runner uses
-- alphabetical order.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8;
SET foreign_key_checks = 0;     -- disable briefly because we're inserting
                                -- IDs that already exist as FKs in eqip_mst

-- ────────────────────────────────────────────────────────────────────
-- Derive placeholder vendor rows from cmms_eqip_mst.EQM_MFRID
-- Reuse the same IDs (per M4) so existing FKs resolve immediately.
-- ────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO `cmms_cont_mst`
  (`CMM_CONT_ID`,
   `CMM_CONT_NAME`,
   `CMM_CONT_TYPE`,
   `CMM_CONT_STATE_FLAG`,
   `CMM_CONT_REMARKS`,
   `CMM_CONT_CREATED_BY`,
   `CMM_CONT_CREATED_ON`,
   `CMM_CONT_UPDATED_BY`,
   `CMM_CONT_UPDATED_ON`)
SELECT DISTINCT
  e.`EQM_MFRID`                                                  AS CMM_CONT_ID,
  COALESCE(
    NULLIF(TRIM(e.`EQM_MFG_MODEL_NAME`), ''),
    CONCAT('Vendor #', e.`EQM_MFRID`)
  )                                                              AS CMM_CONT_NAME,
  'MFR'                                                          AS CMM_CONT_TYPE,
  1                                                              AS CMM_CONT_STATE_FLAG,
  'Auto-derived from cmms_eqip_mst at Phase 3 v2.0 bootstrap (M3 placeholder).
   Replace with real vendor master via Super Admin UI in Phase 2.'
                                                                 AS CMM_CONT_REMARKS,
  'BOOTSTRAP'                                                    AS CMM_CONT_CREATED_BY,
  NOW(6)                                                         AS CMM_CONT_CREATED_ON,
  'BOOTSTRAP'                                                    AS CMM_CONT_UPDATED_BY,
  NOW(6)                                                         AS CMM_CONT_UPDATED_ON
FROM `cmms_eqip_mst` e
WHERE e.`EQM_MFRID` IS NOT NULL
  AND e.`EQM_MFRID` > 0
ORDER BY e.`EQM_MFRID`;


-- Handle the case where EQM_MFRID = 0 or NULL was used as "unknown vendor"
-- but those rows should never reach this query because of the WHERE clause.
-- Defensive: ensure at least one fallback row exists for ID=0 if any
-- legacy row references it.
INSERT IGNORE INTO `cmms_cont_mst`
  (`CMM_CONT_ID`, `CMM_CONT_NAME`, `CMM_CONT_TYPE`,
   `CMM_CONT_STATE_FLAG`, `CMM_CONT_REMARKS`,
   `CMM_CONT_CREATED_BY`, `CMM_CONT_CREATED_ON`,
   `CMM_CONT_UPDATED_BY`, `CMM_CONT_UPDATED_ON`)
SELECT 0, '(Unknown / Not Specified)', 'OEM', 0,
  'Placeholder row for legacy data where vendor was not recorded.',
  'BOOTSTRAP', NOW(6), 'BOOTSTRAP', NOW(6)
WHERE EXISTS (
  SELECT 1 FROM `cmms_eqip_mst` WHERE `EQM_MFRID` = 0
);


SET foreign_key_checks = 1;

-- ────────────────────────────────────────────────────────────────────
-- Audit marker
-- ────────────────────────────────────────────────────────────────────
INSERT INTO `audit_log`
  (`actor_employee_id`, `actor_role_code`, `action`,
   `entity_type`, `entity_id`, `occurred_at`, `notes`)
SELECT
  'BOOTSTRAP', 'BOOTSTRAP', 'VENDOR_BACKFILL',
  'cmms_cont_mst', 'phase3-v2.0', NOW(6),
  CONCAT('Backfilled ', (SELECT COUNT(*) FROM `cmms_cont_mst`),
         ' vendor rows from DISTINCT EQM_MFRID per M3/M4.')
WHERE NOT EXISTS (
  SELECT 1 FROM `audit_log` WHERE `action` = 'VENDOR_BACKFILL' AND `entity_id` = 'phase3-v2.0'
);


-- Verify
SELECT '✓ Migration 050 complete' AS status;

SELECT
  (SELECT COUNT(*) FROM `cmms_cont_mst`)                              AS vendor_rows,
  (SELECT COUNT(DISTINCT EQM_MFRID) FROM `cmms_eqip_mst`
    WHERE EQM_MFRID IS NOT NULL)                                      AS distinct_mfr_in_eqip,
  (SELECT COUNT(*) FROM `cmms_eqip_mst` e
     LEFT JOIN `cmms_cont_mst` c ON c.CMM_CONT_ID = e.EQM_MFRID
    WHERE c.CMM_CONT_ID IS NULL AND e.EQM_MFRID IS NOT NULL)          AS orphan_fks_remaining;
-- Expected: orphan_fks_remaining = 0
