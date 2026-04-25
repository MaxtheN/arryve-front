/**
 * Issue a short-lived signed token so the browser can POST the
 * recorded WAV directly to api.tryarryve.com, bypassing Vercel's
 * 4.5 MB function body limit (multi-minute stereo recordings can be
 * ~10 MB+).
 *
 * Token shape: ts + sig where
 *   sig = HMAC-SHA256(secret, `upload.${sessionId}.${ts}`)
 *
 * The dashboard-api's audio endpoint accepts this token via
 * `?ts=X&sig=Y` query params (in addition to the full-body HMAC
 * scheme used by other writes). 5-minute window — enough for slow
 * uploads, short enough that a leaked token is useless soon.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

const DASHBOARD_BASE = 'https://api.tryarryve.com/dashboard';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = (req.body ?? {}) as { sessionId?: string };
  const sessionId = body.sessionId ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return res.status(400).json({ error: 'bad sessionId' });
  }
  const secret = process.env.DASHBOARD_HMAC_SECRET;
  if (!secret) return res.status(500).json({ error: 'missing secret' });
  const ts = String(Date.now());
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`upload.${sessionId}.${ts}`)
    .digest('hex');
  return res.status(200).json({
    url: `${DASHBOARD_BASE}/sessions/${sessionId}/audio?ts=${ts}&sig=${sig}`,
    ts,
    sig,
  });
}
