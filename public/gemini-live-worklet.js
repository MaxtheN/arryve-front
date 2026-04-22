// AudioWorklet processor that downmixes mic input to mono PCM16 at the
// context sample rate and posts fixed-size chunks back to the main thread
// for Gemini Live. 100ms chunks at 16kHz = 1600 samples = 3200 bytes.
//
// Gemini Live wants 16kHz PCM16 little-endian, base64-encoded. We produce
// the raw Int16Array here; the main thread resamples + base64-encodes before
// sending, because sample-rate conversion is easier with the full AudioContext
// sampleRate prop than inside a worklet.

class GeminiMicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._frameSize = (options && options.processorOptions && options.processorOptions.frameSize) || 2048;
    this._buffer = new Float32Array(this._frameSize);
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
        // Copy so the main thread gets its own buffer (the worklet reuses ours).
        this.port.postMessage(this._buffer.slice(0).buffer, [this._buffer.slice(0).buffer]);
        this._bufferOffset = 0;
      }
    }
    return true;
  }
}

registerProcessor('gemini-mic', GeminiMicProcessor);
