// ============================================================================
// src/pages/dashboard/QuickActions.jsx  —  Two CTA buttons under the header
// ----------------------------------------------------------------------------
// Each button declares its required permission code. We hide buttons the
// user can't use — defence in depth at the UI level (the BE will also
// reject a forbidden POST, but the user should never see the button).
//
// The icon name + label come from the BE payload — no FE branching on
// variant.
// ============================================================================

import { Link } from 'react-router-dom';
import { Plus, Wrench, TrendingUp, FileText, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../lib/auth-context.jsx';

const ICONS = {
  plus:         Plus,
  wrench:       Wrench,
  'trending-up':TrendingUp,
  'file-text':  FileText,
};

/**
 * @param {Object} props
 * @param {Array<{ label: string, href: string, icon: string, primary: boolean, requires: string }>} props.actions
 */
export function QuickActions({ actions }) {
  const { hasPermission } = useAuth();

  // Filter to actions the user is allowed to invoke.
  const visible = (actions || []).filter((a) =>
    !a.requires || hasPermission(a.requires)
  );

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {visible.map((a) => {
        const Icon = ICONS[a.icon] || HelpCircle;
        return (
          <Link
            key={a.label}
            to={a.href}
            className={clsx(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              a.primary
                ? 'bg-accent text-white hover:bg-accent/90 shadow-sm'
                : 'bg-white text-ink border border-border hover:bg-base-elev',
            )}
          >
            <Icon size={16} strokeWidth={2} />
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
