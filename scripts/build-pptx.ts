import * as pptxgenModule from 'pptxgenjs';
import * as sharpModule from 'sharp';
import fs from 'fs';
import path from 'path';

/* pptxgenjs / sharp have nested default due to CJS/ESM interop under tsx */
const pptxgen: any =
  (pptxgenModule as any).default?.default ??
  (pptxgenModule as any).default ??
  pptxgenModule;
const sharp: any =
  (sharpModule as any).default?.default ??
  (sharpModule as any).default ??
  sharpModule;

/* ─── Design tokens (match landing page / web deck) ──────────────────── */
const C = {
  forest: '03241E',
  forestMid: '073A2F',
  ivoryLight: 'FDFBF7',
  ivoryWarm: 'F7F3EC',
  ivoryBorder: 'EDE7DC',
  ivoryBody: '554E43',
  ivoryMuted: '736A5C',
  acid: 'F2C62C',
  white: 'FFFFFF',
  forest70: '3E504B',
  forest60: '4C635E',
  forest40: '828F8C',
  forest25: 'AEB6B4',
  forest15: 'CFD4D3',
  forest10: 'DCE0DF',
};
const F = { serif: 'Fraunces', sans: 'Inter' };

/* ─── Logo preloading ────────────────────────────────────────────────── */

