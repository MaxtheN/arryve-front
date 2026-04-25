/**
 * Session finalize proxy: receives the stereo WAV from the browser,
 * forwards it (signed) to the dashboard-api on the A100, then issues
 * the finalize call so the session row gets its outcome + duration.
 *
 * Multipart form fields expected:
 *   audio        — File (WAV)
 *   session_id   — uuid
 *   duration_ms  — integer ms
 *   outcome      — model-ended | user-stopped | server-closed | error
 *   turns        — completed turns count
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signRequest, DASHBOARD_BASE } from './_dashboard-sign.js';

export const config = {
  api: { bodyParser: false }, // multipart — we forward the raw stream
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

function pickField(body: Buffer, contentType: string, fieldName: string): string | undefined {
  // Cheap form parse — we only need the small string fields.
  // Boundary lookup.
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
  if (!boundaryMatch) return undefined;
  const boundary = `--${boundaryMatch[1]}`;
  const text = body.toString('latin1');
  const parts = text.split(boundary);
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd < 0) continue;
    const headers = part.slice(0, headerEnd);
    if (!headers.toLowerCase().includes(`name="${fieldName.toLowerCase()}"`)) continue;
    if (headers.toLowerCase().includes('filename=')) continue; // skip file fields
    const value = part.slice(headerEnd + 4).replace(/\r\n--$/, '').replace(/\r\n$/, '');
    return value.trim();
  }
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const ct = (req.headers['content-type'] as string) ?? '';
  if (!ct.startsWith('multipart/form-data')) {
    return res.status(400).json({ error: 'expected multipart/form-data' });
  }
  try {
    const body = await readRawBody(req);
    const sessionId = pickField(body, ct, 'session_id') ?? '';
    const durationMs = Number(pickField(body, ct, 'duration_ms') ?? 0) || null;
    const outcome = pickField(body, ct, 'outcome') ?? null;
    const turns = Number(pickField(body, ct, 'turns') ?? 0) || null;
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return res.status(400).json({ error: 'bad session_id' });

    // 1. Forward the multipart body verbatim to the audio endpoint. We
    //    sign with the raw multipart bytes so the server's HMAC verify
    //    matches.
    const audioPath = `/sessions/${sessionId}/audio`;
    const audioSig = signRequest(audioPath, body);
    await fetch(audioSig.url, {
      method: 'POST',
      headers: {
        'content-type': ct,
        'x-arryve-ts': audioSig.ts,
        'x-arryve-signature': audioSig.sig,
      },
      body: body as unknown as BodyInit,
    });

    // 2. Send the finalize payload to close the session row.
    const finalizePath = `/sessions/${sessionId}/finalize`;
    const finalizePayload = JSON.stringify({ outcome, ttfb_ms: null, turns });
    const finalizeSig = signRequest(finalizePath, finalizePayload);
    await fetch(finalizeSig.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-arryve-ts': finalizeSig.ts,
        'x-arryve-signature': finalizeSig.sig,
      },
      body: finalizePayload,
    });
    void durationMs; // currently unused — duration comes from the audio upload itself.
    void DASHBOARD_BASE;
    return res.status(204).end();
  } catch (err) {
    console.error('[session-finalize] error', err);
    return res.status(500).json({ error: 'finalize failed' });
  }
}
