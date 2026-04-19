import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  Lock,
  Heart,
  Play,
  Pause,
  Shield,
  Zap,
  Headphones,
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

/* Sales pitch — product-focused deck designed to be sent directly to hotel
   operators. Same design tokens as the investor deck; different slide set
   (no market/team/competition/ask; adds ROI slider, pilot terms, security
   reassurance, and a direct CTA). */

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

const MAIN_SLIDES = 10;

export default function PitchDeckSales() {
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
        setCurrent(MAIN_SLIDES - 1);
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

  const slides = [
    SlideHook,
    SlideProblem,
    SlideMeetArvy,
    SlideHowItWorks,
    SlideIntegration,
    SlideROI,
    SlidePricing,
    SlidePilot,
    SlideSecurity,
    SlideCTA,
  ];

  // Touch-swipe navigation for mobile.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const SWIPE_THRESHOLD = 60;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="relative h-full w-full font-sans antialiased text-forest-950 bg-ivory-50 overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
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
              WebkitOverflowScrolling: 'touch',
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
        onJump={setCurrent}
        onPrev={prev}
        onNext={next}
      />
      <SpeedInsights />
    </div>
  );
}

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
        <span className="hidden sm:inline-block w-px h-4 bg-forest-950/15" />
        <div className="hidden sm:flex items-center gap-1">
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

