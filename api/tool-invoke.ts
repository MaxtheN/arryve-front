/**
 * Vercel serverless tool-dispatch proxy.
 *
 * Gemini Live's tool calls land here as POSTed JSON bodies with {name, args}.
 * We forward them to the on-prem automation service (exposed via e.g. a
 * Cloudflare Tunnel), sign the request with an HMAC header the automation
 * service can verify, and return the flow result to the browser. The
 * browser then wraps it in a LiveToolResponse and sends it back to Gemini.
 *
 * Read-only flows only. Destructive ops are not routed here even if Gemini
 * hallucinates them — the ephemeral token's tool schema doesn't include
 * them, and this proxy also enforces an allowlist on the server side.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

// Narrowed for public demo: only flows that return effectively public info.
// Destructive + PII-leaking flows are blocked here even if Gemini hallucinates
// their names.
const ALLOWED_FLOWS = new Set([
  'search-availability',
  'lost-found-search',
]);

const TOOL_TO_FLOW: Record<string, string> = {
  search_availability: 'search-availability',
  lost_found_search: 'lost-found-search',
};

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
    const { name, args } = (req.body ?? {}) as {
      name?: string;
      args?: Record<string, unknown>;
    };
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name required' });
      return;
    }
    const flow = TOOL_TO_FLOW[name];
    if (!flow || !ALLOWED_FLOWS.has(flow)) {
      res.status(403).json({ error: `tool ${name} not allowed from demo` });
      return;
    }

    const automationUrl = requireEnv('AUTOMATION_URL').replace(/\/+$/, '');
    const secret = requireEnv('AUTOMATION_TOOL_SECRET');

    const body = JSON.stringify({ ...(args ?? {}), dryRun: false });
    const ts = String(Date.now());
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${ts}.${flow}.${body}`)
      .digest('hex');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(`${automationUrl}/flows/${flow}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-arryve-demo-ts': ts,
        'x-arryve-demo-signature': signature,
      },
      body,
      signal: controller.signal,
    }).catch((err) => {
      throw new Error(`automation fetch failed: ${err}`);
    });
    clearTimeout(timeout);

    const text = await upstream.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
    if (!upstream.ok) {
      res.status(502).json({ error: `automation ${upstream.status}`, body: parsed });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
