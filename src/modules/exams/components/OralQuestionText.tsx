import { useEffect, useId, useRef, useState } from 'react'
import { oralApi } from '../oralApi'
import { oralError } from './oralExamHelpers'

/** Chỉ mount trong ANSWERING, key theo turn; text chỉ giữ trong bộ nhớ của lượt đang trả lời. */
export default function OralQuestionText({ examId, turnId, questionOrder, followUpIndex, language, blocked }: {
  examId: number; turnId: string; questionOrder: number; followUpIndex: number; language: 'vi' | 'en' | null; blocked: boolean
}) {
  const panelId = useId()
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => { pending.current?.abort() }, [])

  const toggle = async () => {
    if (blocked || pending.current) return
    if (text) { setVisible(value => !value); return }
    const controller = new AbortController(); pending.current = controller
    setLoading(true); setError('')
    try {
      const result = await oralApi.questionText(examId, turnId, controller.signal)
      if (controller.signal.aborted) return
      if (result.questionOrder !== questionOrder || result.followUpIndex !== followUpIndex || result.language !== language) throw new Error('Tiến trình đã thay đổi. Hãy cập nhật trạng thái trước khi xem câu hỏi.')
      setText(result.text); setVisible(true)
    } catch (cause) {
      if (!controller.signal.aborted) setError(oralError(cause))
    } finally {
      if (pending.current === controller) pending.current = null
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return <div className="mb-5 border-t border-slate-100 pt-5">
    <button type="button" disabled={blocked || loading} aria-expanded={visible} aria-controls={panelId} onClick={() => void toggle()}
      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
      {loading ? 'Đang tải câu hỏi…' : visible ? 'Ẩn câu hỏi dạng text' : 'Hiển thị câu hỏi dạng text'}
    </button>
    <p className="mt-2 text-xs leading-5 text-slate-500">Xem lại câu hỏi vừa nghe. Thời gian trả lời vẫn tiếp tục.</p>
    {error && <p role="status" className="mt-3 text-sm leading-6 text-red-700">{error}</p>}
    <div id={panelId} hidden={!visible} className="mt-4 border-l-2 border-blue-200 bg-slate-50 px-4 py-3">
      {visible && <><p className="text-xs font-semibold text-slate-600">Câu chính {questionOrder}{followUpIndex ? ` · Follow-up ${followUpIndex}` : ''}</p>
        <p lang={language || undefined} className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{text}</p></>}
    </div>
  </div>
}