function Slide({
  tone = 'light',
  children,
}: {
  tone?: 'light' | 'dark' | 'warm' | 'white';
  children: React.ReactNode;
}) {
  const bg = {
    light: 'bg-ivory-50 text-forest-950',
    dark: 'bg-forest-950 text-ivory-50',
    warm: 'bg-ivory-100 text-forest-950',
    white: 'bg-white text-forest-950',
  }[tone];

  return (
    <section className={`${bg} h-full w-full flex items-start md:items-center overflow-y-auto md:overflow-hidden`}>
      <div className="max-w-7xl mx-auto w-full px-6 md:px-20 py-10 md:py-16 pb-28 md:pb-16">{children}</div>
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

function BrandLogo({
  domain,
  name,
  size = 'sm',
}: {
  domain?: string;
  name: string;
  size?: 'sm' | 'md';
}) {
  const [failed, setFailed] = useState(!domain);
  const dims = { sm: 'h-5', md: 'h-6' }[size];
  const chipPad = { sm: 'px-2 py-1', md: 'px-2.5 py-1.5' }[size];
  const chipText = { sm: 'text-[11px]', md: 'text-[13px]' }[size];

  if (failed) {
    return (
      <span
        className={`inline-flex items-center ${chipPad} rounded-md bg-forest-950/[0.04] text-forest-950 font-serif ${chipText} tracking-tight border border-forest-950/10`}
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
      className={`inline-flex items-center justify-center rounded-md ${chipPad} bg-white border border-forest-950/10`}
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

/* ─── Slide 01 — Hook ─────────────────────────────────────────────── */

function SlideHook() {
  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={1} dark />
        <Eyebrow dark>For hotel operators</Eyebrow>

        <ArryveMark className="h-16 md:h-20 mb-10" invert />

        <h1 className="font-serif text-[56px] md:text-[88px] lg:text-[104px] font-normal tracking-[-0.03em] leading-[0.96] text-ivory-50 max-w-[16ch] mb-6">
          Answer <em className="italic font-light">every</em> guest call.
        </h1>
        <p className="font-serif text-[24px] md:text-[34px] font-light italic text-ivory-100/85 max-w-[24ch] leading-[1.2] mb-12 text-pretty">
          Meet Arvy — the <Highlight dark>AI voice for your front desk</Highlight>.
        </p>

        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-ivory-100/70 font-medium">
          <span className="inline-flex items-center gap-2 rounded-full border border-ivory-100/25 bg-ivory-50/[0.06] px-3 py-1.5">
            <Check className="w-3 h-3 text-acid-400" /> Live in 5 days
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-ivory-100/25 bg-ivory-50/[0.06] px-3 py-1.5">
            <Check className="w-3 h-3 text-acid-400" /> 14-day risk-free pilot
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-ivory-100/25 bg-ivory-50/[0.06] px-3 py-1.5">
            <Check className="w-3 h-3 text-acid-400" /> Cancel anytime
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── Slide 02 — Problem ──────────────────────────────────────────── */

function SlideProblem() {
  const stats = [
    {
      big: <>1 <span className="italic font-light text-forest-950/75">in</span> 3</>,
      label: 'calls go to voicemail',
      body: 'During peak hours and after 6 PM — and the caller books with an OTA instead.',
    },
    {
      big: <>$12<span className="italic font-light text-forest-950/75 text-[0.6em] align-top ml-1">k</span></>,
      label: 'revenue lost / month',
      body: 'For an average small or mid-sized property. Compounds quickly.',
    },
    {
      big: <>2.5<span className="italic font-light text-forest-950/75 text-[0.5em] align-baseline ml-2">hrs</span></>,
      label: 'staff time / day on FAQ',
      body: 'Parking. Pets. Breakfast. Check-in. The same questions, over and over.',
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={2} />
        <Eyebrow>The cost of unanswered calls</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.02] text-forest-950 max-w-[22ch] mb-14 text-balance">
          Your phone is ringing <em className="italic font-light">while your team is with another guest.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-10 md:gap-14">
          {stats.map((s, i) => (
            <div key={i} className="border-t-2 border-forest-950/20 pt-6">
              <div className="font-serif text-[64px] md:text-[84px] font-normal tracking-[-0.035em] leading-[0.9] text-forest-950 mb-4">
                {s.big}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/75 font-semibold mb-3">
                {s.label}
              </div>
              <p className="text-sm md:text-[15px] text-forest-950/70 leading-[1.6] text-pretty">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-forest-950/10 text-[15px] md:text-[17px] text-forest-950 italic font-serif font-light max-w-[52ch] text-pretty">
          <Highlight>Every missed ring is a room someone else sold.</Highlight>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 03 — Meet Arvy ────────────────────────────────────────── */

function SlideMeetArvy() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const handleHearArvy = () => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }
    speakArvy(
      "Good evening, and thank you for calling. This is Arvy. We have a king available at $189 tonight, breakfast included. Whose name shall I put the reservation under?",
      { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) },
    );
  };

  return (
    <Slide tone="warm">
      <div className="relative grid md:grid-cols-[1.15fr_1fr] gap-14 md:gap-20 items-center">
        <SlideNumber n={3} />

        <div>
          <Eyebrow>The fix, in one sentence</Eyebrow>
          <h2 className="font-serif text-[48px] md:text-[72px] font-normal tracking-[-0.03em] leading-[1.0] text-forest-950 mb-6 text-balance">
            Meet <em className="italic font-light">Arvy.</em>
          </h2>
          <p className="font-serif text-[22px] md:text-[28px] text-forest-950/85 leading-[1.25] max-w-[28ch] text-pretty mb-8">
            Your <Highlight>24 / 7 AI front desk voice</Highlight>.
          </p>

          <ul className="space-y-3 text-[15px] md:text-base text-forest-950/85 leading-[1.5] mb-8">
            {[
              <>Answers <strong className="font-medium">every call</strong>, 24/7, in your hotel's voice</>,
              <>Closes bookings <strong className="font-medium">live</strong> and writes them to your PMS</>,
              <>Hands off to your front desk when a human is needed — with the note already written</>,
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
            className="group inline-flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full border border-forest-950/20 bg-white hover:bg-white transition-colors shadow-[0_10px_30px_-20px_rgba(3,36,30,0.3)]"
          >
            <span className="relative grid place-items-center h-10 w-10 rounded-full bg-forest-950 text-ivory-50">
              {!isSpeaking && (
                <span className="absolute inset-0 rounded-full bg-forest-950 opacity-30 animate-ping" />
              )}
              <span className="relative">
                {isSpeaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
              </span>
            </span>
            <span className="text-[15px] font-medium text-forest-950">
              {isSpeaking ? 'Arvy is speaking…' : 'Hear Arvy answer a call'}
            </span>
          </button>
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

/* ─── Slide 04 — How it works (3 scenarios) ──────────────────────── */

function SlideHowItWorks() {
  const scenarios = [
    {
      n: '01',
      label: 'New booking',
      title: 'A reservation written straight into your PMS.',
      transcript: [
        { who: 'Guest', text: 'Hi, any chance you have a king tonight?' },
        { who: 'Arvy', text: 'One king at $189, breakfast included. Whose name?' },
      ],
      outcome: 'Booking captured',
      meta: '0:42 · synced',
    },
    {
      n: '02',
      label: 'Returning guest',
      title: "Your guest's profile pulled in real time.",
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
      title: 'Transferred to your team — with the note already written.',
      transcript: [
        { who: 'Guest', text: 'Can you split our bill three ways?' },
        { who: 'Arvy', text: "I'll note that on your reservation and put you through now." },
      ],
      outcome: 'Transferred',
      meta: '0:16 · to ext. 100',
    },
  ];

  const [active, setActive] = useState(0);
  const s = scenarios[active];

  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={4} />
        <Eyebrow>How it works</Eyebrow>
        <h2 className="font-serif text-[42px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-8 text-balance">
          Three kinds of calls. <em className="italic font-light">One steady voice.</em>
        </h2>

        <div className="flex flex-wrap gap-2 mb-6" role="tablist">
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

        <div className="rounded-3xl border border-forest-950/10 bg-ivory-50 p-7 md:p-8 shadow-[0_30px_80px_-40px_rgba(3,36,30,0.2)]">
          <h3 className="font-serif text-[24px] md:text-[32px] font-normal tracking-[-0.015em] leading-[1.2] text-forest-950 mb-6 text-pretty">
            {s.title}
          </h3>
          <div className="grid md:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-4">
              {s.transcript.map((t, j) => (
                <div key={j}>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/50 font-medium mb-1">
                    {t.who}
                  </div>
                  <p className="text-[15px] md:text-base text-forest-950/90 leading-[1.5]">{t.text}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-end gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-forest-950 text-ivory-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium self-start">
                <Check className="w-3 h-3" />
                {s.outcome}
              </div>
              <div className="text-[12px] text-forest-950/55 tabular-nums">{s.meta}</div>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 05 — Integration timeline ────────────────────────────── */

function SlideIntegration() {
  const steps = [
    {
      day: 'Day 1',
      title: 'Kickoff call',
      body: 'We learn your property — amenities, policies, common questions, and your preferred voice.',
    },
    {
      day: 'Day 3',
      title: 'Knowledge base + PMS wiring',
      body: 'Arvy is trained on your hotel and connected to your PMS for live reads and writes.',
    },
    {
      day: 'Day 5',
      title: 'Arvy answers live',
      body: "Forward your line to Arvy. We monitor the first 48 hours with you side by side.",
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={5} />
        <Eyebrow>Integration</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-10 text-balance">
          Live on your line in <Highlight>under a week</Highlight>.
        </h2>

        <div className="mb-12">
          <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium mb-4">
            Works with your PMS on day one
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BrandLogo domain="hotelkey.com" name="HotelKey" size="md" />
            <BrandLogo domain="oracle.com" name="Opera" size="md" />
            <BrandLogo domain="cloudbeds.com" name="Cloudbeds" size="md" />
            <BrandLogo domain="mews.com" name="Mews" size="md" />
            <BrandLogo domain="twilio.com" name="Twilio" size="md" />
            <BrandLogo domain="stayntouch.com" name="Stayntouch" size="md" />
          </div>
          <p className="mt-3 text-[13px] text-forest-950/60 italic">
            Running something else? Tell us — we'll build the integration for your pilot.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <div key={s.day} className="relative rounded-2xl bg-white border border-forest-950/10 p-7">
              <div className="flex items-center justify-between mb-5">
                <div className="font-mono text-[11px] tracking-wider text-forest-900 font-semibold">
                  {s.day}
                </div>
                <div className="h-8 w-8 rounded-full bg-forest-950 text-ivory-50 grid place-items-center font-mono text-[12px] tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
              <h3 className="font-serif text-[22px] md:text-[24px] font-normal leading-[1.2] text-forest-950 mb-3 text-pretty">
                {s.title}
              </h3>
              <p className="text-[13px] md:text-[14px] text-forest-950/70 leading-[1.55] text-pretty">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 06 — ROI slider ──────────────────────────────────────── */

function SlideROI() {
  const [calls, setCalls] = useState(40);
  const recovered = Math.round(calls * 30 * 0.33 * 0.15 * 150);
  const price = 1799;
  const roi = Math.max(1, Math.round(recovered / price));

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={6} />
        <Eyebrow>Your ROI</Eyebrow>
        <h2 className="font-serif text-[42px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-10 text-balance">
          Drag the slider. <em className="italic font-light">See the money Arvy brings back.</em>
        </h2>

        <div className="rounded-3xl bg-white border border-forest-950/10 p-8 md:p-10 shadow-[0_30px_80px_-40px_rgba(3,36,30,0.2)] max-w-4xl">
          <div className="grid md:grid-cols-2 gap-10 mb-8">
            <div>
              <div className="font-serif text-[56px] md:text-[76px] font-normal tracking-[-0.03em] leading-[0.95] text-forest-950 tabular-nums mb-2">
                ${recovered.toLocaleString()}
              </div>
              <div className="text-[12px] md:text-[13px] text-forest-950/65 leading-snug max-w-[22ch]">
                in bookings Arvy recovers each month
              </div>
            </div>
            <div>
              <div className="font-serif text-[56px] md:text-[76px] font-normal tracking-[-0.03em] leading-[0.95] text-forest-950 tabular-nums mb-2">
                <Highlight>≈ {roi}×</Highlight>
              </div>
              <div className="text-[12px] md:text-[13px] text-forest-950/65 leading-snug max-w-[22ch]">
                ROI vs. $1,799 / month subscription
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-forest-950/10">
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="sales-calls-slider" className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
                Guest calls your property receives per day
              </label>
              <span className="font-mono text-[14px] text-forest-950 tabular-nums">{calls}</span>
            </div>
            <input
              id="sales-calls-slider"
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

        <p className="mt-6 text-[13px] italic text-forest-950/60 leading-[1.55] max-w-[60ch] text-pretty">
          Conservative assumptions: 33% miss rate, 15% call-to-booking recovery, $150 average booking value. Most properties see meaningfully higher returns.
        </p>
      </div>
    </Slide>
  );
}

/* ─── Slide 07 — Pricing ──────────────────────────────────────────── */

function SlidePricing() {
  const rows = [
    { label: 'Monthly', value: '$1,799 / month', note: 'Per property' },
    { label: 'Annual', value: '$17,990 / year', note: '2 months free' },
    { label: 'Onboarding', value: '$2,500 one-time', note: 'PMS setup + voice training' },
    { label: 'Overage', value: '$1.25 / call', note: 'Beyond 2,000 calls / month' },
  ];

  const included = [
    'Up to 2,000 inbound calls per month',
    '24/7 AI front desk coverage',
    'PMS integration (HotelKey, Opera, Cloudbeds, Mews, +)',
    'Custom knowledge base for your property',
    'Real-time call transcripts + analytics',
    'Smart escalation rules to your team',
    'Dedicated onboarding specialist',
    'Monthly account reviews',
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={7} />
        <Eyebrow>Simple pricing</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-10 text-balance">
          One plan, <em className="italic font-light">per property.</em>
        </h2>

        <div className="grid md:grid-cols-[1fr_1fr] gap-8 items-start">
          <div className="rounded-3xl bg-white border border-forest-950/10 overflow-hidden shadow-[0_30px_80px_-40px_rgba(3,36,30,0.18)]">
            {rows.map((r, i) => (
              <div
                key={r.label}
                className={`px-6 py-5 ${i < rows.length - 1 ? 'border-b border-ivory-200' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-4 mb-1">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
                    {r.label}
                  </div>
                  <div className="font-serif text-[18px] md:text-[22px] text-forest-950 tabular-nums text-right">
                    {r.value}
                  </div>
                </div>
                <div className="text-[12px] text-forest-950/55">{r.note}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium mb-4">
              Everything included
            </div>
            <ul className="space-y-2.5">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-forest-950/85 leading-[1.5]">
                  <Check className="w-4 h-4 text-forest-900 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-5 border-t border-forest-950/10 text-[14px] italic font-serif text-forest-950/80 leading-[1.5]">
              <Highlight>Still cheaper than your call center</Highlight> — and captures bookings they can't.
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 08 — 14-day pilot ────────────────────────────────────── */

function SlidePilot() {
  const steps = [
    {
      window: 'Day 0',
      title: 'Sign the pilot agreement',
      body: "The $2,500 onboarding fee covers setup. No monthly charges until you continue.",
    },
    {
      window: 'Days 1–4',
      title: 'We build Arvy for your property',
      body: "Kickoff call, knowledge base, PMS wiring, your hotel's voice.",
    },
    {
      window: 'Days 5–18',
      title: 'Arvy takes calls on your line',
      body: 'Live on your forwarding number. You watch every transcript in real time.',
    },
    {
      window: 'Day 19',
      title: 'Keep it, or walk away',
      body: 'Continue at $1,799/mo or cancel. Your call.',
    },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={8} />
        <Eyebrow>Try it risk-free</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-10 text-balance">
          14 days live on your line. <em className="italic font-light">Walk away if it doesn't work.</em>
        </h2>

        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {steps.map((s, i) => (
            <div key={s.window} className="rounded-2xl bg-white border border-forest-950/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-[11px] text-forest-900 font-semibold tracking-wider">
                  {s.window}
                </div>
                <div className="h-6 w-6 rounded-full bg-forest-950 text-ivory-50 grid place-items-center font-mono text-[10px] tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
              <h3 className="font-serif text-[18px] md:text-[19px] font-normal leading-[1.2] text-forest-950 mb-2 text-pretty">
                {s.title}
              </h3>
              <p className="text-[12px] md:text-[13px] text-forest-950/70 leading-[1.5] text-pretty">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-forest-950 text-ivory-50 p-7 md:p-8 max-w-3xl">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-acid-400/20 border border-acid-400/40 grid place-items-center flex-shrink-0">
              <Zap className="w-5 h-5 text-acid-400" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-ivory-100/70 font-medium mb-2">
                Pilot guarantee
              </div>
              <p className="font-serif text-[18px] md:text-[22px] font-light leading-[1.3] text-ivory-50 text-pretty">
                If Arvy doesn't capture <Highlight dark>at least one real booking</Highlight> in 14 days, we refund your onboarding fee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 09 — Security & trust ────────────────────────────────── */

function SlideSecurity() {
  const items = [
    {
      icon: Lock,
      title: 'End-to-end encryption',
      body: 'TLS 1.3 in transit, AES-256 at rest. Every call leg, every PMS write.',
    },
    {
      icon: Shield,
      title: 'Privacy by design',
      body: 'No guest data retained beyond what your PMS already holds. GDPR-compliant, US-hosted.',
    },
    {
      icon: Headphones,
      title: 'Your call data stays yours',
      body: 'Transcripts exportable anytime. You own the data. You control escalation rules.',
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={9} />
        <Eyebrow>Security & data</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-12 text-balance">
          Enterprise-grade security. <em className="italic font-light">Built for hotels.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.title} className="rounded-2xl bg-white border border-forest-950/10 p-7">
                <div className="h-10 w-10 rounded-full bg-forest-950/[0.05] border border-forest-950/10 grid place-items-center mb-5">
                  <Icon className="w-5 h-5 text-forest-900" />
                </div>
                <h3 className="font-serif text-[20px] md:text-[22px] font-normal leading-[1.2] text-forest-950 mb-3">
                  {it.title}
                </h3>
                <p className="text-[13px] md:text-[14px] text-forest-950/70 leading-[1.55] text-pretty">
                  {it.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="pt-6 border-t border-forest-950/10 grid md:grid-cols-3 gap-6 text-[13px] text-forest-950/70">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-2">Compliance path</div>
            SOC 2 Type I — in progress, targeted Q3 2026
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-2">Escalation rules</div>
            Hard-route medical, payment disputes, and PII requests to your team
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-2">Voice ownership</div>
            Your property gets a custom voice — trained on your tone, not a generic AI
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 10 — Ready when you are (CTA) ────────────────────────── */

function SlideCTA() {
  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={10} dark />
        <ArryveMark className="h-8 mb-8 opacity-85" invert />
        <Eyebrow dark>Ready when you are</Eyebrow>

        <h2 className="font-serif text-[56px] md:text-[88px] font-normal tracking-[-0.03em] leading-[0.96] text-ivory-50 max-w-[20ch] mb-6">
          Let's get Arvy on <em className="italic font-light">your line.</em>
        </h2>
        <p className="font-serif text-[22px] md:text-[28px] font-light italic text-ivory-100/85 max-w-[36ch] leading-[1.2] mb-12 text-pretty">
          Email us to set up a demo. See your own property's calls in a live Arvy simulation.
        </p>

        <a
          href="mailto:contact@tryarryve.com"
          className="group inline-flex items-center gap-5 rounded-3xl bg-ivory-50 text-forest-950 p-6 md:p-7 hover:bg-white transition-colors max-w-2xl mb-10"
        >
          <div className="h-14 w-14 rounded-full bg-forest-950 text-ivory-50 grid place-items-center flex-shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium mb-1.5">
              Email us
            </div>
            <div className="font-serif text-[24px] md:text-[32px] text-forest-950 leading-tight">
              contact@tryarryve.com
            </div>
            <div className="text-[13px] text-forest-950/65 mt-2">Usually reply within a few hours</div>
          </div>
        </a>

        <div className="flex items-center gap-3 text-[12px] text-ivory-100/55">
          <Heart className="w-3.5 h-3.5 text-ivory-100/60 fill-ivory-100/60" />
          <span>Made in Cincinnati · Built by hotel operators for hotel operators · arryve.com</span>
        </div>
      </div>
    </section>
  );
}
