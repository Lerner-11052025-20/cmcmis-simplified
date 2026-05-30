// ============================================================================
// src/pages/dashboard/KpiGrid.jsx  —  Responsive 4-up grid
// ----------------------------------------------------------------------------
// 4 columns at md+, 2 at sm, 1 at base. The grid renders skeletons when
// `cards` is null (first paint) so the layout doesn't jump.
// ============================================================================

import { KpiCard } from './KpiCard.jsx';
import { useAuth } from '../../lib/auth-context.jsx';

const HIDDEN_KPI_IDS = new Set(['overdue_calibrations']);
const HIDDEN_KPI_LABELS = new Set(['Overdue Calibrations']);
const ADMIN_ONLY_KPI_IDS = new Set(['total_active_equipment', 'new_equipment_this_week']);
const ADMIN_ONLY_KPI_LABELS = new Set(['Active Equipment', 'New Equipment (Week)', 'New Equipment']);

/**
 * @param {Object} props
 * @param {Array<Object> | null} props.cards
 */
export function KpiGrid({ cards }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // First paint — show 7 skeletons matching ORG card count.
  if (cards === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <KpiCard key={i} card={null} loading />)}
      </div>
    );
  }

  const visibleCards = cards.filter((card) => (
    !HIDDEN_KPI_IDS.has(card.id)
    && !HIDDEN_KPI_LABELS.has(card.label)
    && (
      isSuperAdmin
      || (!ADMIN_ONLY_KPI_IDS.has(card.id) && !ADMIN_ONLY_KPI_LABELS.has(card.label))
    )
  ));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {visibleCards.map((c) => <KpiCard key={c.id} card={c} />)}
    </div>
  );
}
