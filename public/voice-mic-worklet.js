// AudioWorklet processor — downmixes mic input to mono Float32 and posts
// fixed-size chunks back to the main thread. Main thread resamples to 16kHz
// and ships to the local voice agent WebSocket.
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
        this.port.postMessage(this._buffer.slice(0).buffer, [this._buffer.slice(0).buffer]);
        this._bufferOffset = 0;
      }
    }
    return true;
  }
}
registerProcessor('gemini-mic', GeminiMicProcessor);
