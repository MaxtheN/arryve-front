/**
 * Vite dev-server middleware mirroring the production Vercel functions in
 * `api/*`. Keeping the two in sync means `npm run dev` behaves identically
 * to the deployed site (modulo cold-start differences).
 *
 * Mounts two endpoints:
 *
 *  - POST /api/gemini-ephemeral-token
 *  - POST /api/tool-invoke
 *
 * Both read GEMINI_API_KEY (and optionally AUTOMATION_URL +
 * AUTOMATION_TOOL_SECRET) from the Vite dev process's env — never
 * inlined into the client bundle. For production these are set in
 * Vercel project env vars.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import type { Plugin } from 'vite';
import { GoogleGenAI, Modality, Type } from '@google/genai';

import SYSTEM_INSTRUCTION from '../api/_arvy-prompt';

const MODEL = 'gemini-3.1-flash-live-preview';
const TOKEN_USES = 1;
const TOKEN_TTL_MINUTES = 30;

const TOOL_TO_FLOW: Record<string, string> = {
  search_availability: 'search-availability',
  lost_found_search: 'lost-found-search',
};
const ALLOWED_FLOWS = new Set(Object.values(TOOL_TO_FLOW));

function safeTools() {
  return [
    {
      functionDeclarations: [
        {
          name: 'search_availability',
          description:
            'Check bookable rates at Holiday Inn Express Red Bank for a date range. Returns room types and per-night rates — no guest info.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              checkIn: { type: Type.STRING, description: 'YYYY-MM-DD' },
              checkOut: { type: Type.STRING, description: 'YYYY-MM-DD' },
              adults: { type: Type.INTEGER, description: 'Default 1.' },
              rooms: { type: Type.INTEGER, description: 'Default 1.' },
            },
            required: ['checkIn', 'checkOut'],
          },
        },
        {
          name: 'lost_found_search',
          description:
            'Search the Lost & Found dashboard by date range or keyword. Returns item descriptions — no guest PII.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              keyword: { type: Type.STRING },
              fromDate: { type: Type.STRING },
              toDate: { type: Type.STRING },
            },
          },
        },
      ],
    },
  ];
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export function ephemeralTokenPlugin(): Plugin {
  return {
    name: 'arryve-ephemeral-token',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/gemini-ephemeral-token', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
          return json(res, 500, {
            error: 'GEMINI_API_KEY missing. Add it to .env.local.',
          });
        }
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { apiVersion: 'v1alpha' },
          });
          const expireTime = new Date(
            Date.now() + TOKEN_TTL_MINUTES * 60_000
          ).toISOString();
          const tools = process.env.AUTOMATION_URL ? safeTools() : undefined;
          const token = await ai.authTokens.create({
            config: {
              uses: TOKEN_USES,
              expireTime,
              liveConnectConstraints: {
                model: MODEL,
                config: {
                  responseModalities: [Modality.AUDIO],
                  systemInstruction: SYSTEM_INSTRUCTION,
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
                  },
                  inputAudioTranscription: {},
                  outputAudioTranscription: {},
                  ...(tools ? { tools } : {}),
                },
              },
            },
          });
          if (!token.name) throw new Error('token.name missing');
          json(res, 200, {
            token: token.name,
            model: MODEL,
            expiresAt: expireTime,
            toolsEnabled: Boolean(tools),
          });
        } catch (err) {
          json(res, 500, { error: err instanceof Error ? err.message : String(err) });
        }
      });

      server.middlewares.use('/api/tool-invoke', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        const automationUrl = process.env.AUTOMATION_URL;
        const secret = process.env.AUTOMATION_TOOL_SECRET;
        if (!automationUrl || !secret) {
          return json(res, 503, {
            error:
              'AUTOMATION_URL + AUTOMATION_TOOL_SECRET not configured; demo runs in ungrounded mode.',
          });
        }
        try {
          const body = await readJsonBody(req);
          const name = typeof body.name === 'string' ? body.name : '';
          const args = (body.args as Record<string, unknown> | undefined) ?? {};
          const flow = TOOL_TO_FLOW[name];
          if (!flow || !ALLOWED_FLOWS.has(flow)) {
            return json(res, 403, { error: `tool ${name} not allowed` });
          }
          const payload = JSON.stringify({ ...args, dryRun: false });
          const ts = String(Date.now());
          const signature = crypto
            .createHmac('sha256', secret)
            .update(`${ts}.${flow}.${payload}`)
            .digest('hex');
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const upstream = await fetch(
            `${automationUrl.replace(/\/+$/, '')}/flows/${flow}`,
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-arryve-demo-ts': ts,
                'x-arryve-demo-signature': signature,
              },
              body: payload,
              signal: controller.signal,
            }
          ).catch((err) => {
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
            return json(res, 502, { error: `automation ${upstream.status}`, body: parsed });
          }
          json(res, 200, parsed);
        } catch (err) {
          json(res, 500, { error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}
