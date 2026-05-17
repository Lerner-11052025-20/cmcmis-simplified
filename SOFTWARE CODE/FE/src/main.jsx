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
import './styles/globals.css';
import { App } from './App.jsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  // Fail loudly during boot — easier to debug than a blank white page.
  throw new Error('#root element not found in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
