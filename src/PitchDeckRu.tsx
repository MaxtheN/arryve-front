import React, { useCallback, useEffect, useRef, useState } from 'react';
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

/* Russian translation of PitchDeck.tsx — structure / styles identical,
   only user-facing text translated. Brand names (Arryve, Arvy, OY: Tickets,
   OYGUL, HotelKey, Opera, Cloudbeds, Mews, Twilio, Stayntouch, etc.) and
   numeric tokens kept as-is. */

import { playArvyVoice, stopArvyVoice, VOICES } from './voice';

const MAIN_SLIDES = 11;
const APPENDIX_INDEX = 11;
const TOTAL_WITH_APPENDIX = 12;

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

  const slides = [
    Slide01Title,
    Slide02WhatWeDo,
    Slide12Team,
    Slide02Problem,
    Slide05WhyNow,
    Slide06SolutionDemo,
    Slide07Market,
    Slide09BusinessModel,
    Slide08GoToMarket,
    Slide10Competition,
    Slide15Ask,
    Slide14Exit,
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
            ? 'Приложение'
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
              aria-label={`Перейти к слайду ${i + 1}`}
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
            aria-label={`Перейти к приложению (слайд ${totalWithAppendix})`}
          >
            +1
          </button>
        </div>
      </div>
    </>
  );
}

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

/* ─── Слайд 01 — Титульный ─────────────────────────────────────────── */

