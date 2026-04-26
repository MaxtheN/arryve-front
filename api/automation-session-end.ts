/**
 * Vercel proxy: close the recorded Playwright session and trigger video upload.
 *
 * Browser POSTs `{ sessionId }` here when the demo conversation ends. We
 * HMAC-sign and forward to automation `/sessions/end`, which closes the
 * Playwright context (flushing the .webm), uploads the file to dashboard-api,
 * and removes the local copy.
 *
 * Always returns 200 quickly so the browser's `unload` handler isn't blocked
 * — actual upload may still be in flight on the automation server. The
 * dashboard-api will surface the video on the session detail page once the
 * upload completes.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing in Vercel env`);
  return v;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    const { sessionId } = (req.body ?? {}) as { sessionId?: string };
    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      res.status(400).json({ error: 'sessionId (uuid) required' });
      return;
    }
    const automationUrl = requireEnv('AUTOMATION_URL').replace(/\/+$/, '');
    const secret = requireEnv('AUTOMATION_TOOL_SECRET');
    const body = JSON.stringify({ sessionId });
    const ts = String(Date.now());
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${ts}.session-end.${body}`)
      .digest('hex');
    const ctrl = new AbortController();
    // Upload of a few-MB webm + dashboard write should comfortably finish
    // inside 30s on the same VPC. Cap at 25s so we still respond before
    // Vercel's 30s function ceiling.
    const t = setTimeout(() => ctrl.abort(), 25_000);
    let upstream: Response;
    try {
      upstream = await fetch(`${automationUrl}/sessions/end`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-arryve-demo-ts': ts,
          'x-arryve-demo-signature': signature,
        },
        body,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
    const text = await upstream.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    res.status(upstream.ok ? 200 : 502).json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Don't fail the browser's unload path — log and return 204.
    // eslint-disable-next-line no-console
    console.warn('[automation-session-end] error', message);
    res.status(204).end();
  }
}
