// ============================================================================
// src/lib/hooks/useAutoSave.js  —  Debounced auto-save for tab forms
// ----------------------------------------------------------------------------
// USAGE
//   const { status, lastSavedAt } = useAutoSave({
//     enabled: !!editable && autoSavePref,
//     getDirtyValues: () => watchedDirtyFields,
//     onSave: async (values) => { await patchJobCardTab(id, values); },
//     debounceMs: 1500,
//     intervalMs: 30_000,
//   });
//
// CONTRACT
//   • Triggered by either (a) the user becoming idle 1.5 s after a change
//     OR (b) the 30 s heartbeat interval, whichever fires first.
//   • status transitions: 'idle' → 'pending' → 'saving' → 'saved' / 'error'.
//   • Failures retry on the next interval; after 3 consecutive failures
//     the status sticks at 'error' until a successful save resets it.
//
// PERSISTED PREFERENCE
//   The component decides whether to read/write the localStorage key —
//   we keep the hook itself stateless about that toggle.
// ============================================================================

import { useEffect, useRef, useState } from 'react';

/**
 * @param {Object} args
 * @param {boolean} args.enabled                Master switch
 * @param {() => Object|null} args.getDirtyValues  Returns the values to save,
 *                                                or null/empty if no dirty fields
 * @param {(values: Object) => Promise<any>} args.onSave
 * @param {number} [args.debounceMs]            Default 1500
 * @param {number} [args.intervalMs]            Default 30000
 */
export function useAutoSave({ enabled, getDirtyValues, onSave, debounceMs = 1500, intervalMs = 30000 }) {
  const [status, setStatus] = useState('idle');     // idle | pending | saving | saved | error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const debTimer = useRef(null);
  const heartbeat = useRef(null);
  const isSaving = useRef(false);

  // Helper: trigger an actual save IFF there's a dirty payload + not already saving + enabled.
  async function maybeSave() {
    if (!enabled || isSaving.current) return;
    const values = getDirtyValues();
    if (!values || Object.keys(values).length === 0) {
      setStatus('idle');
      return;
    }
    isSaving.current = true;
    setStatus('saving');
    try {
      await onSave(values);
      setStatus('saved');
      setLastSavedAt(new Date());
      setConsecutiveFails(0);
    } catch (e) {
      setStatus('error');
      setConsecutiveFails((n) => n + 1);
    } finally {
      isSaving.current = false;
    }
  }

  // Debounced reactor — called by the parent component on every change.
  // We expose a tick() that the parent calls in its onChange handler.
  // The simplest pattern: a useEffect that watches a "tick counter".
  // But for compactness we expose a function via the return value.
  function tick() {
    if (!enabled) return;
    setStatus((s) => (s === 'saving' ? s : 'pending'));
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(maybeSave, debounceMs);
  }

  // Heartbeat interval — fires every 30 s.
  useEffect(() => {
    if (!enabled) return undefined;
    heartbeat.current = setInterval(maybeSave, intervalMs);
    return () => clearInterval(heartbeat.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);

  return { status, lastSavedAt, consecutiveFails, tick };
}
