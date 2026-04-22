/**
 * Lightweight browser fingerprint for one-shot demo rate-limiting.
 *
 * Not anti-fraud grade — a determined visitor can spoof any of these
 * signals — but enough to stop casual second-tries without logging into
 * a third-party service. We hash canvas rendering + WebGL vendor/renderer
 * + screen dims + timezone + language + userAgent into a 64-char SHA-256
 * hex digest, then persist a "demo consumed" flag in localStorage keyed by
 * that hash.
 *
 * The hash also rides along in the ephemeral-token mint request so the
 * server can dedup across browser profiles on the same device if we ever
 * add a KV store — the client contract is already wired.
 */

const STORAGE_KEY = 'arryve-demo-consumed';

export async function computeFingerprint(): Promise<string> {
  const parts: string[] = [
    navigator.userAgent || '',
    navigator.language || '',
    (navigator.languages || []).join(','),
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    String(window.devicePixelRatio || 1),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    canvasFingerprint(),
    webglFingerprint(),
    String(navigator.hardwareConcurrency || 0),
  ];
  const input = parts.join('|');
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function canvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no2d';
    // Mix of glyphs + gradients — rasterization differs across engines.
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 120, 40);
    ctx.fillStyle = '#069';
    ctx.fillText('Arvy · Arryve 🛎️', 2, 2);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Arvy · Arryve 🛎️', 4, 20);
    return canvas.toDataURL();
  } catch {
    return 'canvas-err';
  }
}

function webglFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return 'nowebgl';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '';
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    return `${vendor}|${renderer}`;
  } catch {
    return 'webgl-err';
  }
}

export function hasConsumedDemo(fingerprint: string): boolean {
  try {
    const consumed = localStorage.getItem(STORAGE_KEY);
    if (!consumed) return false;
    const parsed = JSON.parse(consumed) as { fp: string; at: number };
    // Treat as consumed for 30 days. After that they may try again.
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.at > thirtyDays) return false;
    return parsed.fp === fingerprint;
  } catch {
    return false;
  }
}

export function markDemoConsumed(fingerprint: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fp: fingerprint, at: Date.now() })
    );
  } catch {
    /* private mode or storage denied — let them try again */
  }
}
