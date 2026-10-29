import { useState } from 'react'
import { usePreviewSpeech } from '../hooks/usePreviewAudio'
import { previewLanguage, previewSpeech, previewTime, type OralPreviewState, type PreviewAction, type PreviewOutcome } from './oralPreviewMachine'

/** Nhãn trạng thái câu được dùng ở tiến độ và tổng kết, không suy diễn thành điểm. */
const outcomeLabel: Record<PreviewOutcome, string> = { PENDING: 'Chưa đến lượt', ACTIVE: 'Đang thực hiện', DEFERRED: 'Tạm bỏ qua', ANSWERED: 'Đã trả lời', NO_ANSWER: 'Chưa trả lời' }
/** Trạng thái hiển thị không tiết lộ nội dung câu hỏi. */
const phaseLabel: Record<OralPreviewState['phase'], string> = { SPEAKING: 'Đang đọc câu hỏi', ANSWERING: 'Đến lượt bạn trả lời', PROCESSING: 'Đang xử lý lượt trả lời', REVIEW: 'Quay lại các câu tạm bỏ qua', PAUSED: 'Tạm dừng tương tác', COMPLETED: 'Đã hoàn tất mô phỏng', EXPIRED: 'Đã hết thời gian' }
const secondary = 'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40'
const primary = 'rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40'

