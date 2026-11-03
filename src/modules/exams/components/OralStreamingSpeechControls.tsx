import { useEffect, useRef, useState } from 'react'
import { OralPcmPlayer } from './oralPcmPlayer'
import { oralError } from './oralExamHelpers'

export type SpeechStream = (turn: string, signal: AbortSignal, chunk: (pcm: Uint8Array) => void) => Promise<void>
export default function OralStreamingSpeechControls({ turnId, enabled, blocked, valid, stream, ended }: {
  turnId: string | null; enabled: boolean; blocked: boolean; valid: (turn: string) => boolean; stream: SpeechStream; ended: (turn: string) => void
}) {
  const [status, setStatus] = useState('idle'), [error, setError] = useState('')
  const armed = useRef(false), generation = useRef(0), alive = useRef(false), player = useRef<OralPcmPlayer | null>(null), request = useRef<AbortController | null>(null)
  const callbacks = useRef({ valid, stream, ended }); callbacks.current = { valid, stream, ended }
  const load = async () => {
    if (!turnId || !enabled || !callbacks.current.valid(turnId)) return
    armed.current = true; const serial = ++generation.current
    request.current?.abort(); player.current?.stop()
    const controller = new AbortController(); request.current = controller; let audio: OralPcmPlayer | undefined
    setStatus('loading'); setError('')
    const current = () => alive.current && serial === generation.current && callbacks.current.valid(turnId)
    const timeout = setTimeout(() => controller.abort(), 45000)
    try {
      audio = new OralPcmPlayer(); player.current = audio
      await audio.unlock() // Unlock before issuing a cloud request; blocked autoplay must not waste TTS quota.
      if (!current()) return
      await callbacks.current.stream(turnId, controller.signal, pcm => {
        if (!current() || controller.signal.aborted) throw new DOMException('Lượt đã thay đổi.', 'AbortError')
        audio!.push(pcm); setStatus('playing')
      })
      clearTimeout(timeout)
      await audio.complete()
      if (current() && !controller.signal.aborted) { setStatus('idle'); callbacks.current.ended(turnId) }
    } catch (cause: any) {
      if (alive.current && serial === generation.current) { setStatus('error'); setError(cause?.name === 'AbortError' ? 'Giọng đọc bị ngắt hoặc quá thời gian chờ. Hãy nghe lại đúng lượt hiện tại.' : oralError(cause)) }
    } finally { clearTimeout(timeout); audio?.stop() }
  }
  useEffect(() => {
    alive.current = true; const serial = ++generation.current
    queueMicrotask(() => { if (alive.current && serial === generation.current) { setStatus('idle'); setError(''); if (enabled && armed.current) void load() } })
    const timer = setInterval(() => {
      if (enabled && turnId && !callbacks.current.valid(turnId)) { request.current?.abort(); player.current?.stop() }
    }, 250)
    // These refs are lifecycle handles, not DOM nodes; cleanup must stop the latest playback/request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { alive.current = false; generation.current++; clearInterval(timer); request.current?.abort(); player.current?.stop() }
    // Keep the audio lifecycle bound to turn/permission, never to polling revisions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId, enabled])
  if (!enabled) return null
  return <div className="mb-5 text-center">
    <button type="button" disabled={blocked || status === 'loading' || status === 'playing'} onClick={() => void load()}
      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
      {status === 'loading' ? 'Đang chuẩn bị giọng đọc…' : status === 'playing' ? 'AI đang đọc câu hỏi…' : 'Nghe câu hỏi'}
    </button>
    {error && <p role="status" className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-700">{error}</p>}
    <p className="mt-3 text-xs leading-5 text-slate-500">Micro chưa bật. Thời gian trả lời chỉ bắt đầu sau khi audio phát xong.</p>
  </div>
}
