import { Mic, MicOff, Sparkles } from 'lucide-react';
import {
  MAX_TURNS,
  useVoiceDemo,
} from './VoiceDemoContext';
import type { GeminiLiveStatus } from './gemini-live';

/* Voice-to-voice demo panel. The actual session is owned by VoiceDemoContext
   so the hero CTA and this panel stay in sync — only one conversation can
   be active at a time. */

const STATUS_LABEL: Record<GeminiLiveStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  listening: 'Listening',
  speaking: 'Arvy is speaking',
  error: 'Error',
};

const STATUS_DOT: Record<GeminiLiveStatus, string> = {
  idle: 'bg-forest-950/30',
  connecting: 'bg-amber-500 animate-pulse',
  listening: 'bg-forest-900',
  speaking: 'bg-forest-900 animate-pulse',
  error: 'bg-rose-600',
};

export function GeminiLiveDemo() {
  const {
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
  } = useVoiceDemo();
  const isActive =
    status === 'connecting' || status === 'listening' || status === 'speaking';

  return (
    <div className="rounded-3xl bg-white border border-forest-950/10 shadow-[0_40px_120px_-40px_rgba(3,36,30,0.22)] overflow-hidden">
      <div className="flex items-center justify-between px-6 md:px-7 py-5 border-b border-ivory-200">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />
          <span className="text-[11px] uppercase tracking-[0.22em] text-forest-950/70 font-medium">
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-forest-950/50 font-medium">
          <Sparkles className="w-3 h-3" />
          Gemini Live{toolsEnabled ? ' · grounded' : ''}
        </div>
      </div>

      <div className="px-6 md:px-7 py-6 min-h-[240px] max-h-[360px] overflow-y-auto">
        {transcripts.length === 0 ? (
          <div className="text-center text-[14px] text-forest-950/55 py-10 font-serif italic">
            {isActive
              ? 'Say hello — Arvy is listening…'
              : 'Click Start call and speak to Arvy in real time.'}
          </div>
        ) : (
          <div className="space-y-5">
            {transcripts.map((m) => (
              <div key={m.id}>
                <div className="text-[10px] uppercase tracking-[0.22em] text-forest-950/50 mb-1 font-medium">
                  {m.role === 'user' ? 'You' : 'Arvy'}
                </div>
                <p className="text-[15px] md:text-base text-forest-950/90 leading-[1.5]">
                  {m.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="px-6 md:px-7 py-3 text-[13px] text-rose-700 bg-rose-50 border-t border-rose-100">
          {error}
        </div>
      )}

      {demoLocked && !isActive && (
        <div className="px-6 md:px-7 py-3 text-[13px] text-forest-950/70 bg-ivory-100 border-t border-ivory-200">
          You've already tried Arvy on this browser. Want to see her on your own phones, rooms, and folios? <a href="#pricing" className="underline underline-offset-2 hover:text-forest-950">Book a pilot →</a>
        </div>
      )}

      {endedReason === 'turn-limit' && !error && (
        <div className="px-6 md:px-7 py-3 text-[13px] text-forest-950/70 bg-ivory-100 border-t border-ivory-200">
          That's the demo — a real call with Arvy runs as long as the guest needs.
        </div>
      )}

      <div className="border-t border-ivory-200 bg-ivory-50 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-[12px] text-forest-950/60">
          {firstAudioMs !== null && (
            <div>
              <span className="uppercase tracking-[0.18em] text-forest-950/50 text-[10px] font-medium mr-1.5">
                First reply
              </span>
              <span className="font-mono text-forest-950/90">{firstAudioMs} ms</span>
            </div>
          )}
          {isActive && turnIndex > 0 && (
            <div>
              <span className="uppercase tracking-[0.18em] text-forest-950/50 text-[10px] font-medium mr-1.5">
                Turn
              </span>
              <span className="font-mono text-forest-950/90">
                {turnIndex} / {MAX_TURNS}
              </span>
            </div>
          )}
        </div>
        {isActive ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 bg-forest-950 text-ivory-50 px-4 py-2.5 rounded-full text-sm font-medium hover:bg-forest-900 transition-colors"
          >
            <MicOff className="w-3.5 h-3.5" />
            End call
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={demoLocked}
            className="inline-flex items-center gap-2 bg-forest-950 text-ivory-50 px-4 py-2.5 rounded-full text-sm font-medium hover:bg-forest-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mic className="w-3.5 h-3.5" />
            Start call
          </button>
        )}
      </div>
    </div>
  );
}
