// ============================================================================
// src/components/ui/Spinner.jsx  —  Inline loading spinner
// ----------------------------------------------------------------------------
// PURPOSE
//   Small spinning loader for inline "in-flight" indication. Used inside
//   primary Buttons during async submit ("Signing in…"), and as a
//   centered full-page loader while <ProtectedRoute> waits for the
//   silent /auth/refresh on app boot.
//
// IMPLEMENTATION
//   lucide-react's <Loader2/> icon, set to animate-spin via Tailwind.
//   Stroke 1.5 matches the rest of the lucide icons we use, so the
//   spinner sits visually next to other glyphs without looking heavier.
// ============================================================================

import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

/**
 * @param {Object} props
 * @param {number} [props.size]      Pixel size of the icon; default 16.
 * @param {string} [props.className] Tailwind class overrides — typically a
 *                                   color (text-ink-soft, text-accent, …).
 */
export function Spinner({ size = 16, className }) {
  return (
    <Loader2
      size={size}
      strokeWidth={1.5}
      aria-hidden="true"
      className={clsx('animate-spin', className)}
    />
  );
}
