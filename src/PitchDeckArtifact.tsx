import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

/* ─── Self-contained Arryve pitch deck (Claude.ai artifact friendly) ────
   • No external CSS / SVG file dependencies
   • Fonts loaded via Google Fonts @import
   • Custom colors inlined as Tailwind arbitrary values
   Palette: [#03241E] #03241E · [#073A2F] #073A2F · [#FDFBF7] #FDFBF7 ·
            [#F7F3EC] #F7F3EC · [#EDE7DC] #EDE7DC · [#736A5C] #736A5C ·
            [#554E43] #554E43 · [#F2C62C] #F2C62C
────────────────────────────────────────────────────────────────────── */

const DECK_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@300..700&display=swap');
.arryve-deck { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
.arryve-deck .font-serif { font-family: 'Fraunces', Georgia, serif; }
.arryve-deck .font-sans  { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
.arryve-deck .font-mono  { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.arryve-deck .film-grain::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.98 0 0 0 0 0.92 0 0 0 0 0.8 0 0 0 0.6 0'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>");
  opacity: 0.22; mix-blend-mode: overlay; z-index: 4;
}
.arryve-deck .warm-wash {
  background:
    linear-gradient(180deg, rgba(3, 36, 30, 0.15) 0%, rgba(3, 36, 30, 0.55) 62%, rgba(3, 36, 30, 0.88) 100%),
    radial-gradient(ellipse at 20% 80%, rgba(197, 165, 114, 0.28), transparent 55%);
}
`;

const MAIN_SLIDES = 9; // Main flow. Appendix (Exit) sits at index 9, reachable via End.
const APPENDIX_INDEX = 9;
const TOTAL_WITH_APPENDIX = 10;

export default function PitchDeckArtifact() {
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

  // 9 main slides + Slide14Exit as appendix (reach via End key).
  const slides = [
    Slide01Title,           //  1  Title
    Slide02Problem,         //  2  Problem
    SlideSolution,          //  3  Solution (combined with Arvy)
    Slide05Market,          //  4  Market analysis · financial model
    Slide06BusinessModel,   //  5  Business model
    Slide08GoToMarket,      //  6  Go-to-market
    Slide10Competition,     //  7  Competitors
    Slide12Team,            //  8  Team
    SlideThankYou,          //  9  Thank you
    Slide14Exit,            // +1  Appendix — Exit strategy (End key)
  ];

  // Touch-swipe navigation for mobile. Only horizontal swipes trigger nav,
  // so vertical scroll inside a slide still works natively.
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
      className="arryve-deck relative h-screen w-full font-sans antialiased text-[#03241E] bg-[#FDFBF7] overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <style>{DECK_STYLES}</style>
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
        appendixIndex={APPENDIX_INDEX}
        totalWithAppendix={TOTAL_WITH_APPENDIX}
        onJump={setCurrent}
        onPrev={prev}
        onNext={next}
      />
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
        className="deck-chrome fixed left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-[#03241E]/10 hover:bg-[#03241E]/20 disabled:opacity-0 disabled:pointer-events-none transition backdrop-blur-sm"
        aria-label="Previous slide"
      >
        <ArrowLeft className="w-4 h-4 text-[#03241E]" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={current === total - 1 || onAppendix}
        className="deck-chrome fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-[#03241E]/10 hover:bg-[#03241E]/20 disabled:opacity-0 disabled:pointer-events-none transition backdrop-blur-sm"
        aria-label="Next slide"
      >
        <ArrowRight className="w-4 h-4 text-[#03241E]" />
      </button>

      <div className="deck-chrome fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[#FDFBF7]/90 backdrop-blur-md border border-[#03241E]/10 rounded-full px-4 py-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#03241E]/60 font-medium tabular-nums">
          {onAppendix
            ? 'Appendix'
            : `${String(current + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
        </span>
        <span className="hidden sm:inline-block w-px h-4 bg-[#03241E]/15" />
        <div className="hidden sm:flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onJump(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-5 bg-[#073A2F]' : 'w-1.5 bg-[#03241E]/25 hover:bg-[#03241E]/45'
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
                ? 'bg-[#073A2F] text-[#FDFBF7]'
                : 'text-[#03241E]/45 hover:text-[#03241E]/85 border border-[#03241E]/15'
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
    light: 'bg-[#FDFBF7] text-[#03241E]',
    dark: 'bg-[#03241E] text-[#FDFBF7]',
    warm: 'bg-[#F7F3EC] text-[#03241E]',
    white: 'bg-white text-[#03241E]',
  }[tone];

  const pad = padding === 'tight'
    ? 'px-6 md:px-14 py-10 pb-28 md:pb-10'
    : 'px-6 md:px-20 py-10 md:py-16 pb-28 md:pb-16';

  return (
    <section className={`${bg} h-full w-full flex items-start md:items-center overflow-y-auto md:overflow-hidden`}>
      <div className={`max-w-7xl mx-auto w-full ${pad}`}>{children}</div>
    </section>
  );
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  const color = dark ? 'text-[#F7F3EC]/70' : 'text-[#03241E]/60';
  const line = dark ? 'bg-[#F7F3EC]/50' : 'bg-[#03241E]/40';
  return (
    <div className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-medium ${color} mb-8`}>
      <span className={`h-px w-8 ${line}`} />
      {children}
    </div>
  );
}

function SlideNumber({ n, dark = false }: { n: number; dark?: boolean }) {
  const color = dark ? 'text-[#F7F3EC]/45' : 'text-[#03241E]/35';
  return (
    <div className={`absolute top-8 right-10 text-[10px] uppercase tracking-[0.28em] ${color} font-mono tabular-nums`}>
      {String(n).padStart(2, '0')}
    </div>
  );
}

function FillIn({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded bg-[#F2C62C]/30 text-[#03241E] border border-[#E7B91E]/40 text-[0.95em] font-medium">
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
          tone === 'dark' ? 'bg-[#FDFBF7]/10 text-[#FDFBF7]' : 'bg-[#03241E]/[0.04] text-[#03241E]'
        } font-serif ${chipText} tracking-tight border ${
          tone === 'dark' ? 'border-[#FDFBF7]/15' : 'border-[#03241E]/10'
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
        tone === 'dark' ? 'bg-[#FDFBF7] border border-[#FDFBF7]/20' : 'bg-white border border-[#03241E]/10'
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

/* Arryve wordmark — inline SVG version (no external file). */
function ArryveMark({
  className = 'h-8',
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  const fill = invert ? '#FDFBF7' : '#03241E';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 428 112"
      aria-label="Arryve"
      role="img"
      className={className}
      style={{ width: 'auto' }}
      preserveAspectRatio="xMinYMid meet"
    >
      <g transform="translate(-98.64 -6.96)">
        <g transform="translate(0 -199.54)">
          <path
            d="M165.513,233.518C168.087,236.783 181.805,266.805 183.001,270.939C184.007,274.303 184.303,277.838 183.872,281.322C183.113,287.221 180.395,291.97 175.522,295.43C172.96,297.243 170.046,298.497 166.968,299.11C158.621,300.78 147.435,299.345 138.781,299.746C130.875,300.112 123.55,300.58 117.227,295.094C119.006,290.257 119.978,285.945 122.184,281.021C123.285,282.774 124.582,284.793 126.333,285.953C130.053,288.418 159.412,288.12 164.859,286.836C167.491,286.216 169.473,284.46 170.771,282.116C172.382,279.203 172.591,276.171 171.729,272.996C170.559,268.688 159.467,245.938 156.635,242.51C154.683,240.148 152.425,238.832 149.809,237.347C155.813,233.793 158.811,233.446 165.513,233.518Z"
            fill={fill}
          />
          <path
            d="M117.227,295.094C108.961,286.718 109.711,277.418 115.107,267.725C119.97,258.99 123.174,248.481 128.106,239.982C129.451,237.65 131.13,235.527 133.088,233.68C142.014,225.284 156.927,224.091 165.513,233.518C158.811,233.446 155.813,233.793 149.809,237.347C139.293,242.14 137.298,246.45 132.74,256.659C129.128,264.749 125.368,272.715 122.184,281.021C119.978,285.945 119.006,290.257 117.227,295.094Z"
            fill={fill}
          />
          <path
            d="M144.833,206.67C159.275,204.917 158.677,217.074 145.703,218.372C128.706,220.072 114.111,234.625 111.243,251.278C110.453,255.867 111.177,260.988 108.88,265.074C89.576,277.629 95.441,213.646 144.833,206.67Z"
            fill={fill}
          />
        </g>
        <g transform="matrix(1.271709,0,0,1.271709,-93.83 -23.89)">
          <text
            x="228"
            y="96"
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontWeight: 600,
              fontSize: '78.634px',
              fill,
            }}
          >
            Arryve
          </text>
        </g>
      </g>
    </svg>
  );
}

/* ─── Slide 01 — Title ───────────────────────────────────────────────── */

function Slide01Title() {
  return (
    <section className="film-grain relative h-full w-full bg-[#03241E] text-[#FDFBF7] flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={1} dark />
        <Eyebrow dark>Seed · 2026</Eyebrow>

        <ArryveMark className="h-28 md:h-36 lg:h-44 mb-6" invert />

        <p className="font-serif text-[26px] md:text-[36px] font-normal text-[#FDFBF7] leading-[1.15] mb-3 max-w-[26ch] text-balance">
          The <Highlight dark>AI front desk</Highlight> for hotels.
        </p>
        <p className="font-serif text-[18px] md:text-[24px] font-light italic text-[#F7F3EC]/75 max-w-[28ch] leading-[1.25]">
          A better arrival starts with the first call.
        </p>

        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#F7F3EC]/75">
          <span className="font-medium text-[#FDFBF7]">Rakhmatjon</span>
          <span className="text-[#F7F3EC]/40">Founder</span>
          <span className="text-[#F7F3EC]/30">·</span>
          <span className="font-medium text-[#FDFBF7]">Nurislombek</span>
          <span className="text-[#F7F3EC]/40">Technical Co-Founder</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Slide 02 — Problem ─────────────────────────────────────────────── */

function Slide02Problem() {
  const stats = [
    {
      big: <>1 <span className="italic font-light text-[#03241E]/75">in</span> 3</>,
      label: 'guest calls unanswered',
    },
    {
      big: <>$12<span className="italic font-light text-[#03241E]/75 text-[0.6em] align-top ml-1">k</span></>,
      label: 'bookings lost / month',
    },
    {
      big: <>2.5<span className="italic font-light text-[#03241E]/75 text-[0.5em] align-baseline ml-2">hrs</span></>,
      label: 'staff time on FAQ / day',
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={2} />
        <Eyebrow>The problem</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[72px] font-normal tracking-[-0.025em] leading-[1.02] text-[#03241E] max-w-[20ch] mb-14 text-balance">
          Hotels lose bookings <em className="italic font-light"><Highlight>every hour the phone rings</Highlight>.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-10 md:gap-14 mb-12">
          {stats.map((s, i) => (
            <div key={i} className="border-t-2 border-[#03241E]/20 pt-6">
              <div className="font-serif text-[72px] md:text-[96px] font-normal tracking-[-0.035em] leading-[0.9] text-[#03241E] mb-4">
                {s.big}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#03241E]/75 font-semibold">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Why now — three tailwinds */}
        <div className="pt-6 border-t border-[#03241E]/10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#03241E]/55 font-semibold mb-3">
            Why now
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] md:text-[14px] text-[#03241E]/75">
            <span><span className="text-[#03241E] font-medium">Voice AI</span> crossed the realism line.</span>
            <span className="text-[#03241E]/30">·</span>
            <span><span className="text-[#03241E] font-medium">Hotel labor</span> is structurally short.</span>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 03 — Solution (high-level, minimal) ──────────────────────── */

function SlideSolution() {
  const transcript = [
    { who: 'Guest', text: 'Any chance you have a king tonight?' },
    { who: 'Arvy', text: 'One king at $189, breakfast included. Whose name?' },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={3} />
        <Eyebrow>Solution</Eyebrow>

        <h2 className="font-serif text-[44px] md:text-[68px] lg:text-[80px] font-normal tracking-[-0.03em] leading-[0.95] text-[#03241E] mb-12 text-balance max-w-[18ch]">
          An <Highlight>AI front desk</Highlight> that <em className="italic font-light">never sleeps.</em>
        </h2>

        <div className="grid md:grid-cols-[1fr_1.05fr] gap-10 items-start">
          <div>
            <ul className="space-y-4 text-[16px] md:text-[18px] text-[#03241E]/85 leading-[1.4]">
              {[
                <>Answers every call, 24/7 — in your hotel's tone</>,
                <>Updates your PMS — bookings, profiles, tickets</>,
                <>Escalates to staff with full context</>,
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#073A2F] mt-1 flex-shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Live call card */}
          <div className="rounded-3xl bg-white border border-[#03241E]/10 shadow-[0_40px_120px_-40px_rgba(3,36,30,0.28)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE7DC]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#03241E]/70 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#073A2F] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#073A2F]" />
                </span>
                Live call
              </div>
              <div className="text-[11px] text-[#736A5C] tabular-nums">11:42 PM</div>
            </div>
            <div className="px-6 py-6 space-y-4">
              {transcript.map((t, j) => (
                <div key={j}>
                  <div className="text-[9px] uppercase tracking-[0.22em] text-[#03241E]/50 font-medium mb-1">
                    {t.who}
                  </div>
                  <p className="text-[15px] text-[#03241E]/90 leading-[1.5]">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 05 — Market analysis ──────────────────────────────────────── */

function Slide05Market() {
  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={4} />
        <Eyebrow>Market analysis · financial model</Eyebrow>
        <h2 className="font-serif text-[36px] md:text-[48px] font-normal tracking-[-0.025em] leading-[1.04] text-[#03241E] mb-2 text-balance max-w-[24ch]">
          How we make money — <em className="italic font-light">the math.</em>
        </h2>

        {/* Hero number */}
        <div className="mt-8 md:mt-10 text-center">
          <div className="font-serif text-[88px] md:text-[152px] lg:text-[192px] font-normal tracking-[-0.045em] leading-[0.85] text-[#03241E] tabular-nums">
            $860M
          </div>
          <div className="mt-3 text-[11px] md:text-[12px] uppercase tracking-[0.24em] text-[#03241E]/55 font-semibold">
            Annual revenue · US TAM
          </div>
        </div>

        {/* Explicit equation: $21,588/yr × 40,000 hotels = $860M */}
        <div className="mt-10 md:mt-12 grid grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto items-center">
          {/* Per-hotel annual */}
          <div className="text-center">
            <div className="font-serif text-[28px] md:text-[44px] tabular-nums text-[#03241E] leading-none">
              $21,588
            </div>
            <div className="mt-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-[#03241E]/55 font-medium leading-tight">
              per hotel · per year
            </div>
            <div className="mt-1 text-[10px] md:text-[11px] text-[#03241E]/45 italic tabular-nums">
              ($1,799/mo × 12)
            </div>
          </div>

          {/* × */}
          <div className="text-center">
            <div className="font-serif text-[28px] md:text-[44px] text-[#03241E]/35 leading-none">
              ×
            </div>
            <div className="mt-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-[#03241E]/45 font-medium">
              hotels
            </div>
          </div>

          {/* Hotel count */}
          <div className="text-center">
            <div className="font-serif text-[28px] md:text-[44px] tabular-nums text-[#03241E] leading-none">
              40,000
            </div>
            <div className="mt-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-[#03241E]/55 font-medium leading-tight">
              US small &amp; mid hotels
            </div>
            <div className="mt-1 text-[10px] md:text-[11px] text-[#03241E]/45 italic">
              (AHLA · STR 2025)
            </div>
          </div>
        </div>

        {/* Trajectory: Year 1 → Year 3 */}
        <div className="mt-10 md:mt-12 grid sm:grid-cols-2 gap-3 md:gap-4 max-w-3xl mx-auto">
          <div className="rounded-2xl bg-[#F7F3EC] border border-[#03241E]/12 px-5 py-4 md:px-6 md:py-5">
            <div className="font-mono text-[11px] tracking-[0.22em] text-[#03241E]/55 font-semibold mb-2">
              Year 1 target
            </div>
            <div className="font-serif text-[32px] md:text-[40px] tabular-nums text-[#03241E] leading-none mb-2">
              $2.16M
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#03241E]/60 font-medium tabular-nums">
              100 hotels × $21,588
            </div>
          </div>

          <div className="rounded-2xl bg-[#03241E] text-[#FDFBF7] px-5 py-4 md:px-6 md:py-5 shadow-[0_30px_60px_-25px_rgba(3,36,30,0.5)]">
            <div className="font-mono text-[11px] tracking-[0.22em] text-[#F2C62C] font-semibold mb-2">
              Year 3 target
            </div>
            <div className="font-serif text-[32px] md:text-[40px] tabular-nums text-[#FDFBF7] leading-none mb-2">
              $22M
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#F7F3EC]/70 font-medium tabular-nums">
              1,000 hotels × $21,588
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 06 — Business model ──────────────────────────────────────── */

function Slide06BusinessModel() {
  const rows = [
    { label: 'Monthly', value: '$1,799 / property' },
    { label: 'Annual', value: '$17,990 (2 months free)' },
    { label: 'Onboarding', value: '$2,500 one-time' },
    { label: 'Overage', value: '$1.25 / call > 2,000 / mo' },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={5} />
        <Eyebrow>Business model</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-[#03241E] mb-10 text-balance max-w-[22ch]">
          One plan per property. <em className="italic font-light"><Highlight>~3-month payback.</Highlight></em>
        </h2>

        <div className="grid md:grid-cols-[1fr_1fr] gap-8 md:gap-12 items-start">
          {/* Pricing rows */}
          <div className="rounded-3xl bg-white border border-[#03241E]/10 overflow-hidden shadow-[0_30px_80px_-40px_rgba(3,36,30,0.18)]">
            {rows.map((r, i) => (
              <div
                key={r.label}
                className={`px-6 py-4 flex items-center justify-between gap-6 ${
                  i < rows.length - 1 ? 'border-b border-[#EDE7DC]' : ''
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#03241E]/60 font-medium">
                  {r.label}
                </div>
                <div className="font-serif text-[17px] md:text-[20px] text-[#03241E] tabular-nums">
                  {r.value}
                </div>
              </div>
            ))}
          </div>

          {/* Unit economics */}
          <div className="grid grid-cols-3 gap-4">
            <FinStat value="$30K" label="LTV (5-yr)" />
            <FinStat value="$1.5K" label="CAC" />
            <FinStat value="~3 mo" label="Payback" emphasis />
          </div>
        </div>

      </div>
    </Slide>
  );
}

