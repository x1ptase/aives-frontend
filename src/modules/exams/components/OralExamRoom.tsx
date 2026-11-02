import { useEffect, useState } from 'react'
import type { OralAction, OralDemoScenario, OralState } from '../oralApi'
import { oralCountdown, oralTerminal, oralProcessingError } from './oralExamHelpers'
import { previewTime } from './oralPreviewMachine'
import OralSpeechControls from './OralSpeechControls'
import OralRecordingControls from './OralRecordingControls'

/** Nhãn giao diện chỉ mô tả kết quả thực hiện, không suy ra điểm. */
const questionLabels = { PENDING: 'Chưa đến lượt', ACTIVE: 'Đang thực hiện', DEFERRED: 'Tạm bỏ qua', ANSWERED: 'Đã trả lời', NO_ANSWER: 'Không có câu trả lời', TECHNICAL_ERROR: 'Lỗi kỹ thuật' }
const phaseLabels = { PREPARING: 'Đang chuẩn bị lượt hỏi', SPEAKING: 'Đến lượt nghe câu hỏi', ANSWERING: 'Đến lượt bạn trả lời', TRANSCRIBING: 'Đang xử lý câu trả lời', DECIDING: 'Đang quyết định bước tiếp theo', REVIEW: 'Quay lại các câu tạm bỏ qua', PAUSED: 'Đã tạm dừng tương tác', TECHNICAL_ERROR: 'Lượt xử lý gặp lỗi kỹ thuật', COMPLETED: 'Đã hoàn thành lượt thi', EXPIRED: 'Đã hết khung giờ thi' }
const oralSecondaryButton = 'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40'
const oralPrimaryButton = 'rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40'

