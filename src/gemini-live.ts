/**
 * Gemini Live voice-to-voice demo client.
 *
 * Connects the browser microphone straight to Gemini Live's native-audio
 * dialog model, plays the response audio back as it streams in, and reports
 * wall-clock latency between user-turn-end and first-response-audio so we
 * can compare against the Twilio cascade path (which is pinned at ~2-3 s).
 *
 * Sample rates:
 *  - Gemini Live input:  16 kHz PCM16 mono, base64.
 *  - Gemini Live output: 24 kHz PCM16 mono, base64.
 *  - AudioContext sampleRate is device-dependent (usually 48 kHz); we
 *    resample both ways manually (linear, not ideal but fine for demo).
 */

import {
  GoogleGenAI,
  Modality,
  type FunctionCall,
  type FunctionResponse,
  type LiveServerMessage,
  type Session,
} from '@google/genai';

import { getSessionId, logDemoEvent } from './demo-log';
import { lookupPropertyInfo } from './property-kb';

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;
const MIC_FRAME_SIZE = 2048; // worklet posts at this size — tuned for latency.

export type GeminiLiveStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'error';

export interface GeminiLiveCallbacks {
  onStatus?: (status: GeminiLiveStatus) => void;
  onTurnStart?: () => void;
  onTurnEnd?: (turnIndex: number) => void;
  onFirstAudio?: (latencyMs: number) => void;
  onTranscript?: (role: 'user' | 'model', text: string) => void;
  onError?: (err: Error) => void;
  // Fired when the session ends naturally (hit turn limit, model said
  // goodbye, or user clicked stop). Separate from onError so the UI can
  // distinguish "demo ended" from "something broke".
  onEnded?: (reason: 'model-ended' | 'user-stopped' | 'server-closed') => void;
}

export interface GeminiLiveConfig {
  // Ephemeral auth token minted server-side. Root API key never lives
  // in the browser.
  token: string;
  model: string;
}

export class GeminiLiveSession {
  private ai: GoogleGenAI;
  private session: Session | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micNode: AudioWorkletNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private playbackCtx: AudioContext | null = null;
  private playbackQueueEndsAt: number = 0;
  // Keep a handle to every scheduled output source so we can .stop() them
  // when the server says the user interrupted or when the session closes.
  // Without this, previously-scheduled chunks keep playing after
  // `playbackQueueEndsAt` is rewound, which makes the next reply audibly
  // collide with the tail of the previous one.
  private scheduledSources: Set<AudioBufferSourceNode> = new Set();
  private callbacks: GeminiLiveCallbacks;
  private config: GeminiLiveConfig;
  private status: GeminiLiveStatus = 'idle';
  private turnStartedAt: number | null = null;
  private waitingForFirstAudio = false;
  private completedTurns = 0;
  private endReason: 'model-ended' | 'user-stopped' | 'server-closed' | null = null;

  constructor(config: GeminiLiveConfig, callbacks: GeminiLiveCallbacks = {}) {
    if (!config.token) {
      throw new Error('Ephemeral Gemini Live token is required.');
    }
    // v1alpha is required when connecting with an ephemeral token.
    this.ai = new GoogleGenAI({
      apiKey: config.token,
      httpOptions: { apiVersion: 'v1alpha' },
    });
    this.config = config;
    this.callbacks = callbacks;
  }

  private setStatus(next: GeminiLiveStatus) {
    this.status = next;
    this.callbacks.onStatus?.(next);
  }

