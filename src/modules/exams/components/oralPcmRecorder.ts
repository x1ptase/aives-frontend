import type { OralStreamingConnection } from './oralStreamingTransport'

/** Local WAV giữ lại để dùng đường nộp cũ khi WS mất; không dựng transcript từ client. */
export class OralPcmRecorder {
  private context?: AudioContext
  private stream?: MediaStream
  private node?: AudioWorkletNode
  private source?: MediaStreamAudioSourceNode
  private mute?: GainNode
  private frames: ArrayBuffer[] = []
  private bytes = 0
  private speechFrames = 0
  private stopped = false
  private detached = false
  private timer?: ReturnType<typeof setInterval>
  private flushed?: () => void
  constructor(readonly connection: OralStreamingConnection) {}
  async start(valid: () => boolean, finish: () => void, transportError: () => void): Promise<void> {
    this.context = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' })
    await this.context.resume()
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false })
    if (this.stopped || !valid()) { this.cancel(); throw new DOMException('Lượt đã thay đổi.', 'AbortError') }
    await this.connection.opened()
    await this.context.audioWorklet.addModule(`${import.meta.env.BASE_URL}oral-pcm-worklet.js`)
    if (this.stopped || !valid()) { this.cancel(); throw new DOMException('Lượt đã thay đổi.', 'AbortError') }
    this.source = this.context.createMediaStreamSource(this.stream)
    this.node = new AudioWorkletNode(this.context, 'oral-pcm', { channelCount: 1, channelCountMode: 'explicit' })
    this.mute = this.context.createGain(); this.mute.gain.value = 0
    this.node.port.onmessage = event => {
      if (event.data?.type === 'flushed') { this.flushed?.(); return }
      const data = event.data?.data
      if (event.data?.type !== 'pcm' || !(data instanceof ArrayBuffer) || this.bytes + data.byteLength > 8 * 1024 * 1024 - 44) return
      this.frames.push(data); this.bytes += data.byteLength
      const view = new DataView(data); let sum = 0
      for (let i = 0; i < data.byteLength; i += 2) sum += (view.getInt16(i, true) / 32768) ** 2
      if (Math.sqrt(sum / (data.byteLength / 2)) > 0.006) this.speechFrames++
      try { this.connection.write(data) } catch { transportError() } // local WAV remains available.
    }
    this.source.connect(this.node); this.node.connect(this.mute); this.mute.connect(this.context.destination)
    const started = performance.now()
    this.timer = setInterval(() => { if (!valid()) this.cancel(); else if (performance.now() - started >= 250000) finish() }, 250)
  }
  async finish(): Promise<Blob> {
    if (!this.node || this.stopped) throw new Error('Micro chưa sẵn sàng.')
    clearInterval(this.timer)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chưa chốt được audio cuối.')), 1500)
      this.flushed = () => { clearTimeout(timer); resolve() }; this.node!.port.postMessage({ type: 'flush' })
    })
    this.release()
    if (this.bytes < 16000 || this.speechFrames < 2) { this.connection.close(); throw new Error('Chưa nhận được giọng nói; hãy ghi lại hoặc nói “Em không biết”.') }
    this.detached = true
    const header = new ArrayBuffer(44), view = new DataView(header)
    const ascii = (at: number, text: string) => [...text].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)))
    ascii(0, 'RIFF'); view.setUint32(4, 36 + this.bytes, true); ascii(8, 'WAVE'); ascii(12, 'fmt ')
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
    view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
    ascii(36, 'data'); view.setUint32(40, this.bytes, true)
    return new Blob([header, ...this.frames], { type: 'audio/wav' })
  }
  private release() { this.stopped = true; clearInterval(this.timer); this.source?.disconnect(); this.node?.disconnect(); this.mute?.disconnect(); this.stream?.getTracks().forEach(t => t.stop()); void this.context?.close().catch(() => {}) }
  cancel() { this.release(); if (!this.detached) this.connection.close() }
}
