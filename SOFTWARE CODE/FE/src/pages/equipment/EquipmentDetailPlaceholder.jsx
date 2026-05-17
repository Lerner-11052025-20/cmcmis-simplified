// ============================================================================
// src/pages/equipment/EquipmentDetailPlaceholder.jsx  —  /equipment/:id
// ----------------------------------------------------------------------------
// Phase-6 placeholder. The route + ProtectedRoute + permission gate
// (equipment:read-detail) are already wired so the URL surface is
// locked in. Body content lands Phase 6.
// ============================================================================

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';

export function EquipmentDetailPlaceholder() {
  const { id } = useParams();
  return (
    <div className="max-w-2xl">
      <Link
        to="/equipment"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-accent"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Back to Equipment
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-ink">Equipment Detail</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Looking at <code className="px-1.5 py-0.5 rounded bg-base-elev text-xs">{id}</code>
      </p>

      <div className="mt-6 rounded-lg border border-border bg-white shadow-card p-6 text-sm">
        <p className="text-ink">
          The detail page (with status timeline, calibration history, full
          spec sheet, and edit + verify + condemn actions) ships in
          <strong className="text-ink"> Phase 6</strong>.
        </p>
        <p className="text-ink-soft text-xs mt-2">
          The route, the permission gate, and the URL pattern are already in place.
          When Phase 6 fills in the page body, the link from the list page will
          render the real detail automatically.
        </p>
        <div className="mt-4">
          <Link to="/equipment">
            <Button variant="primary">Back to list</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
