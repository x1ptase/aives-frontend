import { useEffect, useRef, useState } from 'react'
import { oralApi } from '../oralApi'
import { oralError } from './oralExamHelpers'
import { useOralRecording } from '../hooks/useOralRecording'

/** Kiểm tra mic → Groq → transcript thật trước khi bắt đầu thi, không ghi kết quả vào database. */
export default function OralTranscriptionPreview() {
  const [language, setLanguage] = useState<'vi' | 'en'>('vi'), [transcript, setTranscript] = useState(''), [issue, setIssue] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [language])
  const recording = useOralRecording(`preview-${language}`, true, () => true, async blob => {
    const request = new AbortController(); controller.current = request; setIssue(''); setTranscript('')
    try { const text = await oralApi.previewTranscription(language, blob, request.signal); if (!request.signal.aborted) { setTranscript(text); if (!text) setIssue('Không phát hiện lời nói rõ ràng. Hãy thử lại gần micro hơn.') } }
    catch (cause) { if (!request.signal.aborted) setIssue(oralError(cause)) }
  }, false, 15000)
  const busy = ['permission', 'sending'].includes(recording.status)
  return <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-semibold text-slate-900">Kiểm tra micro và nhận dạng</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Ghi thử tối đa 15 giây. Câu trả lời được gửi tới Groq, không ghi vào bài thi.</p>
    <div className="mt-4 flex flex-wrap items-center gap-3"><label className="text-sm text-slate-700">Ngôn ngữ
      <select disabled={recording.status === 'recording' || busy} value={language} onChange={e => { setTranscript(''); setIssue(''); setLanguage(e.target.value as 'vi' | 'en') }} className="ml-3 rounded-lg border border-slate-300 px-3 py-2"><option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option></select>
    </label><button type="button" disabled={busy} onClick={() => void (recording.status === 'recording' ? recording.finish() : recording.start())} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{recording.status === 'recording' ? 'Ghi xong · Nhận dạng thử' : recording.status === 'permission' ? 'Đang mở micro…' : recording.status === 'sending' ? 'Đang nhận dạng…' : 'Bật micro và ghi thử'}</button>
      <button type="button" onClick={() => { controller.current?.abort(); recording.cancel() }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Dừng / Hủy</button></div>
    {(recording.error || issue) && <p role="status" className="mt-3 text-sm text-red-700">{recording.error || issue}</p>}
    {transcript && <div className="mt-4 rounded-lg bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">TRANSCRIPT THỬ · CHỈ ĐỌC</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{transcript}</p></div>}
  </section>
}
