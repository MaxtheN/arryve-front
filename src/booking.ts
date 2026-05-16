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
 * Google Calendar appointment scheduler short link. Override via
 * VITE_BOOK_DEMO_URL. Used as the new-tab fallback on /demo-request when
 * no embeddable URL is configured, and by /thank-you.
 */
export const BOOK_DEMO_URL =
  import.meta.env.VITE_BOOK_DEMO_URL || DEFAULT_BOOK_DEMO_URL;

/**
 * Embeddable Google Calendar appointment-scheduling URL for the
 * /demo-request <iframe>. Get it from Google Calendar → the appointment
 * schedule → Share → "Embed" → copy the iframe `src` (looks like
 * https://calendar.google.com/calendar/appointments/schedules/XXXX?gv=true).
 * The short calendar.app.google link usually can't be iframed.
 * When empty, /demo-request shows a button to BOOK_DEMO_URL instead.
 */
export const BOOK_DEMO_EMBED_URL =
  (import.meta.env.VITE_BOOK_DEMO_EMBED_URL as string | undefined) || '';
