import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Sparkles,
} from 'lucide-react';

/* ─── Design tokens (match landing page) ───────────────────────────────
   forest-950  #03241E  — dark bg / headlines on light
   forest-900  #073A2F  — accent dark
   ivory-50    #FDFBF7  — light bg primary
   ivory-100   #F7F3EC  — light bg secondary
   ivory-200   #EDE7DC  — hairlines / dividers
   ivory-700   #554E43  — body text on light
   Fonts: Fraunces (serif display), Inter (sans body)
────────────────────────────────────────────────────────────────────── */

const TOTAL = 15;

export default function PitchDeck() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, TOTAL - 1)), []);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Home') {
        setCurrent(0);
      } else if (e.key === 'End') {
        setCurrent(TOTAL - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const slides = [
    <Slide01Title />,
    <Slide02Problem />,
    <Slide03WhyNow />,
    <Slide04Solution />,
    <Slide05HowItWorks />,
    <Slide06Founder />,
    <Slide07Market />,
    <Slide08GoToMarket />,
    <Slide09BusinessModel />,
    <Slide10Competition />,
    <Slide11Traction />,
    <Slide12Team />,
    <Slide13Roadmap />,
    <Slide14Exit />,
    <Slide15Ask />,
  ];

  return (
    <div className="relative h-screen w-screen font-sans antialiased text-forest-950 bg-ivory-50 overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={i}
          className="deck-slide absolute inset-0"
          style={{
            opacity: i === current ? 1 : 0,
            pointerEvents: i === current ? 'auto' : 'none',
            transition: 'opacity 280ms ease',
          }}
          aria-hidden={i !== current}
        >
          {slide}
        </div>
      ))}

      <DeckChrome current={current} total={TOTAL} onJump={setCurrent} onPrev={prev} onNext={next} />
    </div>
  );
}

/* ─── Navigation chrome ─────────────────────────────────────────────── */

