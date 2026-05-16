/**
 * /thank-you — post-capture confirmation.
 *
 * The lead is already stored + the Lead conversion fired (on
 * /demo-request). This page confirms and offers the Google Calendar
 * scheduler so they can lock a time now. The "Pick a time" click logs a
 * `book_demo` CTA which demo-log mirrors to Meta `Schedule` + the Google
 * Ads schedule conversion.
 *
 * Standalone entry — does not import App.tsx.
 */

import { ArrowRight, Check } from 'lucide-react';
import { logCtaClick } from './demo-log';
import { BOOK_DEMO_URL, CONTACT_EMAIL, MAILTO_CONTACT_URL } from './booking';

export default function ThankYou() {
  return (
    <main className="film-grain relative bg-forest-950 text-ivory-50 min-h-[100svh] px-5 sm:px-8 md:px-12 py-10 md:py-14 overflow-hidden flex flex-col">
      <div className="warm-wash absolute inset-0 z-[1] opacity-40" />

      <header className="relative z-[3] max-w-6xl mx-auto w-full mb-auto">
        <a href="/" aria-label="Arryve home">
          <img
            src="/arryve-logo.svg"
            alt="Arryve"
            className="h-6 brightness-0 invert"
          />
        </a>
      </header>

      <div className="relative z-[3] max-w-2xl mx-auto w-full text-center py-10">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-ivory-50/10 border border-ivory-50/15 mb-8">
          <Check className="w-7 h-7 text-ivory-50" />
        </div>
        <h1 className="font-serif text-[40px] md:text-[64px] font-normal tracking-[-0.03em] leading-[0.98] text-ivory-50 text-balance mb-5">
          Request received.
        </h1>
        <p className="text-base md:text-lg text-ivory-100/80 leading-[1.6] max-w-md mx-auto text-pretty mb-10">
          We'll reach out shortly to confirm. Want to lock a time right now?
          Pick a slot and we'll join from {CONTACT_EMAIL}.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={BOOK_DEMO_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              logCtaClick('book_demo', { placement: 'thank_you' })
            }
            className="bg-ivory-50 text-forest-950 px-7 py-3.5 rounded-full text-sm font-medium hover:bg-white transition-colors inline-flex items-center justify-center gap-2 group"
          >
            Pick a time
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href={MAILTO_CONTACT_URL}
            onClick={() =>
              logCtaClick('email_contact', { placement: 'thank_you' })
            }
            className="rounded-full border border-ivory-50/15 bg-ivory-50/[0.02] px-7 py-3.5 text-sm text-ivory-50/85 hover:bg-ivory-50/[0.06] hover:text-white transition-colors inline-flex items-center justify-center"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <footer className="relative z-[3] max-w-6xl mx-auto w-full mt-auto pt-10 text-xs text-ivory-100/45">
        © {new Date().getFullYear()} Arryve. A better arrival starts with the
        first call.
      </footer>
    </main>
  );
}