  async start(): Promise<void> {
    this.setStatus('connecting');
    const startedAt = performance.now();
    try {
      // Playback context is 24kHz so the model's native output plays without
      // resampling; mic capture uses a second context at the device default so
      // getUserMedia doesn't fight the browser.
      this.playbackCtx = new AudioContext({ sampleRate: OUTPUT_RATE });
      // User-gesture requirement: if the demo button-click hasn't resumed the
      // context, do it now.
      if (this.playbackCtx.state === 'suspended') {
        await this.playbackCtx.resume();
      }
      this.playbackQueueEndsAt = this.playbackCtx.currentTime;

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.audioCtx = new AudioContext();
      await this.audioCtx.audioWorklet.addModule('/gemini-live-worklet.js');

      let opened = false;
      this.session = await this.ai.live.connect({
        model: this.config.model,
        // The ephemeral token already locks responseModalities, system
        // instruction, and voice server-side. We still pass a config block
        // here because the SDK requires one, but it's effectively a no-op.
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onopen: () => {
            opened = true;
            const openMs = Math.round(performance.now() - startedAt);
            // eslint-disable-next-line no-console
            console.log(`[gemini-live] ws open ${openMs} ms after start()`);
            logDemoEvent('ws_open', { ms: openMs });
            this.setStatus('listening');
            this.startMicPump();
          },
          onmessage: (msg: LiveServerMessage) => {
            this.handleServerMessage(msg);
          },
          onerror: (e: ErrorEvent) => {
            // eslint-disable-next-line no-console
            console.error('[gemini-live] ws error', e);
            this.callbacks.onError?.(new Error(e.message || 'gemini-live error'));
            this.setStatus('error');
          },
          onclose: (e: CloseEvent) => {
            // eslint-disable-next-line no-console
            console.log('[gemini-live] ws close', {
              code: e.code,
              reason: e.reason,
              wasOpened: opened,
            });
            logDemoEvent('ws_close', {
              code: e.code,
              reason: e.reason,
              wasOpened: opened,
            });
            // Stop the mic pump the moment the server closes; otherwise
            // the worklet keeps calling sendRealtimeInput on a dead socket
            // and fills the console with "CLOSING or CLOSED state" warnings.
            this.detachMic();
            // Close w/ non-normal code = server rejected / errored; surface.
            const aborted = e.code !== 1000 && e.code !== 1005;
            if ((!opened || aborted) && this.status !== 'error') {
              const msg = e.reason
                ? `Gemini Live closed: ${e.reason} (code ${e.code})`
                : `Gemini Live closed with code ${e.code}`;
              this.callbacks.onError?.(new Error(msg));
              this.setStatus('error');
              return;
            }
            if (this.status !== 'error') {
              this.setStatus('idle');
              if (this.endReason === null) {
                this.endReason = 'server-closed';
                this.callbacks.onEnded?.('server-closed');
              }
            }
          },
        },
      });
    } catch (err) {
      this.callbacks.onError?.(err as Error);
      this.setStatus('error');
      await this.cleanup();
      throw err;
    }
  }

  async stop(): Promise<void> {
    const reason = this.endReason ?? 'user-stopped';
    await this.cleanup();
    this.setStatus('idle');
    this.callbacks.onEnded?.(reason);
  }

  private startMicPump() {
    if (!this.audioCtx || !this.micStream) return;
    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
    this.micNode = new AudioWorkletNode(this.audioCtx, 'gemini-mic', {
      processorOptions: { frameSize: MIC_FRAME_SIZE },
    });
    this.micNode.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
      if (!this.session) return;
      const float32 = new Float32Array(ev.data);
      const resampled = resampleLinear(
        float32,
        this.audioCtx!.sampleRate,
        INPUT_RATE
      );
      const pcm16 = floatToPcm16(resampled);
      const base64 = pcmToBase64(pcm16);
      // sendRealtimeInput accepts binary audio chunks.
      this.session.sendRealtimeInput({
        audio: { data: base64, mimeType: `audio/pcm;rate=${INPUT_RATE}` },
      });
    };
    this.micSource.connect(this.micNode);
    // AudioWorkletNode requires a downstream connection on some browsers to
    // actually process — route to a muted GainNode so we don't echo ourselves.
    const sink = this.audioCtx.createGain();
    sink.gain.value = 0;
    this.micNode.connect(sink).connect(this.audioCtx.destination);

    if (!this.turnStartedAt) {
      this.turnStartedAt = performance.now();
      this.waitingForFirstAudio = true;
      this.callbacks.onTurnStart?.();
    }
  }

  private async resolveToolCalls(calls: FunctionCall[]) {
    const responses: FunctionResponse[] = [];
    let shouldEnd = false;
    for (const call of calls) {
      const { id, name, args } = call;
      if (!name) continue;
      // Built-in client-side tool: the model calls `end_call` when the
      // conversation is naturally complete. We ack it so the model doesn't
      // hang waiting for a response, then tear down after the last audio
      // chunk finishes playing.
      if (name === 'end_call') {
        responses.push({ id, name, response: { output: { ok: true } } });
        shouldEnd = true;
        logDemoEvent('tool_call', { name: 'end_call', args });
        continue;
      }
      // Local-only tool: resolve KB lookups in-process. Zero network, ~0.1ms.
      if (name === 'lookup_property_info') {
        const topic = typeof args?.topic === 'string' ? args.topic : 'index';
        const info = lookupPropertyInfo(topic);
        responses.push({ id, name, response: { output: { topic, info } } });
        logDemoEvent('tool_call', {
          name: 'lookup_property_info',
          args: { topic },
          ms: 0,
          ok: true,
        });
        continue;
      }
      const toolStart = performance.now();
      try {
        const resp = await fetch('/api/tool-invoke', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, args: args ?? {}, sessionId: getSessionId() }),
        });
        const body = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
        const toolMs = Math.round(performance.now() - toolStart);
        if (!resp.ok) {
          logDemoEvent('tool_call', {
            name,
            args,
            ms: toolMs,
            ok: false,
            status: resp.status,
            error: body.error,
          });
          responses.push({
            id,
            name,
            response: { error: body.error || `tool ${name} failed (${resp.status})` },
          });
          continue;
        }
        logDemoEvent('tool_call', {
          name,
          args,
          ms: toolMs,
          ok: true,
        });
        responses.push({ id, name, response: { output: body } });
      } catch (err) {
        const msg = (err as Error).message || 'tool dispatch failed';
        logDemoEvent('tool_call', {
          name,
          args,
          ms: Math.round(performance.now() - toolStart),
          ok: false,
          error: msg,
        });
        responses.push({
          id,
          name,
          response: { error: msg },
        });
      }
    }
    this.session?.sendToolResponse({ functionResponses: responses });
    if (shouldEnd) {
      this.endReason = 'model-ended';
      this.endAfterPlaybackDrains();
    }
  }

  private handleServerMessage(msg: LiveServerMessage) {
    // Tool calls: resolve via our /api/tool-invoke proxy then ack with
    // sendToolResponse. The Live session stays paused on Gemini's side
    // until we respond, so we keep this off the UI critical path.
    const toolCalls = msg.toolCall?.functionCalls;
    if (toolCalls && toolCalls.length > 0) {
      void this.resolveToolCalls(toolCalls);
    }

    // inputTranscription: what Gemini heard from the user.
    const input = msg.serverContent?.inputTranscription?.text;
    if (input) this.callbacks.onTranscript?.('user', input);
    // outputTranscription: what Gemini said.
    const output = msg.serverContent?.outputTranscription?.text;
    if (output) this.callbacks.onTranscript?.('model', output);

    // Audio chunks come on serverContent.modelTurn.parts[*].inlineData.
    const parts = msg.serverContent?.modelTurn?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData;
      if (!inline?.data) continue;
      if (!inline.mimeType?.startsWith('audio/')) continue;
      if (this.waitingForFirstAudio && this.turnStartedAt !== null) {
        const latencyMs = performance.now() - this.turnStartedAt;
        this.callbacks.onFirstAudio?.(latencyMs);
        this.waitingForFirstAudio = false;
        this.setStatus('speaking');
      }
      this.playAudioChunk(inline.data);
    }

    // Interrupted: reset playback + pending state.
    if (msg.serverContent?.interrupted) {
      this.clearPlayback();
    }

    // turnComplete: model finished speaking; flip to listening.
    if (msg.serverContent?.turnComplete) {
      this.completedTurns += 1;
      this.callbacks.onTurnEnd?.(this.completedTurns);
      this.turnStartedAt = performance.now();
      this.waitingForFirstAudio = true;
      this.setStatus('listening');
    }
  }

  private endAfterPlaybackDrains() {
    this.detachMic();
    const remainingMs =
      this.playbackCtx && this.playbackQueueEndsAt > this.playbackCtx.currentTime
        ? (this.playbackQueueEndsAt - this.playbackCtx.currentTime) * 1000
        : 0;
    setTimeout(() => void this.stop(), Math.max(250, remainingMs + 250));
  }

  private playAudioChunk(base64: string) {
    if (!this.playbackCtx) return;
    const pcm = base64ToPcm16(base64);
    const float32 = pcm16ToFloat(pcm);
    const buffer = this.playbackCtx.createBuffer(1, float32.length, OUTPUT_RATE);
    buffer.copyToChannel(float32, 0);
    const source = this.playbackCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackCtx.destination);
    const startAt = Math.max(this.playbackCtx.currentTime, this.playbackQueueEndsAt);
    source.start(startAt);
    this.scheduledSources.add(source);
    source.addEventListener('ended', () => {
      this.scheduledSources.delete(source);
    });
    this.playbackQueueEndsAt = startAt + buffer.duration;
  }

  private clearPlayback() {
    // Hard-stop every currently-scheduled source so the guest hears silence
    // the instant Gemini says they interrupted. Without this, sources that
    // were already .start()'d on the audio clock continue playing even after
    // we rewind playbackQueueEndsAt — which is the race that produces
    // overlapping Arvy voices.
    for (const source of this.scheduledSources) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.scheduledSources.clear();
    if (this.playbackCtx) {
      this.playbackQueueEndsAt = this.playbackCtx.currentTime;
    }
  }

  private detachMic() {
    if (this.micNode) {
      try {
        this.micNode.port.onmessage = null;
        this.micNode.disconnect();
      } catch {
        /* noop */
      }
      this.micNode = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        /* noop */
      }
      this.micSource = null;
    }
  }

  private async cleanup() {
    try {
      this.session?.close();
    } catch {
      /* noop */
    }
    this.session = null;
    this.detachMic();
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      try {
        await this.audioCtx.close();
      } catch {
        /* noop */
      }
      this.audioCtx = null;
    }
    if (this.playbackCtx) {
      try {
        await this.playbackCtx.close();
      } catch {
        /* noop */
      }
      this.playbackCtx = null;
    }
  }
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, input.length - 1);
    const frac = pos - lo;
    out[i] = input[lo] * (1 - frac) + input[hi] * frac;
  }
  return out;
}

function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function pcm16ToFloat(input: Int16Array): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    out[i] = input[i] / 0x8000;
  }
  return out;
}

function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(bin);
}

function base64ToPcm16(b64: string): Int16Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}
