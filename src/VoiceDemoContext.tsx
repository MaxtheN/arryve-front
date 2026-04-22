/**
 * Shared Gemini Live session state — consumed by both the hero "Hear Arvy
 * answer" button and the main `<GeminiLiveDemo />` panel in the TryACall
 * section so they drive a single conversation (can't have one running in
 * two places).
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
  GeminiLiveSession,
  type GeminiLiveStatus,
} from './gemini-live';
import {
  computeFingerprint,
  hasConsumedDemo,
  markDemoConsumed,
} from './demo-fingerprint';

export const MAX_TURNS = 10;

export type TranscriptEntry = { id: number; role: 'user' | 'model'; text: string };

interface EphemeralTokenResponse {
  token: string;
  model: string;
  expiresAt: string;
  toolsEnabled?: boolean;
}

interface VoiceDemoValue {
  status: GeminiLiveStatus;
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
  const [status, setStatus] = useState<GeminiLiveStatus>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [firstAudioMs, setFirstAudioMs] = useState<number | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [demoLocked, setDemoLocked] = useState(false);
  const [toolsEnabled, setToolsEnabled] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    computeFingerprint()
      .then((fp) => {
        if (cancelled) return;
        setFingerprint(fp);
        if (hasConsumedDemo(fp)) setDemoLocked(true);
      })
      .catch(() => {
        /* fingerprint best-effort */
      });
    return () => {
      cancelled = true;
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
    if (demoLocked) return;
    setError(null);
    setFirstAudioMs(null);
    setTranscripts([]);
    setTurnIndex(0);
    setEndedReason(null);
    setStatus('connecting');
    let minted: EphemeralTokenResponse;
    try {
      const resp = await fetch('/api/gemini-ephemeral-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `token mint failed (${resp.status})`);
      }
      minted = (await resp.json()) as EphemeralTokenResponse;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    setToolsEnabled(Boolean(minted.toolsEnabled));
    const session = new GeminiLiveSession(
      { token: minted.token, model: minted.model, maxTurns: MAX_TURNS },
      {
        onStatus: setStatus,
        onFirstAudio: (ms) => setFirstAudioMs(Math.round(ms)),
        onTranscript: appendTranscript,
        onTurnStart: () => setFirstAudioMs(null),
        onTurnEnd: (idx) => setTurnIndex(idx),
        onError: (err) => setError(err.message || String(err)),
        onEnded: (reason) => {
          setEndedReason(reason);
          if (fingerprint) {
            markDemoConsumed(fingerprint);
            setDemoLocked(true);
          }
          sessionRef.current = null;
        },
      }
    );
    sessionRef.current = session;
    try {
      await session.start();
    } catch {
      sessionRef.current = null;
    }
  }, [appendTranscript, demoLocked, fingerprint]);

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
