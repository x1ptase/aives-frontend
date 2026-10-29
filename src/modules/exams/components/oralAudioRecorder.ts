/** Bản ghi thô của browser, không tự tạo transcript hoặc điểm. */
export interface OralRecording { blob: Blob; hasSpeech: boolean | null; durationMs: number }

/** MediaRecorder có hủy permission về muộn, giới hạn bộ nhớ và tắt toàn bộ audio tracks khi dừng. */
export class OralAudioRecorder {
  private serial = 0
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private context: AudioContext | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private chunks: Blob[] = []
  private bytes = 0
  private voiced = 0
  private measured = false
  private started = 0
  private reject: ((error: Error) => void) | null = null
  /** Hủy không gửi blob dở; luôn stop tracks kể cả lúc chưa ghi được bytes. */
  cancel() {
    this.serial++
    if (this.recorder) { this.recorder.ondataavailable = null; this.recorder.onstop = null; this.recorder.onerror = null; if (this.recorder.state !== 'inactive') this.recorder.stop() }
    this.recorder = null; this.release(); this.chunks = []; this.bytes = 0
    this.reject?.(new DOMException('Đã hủy bản ghi.', 'AbortError')); this.reject = null
  }
  /** Chỉ gọi sau thao tác bật mic rõ ràng; không mở micro khi mount/refresh. */
  async start(valid: () => boolean, limit: () => void, failed: (message: string) => void, maxMs = 300000) {
    this.cancel(); const serial = this.serial
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Trình duyệt chưa hỗ trợ ghi âm. Hãy dùng Chrome/Edge và HTTPS hoặc localhost.')
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type))
    if (!mimeType) throw new Error('Trình duyệt không có định dạng ghi âm được hỗ trợ.')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
    if (serial !== this.serial || !valid()) { stream.getTracks().forEach(track => track.stop()); return false }
    this.stream = stream; this.voiced = 0; this.measured = false; this.started = performance.now()
    let ownContext: AudioContext | null = null
    try {
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 }); this.recorder = recorder
      let analyser: AnalyserNode | null = null, samples: Float32Array<ArrayBuffer> | null = null
      try {
        ownContext = new AudioContext(); this.context = ownContext; void ownContext.resume().catch(() => {})
        analyser = ownContext.createAnalyser(); analyser.fftSize = 1024; ownContext.createMediaStreamSource(stream).connect(analyser)
        samples = new Float32Array(analyser.fftSize)
      } catch { /* Không có bộ đo âm lượng thì Groq vẫn phải kiểm tra no_speech_prob. */ }
      if (serial !== this.serial) { stream.getTracks().forEach(track => track.stop()); void ownContext?.close().catch(() => {}); return false }
      if (!valid()) { this.cancel(); return false }
      recorder.ondataavailable = event => {
        if (serial !== this.serial) return
        this.bytes += event.data.size
        if (this.bytes > 8 * 1024 * 1024) { this.cancel(); failed('Bản ghi vượt quá 8 MiB. Hãy ghi lại câu trả lời ngắn hơn.'); return }
        if (event.data.size) this.chunks.push(event.data)
      }
      recorder.onerror = () => { if (serial === this.serial) { this.cancel(); failed('Micro gặp lỗi kỹ thuật. Hãy kiểm tra thiết bị rồi ghi lại.') } }
      this.timer = setInterval(() => {
        if (serial !== this.serial) return
        if (!valid()) { this.cancel(); failed('Đã hết thời gian hoặc lượt trả lời đã thay đổi. Bản ghi chưa gửi đã được dừng.'); return }
        if (analyser && samples && this.context?.state === 'running') {
          analyser.getFloatTimeDomainData(samples); this.measured = true
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)
          if (rms > 0.012) this.voiced++
        }
        if (performance.now() - this.started >= maxMs) { if (this.timer) clearInterval(this.timer); this.timer = null; limit() }
      }, 100)
      recorder.start(250); return true
    } catch (failure) { if (serial === this.serial) this.cancel(); else { stream.getTracks().forEach(track => track.stop()); void ownContext?.close().catch(() => {}) } throw failure }
  }
  /** Thu Blob sau dataavailable cuối cùng, rồi đóng micro; không tự gọi SUBMIT. */
  finish(): Promise<OralRecording> {
    const recorder = this.recorder, serial = this.serial
    if (!recorder || recorder.state !== 'recording') return Promise.reject(new Error('Chưa có bản ghi đang thực hiện.'))
    return new Promise((resolve, reject) => {
      this.reject = reject
      recorder.onstop = () => {
        if (serial !== this.serial) return
        const result = { blob: new Blob(this.chunks, { type: recorder.mimeType }), hasSpeech: this.measured ? this.voiced >= 3 : null, durationMs: performance.now() - this.started }
        this.reject = null; this.recorder = null; this.release(); this.chunks = []; this.bytes = 0; resolve(result)
      }
      recorder.stop()
    })
  }
  /** Không phát micro ra loa; đóng AudioContext và track sau mọi nhánh. */
  private release() {
    if (this.timer) clearInterval(this.timer); this.timer = null
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null
    void this.context?.close().catch(() => {}); this.context = null
  }
}

/** Không hiển thị thông báo lỗi tiếng Anh từ browser hoặc tên thiết bị người dùng. */
export function oralMicrophoneError(cause: unknown): string {
  const name = cause && typeof cause === 'object' && 'name' in cause ? cause.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Bạn chưa cho phép dùng micro. Hãy cấp quyền micro cho trang rồi thử lại.'
  if (name === 'NotFoundError') return 'Không tìm thấy micro. Hãy kết nối thiết bị ghi âm rồi thử lại.'
  if (name === 'NotReadableError') return 'Không mở được micro. Thiết bị có thể đang được ứng dụng khác sử dụng.'
  return 'Chưa ghi âm được. Hãy kiểm tra micro và dùng Chrome/Edge trên HTTPS hoặc localhost.'
}
