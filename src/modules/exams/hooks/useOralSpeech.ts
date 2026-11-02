import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { OralAudioPlayer } from '../components/oralAudioPlayer'
import { oralError } from '../components/oralExamHelpers'
import { newOralId } from '../components/oralExamSession'

/** Vòng đời audio theo turn/lease, không theo revision heartbeat hoặc mỗi lần poll. */
export function useOralSpeech(key: string, enabled: boolean, valid: () => boolean, fetch: (signal: AbortSignal) => Promise<Blob>, ended: () => void) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'playing' | 'error'>('idle')
  const [error, setError] = useState('')
  const player = useRef<OralAudioPlayer | null>(null)
  const alive = useRef(false); const serial = useRef('initial'); const armed = useRef(false)
  const callbacks = useRef({ valid, fetch, ended })
  useLayoutEffect(() => { callbacks.current = { valid, fetch, ended } }, [valid, fetch, ended])
  /** Phát bằng thao tác chủ động nếu autoplay bị browser từ chối; không gọi lại TTS. */
  const play = useCallback(async () => {
    const generation = serial.current
    try { await player.current?.play(); if (alive.current && generation === serial.current) { setStatus('playing'); setError('') } }
    catch { if (alive.current && generation === serial.current) { setStatus('ready'); setError('Trình duyệt chưa cho phát tự động. Bấm “Phát giọng đọc” và kiểm tra âm lượng của tab.') } }
  }, [])
  /** Request chỉ tải WAV, không chứa prompt/đáp án hoặc khóa dịch vụ ở frontend. */
  const load = useCallback(async () => {
    if (!alive.current || !callbacks.current.valid()) return
    armed.current = true; const generation = newOralId(); serial.current = generation
    const audio = player.current ??= new OralAudioPlayer()
    const bound = callbacks.current
    setStatus('loading'); setError('')
    try {
      const ready = await audio.load(bound.fetch, () => alive.current && generation === serial.current && bound.valid(),
        () => { setStatus('idle'); bound.ended() }, () => { setStatus('error'); setError('Không phát được âm thanh. Hãy tải lại giọng đọc; hệ thống chưa xác nhận bạn đã nghe xong.') })
      if (ready && alive.current && generation === serial.current) { setStatus('ready'); await play() }
    } catch (cause: any) {
      if (alive.current && generation === serial.current && cause?.code !== 'ERR_CANCELED' && cause?.name !== 'AbortError') {
        setStatus('error'); setError(oralError(cause))
      }
    }
  }, [play])
  useEffect(() => {
    alive.current = true
    const activePlayer = new OralAudioPlayer(); player.current = activePlayer
    const generation = serial.current
    queueMicrotask(() => { if (alive.current && generation === serial.current) { setStatus('idle'); setError(''); if (enabled && armed.current) void load() } })
    // Slot vẫn hết khi TTS chậm/đang phát; không chờ audio ended mới dừng.
    let stopped = false
    const timer = window.setInterval(() => {
      if (!enabled) return
      const invalid = !callbacks.current.valid()
      if (invalid && !stopped) { serial.current = newOralId(); activePlayer.stop(); setStatus('error'); setError('Lượt nghe hoặc quyền tương tác đã thay đổi. Hãy cập nhật tiến trình trước khi nghe tiếp.') }
      stopped = invalid
    }, 250)
    return () => { alive.current = false; serial.current = newOralId(); activePlayer.stop(); player.current = null; window.clearInterval(timer) }
  }, [key, enabled, load])
  return { status, error, load, play, stop: () => { serial.current = newOralId(); player.current?.stop(); setStatus('idle') } }
}
