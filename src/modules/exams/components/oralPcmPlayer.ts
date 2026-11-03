/** PCM chunks are scheduled on one clock, so network boundaries do not restart the speaker. */
export class OralPcmPlayer {
  private context = new AudioContext({ latencyHint: 'interactive' })
  private sources = new Set<AudioBufferSourceNode>()
  private next = 0
  private ended = false
  private stopped = false
  private resolve?: () => void
  private reject?: (cause: Error) => void
  async unlock() {
    let timer: ReturnType<typeof setTimeout> | undefined
    try { await Promise.race([this.context.resume(), new Promise<void>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Bấm nghe câu hỏi để cho phép phát âm thanh.')), 2000) })]) }
    finally { clearTimeout(timer) }
    if (this.context.state !== 'running') throw new Error('Bấm nghe câu hỏi để cho phép trình duyệt phát âm thanh.')
  }
  push(pcm: Uint8Array) {
    if (this.stopped || this.ended || !pcm.length || pcm.length % 2) throw new Error('Audio không hợp lệ.')
    const audio = this.context.createBuffer(1, pcm.length / 2, 24000), samples = audio.getChannelData(0), view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength)
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768
    const source = this.context.createBufferSource(); source.buffer = audio; source.connect(this.context.destination)
    source.onended = () => { source.disconnect(); this.sources.delete(source); if (this.ended && !this.sources.size && !this.stopped) this.resolve?.() }
    this.sources.add(source); const start = Math.max(this.context.currentTime + 0.05, this.next)
    source.start(start); this.next = start + audio.duration
  }
  complete(): Promise<void> {
    this.ended = true
    return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; if (!this.sources.size && !this.stopped) resolve() })
  }
  stop() {
    if (this.stopped) return
    this.stopped = true; this.reject?.(new DOMException('Đã dừng phát.', 'AbortError'))
    for (const source of this.sources) { source.onended = null; try { source.stop(); source.disconnect() } catch { /* already ended */ } }
    this.sources.clear(); void this.context.close().catch(() => {})
  }
}
