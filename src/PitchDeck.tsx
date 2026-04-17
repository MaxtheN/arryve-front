import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Sparkles,
  Play,
  Pause,
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

/* Speech helper — mirrors the landing page's speakArvy so the pitch deck
   can play the same "Hear Arvy" interaction. */
function speakArvy(
  text: string,
  callbacks: { onStart?: () => void; onEnd?: () => void } = {},
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    callbacks.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.02;
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.name === 'Samantha') ||
    voices.find((v) => v.lang === 'en-US' && /female/i.test(v.name)) ||
    voices.find((v) => v.name.includes('Google UK English Female')) ||
    voices.find((v) => v.lang.startsWith('en'));
  if (voice) utter.voice = voice;
  utter.onstart = () => callbacks.onStart?.();
  utter.onend = () => callbacks.onEnd?.();
  utter.onerror = () => callbacks.onEnd?.();
  synth.speak(utter);
}

/* ─── Design tokens (match landing page) ───────────────────────────────
   forest-950  #03241E  — dark bg / headlines on light
   forest-900  #073A2F  — accent dark
   ivory-50    #FDFBF7  — light bg primary
   ivory-100   #F7F3EC  — light bg secondary
   ivory-200   #EDE7DC  — hairlines / dividers
   ivory-700   #554E43  — body text on light
   Fonts: Fraunces (serif display), Inter (sans body)
────────────────────────────────────────────────────────────────────── */

const MAIN_SLIDES = 12; // Main flow. Appendix (Exit) sits at index 12, reachable via End.
const APPENDIX_INDEX = 12;
const TOTAL_WITH_APPENDIX = 13;

export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const next = useCallback(
    () => setCurrent((c) => Math.min(c + 1, MAIN_SLIDES - 1)),
    [],
  );
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
        setCurrent(APPENDIX_INDEX);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  useEffect(() => {
    const enablePrintMode = () => setIsPrintMode(true);
    const disablePrintMode = () => setIsPrintMode(false);
    window.addEventListener('beforeprint', enablePrintMode);
    window.addEventListener('afterprint', disablePrintMode);
    return () => {
      window.removeEventListener('beforeprint', enablePrintMode);
      window.removeEventListener('afterprint', disablePrintMode);
    };
  }, []);

  // 12 main slides + Slide14Exit as appendix (reach via End key).
  // Order follows YC + a16z conventions: one-liner, team, problem, why now,
  // solution+demo, market, traction, business, GTM, competition, ask.
  const slides = [
    Slide01Title,          //  1  Title
    Slide02WhatWeDo,       //  2  What we do (one-liner)
    Slide12Team,           //  3  Team (moved up)
    Slide02Problem,        //  4  Problem
    Slide05WhyNow,         //  5  Why now
    Slide06SolutionDemo,   //  6  Solution + demo (merged)
    Slide07Market,         //  7  Market
    Slide11Traction,       //  8  Traction (moved before business)
    Slide09BusinessModel,  //  9  Business model + unit econ
    Slide08GoToMarket,     // 10  Go-to-market
    Slide10Competition,    // 11  Competition
    Slide15Ask,            // 12  Ask
    Slide14Exit,           // +1  Appendix — Exit strategy (End key)
  ];

  return (
    <div className="relative h-screen w-screen font-sans antialiased text-forest-950 bg-ivory-50 overflow-hidden">
      {slides.map((SlideComponent, i) => {
        const active = i === current;
        const shouldRender = isPrintMode || active;

        return (
        <div
          key={i}
          className="deck-slide absolute inset-0"
          style={{
            display: shouldRender ? 'block' : 'none',
            opacity: active ? 1 : 0,
            pointerEvents: active ? 'auto' : 'none',
            transition: isPrintMode ? undefined : 'opacity 280ms ease',
          }}
          aria-hidden={!active}
        >
          {shouldRender ? <SlideComponent /> : null}
        </div>
        );
      })}

      <DeckChrome
        current={current}
        total={MAIN_SLIDES}
        appendixIndex={APPENDIX_INDEX}
        totalWithAppendix={TOTAL_WITH_APPENDIX}
        onJump={setCurrent}
        onPrev={prev}
        onNext={next}
      />
      <SpeedInsights />
    </div>
  );
}

/* ─── Navigation chrome ─────────────────────────────────────────────── */

