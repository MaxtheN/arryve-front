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
import { GoogleGenAI, Modality, Type } from '@google/genai';

import SYSTEM_INSTRUCTION from './_arvy-prompt';

const MODEL = 'gemini-3.1-flash-live-preview';
const TOKEN_USES = 1;
const TOKEN_TTL_MINUTES = 30;

// Read-only tools are the only ones exposed to the Live demo. Destructive
// flows (cancel, modify, booking) never land here — they belong on the real
// phone-line agent with a verification ladder + confirm gate.
function safeTools() {
  return [
    {
      functionDeclarations: [
        {
          name: 'search_availability',
          description:
            'Check bookable rates at Holiday Inn Express Red Bank for a date range.',
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
          name: 'search_by_phone',
          description: 'Look up reservations by a phone number (primary caller-id handshake).',
          parameters: {
            type: Type.OBJECT,
            properties: {
              phone: { type: Type.STRING },
            },
            required: ['phone'],
          },
        },
        {
          name: 'rate_details',
          description: "Read-only snapshot of a reservation's rate, dates, and guest counts.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              res: { type: Type.STRING, description: 'Reservation UUID or confirmation number.' },
            },
            required: ['res'],
          },
        },
        {
          name: 'read_folio',
          description: 'Return a structured snapshot of a reservation folio (totals, balance, last-4 of the on-file card).',
          parameters: {
            type: Type.OBJECT,
            properties: {
              res: { type: Type.STRING, description: 'Reservation UUID or confirmation number.' },
            },
            required: ['res'],
          },
        },
        {
          name: 'lost_found_search',
          description: 'Search the Lost & Found dashboard by date range, status, or keyword.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              keyword: { type: Type.STRING },
              fromDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
              toDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
              roomNumber: { type: Type.STRING },
            },
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    const ai = new GoogleGenAI({
      apiKey: requireApiKey(),
      httpOptions: { apiVersion: 'v1alpha' },
    });
    const expireTime = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();
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
    if (!token.name) throw new Error('token.name missing from authTokens.create response');
    res.status(200).json({
      token: token.name,
      model: MODEL,
      expiresAt: expireTime,
      toolsEnabled: Boolean(tools),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
