import { useEffect } from 'react';

const CREDIT_TEXT = 'Crafted By --- Deep (Developer) & Moksh (Designer)';
const FLOATING_MARK = 'data-cmcmis-credit-floating';

function createFloatingCredit() {
  const wrap = document.createElement('div');
  wrap.setAttribute(FLOATING_MARK, '1');
  wrap.setAttribute('aria-label', 'Authorship credit');
  wrap.style.cssText = [
    'position:fixed',
    'right:14px',
    'bottom:14px',
    'z-index:2147483647',
    'pointer-events:none',
    'user-select:none',
  ].join(';');

  const text = document.createElement('div');
  text.textContent = CREDIT_TEXT;
  text.style.cssText = [
    'font:500 12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
    'color:#374151',
    'background:#f8fafc',
    'border:1px solid #e5e7eb',
    'border-radius:9999px',
    'box-shadow:0 1px 3px rgba(15,23,42,0.08)',
    'padding:7px 14px',
    'pointer-events:auto',
  ].join(';');

  wrap.appendChild(text);
  return wrap;
}

function ensureFloatingCredit() {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.querySelector(`[${FLOATING_MARK}]`)) return;
  document.body.appendChild(createFloatingCredit());
}

function startCreditWatchdog() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__cmcmisCreditWatchdog) return;
  window.__cmcmisCreditWatchdog = true;

  const begin = () => {
    ensureFloatingCredit();
    const observer = new MutationObserver(() => ensureFloatingCredit());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin, { once: true });
  } else {
    begin();
  }
}

startCreditWatchdog();

export function MadeWithLove({ size = 'md', className = '' }) {
  useEffect(() => { startCreditWatchdog(); }, []);

  const wrapPad = size === 'sm'
    ? 'py-3'
    : 'py-4 mt-6 pt-5 border-t border-border';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div className={['flex items-center justify-center', wrapPad, className].join(' ')}>
      <div
        data-cmcmis-credit-pill="1"
        role="contentinfo"
        aria-label="Authorship credit"
        title={CREDIT_TEXT}
        className={[
          'inline-flex items-center rounded-full border border-slate-200',
          'bg-slate-50 px-4 py-1.5 font-medium text-slate-700 shadow-sm select-none',
          textSize,
        ].join(' ')}
      >
        {CREDIT_TEXT}
      </div>
    </div>
  );
}

export const AUTHORSHIP = Object.freeze({
  authors: [
    { name: 'deep sorathiya', role: 'developer' },
    { name: 'moksh gandhi', role: 'designer' },
  ],
  integrityOK: true,
});
