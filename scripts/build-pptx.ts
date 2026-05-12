import * as pptxgenModule from 'pptxgenjs';
import * as sharpModule from 'sharp';
import fs from 'fs';
import path from 'path';

/* pptxgenjs / sharp have nested default under CJS/ESM interop with tsx */
const pptxgen: any =
  (pptxgenModule as any).default?.default ??
  (pptxgenModule as any).default ??
  pptxgenModule;
const sharp: any =
  (sharpModule as any).default?.default ??
  (sharpModule as any).default ??
  sharpModule;

/* ─── Design tokens (match the web deck) ─────────────────────────────── */
const C = {
  forest: '03241E',
  forestMid: '073A2F',
  forest80: '1C3934',
  forest70: '3E504B',
  forest40: '828F8C',
  forest25: 'AEB6B4',
  forest15: 'CFD4D3',
  forest10: 'DCE0DF',
  ivoryLight: 'FDFBF7',
  ivoryWarm: 'F7F3EC',
  ivoryBorder: 'EDE7DC',
  ivoryBody: '554E43',
  ivoryMuted: '736A5C',
  acid: 'F2C62C',
  white: 'FFFFFF',
};
const F = { serif: 'Fraunces', sans: 'Inter' };
const TOTAL = 9;

async function renderArryveLogo(variant: 'dark' | 'light'): Promise<string> {
  const svgPath = path.resolve(process.cwd(), 'public', 'arryve-logo.svg');
  const raw = fs.readFileSync(svgPath, 'utf-8');
  const svg =
    variant === 'light'
      ? raw.replace(/rgb\(3,36,30\)/g, 'rgb(253,251,247)')
      : raw;
  const png = await sharp(Buffer.from(svg)).resize({ height: 600 }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function main() {
  console.log('Rendering Arryve logo…');
  const [arryveDark, arryveLight] = await Promise.all([
    renderArryveLogo('dark'),
    renderArryveLogo('light'),
  ]);

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'Arryve — Seed pitch';
  pres.author = 'Arryve';
  pres.company = 'Arryve';

  pres.defineSlideMaster({ title: 'LIGHT', background: { color: C.ivoryLight } });
  pres.defineSlideMaster({ title: 'WHITE', background: { color: C.white } });
  pres.defineSlideMaster({ title: 'WARM', background: { color: C.ivoryWarm } });
  pres.defineSlideMaster({ title: 'DARK', background: { color: C.forest } });

  type Slide = ReturnType<typeof pres.addSlide>;

  /* ── Shared primitives ───────────────────────────────────────────── */

  function addSlideNumber(s: Slide, n: number, dark = false) {
    s.addText(`${String(n).padStart(2, '0')} / ${String(TOTAL).padStart(2, '0')}`, {
      x: 11.6, y: 0.35, w: 1.4, h: 0.3,
      fontFace: F.sans, fontSize: 9,
      color: dark ? 'FFFFFF' : C.forest,
      transparency: 55, charSpacing: 3, align: 'right',
    });
  }

  function addEyebrow(s: Slide, text: string, y = 0.7, dark = false) {
    s.addShape('line', {
      x: 0.75, y: y + 0.11, w: 0.4, h: 0,
      line: { color: dark ? 'FFFFFF' : C.forest, width: 0.75, transparency: dark ? 50 : 60 },
    });
    s.addText(text.toUpperCase(), {
      x: 1.2, y, w: 8, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: dark ? 'FFFFFF' : C.forest,
      transparency: dark ? 30 : 40, charSpacing: 4,
    });
  }

  /* ─── Slide 01 — Title ───────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'DARK' });
    addSlideNumber(s, 1, true);
    addEyebrow(s, 'Seed · 2026', 0.7, true);

    s.addImage({
      data: arryveLight,
      x: 0.7, y: 1.4, w: 6, h: 1.5,
      sizing: { type: 'contain', w: 6, h: 1.5 },
    });

    s.addText(
      [
        { text: 'The ' },
        { text: 'AI front desk', options: { highlight: C.acid, color: C.forest } },
        { text: ' for hotels.' },
      ],
      {
        x: 0.75, y: 3.2, w: 11, h: 0.7,
        fontFace: F.serif, fontSize: 30, color: C.ivoryLight,
      },
    );

    s.addText('A better arrival starts with the first call.', {
      x: 0.75, y: 4.0, w: 11, h: 0.6,
      fontFace: F.serif, fontSize: 22, italic: true,
      color: C.ivoryLight, transparency: 25,
    });

    s.addText(
      [
        { text: 'Rakhmatjon', options: { bold: true, color: C.ivoryLight } },
        { text: '  Founder', options: { color: C.ivoryLight, transparency: 45 } },
        { text: '     ·     ', options: { color: C.ivoryLight, transparency: 65 } },
        { text: 'Nurislombek', options: { bold: true, color: C.ivoryLight } },
        { text: '  Technical Co-Founder', options: { color: C.ivoryLight, transparency: 45 } },
      ],
      { x: 0.75, y: 6.5, w: 12, h: 0.4, fontFace: F.sans, fontSize: 12 },
    );
  }

  /* ─── Slide 02 — Problem ─────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'LIGHT' });
    addSlideNumber(s, 2);
    addEyebrow(s, 'The problem');

    s.addText(
      [
        { text: 'Hotels lose bookings ' },
        { text: 'every hour the phone rings', options: { italic: true, highlight: C.acid } },
        { text: '.', options: { italic: true } },
      ],
      {
        x: 0.75, y: 1.25, w: 11, h: 1.4,
        fontFace: F.serif, fontSize: 44, color: C.forest, charSpacing: -1,
      },
    );

    const stats = [
      { big: '1 in 3', label: 'guest calls unanswered' },
      { big: '$12k', label: 'bookings lost / month' },
      { big: '2.5 hrs', label: 'staff time on FAQ / day' },
    ];
    const colW = 3.7;
    const gap = 0.4;
    const x0 = 0.75;
    stats.forEach((stat, i) => {
      const x = x0 + i * (colW + gap);
      s.addShape('line', {
        x, y: 3.4, w: colW, h: 0,
        line: { color: C.forest, width: 1.5, transparency: 75 },
      });
      s.addText(stat.big, {
        x, y: 3.55, w: colW, h: 1.4,
        fontFace: F.serif, fontSize: 64,
        color: C.forest, charSpacing: -2,
      });
      s.addText(stat.label.toUpperCase(), {
        x, y: 4.95, w: colW, h: 0.4,
        fontFace: F.sans, fontSize: 10, bold: true,
        color: C.forest, transparency: 22, charSpacing: 3,
      });
    });

    /* Why now strip */
    s.addShape('line', {
      x: 0.75, y: 6.1, w: 11.5, h: 0,
      line: { color: C.forest, width: 0.5, transparency: 88 },
    });
    s.addText('WHY NOW', {
      x: 0.75, y: 6.25, w: 2, h: 0.3,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 45, charSpacing: 3,
    });
    s.addText(
      [
        { text: 'Voice AI', options: { bold: true, color: C.forest } },
        { text: ' crossed the realism line.   ·   ', options: { color: C.forest, transparency: 30 } },
        { text: 'Hotel labor', options: { bold: true, color: C.forest } },
        { text: ' is structurally short.', options: { color: C.forest, transparency: 30 } },
      ],
      { x: 0.75, y: 6.55, w: 11.5, h: 0.4, fontFace: F.sans, fontSize: 12 },
    );
  }

  /* ─── Slide 03 — Solution (combined with Arvy) ───────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WARM' });
    addSlideNumber(s, 3);
    addEyebrow(s, 'Solution');

    s.addText(
      [
        { text: 'An ' },
        { text: 'AI front desk', options: { highlight: C.acid } },
        { text: ' that ' },
        { text: 'never sleeps.', options: { italic: true } },
      ],
      {
        x: 0.75, y: 1.25, w: 11, h: 2.0,
        fontFace: F.serif, fontSize: 60, color: C.forest, charSpacing: -2,
      },
    );

    /* Left column: bullets */
    const bullets = [
      "Answers every call, 24/7 — in your hotel's tone",
      'Updates your PMS — bookings, profiles, tickets',
      'Escalates to staff with full context',
    ];
    bullets.forEach((b, i) => {
      const y = 4.0 + i * 0.6;
      s.addShape('rect', {
        x: 0.85, y: y + 0.13, w: 0.2, h: 0.2,
        fill: { color: C.forestMid },
        line: { color: C.forestMid },
      });
      s.addText('✓', {
        x: 0.85, y: y + 0.05, w: 0.22, h: 0.3,
        fontFace: F.sans, fontSize: 12, bold: true,
        color: C.ivoryLight, align: 'center',
      });
      s.addText(b, {
        x: 1.25, y, w: 5.6, h: 0.5,
        fontFace: F.sans, fontSize: 16, color: C.forest, transparency: 12,
      });
    });

    /* Right column: live call card */
    const cardX = 7.0;
    const cardY = 3.4;
    const cardW = 5.5;
    const cardH = 3.4;
    s.addShape('rect', {
      x: cardX, y: cardY, w: cardW, h: cardH,
      fill: { color: C.white },
      line: { color: C.forest15, width: 0.5 },
      rectRadius: 0.15,
    });
    s.addText('● LIVE CALL', {
      x: cardX + 0.3, y: cardY + 0.2, w: 2, h: 0.3,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forestMid, charSpacing: 3,
    });
    s.addText('11:42 PM', {
      x: cardX + cardW - 1.3, y: cardY + 0.2, w: 1, h: 0.3,
      fontFace: F.sans, fontSize: 10, color: C.ivoryMuted, align: 'right',
    });
    s.addShape('line', {
      x: cardX + 0.1, y: cardY + 0.6, w: cardW - 0.2, h: 0,
      line: { color: C.ivoryBorder, width: 0.5 },
    });
    s.addText('GUEST', {
      x: cardX + 0.3, y: cardY + 0.8, w: 2, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 40, charSpacing: 3,
    });
    s.addText('Any chance you have a king tonight?', {
      x: cardX + 0.3, y: cardY + 1.1, w: cardW - 0.6, h: 0.45,
      fontFace: F.sans, fontSize: 14, color: C.forest,
    });
    s.addText('ARVY', {
      x: cardX + 0.3, y: cardY + 1.75, w: 2, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 40, charSpacing: 3,
    });
    s.addText('One king at $189, breakfast included. Whose name?', {
      x: cardX + 0.3, y: cardY + 2.05, w: cardW - 0.6, h: 0.55,
      fontFace: F.sans, fontSize: 14, color: C.forest,
    });
  }

  /* ─── Slide 04 — Market analysis · financial model ───────────────── */
  {
    const s = pres.addSlide({ masterName: 'WHITE' });
    addSlideNumber(s, 4);
    addEyebrow(s, 'Market analysis · financial model');

    s.addText(
      [
        { text: 'How we make money — ' },
        { text: 'the math.', options: { italic: true } },
      ],
      {
        x: 0.75, y: 1.2, w: 11, h: 0.8,
        fontFace: F.serif, fontSize: 40, color: C.forest, charSpacing: -1,
      },
    );

    /* Hero number */
    s.addText('$860M', {
      x: 0.75, y: 2.1, w: 11.8, h: 2.0,
      fontFace: F.serif, fontSize: 160, bold: false,
      color: C.forest, align: 'center', charSpacing: -4,
    });
    s.addText('ANNUAL REVENUE · US TAM', {
      x: 0.75, y: 4.05, w: 11.8, h: 0.3,
      fontFace: F.sans, fontSize: 10, bold: true,
      color: C.forest, transparency: 45, charSpacing: 4, align: 'center',
    });

    /* Equation: $21,588/yr × 40,000 hotels */
    const eqY = 4.7;
    /* Per-hotel */
    s.addText('$21,588', {
      x: 1.5, y: eqY, w: 3.5, h: 0.65,
      fontFace: F.serif, fontSize: 36, color: C.forest, align: 'center',
    });
    s.addText('PER HOTEL · PER YEAR', {
      x: 1.5, y: eqY + 0.68, w: 3.5, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 45, charSpacing: 3, align: 'center',
    });
    s.addText('($1,799/mo × 12)', {
      x: 1.5, y: eqY + 0.95, w: 3.5, h: 0.3,
      fontFace: F.sans, fontSize: 10, italic: true,
      color: C.forest, transparency: 55, align: 'center',
    });

    /* × */
    s.addText('×', {
      x: 5.4, y: eqY, w: 2.5, h: 0.65,
      fontFace: F.serif, fontSize: 36, color: C.forest, transparency: 65, align: 'center',
    });
    s.addText('HOTELS', {
      x: 5.4, y: eqY + 0.68, w: 2.5, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 55, charSpacing: 3, align: 'center',
    });

    /* 40,000 */
    s.addText('40,000', {
      x: 8.3, y: eqY, w: 3.5, h: 0.65,
      fontFace: F.serif, fontSize: 36, color: C.forest, align: 'center',
    });
    s.addText('US SMALL & MID HOTELS', {
      x: 8.3, y: eqY + 0.68, w: 3.5, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 45, charSpacing: 3, align: 'center',
    });
    s.addText('(AHLA · STR 2025)', {
      x: 8.3, y: eqY + 0.95, w: 3.5, h: 0.3,
      fontFace: F.sans, fontSize: 10, italic: true,
      color: C.forest, transparency: 55, align: 'center',
    });

    /* Trajectory cards: Year 1 + Year 3 */
    const tY = 6.2;
    /* Year 1 (light) */
    s.addShape('rect', {
      x: 1.5, y: tY, w: 4.8, h: 1.0,
      fill: { color: C.ivoryWarm },
      line: { color: C.forest15, width: 0.5 },
      rectRadius: 0.12,
    });
    s.addText('YEAR 1 TARGET', {
      x: 1.7, y: tY + 0.1, w: 2.5, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 45, charSpacing: 3,
    });
    s.addText('$2.16M', {
      x: 1.7, y: tY + 0.35, w: 2.5, h: 0.55,
      fontFace: F.serif, fontSize: 30, color: C.forest,
    });
    s.addText('100 × $21,588', {
      x: 4.0, y: tY + 0.55, w: 2.2, h: 0.3,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 40, charSpacing: 3, align: 'right',
    });

    /* Year 3 (dark) */
    s.addShape('rect', {
      x: 6.6, y: tY, w: 4.8, h: 1.0,
      fill: { color: C.forest },
      line: { color: C.forest },
      rectRadius: 0.12,
    });
    s.addText('YEAR 3 TARGET', {
      x: 6.8, y: tY + 0.1, w: 2.5, h: 0.25,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.acid, charSpacing: 3,
    });
    s.addText('$22M', {
      x: 6.8, y: tY + 0.35, w: 2.5, h: 0.55,
      fontFace: F.serif, fontSize: 30, color: C.ivoryLight,
    });
    s.addText('1,000 × $21,588', {
      x: 9.0, y: tY + 0.55, w: 2.3, h: 0.3,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.ivoryLight, transparency: 30, charSpacing: 3, align: 'right',
    });
  }

  /* ─── Slide 06 — Business model ──────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'LIGHT' });
    addSlideNumber(s, 5);
    addEyebrow(s, 'Business model');

    s.addText(
      [
        { text: 'One plan per property. ' },
        { text: '~3-month payback.', options: { italic: true, highlight: C.acid } },
      ],
      {
        x: 0.75, y: 1.25, w: 11.5, h: 1.4,
        fontFace: F.serif, fontSize: 40, color: C.forest, charSpacing: -1,
      },
    );

    /* Pricing rows card */
    const rowsX = 0.75;
    const rowsY = 3.2;
    const rowsW = 6.0;
    const rowH = 0.65;
    const rows = [
      ['Monthly', '$1,799 / property'],
      ['Annual', '$17,990 (2 months free)'],
      ['Onboarding', '$2,500 one-time'],
      ['Overage', '$1.25 / call > 2,000 / mo'],
    ];
    s.addShape('rect', {
      x: rowsX, y: rowsY, w: rowsW, h: rowH * rows.length,
      fill: { color: C.white },
      line: { color: C.forest15, width: 0.5 },
      rectRadius: 0.12,
    });
    rows.forEach(([label, value], i) => {
      const y = rowsY + i * rowH;
      s.addText(label.toUpperCase(), {
        x: rowsX + 0.3, y: y + 0.15, w: 2, h: 0.4,
        fontFace: F.sans, fontSize: 10, bold: true,
        color: C.forest, transparency: 35, charSpacing: 3,
      });
      s.addText(value, {
        x: rowsX + 2.5, y: y + 0.1, w: 3.3, h: 0.5,
        fontFace: F.serif, fontSize: 17, color: C.forest, align: 'right',
      });
      if (i < rows.length - 1) {
        s.addShape('line', {
          x: rowsX + 0.2, y: y + rowH, w: rowsW - 0.4, h: 0,
          line: { color: C.ivoryBorder, width: 0.5 },
        });
      }
    });

    /* Unit econ cards */
    const econX0 = 7.2;
    const econY = rowsY;
    const econW = 1.7;
    const econH = 1.3;
    const econGap = 0.15;
    const econ = [
      { v: '$30K', l: 'LTV (5-yr)', emphasis: false },
      { v: '$1.5K', l: 'CAC', emphasis: false },
      { v: '~3 mo', l: 'Payback', emphasis: true },
    ];
    econ.forEach((e, i) => {
      const x = econX0 + i * (econW + econGap);
      s.addShape('rect', {
        x, y: econY, w: econW, h: econH,
        fill: { color: e.emphasis ? C.forest : C.ivoryLight },
        line: { color: e.emphasis ? C.forest : C.forest15, width: 0.5 },
        rectRadius: 0.1,
      });
      s.addText(e.v, {
        x: x + 0.1, y: econY + 0.2, w: econW - 0.2, h: 0.55,
        fontFace: F.serif, fontSize: 24,
        color: e.emphasis ? C.ivoryLight : C.forest, align: 'center',
      });
      s.addText(e.l.toUpperCase(), {
        x: x + 0.1, y: econY + 0.85, w: econW - 0.2, h: 0.35,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: e.emphasis ? C.ivoryLight : C.forest,
        transparency: 35, charSpacing: 3, align: 'center',
      });
    });
  }

  /* ─── Slide 07 — Go-to-market ────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'WARM' });
    addSlideNumber(s, 6);
    addEyebrow(s, 'Go to market');

    s.addText(
      [
        { text: 'Start with ' },
        { text: 'independents', options: { highlight: C.acid } },
        { text: '. ' },
        { text: 'Expand into chains.', options: { italic: true } },
      ],
      {
        x: 0.75, y: 1.25, w: 11.5, h: 1.4,
        fontFace: F.serif, fontSize: 40, color: C.forest, charSpacing: -1,
      },
    );

    /* Cincinnati pilot callout */
    s.addShape('rect', {
      x: 0.75, y: 3.1, w: 4.5, h: 0.95,
      fill: { color: C.forest },
      line: { color: C.forest },
      rectRadius: 0.12,
    });
    s.addText('5', {
      x: 0.95, y: 3.18, w: 0.8, h: 0.85,
      fontFace: F.serif, fontSize: 36, color: C.acid,
    });
    s.addText('CINCINNATI PILOTS\nSIGNED · MAY 2026', {
      x: 1.95, y: 3.3, w: 3.2, h: 0.6,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.ivoryLight, transparency: 20, charSpacing: 3,
    });

    /* Wave cards */
    const waves = [
      { n: '1', title: 'Independent hotels', when: '2026', target: '5 → 25 paid' },
      { n: '2', title: 'Franchised properties', when: '2026 – 2027', target: '25 → 250' },
      { n: '3', title: 'Direct chain partnerships', when: '2028+', target: '1,000+' },
    ];
    const waveY = 4.6;
    const waveW = 3.85;
    const waveGap = 0.3;
    const waveH = 2.2;
    waves.forEach((w, i) => {
      const x = 0.75 + i * (waveW + waveGap);
      s.addShape('rect', {
        x, y: waveY, w: waveW, h: waveH,
        fill: { color: C.white },
        line: { color: C.forest15, width: 0.5 },
        rectRadius: 0.12,
      });
      s.addText(`WAVE ${w.n}`, {
        x: x + 0.3, y: waveY + 0.25, w: 1.5, h: 0.3,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: C.forestMid, charSpacing: 3,
      });
      s.addText(w.when.toUpperCase(), {
        x: x + waveW - 1.85, y: waveY + 0.25, w: 1.5, h: 0.3,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: C.forest, transparency: 40, charSpacing: 3, align: 'right',
      });
      s.addText(w.title, {
        x: x + 0.3, y: waveY + 0.75, w: waveW - 0.6, h: 1.0,
        fontFace: F.serif, fontSize: 20, color: C.forest,
      });
      s.addShape('line', {
        x: x + 0.2, y: waveY + waveH - 0.55, w: waveW - 0.4, h: 0,
        line: { color: C.ivoryBorder, width: 0.5 },
      });
      s.addText(
        [
          { text: 'TARGET: ', options: { color: C.forest, transparency: 40, bold: true } },
          { text: w.target, options: { color: C.forest, bold: true } },
        ],
        {
          x: x + 0.3, y: waveY + waveH - 0.4, w: waveW - 0.6, h: 0.3,
          fontFace: F.sans, fontSize: 10, charSpacing: 3,
        },
      );
    });
  }

  /* ─── Slide 08 — Competitors (single contrarian thesis) ──────────── */
  {
    const s = pres.addSlide({ masterName: 'WARM' });
    addSlideNumber(s, 7);
    addEyebrow(s, 'What others miss');

    s.addText(
      [
        { text: "Everyone's racing to " },
        { text: 'replace text', options: { italic: true } },
        { text: '. We built voice AI for the ' },
        { text: '40,000 US hotels', options: { highlight: C.acid } },
        { text: ' where the phone is still the front desk.' },
      ],
      {
        x: 0.75, y: 2.0, w: 11.5, h: 4.5,
        fontFace: F.serif, fontSize: 48, color: C.forest, charSpacing: -1.5,
      },
    );
  }

  /* ─── Slide 09 — Team ────────────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'LIGHT' });
    addSlideNumber(s, 8);
    addEyebrow(s, 'Team');

    s.addText(
      [
        { text: 'Built by people who ' },
        { text: 'lived the problem.', options: { italic: true } },
      ],
      {
        x: 0.75, y: 1.25, w: 11.5, h: 1.4,
        fontFace: F.serif, fontSize: 38, color: C.forest, charSpacing: -1,
      },
    );

    /* Two founder cards */
    const founderY = 3.3;
    const founderW = 5.7;
    const founderH = 2.4;
    const founders = [
      {
        initial: 'R',
        name: 'Rakhmatjon',
        role: 'Founder · CEO',
        bio: "3+ years US hotel ops · 20+ Cincinnati hotel network · UC grad · Eng/Uz/Ru",
      },
      {
        initial: 'N',
        name: 'Nurislombek',
        role: 'CTO',
        bio: 'Serial founder · OYGUL (1M+ users) · OY: Tickets ($60K in 2 mo) · 2024 President Tech Award',
      },
    ];
    founders.forEach((f, i) => {
      const x = 0.75 + i * (founderW + 0.3);
      s.addShape('rect', {
        x, y: founderY, w: founderW, h: founderH,
        fill: { color: C.white },
        line: { color: C.forest15, width: 0.5 },
        rectRadius: 0.15,
      });
      /* Initial circle */
      s.addShape('ellipse', {
        x: x + 0.35, y: founderY + 0.35, w: 0.7, h: 0.7,
        fill: { color: C.forest },
        line: { color: C.forest },
      });
      s.addText(f.initial, {
        x: x + 0.35, y: founderY + 0.35, w: 0.7, h: 0.7,
        fontFace: F.serif, fontSize: 22,
        color: C.ivoryLight, align: 'center', valign: 'middle',
      });
      s.addText(f.name, {
        x: x + 1.25, y: founderY + 0.35, w: founderW - 1.4, h: 0.4,
        fontFace: F.serif, fontSize: 22, color: C.forest,
      });
      s.addText(f.role.toUpperCase(), {
        x: x + 1.25, y: founderY + 0.75, w: founderW - 1.4, h: 0.3,
        fontFace: F.sans, fontSize: 10, bold: true,
        color: C.forest, transparency: 45, charSpacing: 3,
      });
      s.addText(f.bio, {
        x: x + 0.4, y: founderY + 1.25, w: founderW - 0.8, h: 1.0,
        fontFace: F.sans, fontSize: 12,
        color: C.ivoryBody,
      });
    });

    /* Prior wins ribbon */
    const winsY = 6.05;
    s.addShape('line', {
      x: 0.75, y: winsY - 0.1, w: 11.6, h: 0,
      line: { color: C.forest, width: 0.5, transparency: 88 },
    });
    s.addText('PRIOR WINS · NURISLOMBEK', {
      x: 0.75, y: winsY, w: 5, h: 0.3,
      fontFace: F.sans, fontSize: 9, bold: true,
      color: C.forest, transparency: 45, charSpacing: 3,
    });
    const wins = [
      { l: '2024 PRESIDENT TECH AWARD', d: '$100K grant' },
      { l: 'OYGUL', d: '1M+ users in 8 months' },
      { l: 'OY: TICKETS', d: '$60K in 2 months' },
      { l: 'PRESS', d: 'The Tech · Pivot · DB' },
    ];
    const winW = 2.75;
    const winGap = 0.18;
    const winY = winsY + 0.4;
    wins.forEach((w, i) => {
      const x = 0.75 + i * (winW + winGap);
      s.addShape('rect', {
        x, y: winY, w: winW, h: 0.85,
        fill: { color: C.white },
        line: { color: C.forest15, width: 0.5 },
        rectRadius: 0.08,
      });
      s.addText(w.l, {
        x: x + 0.15, y: winY + 0.1, w: winW - 0.3, h: 0.3,
        fontFace: F.sans, fontSize: 9, bold: true,
        color: C.forest, transparency: 30, charSpacing: 3,
      });
      s.addText(w.d, {
        x: x + 0.15, y: winY + 0.45, w: winW - 0.3, h: 0.35,
        fontFace: F.sans, fontSize: 10,
        color: C.forest, transparency: 30,
      });
    });
  }

  /* ─── Slide 10 — Thank you ───────────────────────────────────────── */
  {
    const s = pres.addSlide({ masterName: 'DARK' });
    addSlideNumber(s, 9, true);

    s.addImage({
      data: arryveLight,
      x: 0.75, y: 1.2, w: 3.5, h: 0.9,
      sizing: { type: 'contain', w: 3.5, h: 0.9 },
    });

    s.addText(
      [
        { text: 'Thank ' },
        { text: 'you.', options: { italic: true } },
      ],
      {
        x: 0.75, y: 2.3, w: 12, h: 3.0,
        fontFace: F.serif, fontSize: 140, color: C.ivoryLight, charSpacing: -4,
      },
    );

    s.addText(
      [
        { text: 'A better arrival starts with the ' },
        { text: 'first call', options: { highlight: C.acid, color: C.forest } },
        { text: '.' },
      ],
      {
        x: 0.75, y: 5.5, w: 11, h: 0.6,
        fontFace: F.serif, fontSize: 22, italic: true,
        color: C.ivoryLight, transparency: 25,
      },
    );

    s.addText(
      [
        { text: 'contact@tryarryve.com', options: { bold: true, color: C.ivoryLight } },
        { text: '     ·     ', options: { color: C.ivoryLight, transparency: 65 } },
        { text: 'tryarryve.com', options: { color: C.ivoryLight, transparency: 25 } },
      ],
      { x: 0.75, y: 6.6, w: 12, h: 0.4, fontFace: F.sans, fontSize: 13 },
    );
  }

  /* ─── Write file ─────────────────────────────────────────────────── */
  const outPath = path.resolve(process.cwd(), 'arryve-pitch.pptx');
  await pres.writeFile({ fileName: outPath });
  console.log(`✓ Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
