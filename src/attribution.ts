/**
 * Ad attribution capture.
 *
 * captureAttribution() runs once on landing: it snapshots the utm
 * params, fbclid and gclid from the URL into sessionStorage (first-touch
 * wins across in-session navigations) and, if Meta's _fbc cookie isn't
 * set yet, derives it from fbclid in Meta's documented
 * fb.1.<unixSec>.<fbclid> format so the Conversions API gets a click id
 * even before fbevents.js loads.
 *
 * getAttribution() returns the merged values plus the _fbp / _fbc
 * cookies, for the lead payload + CAPI custom_data.
 */

const KEY = 'arryve_attr';

const URL_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
] as const;

type UrlField = (typeof URL_FIELDS)[number];

export type Attribution = Partial<Record<UrlField, string>> & {
  referrer_host?: string;
  fbp?: string;
  fbc?: string;
};

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'),
  );
  return m ? decodeURIComponent(m[1]) : undefined;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  // Host-only, SameSite=Lax — same origin as the pixel/form, no subdomain
  // sharing needed. Secure on https (prod is always https).
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${exp}; SameSite=Lax${secure}`;
}

/** Idempotent-ish: only fills missing fields, never overwrites first touch. */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    let stored: Record<string, string> = {};
    try {
      stored = JSON.parse(sessionStorage.getItem(KEY) || '{}') as Record<
        string,
        string
      >;
    } catch {
      stored = {};
    }
    let changed = false;
    for (const f of URL_FIELDS) {
      const v = params.get(f);
      if (v && !stored[f]) {
        stored[f] = v;
        changed = true;
      }
    }
    if (!stored.referrer_host && document.referrer) {
      try {
        stored.referrer_host = new URL(document.referrer).hostname;
        changed = true;
      } catch {
        /* malformed referrer */
      }
    }
    if (changed) sessionStorage.setItem(KEY, JSON.stringify(stored));

    // Derive _fbc from fbclid if the Pixel hasn't set it yet.
    const fbclid = params.get('fbclid');
    if (fbclid && !readCookie('_fbc')) {
      setCookie('_fbc', `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`, 90);
    }
  } catch {
    /* sessionStorage disabled / privacy mode — degrade silently */
  }
}

export function getAttribution(): Attribution {
  const out: Attribution = {};
  if (typeof window === 'undefined') return out;
  try {
    const stored = JSON.parse(
      sessionStorage.getItem(KEY) || '{}',
    ) as Record<string, string>;
    Object.assign(out, stored);
  } catch {
    /* ignore */
  }
  const fbp = readCookie('_fbp');
  if (fbp) out.fbp = fbp;
  const fbc = readCookie('_fbc');
  if (fbc) out.fbc = fbc;
  return out;
}
