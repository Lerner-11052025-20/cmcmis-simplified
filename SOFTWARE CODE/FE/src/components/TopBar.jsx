// ============================================================================
// src/components/TopBar.jsx  —  Sticky page header
// ----------------------------------------------------------------------------
// LAYOUT:
//
//   [☰] [          🔍  Search equipment, job requests, vendors…          ]
//                                                  [🔔]  Name [Role] [👤▾]
//                                                                  │
//                                          (click) ────────────────┘
//                                              ┌────────────────────────┐
//                                              │ Dr. K. Kumar           │
//                                              │ k.kumar@sac.isro.gov.in│
//                                              │ EMG                    │
//                                              ├────────────────────────┤
//                                              │ [→]  Logout            │  ← red
//                                              └────────────────────────┘
//
// FOUR CLUSTERS (post Phase-7 patch, 2026-05-19):
//
//   FAR LEFT — hamburger button that toggles the Sidebar between
//              EXPANDED (w-64, icons + labels) and COLLAPSED (w-16,
//              icons only). State is owned by <Layout>; we render the
//              trigger and call the supplied onToggleSidebar callback.
//
//   LEFT     — global search bar (centered, takes available width).
//              Submitting (Enter) navigates to /inquiry?q=… so the
//              Inquiry module becomes the single source of cross-entity
//              search.
//
//   RIGHT    — bell with unread dot (visual placeholder; backend in P8).
//
//   FAR RIGHT— user cluster: display name + role pill + avatar disc +
//              chevron. Click toggles a dropdown that shows the user's
//              identity card and a red Logout action. Logout calls
//              useAuth().logout() then navigates to /login.
//
// DROPDOWN BEHAVIOUR
//   • Outside-click closes (mousedown listener with a ref check).
//   • Escape closes (window keydown listener).
//   • Resign-on-route-change is unnecessary here — Layout remounts on
//     route change because every route wraps its element in <Layout>.
//
// STICKY + Z-index — header stays visible while main scrolls. The
//   dropdown panel uses z-20 so it covers any sticky content below.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronDown,
  Info,
  LogOut,
  Menu,
  Search as SearchIcon,
  User,
} from 'lucide-react';

import { useAuth } from '../lib/auth-context.jsx';
import { INQUIRY_TABS } from '../lib/schemas/inquirySchemas.js';
import {
  useUnreadCount,
  useCanReadNotifications,
} from '../lib/hooks/useNotifications.js';
import { NotificationDropdown } from './notifications/NotificationDropdown.jsx';

// Search API parallel fetchers
import { fetchJobRequestList } from '../lib/api/jobRequests.js';
import { fetchEquipmentList } from '../lib/api/equipment.js';
import {
  fetchInquiryJobCards,
  fetchInquiryVendors,
  fetchInquiryProducts,
} from '../lib/api/inquiry.js';

/**
 * Compute 2-letter initials from a display name or employee_id.
 * "Dr. A. Kumar" → "AK", "SA79900" → "SA".
 * @param {string} source
 */
