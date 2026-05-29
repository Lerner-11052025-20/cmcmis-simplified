// ============================================================================
// pages/jobRequests/components/DetailComplaintCard.jsx
// ----------------------------------------------------------------------------
// Compact accessories-only table card. Sits side-by-side with the Linked
// Job Card in the detail layout.
// ============================================================================

import { AlertCircle } from 'lucide-react';
import { SectionCard } from './detailPrimitives.jsx';

export function DetailComplaintCard({ accessories }) {
  return (
    <SectionCard
      icon={<AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />}
      title="Accessories"
      accent="rose"
    >
      {accessories && accessories.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="text-[10px] font-semibold text-slate-500 font-sans uppercase tracking-wider">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Serial No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accessories.map((a, i) => (
                <tr key={i} className="hover:bg-slate-50/40 transition-colors duration-150 text-[12px] font-medium text-slate-600 font-sans">
                  <td className="px-3 py-1.5">{a.type}</td>
                  <td className="px-3 py-1.5">{a.name}</td>
                  <td className="px-3 py-1.5 text-slate-400 font-normal">{a.serial_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-[11px] font-semibold text-slate-400 italic font-sans">No accessories.</div>
      )}
    </SectionCard>
  );
}
