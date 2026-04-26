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
import { PMS_TOOL_DECLARATIONS } from './_pms-tools.js';

const MODEL = 'gemini-3.1-flash-live-preview';
const TOKEN_USES = 1;
const TOKEN_TTL_MINUTES = 30;

// Tool surface for the web demo. Mirrors the voice-agent (phone) tool set:
// every flow in automation/src/server.ts FLOWS, declared via the generated
// PMS_TOOL_DECLARATIONS in _pms-tools.ts. Plus two client-side tools that
// don't round-trip to automation: `lookup_property_info` (KB) and `end_call`
// (WebSocket teardown).
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
  const grounding = toolsEnabled ? PMS_TOOL_DECLARATIONS : [];
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
                prefixPaddingMs: 400,
                // Trailing silence before treating the guest's turn as
                // finished. Lower = snappier replies. 700 ms still tolerates
                // brief mid-utterance pauses without Arvy cutting in.
                silenceDurationMs: 700,
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
