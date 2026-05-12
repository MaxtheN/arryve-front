import puppeteer from 'puppeteer-core';
import path from 'path';

/* Generate a PDF of the rendered pitch deck.
   Uses system Chrome via puppeteer-core. Paper is sized to standard
   widescreen PPT (13.33in × 7.5in). The deck's existing print CSS
   handles page-break-after on each slide. */

const URL = process.env.DECK_URL ?? 'http://localhost:4173/pitch.html';
const OUT = path.resolve(process.cwd(), 'arryve-pitch.pdf');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  console.log(`Opening ${URL} …`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new' as any,
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60_000 });
  /* Make sure all webfonts have finished loading before printing. */
  await page.evaluateHandle('document.fonts.ready');

  /* Inject @page rule so CSS `100vh` matches the PDF page height. */
  await page.addStyleTag({
    content: `
      @page { size: 13.33in 7.5in; margin: 0; }
      @media print {
        html, body { width: 13.33in; }
        .deck-slide { width: 13.33in !important; height: 7.5in !important; min-height: 7.5in !important; }
      }
    `,
  });

  /* The React deck listens for `beforeprint` to switch into print mode
     (which renders all slides simultaneously). Puppeteer's page.pdf()
     doesn't fire that event reliably, so we dispatch it manually and
     give React a beat to re-render. */
  await page.emulateMediaType('print');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await new Promise((r) => setTimeout(r, 2000));

  await page.pdf({
    path: OUT,
    width: '13.33in',
    height: '7.5in',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  await browser.close();
  console.log(`✓ Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
