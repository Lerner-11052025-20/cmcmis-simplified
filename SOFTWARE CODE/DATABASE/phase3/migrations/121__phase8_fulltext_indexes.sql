-- ════════════════════════════════════════════════════════════════════
-- CMCMIS_SIMPLIFIED — Migration 121 (Phase 8 Slice 1)
-- File:     121__phase8_fulltext_indexes.sql
-- Purpose:  FULLTEXT (NATURAL LANGUAGE) indexes for the Inquiry module.
--           Powers the ≥ 3-char path (P8-D11) on three legacy tables:
--
--             cmms_cont_mst      → Vendor tab
--             cmms_product_mst   → Product tab
--             cmms_eqip_mst      → Instrument Lookup tab
--
--           Job Card tab does NOT get a FULLTEXT here — it composes
--           via job-ID prefix (LIKE) + JOIN to cmms_eqip_mst.EQM_NAME
--           via ft_eqip_search.
--
-- ENGINE  : InnoDB (MySQL ≥ 5.6) supports FULLTEXT — no engine change.
-- LOCALE  : default natural-language analyser; we do NOT alter the
--           ngram tokenizer minLength (default 3). The Inquiry service
--           gates length ≥ 3 before issuing MATCH … AGAINST.
-- IDEMPOTENT: information_schema guard.
-- ════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── 121.1  cmms_cont_mst → ft_cont_search ────────────────────────────
-- (CMM_CONT_NAME, CMM_CONT_CONTACT_PERSON, CMM_CONT_EMAIL)
-- Vendor search matches any of these three free-text fields.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_cont_mst'
              AND index_name='ft_cont_search');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_cont_mst`
     ADD FULLTEXT INDEX `ft_cont_search`
         (`CMM_CONT_NAME`, `CMM_CONT_CONTACT_PERSON`, `CMM_CONT_EMAIL`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 121.2  cmms_product_mst → ft_prod_search ─────────────────────────
-- (PROD_NAME, PROD_DESC)
-- Product master is thin — only name + description are searchable today.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_product_mst'
              AND index_name='ft_prod_search');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_product_mst`
     ADD FULLTEXT INDEX `ft_prod_search`
         (`PROD_NAME`, `PROD_DESC`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 121.3  cmms_eqip_mst → ft_eqip_search ────────────────────────────
-- (EQM_NAME, EQM_MODELNO, EQM_SRNO)
-- Instrument Lookup hits this index. Composite PK lookup (EQM_TYPE +
-- EQM_ID) is handled by a separate LIKE-prefix path in inquiry.repo.js.
SET @i := (SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='cmms_eqip_mst'
              AND index_name='ft_eqip_search');
SET @sql := IF(@i>0, 'SELECT 1',
  'ALTER TABLE `cmms_eqip_mst`
     ADD FULLTEXT INDEX `ft_eqip_search`
         (`EQM_NAME`, `EQM_MODELNO`, `EQM_SRNO`)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ── 121.4  Verify ────────────────────────────────────────────────────
SELECT
  table_name, index_name, index_type,
  GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
  FROM information_schema.statistics
 WHERE table_schema=DATABASE()
   AND index_name IN ('ft_cont_search', 'ft_prod_search', 'ft_eqip_search')
 GROUP BY table_name, index_name, index_type
 ORDER BY table_name, index_name;

SELECT '✓ Migration 121 complete — Phase 8 FULLTEXT indexes' AS result;
