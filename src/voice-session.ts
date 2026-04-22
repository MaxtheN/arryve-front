/**
 * Local voice-agent WebSocket client.
 *
 * Replaces the previous `gemini-live.ts` client. The server side is the
 * Pipecat pipeline on api.tryarryve.com (running on an A100 VM) — Silero
 * VAD + Whisper + Qwen3.5-35B-A3B + Kokoro, with tool calls dispatched
 * in-process against the HotelKey Playwright pool on the same VM.
 *
 * Wire format matches the server-side `JsonFrameSerializer` (see
 * voice_local/json_serializer.py). All text frames, base64-encoded PCM
 * audio both directions. Input is 16kHz PCM16 mono, output is 24kHz
 * PCM16 mono.
 */

import { getSessionId, logDemoEvent } from './demo-log';

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;
const MIC_FRAME_SIZE = 2048;

export type VoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'error';

export interface VoiceCallbacks {
  onStatus?: (status: VoiceStatus) => void;
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
  onFirstAudio?: (latencyMs: number) => void;
  onTranscript?: (role: 'user' | 'model', text: string) => void;
  onError?: (err: Error) => void;
  onEnded?: (reason: 'model-ended' | 'user-stopped' | 'server-closed') => void;
}

export interface VoiceConfig {
  /** wss://api.tryarryve.com/voice */
  url: string;
}

interface ServerMessage {
  type: string;
  data?: string;
  text?: string;
  role?: string;
  sample_rate?: number;
}

export class VoiceSession {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micNode: AudioWorkletNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private playbackCtx: AudioContext | null = null;
  private playbackQueueEndsAt = 0;
  private scheduledSources: Set<AudioBufferSourceNode> = new Set();
  private status: VoiceStatus = 'idle';
  private turnStartedAt: number | null = null;
  private waitingForFirstAudio = false;
  private endReason: 'model-ended' | 'user-stopped' | 'server-closed' | null = null;
  private callbacks: VoiceCallbacks;
  private config: VoiceConfig;

  constructor(config: VoiceConfig, callbacks: VoiceCallbacks = {}) {
    if (!config.url) throw new Error('VoiceSession: url is required');
    this.config = config;
    this.callbacks = callbacks;
  }

  private setStatus(next: VoiceStatus) {
    this.status = next;
    this.callbacks.onStatus?.(next);
  }

  async start(): Promise<void> {
    this.setStatus('connecting');
    const startedAt = performance.now();
    try {
      this.playbackCtx = new AudioContext({ sampleRate: OUTPUT_RATE });
      if (this.playbackCtx.state === 'suspended') await this.playbackCtx.resume();
      this.playbackQueueEndsAt = this.playbackCtx.currentTime;

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.audioCtx = new AudioContext();
      await this.audioCtx.audioWorklet.addModule('/voice-mic-worklet.js');

      this.ws = new WebSocket(this.config.url);
      this.ws.onopen = () => {
        const openMs = Math.round(performance.now() - startedAt);
        // eslint-disable-next-line no-console
        console.log(`[voice] ws open ${openMs} ms`);
        logDemoEvent('ws_open', { ms: openMs });
        // Tell the server our session id (server-side logs use it for audit).
        this.ws?.send(
          JSON.stringify({ type: 'start', session_id: getSessionId() })
        );
        this.setStatus('listening');
        this.startMicPump();
        this.turnStartedAt = performance.now();
        this.waitingForFirstAudio = true;
      };
      this.ws.onmessage = (ev) => this.handleServerMessage(ev.data);
      this.ws.onerror = (ev) => {
        // eslint-disable-next-line no-console
        console.error('[voice] ws error', ev);
        this.callbacks.onError?.(new Error('voice ws error'));
        this.setStatus('error');
      };
      this.ws.onclose = (ev) => {
        // eslint-disable-next-line no-console
        console.log('[voice] ws close', { code: ev.code, reason: ev.reason });
        logDemoEvent('ws_close', { code: ev.code, reason: ev.reason, wasOpened: true });
        this.detachMic();
        const aborted = ev.code !== 1000 && ev.code !== 1005;
        if (aborted && this.status !== 'error') {
          this.callbacks.onError?.(
            new Error(`server closed: ${ev.reason || 'code ' + ev.code}`)
          );
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
      };
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
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const float32 = new Float32Array(ev.data);
      const resampled = resampleLinear(
        float32,
        this.audioCtx!.sampleRate,
        INPUT_RATE
      );
      const pcm16 = floatToPcm16(resampled);
      const base64 = pcmToBase64(pcm16);
      this.ws.send(JSON.stringify({ type: 'audio', data: base64 }));
    };
    this.micSource.connect(this.micNode);
    const sink = this.audioCtx.createGain();
    sink.gain.value = 0;
    this.micNode.connect(sink).connect(this.audioCtx.destination);
  }

  private handleServerMessage(raw: string | ArrayBuffer) {
    if (typeof raw !== 'string') return;
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    switch (msg.type) {
      case 'audio': {
        if (!msg.data) return;
        if (this.waitingForFirstAudio && this.turnStartedAt !== null) {
          const latencyMs = performance.now() - this.turnStartedAt;
          this.callbacks.onFirstAudio?.(latencyMs);
          this.waitingForFirstAudio = false;
          this.setStatus('speaking');
        }
        this.playAudioChunk(msg.data, msg.sample_rate ?? OUTPUT_RATE);
        break;
      }
      case 'transcript': {
        const role = msg.role === 'model' ? 'model' : 'user';
        const text = msg.text ?? '';
        if (text.trim()) this.callbacks.onTranscript?.(role, text);
        break;
      }
      case 'bot_started_speaking':
        this.setStatus('speaking');
        break;
      case 'bot_stopped_speaking':
        this.callbacks.onTurnEnd?.();
        this.turnStartedAt = performance.now();
        this.waitingForFirstAudio = true;
        this.setStatus('listening');
        break;
      case 'user_started_speaking':
        this.callbacks.onTurnStart?.();
        break;
      case 'user_stopped_speaking':
        // user handed the turn to Arvy; LLM starts generating shortly.
        break;
      case 'interrupted':
        this.clearPlayback();
        break;
      case 'end':
        this.endReason = 'model-ended';
        this.endAfterPlaybackDrains();
        break;
      default:
        break;
    }
  }

  private playAudioChunk(base64: string, sampleRate: number) {
    if (!this.playbackCtx) return;
    const pcm = base64ToPcm16(base64);
    const float32 = pcm16ToFloat(pcm);
    const buffer = this.playbackCtx.createBuffer(1, float32.length, sampleRate);
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

  private endAfterPlaybackDrains() {
    this.detachMic();
    const remainingMs =
      this.playbackCtx && this.playbackQueueEndsAt > this.playbackCtx.currentTime
        ? (this.playbackQueueEndsAt - this.playbackCtx.currentTime) * 1000
        : 0;
    setTimeout(() => void this.stop(), Math.max(250, remainingMs + 250));
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
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.ws = null;
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
  for (let i = 0; i < input.length; i++) out[i] = input[i] / 0x8000;
  return out;
}

function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[]
    );
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
