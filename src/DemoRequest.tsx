/**
 * /demo-request — the on-domain lead page Meta/Google ads point at.
 *
 * Captures the lead into Postgres (via /api/demo-request) BEFORE any
 * calendar handoff, fires the Meta Pixel `Lead` + Google Ads conversion
 * with the server-shared event_id, then sends the visitor to /thank-you.
 *
 * Standalone entry — intentionally does NOT import App.tsx (keeps the ad
 * landing page lean + fast). Reuses the global design tokens from
 * index.css (forest/ivory palette, film-grain, Fraunces serif).
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { captureAttribution, getAttribution } from './attribution';
import { metaTrack } from './meta-pixel';
import { gtagConversion } from './gtag';
import { CONTACT_EMAIL, MAILTO_CONTACT_URL } from './booking';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const BENEFITS = [
  'Live walkthrough on your own call volume',
  'PMS sync demonstrated end-to-end',
  'No commitment, no credit card',
];

type Status = 'idle' | 'submitting' | 'error';

export default function DemoRequest() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const eventIdRef = useRef<string>('');

  useEffect(() => {
    captureAttribution();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    const form = e.currentTarget;
    const fd = new FormData(form);

    // Generate the dedup id once per submit; reuse on retry.
    if (!eventIdRef.current) eventIdRef.current = uuid();
    const eventId = eventIdRef.current;

    const payload = {
      event_id: eventId,
      hotelName: String(fd.get('hotelName') ?? ''),
      contactName: String(fd.get('contactName') ?? ''),
      workEmail: String(fd.get('workEmail') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      preferredTime: String(fd.get('preferredTime') ?? ''),
      rooms: String(fd.get('rooms') ?? ''),
      pms: String(fd.get('pms') ?? ''),
      honeypot: String(fd.get('company_website') ?? ''),
      attribution: getAttribution(),
    };

    setStatus('submitting');
    setErrorMsg('');
    try {
      const r = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setStatus('error');
        setErrorMsg(
          j.error
            ? `${j.error}. You can also email ${CONTACT_EMAIL}.`
            : `Something went wrong. Please email ${CONTACT_EMAIL} and we'll set it up.`,
        );
        return;
      }
      const j = (await r.json()) as { event_id?: string };
      const finalId = j.event_id || eventId;
      // Browser-side conversion, deduplicated with the server CAPI event.
      metaTrack('Lead', { content_name: 'demo_request' }, finalId);
      gtagConversion('lead');
      window.location.assign(`/thank-you?eid=${encodeURIComponent(finalId)}`);
    } catch {
      setStatus('error');
      setErrorMsg(
        `We couldn't reach our server. Please email ${CONTACT_EMAIL} and we'll set it up.`,
      );
    }
  }

  const submitting = status === 'submitting';

  return (
    <main className="film-grain relative bg-forest-950 text-ivory-50 min-h-[100svh] px-5 sm:px-8 md:px-12 py-10 md:py-14 overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-40" />

      <header className="relative z-[3] max-w-6xl mx-auto w-full mb-10 md:mb-14">
        <a href="/" aria-label="Arryve home">
          <img
            src="/arryve-logo.svg"
            alt="Arryve"
            className="h-6 brightness-0 invert"
          />
        </a>
      </header>

      <div className="relative z-[3] max-w-6xl mx-auto w-full grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-20 items-start">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ivory-100/70 mb-8">
            <span className="h-px w-8 bg-ivory-100/50" />
            Book a demo
          </div>
          <h1 className="font-serif text-[44px] md:text-[68px] lg:text-[80px] font-normal tracking-[-0.03em] leading-[0.96] text-ivory-50 text-balance mb-6">
            Book a demo of your <em className="italic font-light">AI front desk</em>.
          </h1>
          <p className="text-base md:text-lg text-ivory-100/80 leading-[1.6] max-w-md text-pretty mb-8">
            30 minutes, on your own numbers. See Arvy answer real guest calls,
            capture bookings, and sync your PMS — then decide.
          </p>
          <div className="space-y-2.5 text-sm text-ivory-100/75">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ivory-100/90 flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-ivory-50/[0.04] backdrop-blur-sm border border-ivory-50/10 p-6 md:p-8">
          <form onSubmit={onSubmit} noValidate>
            <div className="space-y-4">
              <Field
                label="Hotel name"
                name="hotelName"
                autoComplete="organization"
                required
              />
              <Field
                label="Your name"
                name="contactName"
                autoComplete="name"
                required
              />
              <Field
                label="Work email"
                name="workEmail"
                type="email"
                autoComplete="email"
                required
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Rooms" name="rooms" type="number" />
                <Field label="PMS (optional)" name="pms" />
              </div>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-[0.18em] text-ivory-100/55 font-medium mb-2">
                  Best time to reach you
                </span>
                <select
                  name="preferredTime"
                  defaultValue="Mornings"
                  className="w-full rounded-2xl bg-forest-950/40 border border-ivory-50/15 px-4 py-3 text-sm text-ivory-50 outline-none focus:border-ivory-50/40 transition-colors"
                >
                  <option>Mornings</option>
                  <option>Afternoons</option>
                  <option>Evenings</option>
                  <option>Any time</option>
                </select>
              </label>

              {/* Honeypot — hidden from humans; bots fill it. */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                }}
              >
                <label>
                  Company website
                  <input
                    type="text"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              {status === 'error' && (
                <p
                  role="alert"
                  className="text-sm text-amber-200/90 leading-relaxed"
                >
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-ivory-50 text-forest-950 py-3.5 rounded-full text-sm font-medium hover:bg-white transition-colors inline-flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Request my demo'}
                {!submitting && (
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
              <p className="text-xs text-ivory-100/45 leading-relaxed text-center">
                Prefer email? Write to{' '}
                <a
                  href={MAILTO_CONTACT_URL}
                  className="underline underline-offset-2 hover:text-ivory-100/70"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.18em] text-ivory-100/55 font-medium mb-2">
        {label}
        {required && <span className="text-ivory-100/30"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        min={type === 'number' ? 0 : undefined}
        className="w-full rounded-2xl bg-forest-950/40 border border-ivory-50/15 px-4 py-3 text-sm text-ivory-50 placeholder-ivory-100/30 outline-none focus:border-ivory-50/40 transition-colors"
      />
    </label>
  );
}
