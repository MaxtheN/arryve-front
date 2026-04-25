import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'motion/react';
import { ArrowRight, ArrowLeft, ChevronDown, Check, RotateCw, Play, Pause, Info, Sparkles, Heart, Menu, X } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { playArvyVoice, speakArvy, stopArvyVoice, VOICES } from './voice';
import { GeminiLiveDemo } from './GeminiLiveDemo';
import { useVoiceDemo } from './VoiceDemoContext';
import { logCtaClick } from './demo-log';

/* ─── Shared: speech helper ─── */

const HERO_IMAGE_BASE =
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop';
const HERO_IMAGE = `${HERO_IMAGE_BASE}&w=1600&q=80`;
const HERO_IMAGE_SRC_SET = [640, 960, 1280, 1600, 2400]
  .map((width) => `${HERO_IMAGE_BASE}&w=${width}&q=80 ${width}w`)
  .join(', ');
const CONTACT_EMAIL = 'contact@tryarryve.com';
const MAILTO_CONTACT_URL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Arryve demo')}`;
const DEFAULT_BOOK_DEMO_URL = 'https://calendar.app.google/eo9uCycR6vUZLAau8';
const BOOK_DEMO_URL = import.meta.env.VITE_BOOK_DEMO_URL || DEFAULT_BOOK_DEMO_URL;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function useDocumentVisible() {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible'
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVisibilityChange = () => {
      setVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return visible;
}

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* Below-the-fold render defer — keeps section JS/DOM work off the main
   thread during initial load. Empty placeholder reserves height so CLS
   stays at 0; real content mounts once the section is 600px from entering
   the viewport. */
function DeferredMount({
  children,
  minHeight = "100svh",
}: {
  children: React.ReactNode;
  minHeight?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "600px" });
  return (
    <div ref={ref}>
      {inView ? children : <div aria-hidden="true" style={{ minHeight }} />}
    </div>
  );
}

const sectionEyebrow = "text-sm text-navy-500 font-semibold tracking-wide mb-4";
const sectionHeading = "text-[32px] md:text-[44px] font-semibold tracking-tight text-navy-900 leading-[1.12] text-balance";
const sectionCopy = "text-lg text-ivory-700 leading-[1.6] text-pretty";
const screenSection = "min-h-[100svh] px-5 sm:px-6 pt-[96px] pb-8 md:pt-[104px] md:pb-10 flex items-center";
const screenShell = "max-w-6xl mx-auto w-full";

function SectionIntro({
  eyebrow,
  title,
  children,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  align?: "center" | "left";
}) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`max-w-2xl ${alignment} mb-8 md:mb-10`}>
      <FadeIn>
        <p className={sectionEyebrow}>{eyebrow}</p>
        <h2 className={`${sectionHeading} mb-5`}>{title}</h2>
        <p className={sectionCopy}>{children}</p>
      </FadeIn>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (!window.location.hash) return;

    const targetId = decodeURIComponent(window.location.hash.slice(1));
    const jumpToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) return;

      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      const navOffset = 88;
      window.scrollTo(0, Math.max(target.getBoundingClientRect().top + window.scrollY - navOffset, 0));
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    };

    window.requestAnimationFrame(jumpToTarget);
    const timeout = window.setTimeout(jumpToTarget, 250);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-ivory-50 text-ivory-900 font-sans antialiased">
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowAnswersSection />
        <TryACallSection />
        <IntegrationsSection />
        <DeferredMount><FounderNoteSection /></DeferredMount>
        <DeferredMount><EngineeringNoteSection /></DeferredMount>
        <DeferredMount><PricingSection /></DeferredMount>
        <DeferredMount><FAQSection /></DeferredMount>
        <DeferredMount><BookDemoSection /></DeferredMount>
      </main>
      <Footer />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

/* ─── Navbar ─── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    let ticking = false;
    const updateScrolled = () => {
      ticking = false;
      const next = window.scrollY > window.innerHeight * 0.78;
      if (next === scrolledRef.current) return;
      scrolledRef.current = next;
      setScrolled(next);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateScrolled);
    };

    updateScrolled();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [menuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const linkCls = scrolled
    ? "hover:text-forest-950 transition-colors"
    : "hover:text-white transition-colors";

  const navLinks: Array<{ href: string; label: string }> = [
    { href: '#problem', label: 'Problem' },
    { href: '#how-answers', label: 'How it works' },
    { href: '#integrations', label: 'Integrations' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-ivory-50/90 backdrop-blur-xl border-b border-ivory-200"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-[72px] flex items-center justify-between">
          <img
            src="/arryve-logo.svg"
            alt="Arryve"
            className={`h-7 transition-[filter] duration-300 ${
              scrolled ? "" : "brightness-0 invert"
            }`}
          />
          <div
            className={`hidden md:flex items-center gap-8 text-sm font-medium transition-colors ${
              scrolled ? "text-forest-950/75" : "text-white/85"
            }`}
          >
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className={linkCls}>{l.label}</a>
            ))}
          </div>
          <a
            href={BOOK_DEMO_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => logCtaClick('book_demo', { placement: 'top_nav' })}
            className={`hidden md:inline-flex px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
              scrolled
                ? "bg-forest-950 text-ivory-50 hover:bg-forest-900"
                : "bg-ivory-50 text-forest-950 hover:bg-white"
            }`}
          >
            Book a Demo
          </a>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => { logCtaClick('mobile_menu_open'); setMenuOpen(true); }}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={`md:hidden inline-flex items-center justify-center h-11 w-11 rounded-full transition-colors ${
              scrolled
                ? "text-forest-950 hover:bg-forest-950/5"
                : "text-ivory-50 hover:bg-ivory-50/10"
            }`}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`md:hidden fixed inset-0 z-[60] bg-forest-950 text-ivory-50 flex flex-col transition-opacity duration-200 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between px-5 h-[72px] border-b border-ivory-50/15">
          <img src="/arryve-logo.svg" alt="Arryve" className="h-7 brightness-0 invert" />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="inline-flex items-center justify-center h-11 w-11 rounded-full text-ivory-50 hover:bg-ivory-50/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 flex flex-col justify-center px-8 gap-2 overflow-y-auto">
          {navLinks.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="font-serif text-[32px] leading-[1.2] text-ivory-50 py-3 border-b border-ivory-50/10"
            >
              <span className="text-[11px] font-mono tracking-widest text-ivory-100/50 mr-4 align-middle">
                {String(i + 1).padStart(2, '0')}
              </span>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="p-5 border-t border-ivory-50/15">
          <a
            href={BOOK_DEMO_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => { logCtaClick('book_demo', { placement: 'mobile_menu' }); setMenuOpen(false); }}
            className="flex items-center justify-center gap-2 bg-ivory-50 text-forest-950 py-4 rounded-full text-base font-medium hover:bg-white transition-colors"
          >
            Book a Demo
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </>
  );
}

/* ─── Hero ─── */