/** Phòng nối backend thật; không chứa reducer, nội dung câu hỏi hoặc câu trả lời tự sinh ở FE. */
export default function OralExamRoom({ state, receivedAt, demo, blocked, onCommand, onFinish, speech, recording }: {
  state: OralState
  receivedAt: number
  demo: boolean
  blocked: boolean
  onCommand: (action: OralAction, target?: number, scenario?: OralDemoScenario) => void
  onFinish: () => void
  speech?: { ready: boolean; controlled: boolean; valid: (turn: string) => boolean; fetch: (turn: string, signal: AbortSignal) => Promise<Blob>; ended: (turn: string) => void }
  recording?: { ready: boolean; controlled: boolean; hasDraft: boolean; valid: (turn: string) => boolean; recorded: (turn: string, blob: Blob) => Promise<void> }
}) {
  const [clock, setClock] = useState(() => performance.now())
  const [scenario, setScenario] = useState<OralDemoScenario>('BRIEF')
  useEffect(() => { const timer = window.setInterval(() => setClock(performance.now()), 250); return () => window.clearInterval(timer) }, [])
  const terminal = oralTerminal(state)
  const time = oralCountdown(state, terminal ? 0 : clock - receivedAt)
  const disabled = blocked || !terminal && time.slot === 0
  const resolved = state.questions.filter(q => ['ANSWERED', 'NO_ANSWER', 'TECHNICAL_ERROR'].includes(q.status)).length
  const ownMainAnswer = state.transcripts.some(t => t.questionOrder === state.currentQuestionOrder && t.followUpIndex === 0)
  return <>
    <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:px-6">
      <div><h2 className="font-semibold text-slate-900">Lượt thi #{state.studentExamId}</h2><p className="mt-1 text-xs text-slate-500">{state.mainCount} câu chính · Tối đa {state.maxFollowUps} follow-up toàn bài</p></div>
      <div className="text-right"><p className="text-xs text-slate-500">{terminal ? 'Thời gian còn khi chốt kết quả' : 'Thời gian lượt thi còn lại'}</p><p role="timer" aria-label="Thời gian lượt thi còn lại" className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${time.slot < 60000 ? 'text-red-700' : 'text-slate-900'}`}>{previewTime(time.slot)}</p></div>
    </section>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8" aria-labelledby="live-oral-phase">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
            <span>{state.currentQuestionOrder ? `CÂU CHÍNH ${state.currentQuestionOrder} / ${state.mainCount}` : terminal ? 'KẾT QUẢ THỰC HIỆN' : 'SAU LƯỢT ĐẦU'}</span>
            {state.language && <span className="rounded bg-slate-100 px-2 py-1">{state.language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}{state.followUpIndex ? ` · Follow-up ${state.followUpIndex}` : ''}</span>}
          </div>
          <div className="py-9 text-center">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${state.phase === 'ANSWERING' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              <svg aria-hidden="true" width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                {state.phase === 'ANSWERING' ? <><rect x="12" y="3" width="8" height="17" rx="4" /><path d="M8 15v2a8 8 0 0016 0v-2M16 25v4M11 29h10" /></> : terminal ? <path d="M7 16l6 6L26 9" /> : <><path d="M5 12h6l7-6v20l-7-6H5zM23 11a8 8 0 010 10M27 7a14 14 0 010 18" /></>}
              </svg>
            </div>
            <h2 id="live-oral-phase" aria-live="polite" className="mt-5 text-xl font-semibold text-slate-900 sm:text-2xl">{phaseLabels[state.phase]}</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              {state.phase === 'SPEAKING' ? demo ? 'Giọng đọc đang được mô phỏng, chưa phát audio thật. Bấm xác nhận lượt nghe mẫu để kiểm tra bước tiếp theo.' : speech?.ready ? 'Lắng nghe câu hỏi. AI đọc số câu trước nội dung; nội dung đề không hiển thị trực tiếp trên màn hình.' : 'Chờ dịch vụ giọng đọc. Nội dung đề không hiển thị trực tiếp trên màn hình.'
                : state.phase === 'ANSWERING' ? demo ? 'Đang mô phỏng lượt Student trả lời. Không ghi âm; backend sẽ lưu transcript mẫu vào database Docker riêng.' : 'Lượt trả lời đang mở theo đồng hồ backend. Bấm “Trả lời xong” để nộp bản ghi trước khi hết thời gian.'
                : state.phase === 'PREPARING' ? 'Backend đang giữ đúng lượt hỏi hiện tại và chuẩn bị bước phát âm thanh.'
                : state.phase === 'TRANSCRIBING' ? 'Chờ kết quả nhận dạng của lượt đã gửi. Không gửi thêm câu trả lời hoặc tự chuyển câu.'
                : state.phase === 'DECIDING' ? 'Transcript đã lưu. AI đang xem xét hỏi thêm để làm rõ hoặc chuyển sang câu chính tiếp theo.'
                : state.phase === 'REVIEW' ? 'Chọn một câu tạm bỏ qua ở bảng tiến độ. Ngân sách còn lại của câu được giữ nguyên.'
                : state.phase === 'TECHNICAL_ERROR' ? 'Bạn có thể thử lại cùng lượt xử lý. Lỗi kỹ thuật không được coi là câu trả lời sai hoặc không biết.'
                : state.phase === 'PAUSED' ? 'Thời gian trả lời đã dùng được giữ lại; thời hạn toàn bài vẫn chạy. Tiếp tục sẽ nghe lại đúng lượt hiện tại.'
                : 'Trạng thái đã được backend chốt. Màn hình này không tạo điểm hoặc phản hồi chấm bài.'}
            </p>
          </div>
          {state.phase === 'TECHNICAL_ERROR' && state.processingErrorCode && <p role="status" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{oralProcessingError(state.processingErrorCode)}</p>}
          {!demo && speech?.ready && <OralSpeechControls turnId={state.currentTurnId} enabled={speech.controlled && ['PREPARING', 'SPEAKING'].includes(state.phase)} blocked={blocked} valid={speech.valid} fetch={speech.fetch} ended={speech.ended} />}
          {!demo && recording?.ready && <OralRecordingControls turnId={state.currentTurnId} enabled={recording.controlled && !recording.hasDraft && state.phase === 'ANSWERING'} blocked={blocked} valid={recording.valid} recorded={recording.recorded} />}
          {!terminal && time.slot === 0 && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Đang chờ backend xác nhận hết thời gian. Không tự đánh dấu hoàn thành.</p>}
          {!terminal && state.currentQuestionOrder != null && <div className="mb-5 border-t border-slate-100 pt-5">
            <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">Thời gian trả lời câu chính và follow-up còn lại</span><span className="shrink-0 font-mono font-semibold text-slate-800">{time.answer == null ? 'Theo hạn slot' : previewTime(time.answer)}</span></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Chỉ trừ khi đến lượt trả lời, kể cả im lặng. Refresh, nghe lại và quay lại câu bỏ qua không cấp lại thời gian.</p>
          </div>}
          <div className="flex flex-wrap justify-center gap-3">
            {state.phase === 'SPEAKING' && demo && <button type="button" disabled={disabled} onClick={() => onCommand('PROMPT_FINISHED')} className={oralPrimaryButton}>Đã nghe lượt mẫu</button>}
            {state.phase === 'ANSWERING' && demo && <>
              <button type="button" disabled={disabled} onClick={() => onCommand('SUBMIT', undefined, scenario)} className={oralPrimaryButton}>Trả lời xong</button>
              <button type="button" disabled={disabled} onClick={() => onCommand('REPLAY')} className={oralSecondaryButton}>Nghe lại lượt hiện tại</button>
              {!state.followUpIndex && !ownMainAnswer && <button type="button" disabled={disabled} onClick={() => onCommand('DEFER')} className={oralSecondaryButton}>Tạm bỏ qua</button>}
            </>}
            {state.phase === 'ANSWERING' && !demo && speech?.ready && <button type="button" disabled={disabled} onClick={() => onCommand('REPLAY')} className={oralSecondaryButton}>Nghe lại lượt hiện tại</button>}
            {['ANSWERING', 'SPEAKING'].includes(state.phase) && <button type="button" disabled={disabled} onClick={() => onCommand('PAUSE')} className={oralSecondaryButton}>Tạm dừng tương tác</button>}
            {state.phase === 'PAUSED' && <button type="button" disabled={disabled} onClick={() => onCommand('RESUME')} className={oralPrimaryButton}>Tiếp tục lượt hiện tại</button>}
            {state.phase === 'TECHNICAL_ERROR' && <button type="button" disabled={disabled} onClick={() => onCommand('RETRY')} className={oralPrimaryButton}>Thử lại lượt xử lý</button>}
            {state.phase === 'REVIEW' && <button type="button" disabled={disabled} onClick={onFinish} className={oralSecondaryButton}>Nộp với các câu chưa trả lời</button>}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="live-oral-transcripts">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="live-oral-transcripts" className="font-semibold text-slate-900">Transcript câu trả lời của bạn</h2><span className="text-xs text-slate-500">{demo ? 'Dữ liệu mẫu từ backend cục bộ · ' : ''}Chỉ đọc</span></div>
          {!state.transcripts.length ? <p className="py-7 text-sm leading-6 text-slate-500">Chưa có câu trả lời được backend lưu. Âm thanh rỗng hoặc lỗi kỹ thuật không tạo transcript thay thế.</p>
            : <ol className="mt-4 divide-y divide-slate-100">{state.transcripts.map(t => <li key={`${t.questionOrder}:${t.followUpIndex}`} className="py-4">
              <p className="mb-2 text-xs font-semibold text-blue-700">Câu chính {t.questionOrder}{t.followUpIndex ? ` · Follow-up ${t.followUpIndex}` : ''}</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{t.content}</p><p className="mt-2 text-xs text-slate-500">Đã lưu: {new Date(t.savedAt).toLocaleString('vi-VN')}</p>
            </li>)}</ol>}
        </section>
      </div>
      <aside className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="live-oral-progress">
          <h2 id="live-oral-progress" className="font-semibold text-slate-900">Tiến độ từ backend</h2><p className="mt-1 text-xs text-slate-500">{resolved}/{state.mainCount} câu đã xử lý</p>
          <ol className="mt-4 divide-y divide-slate-100">{state.questions.map(q => <li key={q.questionOrder} className="flex items-center justify-between gap-3 py-3">
            <div><p className="text-sm font-medium text-slate-800">Câu chính {q.questionOrder}</p><p className={`mt-1 text-xs ${q.status === 'DEFERRED' ? 'text-amber-800' : 'text-slate-500'}`}>{questionLabels[q.status]}</p></div>
            {state.phase === 'REVIEW' && q.status === 'DEFERRED' && <button type="button" disabled={disabled} aria-label={`Trả lời câu chính ${q.questionOrder}`} onClick={() => onCommand('REVISIT', q.questionOrder)} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40">Trả lời</button>}
          </li>)}</ol>
          <div className="mt-3 border-t border-slate-200 pt-4"><p className="text-sm font-medium text-slate-800">Follow-up: {state.followUpsUsed}/{state.maxFollowUps}</p><p className="mt-1 text-xs leading-5 text-slate-500">Giới hạn toàn bài, do backend kiểm tra. Nghe lại không tính thêm lượt.</p></div>
        </section>
        {demo && !terminal && <section className="rounded-xl border border-amber-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">Tình huống thử cục bộ</h2><p className="mt-2 text-xs leading-5 text-slate-500">Kết quả mẫu được xử lý ở BE và lưu trong PostgreSQL tạm. Không ghi Supabase, chưa nhận dạng giọng nói.</p>
          <label className="mt-4 block text-xs font-medium text-slate-700">Lần trả lời tiếp theo
            <select value={scenario} disabled={blocked} onChange={e => setScenario(e.target.value as OralDemoScenario)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm">
              <option value="BRIEF">Ngắn → có thể hỏi follow-up</option><option value="CLEAR">Rõ → chuyển câu</option><option value="EMPTY">Âm thanh rỗng → cùng lượt</option><option value="TECHNICAL_ERROR">Lỗi kỹ thuật → thử lại</option>
            </select>
          </label>
        </section>}
        <p className="px-1 text-xs leading-6 text-slate-500">Chỉ hiển thị số câu và tiến độ; không hiển thị đề, đáp án hoặc rubric. Mọi chuyển bước được backend xác nhận.</p>
      </aside>
    </div>
  </>
}
