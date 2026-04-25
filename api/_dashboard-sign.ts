/**
 * HMAC signer used by the Vercel proxy endpoints to talk to the
 * dashboard-api on the A100 (https://api.tryarryve.com/dashboard/*).
 *
 * Same scheme as automation/src/demo-hmac-auth.ts:
 *   x-arryve-ts        — current Date.now() in ms
 *   x-arryve-signature — HMAC-SHA256 of `${ts}.${path}.${body}` with the
 *                        shared DASHBOARD_HMAC_SECRET.
 *
 * Replay window enforced server-side at 60 s.
 */

import crypto from 'node:crypto';

export const DASHBOARD_BASE = 'https://api.tryarryve.com/dashboard';

/**
 * Sign over `${ts}.${path}.${sha256_hex(body_bytes)}` so binary bodies
 * (multipart audio uploads) survive without text round-tripping.
 */
export function signRequest(pathSuffix: string, body: Buffer | string) {
  const secret = process.env.DASHBOARD_HMAC_SECRET;
  if (!secret) throw new Error('DASHBOARD_HMAC_SECRET missing in Vercel env');
  const ts = String(Date.now());
  const path = `/dashboard${pathSuffix.startsWith('/') ? pathSuffix : '/' + pathSuffix}`;
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  const bodyHash = crypto.createHash('sha256').update(buf).digest('hex');
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${path}.${bodyHash}`).digest('hex');
  return { ts, sig, url: `${DASHBOARD_BASE}${pathSuffix.startsWith('/') ? pathSuffix : '/' + pathSuffix}` };
}
