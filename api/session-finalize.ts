/**
 * Closes a session row: posts the outcome + turn count to
 * dashboard-api. JSON only — the WAV upload now goes browser→A100
 * directly via /api/session-upload-token, bypassing Vercel's
 * 4.5 MB function body cap.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signRequest } from './_dashboard-sign.js';

interface Body {
  sessionId: string;
  outcome?: string | null;
  turns?: number | null;
  ttfb_ms?: number | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body as Body;
    if (!b || !b.sessionId || !/^[0-9a-f-]{36}$/i.test(b.sessionId)) {
      return res.status(400).json({ error: 'bad sessionId' });
    }
    const path = `/sessions/${b.sessionId}/finalize`;
    const json = JSON.stringify({
      outcome: b.outcome ?? null,
      ttfb_ms: b.ttfb_ms ?? null,
      turns: b.turns ?? null,
    });
    const { ts, sig, url } = signRequest(path, json);
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-arryve-ts': ts,
        'x-arryve-signature': sig,
      },
      body: json,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.warn('[session-finalize] upstream', r.status, txt.slice(0, 200));
      return res.status(502).json({ error: 'upstream' });
    }
    return res.status(204).end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[session-finalize] handler error', (err as Error).message);
    return res.status(500).json({ error: 'finalize failed' });
  }
}
