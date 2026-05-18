// ============================================================================
// src/pages/dashboard/KpiGrid.jsx  —  Responsive 4-up grid
// ----------------------------------------------------------------------------
// 4 columns at md+, 2 at sm, 1 at base. The grid renders skeletons when
// `cards` is null (first paint) so the layout doesn't jump.
// ============================================================================

import { KpiCard } from './KpiCard.jsx';

/**
 * @param {Object} props
 * @param {Array<Object> | null} props.cards
 */
export function KpiGrid({ cards }) {
  // First paint — show 4 skeletons.
  if (cards === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <KpiCard key={i} card={null} loading />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => <KpiCard key={c.id} card={c} />)}
    </div>
  );
}
