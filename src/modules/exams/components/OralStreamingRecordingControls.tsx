import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OralPcmRecorder } from './oralPcmRecorder'
import type { OralStreamingConnection } from './oralStreamingTransport'
import { oralError } from './oralExamHelpers'
import { oralLatency } from './oralLatency'

export interface StreamingRecording {
  open: (turn: string, update: (kind: 'PARTIAL' | 'FINAL', index: number, text: string) => void) => OralStreamingConnection
  submit: (turn: string, blob: Blob, connection: OralStreamingConnection) => Promise<void>
}
export default function OralStreamingRecordingControls({ turnId, enabled, blocked, valid, streaming }: {
  turnId: string | null; enabled: boolean; blocked: boolean; valid: (turn: string) => boolean; streaming: StreamingRecording
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState('idle'), [error, setError] = useState(''), [partial, setPartial] = useState('')
  const finals = useRef(new Map<number, string>()), armed = useRef(false), alive = useRef(false), recorder = useRef<OralPcmRecorder | null>(null)
  const bound = useRef({ valid, streaming }); bound.current = { valid, streaming }
  const finishing = useRef(false), generation = useRef(0)
  const finish = async () => {
    if (finishing.current || !recorder.current || !turnId || !bound.current.valid(turnId)) return
    finishing.current = true; const active = recorder.current, serial = generation.current
    oralLatency.begin(turnId)
    setStatus('sending')
    try {
      const blob = await active.finish()
      oralLatency.mark(turnId, 'audioFlushed')
      if (!alive.current || serial !== generation.current || !bound.current.valid(turnId)) { oralLatency.cancel(turnId); active.connection.close(); return }
      await bound.current.streaming.submit(turnId, blob, active.connection)
    } catch (cause) { oralLatency.cancel(turnId); active.connection.close(); active.cancel(); if (alive.current && serial === generation.current) setError(cause instanceof Error ? cause.message : t('exams.oral.stream.sendFailed')) }
    finally { if (alive.current && serial === generation.current) setStatus('idle'); finishing.current = false }
  }
  const start = async () => {
    if (!turnId || !enabled || !bound.current.valid(turnId) || recorder.current && status === 'recording') return
    armed.current = true; const serial = ++generation.current; finals.current.clear(); setPartial(''); setError(''); setStatus('permission')
    try {
      const connection = bound.current.streaming.open(turnId, (kind, index, text) => {
        if (!alive.current || serial !== generation.current) return
        if (kind === 'FINAL') finals.current.set(index, text)
        setPartial([...finals.current.values(), ...(kind === 'PARTIAL' ? [text] : [])].join(' '))
      })
      const active = new OralPcmRecorder(connection); recorder.current = active
      await active.start(() => alive.current && serial === generation.current && bound.current.valid(turnId), () => void finish(),
        () => { if (alive.current && serial === generation.current) setError(t('exams.oral.stream.channelClosed')) })
      if (alive.current && serial === generation.current) setStatus('recording')
    } catch (cause) { if (serial === generation.current) recorder.current?.cancel(); if (alive.current && serial === generation.current) { setStatus('idle'); setError(oralError(cause)) } }
  }
  useEffect(() => {
    alive.current = true; const serial = ++generation.current
    queueMicrotask(() => { if (alive.current && serial === generation.current) { setStatus('idle'); setPartial(''); setError(''); if (enabled && armed.current) void start() } })
    // These refs are lifecycle handles, not DOM nodes; cleanup must cancel the latest active recording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { alive.current = false; generation.current++; recorder.current?.cancel(); recorder.current = null }
    // Start/finish read current callbacks from refs; lifecycle is bound only to the active turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId, enabled])
  if (!enabled) return null
  return <div className="mb-5 text-center">
    <p role="status" className="mb-3 text-sm font-medium text-slate-700">{status === 'recording' ? t('exams.oral.stream.recording') : status === 'permission' ? t('exams.oral.stream.permission') : status === 'sending' ? t('exams.oral.stream.sending') : t('exams.oral.stream.idle')}</p>
    <button type="button" disabled={blocked || ['permission', 'sending'].includes(status)} onClick={() => void (status === 'recording' ? finish() : start())}
      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{status === 'recording' ? t('exams.oral.stream.done') : t('exams.oral.stream.start')}</button>
    {partial && <div className="mt-4 rounded-lg bg-slate-50 p-4 text-left text-sm leading-6 text-slate-700"><p className="mb-1 text-xs text-slate-500">{t('exams.oral.stream.partial')}</p><p className="whitespace-pre-wrap break-words">{partial}</p></div>}
    {error && <p role="status" className="mx-auto mt-3 max-w-lg text-sm leading-6 text-amber-800">{error}</p>}
    <p className="mt-3 text-xs leading-5 text-slate-500">{t('exams.oral.stream.limit')}</p>
  </div>
}
