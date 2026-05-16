/**
 * Google tag (gtag.js) facade — Google Ads conversions + optional GA4.
 * Typed, env-gated, mirrors ./clarity and ./meta-pixel.
 *
 * No tag lives in the entry HTML. `gtagInit()` is a no-op unless
 * `VITE_GOOGLE_ADS_ID` (e.g. AW-18164301008) or `VITE_GA_MEASUREMENT_ID`
 * is set; only then is gtag/js injected — so with envs unset there is
 * ZERO network call to Google and no global side effect.
 *
 * The Google *tag* (config) only powers remarketing + page views. A
 * counted Ads conversion needs a conversion *label* per action
 * (`VITE_GOOGLE_ADS_LEAD_LABEL` / `VITE_GOOGLE_ADS_SCHEDULE_LABEL`),
 * fired as `gtag('event','conversion',{send_to:'<AW-ID>/<label>'})`.
 * Until the labels exist, `gtagConversion()` degrades to the GA4 event
 * only (or nothing) — never throws.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

type ConversionKind = 'lead' | 'schedule';

const CONVERSION_LABELS: Record<ConversionKind, string | undefined> = {
  lead: import.meta.env.VITE_GOOGLE_ADS_LEAD_LABEL as string | undefined,
  schedule: import.meta.env.VITE_GOOGLE_ADS_SCHEDULE_LABEL as string | undefined,
};

// GA4 semantic mirror — also importable into Google Ads as a conversion.
const GA4_EVENT: Record<ConversionKind, string> = {
  lead: 'generate_lead',
  schedule: 'schedule',
};

let initialized = false;

/** Idempotent. No-op (nothing injected) when both Google envs are unset. */
export function gtagInit(): void {
  if (initialized || typeof window === 'undefined') return;
  if (!ADS_ID && !GA_ID) return;
  initialized = true;
  const loaderId = ADS_ID || (GA_ID as string);
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  }
  window.gtag = window.gtag || (gtag as (...args: unknown[]) => void);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loaderId)}`;
  document.head.appendChild(s);
  try {
    window.gtag('js', new Date());
    if (ADS_ID) window.gtag('config', ADS_ID);
    if (GA_ID) window.gtag('config', GA_ID);
  } catch {
    /* blocked */
  }
}

function safe(): Window['gtag'] | null {
  if (typeof window === 'undefined') return null;
  return window.gtag ?? null;
}

/** Generic GA4 / Ads event. */
export function gtagEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  const fn = safe();
  if (!fn) return;
  try {
    fn('event', name, params ?? {});
  } catch {
    /* ignore */
  }
}

/**
 * Fire a Google Ads conversion + its GA4 semantic mirror.
 * - Ads conversion only fires if VITE_GOOGLE_ADS_ID *and* the matching
 *   label are set (label is created in the Ads → Conversions UI).
 * - GA4 event fires whenever VITE_GA_MEASUREMENT_ID is set.
 */
export function gtagConversion(
  kind: ConversionKind,
  params?: Record<string, unknown>,
): void {
  const fn = safe();
  if (!fn) return;
  try {
    const label = CONVERSION_LABELS[kind];
    if (ADS_ID && label) {
      fn('event', 'conversion', {
        send_to: `${ADS_ID}/${label}`,
        ...params,
      });
    }
    if (GA_ID) fn('event', GA4_EVENT[kind], params ?? {});
  } catch {
    /* ignore */
  }
}