function HeroSection() {
  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 800], [0, 80]);
  const {
    status: demoStatus,
    demoLocked,
    start: startVoiceDemo,
    stop: stopVoiceDemo,
  } = useVoiceDemo();
  const demoActive =
    demoStatus === 'connecting' ||
    demoStatus === 'listening' ||
    demoStatus === 'speaking';

  const handleHearArvy = async () => {
    if (demoActive) {
      logCtaClick('demo_stop', { placement: 'hero' });
      await stopVoiceDemo();
      return;
    }
    if (demoLocked) {
      // Their browser already consumed the demo — scroll to the panel so
      // they see the "book a pilot" CTA rather than silently doing nothing.
      logCtaClick('demo_start', { placement: 'hero', state: 'locked' });
      document.getElementById('try-a-call')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    logCtaClick('demo_start', { placement: 'hero' });
    await startVoiceDemo();
    // Pull the transcript panel into view so the visitor sees Arvy's
    // replies alongside the conversation.
    document.getElementById('try-a-call')?.scrollIntoView({ behavior: 'smooth' });
  };

  const buttonLabel = demoActive
    ? 'End call with Arvy'
    : demoLocked
    ? 'Demo already used'
    : 'Talk to Arvy now';

  return (
    <section className="film-grain relative min-h-[100svh] overflow-hidden text-white">
      <div className="absolute inset-0 overflow-hidden">
        <motion.img
          src={HERO_IMAGE}
          srcSet={HERO_IMAGE_SRC_SET}
          sizes="100vw"
          width={1920}
          height={1280}
          alt="Hotel front desk agent on the phone"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          crossOrigin="anonymous"
          className="absolute -top-[5%] left-0 w-full h-[112%] object-cover"
          style={{ y: imgY }}
        />
      </div>
      <div className="warm-wash absolute inset-0 z-[2]" />

      <div className="relative z-[5] flex min-h-[100svh] flex-col px-5 sm:px-8 md:px-12 pt-[96px] pb-10 md:pb-14">
        <div className="mt-auto max-w-6xl mx-auto w-full grid md:grid-cols-[1.35fr_1fr] gap-10 md:gap-16 items-end">
          <div>
            <FadeIn>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ivory-100/80 mb-7">
                <span className="h-px w-8 bg-ivory-100/60" />
                Arryve for hotels
              </div>
            </FadeIn>

            <FadeIn delay={0.08}>
              <h1 className="font-serif text-[44px] sm:text-[58px] md:text-[76px] lg:text-[92px] font-normal tracking-[-0.025em] leading-[0.98] text-ivory-50 text-balance max-w-[14ch]">
                A better arrival <br className="hidden md:block" />
                starts with the <em className="italic font-normal text-ivory-100/95">first call</em>.
              </h1>
            </FadeIn>
          </div>

          <FadeIn delay={0.18}>
            <div className="md:pb-3">
              <p className="text-base md:text-lg text-ivory-100/85 leading-[1.55] max-w-md text-pretty mb-7">
                Meet <span className="italic">Arvy</span> — the AI voice that answers every guest call. Captures bookings, handles routine questions, and hands off to your team when it matters.
              </p>
              <div className="flex flex-wrap items-center gap-4 md:gap-5">
                <a
                  href={BOOK_DEMO_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => logCtaClick('book_demo', { placement: 'hero' })}
                  className="inline-flex items-center gap-2 bg-ivory-50 text-forest-950 px-6 py-3 rounded-full text-sm font-medium hover:bg-white transition-colors group"
                >
                  Book a demo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>

                <button
                  type="button"
                  onClick={handleHearArvy}
                  disabled={demoLocked && !demoActive}
                  className="group inline-flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full border border-ivory-50/25 bg-ivory-50/[0.06] backdrop-blur-sm hover:bg-ivory-50/[0.12] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={buttonLabel}
                >
                  <span className="relative grid place-items-center h-9 w-9 rounded-full bg-ivory-50 text-forest-950">
                    {!demoActive && !demoLocked && (
                      <span className="absolute inset-0 rounded-full bg-ivory-50 opacity-60 animate-ping" />
                    )}
                    <span className="relative">
                      {demoActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-ivory-50">
                    {buttonLabel}
                  </span>
                </button>
              </div>
            </div>
          </FadeIn>
        </div>

      </div>
    </section>
  );
}

/* ─── Problem ─── */

const PROBLEM_STATS: Array<{
  big: React.ReactNode;
  headline: string;
  body: string;
}> = [
  {
    big: <>1 <span className="italic font-light text-forest-950/75">in</span> 3</>,
    headline: "guest calls go unanswered during busy shifts and after hours.",
    body: "Every unanswered call is a booking lost to an OTA, a competitor, or silence. Your front desk can't be in two places at once — and the phone doesn't know when you're checking someone in.",
  },
  {
    big: <>$12<span className="italic font-light text-forest-950/75 text-[0.6em] align-top ml-1">k</span></>,
    headline: "in direct bookings slip past an average property each month.",
    body: "A handful of unanswered calls a day compounds fast. The ones who book elsewhere were ready to hand you revenue — they just needed a human on the line.",
  },
  {
    big: <>2.5<span className="italic font-light text-forest-950/75 text-[0.5em] align-baseline ml-2">hrs</span></>,
    headline: "your team spends daily on the same routine questions.",
    body: "Parking. Pets. Breakfast. Check-in. The same five questions, dozens of times a day, pulling staff away from guests who are standing in front of them.",
  },
];

function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const total = PROBLEM_STATS.length;
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      const clamped = Math.max(0, Math.min(0.9999, latest));
      const idx = Math.min(total - 1, Math.floor(clamped * total));
      setActive((prev) => (prev === idx ? prev : idx));
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const scrollToIndex = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const total = PROBLEM_STATS.length;
    const stepHeight = (el.offsetHeight - window.innerHeight) / Math.max(1, total - 1);
    const target = el.offsetTop + stepHeight * i + (i === 0 ? 0 : 4);
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const current = PROBLEM_STATS[active];

  return (
    <section
      ref={sectionRef}
      id="problem"
      className="relative bg-ivory-50 lg:h-[300svh]"
    >
      {/* Mobile / tablet: all 3 stats stacked. No sticky, no scroll-drive —
         everything visible in a natural top-to-bottom read. */}
      <div className="lg:hidden px-5 sm:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-10">
            <span className="h-px w-8 bg-forest-950/40" />
            The problem
          </div>
          <div className="space-y-14">
            {PROBLEM_STATS.map((s, i) => (
              <div key={i} className="border-t-2 border-forest-950/20 pt-8">
                <div className="font-serif text-[72px] sm:text-[96px] md:text-[120px] font-normal tracking-[-0.04em] leading-[0.86] text-forest-950 mb-6">
                  {s.big}
                </div>
                <p className="font-serif text-[22px] md:text-[28px] text-forest-950 leading-[1.22] max-w-[28ch] text-pretty mb-4">
                  {s.headline}
                </p>
                <p className="text-base text-ivory-700 leading-[1.6] max-w-xl text-pretty">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-16">
            <FrontDeskRealityCard />
          </div>
        </div>
      </div>

      {/* Desktop: sticky + scroll-driven animation */}
      <div className="hidden lg:flex sticky top-0 h-svh items-center px-12">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-[1fr_1.05fr] gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-8">
              <span className="h-px w-8 bg-forest-950/40" />
              The problem
            </div>

            <div className="relative min-h-[320px] mb-6">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={`big-${active}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="font-serif text-[168px] font-normal tracking-[-0.04em] leading-[0.86] text-forest-950"
                >
                  {current.big}
                </motion.h2>
              </AnimatePresence>
            </div>

            <div className="relative min-h-[100px] mb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`copy-${active}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="font-serif text-[28px] text-forest-950 leading-[1.22] max-w-[28ch] text-pretty mb-5">
                    {current.headline}
                  </p>
                  <p className="text-base text-ivory-700 leading-[1.6] max-w-md text-pretty">
                    {current.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 mt-8" role="tablist">
              {PROBLEM_STATS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => scrollToIndex(i)}
                  className="group py-2"
                >
                  <span
                    className={`block h-[3px] rounded-full transition-all duration-500 ${
                      i === active
                        ? 'w-10 bg-forest-900'
                        : 'w-5 bg-forest-950/20 group-hover:bg-forest-950/40'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <FrontDeskRealityCard />
        </div>
      </div>
    </section>
  );
}

function FrontDeskRealityCard() {
  const missedCalls = [
    { time: "7:14 AM",  note: "Voicemail · \"Need a room tonight\"", meta: "(513) 555-0148 · After hours" },
    { time: "10:42 AM", note: "Hung up after 6 rings",               meta: "(859) 555-0291 · Desk with check-in" },
    { time: "3:18 PM",  note: "No answer",                           meta: "(937) 555-0117 · Group arrival" },
    { time: "11:30 PM", note: "No answer",                           meta: "(216) 555-0084 · After hours" },
  ];

  const faqs = ["Parking", "Breakfast", "Pets", "Check-in", "Wi-Fi"];

  return (
    <div className="rounded-3xl bg-white border border-forest-950/10 shadow-[0_40px_120px_-40px_rgba(3,36,30,0.35)] overflow-hidden">
      <div className="flex items-center justify-between px-7 py-5 border-b border-ivory-200">
        <div className="flex items-center gap-2.5 text-[11px] font-medium tracking-[0.2em] uppercase text-forest-950/70">
          <span className="h-2 w-2 rounded-full bg-forest-950/30" />
          Yesterday · Front desk
        </div>
        <div className="text-xs text-ivory-600 tabular-nums">14 missed</div>
      </div>

      <div className="px-7 py-6 space-y-4">
        {missedCalls.map((c, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr] gap-x-4">
            <div className="text-xs text-forest-950/55 tabular-nums pt-1">{c.time}</div>
            <div>
              <div className="text-[15px] text-forest-950/90 leading-[1.4]">{c.note}</div>
              <div className="text-[11px] text-ivory-600 mt-0.5">{c.meta}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-7 py-5 border-t border-ivory-200 bg-ivory-50/60">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-forest-950/40" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-forest-950/65 font-medium">
            2h 18m on routine questions
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {faqs.map((f) => (
            <span
              key={f}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-forest-950/10 text-forest-950/75"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-7 py-5 border-t border-ivory-200 bg-ivory-50">
        <div className="inline-flex items-center gap-2 rounded-full bg-forest-950/[0.06] text-forest-950 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium border border-forest-950/15">
          <Info className="w-3 h-3" />
          $1,260 in bookings lost
        </div>
        <div className="text-xs text-ivory-600 tabular-nums">est. revenue · yesterday</div>
      </div>
    </div>
  );
}

/* ─── How Arryve answers ─── */

function HowAnswersSection() {
  const scenarios = [
    {
      label: "New booking",
      title: "A reservation, written straight into the PMS.",
      lines: [
        { who: "Guest", text: "I know it's late — any chance you have a king available tonight?" },
        { who: "Arvy", text: "We do, at $189 with breakfast. I'd be glad to reserve it — may I have your name?" },
      ],
      pms: [
        { dir: "read" as const, text: "Availability, rate, and rate plan" },
        { dir: "write" as const, text: "Reservation HK-8842 created · confirmation sent" },
      ],
      outcome: "Booking captured",
      meta: "0:42 · synced to PMS",
      details: {
        duration: "42 sec",
        recovered: "+$189",
        sentiment: "Positive · 0.92",
        channel: "Forwarded line · 23:42",
      },
    },
    {
      label: "Returning guest",
      title: "Details pulled from the PMS in real time.",
      lines: [
        { who: "Guest", text: "Hi, this is Sarah Chen — I have a reservation for Saturday. Can you confirm the details?" },
        { who: "Arvy", text: "Welcome back, Ms. Chen. Your king suite is booked for Saturday the 14th, check-in from 3 PM. Would you like the airport shuttle arranged, as last time?" },
      ],
      pms: [
        { dir: "read" as const, text: "Guest profile · two prior stays, shuttle preference" },
        { dir: "read" as const, text: "Reservation HK-8811 · king suite, 14 Mar, 15:00 check-in" },
      ],
      outcome: "Confirmed",
      meta: "0:28 · no transfer",
      details: {
        duration: "28 sec",
        recovered: "Upsell +$45",
        sentiment: "Positive · 0.96",
        channel: "Forwarded line · 10:14",
      },
    },
    {
      label: "Escalation with context",
      title: "Transferred, with the reservation already noted.",
      lines: [
        { who: "Guest", text: "We'll need our final bill split three ways across different cards — can you set that up?" },
        { who: "Arvy", text: "Our front desk handles split billing personally. I'll leave a note on your reservation and put you through now." },
      ],
      pms: [
        { dir: "write" as const, text: "Note added to folio F-2284 · 'split 3 ways, 3 cards'" },
        { dir: "write" as const, text: "Call context forwarded with transfer" },
      ],
      outcome: "Transferred",
      meta: "0:16 · to ext. 100",
      details: {
        duration: "16 sec",
        recovered: "Front desk handoff",
        sentiment: "Neutral · 0.78",
        channel: "Forwarded line · 14:07",
      },
    },
  ];

  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const total = scenarios.length;
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      const clamped = Math.max(0, Math.min(0.9999, latest));
      const idx = Math.min(total - 1, Math.floor(clamped * total));
      setActive((prev) => (prev === idx ? prev : idx));
    });
    return () => unsubscribe();
  }, [scrollYProgress, scenarios.length]);

  const scrollToIndex = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const total = scenarios.length;
    const stepHeight = (el.offsetHeight - window.innerHeight) / Math.max(1, total - 1);
    const target = el.offsetTop + stepHeight * i + (i === 0 ? 0 : 4);
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const scenario = scenarios[active];

  return (
    <section
      ref={sectionRef}
      id="how-answers"
      className="relative bg-white lg:h-[300svh]"
    >
      {/* Mobile / tablet: all 3 scenarios stacked */}
      <div className="lg:hidden px-5 sm:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-6">
              <span className="h-px w-8 bg-forest-950/40" />
              How Arvy answers
            </div>
            <h2 className="font-serif text-[36px] sm:text-[44px] md:text-[52px] font-normal tracking-[-0.02em] leading-[1.04] text-forest-950 max-w-[16ch] mb-4 text-balance">
              Three kinds of calls. <em className="italic font-light">One steady voice.</em>
            </h2>
            <p className="text-base md:text-lg text-ivory-700 leading-[1.6] max-w-xl text-pretty">
              Every property handles the same three call shapes. Arvy handles all three — in your words, with your rules, around the clock.
            </p>
          </div>

          <div className="space-y-10">
            {scenarios.map((s, i) => (
              <div key={i} className="border-t border-forest-950/15 pt-8">
                <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/55 font-medium mb-3">
                  {String(i + 1).padStart(2, '0')} · {s.label}
                </div>
                <h3 className="font-serif text-[26px] sm:text-[30px] font-normal tracking-[-0.015em] leading-[1.14] text-forest-950 text-pretty mb-6">
                  {s.title}
                </h3>
                <ScenarioCard scenario={s} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: sticky + scroll-driven */}
      <div className="hidden lg:flex sticky top-0 h-svh items-center px-12 py-12">
        <div className="max-w-6xl mx-auto w-full">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-6">
              <span className="h-px w-8 bg-forest-950/40" />
              How Arvy answers
            </div>
            <h2 className="font-serif text-[60px] font-normal tracking-[-0.02em] leading-[1.04] text-forest-950 max-w-[16ch] mb-4 text-balance">
              Three kinds of calls. <em className="italic font-light">One steady voice.</em>
            </h2>
            <p className="text-lg text-ivory-700 leading-[1.6] max-w-xl text-pretty">
              Every property handles the same three call shapes. Arvy handles all three — in your words, with your rules, around the clock.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8" role="tablist">
            {scenarios.map((s, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => scrollToIndex(i)}
                className="group flex items-center gap-2.5 py-1.5"
              >
                <span
                  className={`block h-[3px] rounded-full transition-all duration-500 ${
                    i === active
                      ? 'w-10 bg-forest-900'
                      : 'w-5 bg-forest-950/20 group-hover:bg-forest-950/40'
                  }`}
                />
                <span
                  className={`text-[10px] uppercase tracking-[0.22em] font-medium transition-colors ${
                    i === active
                      ? 'text-forest-950/85'
                      : 'text-forest-950/40 group-hover:text-forest-950/65'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')} · {s.label}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1.25fr] gap-16 items-start">
            <div className="relative min-h-[120px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`label-${active}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="font-serif text-[36px] font-normal tracking-[-0.015em] leading-[1.12] text-forest-950 text-pretty">
                    {scenario.title}
                  </h3>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`card-${active}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ScenarioCard scenario={scenario} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type Scenario = {
  label: string;
  title: string;
  lines: { who: string; text: string }[];
  pms: { dir: "read" | "write"; text: string }[];
  outcome: string;
  meta: string;
  details: {
    duration: string;
    recovered: string;
    sentiment: string;
    channel: string;
  };
};

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [step, setStep] = useState(-1);
  const [replayKey, setReplayKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const totalSteps = scenario.lines.length + scenario.pms.length + 1;

  useEffect(() => {
    if (!inView) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setStep(totalSteps - 1);
      return;
    }

    setStep(-1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 350;
    const schedule = (idx: number, delay: number) => {
      t += delay;
      timers.push(setTimeout(() => setStep(idx), t));
    };

    scenario.lines.forEach((_, i) => schedule(i, i === 0 ? 0 : 1400));
    scenario.pms.forEach((_, i) => schedule(scenario.lines.length + i, i === 0 ? 1100 : 800));
    schedule(totalSteps - 1, 650);

    return () => timers.forEach(clearTimeout);
  }, [inView, replayKey, scenario, totalSteps]);

  const linesVisible = Math.min(step + 1, scenario.lines.length);
  const pmsVisible = Math.max(0, Math.min(step - scenario.lines.length + 1, scenario.pms.length));
  const outcomeVisible = step >= totalSteps - 1;

  return (
    <div
      ref={ref}
      className="rounded-2xl bg-ivory-50 border border-ivory-200 p-6 md:p-7 relative"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.span
              key={i}
              className="block h-[3px] rounded-full"
              initial={false}
              animate={{
                width: i <= step ? 22 : 8,
                backgroundColor: i <= step ? 'rgba(7, 58, 47, 0.85)' : 'rgba(3, 36, 30, 0.15)',
              }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-forest-950/55 hover:text-forest-950 transition-colors font-medium"
          >
            <Info className="w-3 h-3" />
            {showDetails ? 'Hide' : 'Details'}
          </button>
          <button
            type="button"
            onClick={() => setReplayKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-forest-950/55 hover:text-forest-950 transition-colors font-medium"
          >
            <RotateCw className="w-3 h-3" />
            Replay
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-5 min-h-[128px]">
        <AnimatePresence mode="popLayout">
          {scenario.lines.slice(0, linesVisible).map((line, j) => (
            <motion.div
              key={`${replayKey}-l-${j}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/50 mb-1 font-medium">
                {line.who}
              </div>
              <p className="text-[15px] md:text-base text-forest-950/90 leading-[1.5]">
                {line.text}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: pmsVisible > 0 ? 1 : 0.35 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl bg-white border border-ivory-200 px-4 py-3 mb-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-1.5 w-1.5">
            {pmsVisible > 0 && pmsVisible < scenario.pms.length && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-900 opacity-60" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-forest-900" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
            HotelKey · sync
          </span>
        </div>
        <div className="space-y-1 font-mono text-[11.5px] text-forest-950/80 leading-relaxed min-h-[38px]">
          <AnimatePresence mode="popLayout">
            {scenario.pms.slice(0, pmsVisible).map((p, j) => (
              <motion.div
                key={`${replayKey}-p-${j}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-2"
              >
                {p.dir === "read" ? (
                  <ArrowLeft className="w-3 h-3 text-forest-900 mt-0.5 flex-shrink-0" />
                ) : (
                  <ArrowRight className="w-3 h-3 text-forest-900 mt-0.5 flex-shrink-0" />
                )}
                <span>
                  <span className="text-forest-950/50 mr-1 uppercase text-[10px] tracking-[0.12em]">{p.dir}</span>
                  {p.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="flex items-center justify-between pt-4 border-t border-ivory-200 min-h-[36px]">
        <AnimatePresence>
          {outcomeVisible && (
            <motion.div
              key={`${replayKey}-outcome`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 rounded-full bg-forest-950 text-ivory-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium"
            >
              <Check className="w-3 h-3" />
              {scenario.outcome}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-xs text-ivory-600 tabular-nums">{scenario.meta}</div>
      </div>

      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-ivory-200 grid grid-cols-2 gap-x-6 gap-y-3">
              <DetailRow label="Duration" value={scenario.details.duration} />
              <DetailRow label="Revenue" value={scenario.details.recovered} />
              <DetailRow label="Sentiment" value={scenario.details.sentiment} />
              <DetailRow label="Channel" value={scenario.details.channel} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/50 font-medium mb-1">
        {label}
      </div>
      <div className="font-mono text-[12px] text-forest-950/85">{value}</div>
    </div>
  );
}

/* ─── Try a call (voice demo) ─── */

function TryACallSection() {
  return (
    <section
      id="try-a-call"
      className="bg-ivory-50 px-5 sm:px-8 md:px-12 pt-24 pb-24 flex items-center"
    >
      <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-[1fr_1.15fr] gap-14 lg:gap-20 items-start">
        <FadeIn>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-8">
            <span className="h-px w-8 bg-forest-950/40" />
            Try a call
          </div>
          <h2 className="font-serif text-[44px] md:text-[60px] lg:text-[72px] font-normal tracking-[-0.02em] leading-[1.02] text-forest-950 mb-5 text-balance">
            Talk to Arvy <em className="italic font-light">live</em>.
          </h2>
          <p className="text-base md:text-lg text-ivory-700 leading-[1.6] max-w-md text-pretty mb-6">
            Click <strong>Start call</strong> and speak. Arvy hears you, thinks, and replies in real time — the same voice-to-voice agent that answers the phone at a real property.
          </p>
          <p className="text-[13px] text-ivory-700/85 leading-[1.55] max-w-md text-pretty">
            Arvy ends the call when you're done. A real property version grounds every answer in your PMS and stays live as long as the guest needs.
          </p>
        </FadeIn>

        <FadeIn delay={0.08}>
          <GeminiLiveDemo />
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Integrations ─── */

const SYNC_EVENTS: Array<{ dir: "read" | "write"; text: string }> = [
  { dir: "read", text: "Availability · king, 1 night @ $189" },
  { dir: "write", text: "Reservation HK-8842 · D. Johnson" },
  { dir: "read", text: "Guest profile · S. Chen · 2 prior stays" },
  { dir: "write", text: "Note on folio F-2284 · split 3 ways" },
  { dir: "read", text: "Policy · pet fee, late check-out" },
  { dir: "write", text: "Confirmation SMS queued to guest" },
  { dir: "read", text: "Rate plan · AAA rate unlocked" },
  { dir: "write", text: "Preference · late checkout flagged" },
  { dir: "read", text: "Availability · suite, 3 nights @ $420" },
  { dir: "write", text: "Reservation HK-8843 · R. Singh" },
  { dir: "read", text: "Folio F-2284 · pending charges $312" },
  { dir: "write", text: "Transfer note · to ext. 100" },
];

function IntegrationsSection() {
  const tools = ["HotelKey", "Opera", "Cloudbeds", "Mews", "Twilio", "Stayntouch"];
  const [activePMS, setActivePMS] = useState("HotelKey");

  return (
    <section id="integrations" className="bg-ivory-100 px-5 sm:px-8 md:px-12 pt-24 pb-24 flex items-center">
      <div className="max-w-6xl mx-auto w-full">
        <FadeIn>
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-10 md:gap-20 items-start mb-12 md:mb-14">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-6">
                <span className="h-px w-8 bg-forest-950/40" />
                Works with your stack
              </div>
              <h2 className="font-serif text-[36px] md:text-[52px] font-normal tracking-[-0.02em] leading-[1.02] text-forest-950 text-balance">
                Arvy speaks to your <em className="italic font-light">PMS</em> in real time.
              </h2>
            </div>
            <div>
              <p className="text-base md:text-lg text-ivory-700 leading-[1.6] text-pretty mt-1">
                Arvy reads availability, rates, and guest history directly from your system, so every answer a caller hears is accurate — and writes new reservations, notes, and updates straight back. No spreadsheets, no copy-paste, no reconciliation Monday morning.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <LiveSyncCard pms={activePMS} />
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="flex items-baseline justify-between mb-5 mt-10 md:mt-14">
            <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium">
              Connected systems
            </div>
            <div className="text-[11px] text-forest-950/45">
              <span className="md:hidden">Tap a system to preview its sync</span>
              <span className="hidden md:inline">Hover a system to preview its sync</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-ivory-200 border border-ivory-200 rounded-2xl overflow-hidden">
            {tools.map((t) => {
              const active = activePMS === t;
              return (
                <button
                  key={t}
                  type="button"
                  onMouseEnter={() => setActivePMS(t)}
                  onFocus={() => setActivePMS(t)}
                  onClick={() => { logCtaClick('pms_select', { pms: t }); setActivePMS(t); }}
                  className={`h-24 md:h-28 flex items-center justify-center px-4 transition-all duration-300 relative ${
                    active ? "bg-white" : "bg-ivory-100 hover:bg-ivory-50"
                  }`}
                >
                  <span
                    className={`font-serif text-[18px] md:text-[22px] tracking-tight transition-colors duration-300 ${
                      active ? "text-forest-950" : "text-forest-950/65"
                    }`}
                  >
                    {t}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="pms-underline"
                      className="absolute left-4 right-4 bottom-4 h-px bg-forest-900/60"
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function LiveSyncCard({ pms }: { pms: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-20% 0px' });
  const isDocumentVisible = useDocumentVisible();
  const [events, setEvents] = useState(() =>
    SYNC_EVENTS.slice(0, 5).map((e, i) => ({ ...e, id: i }))
  );
  const nextId = useRef(5);

  useEffect(() => {
    if (prefersReducedMotion() || !inView || !isDocumentVisible) return;

    const interval = setInterval(() => {
      setEvents((prev) => {
        const next = SYNC_EVENTS[Math.floor(Math.random() * SYNC_EVENTS.length)];
        const id = nextId.current++;
        return [...prev.slice(1), { ...next, id }];
      });
    }, 2400);
    return () => clearInterval(interval);
  }, [inView, isDocumentVisible]);

  return (
    <div
      ref={ref}
      className="rounded-3xl bg-white border border-forest-950/10 shadow-[0_40px_120px_-40px_rgba(3,36,30,0.22)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-ivory-200">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-900 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-900" />
          </span>
          <span className="text-[11px] uppercase tracking-[0.22em] text-forest-950/70 font-medium">
            Live sync
          </span>
          <span className="text-forest-950/30 mx-1">·</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={pms}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="font-serif text-[15px] md:text-[17px] text-forest-950"
            >
              {pms}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-forest-950/50 font-medium">
          <div className="flex items-center gap-1.5">
            <ArrowLeft className="w-3 h-3" />
            Reads
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3" />
            Writes
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-4 md:py-5 min-h-[240px]">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-3 py-2.5 font-mono text-[13px] text-forest-950/85"
            >
              {e.dir === "read" ? (
                <ArrowLeft className="w-3.5 h-3.5 text-forest-900 mt-1 flex-shrink-0" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-forest-900 mt-1 flex-shrink-0" />
              )}
              <span>
                <span className="text-forest-950/45 mr-1.5 uppercase text-[10px] tracking-[0.12em]">
                  {e.dir}
                </span>
                {e.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Engineering note ─── */

function EngineeringNoteSection() {
  const stats = [
    {
      value: "<300ms",
      label: "Median response latency",
      detail: "Streaming pipeline that answers inside a guest's natural pause.",
    },
    {
      value: "99.9%",
      label: "Uptime target",
      detail: "Redundant carriers and automatic failover on every leg of the call.",
    },
    {
      value: "6+",
      label: "PMS systems supported",
      detail: "HotelKey, Opera, Cloudbeds, Mews, Twilio, Stayntouch — and growing.",
    },
  ];

  return (
    <section className="bg-ivory-50 px-5 sm:px-8 md:px-12 pt-24 pb-24">
      <div className="max-w-6xl mx-auto w-full">
        <FadeIn>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-12">
            <span className="h-px w-8 bg-forest-950/40" />
            Engineering note
          </div>
        </FadeIn>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-14 lg:gap-20 items-start">
          <FadeIn>
            <p className="font-serif text-[26px] md:text-[34px] lg:text-[40px] font-light tracking-[-0.01em] leading-[1.25] text-forest-950 text-pretty">
              <em className="italic">"Every guest call is a quiet contract</em> — we hear you, we answer correctly, and we never lose what you told us. The hard part of voice AI isn't talking; it's listening, deciding, and writing back to a live system before the guest finishes their sentence. Our job is to make all of that invisible."
            </p>
            <div className="mt-10 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-forest-950 text-ivory-50 grid place-items-center font-serif text-lg">
                N
              </div>
              <div>
                <div className="text-sm font-medium text-forest-950">Nurislom</div>
                <div className="text-xs text-ivory-700">Technical Co-Founder, Arryve</div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="rounded-3xl border border-forest-950/10 bg-white shadow-[0_30px_80px_-40px_rgba(3,36,30,0.18)] overflow-hidden">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`px-7 py-6 flex items-center gap-6 ${
                    i < stats.length - 1 ? "border-b border-ivory-200" : ""
                  }`}
                >
                  <div className="font-serif text-[28px] md:text-[34px] text-forest-950 tracking-tight tabular-nums w-28 shrink-0">
                    {s.value}
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium mb-1.5">
                      {s.label}
                    </div>
                    <div className="text-sm text-ivory-700 leading-[1.5] text-pretty">
                      {s.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ─── Founder note ─── */

function FounderNoteSection() {
  return (
    <section className="film-grain relative bg-forest-950 text-ivory-50 px-5 sm:px-8 md:px-12 pt-24 pb-24 flex items-center overflow-hidden">
      <div className="warm-wash absolute inset-0 z-[1] opacity-50" />
      <div className="relative z-[3] max-w-4xl mx-auto w-full text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ivory-100/70 mb-10 justify-center">
            <span className="h-px w-8 bg-ivory-100/50" />
            A note from the founder
          </div>
          <p className="font-serif text-[26px] md:text-[38px] lg:text-[44px] font-light tracking-[-0.01em] leading-[1.25] text-ivory-50 text-balance">
            <em className="italic">"We built Arryve for the person behind the desk</em> — not the one on the line. Hospitality is human. The phone work is the part we can take off their plate, so they can do the part that matters."
          </p>
          <div className="mt-12 flex items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-ivory-100 border border-ivory-50/20 grid place-items-center text-forest-950 font-serif text-lg">
              R
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-ivory-50">Rakhmatjon</div>
              <div className="text-xs text-ivory-100/70">Founder, Arryve</div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */

function PricingSection() {
  const included = [
    "Up to 2,000 inbound calls / month",
    "24/7 AI front desk coverage",
    "PMS integration (HotelKey, Opera, Cloudbeds, Mews + more)",
    "Custom knowledge base setup",
    "Real-time transcripts & analytics",
    "Smart escalation & call transfer",
    "Dedicated onboarding & support",
  ];

  return (
    <section id="pricing" className="bg-ivory-50 min-h-[100svh] flex items-center px-5 sm:px-8 md:px-12 pt-24 pb-24">
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-14 lg:gap-24 items-center mb-14 md:mb-16">
          <FadeIn>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-8">
              <span className="h-px w-8 bg-forest-950/40" />
              Pricing · Property plan
            </div>
            <h2 className="font-serif text-[64px] md:text-[88px] lg:text-[104px] font-normal tracking-[-0.03em] leading-[0.94] text-forest-950 mb-4">
              $1,799
              <span className="block text-[22px] md:text-[28px] font-sans tracking-normal text-forest-950/55 mt-3">
                per month · per property
              </span>
            </h2>
            <div className="mt-5 inline-flex items-baseline gap-2.5 rounded-full bg-white border border-forest-950/10 px-4 py-2">
              <span className="font-serif text-[18px] text-forest-950 tabular-nums">$17,990</span>
              <span className="text-[12px] text-forest-950/60">/year</span>
              <span className="text-forest-950/25 mx-0.5">·</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-forest-900/85 font-medium">2 months free</span>
            </div>
            <p className="font-serif text-[22px] md:text-[26px] text-forest-950/85 leading-[1.22] max-w-[28ch] text-pretty mb-6 mt-8">
              One plan, per property. No seat pricing, ever.
            </p>
            <p className="text-base text-ivory-700 leading-[1.6] max-w-md mb-3 text-pretty">
              <span className="font-medium text-forest-950/90">$2,500 one-time onboarding</span> — covers PMS integration, voice setup, and your knowledge-base build.
            </p>
            <p className="text-base text-ivory-700 leading-[1.6] max-w-md mb-8 text-pretty">
              Cancel anytime. The first 14 days are a live pilot — keep the PMS sync, test every scenario, and only continue if it's pulling its weight.
            </p>
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-forest-950 text-ivory-50 px-6 py-3 rounded-full text-sm font-medium hover:bg-forest-900 transition-colors group"
            >
              Start a pilot
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </FadeIn>

          <FadeIn delay={0.12}>
            <RoiCalculator />
          </FadeIn>
        </div>

        <FadeIn delay={0.2}>
          <div className="rounded-3xl bg-white border border-ivory-200 p-7 md:p-9">
            <div className="flex items-baseline justify-between mb-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
                Everything's included
              </div>
              <div className="text-[11px] text-forest-950/55">
                Overage: <span className="font-mono text-forest-950/80">$1.25 / call</span> beyond 2,000 — about half a call center's rate.
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
              {included.map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-forest-900 mt-0.5 flex-shrink-0" />
                  <span className="text-[14px] md:text-[15px] text-forest-950/85 leading-snug">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function RoiCalculator() {
  const [calls, setCalls] = useState(40);

  const monthlyRevenue = Math.round(calls * 30 * 0.33 * 0.15 * 150);
  const monthlyHours = Math.round((calls * 30 * 2.5) / 60);
  const roi = Math.round(monthlyRevenue / 1799);

  return (
    <div className="rounded-3xl bg-white border border-ivory-200 p-7 md:p-9 shadow-[0_40px_120px_-40px_rgba(3,36,30,0.2)]">
      <div className="flex items-baseline justify-between mb-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
          Your recoverable value
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-forest-950/40">
          Estimated
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <div className="font-serif text-[44px] md:text-[56px] font-normal tracking-[-0.025em] leading-[0.95] text-forest-950 tabular-nums">
            ${monthlyRevenue.toLocaleString()}
          </div>
          <div className="mt-2 text-[12px] md:text-[13px] text-forest-950/65 leading-snug max-w-[20ch]">
            in bookings Arvy recovers each month
          </div>
        </div>
        <div>
          <div className="font-serif text-[44px] md:text-[56px] font-normal tracking-[-0.025em] leading-[0.95] text-forest-950 tabular-nums">
            {monthlyHours}
            <span className="text-[0.45em] font-sans tracking-normal text-forest-950/55 ml-2">hrs</span>
          </div>
          <div className="mt-2 text-[12px] md:text-[13px] text-forest-950/65 leading-snug max-w-[20ch]">
            of staff time freed each month
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2.5">
          <label htmlFor="calls-slider" className="text-[11px] uppercase tracking-[0.22em] text-forest-950/60 font-medium">
            Calls per day
          </label>
          <span className="font-mono text-[14px] text-forest-950 tabular-nums">{calls}</span>
        </div>
        <input
          id="calls-slider"
          type="range"
          min={10}
          max={200}
          step={5}
          value={calls}
          onChange={(e) => setCalls(Number(e.target.value))}
          className="w-full accent-forest-900 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-forest-950/45 font-mono mt-1.5 tabular-nums">
          <span>10</span>
          <span>200</span>
        </div>
      </div>

      <div className="pt-5 border-t border-ivory-200 flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-[0.22em] text-forest-950/55 font-medium">
          vs $1,799 / month
        </div>
        <div className="font-serif text-[22px] md:text-[26px] text-forest-950 tabular-nums">
          ≈ {roi}× <span className="text-forest-950/55 text-[0.6em] align-middle ml-0.5">ROI</span>
        </div>
      </div>
    </div>
  );
}

/* ─── FAQ ─── */

function FAQSection() {
  const faqs = [
    { q: "How does Arvy work with hotel staff?", a: "Arvy handles routine inquiries and reservations so your front desk can focus on in-person guests. When a caller needs human help, Arvy transfers the call seamlessly." },
    { q: "Does it replace the front desk?", a: "No. Arvy supports your team, not replaces them. Hospitality is human. Arvy takes the repetitive phone work off your staff's plate so they can deliver better, more personal service." },
    { q: "Can it integrate with our PMS?", a: "Yes. Arryve integrates with HotelKey, Opera, Cloudbeds, Mews and others — so Arvy can check availability, pull guest history, and write reservations in real time." },
    { q: "What types of calls can Arvy handle?", a: "Availability, reservations, policy questions (pets, parking, check-in), amenities, returning-guest lookups, and anything in your hotel's knowledge base." },
    { q: "Can calls be transferred to a human?", a: "Absolutely. You configure escalation rules — manager requests, group bookings, or any scenario you choose. Arvy transfers politely to the right extension, with call context already noted on the reservation." },
    { q: "Is it suitable for small hotels?", a: "Yes. Small and boutique hotels often benefit most — leaner front desk teams feel the impact of missed calls more than anyone." },
    { q: "How is guest data handled?", a: "All calls are encrypted in transit and at rest. GDPR compliant. Arryve never stores guest data beyond what's needed, and it's never shared with third parties." },
  ];

  return (
    <section id="faq" className="bg-white min-h-[100svh] px-5 sm:px-8 md:px-12 pt-24 pb-24">
      <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-5 gap-10 lg:gap-20">
        <div className="lg:col-span-2 lg:sticky lg:top-28 lg:self-start">
          <FadeIn>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-forest-950/60 mb-6">
              <span className="h-px w-8 bg-forest-950/40" />
              Questions
            </div>
            <h2 className="font-serif text-[40px] md:text-[56px] font-normal tracking-[-0.02em] leading-[1.02] text-forest-950 mb-6 text-balance">
              What hotels ask us <em className="italic font-light">first</em>.
            </h2>
            <p className="text-base text-ivory-700 leading-[1.6] text-pretty">
              Don't see yours?{' '}
              <a
                href={MAILTO_CONTACT_URL}
                className="text-forest-950 underline underline-offset-[6px] decoration-forest-950/30 hover:decoration-forest-950 transition-colors"
              >
                Email us
              </a>
              .
            </p>
          </FadeIn>
        </div>
        <div className="lg:col-span-3">
          <div className="divide-y divide-ivory-200 border-y border-ivory-200">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} delay={i * 0.03} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer, delay }: { key?: React.Key, question: string, answer: string, delay: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FadeIn delay={delay}>
      <button
        onClick={() => {
          if (!isOpen) logCtaClick('faq_open', { question: question.slice(0, 60) });
          setIsOpen(!isOpen);
        }}
        className="w-full py-5 md:py-6 flex items-start justify-between text-left focus:outline-none group"
      >
        <span className="font-serif text-lg md:text-xl text-forest-950 pr-6 leading-snug text-pretty group-hover:text-forest-900 transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-forest-950/50 mt-2 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="pb-6 text-base text-ivory-700 leading-[1.65] pr-10 text-pretty max-w-2xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </FadeIn>
  );
}

/* ─── Book a demo (final CTA + form) ─── */

function BookDemoSection() {
  return (
    <section
      id="book-demo"
      className="film-grain relative bg-forest-950 text-ivory-50 min-h-[100svh] px-5 sm:px-8 md:px-12 pt-24 pb-20 overflow-hidden"
    >
      <div className="warm-wash absolute inset-0 z-[1] opacity-40" />
      <div className="relative z-[3] max-w-6xl mx-auto w-full grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-center min-h-[80svh] py-8">
        <FadeIn>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ivory-100/70 mb-8">
            <span className="h-px w-8 bg-ivory-100/50" />
            Book a demo
          </div>
          <h2 className="font-serif text-[56px] md:text-[84px] lg:text-[104px] font-normal tracking-[-0.03em] leading-[0.94] text-ivory-50 text-balance mb-6">
            Answer <em className="italic font-light">every</em> call.
          </h2>
          <p className="text-base md:text-lg text-ivory-100/80 leading-[1.6] max-w-md text-pretty mb-7">
            30 minutes on Google Meet. Pick a time that works and we'll join from {CONTACT_EMAIL} to walk through live calls, PMS sync, and rollout timing.
          </p>
          <div className="space-y-2.5 text-sm text-ivory-100/75">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-ivory-100/90 flex-shrink-0" />
              Live walkthrough on your own numbers
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-ivory-100/90 flex-shrink-0" />
              PMS sync demonstrated end-to-end
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-ivory-100/90 flex-shrink-0" />
              No commitment, no credit card
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="rounded-3xl bg-ivory-50/[0.04] backdrop-blur-sm border border-ivory-50/10 p-6 md:p-8">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ivory-100/60 mb-5">
              <span className="h-px w-8 bg-ivory-100/35" />
              Google Workspace scheduling
            </div>
            <h3 className="font-serif text-[32px] md:text-[42px] leading-[1.02] tracking-[-0.02em] text-ivory-50 mb-4 text-balance">
              Schedule a demo with <span className="italic font-light">{CONTACT_EMAIL}</span>.
            </h3>
            <p className="text-base text-ivory-100/72 leading-[1.65] text-pretty max-w-lg mb-8">
              Use the booking link to open Google Calendar and lock in a time. If you'd rather start over email, write to {CONTACT_EMAIL} and we'll coordinate directly.
            </p>
            <div className="space-y-4">
              <a
                href={BOOK_DEMO_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => logCtaClick('book_demo', { placement: 'book_demo_section' })}
                className="w-full bg-ivory-50 text-forest-950 py-3.5 rounded-full text-sm font-medium hover:bg-white transition-colors inline-flex items-center justify-center gap-2 group"
              >
                Schedule in Google Calendar
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href={MAILTO_CONTACT_URL}
                onClick={() => logCtaClick('email_contact', { placement: 'book_demo_section' })}
                className="w-full rounded-full border border-ivory-50/15 bg-ivory-50/[0.02] py-3.5 px-5 text-sm text-ivory-50/85 hover:bg-ivory-50/[0.06] hover:text-white transition-colors inline-flex items-center justify-center"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
            <div className="mt-8 pt-6 border-t border-ivory-50/10 grid sm:grid-cols-2 gap-4 text-sm text-ivory-100/72">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-ivory-100/45 font-medium mb-2">Meeting format</div>
                Google Meet with a 30-minute working session focused on your current call volume and PMS workflow.
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-ivory-100/45 font-medium mb-2">Need a direct intro?</div>
                Reply from your hotel email and we'll follow up from <a href={MAILTO_CONTACT_URL} className="text-ivory-50 underline underline-offset-4 decoration-ivory-100/25 hover:decoration-ivory-50">{CONTACT_EMAIL}</a>.
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      <div className="relative z-[3] max-w-6xl mx-auto mt-12 pt-8 border-t border-ivory-50/10">
        <FooterInline />
      </div>
    </section>
  );
}

/* ─── Footer (inline inside BookDemoSection) ─── */

function FooterInline() {
  return (
    <div>
      <LiveCallCounter />
      <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8 md:gap-10">
        <div>
          <img src="/arryve-logo.svg" alt="Arryve" className="h-6 mb-4 brightness-0 invert" />
          <p className="font-serif text-base text-ivory-100/75 leading-[1.5] max-w-xs text-pretty">
            A better arrival starts with the first call.
          </p>

          <div className="mt-8 max-w-xs space-y-3">
            <div className="font-serif text-xl text-ivory-50">Arvy</div>
            <div className="text-[13px] text-ivory-100/55 font-mono tracking-tight">
              /ˈɑːr.vi/
            </div>
            <p className="text-[13px] text-ivory-100/65 leading-[1.6] text-pretty">
              A masculine name of <span className="italic text-ivory-100/85">German</span> and <span className="italic text-ivory-100/85">Scandinavian</span> origin, meaning <span className="text-ivory-100/85">"friend of the people."</span>
            </p>
          </div>
        </div>
        <FooterCol title="Product" links={[
          { label: "How it answers", href: "#how-answers" },
          { label: "Try a call", href: "#try-a-call" },
          { label: "Integrations", href: "#integrations" },
          { label: "Pricing", href: "#pricing" },
          { label: "FAQ", href: "#faq" },
        ]} />
        <FooterCol title="Company" links={[
          { label: "About", href: "#" },
          { label: "Contact", href: MAILTO_CONTACT_URL },
        ]} />
        <FooterCol title="Legal" links={[
          { label: "Privacy", href: "#" },
          { label: "Terms", href: "#" },
        ]} />
      </div>
      <div className="pt-8 mt-8 border-t border-ivory-50/10 flex flex-wrap items-center justify-between gap-3 text-xs text-ivory-100/55">
        <div>© {new Date().getFullYear()} Arryve. All rights reserved.</div>
        <div className="inline-flex items-center gap-1.5">
          Made with
          <Heart className="w-3.5 h-3.5 fill-ivory-100/70 text-ivory-100/70" />
          in Cincinnati
        </div>
      </div>
    </div>
  );
}

function LiveCallCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-20% 0px' });
  const isDocumentVisible = useDocumentVisible();
  const [count, setCount] = useState(() => 5284 + Math.floor(Math.random() * 30));

  useEffect(() => {
    if (prefersReducedMotion() || !inView || !isDocumentVisible) return;
    const id = setInterval(() => setCount((c) => c + 1), 3200);
    return () => clearInterval(id);
  }, [inView, isDocumentVisible]);

  const digits = count.toLocaleString().split('');

  return (
    <div ref={ref} className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-10 mb-10 border-b border-ivory-50/10">
      <div className="inline-flex items-baseline">
        <span className="flex overflow-hidden font-serif text-[32px] md:text-[44px] text-ivory-50 tracking-tight tabular-nums">
          <AnimatePresence initial={false} mode="popLayout">
            {digits.map((d, i) => (
              <motion.span
                key={`${i}-${d}-${digits.length}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {d}
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
      </div>
      <span className="text-[13px] text-ivory-100/70 leading-[1.5]">
        guest calls answered through Arryve this week
        <span className="inline-flex items-center gap-1 ml-3 text-ivory-100/50">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ivory-100 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ivory-100/80" />
          </span>
          live
        </span>
      </span>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-[10px] text-ivory-100/50 uppercase tracking-[0.22em] mb-4 font-medium">{title}</h4>
      <div className="space-y-3">
        {links.map((l) => (
          <a key={l.label} href={l.href} className="block text-sm text-ivory-100/85 hover:text-white transition-colors">
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Footer (kept as-is, but no longer rendered — BookDemoSection owns the final frame) ─── */

function Footer() {
  return null;
}
