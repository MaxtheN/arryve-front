/**
 * Meta Conversions API (server-side) sender.
 *
 * Called from api/demo-request.ts with the SAME event_id the browser
 * Pixel uses for `Lead`, so Meta deduplicates the browser/server pair.
 *
 * No-op (resolves immediately) unless META_PIXEL_ID + META_CAPI_TOKEN are
 * set — safe to ship before credentials exist. PII (email/phone) is
 * SHA-256 hashed per Meta's spec; fbp/fbc/IP/UA are sent unhashed.
 */

import crypto from 'node:crypto';

const PIXEL_ID = process.env.META_PIXEL_ID;
const TOKEN = process.env.META_CAPI_TOKEN;
const GRAPH_VERSION = process.env.META_CAPI_GRAPH_VERSION || 'v21.0';
const TEST_CODE = process.env.META_TEST_EVENT_CODE;

function sha256(v: string): string {
  return crypto.createHash('sha256').update(v).digest('hex');
}

function normEmail(e?: string): string | undefined {
  const s = e?.trim().toLowerCase();
  return s || undefined;
}

function normPhone(p?: string): string | undefined {
  if (!p) return undefined;
  const digits = p.replace(/[^0-9]/g, '');
  return digits || undefined;
}

export interface MetaCapiInput {
  eventId: string;
  eventName: 'Lead';
  eventSourceUrl?: string;
  email?: string;
  phone?: string;
  ip?: string;
  ua?: string;
  fbp?: string;
  fbc?: string;
  customData?: Record<string, unknown>;
}

export async function fireMetaCapi(input: MetaCapiInput): Promise<void> {
  if (!PIXEL_ID || !TOKEN) return; // no-op until credentials exist

  const em = normEmail(input.email);
  const ph = normPhone(input.phone);
  const userData: Record<string, unknown> = {};
  if (em) userData.em = [sha256(em)];
  if (ph) userData.ph = [sha256(ph)];
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;
  if (input.ip) userData.client_ip_address = input.ip;
  if (input.ua) userData.client_user_agent = input.ua;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: 'website',
        event_source_url: input.eventSourceUrl,
        user_data: userData,
        custom_data: input.customData ?? {},
      },
    ],
  };
  if (TEST_CODE) body.test_event_code = TEST_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(
    TOKEN,
  )}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.warn('[meta-capi] upstream', r.status, txt.slice(0, 200));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[meta-capi] fetch failed', (err as Error).message);
  } finally {
    clearTimeout(t);
  }
}