/** Phòng thử chỉ phát một câu hiện tại; không có danh sách đề, đáp án hoặc hướng dẫn chấm. */
export default function OralPreviewRoom({ state, send, onFinish, onReset }: {
  /** Tiến trình mô phỏng trong tab. */ state: OralPreviewState
  /** Lệnh đi qua máy trạng thái trước khi cập nhật giao diện. */ send: (action: PreviewAction) => void
  /** Xác nhận nộp phần câu còn bỏ qua bằng popup ứng dụng. */ onFinish: () => void
  /** Xác nhận xóa bản thử bằng popup ứng dụng. */ onReset: () => void
}) {
  const [style, setStyle] = useState<'clear' | 'brief' | 'empty'>('brief')
  const active = state.questions[state.current]
  const terminal = state.phase === 'COMPLETED' || state.phase === 'EXPIRED'
  const speech = usePreviewSpeech(previewSpeech(state), previewLanguage(state), state.phase === 'SPEAKING', state.speechId,
    id => send({ type: 'SPOKEN', speechId: id, now: Date.now() }))
  const answered = state.questions.filter(q => q.status === 'ANSWERED').length
  const resolved = state.questions.filter(q => q.status === 'ANSWERED' || q.status === 'NO_ANSWER').length
  const remaining = state.deadline - state.lastTick
  const isAnswering = state.phase === 'ANSWERING'
  const isInteraction = ['SPEAKING', 'ANSWERING', 'PROCESSING'].includes(state.phase)
  const transcripts = state.questions.flatMap((q, index) => q.transcripts.map((t, turn) => ({ ...t, index, key: `${index}-${turn}` })))
  return <>
    <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:px-6">
      <div><p className="font-semibold text-slate-900">SWD392 · Lượt thi mẫu</p><p className="mt-1 text-xs text-slate-500">{state.config.mainCount} câu chính · Tối đa {state.config.followUpLimit} follow-up toàn bài</p></div>
      <div className="flex items-center gap-6"><div className="text-right"><p className="text-xs text-slate-500">{terminal ? 'Thời gian còn khi dừng' : 'Thời gian lượt thi còn lại'}</p><p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${remaining <= 60000 ? 'text-red-700' : 'text-slate-900'}`} role="timer" aria-label="Thời gian lượt thi còn lại">{previewTime(remaining)}</p></div></div>
    </section>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8" aria-labelledby="oral-room-state">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-slate-500">
            <span>{terminal ? 'TỔNG KẾT BẢN THỬ' : state.phase === 'REVIEW' ? 'SAU LƯỢT ĐẦU' : `CÂU CHÍNH ${state.current + 1} / ${state.config.mainCount}`}</span>
            {!terminal && state.phase !== 'REVIEW' && <span className="rounded bg-slate-100 px-2 py-1">{previewLanguage(state) === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}{state.turn > 0 ? ` · Follow-up ${state.turn}` : ''}</span>}
          </div>
          <div className="py-8 text-center sm:py-10">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${isAnswering ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              <svg aria-hidden="true" width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                {isAnswering ? <><rect x="12" y="3" width="8" height="17" rx="4" /><path d="M8 15v2a8 8 0 0016 0v-2M16 25v4M11 29h10" /></> : terminal ? <path d="M7 16l6 6L26 9" /> : <><path d="M5 12h6l7-6v20l-7-6H5zM23 11a8 8 0 010 10M27 7a14 14 0 010 18" /></>}
              </svg>
            </div>
            <h2 id="oral-room-state" className="mt-5 text-xl font-semibold text-slate-900 sm:text-2xl" aria-live="polite">{phaseLabel[state.phase]}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              {state.phase === 'SPEAKING' ? 'Lắng nghe câu hiện tại. Mic mô phỏng đang đóng; nội dung đề chỉ được truyền qua giọng đọc.'
                : isAnswering ? 'Mic mô phỏng đang mở. Bạn có thể nói thử rồi bấm “Trả lời xong”; transcript bên dưới vẫn là dữ liệu mẫu, không nhận dạng lời nói của bạn.'
                : state.phase === 'PROCESSING' ? 'Đang tạo transcript mẫu và mô phỏng quyết định hỏi tiếp. Mic mô phỏng đang đóng.'
                : state.phase === 'REVIEW' ? 'Bạn đã đi hết lượt đầu. Chọn một câu tạm bỏ qua ở bảng tiến độ để nghe lại và trả lời.'
                : state.phase === 'PAUSED' ? 'Không tự chuyển câu hoặc coi lỗi kỹ thuật là không biết trả lời. Tiếp tục để xử lý đúng lượt hiện tại.'
                : `${answered}/${state.config.mainCount} câu có câu trả lời. Transcript mẫu được giữ lại; không gửi kết quả hoặc chấm điểm.`}
            </p>
          </div>
          {state.notice && <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">{state.notice}</p>}
          {state.phase === 'SPEAKING' && <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-600">{speech.issue || 'Giọng đọc sử dụng dịch vụ cục bộ của thiết bị. Nếu không nghe được, bạn có thể bỏ qua lượt phát âm mẫu.'}</p>
            <div className="mt-3 flex flex-wrap gap-3"><button type="button" className={secondary} onClick={speech.retry}>Thử phát lại</button>
              <button type="button" className={secondary} onClick={() => send({ type: 'SPOKEN', speechId: state.speechId, now: Date.now() })}>Tiếp tục lượt nghe mô phỏng</button></div>
          </div>}
          {!terminal && state.phase !== 'REVIEW' && <div className="mb-5 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">Ngân sách trả lời của câu này</span><span className="font-mono font-semibold tabular-nums text-slate-800">{previewTime(active.remainingMs)}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100" role="progressbar" aria-label="Ngân sách trả lời còn lại" aria-valuemin={0} aria-valuemax={state.config.answerSeconds} aria-valuenow={Math.ceil(active.remainingMs / 1000)}>
              <div className="h-full bg-blue-500" style={{ width: `${active.remainingMs / (state.config.answerSeconds * 10)}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Chỉ trừ khi đến lượt bạn trả lời, kể cả im lặng. Thời gian AI nói/xử lý vẫn tính vào thời hạn toàn bài.</p>
          </div>}
          <div className="flex flex-wrap justify-center gap-3">
            {isAnswering && <><button type="button" className={primary} onClick={() => send({ type: 'SUBMIT', style, now: Date.now() })}>Trả lời xong</button>
              <button type="button" className={secondary} onClick={() => send({ type: 'REPLAY', now: Date.now() })}>Nghe lại câu hiện tại</button>
              {!state.turn && !active.transcripts.length && <button type="button" className={secondary} onClick={() => send({ type: 'DEFER', now: Date.now() })}>Tạm bỏ qua</button>}</>}
            {state.phase === 'PAUSED' && <button type="button" className={primary} onClick={() => send({ type: 'RESUME', now: Date.now() })}>Tiếp tục bản mô phỏng</button>}
            {state.phase === 'REVIEW' && <button type="button" className={secondary} onClick={onFinish}>Nộp bài với các câu chưa trả lời</button>}
            {terminal && <button type="button" className={primary} onClick={onReset}>Thử một lượt mới</button>}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="oral-transcript">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="oral-transcript" className="font-semibold text-slate-900">Transcript câu trả lời của bạn</h2><span className="text-xs font-medium text-slate-500">Dữ liệu mẫu · Chỉ đọc</span></div>
          {transcripts.length === 0 ? <p className="py-7 text-sm leading-6 text-slate-500">Chưa có transcript. Sau khi bấm “Trả lời xong”, kết quả xử lý mẫu sẽ xuất hiện ở đây.</p>
            : <ol className="mt-4 divide-y divide-slate-100">{transcripts.map(t => <li key={t.key} className="py-4"><p className="mb-2 text-xs font-semibold text-blue-700">Câu chính {t.index + 1}{t.followUp ? ` · Follow-up ${t.followUp}` : ''} · Bản mẫu</p><p className="text-sm leading-7 text-slate-700">{t.text}</p></li>)}</ol>}
        </section>
      </div>
      <aside className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="oral-progress">
          <h2 id="oral-progress" className="font-semibold text-slate-900">Tiến độ lượt thi</h2><p className="mt-1 text-xs text-slate-500">{resolved}/{state.config.mainCount} câu đã xử lý</p>
          <ol className="mt-4 divide-y divide-slate-100">{state.questions.map((q, index) => <li key={index} className="flex items-center justify-between gap-3 py-3">
            <div><p className="text-sm font-medium text-slate-800">Câu chính {index + 1}</p><p className={`mt-1 text-xs ${q.status === 'DEFERRED' ? 'text-amber-800' : 'text-slate-500'}`}>{outcomeLabel[q.status]}</p></div>
            {state.phase === 'REVIEW' && q.status === 'DEFERRED' && <button type="button" aria-label={`Trả lời câu chính ${index + 1}`} onClick={() => send({ type: 'REVISIT', index, now: Date.now() })} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Trả lời</button>}
          </li>)}</ol>
          <div className="mt-3 border-t border-slate-200 pt-4"><p className="text-sm font-medium text-slate-800">Follow-up đã dùng: {state.followUpsUsed}/{state.config.followUpLimit}</p><p className="mt-1 text-xs leading-5 text-slate-500">Giới hạn toàn bài, không cần dùng hết. Nghe lại không tính thêm lượt.</p></div>
        </section>
        {!terminal && <details className="rounded-xl border border-slate-200 bg-white p-5" open>
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Công cụ thử luồng</summary>
          <p className="mt-3 text-xs leading-5 text-slate-500">Đây là điều khiển dành cho bản mô phỏng, sẽ bỏ khi nối dịch vụ thật.</p>
          <label className="mt-4 block text-xs font-medium text-slate-700">Kịch bản cho lần “Trả lời xong”
            <select value={style} onChange={e => setStyle(e.target.value as typeof style)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm">
              <option value="brief">Trả lời ngắn → có thể hỏi tiếp</option><option value="clear">Trả lời rõ → chuyển câu</option><option value="empty">Âm thanh rỗng → thử lại</option>
            </select>
          </label>
          <div className="mt-4 flex flex-col items-start gap-3">
            <button type="button" disabled={!isInteraction} onClick={() => send({ type: 'FAIL', message: 'Lỗi dịch vụ mẫu. Chưa kết luận câu chưa trả lời; thử lại giữ nguyên lượt và transcript đã lưu.', now: Date.now() })} className="text-left text-xs font-medium text-blue-700 disabled:text-slate-400">Giả lập lỗi xử lý / mất kết nối</button>
            <button type="button" onClick={() => send({ type: 'FAST_FORWARD', now: Date.now() })} className="text-left text-xs font-medium text-blue-700">Tua đồng hồ mô phỏng thêm 30 giây</button>
          </div>
        </details>}
        <p className="px-1 text-xs leading-6 text-slate-500">Không hiển thị đề hoặc đáp án. Không ghi âm trong phòng thử. Tiến trình mẫu được lưu trong tab, không lưu vào database.</p>
      </aside>
    </div>
  </>
}
