// ============================================================================
// src/components/Pagination.jsx  —  Pagination strip
// ----------------------------------------------------------------------------
// [Prev] [1] [2] [3] … [99] [100] [Next]
//
// Page-range logic exported as a PURE function `buildPageRange` so it can
// be smoke-tested. Rules:
//   • Always show 1..2 at the start, current-1..current+1, last-1..last.
//   • Insert '…' between non-contiguous ranges.
//   • Prev disabled on page 1; Next disabled on last page.
// ============================================================================

import clsx from 'clsx';

/**
 * Pure page-range generator.
 *
 *   buildPageRange(1, 5)    → [1, 2, 3, 4, 5]
 *   buildPageRange(1, 100)  → [1, 2, 3, '…', 99, 100]
 *   buildPageRange(50, 100) → [1, 2, '…', 49, 50, 51, '…', 99, 100]
 *   buildPageRange(100,100) → [1, 2, '…', 98, 99, 100]
 *
 * @param {number} current
 * @param {number} total
 * @returns {(number | '…')[]}
 */
export function buildPageRange(current, total) {
  if (total <= 1) return [1];
  // Collect page numbers we want to show, then sort + dedupe.
  const pages = new Set();
  // Start
  pages.add(1);
  if (total >= 2) pages.add(2);
  if (current === 1 && total >= 3) pages.add(3);
  // Current ± 1
  for (let i = current - 1; i <= current + 1; i += 1) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  // End
  if (total - 1 >= 1) pages.add(total - 1);
  pages.add(total);
  if (current === total && total - 2 >= 1) pages.add(total - 2);

  const sorted = [...pages].sort((a, b) => a - b);

  // Insert '…' between non-contiguous numbers.
  const out = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const n = sorted[i];
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…');
    out.push(n);
  }
  return out;
}

/**
 * @param {Object} props
 * @param {number} props.currentPage
 * @param {number} props.totalPages
 * @param {(page: number) => void} props.onPageChange
 */
export function Pagination({ currentPage, totalPages, onPageChange }) {
  if (!totalPages || totalPages < 1) return null;
  const range = buildPageRange(currentPage, totalPages);

  const btnBase =
    'min-w-[2rem] h-8 px-2 text-xs rounded-md inline-flex items-center justify-center transition-colors';
  const inactive = 'text-ink hover:bg-base-elev';
  const active = 'bg-accent text-white font-medium';
  const disabled = 'opacity-50 cursor-not-allowed';

  function go(p) {
    if (p < 1 || p > totalPages || p === currentPage) return;
    onPageChange(p);
  }

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1 select-none">
      <button
        type="button"
        onClick={() => go(currentPage - 1)}
        disabled={currentPage <= 1}
        className={clsx(btnBase, inactive, currentPage <= 1 && disabled)}
        aria-label="Previous page"
      >
        Previous
      </button>

      {range.map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} className="px-1 text-ink-soft text-xs">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            className={clsx(btnBase, p === currentPage ? active : inactive)}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={clsx(btnBase, inactive, currentPage >= totalPages && disabled)}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