function Slide01Title() {
  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={1} dark />
        <Eyebrow dark>Посевной раунд · 2026</Eyebrow>

        <ArryveMark className="h-28 md:h-36 lg:h-44 mb-8" invert />

        <p className="font-serif text-[28px] md:text-[40px] font-light italic text-ivory-50 mt-2 max-w-[22ch] leading-[1.15] text-balance">
          Лучшее прибытие начинается с <Highlight dark>первого звонка</Highlight>.
        </p>
        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ivory-100/75">
          <span className="font-medium text-ivory-50">Рахматжон</span>
          <span className="text-ivory-100/40">Основатель</span>
          <span className="text-ivory-100/30">·</span>
          <span className="font-medium text-ivory-50">Нурислом</span>
          <span className="text-ivory-100/40">Технический сооснователь</span>
          <span className="text-ivory-100/30">·</span>
          <span className="text-ivory-100/60">Цинциннати, Огайо</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Слайд 02 — Чем мы занимаемся ─────────────────────────────────── */

function Slide02WhatWeDo() {
  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={2} />
        <Eyebrow>Чем мы занимаемся</Eyebrow>

        <ArryveMark className="h-9 mb-10" />

        <h2 className="font-serif text-[48px] md:text-[68px] lg:text-[76px] font-normal tracking-[-0.025em] leading-[1.02] text-forest-950 max-w-[22ch] mb-8 text-balance">
          <Highlight>ИИ-голос ресепшн</Highlight> для небольших и средних отелей.
        </h2>

        <p className="font-serif text-[22px] md:text-[28px] font-light italic text-forest-950/80 leading-[1.3] max-w-[42ch] text-pretty mb-10">
          Каждый пропущенный звонок становится бронированием. Каждый рутинный вопрос обработан. Каждая эскалация приходит с контекстом.
        </p>

        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 font-medium">
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-950/20 bg-white/50 px-3 py-1.5">
            Holiday Inn Express
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-950/20 bg-white/50 px-3 py-1.5">
            Holiday Inn
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-950/20 bg-white/50 px-3 py-1.5">
            Независимые отели
          </span>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Слайд 04 — Проблема ───────────────────────────────────────────── */

function Slide02Problem() {
  const stats = [
    {
      big: <>1 <span className="italic font-light text-forest-950/75">из</span> 3</>,
      label: 'гостевых звонков без ответа',
      body: 'Загруженные смены. После часов. Каждый звонок уходит к OTA.',
    },
    {
      big: <>$12<span className="italic font-light text-forest-950/75 text-[0.6em] align-top ml-1">тыс</span></>,
      label: 'потерянных бронирований / месяц',
      body: 'На один отель в среднем. Растёт быстро.',
    },
    {
      big: <>2.5<span className="italic font-light text-forest-950/75 text-[0.5em] align-baseline ml-2">ч</span></>,
      label: 'времени персонала на FAQ / день',
      body: 'Парковка. Животные. Завтрак. Заселение. Каждый день.',
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={4} />
        <Eyebrow>Проблема</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[72px] font-normal tracking-[-0.025em] leading-[1.02] text-forest-950 max-w-[20ch] mb-14 text-balance">
          Отели теряют бронирования <em className="italic font-light"><Highlight>каждый час, пока звонит телефон</Highlight>.</em>
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
          А кол-центры стоят <span className="font-mono text-forest-950 font-medium">$2.50 за звонок</span> — они принимают сообщения, не закрывают бронирования, не видят PMS.
        </p>
      </div>
    </Slide>
  );
}

/* ─── Слайд 05 — Почему сейчас ─────────────────────────────────────── */

function Slide05WhyNow() {
  const curves = [
    {
      n: '01',
      title: 'Голосовой ИИ перешёл рубеж.',
      body: "Задержка стриминга меньше 300мс. Естественная интонация. Гость не отличит — и ему всё равно.",
    },
    {
      n: '02',
      title: 'PMS API наконец открылись.',
      body: 'HotelKey, Opera, Cloudbeds, Mews — стабильны, документированы, больше не закрыты только для корпоративных интеграций.',
    },
    {
      n: '03',
      title: 'Кадровый дефицит в гостиницах структурный.',
      body: "Зарплаты ресепшн выросли на 25%+ после COVID. Недокомплект в малых отелях — не цикл, это новая норма.",
    },
  ];

  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={5} />
        <Eyebrow>Почему сейчас</Eyebrow>
        <h2 className="font-serif text-[42px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-14 text-balance">
          Три кривые пересеклись за последние <em className="italic font-light">18 месяцев.</em>
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
          Малые отели не могли позволить себе ни кол-центры, <span className="not-italic font-sans">ни</span> корпоративный ИИ. <Highlight>Теперь у них есть и то, и другое — в одной линии.</Highlight>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Слайд 06 — Решение + демо ────────────────────────────────────── */

function Slide06SolutionDemo() {
  const scenarios = [
    {
      n: '01',
      label: 'Новое бронирование',
      title: 'Бронирование, записанное в PMS вживую.',
      transcript: [
        { who: 'Гость', text: 'Есть ли у вас номер с king-size кроватью на сегодня?' },
        { who: 'Arvy', text: 'Один номер king за $189, завтрак включён. На какое имя?' },
      ],
      outcome: 'Бронирование закрыто',
      meta: '0:42 · синхронизировано',
    },
    {
      n: '02',
      label: 'Постоянный гость',
      title: 'Профиль и история проживаний — в реальном времени.',
      transcript: [
        { who: 'Гость', text: 'Здравствуйте, это Сара Чен — подтверждаю субботу?' },
        { who: 'Arvy', text: 'С возвращением, госпожа Чен. King-сьют, заселение в 15:00. Шаттл, как в прошлый раз?' },
      ],
      outcome: 'Подтверждено',
      meta: '0:28 · без перевода',
    },
    {
      n: '03',
      label: 'Эскалация',
      title: 'Переведён — с уже сделанной пометкой.',
      transcript: [
        { who: 'Гость', text: 'Можете разбить наш счёт на три части?' },
        { who: 'Arvy', text: 'Запишу это в бронирование и переведу вас.' },
      ],
      outcome: 'Передан',
      meta: '0:16 · на доб. 100',
    },
  ];

  const [active, setActive] = useState(0);
  const s = scenarios[active];
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleHearArvy = () => {
    if (isSpeaking) {
      stopArvyVoice();
      setIsSpeaking(false);
      return;
    }
    playArvyVoice(VOICES.hero, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={6} />
        <Eyebrow>Решение</Eyebrow>

        <h2 className="font-serif text-[42px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.0] text-forest-950 mb-4 text-balance max-w-[24ch]">
          Знакомьтесь, <em className="italic font-light">Arvy</em> — ИИ-голос, который <Highlight>отвечает на каждый гостевой звонок</Highlight>.
        </h2>

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
          <div>
            <h3 className="font-serif text-[22px] md:text-[26px] font-normal tracking-[-0.015em] leading-[1.2] text-forest-950 mb-5 text-pretty">
              {s.title}
            </h3>
            <ul className="space-y-3 text-[14px] md:text-[15px] text-forest-950/85 leading-[1.45] mb-7">
              {[
                <>Каждый звонок, 24/7 — голосом вашего отеля</>,
                <>Закрывает бронирования <strong className="font-medium">вживую</strong> (пишет в ваш PMS)</>,
                <>Эскалирует с контекстом, когда нужен человек</>,
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
              aria-label={isSpeaking ? 'Остановить Arvy' : 'Послушать Arvy'}
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
                {isSpeaking ? 'Arvy говорит…' : 'Послушать Arvy'}
              </span>
            </button>

            <div className="pt-5 border-t border-forest-950/10">
              <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium mb-2.5">
                Работает с вашим PMS
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

          <div className="rounded-3xl bg-white border border-forest-950/10 shadow-[0_40px_120px_-40px_rgba(3,36,30,0.28)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ivory-200">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-forest-950/70 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-900 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-900" />
                </span>
                Звонок в эфире
              </div>
              <div className="text-[11px] text-ivory-600 tabular-nums">23:42</div>
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

/* ─── Слайд 07 — Рынок ─────────────────────────────────────────────── */

function Slide07Market() {
  return (
    <Slide tone="white">
      <div className="relative">
        <SlideNumber n={7} />
        <Eyebrow>Рынок</Eyebrow>
        <h2 className="font-serif text-[48px] md:text-[68px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 mb-14 text-balance max-w-[18ch]">
          Большой, <Highlight>незанятый сегмент</Highlight>.
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mb-10">
          <MarketStat
            value="~40К"
            label="Малые и средние отели США"
            detail="Независимые + франчайзи. (Всего в США: ~60К.)"
            emphasis={false}
          />
          <MarketStat
            value="$860М"
            label="TAM в США"
            detail="40К × $21,588/год по тарифу Property годовой."
            emphasis
          />
          <MarketStat
            value="~$320М"
            label="Краткосрочный SAM"
            detail="~15К работают на HotelKey / Opera / Cloudbeds / Mews."
            emphasis={false}
          />
        </div>

        <div className="pt-6 border-t border-forest-950/10 text-[15px] md:text-[17px] text-forest-950 font-serif italic font-light max-w-[60ch] text-pretty">
          Корпоративные решения недоступны для 80% отелей США. Кол-центры не закрывают сделки. <Highlight>Мы заходим именно там, где оба не справляются.</Highlight>
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

/* ─── Слайд 09 — Выход на рынок ────────────────────────────────────── */

function Slide08GoToMarket() {
  const waves = [
    {
      n: 'Волна 1',
      title: 'Узбекские отельеры в Цинциннати',
      body: (
        <>
          20+ отелей Рахматжона в Цинциннати открывают двери. Узбекская диаспора контролирует <span className="font-medium text-forest-950">100+ объектов HIE / Holiday Inn</span> по стране. Доверие &gt; холодные продажи.
        </>
      ),
      target: '10 платных пилотов',
      when: 'Q1–Q2 2026',
    },
    {
      n: 'Волна 2',
      title: 'Мост AAHOA',
      body: (
        <>
          Сеть AAHOA индийско-американских владельцев: <span className="font-medium text-forest-950">20,000+ отелей в США</span>. Тёплые интро от диаспоры к диаспоре из Волны 1 открывают следующий уровень.
        </>
      ),
      target: '50 платных отелей',
      when: 'Q3–Q4 2026',
    },
    {
      n: 'Волна 3',
      title: 'Совместный охват диаспор',
      body: (
        <>
          Узбекская + индийская сеть выводят нас на <Highlight>1,000+ отелей за 2–3 года</Highlight>. К этому моменту — в маркетплейсах HotelKey / Opera.
        </>
      ),
      target: '1,000+ отелей',
      when: '2027–2028',
    },
  ];

  return (
    <Slide tone="warm">
      <div className="relative">
        <SlideNumber n={9} />
        <Eyebrow>Выход на рынок</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[64px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-10 text-balance">
          Начинаем в Цинциннати. <em className="italic font-light">Растём через доверие.</em>
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
                Цель: <span className="text-forest-950">{w.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* ─── Слайд 08 — Бизнес-модель ─────────────────────────────────────── */

function Slide09BusinessModel() {
  const [calls, setCalls] = useState(40);
  const recovered = Math.round(calls * 30 * 0.33 * 0.15 * 150);
  const price = 1799;
  const roi = Math.max(1, Math.round(recovered / price));

  const rows = [
    { label: 'Месячный', value: '$1,799 / отель' },
    { label: 'Годовой', value: '$17,990 (2 месяца бесплатно)' },
    { label: 'Подключение', value: '$2,500 разово' },
    { label: 'Сверх лимита', value: '$1.25 / звонок свыше 2,000 / мес' },
  ];

  return (
    <Slide tone="light">
      <div className="relative grid md:grid-cols-[1fr_1.1fr] gap-14 md:gap-20 items-start">
        <SlideNumber n={8} />
        <div>
          <Eyebrow>Бизнес-модель</Eyebrow>
          <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 mb-8 text-balance">
            Один тариф, <em className="italic font-light">на каждый отель.</em>
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
            GTM через диаспору: CAC ~$1,500 · LTV ~$30K · окупаемость ~3 месяца.
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-forest-950/10 p-7 md:p-8 shadow-[0_30px_80px_-40px_rgba(3,36,30,0.18)]">
          <div className="flex items-baseline justify-between mb-6">
            <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
              Перетащите, чтобы увидеть ROI
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-forest-950/40">Оценочно</div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-7">
            <div>
              <div className="font-serif text-[40px] md:text-[52px] font-normal tracking-[-0.025em] leading-[0.95] text-forest-950 tabular-nums">
                ${recovered.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] md:text-[12px] text-forest-950/60 leading-snug">
                восстановленных бронирований / месяц
              </div>
            </div>
            <div>
              <div className="font-serif text-[40px] md:text-[52px] font-normal tracking-[-0.025em] leading-[0.95] text-forest-950 tabular-nums">
                <Highlight>≈ {roi}×</Highlight>
              </div>
              <div className="mt-2 text-[11px] md:text-[12px] text-forest-950/60 leading-snug">
                ROI vs. $1,799 / месяц
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="deck-calls-slider" className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
                Звонков в день
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

/* ─── Слайд 10 — Конкуренты ────────────────────────────────────────── */

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
      focus: 'Гостевые сообщения, апсейлы, цифровая регистрация',
      why: (
        <>
          Текст, не голос. Их <span className="font-medium text-forest-950">оценка ~$500M</span> валидирует категорию — мы владеем другой половиной.
        </>
      ),
      tone: 'ivory',
    },
    {
      brands: [{ name: 'Duve' }, { name: 'Mews AI' }],
      focus: 'Сообщения, встроенные в PMS',
      why: 'Тоже текст-first. Тот же разрыв на телефонной линии.',
      tone: 'ivory',
    },
    {
      brands: [{ name: 'iroomfinder' }, { name: 'InnRoad' }],
      focus: 'Человеческие кол-центры',
      why: (
        <>
          Дорого, медленно, не закрывают бронирования. <span className="font-medium text-forest-950">Прямой incumbent, которого мы заменяем.</span>
        </>
      ),
      tone: 'ivory',
    },
    {
      brands: [{ name: 'Bland AI' }, { name: 'Vapi' }, { name: 'Retell' }],
      focus: 'Горизонтальные платформы голосового ИИ',
      why: 'Нет вертикали гостеприимства, нет интеграции с PMS, нет отраслевых сценариев. DIY-инструменты — не продукт.',
      tone: 'ivory',
    },
    {
      brands: [{ name: 'Arryve' }],
      focus: 'Voice-first · специализация на гостеприимстве · цена для малых отелей',
      why: <Highlight dark>Белое пятно. Здесь больше никого.</Highlight>,
      tone: 'dark',
      isArryve: true,
    },
  ];

  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={10} />
        <Eyebrow>Конкурентная среда</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[22ch] mb-10 text-balance">
          Категория подтверждена. <em className="italic font-light">Наша полоса пустая.</em>
        </h2>

        <div className="rounded-3xl overflow-hidden border border-forest-950/10 bg-white shadow-[0_30px_80px_-40px_rgba(3,36,30,0.15)]">
          <div className="hidden md:grid grid-cols-[1.3fr_1.3fr_2fr] bg-ivory-100 border-b border-forest-950/10 px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-forest-950/65 font-semibold">
            <div>Игрок</div>
            <div>Фокус</div>
            <div>Почему мы выигрываем / позиция</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              className={`flex flex-col gap-3 md:grid md:grid-cols-[1.3fr_1.3fr_2fr] px-5 md:px-6 py-5 border-b border-ivory-200 last:border-0 md:gap-4 md:items-center ${
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
                <span className={`md:hidden text-[10px] uppercase tracking-[0.2em] font-semibold block mb-1 ${r.tone === 'dark' ? 'text-ivory-50/60' : 'text-forest-950/50'}`}>Фокус</span>
                {r.focus}
              </div>
              <div className={`text-[13px] leading-[1.55] ${r.tone === 'dark' ? 'text-ivory-50' : 'text-forest-950/85'}`}>
                <span className={`md:hidden text-[10px] uppercase tracking-[0.2em] font-semibold block mb-1 ${r.tone === 'dark' ? 'text-ivory-50/60' : 'text-forest-950/50'}`}>Почему мы выигрываем</span>
                {r.why}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

/* ─── Слайд 11 — Тракшен (отключён) ────────────────────────────────── */

function Slide11Traction() {
  const [count, setCount] = useState(() => 5284 + Math.floor(Math.random() * 30));
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = setInterval(() => setCount((c) => c + 1), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-40" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={8} dark />
        <Eyebrow dark>Тракшен</Eyebrow>
        <h2 className="font-serif text-[44px] md:text-[60px] font-normal tracking-[-0.025em] leading-[1.04] text-ivory-50 max-w-[20ch] mb-10 text-balance">
          Ранние сигналы из <em className="italic font-light">реального мира</em>.
        </h2>

        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 mb-10">
          <div className="font-serif text-[56px] md:text-[80px] font-normal tracking-[-0.03em] leading-[0.9] text-ivory-50 tabular-nums">
            {count.toLocaleString()}
          </div>
          <div className="text-[13px] text-ivory-100/75 leading-[1.5] max-w-xs">
            гостевых звонков обработано на этой неделе
            <span className="inline-flex items-center gap-1 ml-3 text-ivory-100/55">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ivory-100 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ivory-100/80" />
              </span>
              в эфире
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8 pt-6 border-t border-ivory-100/15">
          {[
            { v: <FillIn>N</FillIn>, l: 'Платных пилотов' },
            { v: <FillIn>$X</FillIn>, l: 'MRR' },
            { v: <FillIn>N</FillIn>, l: 'Звонков / месяц' },
            { v: <FillIn>$X</FillIn>, l: 'Бронирований закрыто' },
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
            "<FillIn>Arvy поймал бронь на $640 в 2 ночи, которая ушла бы на Booking.com.</FillIn>"
          </p>
          <div className="mt-3 text-[12px] text-ivory-100/70">— <FillIn>GM, отель, город</FillIn></div>
        </div>
      </div>
    </section>
  );
}

/* ─── Слайд 12 — Команда ───────────────────────────────────────────── */

function Slide12Team() {
  return (
    <Slide tone="light">
      <div className="relative">
        <SlideNumber n={3} />
        <Eyebrow>Команда · соответствие основателя продукту</Eyebrow>
        <h2 className="font-serif text-[40px] md:text-[56px] font-normal tracking-[-0.025em] leading-[1.04] text-forest-950 max-w-[20ch] mb-4 text-balance">
          Я жил с пропущенными звонками <em className="italic font-light">каждую смену.</em>
        </h2>
        <p className="text-[15px] md:text-[17px] text-forest-950/75 italic font-serif font-light leading-[1.45] max-w-[54ch] mb-10">
          Более трёх лет в операциях гостиниц США. Это не теория — это была моя работа.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <TeamCard
            initial="R"
            name="Рахматжон"
            role="Основатель · CEO"
            bio={
              <>
                <strong className="font-medium text-forest-950">Выпускник Университета Цинциннати.</strong>{' '}
                <strong className="font-medium text-forest-950">3+ года операций в гостиницах США</strong> в Holiday Inn Express в Цинциннати. Владеет тремя языками — <span className="font-medium text-forest-950">англ. / узб. / рус.</span> Личная сеть из <strong className="font-medium text-forest-950">20+ отелей в Цинциннати</strong>.
              </>
            }
          />
          <TeamCard
            initial="N"
            name="Нурислом"
            role="CTO"
            bio={
              <>
                Новый университет Узбекистана. <strong className="font-medium text-forest-950">Серийный предприниматель</strong> — создал <span className="font-medium text-forest-950">OY: Tickets</span> ($60K за 2 месяца) и <span className="font-medium text-forest-950">OYGUL</span> (1М+ пользователей за 8 месяцев). Отвечает за голосовой пайплайн и интеграции с PMS.
              </>
            }
          />
        </div>

        <div className="mt-8 pt-6 border-t border-forest-950/10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-4">
            Прошлые победы · Нурислом
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Президентская премия 2024', detail: 'Грант $100K · Лучший Ad-tech стартап' },
              { label: 'OYGUL', detail: '1М+ пользователей за 8 месяцев' },
              { label: 'OY: Tickets', detail: 'Первое приложение для билетов в кино в Узбекистане' },
              { label: 'Пресса', detail: 'The Tech · Pivot · Digital Business' },
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

/* ─── Слайд 14 — Стратегия выхода (Приложение) ─────────────────────── */

function Slide14Exit() {
  const acquirers: Array<{
    name: string;
    thesis: string;
    brands: { domain?: string; name: string }[];
  }> = [
    {
      name: 'Canary Technologies',
      thesis: 'Голос дополняет их пакет сообщений. При мультипликаторе ~10× ARR, $25M ARR → ~$250M выход.',
      brands: [{ domain: 'canarytechnologies.com', name: 'Canary Technologies' }],
    },
    {
      name: 'IHG Hotels & Resorts',
      thesis: '40% нашего TAM — франчайзи IHG. Прецедент вертикального технологического приобретения.',
      brands: [{ domain: 'ihg.com', name: 'IHG' }],
    },
    {
      name: 'Oracle Hospitality (Opera PMS)',
      thesis: 'Голос — недостающий слой в стеке Opera.',
      brands: [{ domain: 'oracle.com', name: 'Oracle' }],
    },
    {
      name: 'Cloudbeds · SiteMinder',
      thesis: 'Платформы дистрибуции, добавляющие голос в свой пакет.',
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
          Несколько надёжных покупателей. <em className="italic font-light">Окно 3–5 лет.</em>
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
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-3">Целевой результат</div>
            <p className="font-serif text-[24px] md:text-[28px] font-light italic leading-[1.25] text-forest-950 text-pretty">
              <Highlight>Сделка $150M–$500M</Highlight>, 3–5 лет.
            </p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

/* ─── Слайд 15 — Запрос инвестиций ─────────────────────────────────── */

function Slide15Ask() {
  return (
    <section className="film-grain relative h-full w-full bg-forest-950 text-ivory-50 flex items-start md:items-center overflow-y-auto md:overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full px-6 md:px-20 py-10 md:py-0 pb-28 md:pb-0">
        <SlideNumber n={11} dark />
        <ArryveMark className="h-7 mb-6 opacity-80" invert />
        <Eyebrow dark>Запрос инвестиций</Eyebrow>
        <h2 className="font-serif text-[64px] md:text-[96px] font-normal tracking-[-0.03em] leading-[0.94] text-ivory-50 mb-4">
          Привлекаем <Highlight dark>$100K</Highlight>
        </h2>
        <p className="font-serif text-[22px] md:text-[30px] font-light italic text-ivory-100/85 max-w-[26ch] leading-[1.2] mb-10 text-pretty">
          при оценке pre-money $2M.
        </p>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
          <div className="rounded-3xl bg-ivory-50/[0.05] border border-ivory-100/15 p-6 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-[0.22em] text-ivory-100/65 font-medium mb-4">
              Что покупает 18 месяцев
            </div>
            <ul className="space-y-2.5 text-[14px] text-ivory-100/90 leading-[1.45]">
              {[
                '50 платных отелей',
                'Семизначный ARR',
                'Подтверждённый Cincinnati playbook',
                'Первые 10 франчайзи IHG за пределами диаспоры',
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
              Использование средств
            </div>
            <div className="space-y-2 text-[13px] text-ivory-100/90">
              {[
                ['50%', 'Инженерия'],
                ['30%', 'Маркетинг и продажи'],
                ['15%', 'Партнёрства с PMS'],
                ['5%', 'Операции и юридическое'],
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
          <span>Сделано в Цинциннати · Arryve · arryve.com</span>
          <span className="text-ivory-100/30">·</span>
          <span className="italic">Нажмите End для приложения со стратегией выхода</span>
        </div>
      </div>
    </section>
  );
}
