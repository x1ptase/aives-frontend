import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { OralAudioRecorder, oralMicrophoneError } from '../components/oralAudioRecorder'
import { newOralId } from '../components/oralExamSession'

/** Ghi từng lượt, chỉ tự bật lại sau khi Student đã chủ động cho phép lần đầu. */
export function useOralRecording(key: string, allowed: boolean, valid: () => boolean, recorded: (blob: Blob) => Promise<void>, auto = false, maxMs = 300000) {
  const [status, setStatus] = useState<'idle' | 'permission' | 'recording' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')
  const recorder = useRef<OralAudioRecorder | null>(null), alive = useRef(false), serial = useRef('initial'), armed = useRef(false)
  const callbacks = useRef({ valid, recorded }); useLayoutEffect(() => { callbacks.current = { valid, recorded } }, [valid, recorded])
  /** Chỉ hoàn tất bản ghi; callback mới có trách nhiệm lưu draft, reserve và upload. */
  const finish = useCallback(async () => {
    const current = recorder.current, generation = serial.current, bound = callbacks.current
    if (!current || !bound.valid()) return
    setStatus('sending'); setError('')
    try {
      const result = await current.finish()
      if (!alive.current || generation !== serial.current || !bound.valid()) return
      if (result.hasSpeech === false || result.blob.size < 128 || result.durationMs < 500) {
        setStatus('idle'); setError('Chưa nhận được giọng nói trong bản ghi. Hãy ghi lại hoặc nói “Em không biết”; không tạo transcript thay thế.'); return
      }
      await bound.recorded(result.blob)
      if (alive.current && generation === serial.current) setStatus('idle')
    } catch (cause: any) {
      if (alive.current && generation === serial.current && cause?.name !== 'AbortError') { setStatus('error'); setError('Chưa gửi được bản ghi. Hãy kiểm tra tiến trình và dùng nút gửi lại nếu bản ghi đã được giữ.') }
    }
  }, [])
  /** Xin quyền bằng thao tác chủ động, không coi lỗi thiết bị là Student không trả lời. */
  const start = useCallback(async () => {
    if (!alive.current || !callbacks.current.valid()) return
    armed.current = true; const generation = newOralId(); serial.current = generation; const bound = callbacks.current
    setStatus('permission'); setError('')
    try {
      const active = recorder.current ??= new OralAudioRecorder()
      const ok = await active.start(bound.valid, () => void finish(), message => { if (alive.current && generation === serial.current) { setStatus('error'); setError(message) } }, maxMs)
      if (ok && alive.current && generation === serial.current) setStatus('recording')
    } catch (cause) { if (alive.current && generation === serial.current) { setStatus('error'); setError(oralMicrophoneError(cause)) } }
  }, [finish, maxMs])
  useEffect(() => {
    alive.current = true; const active = new OralAudioRecorder(); recorder.current = active
    const generation = serial.current
    queueMicrotask(() => { if (alive.current && serial.current === generation) { setStatus('idle'); setError(''); if (allowed && auto && armed.current) void start() } })
    return () => { alive.current = false; serial.current = newOralId(); active.cancel(); recorder.current = null }
  }, [key, allowed, auto, start])
  return { status, error, start, finish, cancel: () => { serial.current = newOralId(); recorder.current?.cancel(); setStatus('idle') } }
}
