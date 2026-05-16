/**
 * Meta Pixel facade — typed, env-gated, mirrors ./clarity.
 *
 * No pixel code lives in the entry HTML. `metaInit()` is a no-op unless
 * `VITE_META_PIXEL_ID` is set; only then does it inject fbevents.js — so
 * with the env unset there is ZERO network call to Facebook and no global
 * side effect (safe to ship before credentials exist).
 *
 * Browser↔server deduplication: pass the same `eventID` to `metaTrack()`
 * that the server sends to the Conversions API (api/_meta-capi.ts) as
 * `event_id`. Meta collapses the duplicate browser/server pair.
 *
 * Never call `window.fbq` directly — use this facade everywhere.
 */

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

/** Standard Meta events we use (typed so callers can't fat-finger one). */
export type MetaStandardEvent =
  | 'Lead'
  | 'Schedule'
  | 'InitiateCheckout'
  | 'Contact'
  | 'CompleteRegistration';

let initialized = false;

/** Idempotent. No-op (nothing injected) when VITE_META_PIXEL_ID is unset. */
export function metaInit(): void {
  if (initialized || typeof window === 'undefined' || !PIXEL_ID) return;
  initialized = true;
  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      n.callMethod
        ? n.callMethod.apply(n, args)
        : n.queue.push(args);
    } as Fbq;
    n.queue = [];
    n.loaded = true;
    n.version = '2.0';
    window.fbq = n;
    window._fbq = window._fbq || n;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  }
  try {
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  } catch {
    /* pixel blocked */
  }
}

function safe(): Fbq | null {
  if (typeof window === 'undefined') return null;
  return window.fbq ?? null;
}

/**
 * Fire a standard Meta event. Pass `eventID` for events that are also
 * sent server-side (Lead) so Meta deduplicates the pair.
 */
export function metaTrack(
  event: MetaStandardEvent,
  params?: Record<string, unknown>,
  eventID?: string,
): void {
  const q = safe();
  if (!q) return;
  try {
    if (eventID) q('track', event, params ?? {}, { eventID });
    else q('track', event, params ?? {});
  } catch {
    /* ignore */
  }
}

/** Fire a custom (non-standard) Meta event, e.g. ArvyDemoStart. */
export function metaTrackCustom(
  event: string,
  params?: Record<string, unknown>,
): void {
  const q = safe();
  if (!q) return;
  try {
    q('trackCustom', event, params ?? {});
  } catch {
    /* ignore */
  }
}
