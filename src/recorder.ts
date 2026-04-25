/**
 * Stereo recorder for the Gemini Live demo.
 *
 *   Left channel  = guest microphone (resampled to 24 kHz)
 *   Right channel = Arvy's output    (already 24 kHz from Gemini)
 *
 * Both streams are written into time-keyed buckets relative to the call's
 * start. On `finalize()` we walk both buckets, splat each chunk into a
 * pre-zeroed stereo buffer at the right offset, and emit a 16-bit PCM WAV
 * blob. The blob ships to /api/session-finalize which forwards to the
 * dashboard-api on the A100.
 *
 * Why we don't use MediaRecorder: the bot audio comes from a sequence of
 * AudioBufferSourceNodes scheduled via Web Audio, so the only mic-vs-bot
 * mix Chrome will give us is via a MediaStreamDestination + a live mic
 * track — and that loses the precise scheduling MediaBufferSource gives
 * us. A direct timeline mix is simpler and exact.
 *
 * Memory ceiling: cap at 30 minutes / ~5 MB per channel of float32 at
 * 24 kHz to be safe against runaway sessions.
 */

const REC_RATE = 24000;
const MAX_DURATION_MS = 30 * 60 * 1000;

interface Chunk {
  /** Wall-clock ms relative to recorder start. */
  at: number;
  samples: Float32Array;
}

export class Recorder {
  private startedAt = 0;
  private mic: Chunk[] = [];
  private bot: Chunk[] = [];
  private active = false;

  start(): void {
    this.startedAt = performance.now();
    this.mic = [];
    this.bot = [];
    this.active = true;
  }

  stop(): void {
    this.active = false;
  }

  /**
   * Push a mic frame. Caller passes Float32 samples already at the
   * mic's native rate; we resample to REC_RATE.
   */
  pushMic(samples: Float32Array, sourceRate: number): void {
    if (!this.active) return;
    const at = performance.now() - this.startedAt;
    if (at > MAX_DURATION_MS) return;
    const out = sourceRate === REC_RATE ? samples : resampleLinear(samples, sourceRate, REC_RATE);
    this.mic.push({ at, samples: out });
  }

  /**
   * Push an Arvy audio chunk. Already at 24 kHz from Gemini Live.
   * `at` is the wall-clock time the chunk was scheduled to start playing.
   */
  pushBot(samples: Float32Array): void {
    if (!this.active) return;
    const at = performance.now() - this.startedAt;
    if (at > MAX_DURATION_MS) return;
    this.bot.push({ at, samples });
  }

  /**
   * Build the stereo WAV blob. Returns null if no audio was captured.
   */
  finalize(): { wav: Blob; durationMs: number } | null {
    if (this.mic.length === 0 && this.bot.length === 0) return null;
    const lastEnd = (chunks: Chunk[]) =>
      chunks.length === 0
        ? 0
        : chunks[chunks.length - 1].at + (chunks[chunks.length - 1].samples.length / REC_RATE) * 1000;
    const totalMs = Math.ceil(Math.max(lastEnd(this.mic), lastEnd(this.bot)));
    const totalSamples = Math.ceil((totalMs / 1000) * REC_RATE);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);
    splat(left, this.mic);
    splat(right, this.bot);
    const wav = encodeStereoPcm16Wav(left, right, REC_RATE);
    // Free big arrays once the WAV is in hand.
    this.mic = [];
    this.bot = [];
    return { wav, durationMs: totalMs };
  }
}

function splat(target: Float32Array, chunks: Chunk[]): void {
  for (const c of chunks) {
    const offset = Math.round((c.at / 1000) * REC_RATE);
    if (offset >= target.length) continue;
    const room = target.length - offset;
    const take = Math.min(room, c.samples.length);
    // Mix-add in case multiple chunks overlap (unlikely but defensive).
    for (let i = 0; i < take; i++) target[offset + i] += c.samples[i];
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

function encodeStereoPcm16Wav(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): Blob {
  const numFrames = Math.min(left.length, right.length);
  const bytesPerSample = 2;
  const channels = 2;
  const dataSize = numFrames * channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  // fmt chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);                   // PCM chunk size
  view.setUint16(20, 1, true);                    // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);                   // bits per sample
  // data chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    view.setInt16(offset, clampPcm16(left[i]), true);
    offset += 2;
    view.setInt16(offset, clampPcm16(right[i]), true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function clampPcm16(v: number): number {
  const c = Math.max(-1, Math.min(1, v));
  return c < 0 ? c * 0x8000 : c * 0x7fff;
}

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
