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
  ChevronDown,
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
      className="h-14 shrink-0 sticky top-0 z-10 flex items-center gap-4 px-6 bg-white border-b border-border"
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-base-elev hover:text-ink transition-colors"
      >
        <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* ── Global search with Dynamic Autocomplete ─────────────── */}
      <form onSubmit={onSearchSubmit} className="flex-1 max-w-3xl mr-auto relative" ref={searchRef}>
        <label htmlFor="topbar-search" className="sr-only">Global search</label>
        <div className="relative">
          <SearchIcon
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
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
            placeholder="Search equipment, job requests, vendors…"
            className="w-full h-10 rounded-md bg-base border border-border pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            autoComplete="off"
          />
        </div>

        {/* Autocomplete Dropdown Panel */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 max-h-[420px] overflow-y-auto no-scrollbar bg-white border border-slate-100 rounded-xl shadow-2xl z-50 p-2 space-y-3">
            {searchLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-ink-soft text-xs font-medium font-sans">
                <svg className="animate-spin h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching Database...
              </div>
            ) : totalResultsCount === 0 ? (
              <div className="text-center py-6 text-ink-soft/80 text-xs font-medium font-sans">
                No matching results found for <span className="font-bold text-ink">"{q}"</span>
              </div>
            ) : (
              <div className="space-y-3 font-sans text-left">
                {/* 1. Job Requests */}
                {searchResults.jobRequests.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
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
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100/50 cursor-pointer transition"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-bold text-ink truncate">
                              {item.request_code}
                            </div>
                            <div className="text-[10px] text-ink-soft truncate mt-0.5">
                              {item.equipment_name || 'No equipment specified'}
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 leading-none">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Job Cards */}
                {searchResults.jobCards.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
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
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100/50 cursor-pointer transition"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-bold text-ink truncate">
                              {item.section_job_no || 'Job Card Details'}
                            </div>
                            <div className="text-[10px] text-ink-soft truncate mt-0.5">
                              {item.equipment_name || 'No equipment specified'}
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 leading-none">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Equipment */}
                {searchResults.equipment.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
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
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100/50 cursor-pointer transition"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-bold text-ink truncate">
                              {item.equipment_code || item.equipment_id}
                            </div>
                            <div className="text-[10px] text-ink-soft truncate mt-0.5">
                              {item.name || item.equipment_name}
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 leading-none">
                            {item.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Vendors */}
                {searchResults.vendors.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
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
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100/50 cursor-pointer transition"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-bold text-ink truncate">
                              {item.vendor_name}
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 leading-none">
                            {item.vendor_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Products */}
                {searchResults.products.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
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
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100/50 cursor-pointer transition"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="text-xs font-bold text-ink truncate">
                              {item.product_name}
                            </div>
                            {item.make && (
                              <div className="text-[10px] text-ink-soft truncate mt-0.5">
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
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-base-elev hover:text-ink transition-colors"
            >
              <Bell size={18} strokeWidth={1.5} aria-hidden="true" />
              {/* Live unread indicator. Show a count badge when ≥ 1; the
                  badge caps visually at "9+" so the layout doesn't shift
                  on a 3-digit count. */}
              {unread > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-danger text-white text-[10px] font-semibold leading-none tabular-nums">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </button>
            {bellOpen ? (
              <div className="absolute right-0 mt-2 z-20">
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
                'flex items-center gap-3 pl-2 pr-0 py-1 rounded-md transition-colors',
                menuOpen
                  ? 'bg-base-elev'
                  : 'hover:bg-base-elev',
              )}
            >
              <div className="text-right leading-tight">
                <div className="text-sm font-medium text-ink truncate max-w-[12rem]">
                  {user.display_name || user.sub}
                </div>
                <div className="mt-0.5">
                  <RolePill role={user.role} />
                </div>
              </div>
              <div
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold"
                title={user.sub}
              >
                {initialsOf(user.display_name || user.sub)
                  ? (
                      <span>{initialsOf(user.display_name || user.sub)}</span>
                    )
                  : <User size={16} strokeWidth={1.5} />}
              </div>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                className={clsxCond(
                  'text-ink-soft transition-transform',
                  menuOpen ? 'rotate-180' : 'rotate-0',
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
                className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-white shadow-card z-20 overflow-hidden"
              >
                {/* Identity card */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-sm font-semibold text-ink truncate">
                    {user.display_name || user.sub}
                  </div>
                  {user.email ? (
                    <div className="mt-0.5 text-xs text-ink-soft truncate">
                      {user.email}
                    </div>
                  ) : null}
                  {/* Division / department line — falls back to the role
                      code if no division is known, so the slot always has
                      content (avoids a tighter card just for SA users). */}
                  <div className="mt-1.5 text-[11px] uppercase tracking-wider text-ink-soft">
                    {user.division_code
                      || user.division
                      || user.designation
                      || roleLabel(user.role)}
                  </div>
                </div>

                {/* Action: Logout (red, full-width, icon on the left) */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>Logout</span>
                </button>
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
function RolePill({ role }) {
  const { label, cls } = rolePillStyle(role);
  return (
    <span
      className={clsxCond(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
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
      return { label: 'Admin', cls: 'bg-danger/10 text-danger' };
    case 'LAB_IN_CHARGE':
      return { label: 'Lab InC', cls: 'bg-accent/10 text-accent' };
    case 'LAB_ENGINEER':
      return { label: 'Lab Eng', cls: 'bg-accent/10 text-accent' };
    case 'TME_REPAIR_LAB_IN_CHARGE':
      return { label: 'TME R InC', cls: 'bg-violet-100 text-violet-700' };
    case 'TME_CAL_LAB_IN_CHARGE':
      return { label: 'TME C InC', cls: 'bg-violet-100 text-violet-700' };
    case 'FPE_REPAIR_LAB_IN_CHARGE':
      return { label: 'FPE R InC', cls: 'bg-sky-100 text-sky-700' };
    case 'FPE_CAL_LAB_IN_CHARGE':
      return { label: 'FPE C InC', cls: 'bg-sky-100 text-sky-700' };
    case 'TME_REPAIR_LAB_ENG':
      return { label: 'TME R Eng', cls: 'bg-blue-100 text-blue-700' };
    case 'TME_CAL_LAB_ENG':
      return { label: 'TME C Eng', cls: 'bg-blue-100 text-blue-700' };
    case 'FPE_REPAIR_LAB_ENG':
      return { label: 'FPE R Eng', cls: 'bg-cyan-100 text-cyan-700' };
    case 'FPE_CAL_LAB_ENG':
      return { label: 'FPE C Eng', cls: 'bg-cyan-100 text-cyan-700' };
    case 'NORMAL_USER':
      // Tailwind built-in green — sidesteps any custom-palette assumption
      // and matches the reference image's "User" badge.
      return { label: 'User', cls: 'bg-green-100 text-green-700' };
    case 'VIEW_ONLY':
      return { label: 'View', cls: 'bg-gray-100 text-gray-700' };
    default:
      return { label: role || '—', cls: 'bg-gray-100 text-gray-700' };
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
