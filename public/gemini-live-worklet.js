// AudioWorklet processor that downmixes mic input to mono PCM16 at the
// context sample rate and posts fixed-size chunks back to the main thread
// for Gemini Live. 100ms chunks at 16kHz = 1600 samples = 3200 bytes.
//
// Gemini Live wants 16kHz PCM16 little-endian, base64-encoded. We produce
// the raw Int16Array here; the main thread resamples + base64-encodes before
// sending, because sample-rate conversion is easier with the full AudioContext
// sampleRate prop than inside a worklet.
//
// Noise gate: background chatter, keyboard clicks, or a distant second
// speaker were picked up by Gemini's server-side VAD and fired barge-ins
// mid-reply. We zero-out frames whose rolling RMS is below a calibrated
// threshold before they reach the network, so Gemini never sees ambient
// sub-speech as guest audio.
//
// The threshold adapts to the first ~1.5 s of the session (treated as the
// background-noise baseline). After that, a frame needs >= GATE_RATIO x
// baseline (with an absolute floor) to pass. This is a single-speaker
// amplitude lock, not true speaker recognition, but it suppresses the
// low-amplitude environmental noise that caused spurious interruptions.

const CALIBRATION_SAMPLES = 24000; // ~1.5 s of mic input (at 16 kHz equivalent)
const GATE_FLOOR = 0.010;          // absolute minimum RMS to ever pass
const GATE_RATIO = 1.8;            // frame must exceed GATE_RATIO * baseline
const HOLD_FRAMES = 8;             // keep gate open briefly after speech (tail release)

class ArryveMicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._frameSize = (options && options.processorOptions && options.processorOptions.frameSize) || 2048;
    this._buffer = new Float32Array(this._frameSize);
    this._bufferOffset = 0;
    this._calSamples = 0;
    this._calSumSq = 0;
    this._baseRms = 0;
    this._holdRemaining = 0;
  }

  _flushFrame() {
    let sumSq = 0;
    for (let j = 0; j < this._frameSize; j++) {
      const s = this._buffer[j];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / this._frameSize);

    if (this._calSamples < CALIBRATION_SAMPLES) {
      this._calSumSq += sumSq;
      this._calSamples += this._frameSize;
      if (this._calSamples >= CALIBRATION_SAMPLES) {
        this._baseRms = Math.sqrt(this._calSumSq / this._calSamples);
      }
      // Pass frames through during calibration — guest can start talking
      // immediately. Below-floor frames still get muted to protect against
      // very quiet startup environments.
      if (rms < GATE_FLOOR) this._buffer.fill(0);
    } else {
      const threshold = Math.max(GATE_FLOOR, this._baseRms * GATE_RATIO);
      if (rms >= threshold) {
        this._holdRemaining = HOLD_FRAMES;
      } else if (this._holdRemaining > 0) {
        this._holdRemaining--;
      } else {
        this._buffer.fill(0);
      }
    }

    const copy = this._buffer.slice(0);
    this.port.postMessage(copy.buffer, [copy.buffer]);
    this._bufferOffset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;
    let i = 0;
    while (i < channel.length) {
      const remain = this._frameSize - this._bufferOffset;
      const copy = Math.min(remain, channel.length - i);
      this._buffer.set(channel.subarray(i, i + copy), this._bufferOffset);
      this._bufferOffset += copy;
      i += copy;
      if (this._bufferOffset === this._frameSize) {
        this._flushFrame();
      }
    }
    return true;
  }
}

registerProcessor('gemini-mic', ArryveMicProcessor);
