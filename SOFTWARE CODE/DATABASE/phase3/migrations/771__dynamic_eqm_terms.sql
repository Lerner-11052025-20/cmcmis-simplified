-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 771 (Phase 16 · Dynamic Equipment Terms & Conditions)
-- File:     771__dynamic_eqm_terms.sql
-- Purpose:  Alter `job_request_terms` to support category classification
--           and seed default Equipment Terms & Conditions verbatim.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ── 771.1  Add category column to job_request_terms ──────────────────
ALTER TABLE `job_request_terms`
  ADD COLUMN `category` VARCHAR(20) NOT NULL DEFAULT 'JR';

-- ── 771.2  Add index for category column ──────────────────────────────
ALTER TABLE `job_request_terms`
  ADD INDEX `idx_jrt_category` (`category`);

-- ── 771.3  Seed initial Equipment terms verbatim ───────────────────────
INSERT INTO `job_request_terms` (`index_no`, `text`, `is_active`, `category`, `created_at`, `updated_at`)
VALUES
  (1, 'I confirm that all procurement and equipment details provided are accurate and supported by valid documentation.', 1, 'EQM', NOW(6), NOW(6)),
  (2, 'I understand that the equipment registration process will begin only after verification of PO and MIVR documents.', 1, 'EQM', NOW(6), NOW(6)),
  (3, 'I acknowledge that a unique Equipment ID will be assigned upon successful registration and physical verification.', 1, 'EQM', NOW(6), NOW(6)),
  (4, 'I agree to provide all necessary accessories, manuals, and calibration certificates from the manufacturer.', 1, 'EQM', NOW(6), NOW(6)),
  (5, 'I accept responsibility for maintaining warranty documentation and notifying the lab of any warranty claims.', 1, 'EQM', NOW(6), NOW(6)),
  (6, 'I understand that registered equipment will be entered into the calibration schedule as per its specified frequency.', 1, 'EQM', NOW(6), NOW(6));

-- ── 771.4  Verify seeding ─────────────────────────────────────────────
SELECT `category`, COUNT(*) AS terms_count
  FROM `job_request_terms`
 GROUP BY `category`;

SELECT '✓ Migration 771 complete — Dynamic Equipment Terms & Conditions added & seeded' AS result;
