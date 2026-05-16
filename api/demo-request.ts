/**
 * Demo-request lead intake.
 *
 * The /demo-request form POSTs here. Order of operations:
 *   1. validate (honeypot, required fields)
 *   2. HMAC-sign + AWAIT the forward to dashboard-api /dashboard/leads
 *      (Postgres is the source of truth — if this fails we 502 so the
 *       browser can show a retry/email fallback and we never fire a
 *       conversion for a lead we didn't store)
 *   3. fire Meta CAPI (+ Google Ads stub) with the SAME event_id the
 *      browser will use, so the browser/server Lead pair deduplicates
 *   4. return { ok, event_id, bookDemoUrl } — the browser then fires the
 *      Pixel/gtag conversion and redirects to /thank-you
 *
 * Never logs raw PII (only event_id + outcome).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { signRequest } from './_dashboard-sign.js';
import { fireMetaCapi } from './_meta-capi.js';
import { fireGoogleAdsConversion } from './_google-ads.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  fbclid?: string;
  gclid?: string;
  referrer_host?: string;
  fbp?: string;
  fbc?: string;
}

interface FormBody {
  event_id?: string;
  hotelName?: string;
  contactName?: string;
  workEmail?: string;
  phone?: string;
  preferredTime?: string;
  rooms?: string | number;
  pms?: string;
  honeypot?: string;
  attribution?: Attribution;
}

function clientIp(req: VercelRequest): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  return raw ? raw.split(',')[0].trim() : req.socket?.remoteAddress ?? undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  let body: FormBody;
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as FormBody)
        : ((req.body ?? {}) as FormBody);
  } catch {
    return res.status(400).json({ error: 'invalid JSON' });
  }

  // Honeypot: a filled hidden field means a bot. Pretend success so the
  // bot doesn't retry, but record/forward nothing.
  if (body.honeypot && String(body.honeypot).trim() !== '') {
    return res.status(200).json({ ok: true, event_id: null });
  }

  const hotelName = String(body.hotelName ?? '').trim();
  const contactName = String(body.contactName ?? '').trim();
  const workEmail = String(body.workEmail ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const preferredTime = String(body.preferredTime ?? '').trim();
  const pms = String(body.pms ?? '').trim();
  const roomsNum = Number(body.rooms);
  const rooms = Number.isFinite(roomsNum) ? Math.trunc(roomsNum) : null;

  if (!hotelName || !contactName) {
    return res.status(400).json({ error: 'hotel and contact name required' });
  }
  if (!EMAIL_RE.test(workEmail)) {
    return res.status(400).json({ error: 'a valid work email is required' });
  }
  if (!phone) {
    return res.status(400).json({ error: 'phone is required' });
  }

  const eventId =
    body.event_id && UUID_RE.test(body.event_id)
      ? body.event_id
      : crypto.randomUUID();

  const attr: Attribution = body.attribution ?? {};
  const ip = clientIp(req);
  const ua =
    (Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent']) ?? undefined;
  const eventSourceUrl =
    (Array.isArray(req.headers.referer)
      ? req.headers.referer[0]
      : req.headers.referer) ?? undefined;

  // Snake-cased shape the dashboard-api /dashboard/leads route expects.
  const leadRow = {
    event_id: eventId,
    hotel_name: hotelName,
    contact_name: contactName,
    email: workEmail,
    phone,
    preferred_time: preferredTime || null,
    rooms,
    pms: pms || null,
    source: 'demo_request_form',
    utm_source: attr.utm_source ?? null,
    utm_medium: attr.utm_medium ?? null,
    utm_campaign: attr.utm_campaign ?? null,
    utm_term: attr.utm_term ?? null,
    utm_content: attr.utm_content ?? null,
    fbclid: attr.fbclid ?? null,
    gclid: attr.gclid ?? null,
    fbp: attr.fbp ?? null,
    fbc: attr.fbc ?? null,
    ip: ip ?? null,
    ua: ua ?? null,
    referrer_host: attr.referrer_host ?? null,
  };
  const payloadForDashboard = {
    ...leadRow,
    payload: { ...leadRow, received_at: new Date().toISOString() },
  };

  // 1) Persist the lead (source of truth). Must await — Vercel kills the
  //    lambda on return, so a fire-and-forget never reaches the A100.
  const json = JSON.stringify(payloadForDashboard);
  let stored = false;
  try {
    const { ts, sig, url } = signRequest('/leads', json);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-arryve-ts': ts,
          'x-arryve-signature': sig,
        },
        body: json,
        signal: ctrl.signal,
      });
      stored = r.ok;
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        // eslint-disable-next-line no-console
        console.warn('[demo-request] dashboard', r.status, txt.slice(0, 200));
      }
    } finally {
      clearTimeout(t);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[demo-request] dashboard fetch failed', (err as Error).message);
  }

  if (!stored) {
    // Don't fire conversions for a lead we couldn't store. The client
    // shows a "try again / email us" fallback.
    return res
      .status(502)
      .json({ error: 'could not save your request', event_id: eventId });
  }

  // 2) Server-side conversions (best-effort; never block the response on
  //    a tracking failure — the lead is already safely stored).
  const customData: Record<string, unknown> = {
    lead_event_source: 'demo_request_form',
    hotel_name: hotelName,
    ...(pms ? { pms } : {}),
    ...(attr.utm_source ? { utm_source: attr.utm_source } : {}),
    ...(attr.utm_campaign ? { utm_campaign: attr.utm_campaign } : {}),
    ...(attr.fbclid ? { fbclid: attr.fbclid } : {}),
    ...(attr.gclid ? { gclid: attr.gclid } : {}),
  };
  try {
    await Promise.allSettled([
      fireMetaCapi({
        eventId,
        eventName: 'Lead',
        eventSourceUrl,
        email: workEmail,
        phone,
        ip,
        ua,
        fbp: attr.fbp,
        fbc: attr.fbc,
        customData,
      }),
      fireGoogleAdsConversion({
        kind: 'lead',
        gclid: attr.gclid,
        email: workEmail,
        phone,
      }),
    ]);
  } catch {
    /* never blocks — lead is already stored */
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ kind: 'demo_request', event_id: eventId, ok: true }));

  return res.status(200).json({
    ok: true,
    event_id: eventId,
    bookDemoUrl: process.env.VITE_BOOK_DEMO_URL || null,
  });
}
