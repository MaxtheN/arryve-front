/**
 * Microsoft Clarity custom-event wrapper.
 *
 * The Clarity tag lives in the entry HTML files (index.html and the four
 * pitch variants). It exposes a global `window.clarity(...)` shim that
 * accepts queued calls before the SDK loads. This module is the typed
 * facade we use everywhere — never call `window.clarity` directly.
 *
 * Three primitives:
 *
 *   clarityEvent(name, [props])      → fires a named event Clarity uses
 *                                       to filter recordings + build
 *                                       funnels. Use snake_case names.
 *   claritySet(key, value)           → tags the current session with a
 *                                       dimension (language, variant,
 *                                       outcome). Stays for the whole
 *                                       session and shows up as a filter
 *                                       in Clarity's UI.
 *   clarityUpgrade(reason)           → bumps a session into Clarity's
 *                                       "interesting" tier so it's
 *                                       guaranteed to be retained even
 *                                       if traffic exceeds free-tier
 *                                       sampling. Use sparingly — only
 *                                       on high-signal moments
 *                                       (demo started, CTA clicked).
 *
 * All three are no-ops on SSR / when Clarity hasn't loaded yet (early
 * pageviews, ad-blockers).
 */

declare global {
  interface Window {
    clarity?: (
      action: 'event' | 'set' | 'identify' | 'upgrade' | 'consent',
      ...args: unknown[]
    ) => void;
  }
}

type Primitive = string | number | boolean | null | undefined;

function safe(): Window['clarity'] | null {
  if (typeof window === 'undefined') return null;
  return window.clarity ?? null;
}

export function clarityEvent(
  name: string,
  props?: Record<string, Primitive>
): void {
  const c = safe();
  if (!c) return;
  try {
    c('event', name);
    if (props) {
      // Clarity accepts dimensions via `set`; attach each prop so the
      // event is filterable by those dimensions in the Insights tab.
      for (const [k, v] of Object.entries(props)) {
        if (v == null) continue;
        c('set', k, String(v));
      }
    }
  } catch {
    /* clarity offline or blocked */
  }
}

export function claritySet(key: string, value: Primitive): void {
  const c = safe();
  if (!c || value == null) return;
  try {
    c('set', key, String(value));
  } catch {
    /* ignore */
  }
}

export function clarityUpgrade(reason: string): void {
  const c = safe();
  if (!c) return;
  try {
    c('upgrade', reason);
  } catch {
    /* ignore */
  }
}

/** Best-effort language hint based on <html lang> / browser preference. */
export function detectLanguage(): string {
  if (typeof document === 'undefined') return 'unknown';
  const fromHtml = document.documentElement?.lang?.trim().toLowerCase();
  if (fromHtml) return fromHtml;
  const fromNav = (typeof navigator !== 'undefined' && navigator.language) || '';
  return fromNav.toLowerCase().split('-')[0] || 'unknown';
}

/** Which entry HTML the visitor landed on (index, pitchsales, pitchru, …). */
export function detectVariant(): string {
  if (typeof location === 'undefined') return 'unknown';
  const path = location.pathname.toLowerCase();
  if (path === '/' || path === '/index.html') return 'landing';
  if (path.endsWith('pitchsales.html')) return 'pitch_sales';
  if (path.endsWith('pitchru.html')) return 'pitch_ru';
  if (path.endsWith('pitchuz.html')) return 'pitch_uz';
  if (path.endsWith('pitch.html')) return 'pitch_seed';
  return 'other';
}

/**
 * Tag the session once on first interaction. Idempotent.
 */
let initialized = false;
export function clarityInit(): void {
  if (initialized) return;
  initialized = true;
  claritySet('arryve_variant', detectVariant());
  claritySet('arryve_language', detectLanguage());
  if (typeof document !== 'undefined' && document.referrer) {
    try {
      claritySet('arryve_referrer_host', new URL(document.referrer).hostname);
    } catch {
      /* malformed referrer */
    }
  }
}
