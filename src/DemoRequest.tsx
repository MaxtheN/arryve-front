/**
 * /demo-request — Google Calendar appointment-scheduling widget.
 *
 * The booking happens inside Google's cross-origin iframe, so we cannot
 * see the actual booking from this page. We fire an on-page *intent*
 * conversion ("scheduler engaged") once per visit: Meta `Schedule` +
 * Google Ads schedule conversion + a Clarity funnel event. Real booked
 * conversions are handled out-of-band (offline email-matched bridge) —
 * see the tracking runbook.
 *
 * Standalone entry — does not import App.tsx (keeps the ad landing page
 * lean). Reuses the global design tokens from index.css.
 */

import { useEffect, useRef } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { captureAttribution } from './attribution';
import { metaTrack } from './meta-pixel';
import { gtagConversion } from './gtag';
import { clarityEvent } from './clarity';
import {
  BOOK_DEMO_URL,
  BOOK_DEMO_EMBED_URL,
  CONTACT_EMAIL,
  MAILTO_CONTACT_URL,
} from './booking';

const BENEFITS = [
  'Live walkthrough on your own call volume',
  'PMS sync demonstrated end-to-end',
  'No commitment, no credit card',
];

export default function DemoRequest() {
  const fired = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function fireEngaged(source: string) {
    if (fired.current) return;
    fired.current = true;
    // Intent signal — the booking itself happens in Google's iframe and
    // is invisible to us. Real bookings are reconciled offline by email.
    try {
      metaTrack('Schedule', { placement: 'demo_request', source });
    } catch {
      /* pixel blocked */
    }
    try {
      gtagConversion('schedule', { source });
    } catch {
      /* gtag blocked */
    }
    try {
      clarityEvent('scheduler_engaged', { source });
    } catch {
      /* clarity offline */
    }
  }

  useEffect(() => {
    // Cheap + harmless: persists utm/fbclid and sets the _fbc cookie so
    // Meta can match the engagement event better.
    captureAttribution();
    if (!BOOK_DEMO_EMBED_URL) return; // fallback button fires via onClick
    // When focus moves into a cross-origin iframe, the parent window
    // blurs and document.activeElement becomes that iframe element —
    // the only reliable "user engaged the scheduler" heuristic.
    function onBlur() {
      window.setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          fireEngaged('iframe_focus');
        }
      }, 0);
    }
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  return (
    <main className="film-grain relative bg-forest-950 text-ivory-50 min-h-[100svh] px-5 sm:px-8 md:px-12 py-10 md:py-14 overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-40" />

      <header className="relative z-[3] max-w-6xl mx-auto w-full mb-10 md:mb-12">
        <a href="/" aria-label="Arryve home">
          <img
            src="/arryve-logo.svg"
            alt="Arryve"
            className="h-6 brightness-0 invert"
          />
        </a>
      </header>

      <div className="relative z-[3] max-w-6xl mx-auto w-full grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-start">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ivory-100/70 mb-8">
            <span className="h-px w-8 bg-ivory-100/50" />
            Book a demo
          </div>
          <h1 className="font-serif text-[40px] md:text-[60px] lg:text-[72px] font-normal tracking-[-0.03em] leading-[0.96] text-ivory-50 text-balance mb-6">
            Book a demo of your{' '}
            <em className="italic font-light">AI front desk</em>.
          </h1>
          <p className="text-base md:text-lg text-ivory-100/80 leading-[1.6] max-w-md text-pretty mb-8">
            30 minutes, on your own numbers. Pick a time below — we'll join
            from {CONTACT_EMAIL} on Google Meet.
          </p>
          <div className="space-y-2.5 text-sm text-ivory-100/75 mb-8">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ivory-100/90 flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
          <p className="text-xs text-ivory-100/45 leading-relaxed">
            Prefer email? Write to{' '}
            <a
              href={MAILTO_CONTACT_URL}
              className="underline underline-offset-2 hover:text-ivory-100/70"
            >
              {CONTACT_EMAIL}
            </a>{' '}
            and we'll coordinate directly.
          </p>
        </div>

        <div className="rounded-3xl bg-ivory-50 p-2 sm:p-3 shadow-2xl shadow-forest-950/40 overflow-hidden">
          {BOOK_DEMO_EMBED_URL ? (
            <iframe
              ref={iframeRef}
              src={BOOK_DEMO_EMBED_URL}
              title="Book a demo — Google Calendar scheduler"
              loading="lazy"
              className="w-full rounded-2xl"
              style={{ height: 'min(78vh, 760px)', minHeight: 560, border: 0 }}
            />
          ) : (
            <div className="rounded-2xl bg-forest-950/[0.03] px-6 py-16 text-center">
              <p className="font-serif text-2xl text-forest-950 mb-2">
                Pick a time
              </p>
              <p className="text-sm text-forest-950/60 max-w-sm mx-auto mb-7">
                Opens our Google Calendar scheduler in a new tab.
              </p>
              <a
                href={BOOK_DEMO_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => fireEngaged('button')}
                className="inline-flex items-center justify-center gap-2 bg-forest-950 text-ivory-50 px-7 py-3.5 rounded-full text-sm font-medium hover:bg-forest-900 transition-colors group"
              >
                Open the scheduler
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
