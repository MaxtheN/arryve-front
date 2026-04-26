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
import { getSessionId, logDemoEvent, newSessionId } from './demo-log';

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

// Module-level dedupe so the unmount cleanup doesn't re-fire `end` for a
// session the user already stopped explicitly. Without this, the bottom of
// `start`'s closure could run end twice and the second call would 404 on
// automation (slot already gone).
const endedSessions = new Set<string>();

function signalAutomationEnd(sessionId: string): void {
  if (endedSessions.has(sessionId)) return;
  endedSessions.add(sessionId);
  const payload = JSON.stringify({ sessionId });
  // Prefer sendBeacon so the browser delivers it even on tab close. The
  // automation endpoint may take 5–25 s to upload the video; the browser
  // hand-off via beacon means we don't have to wait.
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon('/api/automation-session-end', blob)) return;
    }
  } catch {
    /* ignore */
  }
  void fetch('/api/automation-session-end', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function VoiceDemoProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GeminiLiveStatus>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [firstAudioMs, setFirstAudioMs] = useState<number | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [toolsEnabled, setToolsEnabled] = useState(false);
  // Single-try lockout is disabled during the testing window. Re-enable
  // by restoring the fingerprint-based check in this provider (see git
  // history) when we're ready to cap repeat demos again.
  const demoLocked = false;
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    return () => {
      const sid = getSessionId();
      sessionRef.current?.stop();
      sessionRef.current = null;
      if (sid) signalAutomationEnd(sid);
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
    });
    // Fire-and-forget: open a recorded Playwright context for this session
    // so PMS actions during the call land in a video. Cold-start is 10–30 s
    // but runs in parallel with token mint and the user's first turn, so
    // the recording is usually warm before the first tool call. Failure is
    // non-fatal — the call still works, just without a video on the dashboard.
    void fetch('/api/automation-session-begin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: sid }),
      keepalive: true,
    }).catch(() => undefined);
    const t0 = performance.now();
    let minted: EphemeralTokenResponse;
    try {
      const resp = await fetch('/api/gemini-ephemeral-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `token mint failed (${resp.status})`);
      }
      minted = (await resp.json()) as EphemeralTokenResponse;
      const mintMs = Math.round(performance.now() - t0);
      // eslint-disable-next-line no-console
      console.log(`[arryve-demo] token mint ${mintMs} ms`);
      logDemoEvent('token_minted', {
        ms: mintMs,
        toolsEnabled: minted.toolsEnabled ?? false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('error');
      setError(msg);
      logDemoEvent('token_error', { error: msg, ms: Math.round(performance.now() - t0) });
      return;
    }
    setToolsEnabled(Boolean(minted.toolsEnabled));
    const session = new GeminiLiveSession(
      { token: minted.token, model: minted.model },
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
        onTurnEnd: (idx) => setTurnIndex(idx),
        onError: (err) => {
          const msg = err.message || String(err);
          setError(msg);
          logDemoEvent('error', { error: msg });
          // Connection died — close the recorded slot so we don't leak
          // a Playwright context until the idle GC sweeps it.
          if (sid) signalAutomationEnd(sid);
        },
        onEnded: (reason) => {
          setEndedReason(reason);
          logDemoEvent('ended', { reason });
          sessionRef.current = null;
          // Gemini ended the call itself (e.g. end_call tool). Without
          // this the recorded context stays open until the user closes
          // the tab (sendBeacon on unmount) or the idle GC sweeps.
          if (sid) signalAutomationEnd(sid);
        },
      }
    );
    sessionRef.current = session;
    try {
      await session.start();
    } catch {
      sessionRef.current = null;
    }
  }, [appendTranscript]);

  const stop = useCallback(async () => {
    const sid = getSessionId();
    await sessionRef.current?.stop();
    sessionRef.current = null;
    if (sid) signalAutomationEnd(sid);
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
