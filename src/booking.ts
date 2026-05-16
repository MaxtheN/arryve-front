/**
 * Shared booking / contact constants — single source of truth.
 *
 * The public "Book a demo" CTAs on the landing page and pitch decks point
 * at the on-domain {@link DEMO_REQUEST_PATH} lead page so Meta/Google can
 * attribute the conversion and we capture the lead. The raw Google Calendar
 * scheduler ({@link BOOK_DEMO_URL}) is only used on /thank-you, *after* the
 * lead has been recorded.
 *
 * Previously these were duplicated in App.tsx and PitchDeckSales.tsx.
 */

export const CONTACT_EMAIL = 'contact@tryarryve.com';

export const MAILTO_CONTACT_URL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'Arryve demo',
)}`;

/** On-domain lead page every public "Book a demo" CTA navigates to. */
export const DEMO_REQUEST_PATH = '/demo-request';

const DEFAULT_BOOK_DEMO_URL = 'https://calendar.app.google/eo9uCycR6vUZLAau8';

/**
 * Google Calendar appointment scheduler. Override via VITE_BOOK_DEMO_URL.
 * Only consumed by /thank-you (post-capture) — never linked directly from
 * a public CTA anymore.
 */
export const BOOK_DEMO_URL =
  import.meta.env.VITE_BOOK_DEMO_URL || DEFAULT_BOOK_DEMO_URL;