function initialsOf(source) {
  if (!source) return '··';
  const parts = source.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * @param {Object} props
 * @param {boolean} [props.collapsed]                Whether sidebar is collapsed.
 * @param {() => void} [props.onToggleSidebar]       Toggle handler from Layout.
 */
export function TopBar({ collapsed = false, onToggleSidebar }) {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  // ── Keyboard Shortcut listener for Ctrl+K ──────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('topbar-search');
        if (searchInput) {
          searchInput.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Global Autocomplete Search State ────────────────────────────────
  const [searchResults, setSearchResults] = useState({
    jobRequests: [],
    jobCards: [],
    equipment: [],
    vendors: [],
    products: []
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // ── Debounced Parallel Global Search Effect ─────────────────────────────
  useEffect(() => {
    const term = q.trim();
    if (!term || term.length < 2) {
      setSearchResults({ jobRequests: [], jobCards: [], equipment: [], vendors: [], products: [] });
      setSearchLoading(false);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    setSearchOpen(true);

    const controller = new AbortController();
    const signal = controller.signal;

    const timer = setTimeout(async () => {
      // Define searches based on RBAC permissions to avoid console 403s
      const tasks = [];
      const keys = [];

      // 1. Job Requests
      if (hasPermission('job_request:read-own') || hasPermission('job_request:approve')) {
        tasks.push(fetchJobRequestList({ q: term, page_size: 10 }, signal).catch(() => ({ items: [] })));
        keys.push('jobRequests');
      }
      
      // 2. Job Cards
      if (hasPermission('job_card:read-list') || hasPermission('inquiry:search-job-cards')) {
        tasks.push(fetchInquiryJobCards({ q: term, page_size: 10 }, signal).catch(() => ({ items: [] })));
        keys.push('jobCards');
      }

      // 3. Equipment
      if (hasPermission('equipment:read-list') || hasPermission('inquiry:search-instruments')) {
        tasks.push(fetchEquipmentList({ q: term, page_size: 10 }, signal).catch(() => ({ items: [] })));
        keys.push('equipment');
      }

      // 4. Vendors
      if (hasPermission('inquiry:search-vendors')) {
        tasks.push(fetchInquiryVendors({ q: term, page_size: 10 }, signal).catch(() => ({ items: [] })));
        keys.push('vendors');
      }

      // 5. Products
      if (hasPermission('inquiry:search-products')) {
        tasks.push(fetchInquiryProducts({ q: term, page_size: 10 }, signal).catch(() => ({ items: [] })));
        keys.push('products');
      }

      try {
        const responses = await Promise.all(tasks);
        const nextResults = { jobRequests: [], jobCards: [], equipment: [], vendors: [], products: [] };
        
        responses.forEach((res, i) => {
          const key = keys[i];
          // Conforms to strict page size limit while displaying top 3 results in autocomplete UI
          nextResults[key] = (res?.items || []).slice(0, 3);
        });

        if (!signal.aborted) {
          setSearchResults(nextResults);
          setSearchLoading(false);
        }
      } catch (err) {
        if (!signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, hasPermission]);

  // Close search dropdown on click outside or Escape
  useEffect(() => {
    if (!searchOpen) return undefined;
    function handlePointer(e) {
      if (searchRef.current && searchRef.current.contains(e.target)) return;
      setSearchOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setSearchOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [searchOpen]);

  const totalResultsCount = 
    searchResults.jobRequests.length +
    searchResults.jobCards.length +
    searchResults.equipment.length +
    searchResults.vendors.length +
    searchResults.products.length;

  // Dropdown open/close state — local to this component, no need to lift.
  const [menuOpen, setMenuOpen] = useState(false);
  // Ref on the wrapper so we can detect "click was outside me".
  const menuRef = useRef(null);

  // ── Phase 12 — notifications bell ────────────────────────────────────
  // canReadNotifications gates the bell entirely (hidden for View-Only).
  // unread is polled every 30 s by react-query; the badge shows "9+" when
  // saturated to avoid layout shift on a 3-digit count.
  const canReadNotifications = useCanReadNotifications();
  const { unread } = useUnreadCount();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Outside-click + Escape closes the bell dropdown (mirrors the user-menu pattern).
  useEffect(() => {
    if (!bellOpen) return undefined;
    function handlePointer(e) {
      if (bellRef.current && bellRef.current.contains(e.target)) return;
      setBellOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setBellOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [bellOpen]);

  function bestInquiryTabFor(term) {
    const visible = INQUIRY_TABS.filter((t) => hasPermission(t.permission));
    if (visible.length === 0) return null;
    const lower = term.toLowerCase();
    const preferred =
      /^(eq|equipment|instrument)/i.test(lower) ? 'instruments'
      : /^(jr|job request|request)/i.test(lower) ? 'job-cards'
      : /vendor|make|manufacturer|supplier/i.test(lower) ? 'vendors'
      : /product|type/i.test(lower) ? 'products'
      : 'instruments';
    return visible.find((t) => t.id === preferred)?.id || visible[0].id;
  }

  // Search submit — route into the first permitted Inquiry tab that best
  // matches the query intent.
  function onSearchSubmit(e) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    const tab = bestInquiryTabFor(term);
    if (!tab) return;
    navigate(`/inquiry?tab=${encodeURIComponent(tab)}&q=${encodeURIComponent(term)}`);
  }

  // ── Close-on-outside-click and close-on-escape ─────────────────────
  // Wired with useEffect so the listeners exist ONLY while the menu is
  // open. Cleaning up on close avoids running the handler 60×/second
  // while the user is doing something unrelated.
  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointer(e) {
      // If the click landed inside the menu wrapper, ignore it — the
      // user clicked a dropdown item or the trigger itself.
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setMenuOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  // ── Logout handler ─────────────────────────────────────────────────
  // Wrapped in useCallback so the function identity is stable across
  // renders (helps if we later memo the dropdown rows).
  //
  // The auth-context.logout() already:
  //   1. POSTs /auth/logout (best-effort; swallowed on failure)
  //   2. Clears the in-memory access + CSRF tokens
  //   3. Sets user = null
  //
  // We follow up by:
  //   4. Closing the dropdown (avoids flash-of-menu after redirect)
  //   5. Navigating to /login with replace:true so the back button
  //      doesn't return to a now-anonymous protected page.
  const handleLogout = useCallback(async () => {
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      // Whether logout's network call succeeded or not, the local state
      // is cleared — push the user to /login regardless.
      navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  return (
    <header
      className="h-16 shrink-0 sticky top-0 z-30 flex items-center gap-4 px-6 bg-white border-b border-slate-200 shadow-sm"
      aria-label="Page header"
    >
      {/* ── Hamburger (sidebar toggle) ──────────────────────────── */}
      {/* The icon stays the same in both states; aria-label changes so
          screen readers announce the right action. */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        aria-controls="primary-sidebar"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60 active:scale-95 transition-all duration-200"
      >
        <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* ── Global search with Dynamic Autocomplete ─────────────── */}
      <form onSubmit={onSearchSubmit} className="flex-1 max-w-2xl mr-auto relative" ref={searchRef}>
        <label htmlFor="topbar-search" className="sr-only">Global search</label>
        <div className="relative group">
          <SearchIcon
            size={15}
            strokeWidth={1.75}
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
          />
          <input
            id="topbar-search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.trim().length >= 2) {
                setSearchOpen(true);
              }
            }}
            onFocus={() => {
              if (q.trim().length >= 2) {
                setSearchOpen(true);
              }
            }}
            type="search"
            placeholder="Search equipment, job requests, vendors..."
            className="w-full h-10 rounded-xl bg-slate-50/50 border border-slate-200/80 pl-10 pr-16 text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 shadow-sm transition-all font-sans"
            autoComplete="off"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 select-none">
            <kbd className="h-5 px-1.5 flex items-center justify-center rounded border border-slate-200/80 bg-white text-[9px] font-bold text-slate-400 shadow-sm font-sans">Ctrl</kbd>
            <kbd className="h-5 px-1.5 flex items-center justify-center rounded border border-slate-200/80 bg-white text-[9px] font-bold text-slate-400 shadow-sm font-sans">K</kbd>
          </div>
        </div>

        {/* Autocomplete Dropdown Panel */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-[420px] overflow-y-auto no-scrollbar bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.15)] z-50 p-3 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
            {searchLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-xs font-semibold font-sans">
                <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching Database...
              </div>
            ) : totalResultsCount === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold font-sans">
                No matching results found for <span className="font-bold text-slate-700">"{q}"</span>
              </div>
            ) : (
              <div className="space-y-3.5 font-sans text-left">
                {/* 1. Job Requests */}
                {searchResults.jobRequests.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 pb-1 text-[9px] font-bold text-sky-600 uppercase tracking-widest flex items-center gap-2 border-b border-sky-100/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-sm shadow-sky-400/50"></span>
                      Job Requests
                    </div>
                    <div className="space-y-0.5">
                      {searchResults.jobRequests.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            navigate(`/job-requests/${encodeURIComponent(item.id)}`);
                            setSearchOpen(false);
                          }}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-100/85 border border-transparent cursor-pointer transition-all duration-150 group/item hover:translate-x-0.5"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-semibold text-slate-800 group-hover/item:text-indigo-600 truncate transition-colors">
                              {item.request_code}
                            </div>
                            <div className="text-[10px] text-slate-400 group-hover/item:text-indigo-900/60 truncate mt-0.5 transition-colors">
                              {item.equipment_name || 'No equipment specified'}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-100/50 leading-none">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Job Cards */}
                {searchResults.jobCards.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 pb-1 text-[9px] font-bold text-violet-600 uppercase tracking-widest flex items-center gap-2 border-b border-violet-100/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-sm shadow-violet-400/50"></span>
                      Job Cards
                    </div>
                    <div className="space-y-0.5">
                      {searchResults.jobCards.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            navigate(`/job-cards/${encodeURIComponent(item.id)}`);
                            setSearchOpen(false);
                          }}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-100/85 border border-transparent cursor-pointer transition-all duration-150 group/item hover:translate-x-0.5"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-semibold text-slate-800 group-hover/item:text-indigo-600 truncate transition-colors">
                              {item.section_job_no || 'Job Card Details'}
                            </div>
                            <div className="text-[10px] text-slate-400 group-hover/item:text-indigo-900/60 truncate mt-0.5 transition-colors">
                              {item.equipment_name || 'No equipment specified'}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-100/50 leading-none">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Equipment */}
                {searchResults.equipment.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 pb-1 text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-100/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50"></span>
                      Equipment Instruments
                    </div>
                    <div className="space-y-0.5">
                      {searchResults.equipment.map((item) => (
                        <div
                          key={item.id || item.equipment_id}
                          onClick={() => {
                            navigate(`/equipment/${encodeURIComponent(item.id || item.equipment_id)}`);
                            setSearchOpen(false);
                          }}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-100/85 border border-transparent cursor-pointer transition-all duration-150 group/item hover:translate-x-0.5"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-semibold text-slate-800 group-hover/item:text-indigo-600 truncate transition-colors">
                              {item.equipment_code || item.equipment_id}
                            </div>
                            <div className="text-[10px] text-slate-400 group-hover/item:text-indigo-900/60 truncate mt-0.5 transition-colors">
                              {item.name || item.equipment_name}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100/50 leading-none">
                            {item.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Vendors */}
                {searchResults.vendors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 pb-1 text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2 border-b border-amber-100/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-400/50"></span>
                      Vendors
                    </div>
                    <div className="space-y-0.5">
                      {searchResults.vendors.map((item) => (
                        <div
                          key={item.vendor_id}
                          onClick={() => {
                            navigate(`/inquiry?tab=vendors&q=${encodeURIComponent(item.vendor_name)}`);
                            setSearchOpen(false);
                          }}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-100/85 border border-transparent cursor-pointer transition-all duration-150 group/item hover:translate-x-0.5"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-semibold text-slate-800 group-hover/item:text-indigo-600 truncate transition-colors">
                              {item.vendor_name}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100/50 leading-none">
                            {item.vendor_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Products */}
                {searchResults.products.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-2 pb-1 text-[9px] font-bold text-cyan-600 uppercase tracking-widest flex items-center gap-2 border-b border-cyan-100/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-sm shadow-cyan-400/50"></span>
                      Products
                    </div>
                    <div className="space-y-0.5">
                      {searchResults.products.map((item) => (
                        <div
                          key={item.product_id}
                          onClick={() => {
                            navigate(`/inquiry?tab=products&q=${encodeURIComponent(item.product_name)}`);
                            setSearchOpen(false);
                          }}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-100/85 border border-transparent cursor-pointer transition-all duration-150 group/item hover:translate-x-0.5"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-semibold text-slate-800 group-hover/item:text-indigo-600 truncate transition-colors">
                              {item.product_name}
                            </div>
                            {item.make && (
                              <div className="text-[10px] text-slate-400 group-hover/item:text-indigo-900/60 truncate mt-0.5 transition-colors">
                                Make: {item.make}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </form>

      {/* ── Right cluster ───────────────────────────────────────── */}
      <div className="ml-auto flex shrink-0 items-center justify-end gap-5">
        {user ? (
          <button
            type="button"
            onClick={() => navigate(guideRouteForRole(user.role))}
            aria-label="Open role guide"
            title="Open role guide"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 active:scale-95"
          >
            <BookOpen size={17} strokeWidth={2.1} aria-hidden="true" />
            <span>Guide</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => navigate('/about')}
          aria-label="About CMCMIS"
          title="About CMCMIS"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:text-sky-700 hover:bg-sky-50/80 active:scale-95 transition-all duration-200"
        >
          <Info size={20} strokeWidth={2.25} aria-hidden="true" />
        </button>

        {/* Phase 12 — live notifications bell. Hidden entirely for users
            without `notifications:read-own` (i.e. View-Only) so the
            UI never offers an action the BE would 403. */}
        {canReadNotifications ? (
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setBellOpen((o) => !o)}
              aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
              aria-haspopup="menu"
              aria-expanded={bellOpen}
              title={unread > 0 ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60 hover:rotate-12 active:scale-95 transition-all duration-200 group/bell"
            >
              <Bell size={18} strokeWidth={1.75} aria-hidden="true" className="group-hover/bell:animate-pulse-radar" />
              {/* Live unread indicator. Show a count badge when ≥ 1; the
                  badge caps visually at "9+" so the layout doesn't shift
                  on a 3-digit count. */}
              {unread > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-600 text-white text-[10.5px] font-extrabold leading-none tabular-nums shadow-md border-2 border-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </button>
            {bellOpen ? (
              <div className="absolute right-0 mt-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <NotificationDropdown onClose={() => setBellOpen(false)} />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── User cluster + dropdown ─────────────────────────── */}
        {user ? (
          // Wrapper holds both the trigger button and the dropdown panel,
          // so the outside-click detector treats clicks on dropdown items
          // as "inside".
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Account menu for ${user.display_name || user.sub}`}
              className={clsxCond(
                'flex items-center gap-3 pl-3 pr-2.5 py-1.5 rounded-xl border transition-all duration-200 shadow-sm',
                menuOpen
                  ? 'bg-indigo-50/50 border-indigo-200/80 text-indigo-900 ring-2 ring-indigo-100/50'
                  : 'bg-slate-50/30 border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-300/80',
              )}
            >
              <div className="text-right leading-none flex flex-col justify-center">
                <div className="text-[13px] font-semibold text-slate-700 truncate max-w-[12rem] tracking-tight">
                  {user.display_name || user.sub}
                </div>
                <div className="mt-1 flex justify-end">
                  <RolePill role={user.role} />
                </div>
              </div>
              <div
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center text-[11px] font-bold shadow-sm shadow-indigo-200/50 hover:brightness-105 transition-all"
                title={user.sub}
              >
                {initialsOf(user.display_name || user.sub)
                  ? (
                      <span>{initialsOf(user.display_name || user.sub)}</span>
                    )
                  : <User size={14} strokeWidth={2} />}
              </div>
              <ChevronDown
                size={13}
                strokeWidth={2}
                className={clsxCond(
                  'text-slate-400 transition-transform duration-300',
                  menuOpen ? 'rotate-180 text-indigo-500' : 'rotate-0',
                )}
              />
            </button>

            {/* ── Dropdown panel ─────────────────────────────── */}
            {/* Conditionally rendered (not just hidden) so off-state has
                zero DOM weight. Positioned absolutely just below the
                trigger; right-aligned so it never overflows the viewport
                on narrow screens. */}
            {menuOpen ? (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(15,23,42,0.15)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* Identity card with wide vertical spacing */}
                <div className="px-6 py-6 bg-gradient-to-b from-slate-50/50 to-indigo-50/10 border-b border-slate-100 flex gap-4 items-center">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center text-[15px] font-bold shadow-md shadow-indigo-100/80 shrink-0">
                    {initialsOf(user.display_name || user.sub)}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <div className="text-[14px] font-bold text-slate-800 leading-snug tracking-tight">
                      {user.display_name || user.sub}
                    </div>
                    {user.email ? (
                      <div className="text-[11px] font-medium text-slate-400 truncate leading-none">
                        {user.email}
                      </div>
                    ) : null}
                    {/* Division / department line — beautifully outlined for readability */}
                    <div className="flex mt-0.5">
                      <span className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-600 leading-none">
                        {user.division_code
                          || user.division
                          || user.designation
                          || roleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action: Logout - more spacious and comfortable */}
                <div className="p-2 bg-white">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3.5 px-4 py-3 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all duration-150 group"
                  >
                    <LogOut size={16} strokeWidth={2} aria-hidden="true" className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

// ── Role pill ──────────────────────────────────────────────────────────
// Coloured chip showing the user's role. Colour conveys hierarchy: red
// for Super Admin (highest authority + sensitive), blue for the working
// roles (In-Charge / Engineer), green for the everyday Normal User,
// grey for the read-only auditor. Matches the reference screenshot
// where Dr. K. Kumar (NORMAL_USER) wears the green "User" badge.
function guideRouteForRole(role) {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin-guide';
    case 'NORMAL_USER':
      return '/user-guide';
    case 'VIEW_ONLY':
      return '/view-only-guide';
    case 'LAB_IN_CHARGE':
    case 'TME_REPAIR_LAB_IN_CHARGE':
    case 'TME_CAL_LAB_IN_CHARGE':
    case 'FPE_REPAIR_LAB_IN_CHARGE':
    case 'FPE_CAL_LAB_IN_CHARGE':
      return '/lab-incharge-guide';
    case 'LAB_ENGINEER':
    case 'TME_REPAIR_LAB_ENG':
    case 'TME_CAL_LAB_ENG':
    case 'FPE_REPAIR_LAB_ENG':
    case 'FPE_CAL_LAB_ENG':
      return '/lab-engineer-guide';
    default:
      return '/about';
  }
}

function RolePill({ role }) {
  const { label, cls } = rolePillStyle(role);
  return (
    <span
      className={clsxCond(
        'inline-flex items-center rounded-md px-1.5 py-0.5 font-medium leading-none',
        cls,
      )}
    >
      {label}
    </span>
  );
}

function rolePillStyle(role) {
  switch (role) {
    case 'SUPER_ADMIN':
      return { label: 'Admin', cls: 'bg-rose-50 border border-rose-200/50 text-rose-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'LAB_IN_CHARGE':
      return { label: 'Lab InC', cls: 'bg-indigo-50 border border-indigo-200/50 text-indigo-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'LAB_ENGINEER':
      return { label: 'Lab Eng', cls: 'bg-indigo-50 border border-indigo-200/50 text-indigo-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'TME_REPAIR_LAB_IN_CHARGE':
      return { label: 'TME R InC', cls: 'bg-violet-50 border border-violet-200/50 text-violet-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'TME_CAL_LAB_IN_CHARGE':
      return { label: 'TME C InC', cls: 'bg-violet-50 border border-violet-200/50 text-violet-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'FPE_REPAIR_LAB_IN_CHARGE':
      return { label: 'FPE R InC', cls: 'bg-sky-50 border border-sky-200/50 text-sky-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'FPE_CAL_LAB_IN_CHARGE':
      return { label: 'FPE C InC', cls: 'bg-sky-50 border border-sky-200/50 text-sky-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'TME_REPAIR_LAB_ENG':
      return { label: 'TME R Eng', cls: 'bg-blue-50 border border-blue-200/50 text-blue-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'TME_CAL_LAB_ENG':
      return { label: 'TME C Eng', cls: 'bg-blue-50 border border-blue-200/50 text-blue-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'FPE_REPAIR_LAB_ENG':
      return { label: 'FPE R Eng', cls: 'bg-cyan-50 border border-cyan-200/50 text-cyan-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'FPE_CAL_LAB_ENG':
      return { label: 'FPE C Eng', cls: 'bg-cyan-50 border border-cyan-200/50 text-cyan-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'NORMAL_USER':
      return { label: 'User', cls: 'bg-emerald-50 border border-emerald-200/50 text-emerald-600 text-[9px] font-bold uppercase tracking-wider' };
    case 'VIEW_ONLY':
      return { label: 'View', cls: 'bg-slate-50 border border-slate-200/50 text-slate-600 text-[9px] font-bold uppercase tracking-wider' };
    default:
      return { label: role || '—', cls: 'bg-slate-50 border border-slate-200/50 text-slate-600 text-[9px] font-bold uppercase tracking-wider' };
  }
}

// Friendly short label for the role pill. Falls back to the raw role code.
// Used inside the dropdown's identity card when no division is set.
function roleLabel(role) {
  return rolePillStyle(role).label;
}

// Tiny clsx-shim so we don't have to import the lib just for two calls.
// Joins string fragments with spaces, skipping falsy values.
function clsxCond(...parts) {
  return parts.filter(Boolean).join(' ');
}