function DeckChrome({
  current,
  total,
  onJump,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  onJump: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        disabled={current === 0}
        className="deck-chrome fixed left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-forest-950/10 hover:bg-forest-950/20 disabled:opacity-0 disabled:pointer-events-none transition backdrop-blur-sm"
        aria-label="Previous slide"
      >
        <ArrowLeft className="w-4 h-4 text-forest-950" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={current === total - 1}
        className="deck-chrome fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-forest-950/10 hover:bg-forest-950/20 disabled:opacity-0 disabled:pointer-events-none transition backdrop-blur-sm"
        aria-label="Next slide"
      >
        <ArrowRight className="w-4 h-4 text-forest-950" />
      </button>

      <div className="deck-chrome fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-ivory-50/90 backdrop-blur-md border border-forest-950/10 rounded-full px-4 py-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium tabular-nums">
          {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <span className="w-px h-4 bg-forest-950/15" />
        <div className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onJump(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-5 bg-forest-900' : 'w-1.5 bg-forest-950/25 hover:bg-forest-950/45'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── Shared primitives ─────────────────────────────────────────────── */

function Slide({
  tone = 'light',
  children,
  padding = 'default',
}: {
  tone?: 'light' | 'dark' | 'warm' | 'white';
  children: React.ReactNode;
  padding?: 'default' | 'tight';
}) {
  const bg = {
    light: 'bg-ivory-50 text-forest-950',
    dark: 'bg-forest-950 text-ivory-50',
    warm: 'bg-ivory-100 text-forest-950',
    white: 'bg-white text-forest-950',
  }[tone];

  const pad = padding === 'tight' ? 'px-8 md:px-14 py-10' : 'px-12 md:px-20 py-14 md:py-16';

  return (
    <section className={`${bg} h-full w-full flex items-center overflow-hidden`}>
      <div className={`max-w-7xl mx-auto w-full ${pad}`}>{children}</div>
    </section>
  );
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  const color = dark ? 'text-ivory-100/70' : 'text-forest-950/60';
  const line = dark ? 'bg-ivory-100/50' : 'bg-forest-950/40';
  return (
    <div className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-medium ${color} mb-8`}>
      <span className={`h-px w-8 ${line}`} />
      {children}
    </div>
  );
}

function SlideNumber({ n, dark = false }: { n: number; dark?: boolean }) {
  const color = dark ? 'text-ivory-100/45' : 'text-forest-950/35';
  return (
    <div className={`absolute top-8 right-10 text-[10px] uppercase tracking-[0.28em] ${color} font-mono tabular-nums`}>
      {String(n).padStart(2, '0')}
    </div>
  );
}

function FillIn({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded bg-acid-400/30 text-forest-950 border border-acid-500/40 text-[0.95em] font-medium">
      [{children}]
    </span>
  );
}

/* Subtle yellow "highlighter" underlay — use sparingly for one key phrase per slide. */
function Highlight({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  const bg = dark ? 'rgba(242, 198, 44, 0.35)' : 'rgba(242, 198, 44, 0.45)';
  return (
    <span
      className="px-0.5"
      style={{
        backgroundImage: `linear-gradient(to bottom, transparent 58%, ${bg} 58%)`,
      }}
    >
      {children}
    </span>
  );
}

/* Brand logo — uses Clearbit's public logo API with graceful wordmark fallback
   so the deck still reads correctly if a domain is unresolved or offline. */
function BrandLogo({
  domain,
  name,
  size = 'md',
  tone = 'auto',
}: {
  domain?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'auto' | 'dark' | 'light';
}) {
  const [failed, setFailed] = useState(!domain);

  const dims = { sm: 'h-5', md: 'h-6', lg: 'h-8' }[size];
  const chipPad = { sm: 'px-2 py-1', md: 'px-2.5 py-1.5', lg: 'px-3 py-2' }[size];
  const chipText = { sm: 'text-[11px]', md: 'text-[13px]', lg: 'text-[15px]' }[size];

  if (failed) {
    return (
      <span
        className={`inline-flex items-center ${chipPad} rounded-md ${
          tone === 'dark' ? 'bg-ivory-50/10 text-ivory-50' : 'bg-forest-950/[0.04] text-forest-950'
        } font-serif ${chipText} tracking-tight border ${
          tone === 'dark' ? 'border-ivory-50/15' : 'border-forest-950/10'
        }`}
      >
        {name}
      </span>
    );
  }

  const logoUrl =
    `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON` +
    `&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md ${chipPad} ${
        tone === 'dark' ? 'bg-ivory-50 border border-ivory-50/20' : 'bg-white border border-forest-950/10'
      }`}
    >
      <img
        src={logoUrl}
        alt={name}
        className={`${dims} w-auto object-contain`}
        style={{ filter: 'saturate(0.9)' }}
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </span>
  );
}

/* Arryve wordmark (reuses the landing page SVG). */
function ArryveMark({
  className = 'h-8',
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <img
      src="/arryve-logo.svg"
      alt="Arryve"
      className={`${className} ${invert ? 'brightness-0 invert' : ''}`}
    />
  );
}

/* ─── Slide 01 — Title ───────────────────────────────────────────────── */

function Slide01Title() {
  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-center overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-12 md:px-20">
        <SlideNumber n={1} dark />
        <Eyebrow dark>Seed · 2026</Eyebrow>

        <ArryveMark className="h-28 md:h-36 lg:h-44 mb-8" invert />

        <p className="font-serif text-[28px] md:text-[40px] font-light italic text-ivory-50 mt-2 max-w-[22ch] leading-[1.15] text-balance">
          A better arrival starts with the <Highlight dark>first call</Highlight>.
        </p>
        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ivory-100/75">
          <span className="font-medium text-ivory-50">Rakhmatjon</span>
          <span className="text-ivory-100/40">Founder</span>
          <span className="text-ivory-100/30">·</span>
          <span className="font-medium text-ivory-50">Nurislombek</span>
          <span className="text-ivory-100/40">Technical Co-Founder</span>
          <span className="text-ivory-100/30">·</span>
          <span className="text-ivory-100/60">Cincinnati, OH</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Slide 02 — Problem ─────────────────────────────────────────────── */

function Slide02Problem() {
  const stats = [
    {
      big: <>1 <span className="italic font-light text-forest-950/75">in</span> 3</>,
      label: 'guest calls unanswered',
      body: 'During busy shifts and after hours — every one is a booking lost to an OTA, a competitor, or silence.',
    },
    {
      big: <>$12<span className="italic font-light text-forest-950/75 text-[0.6em] align-top ml-1">k</span></>,
      label: 'in direct bookings lost / month',
      body: 'A handful of unanswered calls a day compounds fast. The callers were ready to book — they just needed a human on the line.',
    },
    {
      big: <>2.5<span className="italic font-light text-forest-950/75 text-[0.5em] align-baseline ml-2">hrs</span></>,
      label: 'staff time on FAQ / day',
      body: 'Parking. Pets. Breakfast. Check-in. Dozens of times a day, pulling staff from guests standing in front of them.',
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={2} />
        <Eyebrow>The problem</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[72px] font-normal tracking-[-0.025em] leading-[1.02] text-forest-950 max-w-[20ch] mb-14 text-balance">
          Hotels are losing bookings <em className="italic font-light"><Highlight>every hour the phone rings</Highlight>.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-10 md:gap-14">
          {stats.map((s, i) => (
            <div key={i} className="border-t-2 border-forest-950/20 pt-6">
              <div className="font-serif text-[72px] md:text-[88px] font-normal tracking-[-0.035em] leading-[0.9] text-forest-950 mb-4">
                {s.big}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/75 font-semibold mb-3">
                {s.label}
              </div>
              <p className="text-sm md:text-[15px] text-forest-950/70 leading-[1.6] text-pretty">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-[13px] md:text-sm text-forest-950/70">
          And call centers cost <span className="font-mono text-forest-950 font-medium">$2.50 / call</span> — they take messages, don't capture bookings, don't see the PMS.
        </p>
      </div>
    </Slide>
  );
}

/* ─── Slide 03 — Why now ─────────────────────────────────────────────── */

function Slide03WhyNow() {
  const items = [
    {
      n: '01',
      title: 'Voice AI crossed the line.',
      body: 'Streaming latency under 300ms. Natural prosody. The guest on the other end can\'t tell — and doesn\'t care to.',
    },
    {
      n: '02',
      title: 'PMS APIs finally opened up.',
      body: 'HotelKey, Opera, Cloudbeds, Mews — stable, documented, and no longer gated to enterprise-only integrations.',
    },
    {
      n: '03',
      title: 'Hotel labor is structurally short.',
      body: 'Front-desk wages up 25%+ post-COVID. Small-property understaffing isn\'t a cycle — it\'s the new baseline.',
    },
  ];

  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={3} />
        <Eyebrow>Why now</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[68px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[18ch] mb-14 text-balance">
          Three curves crossed in the last <em className="italic font-light">18 months.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {items.map((it) => (
            <div key={it.n}>
              <div className="font-mono text-[13px] text-forest-950/55 tracking-wider mb-4 font-medium">{it.n}</div>
              <h3 className="font-serif text-[24px] md:text-[30px] font-normal tracking-[-0.015em] leading-[1.15] text-forest-950 mb-4 text-pretty">
                {it.title}
              </h3>
              <p className="text-sm md:text-[15px] text-forest-950/70 leading-[1.6] text-pretty">{it.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-forest-950/10 text-[16px] md:text-[18px] text-forest-950 italic font-serif font-light max-w-[52ch] text-pretty">
          Small hotels couldn't afford call centers <span className="not-italic font-sans">or</span> enterprise AI. <Highlight>Now they get both, in one line.</Highlight>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 04 — Solution ─────────────────────────────────────────────── */

function Slide04Solution() {
  return (
    <Slide tone="warm">
      <div className="relative grid md:grid-cols-[1.15fr_1fr] gap-14 md:gap-20 items-center">
        <SlideNumber n={4} />
        <div>
          <div className="mb-6 flex items-center gap-3">
            <ArryveMark className="h-7" />
            <span className="text-[10px] uppercase tracking-[0.24em] text-forest-950/55 font-medium">presents</span>
          </div>
          <Eyebrow>Solution</Eyebrow>
          <h2 className="font-serif text-[52px] md:text-[80px] font-normal tracking-[-0.03em] leading-[1.0] text-forest-950 mb-6 text-balance">
            Meet <em className="italic font-light">Arvy.</em>
          </h2>
          <p className="font-serif text-[22px] md:text-[28px] text-forest-950/85 leading-[1.25] max-w-[26ch] text-pretty mb-10">
            The AI voice that <Highlight>answers every guest call</Highlight>.
          </p>
          <ul className="space-y-4 text-[15px] md:text-base text-forest-950/85 leading-[1.55]">
            {[
              <>Answers <strong className="font-medium">every</strong> call, 24/7, in your hotel's voice</>,
              <>Captures bookings <strong className="font-medium">live</strong> — writes to your PMS mid-call</>,
              <>Handles routine FAQ in <strong className="font-medium">under 30 seconds</strong></>,
              <>Escalates to staff <strong className="font-medium">with context</strong> — reservation note, pre-briefed transfer</>,
            ].map((line, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-forest-900 mt-1 flex-shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-white border border-forest-950/10 shadow-[0_40px_120px_-40px_rgba(3,36,30,0.28)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-ivory-200">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-forest-950/70 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-900 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-900" />
              </span>
              Live call
            </div>
            <div className="text-[11px] text-ivory-600 tabular-nums">11:42 PM</div>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-forest-950/50 font-medium mb-1">Guest</div>
              <p className="text-[14px] text-forest-950/90 leading-[1.5]">Any chance you have a king tonight?</p>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-forest-950/50 font-medium mb-1">Arvy</div>
              <p className="text-[14px] text-forest-950/90 leading-[1.5]">
                One king at $189, breakfast included. Whose name shall I put the reservation under?
              </p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-ivory-200 bg-ivory-50 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-forest-950 text-ivory-50 px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-medium">
              <Check className="w-3 h-3" />
              Booking captured
            </div>
            <div className="text-[11px] text-ivory-600 tabular-nums">0:42 · synced to PMS</div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 05 — How it works ─────────────────────────────────────────── */

function Slide05HowItWorks() {
  const scenarios = [
    {
      n: '01',
      label: 'New booking',
      title: 'Reservation written straight into the PMS.',
      outcome: 'Booking captured',
      meta: '0:42 · synced',
    },
    {
      n: '02',
      label: 'Returning guest',
      title: 'Profile + prior stays pulled in real time.',
      outcome: 'Confirmed',
      meta: '0:28 · no transfer',
    },
    {
      n: '03',
      label: 'Escalation with context',
      title: 'Transferred with the note already written.',
      outcome: 'Transferred',
      meta: '0:16 · to ext. 100',
    },
  ];

  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={5} />
        <Eyebrow>How it works</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[68px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[18ch] mb-12 text-balance">
          Three kinds of calls. <em className="italic font-light">One steady voice.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {scenarios.map((s) => (
            <div key={s.n} className="rounded-2xl border border-ivory-200 bg-ivory-50 p-6 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <div className="font-mono text-[11px] text-forest-950/45 tracking-wider">{s.n}</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/55 font-medium">{s.label}</div>
              </div>
              <h3 className="font-serif text-[22px] md:text-[24px] font-normal tracking-[-0.015em] leading-[1.2] text-forest-950 mb-6 text-pretty min-h-[58px]">
                {s.title}
              </h3>
              <div className="pt-4 border-t border-ivory-200 flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-forest-950 text-ivory-50 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] font-medium">
                  <Check className="w-2.5 h-2.5" />
                  {s.outcome}
                </div>
                <span className="text-[10px] text-ivory-600 tabular-nums">{s.meta}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-forest-950/10">
          <div className="flex items-baseline justify-between mb-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
              Integrates directly with
            </div>
            <div className="text-[10px] text-forest-950/45">Real-time PMS read + write</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BrandLogo name="HotelKey" size="md" />
            <BrandLogo name="Opera" size="md" />
            <BrandLogo name="Cloudbeds" size="md" />
            <BrandLogo name="Mews" size="md" />
            <BrandLogo name="Twilio" size="md" />
            <BrandLogo name="Stayntouch" size="md" />
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 06 — Founder-product fit ──────────────────────────────────── */

function Slide06Founder() {
  return (
    <Slide tone="light">
      <div className="relative grid md:grid-cols-[1fr_1.1fr] gap-14 md:gap-20 items-center">
        <SlideNumber n={6} />
        <div>
          <Eyebrow>Founder-product fit</Eyebrow>
          <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.05] text-forest-950 mb-6 text-balance">
            I lived the missed call <em className="italic font-light">every shift</em>.
          </h2>
          <p className="text-base md:text-lg text-ivory-700 leading-[1.6] text-pretty mb-6">
            Three-plus years working the US hotel industry — watching bookings walk to OTAs because the phone rang during check-in. This isn't a thesis. It's the job I had.
          </p>
          <p className="text-base md:text-lg text-ivory-700 leading-[1.6] text-pretty">
            I built Arryve for the person behind the desk. Hospitality is human; the phone work is the part we can take off their plate.
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-forest-950/10 p-8 md:p-10 shadow-[0_30px_80px_-40px_rgba(3,36,30,0.18)]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-5">
            What I bring to this problem
          </div>
          <div className="space-y-5">
            <FounderRow
              heading="3+ years in US hotel operations"
              body={<>Front-desk and operations roles at <FillIn>specific HIE / Holiday Inn properties</FillIn>.</>}
            />
            <FounderRow
              heading="Personal network in the Midwest"
              body={<><FillIn>~N hotelier relationships</FillIn> across OH / KY / IN — warm-intro velocity that a cold-outbound competitor can't match.</>}
            />
            <FounderRow
              heading="Native Uzbek + English fluency"
              body={<>Unlocks the Cincinnati Uzbek-American hotelier network (slide 8) — a distribution wedge no one else has.</>}
            />
            <FounderRow
              heading="Technical co-founder: Nurislombek"
              body={<><FillIn>Engineering background — voice AI / systems experience</FillIn>.</>}
            />
          </div>
        </div>
      </div>
    </Slide>
  );
}

function FounderRow({ heading, body }: { heading: React.ReactNode; body: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Check className="w-4 h-4 text-forest-900 mt-1 flex-shrink-0" />
      <div>
        <div className="text-[14px] font-medium text-forest-950 mb-0.5">{heading}</div>
        <div className="text-[13px] text-ivory-700 leading-[1.55]">{body}</div>
      </div>
    </div>
  );
}

/* ─── Slide 07 — Market ──────────────────────────────────────────────── */

function Slide07Market() {
  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={7} />
        <Eyebrow>Market opportunity</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[68px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 mb-14 text-balance max-w-[18ch]">
          A large, <Highlight>underserved wedge</Highlight>.
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <MarketStat
            value="~40K"
            label="US small & mid-sized hotels"
            detail="Independents and franchisees — our direct target. (Total US: ~60K properties.)"
            emphasis={false}
          />
          <MarketStat
            value="$860M"
            label="US TAM"
            detail="40K × $21,588/yr (Property annual plan). Before international and adjacent expansion."
            emphasis
          />
          <MarketStat
            value="~$320M"
            label="SAM near-term"
            detail="~15K properties already on HotelKey / Opera / Cloudbeds / Mews in the US."
            emphasis={false}
          />
        </div>

        <div className="mt-12 pt-8 border-t border-forest-950/10 grid md:grid-cols-2 gap-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-3">Why the wedge</div>
            <p className="text-base text-ivory-700 leading-[1.6] text-pretty">
              Enterprise hotel tech prices out 80% of US properties. Call centers are expensive and don't close. We land where both fail — at small & mid-sized hotels that want to answer <em>every</em> call without hiring another FTE.
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-3">International</div>
            <p className="text-base text-ivory-700 leading-[1.6] text-pretty">
              ~700K hotels globally outside the US. 5–10× TAM expansion once English + 2–3 more languages ship. Voice is the universal interface.
            </p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

function MarketStat({
  value,
  label,
  detail,
  emphasis,
}: {
  value: string;
  label: string;
  detail: string;
  emphasis: boolean;
}) {
  return (
    <div className={`rounded-2xl p-7 ${emphasis ? 'bg-forest-950 text-ivory-50' : 'bg-ivory-50 border border-forest-950/10'}`}>
      <div className={`font-serif text-[56px] md:text-[72px] font-normal tracking-[-0.03em] leading-[0.95] mb-4 ${emphasis ? 'text-ivory-50' : 'text-forest-950'}`}>
        {value}
      </div>
      <div className={`text-[11px] uppercase tracking-[0.22em] font-medium mb-3 ${emphasis ? 'text-ivory-100/75' : 'text-forest-950/60'}`}>
        {label}
      </div>
      <p className={`text-[13px] leading-[1.55] text-pretty ${emphasis ? 'text-ivory-100/80' : 'text-ivory-700'}`}>
        {detail}
      </p>
    </div>
  );
}

/* ─── Slide 08 — Go to market ────────────────────────────────────────── */

function Slide08GoToMarket() {
  const waves = [
    {
      n: 'Wave 1',
      title: 'Cincinnati Uzbek-American hoteliers',
      body: <>Our immediate diaspora network: <FillIn>~N properties</FillIn> of Holiday Inn Express / Holiday Inn franchises. Trust velocity &gt; cold outbound. Reference-driven close in weeks.</>,
      target: '10 paid pilots',
      when: 'Q1–Q2 2026',
    },
    {
      n: 'Wave 2',
      title: 'Midwest expansion + AAHOA',
      body: 'AAHOA (Asian-American Hotel Owners Association): 20,000+ properties, many Indian-American-owned. Same diaspora-trust dynamic — warm intros from Wave 1 operators.',
      target: '50 paying properties',
      when: 'Q3–Q4 2026',
    },
    {
      n: 'Wave 3',
      title: 'IHG franchisee forums + PMS marketplaces',
      body: 'Land as a listed integration on HotelKey & Opera marketplaces. Ride case studies from Waves 1–2 into IHG owner groups — 40% of our TAM sits under IHG brands.',
      target: '300+ properties',
      when: '2027',
    },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={8} />
        <Eyebrow>Go to market</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-4 text-balance">
          Start in Cincinnati. <em className="italic font-light">Expand on trust.</em>
        </h2>
        <p className="text-base md:text-lg text-ivory-700 leading-[1.6] max-w-2xl text-pretty mb-12">
          A distribution advantage competitors can't replicate — because it's community, not marketing.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {waves.map((w) => (
            <div key={w.n} className="rounded-2xl bg-white border border-forest-950/10 p-7">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[10px] uppercase tracking-[0.24em] text-forest-900 font-semibold">{w.n}</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/45 font-medium">{w.when}</div>
              </div>
              <h3 className="font-serif text-[22px] font-normal tracking-[-0.015em] leading-[1.2] text-forest-950 mb-4 text-pretty">
                {w.title}
              </h3>
              <p className="text-[13px] md:text-[14px] text-ivory-700 leading-[1.6] text-pretty mb-5">{w.body}</p>
              <div className="pt-4 border-t border-ivory-200 text-[11px] uppercase tracking-[0.22em] text-forest-950/65 font-medium">
                Target: <span className="text-forest-950">{w.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 09 — Business model ──────────────────────────────────────── */

function Slide09BusinessModel() {
  const rows = [
    { label: 'Monthly', value: '$1,799 / property' },
    { label: 'Annual', value: '$17,990 (2 months free)' },
    { label: 'Onboarding', value: '$2,500 one-time' },
    { label: 'Overage', value: '$1.25 / call above 2,000 / mo' },
  ];

  const unitEcon = [
    { label: 'Gross margin (at scale)', value: '~70%' },
    { label: 'Target CAC (diaspora-led)', value: '~$1,500' },
    { label: 'LTV (18-mo avg retention)', value: '~$30K' },
    { label: 'LTV / CAC', value: '~20×' },
    { label: 'Payback', value: '~3 months' },
  ];

  return (
    <Slide tone="light">
      <div className="relative grid md:grid-cols-[1.1fr_1fr] gap-14 md:gap-20 items-start">
        <SlideNumber n={9} />
        <div>
          <Eyebrow>Business model</Eyebrow>
          <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 mb-8 text-balance">
            One plan, <em className="italic font-light">per property.</em>
          </h2>
          <div className="rounded-3xl bg-white border border-forest-950/10 overflow-hidden shadow-[0_30px_80px_-40px_rgba(3,36,30,0.18)]">
            {rows.map((r, i) => (
              <div
                key={r.label}
                className={`px-6 py-5 flex items-center justify-between gap-6 ${
                  i < rows.length - 1 ? 'border-b border-ivory-200' : ''
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
                  {r.label}
                </div>
                <div className="font-serif text-[18px] md:text-[22px] text-forest-950 tabular-nums">
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-6">Unit economics (target)</div>
          <div className="space-y-3">
            {unitEcon.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between border-b border-forest-950/10 pb-3">
                <div className="text-[13px] text-forest-950/75">{r.label}</div>
                <div className="font-mono text-[14px] text-forest-950 tabular-nums">{r.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[14px] italic text-forest-950/75 leading-[1.6] max-w-md text-pretty">
            Diaspora-driven GTM keeps CAC below SaaS average. Structural pricing advantage — still roughly half a call center's cost, while <Highlight>capturing bookings they can't</Highlight>.
          </p>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 10 — Competition ────────────────────────────────────────── */

function Slide10Competition() {
  type Brand = { name: string };
  const rows: Array<{
    brands: Brand[];
    focus: string;
    why: React.ReactNode;
    tone: 'ivory' | 'dark';
    isArryve?: boolean;
  }> = [
    {
      brands: [{ name: 'Canary Technologies' }],
      focus: 'Guest messaging, upsells, digital check-in',
      why: (
        <>
          Text, not voice. Their <span className="font-medium text-forest-950">~$500M valuation</span> validates the category — we own the other half.
        </>
      ),
      tone: 'ivory',
    },
    {
      brands: [{ name: 'Duve' }, { name: 'Mews AI' }],
      focus: 'PMS-native guest messaging',
      why: 'Also text-first. Same gap on the phone line.',
      tone: 'ivory',
    },
    {
      brands: [{ name: 'iroomfinder' }, { name: 'InnRoad' }],
      focus: 'Human call centers',
      why: (
        <>
          Expensive, slow, don't capture bookings. <span className="font-medium text-forest-950">The incumbent we directly replace.</span>
        </>
      ),
      tone: 'ivory',
    },
    {
      brands: [{ name: 'Bland AI' }, { name: 'Vapi' }, { name: 'Retell' }],
      focus: 'Horizontal voice AI platforms',
      why: 'No hospitality vertical, no PMS integration, no domain workflows. DIY toolkits — not a product.',
      tone: 'ivory',
    },
    {
      brands: [{ name: 'Arryve' }],
      focus: 'Voice-first · hospitality-specific · small-hotel-priced',
      why: <Highlight dark>White space. No one else is here.</Highlight>,
      tone: 'dark',
      isArryve: true,
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={10} />
        <Eyebrow>Competitive landscape</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-10 text-balance">
          The category is validated. <em className="italic font-light">Our lane is empty.</em>
        </h2>

        <div className="rounded-3xl overflow-hidden border border-forest-950/10 bg-white shadow-[0_30px_80px_-40px_rgba(3,36,30,0.15)]">
          <div className="grid grid-cols-[1.3fr_1.3fr_2fr] bg-ivory-100 border-b border-forest-950/10 px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-forest-950/65 font-semibold">
            <div>Player</div>
            <div>Focus</div>
            <div>Why we win / position</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1.3fr_1.3fr_2fr] px-6 py-5 border-b border-ivory-200 last:border-0 gap-4 items-center ${
                r.tone === 'dark' ? 'bg-forest-950 text-ivory-50' : ''
              }`}
            >
              <div className="flex items-center flex-wrap gap-2">
                {r.isArryve ? (
                  <ArryveMark className="h-7" invert />
                ) : (
                  r.brands.map((b) => (
                    <BrandLogo key={b.name} name={b.name} size="sm" />
                  ))
                )}
              </div>
              <div className={`text-[13px] ${r.tone === 'dark' ? 'text-ivory-50/90' : 'text-forest-950/75'}`}>
                {r.focus}
              </div>
              <div className={`text-[13px] leading-[1.55] ${r.tone === 'dark' ? 'text-ivory-50' : 'text-forest-950/85'}`}>
                {r.why}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 11 — Traction ───────────────────────────────────────────── */

function Slide11Traction() {
  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-center overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-40" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-12 md:px-20">
        <SlideNumber n={11} dark />
        <Eyebrow dark>Traction</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-ivory-50 max-w-[20ch] mb-10 text-balance">
          Early signal from the <em className="italic font-light">real world</em>.
        </h2>

        <div className="grid md:grid-cols-4 gap-6 mb-10">
          {[
            { v: <FillIn>N</FillIn>, l: 'Paid pilots signed' },
            { v: <FillIn>$X</FillIn>, l: 'MRR run-rate' },
            { v: <FillIn>N</FillIn>, l: 'Calls answered / month' },
            { v: <FillIn>$X</FillIn>, l: 'Bookings captured' },
          ].map((s, i) => (
            <div key={i} className="border-t border-ivory-100/20 pt-4">
              <div className="font-serif text-[44px] md:text-[56px] font-normal tracking-[-0.025em] leading-[0.95] text-ivory-50 mb-3">
                {s.v}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-ivory-100/65 font-medium">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-ivory-50/[0.06] border border-ivory-100/15 p-7 md:p-8 max-w-3xl backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-acid-400 mb-4" />
          <p className="font-serif text-[22px] md:text-[26px] font-light italic leading-[1.3] text-ivory-50 text-pretty">
            "<FillIn>GM quote — 'Arvy caught a $640 booking at 2am that would've gone to Booking.com. Sold me instantly.'</FillIn>"
          </p>
          <div className="mt-5 text-[13px] text-ivory-100/70">
            — <FillIn>GM name, property, city</FillIn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Slide 12 — Team ───────────────────────────────────────────────── */

function Slide12Team() {
  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={12} />
        <Eyebrow>Team</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[18ch] mb-12 text-balance">
          Built by people who've been <em className="italic font-light">on the line.</em>
        </h2>

        <div className="grid md:grid-cols-2 gap-10">
          <TeamCard
            initial="R"
            name="Rakhmatjon"
            role="Founder"
            bio={
              <>
                3+ years in US hotel operations — front desk through ops at{' '}
                <FillIn>HIE / Holiday Inn properties</FillIn>. Bilingual EN/UZ. Personal network of{' '}
                <FillIn>~N hotelier relationships</FillIn> across OH / KY.
              </>
            }
          />
          <TeamCard
            initial="N"
            name="Nurislombek"
            role="Technical Co-Founder"
            bio={
              <>
                <FillIn>Engineer with voice AI / systems background — specific prior work</FillIn>. Owns the streaming voice pipeline, PMS integrations, reliability.
              </>
            }
          />
        </div>

        <div className="mt-12 pt-8 border-t border-forest-950/10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-4">
            Advisors
          </div>
          <p className="text-[14px] text-ivory-700 leading-[1.55] max-w-2xl">
            <FillIn>Advisor names — ideally 1 hospitality-ops veteran and 1 voice-AI / SaaS operator</FillIn>
          </p>
        </div>
      </div>
    </Slide>
  );
}

function TeamCard({
  initial,
  name,
  role,
  bio,
}: {
  initial: string;
  name: string;
  role: string;
  bio: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white border border-forest-950/10 p-7 md:p-8 shadow-[0_20px_60px_-35px_rgba(3,36,30,0.18)]">
      <div className="flex items-center gap-4 mb-5">
        <div className="h-14 w-14 rounded-full bg-forest-950 text-ivory-50 grid place-items-center font-serif text-xl">
          {initial}
        </div>
        <div>
          <div className="font-serif text-[22px] text-forest-950 leading-tight">{name}</div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mt-1">
            {role}
          </div>
        </div>
      </div>
      <p className="text-[14px] text-ivory-700 leading-[1.6] text-pretty">{bio}</p>
    </div>
  );
}

/* ─── Slide 13 — Roadmap ────────────────────────────────────────────── */

function Slide13Roadmap() {
  const phases = [
    {
      when: 'Q1–Q2 2026',
      title: 'Land the wedge',
      items: ['10 paid Cincinnati pilots', 'Harden product + voice quality', '2 more PMS integrations'],
    },
    {
      when: 'Q3–Q4 2026',
      title: 'Prove repeatability',
      items: ['50 paying properties', '~$1M ARR run-rate', 'First 2 hires: 1 SE + 1 GTM'],
    },
    {
      when: '2027',
      title: 'Expand beyond Midwest',
      items: ['300+ properties', 'AAHOA + marketplace distribution', 'Language #2 (Spanish)'],
    },
  ];

  const fundsUse = [
    { pct: '50%', label: 'Engineering', detail: 'Voice reliability, PMS integrations, observability' },
    { pct: '30%', label: 'Go-to-market', detail: 'First GTM hire, diaspora field events, referrals' },
    { pct: '15%', label: 'PMS partnerships', detail: 'Certifications, marketplace listings, co-marketing' },
    { pct: '5%', label: 'Ops & legal', detail: 'Compliance, contracts, infrastructure' },
  ];

  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={13} />
        <Eyebrow>Roadmap & use of funds</Eyebrow>
        <h2 className="font-serif text-[42px] md:text-[56px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 mb-10 text-balance max-w-[20ch]">
          Land, repeat, <em className="italic font-light">expand.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {phases.map((p, i) => (
            <div key={p.when} className="rounded-2xl bg-ivory-50 border border-forest-950/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[11px] text-forest-950/45">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-forest-950/55 font-medium">{p.when}</span>
              </div>
              <h3 className="font-serif text-[22px] font-normal tracking-[-0.015em] text-forest-950 mb-4">
                {p.title}
              </h3>
              <ul className="space-y-2 text-[13px] text-ivory-700 leading-[1.5]">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-forest-900 mt-2 flex-shrink-0" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-forest-950/10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-5">
            Use of funds
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {fundsUse.map((f) => (
              <div key={f.label}>
                <div className="font-serif text-[32px] md:text-[38px] text-forest-950 tracking-tight tabular-nums mb-2">
                  {f.pct}
                </div>
                <div className="text-[13px] font-medium text-forest-950 mb-1">{f.label}</div>
                <div className="text-[12px] text-ivory-700 leading-[1.5]">{f.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 14 — Exit strategy ──────────────────────────────────────── */

function Slide14Exit() {
  const acquirers: Array<{
    name: string;
    thesis: string;
    brands: { domain?: string; name: string }[];
  }> = [
    {
      name: 'Canary Technologies',
      thesis: 'Voice complements their messaging suite. At ~10× ARR comps, $25M ARR → ~$250M exit.',
      brands: [{ domain: 'canarytechnologies.com', name: 'Canary Technologies' }],
    },
    {
      name: 'IHG Hotels & Resorts',
      thesis: '40% of our TAM are IHG franchisees. Vertical tech acquisition precedent.',
      brands: [{ domain: 'ihg.com', name: 'IHG' }],
    },
    {
      name: 'Oracle Hospitality (Opera PMS)',
      thesis: 'Voice is the missing layer on the Opera stack.',
      brands: [{ domain: 'oracle.com', name: 'Oracle' }],
    },
    {
      name: 'Cloudbeds · SiteMinder',
      thesis: 'Distribution platforms adding voice to their bundle.',
      brands: [
        { domain: 'cloudbeds.com', name: 'Cloudbeds' },
        { domain: 'siteminder.com', name: 'SiteMinder' },
      ],
    },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={14} />
        <Eyebrow>Exit strategy</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-10 text-balance">
          Multiple credible buyers. <em className="italic font-light">3–5 year window.</em>
        </h2>

        <div className="grid md:grid-cols-2 gap-5 mb-8">
          {acquirers.map((a) => (
            <div key={a.name} className="rounded-2xl bg-white border border-forest-950/10 p-6 flex gap-5 items-start">
              <div className="flex flex-col gap-2 pt-1 flex-shrink-0">
                {a.brands.map((b) => (
                  <BrandLogo key={b.name} domain={b.domain} name={b.name} size="md" />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-[22px] text-forest-950 mb-2">{a.name}</div>
                <p className="text-[14px] text-forest-950/75 leading-[1.55] text-pretty">{a.thesis}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-forest-950/15 grid md:grid-cols-2 gap-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-3">Comparable exits</div>
            <p className="text-[14px] text-ivory-700 leading-[1.55] max-w-md text-pretty">
              ALICE → Actabl (2021) · Cendyn → Accor-Sapient · Duetto → GrowthCurve ($270M, 2022) · MeetingPackage → Lightspeed
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-3">Target outcome</div>
            <p className="font-serif text-[24px] md:text-[28px] font-light italic leading-[1.25] text-forest-950 text-pretty">
              <Highlight>$150M–$500M acquisition</Highlight>, 3–5 years.
            </p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 15 — The ask ────────────────────────────────────────────── */

function Slide15Ask() {
  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-center overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-12 md:px-20">
        <SlideNumber n={15} dark />
        <ArryveMark className="h-7 mb-8 opacity-80" invert />
        <Eyebrow dark>The ask</Eyebrow>
        <h2 className="font-serif text-[72px] md:text-[112px] font-normal tracking-[-0.03em] leading-[0.94] text-ivory-50 mb-6">
          Raising <FillIn>$X</FillIn>
        </h2>
        <p className="font-serif text-[26px] md:text-[36px] font-light italic text-ivory-100/85 max-w-[26ch] leading-[1.2] mb-12 text-pretty">
          at <FillIn>$Y</FillIn> pre-money.
        </p>

        <div className="rounded-3xl bg-ivory-50/[0.05] border border-ivory-100/15 p-7 md:p-8 max-w-3xl backdrop-blur-sm">
          <div className="text-[11px] uppercase tracking-[0.22em] text-ivory-100/65 font-medium mb-5">
            Milestones this round funds
          </div>
          <ul className="space-y-3 text-[15px] md:text-base text-ivory-100/90 leading-[1.55]">
            {[
              '50 paying properties',
              'Seven-figure ARR run-rate',
              'Validated Cincinnati playbook, documented and replicable',
              'First 10 IHG franchisees outside the diaspora wedge',
            ].map((m) => (
              <li key={m} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-acid-400 mt-1 flex-shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 flex items-center gap-4 text-sm text-ivory-100/60">
          <Heart className="w-4 h-4 text-ivory-100/70 fill-ivory-100/70" />
          <span>Made in Cincinnati · Arryve · arryve.com</span>
        </div>
      </div>
    </section>
  );
}

