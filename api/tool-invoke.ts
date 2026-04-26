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
  'lookup-loyalty',
]);

const TOOL_TO_FLOW: Record<string, string> = {
  search_availability: 'search-availability',
  lost_found_search: 'lost-found-search',
  lookup_loyalty_member: 'lookup-loyalty',
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing in Vercel env`);
  return v;
}

function logEvent(fields: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ kind: 'tool_invoke', ts: Date.now(), ...fields }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const startedAt = Date.now();
  const { name, args, sessionId } = (req.body ?? {}) as {
    name?: string;
    args?: Record<string, unknown>;
    sessionId?: string;
  };
  const sid = sessionId ?? 'no-session';
  try {
    if (!name || typeof name !== 'string') {
      logEvent({ sessionId: sid, ok: false, error: 'name required' });
      res.status(400).json({ error: 'name required' });
      return;
    }
    const flow = TOOL_TO_FLOW[name];
    if (!flow || !ALLOWED_FLOWS.has(flow)) {
      logEvent({ sessionId: sid, ok: false, name, error: `tool not allowed` });
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
    // Pin the call to the recorded session's Playwright context (if one
    // was allocated by /sessions/begin) so the agent's actions land in the
    // session's video. Falls back to the warm pool when absent.
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-arryve-demo-ts': ts,
      'x-arryve-demo-signature': signature,
    };
    if (sessionId) headers['x-arryve-session-id'] = sessionId;
    const upstream = await fetch(`${automationUrl}/flows/${flow}`, {
      method: 'POST',
      headers,
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
      logEvent({
        sessionId: sid,
        ok: false,
        name,
        flow,
        ms: Date.now() - startedAt,
        upstreamStatus: upstream.status,
      });
      res.status(502).json({ error: `automation ${upstream.status}`, body: parsed });
      return;
    }
    const flowResult = parsed as { ok?: boolean; result?: unknown; error?: string };
    logEvent({
      sessionId: sid,
      ok: flowResult.ok ?? true,
      name,
      flow,
      args,
      ms: Date.now() - startedAt,
      flowError: flowResult.error,
    });
    res.status(200).json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEvent({
      sessionId: sid,
      ok: false,
      name,
      ms: Date.now() - startedAt,
      error: message,
    });
    res.status(500).json({ error: message });
  }
}
