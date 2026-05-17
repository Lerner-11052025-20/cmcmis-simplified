// ============================================================================
// src/pages/InquiryPlaceholder.jsx  —  /inquiry
// ----------------------------------------------------------------------------
// Phase-7 placeholder. The TopBar's global search bar already navigates
// to this route with ?q=…; Phase 7 will wire the cross-entity search API.
// ============================================================================

import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

export function InquiryPlaceholder() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Inquiry</h1>
      <p className="mt-1 text-sm text-ink-soft">Cross-entity instrument / vendor / job-request search</p>

      <div className="mt-6 rounded-lg border border-border bg-white shadow-card p-6 text-sm">
        <div className="flex items-center gap-2 text-ink">
          <Search size={18} strokeWidth={1.5} className="text-accent" />
          <span className="font-medium">Inquiry ships in Phase 7.</span>
        </div>
        {q ? (
          <p className="mt-3 text-ink-soft">
            You searched for: <code className="px-1.5 py-0.5 rounded bg-base-elev text-xs">{q}</code>
          </p>
        ) : null}
        <p className="text-ink-soft text-xs mt-2">
          The TopBar global search bar is already wired here — only the backend
          search service is pending.
        </p>
      </div>
    </div>
  );
}
