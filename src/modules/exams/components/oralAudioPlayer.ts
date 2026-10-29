/** Trình phát WAV có hủy yêu cầu/thu hồi Blob URL; không dùng speechSynthesis hoặc lộ nội dung đề. */
export class OralAudioPlayer {
  private serial = 0
  private controller: AbortController | null = null
  private audio: HTMLAudioElement | null = null
  private url: string | null = null
  /** Dừng audio ngay, callback kết thúc cũ sẽ không được phép chuyển câu. */
  stop() {
    this.serial++; this.controller?.abort(); this.controller = null
    if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load() }
    this.audio = null
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = null
  }
  /** Browser có thể chặn autoplay; giữ audio để Student chủ động bấm phát, không báo đã nghe xong. */
  async play() { if (!this.audio) throw new Error('Chưa có audio.'); await this.audio.play() }
  /** Mỗi lần tải có generation riêng, response đến muộn không được phát cho turn mới. */
  async load(fetch: (signal: AbortSignal) => Promise<Blob>, valid: () => boolean, ended: () => void, failed: () => void) {
    this.stop(); const serial = this.serial
    const controller = new AbortController(); this.controller = controller
    const blob = await fetch(controller.signal)
    if (controller.signal.aborted || serial !== this.serial || !valid()) return false
    this.url = URL.createObjectURL(blob); const audio = new Audio(this.url); this.audio = audio
    let acknowledged = false, broken = false
    audio.onended = () => { if (!broken && !acknowledged && serial === this.serial && valid()) { acknowledged = true; ended() } }
    audio.onerror = () => { broken = true; if (serial === this.serial && valid()) failed() }
    return true
  }
}
