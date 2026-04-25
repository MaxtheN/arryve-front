/**
 * Vercel serverless function — mints Gemini Live ephemeral tokens for the
 * landing-page voice demo.
 *
 * The root GEMINI_API_KEY lives only in Vercel env vars, never in the client
 * bundle. Each token is single-use, TTL 30 minutes, and scope-locked to the
 * Arvy system instruction + Charon voice + audio-only response modality —
 * so a leaked token can only produce an Arvy-shaped session.
 *
 * If AUTOMATION_URL + AUTOMATION_TOOL_SECRET are set, the token is also
 * scoped with a tool set pointing at our tool-invoke proxy — which lets
 * Gemini ground answers in the live HotelKey training tenant.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
  Type,
} from '@google/genai';

import { buildSystemPrompt } from './_arvy-prompt.js';

const MODEL = 'gemini-3.1-flash-live-preview';
const TOKEN_USES = 1;
const TOKEN_TTL_MINUTES = 30;

// Public-demo tool set: only flows whose outputs are effectively public
// information, plus a client-side `end_call` tool the model invokes when
// the conversation is naturally done. That tool lives in the browser
// (no server round-trip) — the client tears down the WebSocket after
// the model's final reply plays out.
function safeTools(toolsEnabled: boolean) {
  const kbLookup = {
    name: 'lookup_property_info',
    description:
      "Return a specific section of the Holiday Inn Express Red Bank knowledge base. Call this before answering any question about rates, policies, amenities, hours, Wi-Fi, pool, breakfast, parking, pets, dining, attractions, accessibility, or IHG One Rewards. Pass topic='index' if you're not sure which section to request.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description:
            "Topic slug. Valid: identity, rooms, in_room_amenities, brand_amenities, breakfast, wifi, pool, fitness, business_center, parking, ev_charging, check_in_out, late_checkout, cancellation, smoking, pets, id_requirements, deposit, taxes, accessibility, dining, attractions, logistics, ihg_rewards, quiet_hours, enrollment_url, index.",
        },
      },
      required: ['topic'],
    },
  };
  const grounding = toolsEnabled
    ? [
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
          name: 'lookup_loyalty_member',
          description:
            'Verify a guest-provided IHG One Rewards membership number against the property PMS. Call this EVERY time a guest claims to be an IHG member — never just take their word for it. Returns tier (Club/Silver/Gold/Platinum/Diamond), member name, and email on a match, or status="not-found" / "invalid-number" if the number is wrong.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              membershipNumber: {
                type: Type.STRING,
                description:
                  'IHG One Rewards account number as spoken by the guest, digits only — strip spaces, dashes, and any "number" prefix. 6–16 digits expected.',
              },
            },
            required: ['membershipNumber'],
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
              fromDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
              toDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
            },
          },
        },
      ]
    : [];
  return [
    {
      functionDeclarations: [
        kbLookup,
        ...grounding,
        {
          name: 'end_call',
          description:
            'Politely end the call once the guest is satisfied and has no further requests. Call this AFTER your farewell line so the goodbye audio plays out before the line drops. Only end the call when the guest confirms they are done.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              reason: {
                type: Type.STRING,
                description:
                  'Short free-text label for why the call is ending (e.g. "guest satisfied", "guest will call back", "transferred to desk").',
              },
            },
            required: [],
          },
        },
      ],
    },
  ];
}

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY missing in Vercel environment.');
  }
  return key;
}

function logEvent(fields: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ kind: 'token_mint', ts: Date.now(), ...fields }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const sessionId =
    (req.body as { sessionId?: string })?.sessionId ?? 'no-session';
  const startedAt = Date.now();
  try {
    const ai = new GoogleGenAI({
      apiKey: requireApiKey(),
      httpOptions: { apiVersion: 'v1alpha' },
    });
    const expireTime = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();
    const toolsEnabled = Boolean(process.env.AUTOMATION_URL);
    // Always include `end_call`; include the grounding flows only when an
    // automation backend is configured.
    const tools = safeTools(toolsEnabled);

    const token = await ai.authTokens.create({
      config: {
        uses: TOKEN_USES,
        expireTime,
        liveConnectConstraints: {
          model: MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: buildSystemPrompt(),
            // Language pinning is Vertex-only — Gemini Live ignores
            // speechConfig.languageCode and AudioTranscriptionConfig.languageCodes.
            // Language policy lives in the system prompt: Arvy mirrors the
            // guest's language (multilingual).
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools,
            // Noise-tolerant VAD: default sensitivity flags ambient sound
            // as user speech and interrupts Arvy mid-reply. LOW + longer
            // silence window means Gemini only interrupts on real speech.
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
                endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
                // Require ~700 ms of lead-in speech before committing to a
                // barge-in — tames false interruption from ambient noise,
                // keyboards, distant voices.
                prefixPaddingMs: 700,
                // Require 1200 ms of trailing silence before treating the
                // guest's turn as finished. Lets them pause to think
                // without Arvy cutting in.
                silenceDurationMs: 1200,
              },
            },
          },
        },
      },
    });
    if (!token.name) throw new Error('token.name missing from authTokens.create response');
    logEvent({
      sessionId,
      ok: true,
      ms: Date.now() - startedAt,
      toolsEnabled,
      model: MODEL,
    });
    res.status(200).json({
      token: token.name,
      model: MODEL,
      expiresAt: expireTime,
      toolsEnabled,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEvent({ sessionId, ok: false, ms: Date.now() - startedAt, error: message });
    res.status(500).json({ error: message });
  }
}
