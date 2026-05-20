// ============================================================================
// src/pages/procurement/ProcurementPage.jsx  —  /procurement route
// ----------------------------------------------------------------------------
// PHASE 13 — Procurement sub-module
//
// PAGE CHROME
//
//   Procurement                                          [ + New Purchase Order ]
//                                                        — or —
//                                                        [ + Add Spare Part ]
//   Manage purchase orders and spare parts inventory
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ Purchase Orders | Spare Parts                                          │
//   └──────────────────────────────────────────────────────────────────────┘
//
//   <PurchaseOrdersTab /> OR <SparePartsTab />
//
// The primary-CTA in the header switches based on the active tab (the
// screenshots show this — "+ New Purchase Order" vs "+ Add Spare Part").
// ============================================================================

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { useAuth } from '../../lib/auth-context.jsx';
import { PurchaseOrdersTab } from './PurchaseOrdersTab.jsx';
import { SparePartsTab }     from './SparePartsTab.jsx';
import { NewPurchaseOrderModal } from './NewPurchaseOrderModal.jsx';
import { SparePartFormModal }    from './SparePartFormModal.jsx';

const TAB_KEY = 'cmcmis.procurement.tab';

function readPref(k, fb) { try { return window.localStorage.getItem(k) || fb; } catch { return fb; } }
function writePref(k, v) { try { window.localStorage.setItem(k, v); } catch {} }


export function ProcurementPage() {
  const { hasPermission } = useAuth();
  const canPoCreate    = hasPermission('procurement:po-create');
  const canSpareCreate = hasPermission('procurement:spare-create');

  const [tab, setTab] = useState(() => readPref(TAB_KEY, 'purchase-orders'));
  useEffect(() => writePref(TAB_KEY, tab), [tab]);

  // Modals — only one open at a time. The pencil/edit buttons inside the
  // tabs push their selection into here via a small bus prop.
  const [showNewPo,    setShowNewPo]    = useState(false);
  const [editSpare,    setEditSpare]    = useState(null);   // null = closed, {} = create, row = edit
  const [editPo,       setEditPo]       = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Procurement</h1>
          <p className="text-sm text-ink-soft mt-1">
            Manage purchase orders and spare parts inventory
          </p>
        </div>
        <div>
          {tab === 'purchase-orders' && canPoCreate ? (
            <Button variant="primary" onClick={() => setShowNewPo(true)}>
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              New Purchase Order
            </Button>
          ) : null}
          {tab === 'spare-parts' && canSpareCreate ? (
            <Button variant="primary" onClick={() => setEditSpare({})}>
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              Add Spare Part
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-6" aria-label="Procurement tabs">
          <TabButton label="Purchase Orders" active={tab === 'purchase-orders'} onClick={() => setTab('purchase-orders')} />
          <TabButton label="Spare Parts"     active={tab === 'spare-parts'}     onClick={() => setTab('spare-parts')} />
        </nav>
      </div>

      {tab === 'purchase-orders' ? (
        <PurchaseOrdersTab onEdit={setEditPo} />
      ) : (
        <SparePartsTab onEdit={setEditSpare} />
      )}

      {showNewPo ? (
        <NewPurchaseOrderModal onClose={() => setShowNewPo(false)} />
      ) : null}
      {editPo ? (
        <NewPurchaseOrderModal po={editPo} onClose={() => setEditPo(null)} />
      ) : null}
      {editSpare ? (
        <SparePartFormModal spare={editSpare.id ? editSpare : null} onClose={() => setEditSpare(null)} />
      ) : null}
    </div>
  );
}


function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'pb-3 -mb-px text-sm font-semibold transition-colors ' +
        (active ? 'text-accent border-b-2 border-accent' : 'text-ink-soft hover:text-ink')
      }
    >
      {label}
    </button>
  );
}
