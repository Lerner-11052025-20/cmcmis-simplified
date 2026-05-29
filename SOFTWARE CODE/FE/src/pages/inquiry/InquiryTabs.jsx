// ============================================================================
// src/pages/inquiry/InquiryTabs.jsx  —  Permission-aware tab strip
// ----------------------------------------------------------------------------
// Reads the URL's `?tab=` query param via react-router's useSearchParams
// (Doctrine 10: URL is source of truth). Hides any tab whose required
// permission the user doesn't hold — defence in depth above the
// BE's 403 reject.
//
// Tab change updates the URL via `setSearchParams` (replace mode so the
// browser back button doesn't fill with one history entry per tab click).
// ============================================================================

import clsx from 'clsx';
import { INQUIRY_TABS } from '../../lib/schemas/inquirySchemas.js';
import { useAuth } from '../../lib/auth-context.jsx';

/**
 * @param {Object} props
 * @param {string} props.activeTab        Currently selected tab id.
 * @param {(id: string) => void} props.onChange
 */
export function InquiryTabs({ activeTab, onChange }) {
  const { hasPermission } = useAuth();
  const visible = INQUIRY_TABS.filter((t) => hasPermission(t.permission));

  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-2" aria-label="Inquiry tabs">
        {visible.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'px-1 py-3 text-sm font-medium border-b-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-soft hover:text-ink hover:border-border',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