function FinStat({
  value,
  label,
  detail,
  emphasis = false,
}: {
  value: string;
  label: string;
  detail?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 md:p-6 ${emphasis ? 'bg-[#03241E] text-[#FDFBF7]' : 'bg-[#FDFBF7] border border-[#03241E]/10'}`}>
      <div className={`font-serif text-[34px] md:text-[48px] font-normal tracking-[-0.025em] leading-[0.95] mb-3 tabular-nums ${emphasis ? 'text-[#FDFBF7]' : 'text-[#03241E]'}`}>
        {value}
      </div>
      <div className={`text-[10px] uppercase tracking-[0.22em] font-medium mb-1.5 ${emphasis ? 'text-[#F7F3EC]/75' : 'text-[#03241E]/60'}`}>
        {label}
      </div>
      {detail ? (
        <p className={`text-[12px] leading-[1.5] text-pretty ${emphasis ? 'text-[#F7F3EC]/75' : 'text-[#554E43]/85'}`}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

/* ─── Slide 08 — Go to market ────────────────────────────────────────── */

function Slide08GoToMarket() {
  const waves = [
    { n: '1', title: 'Independent hotels', when: '2026', target: '5 → 25 paid' },
    { n: '2', title: 'Franchised properties', when: '2026 – 2027', target: '25 → 250' },
    { n: '3', title: 'Direct chain partnerships', when: '2028+', target: '1,000+' },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={6} />
        <Eyebrow>Go to market</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-[#03241E] max-w-[22ch] mb-8 text-balance">
          Start with <Highlight>independents</Highlight>. <em className="italic font-light">Expand into chains.</em>
        </h2>

        {/* Cincinnati pilot interest */}
        <div className="mb-10 rounded-2xl bg-[#03241E] text-[#FDFBF7] px-5 py-4 md:px-6 md:py-5 inline-flex items-center gap-4">
          <div className="font-serif text-[32px] md:text-[40px] tabular-nums text-[#F2C62C] leading-none">5</div>
          <div className="text-[11px] md:text-[12px] uppercase tracking-[0.22em] text-[#F7F3EC]/80 font-medium leading-tight">
            Cincinnati pilots<br />signed · May 2026
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {waves.map((w) => (
            <div key={w.n} className="rounded-2xl bg-white border border-[#03241E]/10 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="font-mono text-[10px] tracking-[0.22em] text-[#073A2F] font-semibold">
                  WAVE {w.n}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#03241E]/45 font-medium">{w.when}</div>
              </div>
              <h3 className="font-serif text-[22px] md:text-[26px] font-normal tracking-[-0.015em] leading-[1.15] text-[#03241E] mb-5">
                {w.title}
              </h3>
              <div className="pt-3 border-t border-[#EDE7DC] text-[10px] uppercase tracking-[0.22em] text-[#03241E]/55 font-medium">
                <span className="text-[#03241E] font-semibold">{w.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 09 — Competitors (single contrarian thesis) ──────────────── */

function Slide10Competition() {
  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={7} />
        <Eyebrow>What others miss</Eyebrow>

        <h2 className="font-serif text-[40px] md:text-[60px] lg:text-[72px] font-normal tracking-[-0.025em] leading-[1.08] text-[#03241E] max-w-[24ch] text-balance">
          Everyone's racing to <em className="italic font-light">replace text</em>. We built voice AI for the <Highlight>40,000 US hotels</Highlight> where the phone is still the front desk.
        </h2>
      </div>
    </Slide>
  );
}

/* ─── Slide 10 — Team ───────────────────────────────────────────────── */

function Slide12Team() {
  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={8} />
        <Eyebrow>Team</Eyebrow>
        <h2 className="font-serif text-[40px] md:text-[56px] font-normal tracking-[-0.025em] leading-[1.04] text-[#03241E] max-w-[22ch] mb-12 text-balance">
          Built by people who <em className="italic font-light">lived the problem.</em>
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <TeamCard
            initial="R"
            name="Rakhmatjon"
            role="Founder · CEO"
            bio={
              <>
                3+ years US hotel ops · 20+ Cincinnati hotel network · UC grad
              </>
            }
          />
          <TeamCard
            initial="N"
            name="Nurislombek"
            role="CTO"
            bio={
              <>
                Serial founder · OYGUL (1M+ users) · OY: Tickets ($60K in 2 mo) · 2024 President Tech Award
              </>
            }
          />
        </div>

        {/* Prior wins ribbon — Nurislombek's track record */}
        <div className="mt-8 pt-6 border-t border-[#03241E]/10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#03241E]/55 font-medium mb-4">
            Prior wins · Nurislombek
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '2024 President Tech Award', detail: '$100K grant' },
              { label: 'OYGUL', detail: '1M+ users in 8 months' },
              { label: 'OY: Tickets', detail: '$60K in 2 months' },
              { label: 'Press', detail: 'The Tech · Pivot · DB' },
            ].map((w) => (
              <div key={w.label} className="rounded-xl border border-[#03241E]/10 bg-white px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#03241E]/65 font-semibold mb-1">
                  {w.label}
                </div>
                <div className="text-[12px] text-[#03241E]/75 leading-snug">{w.detail}</div>
              </div>
            ))}
          </div>
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
    <div className="rounded-3xl bg-white border border-[#03241E]/10 p-7 md:p-8 shadow-[0_20px_60px_-35px_rgba(3,36,30,0.18)]">
      <div className="flex items-center gap-4 mb-5">
        <div className="h-14 w-14 rounded-full bg-[#03241E] text-[#FDFBF7] grid place-items-center font-serif text-xl">
          {initial}
        </div>
        <div>
          <div className="font-serif text-[22px] text-[#03241E] leading-tight">{name}</div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-[#03241E]/55 font-medium mt-1">
            {role}
          </div>
        </div>
      </div>
      <p className="text-[14px] text-[#554E43] leading-[1.6] text-pretty">{bio}</p>
    </div>
  );
}

/* ─── Slide 11 — Thank you ──────────────────────────────────────────── */

function SlideThankYou() {
  return (
    <section className="film-grain relative h-full w-full bg-[#03241E] text-[#FDFBF7] flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={9} dark />

        <ArryveMark className="h-14 md:h-20 mb-10 opacity-90" invert />

        <h2 className="font-serif text-[80px] md:text-[140px] lg:text-[168px] font-normal tracking-[-0.04em] leading-[0.9] text-[#FDFBF7] mb-10">
          Thank <em className="italic font-light">you.</em>
        </h2>

        <p className="font-serif text-[22px] md:text-[30px] font-light italic text-[#F7F3EC]/75 max-w-[34ch] leading-[1.25] mb-12 text-pretty">
          A better arrival starts with the <Highlight dark>first call</Highlight>.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] md:text-[14px] text-[#F7F3EC]/75">
          <a href="mailto:contact@tryarryve.com" className="text-[#FDFBF7] font-medium hover:text-[#F2C62C] transition-colors">
            contact@tryarryve.com
          </a>
          <span className="text-[#F7F3EC]/30">·</span>
          <span>tryarryve.com</span>
        </div>
      </div>
    </section>
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
        <div className="absolute top-8 right-10 text-[10px] uppercase tracking-[0.28em] text-[#03241E]/35 font-mono tabular-nums">
          Appendix
        </div>
        <Eyebrow>Exit strategy</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-[#03241E] max-w-[20ch] mb-10 text-balance">
          Multiple credible buyers. <em className="italic font-light">3–5 year window.</em>
        </h2>

        <div className="grid md:grid-cols-2 gap-5 mb-8">
          {acquirers.map((a) => (
            <div key={a.name} className="rounded-2xl bg-white border border-[#03241E]/10 p-6 flex gap-5 items-start">
              <div className="flex flex-col gap-2 pt-1 flex-shrink-0">
                {a.brands.map((b) => (
                  <BrandLogo key={b.name} domain={b.domain} name={b.name} size="md" />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-[22px] text-[#03241E] mb-2">{a.name}</div>
                <p className="text-[14px] text-[#03241E]/75 leading-[1.55] text-pretty">{a.thesis}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-[#03241E]/15 grid md:grid-cols-2 gap-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#03241E]/55 font-medium mb-3">Comparable exits</div>
            <p className="text-[14px] text-[#554E43] leading-[1.55] max-w-md text-pretty">
              ALICE → Actabl (2021) · Cendyn → Accor-Sapient · Duetto → GrowthCurve ($270M, 2022) · MeetingPackage → Lightspeed
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#03241E]/55 font-medium mb-3">Target outcome</div>
            <p className="font-serif text-[24px] md:text-[28px] font-light italic leading-[1.25] text-[#03241E] text-pretty">
              <Highlight>$150M–$500M acquisition</Highlight>, 3–5 years.
            </p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

