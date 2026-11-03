/* AudioWorklet: downmix mono is supplied by the node, resample to 16 kHz, frame = 100 ms. */
class OralPcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.frame = new Int16Array(1600); this.index = 0; this.sum = 0; this.weight = 0
    this.ratio = sampleRate / 16000; this.remaining = this.ratio; this.stopped = false
    this.port.onmessage = event => {
      if (event.data?.type !== 'flush') return
      this.stopped = true
      if (this.index) this.send()
      this.port.postMessage({ type: 'flushed' })
    }
  }
  send() {
    const data = new ArrayBuffer(this.index * 2), view = new DataView(data)
    for (let i = 0; i < this.index; i++) view.setInt16(i * 2, this.frame[i], true)
    this.port.postMessage({ type: 'pcm', data }, [data]); this.index = 0
  }
  process(inputs) {
    if (this.stopped) return false
    const input = inputs[0]?.[0]
    if (!input) return true
    for (const sample of input) {
      let available = 1
      while (available > 1e-8) {
        const weight = Math.min(available, this.remaining)
        this.sum += sample * weight; this.weight += weight; this.remaining -= weight; available -= weight
        if (this.remaining < 1e-8) {
          this.frame[this.index++] = Math.round(Math.max(-1, Math.min(1, this.sum / this.weight)) * 32767)
          this.sum = 0; this.weight = 0; this.remaining = this.ratio
          if (this.index === 1600) this.send()
        }
      }
    }
    return true
  }
}
registerProcessor('oral-pcm', OralPcmProcessor)