function DeckChrome({
  current,
  total,
  appendixIndex,
  totalWithAppendix,
  onJump,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  appendixIndex: number;
  totalWithAppendix: number;
  onJump: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const onAppendix = current === appendixIndex;
  return (
    <>
      <button
        type="button"
        onClick={onAppendix ? () => onJump(total - 1) : onPrev}
        disabled={!onAppendix && current === 0}
        className="deck-chrome fixed left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-forest-950/10 hover:bg-forest-950/20 disabled:opacity-0 disabled:pointer-events-none transition backdrop-blur-sm"
        aria-label="Previous slide"
      >
        <ArrowLeft className="w-4 h-4 text-forest-950" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={current === total - 1 || onAppendix}
        className="deck-chrome fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-forest-950/10 hover:bg-forest-950/20 disabled:opacity-0 disabled:pointer-events-none transition backdrop-blur-sm"
        aria-label="Next slide"
      >
        <ArrowRight className="w-4 h-4 text-forest-950" />
      </button>

      <div className="deck-chrome fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-ivory-50/90 backdrop-blur-md border border-forest-950/10 rounded-full px-4 py-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium tabular-nums">
          {onAppendix
            ? 'Appendix'
            : `${String(current + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
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
          <button
            type="button"
            onClick={() => onJump(appendixIndex)}
            title="Appendix (End key)"
            className={`ml-2 text-[9px] uppercase tracking-[0.2em] font-medium px-2 py-0.5 rounded-full transition ${
              onAppendix
                ? 'bg-forest-900 text-ivory-50'
                : 'text-forest-950/45 hover:text-forest-950/85 border border-forest-950/15'
            }`}
            aria-label={`Go to appendix (slide ${totalWithAppendix})`}
          >
            +1
          </button>
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
  key?: React.Key;
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

/* ─── Slide 02 — What we do (the YC one-liner) ───────────────────────── */

function Slide02WhatWeDo() {
  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={2} />
        <Eyebrow>What we do</Eyebrow>

        <ArryveMark className="h-9 mb-10" />

        <h2 className="font-serif text-[48px] md:text-[68px] lg:text-[76px] font-normal tracking-[-0.025em] leading-[1.02] text-forest-950 max-w-[22ch] mb-8 text-balance">
          The <Highlight>AI front desk voice</Highlight> for small & mid-sized hotels.
        </h2>

        <p className="font-serif text-[22px] md:text-[28px] font-light italic text-forest-950/80 leading-[1.3] max-w-[42ch] text-pretty mb-10">
          Every missed call becomes a booking. Every routine question gets handled. Every escalation arrives with context.
        </p>

        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 font-medium">
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-950/20 bg-white/50 px-3 py-1.5">
            Holiday Inn Express
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-950/20 bg-white/50 px-3 py-1.5">
            Holiday Inn
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-950/20 bg-white/50 px-3 py-1.5">
            Independent properties
          </span>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 04 — Problem ─────────────────────────────────────────────── */

function Slide02Problem() {
  const stats = [
    {
      big: <>1 <span className="italic font-light text-forest-950/75">in</span> 3</>,
      label: 'guest calls unanswered',
      body: 'Busy shifts. After hours. Every one walks to an OTA.',
    },
    {
      big: <>$12<span className="italic font-light text-forest-950/75 text-[0.6em] align-top ml-1">k</span></>,
      label: 'bookings lost / month',
      body: 'Per average property. Compounds fast.',
    },
    {
      big: <>2.5<span className="italic font-light text-forest-950/75 text-[0.5em] align-baseline ml-2">hrs</span></>,
      label: 'staff time on FAQ / day',
      body: 'Parking. Pets. Breakfast. Check-in. Every day.',
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={4} />
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

/* Slide 03 (Why now) removed — its signal is woven into the Solution slide. */

/* ─── Slide 04 — Solution ─────────────────────────────────────────────── */

/* ─── Slide 05 — Why now ──────────────────────────────────────────────── */

function Slide05WhyNow() {
  const curves = [
    {
      n: '01',
      title: 'Voice AI crossed the line.',
      body: "Streaming latency under 300ms. Natural prosody. The guest can't tell — and doesn't care to.",
    },
    {
      n: '02',
      title: 'PMS APIs finally opened up.',
      body: 'HotelKey, Opera, Cloudbeds, Mews — stable, documented, no longer gated to enterprise integrations.',
    },
    {
      n: '03',
      title: 'Hotel labor is structurally short.',
      body: "Front-desk wages up 25%+ post-COVID. Small-property understaffing isn't a cycle — it's the new baseline.",
    },
  ];

  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={5} />
        <Eyebrow>Why now</Eyebrow>
        <h2 className="font-serif text-[42px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-14 text-balance">
          Three curves crossed in the last <em className="italic font-light">18 months.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {curves.map((c) => (
            <div key={c.n}>
              <div className="font-mono text-[13px] text-forest-950/55 tracking-wider mb-4 font-medium">
                {c.n}
              </div>
              <h3 className="font-serif text-[24px] md:text-[28px] font-normal tracking-[-0.015em] leading-[1.15] text-forest-950 mb-4 text-pretty">
                {c.title}
              </h3>
              <p className="text-sm md:text-[15px] text-forest-950/70 leading-[1.6] text-pretty">
                {c.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-forest-950/10 text-[16px] md:text-[18px] text-forest-950 italic font-serif font-light max-w-[60ch] text-pretty">
          Small hotels couldn't afford call centers <span className="not-italic font-sans">or</span> enterprise AI. <Highlight>Now they get both, in one line.</Highlight>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 06 — Solution + demo (merged) ────────────────────────────── */

function Slide06SolutionDemo() {
  const scenarios = [
    {
      n: '01',
      label: 'New booking',
      title: 'A reservation, written to the PMS live.',
      transcript: [
        { who: 'Guest', text: 'Any chance you have a king tonight?' },
        { who: 'Arvy', text: 'One king at $189, breakfast included. Whose name?' },
      ],
      outcome: 'Booking captured',
      meta: '0:42 · synced',
    },
    {
      n: '02',
      label: 'Returning guest',
      title: 'Profile + prior stays pulled in real time.',
      transcript: [
        { who: 'Guest', text: "Hi, this is Sarah Chen — confirming Saturday?" },
        { who: 'Arvy', text: 'Welcome back, Ms. Chen. King suite, 3 PM check-in. Shuttle again?' },
      ],
      outcome: 'Confirmed',
      meta: '0:28 · no transfer',
    },
    {
      n: '03',
      label: 'Escalation',
      title: 'Transferred — with the note already written.',
      transcript: [
        { who: 'Guest', text: 'Can you split our bill three ways?' },
        { who: 'Arvy', text: "I'll note it on the reservation and put you through." },
      ],
      outcome: 'Transferred',
      meta: '0:16 · to ext. 100',
    },
  ];

  const [active, setActive] = useState(0);
  const s = scenarios[active];
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleHearArvy = () => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }
    speakArvy(
      "Good evening, thank you for calling. This is Arvy. We have a king available at $189 tonight, breakfast included. Whose name shall I put the reservation under?",
      { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) },
    );
  };

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={6} />
        <Eyebrow>Solution</Eyebrow>

        <h2 className="font-serif text-[42px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.0] text-forest-950 mb-4 text-balance max-w-[24ch]">
          Meet <em className="italic font-light">Arvy</em> — the AI voice that <Highlight>answers every guest call</Highlight>.
        </h2>

        {/* Scenario tabs */}
        <div className="flex flex-wrap gap-2 mt-8 mb-6" role="tablist">
          {scenarios.map((sc, i) => (
            <button
              key={sc.n}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[12px] uppercase tracking-[0.2em] font-medium transition ${
                i === active
                  ? 'bg-forest-950 text-ivory-50'
                  : 'bg-forest-950/[0.04] text-forest-950/65 hover:bg-forest-950/[0.08] hover:text-forest-950'
              }`}
            >
              <span className="font-mono tabular-nums">{sc.n}</span>
              <span>{sc.label}</span>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 items-start">
          {/* Left: value bullets + Hear Arvy */}
          <div>
            <h3 className="font-serif text-[22px] md:text-[26px] font-normal tracking-[-0.015em] leading-[1.2] text-forest-950 mb-5 text-pretty">
              {s.title}
            </h3>
            <ul className="space-y-3 text-[14px] md:text-[15px] text-forest-950/85 leading-[1.45] mb-7">
              {[
                <>Every call, 24/7 — in your hotel's voice</>,
                <>Captures bookings <strong className="font-medium">live</strong> (writes to your PMS)</>,
                <>Escalates with context when a human is needed</>,
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-forest-900 mt-1 flex-shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleHearArvy}
              aria-label={isSpeaking ? 'Stop Arvy' : 'Hear Arvy answer'}
              className="group inline-flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full border border-forest-950/20 bg-white/60 hover:bg-white transition-colors mb-6"
            >
              <span className="relative grid place-items-center h-9 w-9 rounded-full bg-forest-950 text-ivory-50">
                {!isSpeaking && (
                  <span className="absolute inset-0 rounded-full bg-forest-950 opacity-30 animate-ping" />
                )}
                <span className="relative">
                  {isSpeaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
                </span>
              </span>
              <span className="text-sm font-medium text-forest-950">
                {isSpeaking ? 'Arvy is speaking…' : 'Hear Arvy answer'}
              </span>
            </button>

            <div className="pt-5 border-t border-forest-950/10">
              <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium mb-2.5">
                Works with your PMS
              </div>
              <div className="flex flex-wrap gap-2">
                <BrandLogo name="HotelKey" size="sm" />
                <BrandLogo name="Opera" size="sm" />
                <BrandLogo name="Cloudbeds" size="sm" />
                <BrandLogo name="Mews" size="sm" />
                <BrandLogo name="Twilio" size="sm" />
                <BrandLogo name="Stayntouch" size="sm" />
              </div>
            </div>
          </div>

          {/* Right: live call card */}
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
            <div className="px-6 py-6 space-y-4 min-h-[160px]">
              {s.transcript.map((t, j) => (
                <div key={j}>
                  <div className="text-[9px] uppercase tracking-[0.22em] text-forest-950/50 font-medium mb-1">
                    {t.who}
                  </div>
                  <p className="text-[14px] text-forest-950/90 leading-[1.5]">{t.text}</p>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-ivory-200 bg-ivory-50 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-forest-950 text-ivory-50 px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-medium">
                <Check className="w-3 h-3" />
                {s.outcome}
              </div>
              <div className="text-[11px] text-ivory-600 tabular-nums">{s.meta}</div>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* Slide 06 (Founder-product fit) removed — content merged into Team (Slide 12). */

/* ─── Slide 07 — Market ──────────────────────────────────────────────── */

function Slide07Market() {
  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={7} />
        <Eyebrow>Market</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[68px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 mb-14 text-balance max-w-[18ch]">
          A large, <Highlight>underserved wedge</Highlight>.
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mb-10">
          <MarketStat
            value="~40K"
            label="US small & mid-sized hotels"
            detail="Independents + franchisees. (Total US: ~60K.)"
            emphasis={false}
          />
          <MarketStat
            value="$860M"
            label="US TAM"
            detail="40K × $21,588/yr Property annual."
            emphasis
          />
          <MarketStat
            value="~$320M"
            label="SAM near-term"
            detail="~15K on HotelKey / Opera / Cloudbeds / Mews."
            emphasis={false}
          />
        </div>

        <div className="pt-6 border-t border-forest-950/10 text-[15px] md:text-[17px] text-forest-950 font-serif italic font-light max-w-[60ch] text-pretty">
          Enterprise tech prices out 80% of US properties. Call centers don't close. <Highlight>We land exactly where both fail.</Highlight>
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
      title: 'Cincinnati Uzbek hoteliers',
      body: <><FillIn>~N properties</FillIn> of HIE / Holiday Inn franchises. Trust &gt; cold outbound.</>,
      target: '10 paid pilots',
      when: 'Q1–Q2 2026',
    },
    {
      n: 'Wave 2',
      title: 'Midwest + AAHOA',
      body: '20K+ properties. Same diaspora-trust dynamic, warm-intro flywheel.',
      target: '50 paying properties',
      when: 'Q3–Q4 2026',
    },
    {
      n: 'Wave 3',
      title: 'IHG + PMS marketplaces',
      body: 'Listed on HotelKey / Opera marketplaces. Case studies unlock IHG owner groups — 40% of TAM.',
      target: '300+ properties',
      when: '2027',
    },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={10} />
        <Eyebrow>Go to market</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-10 text-balance">
          Start in Cincinnati. <em className="italic font-light">Expand on trust.</em>
        </h2>

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
  const [calls, setCalls] = useState(40);
  // Conservative: 33% missed × 15% recovery × $150 booking
  const recovered = Math.round(calls * 30 * 0.33 * 0.15 * 150);
  const price = 1799;
  const roi = Math.max(1, Math.round(recovered / price));

  const rows = [
    { label: 'Monthly', value: '$1,799 / property' },
    { label: 'Annual', value: '$17,990 (2 months free)' },
    { label: 'Onboarding', value: '$2,500 one-time' },
    { label: 'Overage', value: '$1.25 / call > 2,000 / mo' },
  ];

  return (
    <Slide tone="light">
      <div className="relative grid md:grid-cols-[1fr_1.1fr] gap-14 md:gap-20 items-start">
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
                className={`px-6 py-4 flex items-center justify-between gap-6 ${
                  i < rows.length - 1 ? 'border-b border-ivory-200' : ''
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
                  {r.label}
                </div>
                <div className="font-serif text-[17px] md:text-[20px] text-forest-950 tabular-nums">
                  {r.value}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] italic text-forest-950/70 leading-[1.55] max-w-md text-pretty">
            Diaspora-driven GTM: CAC ~$1,500 · LTV ~$30K · payback ~3 months.
          </p>
        </div>

        {/* Interactive ROI slider */}
        <div className="rounded-3xl bg-white border border-forest-950/10 p-7 md:p-8 shadow-[0_30px_80px_-40px_rgba(3,36,30,0.18)]">
          <div className="flex items-baseline justify-between mb-6">
            <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
              Drag to see the ROI
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-forest-950/40">Estimated</div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-7">
            <div>
              <div className="font-serif text-[40px] md:text-[52px] font-normal tracking-[-0.025em] leading-[0.95] text-forest-950 tabular-nums">
                ${recovered.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] md:text-[12px] text-forest-950/60 leading-snug">
                bookings recovered / month
              </div>
            </div>
            <div>
              <div className="font-serif text-[40px] md:text-[52px] font-normal tracking-[-0.025em] leading-[0.95] text-forest-950 tabular-nums">
                <Highlight>≈ {roi}×</Highlight>
              </div>
              <div className="mt-2 text-[11px] md:text-[12px] text-forest-950/60 leading-snug">
                ROI vs. $1,799 / month
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="deck-calls-slider" className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
                Calls per day
              </label>
              <span className="font-mono text-[13px] text-forest-950 tabular-nums">{calls}</span>
            </div>
            <input
              id="deck-calls-slider"
              type="range"
              min={10}
              max={150}
              step={5}
              value={calls}
              onChange={(e) => setCalls(Number(e.target.value))}
              className="w-full accent-forest-900 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-forest-950/45 font-mono mt-1.5 tabular-nums">
              <span>10</span>
              <span>150</span>
            </div>
          </div>
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
        <SlideNumber n={11} />
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
  /* Live "calls answered" ticker — auto-increments to show momentum. */
  const [count, setCount] = useState(() => 5284 + Math.floor(Math.random() * 30));
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = setInterval(() => setCount((c) => c + 1), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-center overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-40" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-12 md:px-20">
        <SlideNumber n={8} dark />
        <Eyebrow dark>Traction</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-ivory-50 max-w-[20ch] mb-10 text-balance">
          Early signal from the <em className="italic font-light">real world</em>.
        </h2>

        {/* Live counter */}
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 mb-10">
          <div className="font-serif text-[56px] md:text-[80px] font-normal tracking-[-0.03em] leading-[0.9] text-ivory-50 tabular-nums">
            {count.toLocaleString()}
          </div>
          <div className="text-[13px] text-ivory-100/75 leading-[1.5] max-w-xs">
            guest calls answered this week
            <span className="inline-flex items-center gap-1 ml-3 text-ivory-100/55">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ivory-100 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ivory-100/80" />
              </span>
              live
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8 pt-6 border-t border-ivory-100/15">
          {[
            { v: <FillIn>N</FillIn>, l: 'Paid pilots' },
            { v: <FillIn>$X</FillIn>, l: 'MRR' },
            { v: <FillIn>N</FillIn>, l: 'Calls / month' },
            { v: <FillIn>$X</FillIn>, l: 'Bookings captured' },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-serif text-[36px] md:text-[44px] font-normal tracking-[-0.02em] leading-[0.95] text-ivory-50 mb-2">
                {s.v}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ivory-100/65 font-medium">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-ivory-50/[0.06] border border-ivory-100/15 p-6 md:p-7 max-w-3xl backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-acid-400 mb-3" />
          <p className="font-serif text-[19px] md:text-[22px] font-light italic leading-[1.3] text-ivory-50 text-pretty">
            "<FillIn>Arvy caught a $640 booking at 2am that would've gone to Booking.com.</FillIn>"
          </p>
          <div className="mt-3 text-[12px] text-ivory-100/70">— <FillIn>GM, property, city</FillIn></div>
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
        <SlideNumber n={3} />
        <Eyebrow>Team · founder-product fit</Eyebrow>
        <h2 className="font-serif text-[40px] md:text-[56px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-4 text-balance">
          I lived the missed call <em className="italic font-light">every shift.</em>
        </h2>
        <p className="text-[15px] md:text-[17px] text-forest-950/75 italic font-serif font-light leading-[1.45] max-w-[54ch] mb-10">
          Three-plus years in US hotel ops. This isn't a thesis — it's the job I had.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <TeamCard
            initial="R"
            name="Rakhmatjon"
            role="Founder"
            bio={
              <>
                3+ yrs US hotel ops at <FillIn>HIE / Holiday Inn</FillIn>. Bilingual EN/UZ.
                Personal network: <FillIn>~N hoteliers</FillIn> across OH / KY.
              </>
            }
          />
          <TeamCard
            initial="N"
            name="Nurislombek"
            role="Technical Co-Founder"
            bio={
              <>
                <FillIn>Voice AI / systems engineer</FillIn>. Owns the streaming pipeline, PMS integrations, reliability.
              </>
            }
          />
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

/* Slide 13 (Roadmap) removed — milestones + use-of-funds folded into the Ask. */

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
        <div className="absolute top-8 right-10 text-[10px] uppercase tracking-[0.28em] text-forest-950/35 font-mono tabular-nums">
          Appendix
        </div>
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
        <SlideNumber n={12} dark />
        <ArryveMark className="h-7 mb-6 opacity-80" invert />
        <Eyebrow dark>The ask</Eyebrow>
        <h2 className="font-serif text-[64px] md:text-[96px] font-normal tracking-[-0.03em] leading-[0.94] text-ivory-50 mb-4">
          Raising <FillIn>$X</FillIn>
        </h2>
        <p className="font-serif text-[22px] md:text-[30px] font-light italic text-ivory-100/85 max-w-[26ch] leading-[1.2] mb-10 text-pretty">
          at <FillIn>$Y</FillIn> pre-money.
        </p>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
          <div className="rounded-3xl bg-ivory-50/[0.05] border border-ivory-100/15 p-6 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-[0.22em] text-ivory-100/65 font-medium mb-4">
              18 months buys
            </div>
            <ul className="space-y-2.5 text-[14px] text-ivory-100/90 leading-[1.45]">
              {[
                '50 paying properties',
                'Seven-figure ARR',
                'Validated Cincinnati playbook',
                'First 10 IHG franchisees outside diaspora',
              ].map((m) => (
                <li key={m} className="flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-acid-400 mt-1 flex-shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-ivory-50/[0.05] border border-ivory-100/15 p-6 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-[0.22em] text-ivory-100/65 font-medium mb-4">
              Use of funds
            </div>
            <div className="space-y-2 text-[13px] text-ivory-100/90">
              {[
                ['50%', 'Engineering'],
                ['30%', 'Go-to-market'],
                ['15%', 'PMS partnerships'],
                ['5%', 'Ops & legal'],
              ].map(([pct, label]) => (
                <div key={label} className="flex items-baseline justify-between border-b border-ivory-100/10 pb-2 last:border-0">
                  <span>{label}</span>
                  <span className="font-mono tabular-nums text-ivory-100/70">{pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3 text-[12px] text-ivory-100/55">
          <Heart className="w-3.5 h-3.5 text-ivory-100/60 fill-ivory-100/60" />
          <span>Made in Cincinnati · Arryve · arryve.com</span>
          <span className="text-ivory-100/30">·</span>
          <span className="italic">Press End for exit-strategy appendix</span>
        </div>
      </div>
    </section>
  );
}
