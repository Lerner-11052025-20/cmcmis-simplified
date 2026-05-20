// ============================================================================
// src/main.jsx  —  React 18 root mount
// ----------------------------------------------------------------------------
// PURPOSE
//   The first file Vite loads. Imports the global Tailwind CSS bundle
//   (must be FIRST so any later module that injects a style tag overrides
//   correctly), then mounts <App /> into #root.
//
// STRICT MODE
//   React.StrictMode double-invokes effects in development to surface
//   side-effect bugs. It is a no-op in production builds.
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import './styles/globals.css';
import { App } from './App.jsx';
// Phase 12 — token interceptor needs the QueryClient handle so it can
// invalidate the notifications cache after every successful workflow
// mutation (bell badge ticks instantly, not on the 30 s poll).
import { setQueryClient } from './lib/tokens/tokenInterceptor.js';

// ── Authorship credit (LOCKED · SEALED · NON-DELETABLE) ────────────────────
// Side-effect import. Loads src/components/MadeWithLove.jsx, which on
// module-load installs the bottom-right floating credit pill + a
// MutationObserver watchdog that re-paints the pill if it is removed
// from the DOM. The pill MUST remain visible — see file header for the
// full copyright + tamper-resistance contract. Removal of this import
// or the file it loads requires the WRITTEN CONSENT of Deep Sorathiya
// and Moksh Gandhi (the named authors).
import './components/MadeWithLove.jsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  // Fail loudly during boot — easier to debug than a blank white page.
  throw new Error('#root element not found in index.html');
}

// ── React-Query client (Phase 10) ──────────────────────────────────────
// One client per app. Phase-10 reports + analytics use react-query for
// caching + parallel fetching of multiple chart endpoints.
//
//   staleTime: 30s        → reports are real-time but a 30s window
//                            avoids refetch flapping when the user
//                            navigates between report tabs.
//   refetchOnWindowFocus  → reuse the same "user tabbed back" trigger
//                            already established by useDashboardKpis.
//   retry: 1              → one retry on network blips; auth-related
//                            401s are handled by the axios interceptor.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Phase 12 — hand the QueryClient to the token interceptor so it can
// invalidate `['notifications', …]` queries after every workflow
// mutation. Without this, the bell badge would wait up to 30 s (the
// poll cadence) before reflecting a brand-new notification.
setQueryClient(queryClient);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Toaster is global so sonner toasts can be fired from anywhere
          (e.g. CSV download "exported X rows"). Positioned bottom-right
          to avoid colliding with the existing TopBar dropdowns. */}
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  </React.StrictMode>,
);
