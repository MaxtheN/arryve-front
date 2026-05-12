import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

/* ─── Design tokens (match landing page) ───────────────────────────────
   forest-950  #03241E  — dark bg / headlines on light
   forest-900  #073A2F  — accent dark
   ivory-50    #FDFBF7  — light bg primary
   ivory-100   #F7F3EC  — light bg secondary
   ivory-200   #EDE7DC  — hairlines / dividers
   ivory-700   #554E43  — body text on light
   Fonts: Fraunces (serif display), Inter (sans body)
────────────────────────────────────────────────────────────────────── */

const MAIN_SLIDES = 9; // Main flow. Appendix (Exit) sits at index 9, reachable via End.
const APPENDIX_INDEX = 9;
const TOTAL_WITH_APPENDIX = 10;

export default function PitchDeckRu() {
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
        aria-label="Предыдущий слайд"
      >
        <ArrowLeft className="w-4 h-4 text-forest-950" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={current === total - 1 || onAppendix}
        className="deck-chrome fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-forest-950/10 hover:bg-forest-950/20 disabled:opacity-0 disabled:pointer-events-none transition backdrop-blur-sm"
        aria-label="Следующий слайд"
      >
        <ArrowRight className="w-4 h-4 text-forest-950" />
      </button>

      <div className="deck-chrome fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-ivory-50/90 backdrop-blur-md border border-forest-950/10 rounded-full px-4 py-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium tabular-nums">
          {onAppendix
            ? 'Прилож.'
            : `${String(current + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
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
          <button
            type="button"
            onClick={() => onJump(appendixIndex)}
            title="Приложение (клавиша End)"
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
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={1} dark />
        <Eyebrow dark>Сид · 2026</Eyebrow>

        <ArryveMark className="h-28 md:h-36 lg:h-44 mb-6" invert />

        <p className="font-serif text-[26px] md:text-[36px] font-normal text-ivory-50 leading-[1.15] mb-3 max-w-[26ch] text-balance">
          <Highlight dark>ИИ-ресепшен</Highlight> для отелей.
        </p>
        <p className="font-serif text-[18px] md:text-[24px] font-light italic text-ivory-100/75 max-w-[28ch] leading-[1.25]">
          Лучший приезд начинается с первого звонка.
        </p>

        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ivory-100/75">
          <span className="font-medium text-ivory-50">Rakhmatjon</span>
          <span className="text-ivory-100/40">Основатель</span>
          <span className="text-ivory-100/30">·</span>
          <span className="font-medium text-ivory-50">Nurislombek</span>
          <span className="text-ivory-100/40">Технический сооснователь</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Slide 02 — Problem ─────────────────────────────────────────────── */

function Slide02Problem() {
  const stats = [
    {
      big: <>1 <span className="italic font-light text-forest-950/75">из</span> 3</>,
      label: 'звонков гостей без ответа',
    },
    {
      big: <>$12<span className="italic font-light text-forest-950/75 text-[0.6em] align-top ml-1">тыс</span></>,
      label: 'потерянных бронирований / мес',
    },
    {
      big: <>2,5<span className="italic font-light text-forest-950/75 text-[0.5em] align-baseline ml-2">ч</span></>,
      label: 'персонала на FAQ / день',
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={2} />
        <Eyebrow>Проблема</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[72px] font-normal tracking-[-0.025em] leading-[1.02] text-forest-950 max-w-[20ch] mb-14 text-balance">
          Отели теряют брони <em className="italic font-light"><Highlight>каждый час, что звонит телефон</Highlight>.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-10 md:gap-14 mb-12">
          {stats.map((s, i) => (
            <div key={i} className="border-t-2 border-forest-950/20 pt-6">
              <div className="font-serif text-[72px] md:text-[96px] font-normal tracking-[-0.035em] leading-[0.9] text-forest-950 mb-4">
                {s.big}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/75 font-semibold">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Why now — two tailwinds */}
        <div className="pt-6 border-t border-forest-950/10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/55 font-semibold mb-3">
            Почему сейчас
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] md:text-[14px] text-forest-950/75">
            <span><span className="text-forest-950 font-medium">Голосовой ИИ</span> перешагнул черту реалистичности.</span>
            <span className="text-forest-950/30">·</span>
            <span><span className="text-forest-950 font-medium">Гостиничный персонал</span> в структурном дефиците.</span>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Slide 03 — Solution (combined with Arvy) ───────────────────────── */

function SlideSolution() {
  const transcript = [
    { who: 'Гость', text: 'У вас есть номер с king-size кроватью на сегодня?' },
    { who: 'Arvy', text: 'Один king за $189, завтрак включён. На чьё имя?' },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={3} />
        <Eyebrow>Решение</Eyebrow>

        <h2 className="font-serif text-[44px] md:text-[68px] lg:text-[80px] font-normal tracking-[-0.03em] leading-[0.95] text-forest-950 mb-12 text-balance max-w-[18ch]">
          <Highlight>ИИ-ресепшен</Highlight>, который <em className="italic font-light">никогда не спит.</em>
        </h2>

        <div className="grid md:grid-cols-[1fr_1.05fr] gap-10 items-start">
          <div>
            <ul className="space-y-4 text-[16px] md:text-[18px] text-forest-950/85 leading-[1.4]">
              {[
                <>Отвечает на каждый звонок, 24/7 — в тоне вашего отеля</>,
                <>Обновляет вашу PMS — брони, профили, тикеты</>,
                <>Передаёт персоналу с полным контекстом</>,
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-forest-900 mt-1 flex-shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Live call card */}
          <div className="rounded-3xl bg-white border border-forest-950/10 shadow-[0_40px_120px_-40px_rgba(3,36,30,0.28)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ivory-200">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-forest-950/70 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-900 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-900" />
                </span>
                Звонок в эфире
              </div>
              <div className="text-[11px] text-ivory-600 tabular-nums">11:42 PM</div>
            </div>
            <div className="px-6 py-6 space-y-4">
              {transcript.map((t, j) => (
                <div key={j}>
                  <div className="text-[9px] uppercase tracking-[0.22em] text-forest-950/50 font-medium mb-1">
                    {t.who}
                  </div>
                  <p className="text-[15px] text-forest-950/90 leading-[1.5]">{t.text}</p>
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
        <Eyebrow>Анализ рынка · финансовая модель</Eyebrow>
        <h2 className="font-serif text-[36px] md:text-[48px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 mb-2 text-balance max-w-[24ch]">
          Как мы зарабатываем — <em className="italic font-light">математика.</em>
        </h2>

        {/* Hero number */}
        <div className="mt-8 md:mt-10 text-center">
          <div className="font-serif text-[88px] md:text-[152px] lg:text-[192px] font-normal tracking-[-0.045em] leading-[0.85] text-forest-950 tabular-nums">
            $860M
          </div>
          <div className="mt-3 text-[11px] md:text-[12px] uppercase tracking-[0.24em] text-forest-950/55 font-semibold">
            Годовая выручка · TAM США
          </div>
        </div>

        {/* Explicit equation: $21,588/yr × 40,000 hotels = $860M */}
        <div className="mt-10 md:mt-12 grid grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto items-center">
          {/* Per-hotel annual */}
          <div className="text-center">
            <div className="font-serif text-[28px] md:text-[44px] tabular-nums text-forest-950 leading-none">
              $21 588
            </div>
            <div className="mt-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-forest-950/55 font-medium leading-tight">
              на отель · в год
            </div>
            <div className="mt-1 text-[10px] md:text-[11px] text-forest-950/45 italic tabular-nums">
              ($1 799/мес × 12)
            </div>
          </div>

          {/* × */}
          <div className="text-center">
            <div className="font-serif text-[28px] md:text-[44px] text-forest-950/35 leading-none">
              ×
            </div>
            <div className="mt-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-forest-950/45 font-medium">
              отелей
            </div>
          </div>

          {/* Hotel count */}
          <div className="text-center">
            <div className="font-serif text-[28px] md:text-[44px] tabular-nums text-forest-950 leading-none">
              40 000
            </div>
            <div className="mt-2 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-forest-950/55 font-medium leading-tight">
              малые и средние отели США
            </div>
            <div className="mt-1 text-[10px] md:text-[11px] text-forest-950/45 italic">
              (AHLA · STR 2025)
            </div>
          </div>
        </div>

        {/* Trajectory: Year 1 → Year 3 */}
        <div className="mt-10 md:mt-12 grid sm:grid-cols-2 gap-3 md:gap-4 max-w-3xl mx-auto">
          <div className="rounded-2xl bg-ivory-100 border border-forest-950/12 px-5 py-4 md:px-6 md:py-5">
            <div className="font-mono text-[11px] tracking-[0.22em] text-forest-950/55 font-semibold mb-2">
              Цель Год 1
            </div>
            <div className="font-serif text-[32px] md:text-[40px] tabular-nums text-forest-950 leading-none mb-2">
              $2,16M
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-forest-950/60 font-medium tabular-nums">
              100 отелей × $21 588
            </div>
          </div>

          <div className="rounded-2xl bg-forest-950 text-ivory-50 px-5 py-4 md:px-6 md:py-5 shadow-[0_30px_60px_-25px_rgba(3,36,30,0.5)]">
            <div className="font-mono text-[11px] tracking-[0.22em] text-acid-400 font-semibold mb-2">
              Цель Год 3
            </div>
            <div className="font-serif text-[32px] md:text-[40px] tabular-nums text-ivory-50 leading-none mb-2">
              $22M
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-ivory-100/70 font-medium tabular-nums">
              1 000 отелей × $21 588
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
    { label: 'Месяц', value: '$1 799 / объект' },
    { label: 'Год', value: '$17 990 (2 месяца бесплатно)' },
    { label: 'Внедрение', value: '$2 500 разово' },
    { label: 'Сверх лимита', value: '$1,25 / звонок > 2 000 / мес' },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={5} />
        <Eyebrow>Бизнес-модель</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 mb-10 text-balance max-w-[22ch]">
          Один план на объект. <em className="italic font-light"><Highlight>Окупаемость ~3 месяца.</Highlight></em>
        </h2>

        <div className="grid md:grid-cols-[1fr_1fr] gap-8 md:gap-12 items-start">
          {/* Pricing rows */}
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

          {/* Unit economics */}
          <div className="grid grid-cols-3 gap-4">
            <FinStat value="$30K" label="LTV (5 лет)" />
            <FinStat value="$1,5K" label="CAC" />
            <FinStat value="~3 мес" label="Окупаемость" emphasis />
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
    <div className={`rounded-2xl p-5 md:p-6 ${emphasis ? 'bg-forest-950 text-ivory-50' : 'bg-ivory-50 border border-forest-950/10'}`}>
      <div className={`font-serif text-[34px] md:text-[48px] font-normal tracking-[-0.025em] leading-[0.95] mb-3 tabular-nums ${emphasis ? 'text-ivory-50' : 'text-forest-950'}`}>
        {value}
      </div>
      <div className={`text-[10px] uppercase tracking-[0.22em] font-medium mb-1.5 ${emphasis ? 'text-ivory-100/75' : 'text-forest-950/60'}`}>
        {label}
      </div>
      {detail ? (
        <p className={`text-[12px] leading-[1.5] text-pretty ${emphasis ? 'text-ivory-100/75' : 'text-ivory-700/85'}`}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

/* ─── Slide 08 — Go to market ────────────────────────────────────────── */

function Slide08GoToMarket() {
  const waves = [
    { n: '1', title: 'Независимые отели', when: '2026', target: '5 → 25 платящих' },
    { n: '2', title: 'Франшизные объекты', when: '2026 – 2027', target: '25 → 250' },
    { n: '3', title: 'Прямые партнёрства с сетями', when: '2028+', target: '1 000+' },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={6} />
        <Eyebrow>Выход на рынок</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-8 text-balance">
          Начинаем с <Highlight>независимых</Highlight>. <em className="italic font-light">Расширяемся в сети.</em>
        </h2>

        {/* Cincinnati pilot interest */}
        <div className="mb-10 rounded-2xl bg-forest-950 text-ivory-50 px-5 py-4 md:px-6 md:py-5 inline-flex items-center gap-4">
          <div className="font-serif text-[32px] md:text-[40px] tabular-nums text-acid-400 leading-none">5</div>
          <div className="text-[11px] md:text-[12px] uppercase tracking-[0.22em] text-ivory-100/80 font-medium leading-tight">
            Пилотов в Цинциннати<br />подписано · Май 2026
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {waves.map((w) => (
            <div key={w.n} className="rounded-2xl bg-white border border-forest-950/10 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="font-mono text-[10px] tracking-[0.22em] text-forest-900 font-semibold">
                  ВОЛНА {w.n}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-forest-950/45 font-medium">{w.when}</div>
              </div>
              <h3 className="font-serif text-[22px] md:text-[26px] font-normal tracking-[-0.015em] leading-[1.15] text-forest-950 mb-5">
                {w.title}
              </h3>
              <div className="pt-3 border-t border-ivory-200 text-[10px] uppercase tracking-[0.22em] text-forest-950/55 font-medium">
                <span className="text-forest-950 font-semibold">{w.target}</span>
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
        <Eyebrow>Что упускают другие</Eyebrow>

        <h2 className="font-serif text-[40px] md:text-[60px] lg:text-[72px] font-normal tracking-[-0.025em] leading-[1.08] text-forest-950 max-w-[24ch] text-balance">
          Все спешат <em className="italic font-light">заменить переписку</em>. Мы построили голосовой ИИ для <Highlight>40 000 отелей США</Highlight>, где телефон по-прежнему — это ресепшен.
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
        <Eyebrow>Команда</Eyebrow>
        <h2 className="font-serif text-[40px] md:text-[56px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-12 text-balance">
          Построено людьми, которые <em className="italic font-light">жили этой проблемой.</em>
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <TeamCard
            initial="R"
            name="Rakhmatjon"
            role="Основатель · CEO"
            bio={
              <>
                3+ года в гостиничных операциях США · сеть 20+ отелей в Цинциннати · выпускник UC · англ/узб/рус
              </>
            }
          />
          <TeamCard
            initial="N"
            name="Nurislombek"
            role="CTO"
            bio={
              <>
                Серийный основатель · OYGUL (1M+ пользователей) · OY: Tickets ($60K за 2 мес) · 2024 Президентская техпремия
              </>
            }
          />
        </div>

        {/* Prior wins ribbon — Nurislombek's track record */}
        <div className="mt-8 pt-6 border-t border-forest-950/10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-4">
            Прошлые победы · Nurislombek
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '2024 Президентская техпремия', detail: 'Грант $100K' },
              { label: 'OYGUL', detail: '1M+ пользователей за 8 месяцев' },
              { label: 'OY: Tickets', detail: '$60K за 2 месяца' },
              { label: 'Пресса', detail: 'The Tech · Pivot · DB' },
            ].map((w) => (
              <div key={w.label} className="rounded-xl border border-forest-950/10 bg-white px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-forest-950/65 font-semibold mb-1">
                  {w.label}
                </div>
                <div className="text-[12px] text-forest-950/75 leading-snug">{w.detail}</div>
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

/* ─── Slide 11 — Thank you ──────────────────────────────────────────── */

function SlideThankYou() {
  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={9} dark />

        <ArryveMark className="h-14 md:h-20 mb-10 opacity-90" invert />

        <h2 className="font-serif text-[80px] md:text-[140px] lg:text-[168px] font-normal tracking-[-0.04em] leading-[0.9] text-ivory-50 mb-10">
          Спа<em className="italic font-light">сибо.</em>
        </h2>

        <p className="font-serif text-[22px] md:text-[30px] font-light italic text-ivory-100/75 max-w-[34ch] leading-[1.25] mb-12 text-pretty">
          Лучший приезд начинается с <Highlight dark>первого звонка</Highlight>.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] md:text-[14px] text-ivory-100/75">
          <a href="mailto:contact@tryarryve.com" className="text-ivory-50 font-medium hover:text-acid-400 transition-colors">
            contact@tryarryve.com
          </a>
          <span className="text-ivory-100/30">·</span>
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
      thesis: 'Голос дополняет их мессенджер. При ~10× ARR, $25M ARR → ~$250M exit.',
      brands: [{ domain: 'canarytechnologies.com', name: 'Canary Technologies' }],
    },
    {
      name: 'IHG Hotels & Resorts',
      thesis: '40% нашего TAM — франчайзи IHG. Прецедент покупки вертикального tech.',
      brands: [{ domain: 'ihg.com', name: 'IHG' }],
    },
    {
      name: 'Oracle Hospitality (Opera PMS)',
      thesis: 'Голос — недостающий слой стека Opera.',
      brands: [{ domain: 'oracle.com', name: 'Oracle' }],
    },
    {
      name: 'Cloudbeds · SiteMinder',
      thesis: 'Платформы дистрибуции добавляют голос в свой пакет.',
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
          Приложение
        </div>
        <Eyebrow>Стратегия выхода</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-10 text-balance">
          Несколько правдоподобных покупателей. <em className="italic font-light">Окно 3–5 лет.</em>
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
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-3">Сопоставимые выходы</div>
            <p className="text-[14px] text-ivory-700 leading-[1.55] max-w-md text-pretty">
              ALICE → Actabl (2021) · Cendyn → Accor-Sapient · Duetto → GrowthCurve ($270M, 2022) · MeetingPackage → Lightspeed
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-3">Целевой исход</div>
            <p className="font-serif text-[24px] md:text-[28px] font-light italic leading-[1.25] text-forest-950 text-pretty">
              <Highlight>Сделка $150M–$500M</Highlight>, 3–5 лет.
            </p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

