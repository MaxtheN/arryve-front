/**
 * Shared voice-session state — consumed by the hero CTA and the
 * TryACall section so both drive a single conversation.
 *
 * Backed by VoiceSession (WebSocket to api.tryarryve.com/voice) which
 * talks to our local Pipecat pipeline on the A100 (Whisper + Qwen3.5 +
 * Kokoro + HK tool dispatch in-process).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  VoiceSession,
  type VoiceStatus,
} from './voice-session';
import { logDemoEvent, newSessionId } from './demo-log';

export type TranscriptEntry = { id: number; role: 'user' | 'model'; text: string };

// Local voice agent WS URL. Override in dev with VITE_VOICE_WS_URL=ws://localhost:4647/voice
const DEFAULT_VOICE_URL =
  (import.meta.env.VITE_VOICE_WS_URL as string | undefined) ??
  'wss://api.tryarryve.com/voice';

interface VoiceDemoValue {
  status: VoiceStatus;
  transcripts: TranscriptEntry[];
  firstAudioMs: number | null;
  turnIndex: number;
  error: string | null;
  endedReason: string | null;
  demoLocked: boolean;
  toolsEnabled: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

const VoiceDemoCtx = createContext<VoiceDemoValue | null>(null);

export function VoiceDemoProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [firstAudioMs, setFirstAudioMs] = useState<number | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  // Fingerprint lockout disabled during testing. See git history for the
  // original check if we want to re-enable.
  const demoLocked = false;
  // Tools are always available on the local stack now — the server has
  // in-process handlers for availability, lost-and-found, KB lookup, end_call.
  const toolsEnabled = true;
  const sessionRef = useRef<VoiceSession | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  const appendTranscript = useCallback(
    (role: 'user' | 'model', text: string) => {
      setTranscripts((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role) {
          const merged = {
            ...last,
            text: (last.text + ' ' + text).replace(/\s+/g, ' ').trim(),
          };
          return [...prev.slice(0, -1), merged];
        }
        return [...prev.slice(-7), { id: nextId.current++, role, text: text.trim() }];
      });
    },
    []
  );

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    setFirstAudioMs(null);
    setTranscripts([]);
    setTurnIndex(0);
    setEndedReason(null);
    setStatus('connecting');
    const sid = newSessionId();
    logDemoEvent('session_start', {
      ua: navigator.userAgent,
      lang: navigator.language,
      stack: 'local-pipecat',
    });

    const session = new VoiceSession(
      { url: DEFAULT_VOICE_URL },
      {
        onStatus: setStatus,
        onFirstAudio: (ms) => {
          const rounded = Math.round(ms);
          setFirstAudioMs(rounded);
          logDemoEvent('first_audio', { ms: rounded });
        },
        onTranscript: (role, text) => {
          appendTranscript(role, text);
          logDemoEvent('transcript', { role, text });
        },
        onTurnStart: () => setFirstAudioMs(null),
        onTurnEnd: () => setTurnIndex((n) => n + 1),
        onError: (err) => {
          const msg = err.message || String(err);
          setError(msg);
          logDemoEvent('error', { error: msg });
        },
        onEnded: (reason) => {
          setEndedReason(reason);
          logDemoEvent('ended', { reason });
          sessionRef.current = null;
        },
      }
    );
    sessionRef.current = session;
    try {
      await session.start();
      void sid; // sid is inside logDemoEvent via getSessionId()
    } catch {
      sessionRef.current = null;
    }
  }, [appendTranscript]);

  const stop = useCallback(async () => {
    await sessionRef.current?.stop();
    sessionRef.current = null;
  }, []);

  const value: VoiceDemoValue = {
    status,
    transcripts,
    firstAudioMs,
    turnIndex,
    error,
    endedReason,
    demoLocked,
    toolsEnabled,
    start,
    stop,
  };

  return <VoiceDemoCtx.Provider value={value}>{children}</VoiceDemoCtx.Provider>;
}

export function useVoiceDemo(): VoiceDemoValue {
  const ctx = useContext(VoiceDemoCtx);
  if (!ctx) {
    throw new Error('useVoiceDemo must be used inside VoiceDemoProvider');
  }
  return ctx;
}