async function fetchLogo(domain: string): Promise<string | null> {
  const url =
    `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON` +
    `&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null; // generic 1px fallback — skip
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function renderArryveLogo(variant: 'dark' | 'light'): Promise<string> {
  const svgPath = path.resolve(process.cwd(), 'public', 'arryve-logo.svg');
  const raw = fs.readFileSync(svgPath, 'utf-8');
  const svg =
    variant === 'light'
      ? raw.replace(/rgb\(3,36,30\)/g, 'rgb(253,251,247)')
      : raw;
  const png = await sharp(Buffer.from(svg))
    .resize({ height: 600 })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

type LogoMap = Record<string, string | null>;

async function preloadLogos(): Promise<{ arryveDark: string; arryveLight: string; brands: LogoMap }> {
  /* Only Slide 14 acquirers use logos now; competitors + PMS are text wordmarks. */
  const domains = [
    'canarytechnologies.com',
    'ihg.com',
    'oracle.com',
    'cloudbeds.com',
    'siteminder.com',
  ];

  const brandEntries = await Promise.all(
    domains.map(async (d) => [d, await fetchLogo(d)] as const),
  );

  const [arryveDark, arryveLight] = await Promise.all([
    renderArryveLogo('dark'),
    renderArryveLogo('light'),
  ]);

  return {
    arryveDark,
    arryveLight,
    brands: Object.fromEntries(brandEntries) as LogoMap,
  };
}

/* ─── Main build ─────────────────────────────────────────────────────── */

async function main() {
  console.log('Preloading logos...');
  const { arryveDark, arryveLight, brands } = await preloadLogos();

  const missing = Object.entries(brands).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.log(`  ⚠ Logo unresolved, using text fallback: ${missing.join(', ')}`);
  }

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'Arryve — Seed pitch';
  pres.author = 'Arryve';

  pres.defineSlideMaster({ title: 'LIGHT', background: { color: C.ivoryLight } });
  pres.defineSlideMaster({ title: 'WHITE', background: { color: C.white } });
  pres.defineSlideMaster({ title: 'WARM', background: { color: C.ivoryWarm } });
  pres.defineSlideMaster({ title: 'DARK', background: { color: C.forest } });

  type Slide = ReturnType<typeof pres.addSlide>;

  /* ── Shared primitives ───────────────────────────────────────────── */

  function addSlideNumber(slide: Slide, n: number, dark = false) {
    slide.addText(String(n).padStart(2, '0') + ' / 15', {
      x: 11.6, y: 0.35, w: 1.4, h: 0.3,
      fontFace: F.sans, fontSize: 9,
      color: dark ? 'FFFFFF' : C.forest,
      transparency: 55, charSpacing: 3, align: 'right',
    });
  }

  function addEyebrow(slide: Slide, text: string, y = 0.7, dark = false) {
    slide.addShape('line', {
      x: 0.75, y: y + 0.11, w: 0.4, h: 0,
      line: { color: dark ? 'FFFFFF' : C.forest, width: 0.75, transparency: dark ? 50 : 60 },
    });
    slide.addText(text.toUpperCase(), {
      x: 1.2, y, w: 6, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: dark ? 'FFFFFF' : C.forest,
      transparency: dark ? 30 : 40, charSpacing: 4,
    });
  }

  function logoChip(
    slide: Slide,
    data: string | null,
    fallback: string,
    opts: { x: number; y: number; w: number; h: number; dark?: boolean },
  ) {
    if (data) {
      slide.addImage({
        data,
        x: opts.x,
        y: opts.y,
        w: opts.w,
        h: opts.h,
        sizing: { type: 'contain', w: opts.w, h: opts.h },
      });
    } else {
      slide.addText(fallback, {
        x: opts.x,
        y: opts.y,
        w: opts.w,
        h: opts.h,
        fontFace: F.serif,
        fontSize: Math.max(10, Math.min(16, opts.h * 24)),
        color: opts.dark ? C.ivoryLight : C.forest,
        valign: 'middle',
      });
    }
  }

  /* ── Slide 01 — Title ─────────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'DARK' });
    addSlideNumber(s, 1, true);
    addEyebrow(s, 'Seed · 2026', 0.7, true);

    // Arryve wordmark — replaces the typed "Arryve" heading on the HTML deck
    s.addImage({
      data: arryveLight,
      x: 0.7, y: 1.5, w: 6.5, h: 1.7,
      sizing: { type: 'contain', w: 6.5, h: 1.7 },
    });

    s.addText(
      [
        { text: 'A better arrival starts with the ' },
        {
          text: 'first call',
          options: { italic: true, highlight: C.acid, color: C.forest },
        },
        { text: '.', options: { italic: true } },
      ],
      {
        x: 0.75, y: 3.5, w: 11, h: 1,
        fontFace: F.serif, fontSize: 30,
        color: C.ivoryLight, transparency: 10,
      },
    );

    s.addText(
      [
        { text: 'Rakhmatjon', options: { bold: true, color: C.ivoryLight } },
        { text: '  Founder', options: { color: C.ivoryLight, transparency: 45 } },
        { text: '     ·     ', options: { color: C.ivoryLight, transparency: 65 } },
        { text: 'Nurislombek', options: { bold: true, color: C.ivoryLight } },
        { text: '  Technical Co-Founder', options: { color: C.ivoryLight, transparency: 45 } },
        { text: '     ·     ', options: { color: C.ivoryLight, transparency: 65 } },
        { text: 'Cincinnati, OH', options: { color: C.ivoryLight, transparency: 30 } },
      ],
      { x: 0.75, y: 6.1, w: 12, h: 0.4, fontFace: F.sans, fontSize: 12 },
    );
  }

  /* ── Slide 02 — Problem ───────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'LIGHT' });
    addSlideNumber(s, 2);
    addEyebrow(s, 'The problem');

    s.addText(
      [
        { text: 'Hotels are losing bookings ' },
        {
          text: 'every hour the phone rings',
          options: { italic: true, highlight: C.acid },
        },
        { text: '.', options: { italic: true } },
      ],
      {
        x: 0.75, y: 1.25, w: 11, h: 1.5,
        fontFace: F.serif, fontSize: 44, color: C.forest, charSpacing: -1,
      },
    );

    const stats = [
      {
        big: '1 in 3',
        label: 'guest calls unanswered',
        body: 'During busy shifts and after hours — every one is a booking lost to an OTA, a competitor, or silence.',
      },
      {
        big: '$12k',
        label: 'in direct bookings lost / month',
        body: 'A handful of unanswered calls a day compounds fast. The callers were ready — they just needed a human on the line.',
      },
      {
        big: '2.5 hrs',
        label: 'staff time on FAQ / day',
        body: 'Parking. Pets. Breakfast. Check-in. Dozens of times a day, pulling staff from guests standing right in front of them.',
      },
    ];

    const col_w = 3.9, gap = 0.2;
    stats.forEach((st, i) => {
      const x = 0.75 + i * (col_w + gap);
      s.addShape('line', {
        x, y: 3.3, w: col_w, h: 0,
        line: { color: C.forest, width: 1.5, transparency: 65 },
      });
      s.addText(st.big, {
        x, y: 3.45, w: col_w, h: 1.4,
        fontFace: F.serif, fontSize: 68, color: C.forest, charSpacing: -3,
      });
      s.addText(st.label.toUpperCase(), {
        x, y: 4.85, w: col_w, h: 0.35,
        fontFace: F.sans, fontSize: 10, bold: true,
        color: C.forest, transparency: 25, charSpacing: 4,
      });
      s.addText(st.body, {
        x, y: 5.3, w: col_w, h: 1.3,
        fontFace: F.sans, fontSize: 11.5, color: C.forest70, valign: 'top',
      });
    });

    s.addText(
      [
        { text: 'And call centers cost ' },
        {
          text: '$2.50 / call',
          options: { fontFace: 'Courier New', color: C.forest, bold: true },
        },
        { text: " — they take messages, don't capture bookings, don't see the PMS." },
      ],
      {
        x: 0.75, y: 6.7, w: 12, h: 0.4,
        fontFace: F.sans, fontSize: 11.5, italic: true,
        color: C.forest70,
      },
    );
  }

  /* ── Slide 03 — Why now ───────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WHITE' });
    addSlideNumber(s, 3);
    addEyebrow(s, 'Why now');

    s.addText(
      [
        { text: 'Three curves crossed in the last ' },
        { text: '18 months', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 11, h: 1.4,
        fontFace: F.serif, fontSize: 42, color: C.forest, charSpacing: -1,
      },
    );

    const items = [
      { n: '01', title: 'Voice AI crossed the line.', body: "Streaming latency under 300ms. Natural prosody. The guest on the other end can't tell — and doesn't care to." },
      { n: '02', title: 'PMS APIs finally opened up.', body: 'HotelKey, Opera, Cloudbeds, Mews — stable, documented, no longer gated to enterprise integrations only.' },
      { n: '03', title: 'Hotel labor is structurally short.', body: "Front-desk wages up 25%+ post-COVID. Small-property understaffing isn't a cycle — it's the new baseline." },
    ];

    const col_w = 3.9, gap = 0.2;
    items.forEach((it, i) => {
      const x = 0.75 + i * (col_w + gap);
      s.addText(it.n, {
        x, y: 3.3, w: col_w, h: 0.3,
        fontFace: 'Courier New', fontSize: 11, bold: true,
        color: C.forest, transparency: 40,
      });
      s.addText(it.title, {
        x, y: 3.65, w: col_w, h: 0.9,
        fontFace: F.serif, fontSize: 22, color: C.forest,
      });
      s.addText(it.body, {
        x, y: 4.65, w: col_w, h: 1.8,
        fontFace: F.sans, fontSize: 12, color: C.forest70, valign: 'top',
      });
    });

    s.addShape('line', {
      x: 0.75, y: 6.45, w: 11.8, h: 0,
      line: { color: C.forest, width: 0.75, transparency: 80 },
    });
    s.addText(
      [
        { text: "Small hotels couldn't afford call centers " },
        { text: 'or', options: { italic: false } },
        { text: ' enterprise AI. ' },
        { text: 'Now they get both, in one line.', options: { highlight: C.acid } },
      ],
      {
        x: 0.75, y: 6.6, w: 11.8, h: 0.45,
        fontFace: F.serif, fontSize: 16, italic: true, color: C.forest,
      },
    );
  }

  /* ── Slide 04 — Solution ──────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WARM' });
    addSlideNumber(s, 4);

    // Arryve wordmark + "presents" line on top of left column
    s.addImage({
      data: arryveDark,
      x: 0.75, y: 0.72, w: 1.3, h: 0.35,
      sizing: { type: 'contain', w: 1.3, h: 0.35 },
    });
    s.addText('PRESENTS', {
      x: 2.2, y: 0.72, w: 2, h: 0.35,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 45, charSpacing: 4, valign: 'middle',
    });

    addEyebrow(s, 'Solution', 1.25);

    s.addText(
      [
        { text: 'Meet ' },
        { text: 'Arvy', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.8, w: 7, h: 1.8,
        fontFace: F.serif, fontSize: 72, color: C.forest, charSpacing: -2,
      },
    );

    s.addText(
      [
        { text: 'The AI voice that ' },
        { text: 'answers every guest call', options: { highlight: C.acid } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 3.65, w: 6.2, h: 0.8,
        fontFace: F.serif, fontSize: 22, color: C.forest, transparency: 10,
      },
    );

    const bullets = [
      "Answers every call, 24/7, in your hotel's voice",
      'Captures bookings live — writes to your PMS mid-call',
      'Handles routine FAQ in under 30 seconds',
      'Escalates with context — reservation note, pre-briefed transfer',
    ];
    bullets.forEach((b, i) => {
      const y = 4.75 + i * 0.45;
      s.addShape('rect', {
        x: 0.75, y: y + 0.13, w: 0.14, h: 0.14,
        fill: { color: C.forestMid }, line: { type: 'none' },
      });
      s.addText(b, {
        x: 1.05, y, w: 6.2, h: 0.4,
        fontFace: F.sans, fontSize: 13, color: C.forest,
      });
    });

    /* live-call card */
    const cardX = 7.8, cardY = 1.35, cardW = 4.75, cardH = 4.9;
    s.addShape('roundRect', {
      x: cardX, y: cardY, w: cardW, h: cardH,
      fill: { color: C.white },
      line: { color: C.forest15, width: 0.75 },
      rectRadius: 0.2,
    });
    s.addShape('line', {
      x: cardX + 0.25, y: cardY + 0.7, w: cardW - 0.5, h: 0,
      line: { color: C.ivoryBorder, width: 0.75 },
    });
    s.addShape('ellipse', {
      x: cardX + 0.3, y: cardY + 0.3, w: 0.16, h: 0.16,
      fill: { color: C.forestMid }, line: { type: 'none' },
    });
    s.addText('LIVE CALL', {
      x: cardX + 0.55, y: cardY + 0.22, w: 2.5, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.forest, charSpacing: 4,
    });
    s.addText('11:42 PM', {
      x: cardX + cardW - 1.2, y: cardY + 0.22, w: 1, h: 0.3,
      fontFace: F.sans, fontSize: 10, color: C.ivoryMuted, align: 'right',
    });
    s.addText('GUEST', {
      x: cardX + 0.3, y: cardY + 1, w: 2, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 45, charSpacing: 4,
    });
    s.addText('Any chance you have a king tonight?', {
      x: cardX + 0.3, y: cardY + 1.25, w: cardW - 0.6, h: 0.45,
      fontFace: F.sans, fontSize: 13, color: C.forest,
    });
    s.addText('ARVY', {
      x: cardX + 0.3, y: cardY + 1.95, w: 2, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 45, charSpacing: 4,
    });
    s.addText(
      'One king at $189, breakfast included. Whose name shall I put the reservation under?',
      {
        x: cardX + 0.3, y: cardY + 2.2, w: cardW - 0.6, h: 1.0,
        fontFace: F.sans, fontSize: 13, color: C.forest,
      },
    );
    s.addShape('line', {
      x: cardX + 0.25, y: cardY + cardH - 0.85, w: cardW - 0.5, h: 0,
      line: { color: C.ivoryBorder, width: 0.75 },
    });
    s.addShape('roundRect', {
      x: cardX + 0.3, y: cardY + cardH - 0.65, w: 2.2, h: 0.4,
      fill: { color: C.forest }, line: { type: 'none' },
      rectRadius: 0.2,
    });
    s.addText('✓ BOOKING CAPTURED', {
      x: cardX + 0.3, y: cardY + cardH - 0.65, w: 2.2, h: 0.4,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.ivoryLight, charSpacing: 4, align: 'center', valign: 'middle',
    });
    s.addText('0:42 · synced to PMS', {
      x: cardX + cardW - 1.8, y: cardY + cardH - 0.6, w: 1.5, h: 0.3,
      fontFace: F.sans, fontSize: 10, color: C.ivoryMuted, align: 'right',
    });
  }

  /* ── Slide 05 — How it works ──────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WHITE' });
    addSlideNumber(s, 5);
    addEyebrow(s, 'How it works');

    s.addText(
      [
        { text: 'Three kinds of calls. ' },
        { text: 'One steady voice', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 11.8, h: 1.2,
        fontFace: F.serif, fontSize: 42, color: C.forest, charSpacing: -1,
      },
    );

    const scenarios = [
      { n: '01', label: 'New booking', title: 'Reservation written straight into the PMS.', outcome: 'BOOKING CAPTURED', meta: '0:42 · synced' },
      { n: '02', label: 'Returning guest', title: 'Profile + prior stays pulled in real time.', outcome: 'CONFIRMED', meta: '0:28 · no transfer' },
      { n: '03', label: 'Escalation with context', title: 'Transferred with the note already written.', outcome: 'TRANSFERRED', meta: '0:16 · to ext. 100' },
    ];

    const card_w = 3.9;
    scenarios.forEach((sc, i) => {
      const x = 0.75 + i * (card_w + 0.2);
      const y = 3.1, h = 2.55;
      s.addShape('roundRect', {
        x, y, w: card_w, h,
        fill: { color: C.ivoryLight },
        line: { color: C.forest15, width: 0.75 },
        rectRadius: 0.15,
      });
      s.addText(sc.n, {
        x: x + 0.3, y: y + 0.25, w: 1, h: 0.3,
        fontFace: 'Courier New', fontSize: 10, color: C.forest, transparency: 55,
      });
      s.addText(sc.label.toUpperCase(), {
        x: x + card_w - 2.4, y: y + 0.25, w: 2.1, h: 0.3,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: C.forest, transparency: 40, charSpacing: 4, align: 'right',
      });
      s.addText(sc.title, {
        x: x + 0.3, y: y + 0.7, w: card_w - 0.6, h: 1.1,
        fontFace: F.serif, fontSize: 18, color: C.forest,
      });
      s.addShape('line', {
        x: x + 0.3, y: y + h - 0.7, w: card_w - 0.6, h: 0,
        line: { color: C.ivoryBorder, width: 0.75 },
      });
      s.addShape('roundRect', {
        x: x + 0.3, y: y + h - 0.5, w: 2.1, h: 0.35,
        fill: { color: C.forest }, line: { type: 'none' }, rectRadius: 0.2,
      });
      s.addText(`✓ ${sc.outcome}`, {
        x: x + 0.3, y: y + h - 0.5, w: 2.1, h: 0.35,
        fontFace: F.sans, fontSize: 8, bold: true,
        color: C.ivoryLight, charSpacing: 4, align: 'center', valign: 'middle',
      });
      s.addText(sc.meta, {
        x: x + card_w - 1.8, y: y + h - 0.47, w: 1.5, h: 0.3,
        fontFace: F.sans, fontSize: 9, color: C.ivoryMuted, align: 'right',
      });
    });

    /* PMS integration strip — matches HTML deck's logo row */
    s.addShape('line', {
      x: 0.75, y: 6.1, w: 11.8, h: 0,
      line: { color: C.forest, width: 0.5, transparency: 85 },
    });
    s.addText('INTEGRATES DIRECTLY WITH', {
      x: 0.75, y: 6.2, w: 5, h: 0.3,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 40, charSpacing: 4,
    });
    s.addText('Real-time PMS read + write', {
      x: 7, y: 6.2, w: 5.5, h: 0.3,
      fontFace: F.sans, fontSize: 9, color: C.forest, transparency: 55,
      align: 'right',
    });

    const pms = ['HotelKey', 'Opera', 'Cloudbeds', 'Mews', 'Twilio', 'Stayntouch'];
    const chip_w = 1.7, chip_h = 0.55, chip_gap = 0.25;
    pms.forEach((n, i) => {
      const x = 0.75 + i * (chip_w + chip_gap);
      const y = 6.65;
      s.addShape('roundRect', {
        x, y, w: chip_w, h: chip_h,
        fill: { color: C.white },
        line: { color: C.forest15, width: 0.5 },
        rectRadius: 0.08,
      });
      s.addText(n, {
        x: x + 0.2, y: y + 0.1, w: chip_w - 0.4, h: chip_h - 0.2,
        fontFace: F.serif, fontSize: 13, color: C.forest,
        align: 'center', valign: 'middle',
      });
    });
  }

  /* ── Slide 06 — Founder fit ───────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'LIGHT' });
    addSlideNumber(s, 6);
    addEyebrow(s, 'Founder-product fit');

    s.addText(
      [
        { text: 'I lived the missed call ' },
        { text: 'every shift', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 6.5, h: 1.8,
        fontFace: F.serif, fontSize: 40, color: C.forest, charSpacing: -1,
      },
    );
    s.addText(
      "Three-plus years working the US hotel industry — watching bookings walk to OTAs because the phone rang during check-in. This isn't a thesis. It's the job I had.",
      {
        x: 0.75, y: 3.1, w: 6.5, h: 1.3,
        fontFace: F.sans, fontSize: 13, color: C.forest70, valign: 'top',
      },
    );
    s.addText(
      'I built Arryve for the person behind the desk. Hospitality is human; the phone work is the part we can take off their plate.',
      {
        x: 0.75, y: 4.5, w: 6.5, h: 1.1,
        fontFace: F.sans, fontSize: 13, color: C.forest70, valign: 'top',
      },
    );

    const cardX = 7.7, cardY = 1.3, cardW = 4.85, cardH = 5.2;
    s.addShape('roundRect', {
      x: cardX, y: cardY, w: cardW, h: cardH,
      fill: { color: C.white },
      line: { color: C.forest15, width: 0.75 },
      rectRadius: 0.2,
    });
    s.addText('WHAT I BRING TO THIS PROBLEM', {
      x: cardX + 0.35, y: cardY + 0.35, w: cardW - 0.5, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.forest, transparency: 40, charSpacing: 4,
    });

    const rows = [
      { h: '3+ years in US hotel operations', b: 'Front-desk and operations roles at [specific HIE / Holiday Inn properties].' },
      { h: 'Personal network in the Midwest', b: "[~N hotelier relationships] across OH / KY / IN — warm-intro velocity that cold outbound can't match." },
      { h: 'Native Uzbek + English fluency', b: 'Unlocks the Cincinnati Uzbek-American hotelier network — a distribution wedge no one else has.' },
      { h: 'Technical co-founder: Nurislombek', b: '[Engineering background — voice AI / systems experience].' },
    ];
    rows.forEach((r, i) => {
      const y = cardY + 0.95 + i * 1.02;
      s.addShape('rect', {
        x: cardX + 0.35, y: y + 0.05, w: 0.12, h: 0.12,
        fill: { color: C.forestMid }, line: { type: 'none' },
      });
      s.addText(r.h, {
        x: cardX + 0.6, y, w: cardW - 0.85, h: 0.3,
        fontFace: F.sans, fontSize: 12, bold: true, color: C.forest,
      });
      s.addText(r.b, {
        x: cardX + 0.6, y: y + 0.3, w: cardW - 0.85, h: 0.65,
        fontFace: F.sans, fontSize: 11, color: C.forest70,
      });
    });
  }

  /* ── Slide 07 — Market ────────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WHITE' });
    addSlideNumber(s, 7);
    addEyebrow(s, 'Market opportunity');

    s.addText(
      [
        { text: 'A large, ' },
        { text: 'underserved wedge', options: { highlight: C.acid } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 11, h: 1.4,
        fontFace: F.serif, fontSize: 42, color: C.forest, charSpacing: -1,
      },
    );

    const stats = [
      { v: '~40K', l: 'US small & mid-sized hotels', d: 'Independents and franchisees — our direct target. (Total US: ~60K.)', emphasis: false },
      { v: '$860M', l: 'US TAM', d: '40K × $21,588/yr (Property annual). Before international expansion.', emphasis: true },
      { v: '~$320M', l: 'SAM near-term', d: '~15K properties on HotelKey / Opera / Cloudbeds / Mews today.', emphasis: false },
    ];

    const card_w = 3.9;
    stats.forEach((st, i) => {
      const x = 0.75 + i * (card_w + 0.2);
      const y = 2.9, h = 2.3;
      s.addShape('roundRect', {
        x, y, w: card_w, h,
        fill: { color: st.emphasis ? C.forest : C.ivoryLight },
        line: { color: st.emphasis ? C.forest : C.forest15, width: 0.75 },
        rectRadius: 0.15,
      });
      s.addText(st.v, {
        x: x + 0.35, y: y + 0.25, w: card_w - 0.5, h: 1,
        fontFace: F.serif, fontSize: 56,
        color: st.emphasis ? C.ivoryLight : C.forest,
        charSpacing: -2,
      });
      s.addText(st.l.toUpperCase(), {
        x: x + 0.35, y: y + 1.3, w: card_w - 0.5, h: 0.3,
        fontFace: F.sans, fontSize: 10, bold: true,
        color: st.emphasis ? C.ivoryLight : C.forest,
        transparency: st.emphasis ? 25 : 40, charSpacing: 4,
      });
      s.addText(st.d, {
        x: x + 0.35, y: y + 1.65, w: card_w - 0.5, h: 0.6,
        fontFace: F.sans, fontSize: 11,
        color: st.emphasis ? C.ivoryLight : C.forest70,
        transparency: st.emphasis ? 20 : 0,
      });
    });

    s.addShape('line', {
      x: 0.75, y: 5.55, w: 11.8, h: 0,
      line: { color: C.forest, width: 0.75, transparency: 85 },
    });
    s.addText('WHY THE WEDGE', {
      x: 0.75, y: 5.7, w: 5.5, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.forest, transparency: 45, charSpacing: 4,
    });
    s.addText(
      "Enterprise hotel tech prices out 80% of US properties. Call centers are expensive and don't close. We land where both fail — at small & mid-sized hotels that want to answer every call without hiring another FTE.",
      { x: 0.75, y: 6.0, w: 5.5, h: 1, fontFace: F.sans, fontSize: 11, color: C.forest70 },
    );
    s.addText('INTERNATIONAL', {
      x: 7, y: 5.7, w: 5.5, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.forest, transparency: 45, charSpacing: 4,
    });
    s.addText(
      '~700K hotels globally outside the US. 5–10× TAM expansion once English + 2–3 more languages ship. Voice is the universal interface.',
      { x: 7, y: 6.0, w: 5.5, h: 1, fontFace: F.sans, fontSize: 11, color: C.forest70 },
    );
  }

  /* ── Slide 08 — Go to market ──────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WARM' });
    addSlideNumber(s, 8);
    addEyebrow(s, 'Go to market');

    s.addText(
      [
        { text: 'Start in Cincinnati. ' },
        { text: 'Expand on trust', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 11, h: 1.3,
        fontFace: F.serif, fontSize: 38, color: C.forest, charSpacing: -1,
      },
    );
    s.addText(
      "A distribution advantage competitors can't replicate — because it's community, not marketing.",
      { x: 0.75, y: 2.55, w: 10, h: 0.5, fontFace: F.sans, fontSize: 13, color: C.forest70 },
    );

    const waves = [
      { n: 'WAVE 1', when: 'Q1–Q2 2026', title: 'Cincinnati Uzbek-American hoteliers', body: 'Our diaspora network: [~N properties] of Holiday Inn Express / Holiday Inn franchises. Reference-driven close in weeks, not quarters.', target: '10 paid pilots' },
      { n: 'WAVE 2', when: 'Q3–Q4 2026', title: 'Midwest expansion + AAHOA', body: 'AAHOA: 20,000+ properties, many Indian-American-owned. Same diaspora-trust dynamic — warm intros from Wave 1 operators.', target: '50 paying properties' },
      { n: 'WAVE 3', when: '2027', title: 'IHG franchisee forums + PMS marketplaces', body: 'Listed integrations on HotelKey & Opera marketplaces. Ride Wave 1–2 case studies into IHG owner groups — 40% of our TAM.', target: '300+ properties' },
    ];
    const card_w = 3.9;
    waves.forEach((w, i) => {
      const x = 0.75 + i * (card_w + 0.2);
      const y = 3.4, h = 3.2;
      s.addShape('roundRect', {
        x, y, w: card_w, h,
        fill: { color: C.white },
        line: { color: C.forest15, width: 0.75 },
        rectRadius: 0.15,
      });
      s.addText(w.n, {
        x: x + 0.35, y: y + 0.3, w: 2, h: 0.3,
        fontFace: F.sans, fontSize: 10, bold: true,
        color: C.forestMid, charSpacing: 4,
      });
      s.addText(w.when.toUpperCase(), {
        x: x + card_w - 2.2, y: y + 0.3, w: 1.9, h: 0.3,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: C.forest, transparency: 50, charSpacing: 4, align: 'right',
      });
      s.addText(w.title, {
        x: x + 0.35, y: y + 0.75, w: card_w - 0.5, h: 0.9,
        fontFace: F.serif, fontSize: 18, color: C.forest,
      });
      s.addText(w.body, {
        x: x + 0.35, y: y + 1.65, w: card_w - 0.5, h: 1.15,
        fontFace: F.sans, fontSize: 11, color: C.forest70, valign: 'top',
      });
      s.addShape('line', {
        x: x + 0.35, y: y + h - 0.5, w: card_w - 0.5, h: 0,
        line: { color: C.ivoryBorder, width: 0.75 },
      });
      s.addText(
        [
          { text: 'TARGET: ', options: { color: C.forest, bold: true, charSpacing: 4 } },
          { text: w.target.toUpperCase(), options: { color: C.forest, bold: true, charSpacing: 4 } },
        ],
        {
          x: x + 0.35, y: y + h - 0.4, w: card_w - 0.5, h: 0.3,
          fontFace: F.sans, fontSize: 10, transparency: 25,
        },
      );
    });
  }

  /* ── Slide 09 — Business model ────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'LIGHT' });
    addSlideNumber(s, 9);
    addEyebrow(s, 'Business model');

    s.addText(
      [
        { text: 'One plan, ' },
        { text: 'per property', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 6, h: 1.4,
        fontFace: F.serif, fontSize: 40, color: C.forest, charSpacing: -1,
      },
    );

    const priceRows = [
      { l: 'Monthly', v: '$1,799 / property' },
      { l: 'Annual', v: '$17,990 (2 months free)' },
      { l: 'Onboarding', v: '$2,500 one-time' },
      { l: 'Overage', v: '$1.25 / call above 2,000 / mo' },
    ];
    const cardX = 0.75, cardY = 3, cardW = 6.3, cardH = 3.4;
    s.addShape('roundRect', {
      x: cardX, y: cardY, w: cardW, h: cardH,
      fill: { color: C.white },
      line: { color: C.forest15, width: 0.75 },
      rectRadius: 0.18,
    });
    priceRows.forEach((r, i) => {
      const y = cardY + 0.25 + i * 0.78;
      s.addText(r.l.toUpperCase(), {
        x: cardX + 0.35, y, w: 2.5, h: 0.4,
        fontFace: F.sans, fontSize: 11, bold: true,
        color: C.forest, transparency: 40, charSpacing: 4, valign: 'middle',
      });
      s.addText(r.v, {
        x: cardX + 2.8, y, w: cardW - 3.1, h: 0.4,
        fontFace: F.serif, fontSize: 18, color: C.forest, align: 'right', valign: 'middle',
      });
      if (i < priceRows.length - 1) {
        s.addShape('line', {
          x: cardX + 0.35, y: y + 0.62, w: cardW - 0.7, h: 0,
          line: { color: C.ivoryBorder, width: 0.5 },
        });
      }
    });

    s.addText('UNIT ECONOMICS (TARGET)', {
      x: 7.5, y: 3, w: 5, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.forest, transparency: 40, charSpacing: 4,
    });
    const econ: [string, string][] = [
      ['Gross margin (at scale)', '~70%'],
      ['Target CAC (diaspora-led)', '~$1,500'],
      ['LTV (18-mo avg retention)', '~$30K'],
      ['LTV / CAC', '~20×'],
      ['Payback', '~3 months'],
    ];
    econ.forEach((row, i) => {
      const y = 3.5 + i * 0.5;
      s.addText(row[0], {
        x: 7.5, y, w: 3.5, h: 0.4,
        fontFace: F.sans, fontSize: 12, color: C.forest, transparency: 25, valign: 'middle',
      });
      s.addText(row[1], {
        x: 11, y, w: 1.5, h: 0.4,
        fontFace: 'Courier New', fontSize: 13, color: C.forest,
        align: 'right', valign: 'middle',
      });
      s.addShape('line', {
        x: 7.5, y: y + 0.45, w: 5, h: 0,
        line: { color: C.forest, width: 0.5, transparency: 85 },
      });
    });

    s.addText(
      [
        { text: 'Diaspora-driven GTM keeps CAC below SaaS average. Structural pricing advantage — still roughly half a call center\'s cost, while ' },
        { text: "capturing bookings they can't", options: { highlight: C.acid } },
        { text: '.' },
      ],
      {
        x: 7.5, y: 6.15, w: 5.2, h: 0.9,
        fontFace: F.serif, fontSize: 11.5, italic: true,
        color: C.forest, transparency: 15,
      },
    );
  }

  /* ── Slide 10 — Competition ───────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'LIGHT' });
    addSlideNumber(s, 10);
    addEyebrow(s, 'Competitive landscape');

    s.addText(
      [
        { text: 'The category is validated. ' },
        { text: 'Our lane is empty', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 12, h: 1.3,
        fontFace: F.serif, fontSize: 38, color: C.forest, charSpacing: -1,
      },
    );

    const tableX = 0.75, tableY = 2.85, tableW = 11.8;
    s.addShape('roundRect', {
      x: tableX, y: tableY, w: tableW, h: 4.25,
      fill: { color: C.white },
      line: { color: C.forest15, width: 0.75 },
      rectRadius: 0.15,
    });

    const colW = [3, 3.5, 5.3];
    const colX = [tableX + 0.3, tableX + 0.3 + colW[0] + 0.1, tableX + 0.3 + colW[0] + 0.1 + colW[1] + 0.1];

    s.addShape('rect', {
      x: tableX, y: tableY, w: tableW, h: 0.45,
      fill: { color: C.ivoryWarm }, line: { type: 'none' },
    });
    ['PLAYER', 'FOCUS', 'WHY WE WIN / POSITION'].forEach((h, i) => {
      s.addText(h, {
        x: colX[i], y: tableY, w: colW[i], h: 0.45,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: C.forest, transparency: 35, charSpacing: 4, valign: 'middle',
      });
    });

    type Brand = { d?: string; n: string };
    const rowsData: {
      brands: Brand[];
      focus: string;
      whyRuns: Array<{ text: string; options?: any }>;
      dark?: boolean;
      isArryve?: boolean;
    }[] = [
      {
        brands: [{ d: 'canarytechnologies.com', n: 'Canary Technologies' }],
        focus: 'Guest messaging, upsells, digital check-in',
        whyRuns: [
          { text: 'Text, not voice. Their ' },
          { text: '~$500M valuation', options: { bold: true, color: C.forest } },
          { text: ' validates the category — we own the other half.' },
        ],
      },
      {
        brands: [{ d: 'duve.com', n: 'Duve' }, { d: 'mews.com', n: 'Mews AI' }],
        focus: 'PMS-native guest messaging',
        whyRuns: [{ text: 'Also text-first. Same gap on the phone line.' }],
      },
      {
        brands: [{ d: 'iroomfinder.com', n: 'iroomfinder' }, { d: 'innroad.com', n: 'InnRoad' }],
        focus: 'Human call centers',
        whyRuns: [
          { text: "Expensive, slow, don't capture bookings. " },
          { text: 'The incumbent we directly replace.', options: { bold: true, color: C.forest } },
        ],
      },
      {
        brands: [{ d: 'bland.ai', n: 'Bland AI' }, { d: 'vapi.ai', n: 'Vapi' }, { d: 'retellai.com', n: 'Retell' }],
        focus: 'Horizontal voice AI platforms',
        whyRuns: [{ text: 'No hospitality vertical, no PMS integration, no domain workflows. DIY toolkits — not a product.' }],
      },
      {
        brands: [{ n: 'Arryve' }],
        focus: 'Voice-first · hospitality-specific · small-hotel-priced',
        whyRuns: [
          {
            text: 'White space. No one else is here.',
            options: { highlight: C.acid, color: C.forest, bold: true },
          },
        ],
        dark: true,
        isArryve: true,
      },
    ];

    const rowH = 0.7;
    rowsData.forEach((r, i) => {
      const y = tableY + 0.45 + i * rowH;
      if (r.dark) {
        s.addShape('rect', {
          x: tableX, y, w: tableW, h: rowH,
          fill: { color: C.forest }, line: { type: 'none' },
        });
      }
      const textColor = r.dark ? C.ivoryLight : C.forest;

      /* Player column — Arryve uses the real wordmark; competitors render as text */
      if (r.isArryve) {
        s.addImage({
          data: arryveLight,
          x: colX[0], y: y + 0.12, w: 1.8, h: rowH - 0.24,
          sizing: { type: 'contain', w: 1.8, h: rowH - 0.24 },
        });
      } else {
        s.addText(r.brands.map((b) => b.n).join(' · '), {
          x: colX[0], y, w: colW[0], h: rowH,
          fontFace: F.serif, fontSize: 13, color: C.forest, valign: 'middle',
        });
      }

      s.addText(r.focus, {
        x: colX[1], y, w: colW[1], h: rowH,
        fontFace: F.sans, fontSize: 10.5, color: textColor,
        transparency: r.dark ? 15 : 20, valign: 'middle',
      });
      s.addText(r.whyRuns, {
        x: colX[2], y, w: colW[2], h: rowH,
        fontFace: F.sans, fontSize: 10.5, color: textColor,
        transparency: r.dark ? 5 : 15, valign: 'middle',
      });

      if (!r.dark && i < rowsData.length - 1) {
        s.addShape('line', {
          x: tableX + 0.3, y: y + rowH, w: tableW - 0.6, h: 0,
          line: { color: C.ivoryBorder, width: 0.5 },
        });
      }
    });
  }

  /* ── Slide 11 — Traction ──────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'DARK' });
    addSlideNumber(s, 11, true);
    addEyebrow(s, 'Traction', 0.7, true);

    s.addText(
      [
        { text: 'Early signal from the ' },
        { text: 'real world', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 12, h: 1.4,
        fontFace: F.serif, fontSize: 40, color: C.ivoryLight, charSpacing: -1,
      },
    );

    const metrics = [
      { v: '[N]', l: 'Paid pilots signed' },
      { v: '[$X]', l: 'MRR run-rate' },
      { v: '[N]', l: 'Calls answered / month' },
      { v: '[$X]', l: 'Bookings captured' },
    ];
    metrics.forEach((m, i) => {
      const x = 0.75 + i * 3.05;
      s.addShape('line', {
        x, y: 2.95, w: 2.8, h: 0,
        line: { color: C.ivoryLight, width: 0.75, transparency: 70 },
      });
      s.addText(m.v, {
        x, y: 3.1, w: 2.8, h: 1.2,
        fontFace: F.serif, fontSize: 56, color: C.ivoryLight, charSpacing: -3,
      });
      s.addText(m.l.toUpperCase(), {
        x, y: 4.4, w: 2.8, h: 0.35,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: C.ivoryLight, transparency: 35, charSpacing: 4,
      });
    });

    s.addShape('roundRect', {
      x: 0.75, y: 5.2, w: 9, h: 1.7,
      fill: { color: C.ivoryLight, transparency: 92 },
      line: { color: C.ivoryLight, width: 0.5, transparency: 70 },
      rectRadius: 0.15,
    });
    s.addText(
      '"[GM quote — e.g. \'Arvy caught a $640 booking at 2am that would\'ve gone to Booking.com. Sold me instantly.\']"',
      {
        x: 1, y: 5.3, w: 8.5, h: 1.1,
        fontFace: F.serif, fontSize: 18, italic: true, color: C.ivoryLight,
      },
    );
    s.addText('— [GM name, property, city]', {
      x: 1, y: 6.4, w: 7, h: 0.35,
      fontFace: F.sans, fontSize: 11, color: C.ivoryLight, transparency: 35,
    });
  }

  /* ── Slide 12 — Team ──────────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'LIGHT' });
    addSlideNumber(s, 12);
    addEyebrow(s, 'Team');

    s.addText(
      [
        { text: "Built by people who've been " },
        { text: 'on the line', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 12, h: 1.4,
        fontFace: F.serif, fontSize: 40, color: C.forest, charSpacing: -1,
      },
    );

    const members = [
      { i: 'R', n: 'Rakhmatjon', r: 'Founder', b: '3+ years in US hotel operations — front desk through ops at [HIE / Holiday Inn properties]. Bilingual EN/UZ. [~N hotelier relationships] across OH / KY.' },
      { i: 'N', n: 'Nurislombek', r: 'Technical Co-Founder', b: '[Engineer with voice AI / systems background — specific prior work]. Owns the streaming voice pipeline, PMS integrations, reliability.' },
    ];
    members.forEach((m, idx) => {
      const x = 0.75 + idx * 6.1, y = 2.85, w = 5.9, h = 3;
      s.addShape('roundRect', {
        x, y, w, h,
        fill: { color: C.white },
        line: { color: C.forest15, width: 0.75 },
        rectRadius: 0.2,
      });
      s.addShape('ellipse', {
        x: x + 0.35, y: y + 0.35, w: 0.75, h: 0.75,
        fill: { color: C.forest }, line: { type: 'none' },
      });
      s.addText(m.i, {
        x: x + 0.35, y: y + 0.35, w: 0.75, h: 0.75,
        fontFace: F.serif, fontSize: 22, color: C.ivoryLight,
        align: 'center', valign: 'middle',
      });
      s.addText(m.n, {
        x: x + 1.3, y: y + 0.4, w: w - 1.5, h: 0.45,
        fontFace: F.serif, fontSize: 22, color: C.forest,
      });
      s.addText(m.r.toUpperCase(), {
        x: x + 1.3, y: y + 0.85, w: w - 1.5, h: 0.3,
        fontFace: F.sans, fontSize: 10, bold: true,
        color: C.forest, transparency: 45, charSpacing: 4,
      });
      s.addText(m.b, {
        x: x + 0.35, y: y + 1.45, w: w - 0.7, h: 1.45,
        fontFace: F.sans, fontSize: 12, color: C.forest70, valign: 'top',
      });
    });

    s.addShape('line', {
      x: 0.75, y: 6.15, w: 11.8, h: 0,
      line: { color: C.forest, width: 0.5, transparency: 85 },
    });
    s.addText('ADVISORS', {
      x: 0.75, y: 6.3, w: 3, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.forest, transparency: 40, charSpacing: 4,
    });
    s.addText(
      '[Advisor names — ideally 1 hospitality-ops veteran and 1 voice-AI / SaaS operator]',
      { x: 0.75, y: 6.6, w: 11.8, h: 0.4, fontFace: F.sans, fontSize: 12, color: C.forest70 },
    );
  }

  /* ── Slide 13 — Roadmap & funds ───────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WHITE' });
    addSlideNumber(s, 13);
    addEyebrow(s, 'Roadmap & use of funds');

    s.addText(
      [
        { text: 'Land, repeat, ' },
        { text: 'expand', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 12, h: 1.3,
        fontFace: F.serif, fontSize: 38, color: C.forest, charSpacing: -1,
      },
    );

    const phases = [
      { n: '01', when: 'Q1–Q2 2026', t: 'Land the wedge', items: ['10 paid Cincinnati pilots', 'Harden product + voice quality', '2 more PMS integrations'] },
      { n: '02', when: 'Q3–Q4 2026', t: 'Prove repeatability', items: ['50 paying properties', '~$1M ARR run-rate', 'First 2 hires: 1 SE + 1 GTM'] },
      { n: '03', when: '2027', t: 'Expand beyond Midwest', items: ['300+ properties', 'AAHOA + marketplace distribution', 'Language #2 (Spanish)'] },
    ];
    phases.forEach((p, i) => {
      const x = 0.75 + i * 4, y = 2.7, w = 3.75, h = 2.7;
      s.addShape('roundRect', {
        x, y, w, h,
        fill: { color: C.ivoryLight },
        line: { color: C.forest15, width: 0.75 },
        rectRadius: 0.15,
      });
      s.addText(p.n, {
        x: x + 0.3, y: y + 0.25, w: 1, h: 0.3,
        fontFace: 'Courier New', fontSize: 11, color: C.forest, transparency: 50,
      });
      s.addText(p.when.toUpperCase(), {
        x: x + w - 2.4, y: y + 0.25, w: 2.1, h: 0.3,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: C.forest, transparency: 40, charSpacing: 4, align: 'right',
      });
      s.addText(p.t, {
        x: x + 0.3, y: y + 0.7, w: w - 0.5, h: 0.5,
        fontFace: F.serif, fontSize: 18, color: C.forest,
      });
      p.items.forEach((it, j) => {
        s.addShape('ellipse', {
          x: x + 0.3, y: y + 1.35 + j * 0.4, w: 0.08, h: 0.08,
          fill: { color: C.forestMid }, line: { type: 'none' },
        });
        s.addText(it, {
          x: x + 0.5, y: y + 1.3 + j * 0.4, w: w - 0.7, h: 0.35,
          fontFace: F.sans, fontSize: 11, color: C.forest70, valign: 'middle',
        });
      });
    });

    s.addShape('line', {
      x: 0.75, y: 5.65, w: 11.8, h: 0,
      line: { color: C.forest, width: 0.5, transparency: 85 },
    });
    s.addText('USE OF FUNDS', {
      x: 0.75, y: 5.8, w: 5, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.forest, transparency: 40, charSpacing: 4,
    });

    const funds = [
      { p: '50%', l: 'Engineering', d: 'Voice reliability, PMS integrations' },
      { p: '30%', l: 'Go-to-market', d: 'GTM hire, referrals, diaspora events' },
      { p: '15%', l: 'PMS partnerships', d: 'Certifications, marketplace listings' },
      { p: '5%', l: 'Ops & legal', d: 'Compliance, contracts, infrastructure' },
    ];
    funds.forEach((f, i) => {
      const x = 0.75 + i * 3.05;
      s.addText(f.p, {
        x, y: 6.2, w: 2.8, h: 0.55,
        fontFace: F.serif, fontSize: 30, color: C.forest, charSpacing: -1,
      });
      s.addText(f.l, {
        x, y: 6.75, w: 2.8, h: 0.3,
        fontFace: F.sans, fontSize: 11, bold: true, color: C.forest,
      });
      s.addText(f.d, {
        x, y: 7.0, w: 2.8, h: 0.3,
        fontFace: F.sans, fontSize: 10, color: C.forest70,
      });
    });
  }

  /* ── Slide 14 — Exit ──────────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WARM' });
    addSlideNumber(s, 14);
    addEyebrow(s, 'Exit strategy');

    s.addText(
      [
        { text: 'Multiple credible buyers. ' },
        { text: '3–5 year window', options: { italic: true } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 1.25, w: 12, h: 1.3,
        fontFace: F.serif, fontSize: 38, color: C.forest, charSpacing: -1,
      },
    );

    type AcquirerBrand = { d?: string; n: string };
    const acquirers: { n: string; t: string; brands: AcquirerBrand[] }[] = [
      { n: 'Canary Technologies', t: 'Voice complements their messaging suite. At ~10× ARR comps, $25M ARR → ~$250M exit.', brands: [{ d: 'canarytechnologies.com', n: 'Canary Technologies' }] },
      { n: 'IHG Hotels & Resorts', t: '40% of our TAM are IHG franchisees. Vertical tech acquisition precedent.', brands: [{ d: 'ihg.com', n: 'IHG' }] },
      { n: 'Oracle Hospitality (Opera PMS)', t: 'Voice is the missing layer on the Opera stack.', brands: [{ d: 'oracle.com', n: 'Oracle' }] },
      { n: 'Cloudbeds · SiteMinder', t: 'Distribution platforms adding voice to their bundle.', brands: [{ d: 'cloudbeds.com', n: 'Cloudbeds' }, { d: 'siteminder.com', n: 'SiteMinder' }] },
    ];

    acquirers.forEach((a, i) => {
      const x = 0.75 + (i % 2) * 6.1;
      const y = 2.85 + Math.floor(i / 2) * 1.55;
      s.addShape('roundRect', {
        x, y, w: 5.9, h: 1.3,
        fill: { color: C.white },
        line: { color: C.forest15, width: 0.75 },
        rectRadius: 0.15,
      });

      /* Logo block on left — one or two stacked */
      const logoBoxW = 1.3, logoBoxH = 0.5;
      const bc = a.brands.length;
      a.brands.forEach((b, bi) => {
        const ly = y + 0.2 + bi * (bc === 1 ? 0 : 0.55);
        const lx = x + 0.25;
        s.addShape('roundRect', {
          x: lx - 0.04, y: ly - 0.04, w: logoBoxW + 0.08, h: logoBoxH + 0.08,
          fill: { color: C.ivoryLight }, line: { color: C.forest15, width: 0.4 },
          rectRadius: 0.06,
        });
        logoChip(s, b.d ? brands[b.d] : null, b.n, {
          x: lx, y: ly, w: logoBoxW, h: logoBoxH,
        });
      });

      s.addText(a.n, {
        x: x + 1.75, y: y + 0.2, w: 4, h: 0.4,
        fontFace: F.serif, fontSize: 17, color: C.forest,
      });
      s.addText(a.t, {
        x: x + 1.75, y: y + 0.6, w: 4, h: 0.65,
        fontFace: F.sans, fontSize: 11, color: C.forest70, valign: 'top',
      });
    });

    s.addShape('line', {
      x: 0.75, y: 6.2, w: 11.8, h: 0,
      line: { color: C.forest, width: 0.5, transparency: 80 },
    });
    s.addText('COMPARABLE EXITS', {
      x: 0.75, y: 6.35, w: 5, h: 0.3,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 40, charSpacing: 4,
    });
    s.addText(
      'ALICE → Actabl (2021) · Cendyn → Accor-Sapient · Duetto → GrowthCurve ($270M, 2022) · MeetingPackage → Lightspeed',
      { x: 0.75, y: 6.65, w: 6.2, h: 0.55, fontFace: F.sans, fontSize: 11, color: C.forest70 },
    );
    s.addText('TARGET OUTCOME', {
      x: 7.3, y: 6.35, w: 5, h: 0.3,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 40, charSpacing: 4,
    });
    s.addText(
      [
        { text: '$150M–$500M acquisition', options: { highlight: C.acid } },
        { text: ', 3–5 years.' },
      ],
      {
        x: 7.3, y: 6.6, w: 5.3, h: 0.55,
        fontFace: F.serif, fontSize: 16, italic: true, color: C.forest,
      },
    );
  }

  /* ── Slide 15 — Ask ───────────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'DARK' });
    addSlideNumber(s, 15, true);

    s.addImage({
      data: arryveLight,
      x: 0.75, y: 0.6, w: 1.4, h: 0.4,
      sizing: { type: 'contain', w: 1.4, h: 0.4 },
    });

    addEyebrow(s, 'The ask', 1.25, true);

    s.addText('Raising [$X]', {
      x: 0.75, y: 1.9, w: 12, h: 1.8,
      fontFace: F.serif, fontSize: 88, color: C.ivoryLight, charSpacing: -3,
    });
    s.addText('at [$Y] pre-money.', {
      x: 0.75, y: 3.6, w: 12, h: 0.9,
      fontFace: F.serif, fontSize: 28, italic: true,
      color: C.ivoryLight, transparency: 15,
    });

    s.addShape('roundRect', {
      x: 0.75, y: 4.6, w: 8.5, h: 2.2,
      fill: { color: C.ivoryLight, transparency: 93 },
      line: { color: C.ivoryLight, width: 0.5, transparency: 70 },
      rectRadius: 0.15,
    });
    s.addText('MILESTONES THIS ROUND FUNDS', {
      x: 1, y: 4.75, w: 8, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.ivoryLight, transparency: 30, charSpacing: 4,
    });
    const milestones = [
      '50 paying properties',
      'Seven-figure ARR run-rate',
      'Validated Cincinnati playbook — documented and replicable',
      'First 10 IHG franchisees outside the diaspora wedge',
    ];
    milestones.forEach((m, i) => {
      const y = 5.2 + i * 0.37;
      s.addText('✓', {
        x: 1, y, w: 0.3, h: 0.3,
        fontFace: F.sans, fontSize: 12, bold: true, color: C.acid,
      });
      s.addText(m, {
        x: 1.3, y, w: 7.5, h: 0.3,
        fontFace: F.sans, fontSize: 13, color: C.ivoryLight,
      });
    });

    s.addText('♥  Made in Cincinnati  ·  Arryve  ·  arryve.com', {
      x: 0.75, y: 7.05, w: 12, h: 0.3,
      fontFace: F.sans, fontSize: 11,
      color: C.ivoryLight, transparency: 45, charSpacing: 2,
    });
  }

  const outPath = path.resolve(process.cwd(), 'output', 'arryve-pitch.pptx');
  const name = await pres.writeFile({ fileName: outPath });
  console.log(`✓ Wrote ${name}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
