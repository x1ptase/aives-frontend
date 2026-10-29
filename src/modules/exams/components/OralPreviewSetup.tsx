import { useState } from 'react'
import { usePreviewMicrophone, usePreviewSpeech } from '../hooks/usePreviewAudio'
import { defaultPreviewConfig, type PreviewConfig } from './oralPreviewMachine'

/** Màn hình chuẩn bị chỉ dùng cấu hình mẫu, không tạo hoặc bắt đầu ca thi thật. */
export default function OralPreviewSetup({ onStart }: { /** Bắt đầu bản thử sau khi đọc hướng dẫn. */ onStart: (config: PreviewConfig) => void }) {
  const [config, setConfig] = useState<PreviewConfig>({ ...defaultPreviewConfig })
  const [accepted, setAccepted] = useState(false)
  const [speakerTest, setSpeakerTest] = useState(false)
  const [speakerId, setSpeakerId] = useState(0)
  const [speakerDone, setSpeakerDone] = useState(false)
  const microphone = usePreviewMicrophone()
  const speech = usePreviewSpeech('Đây là phần kiểm tra giọng đọc. Bạn đã sẵn sàng cho lượt thi mô phỏng.', 'vi', speakerTest, speakerId, () => { setSpeakerDone(true); setSpeakerTest(false) })
  const input = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,1fr)]">
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="preview-setup">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">01 / Chuẩn bị</p>
      <h2 id="preview-setup" className="mt-2 text-xl font-semibold text-slate-900">Thử một lượt thi vấn đáp</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Môn mẫu: <strong className="font-medium text-slate-700">SWD392 · Software Architecture and Design</strong>. Cấu hình bên dưới chỉ dành cho bản thử.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Ngôn ngữ câu hỏi
          <select className={input} value={config.language} onChange={e => setConfig({ ...config, language: e.target.value as PreviewConfig['language'] })}>
            <option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option><option value="mixed">Việt / Anh xen kẽ</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Số câu chính
          <select className={input} value={config.mainCount} onChange={e => setConfig({ ...config, mainCount: Number(e.target.value) })}>{[1, 2, 3].map(n => <option key={n} value={n}>{n} câu</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700">Follow-up tối đa / toàn bài
          <select className={input} value={config.followUpLimit} onChange={e => setConfig({ ...config, followUpLimit: Number(e.target.value) })}>{[0, 1, 2].map(n => <option key={n} value={n}>{n} câu</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700">Thời gian lượt thi mẫu
          <select className={input} value={config.slotMinutes} onChange={e => setConfig({ ...config, slotMinutes: Number(e.target.value) })}>{[3, 5, 10].map(n => <option key={n} value={n}>{n} phút</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Ngân sách trả lời / câu chính và follow-up
          <select className={input} value={config.answerSeconds} onChange={e => setConfig({ ...config, answerSeconds: Number(e.target.value) })}>{[60, 90, 120].map(n => <option key={n} value={n}>{n} giây</option>)}</select>
        </label>
      </div>
      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
        <span>Tôi hiểu đây là bản mô phỏng: câu hỏi, transcript và quyết định follow-up dùng dữ liệu mẫu; không ghi kết quả vào bài thi thật.</span>
      </label>
      <button type="button" disabled={!accepted || microphone.status === 'checking' || speakerTest} onClick={() => onStart(config)} className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">Bắt đầu mô phỏng</button>
    </section>
    <aside className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="preview-devices">
        <h2 id="preview-devices" className="font-semibold text-slate-900">Kiểm tra thiết bị <span className="text-xs font-normal text-slate-500">· Không bắt buộc</span></h2>
        <div className="mt-5 border-b border-slate-100 pb-5">
          <button type="button" onClick={() => { setSpeakerDone(false); setSpeakerId(n => n + 1); setSpeakerTest(true) }} disabled={speakerTest && !speech.issue} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Nghe thử giọng đọc</button>
          <p className="mt-2 text-xs leading-5 text-slate-500" role="status">{speech.issue || (speakerDone ? 'Đã phát xong câu kiểm tra.' : speakerTest ? 'Đang phát giọng đọc mẫu…' : 'Dùng giọng cục bộ có sẵn trên thiết bị. Không có giọng phù hợp vẫn thử được luồng.')}</p>
          {speakerTest && speech.issue && <button type="button" onClick={() => setSpeakerTest(false)} className="mt-2 text-sm font-medium text-blue-700">Dừng kiểm tra giọng đọc</button>}
        </div>
        <div className="pt-5">
          <button type="button" disabled={microphone.status === 'checking'} onClick={microphone.check} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{microphone.status === 'checking' ? 'Đang kiểm tra mic…' : 'Kiểm tra quyền mic'}</button>
          <p role="status" className="mt-2 text-xs leading-5 text-slate-500">{microphone.message}</p>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="preview-how">
        <h2 id="preview-how" className="font-semibold text-slate-900">Luồng bạn sẽ trải nghiệm</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
          <li>Nghe “Câu số…” rồi đến lượt trả lời. Nội dung đề không hiện trên màn hình.</li>
          <li>Bấm “Trả lời xong” để nhận transcript mẫu. Câu trả lời ngắn có thể dẫn đến follow-up.</li>
          <li>Tạm bỏ qua câu chưa trả lời và quay lại sau lượt đầu, giữ nguyên thời gian còn lại.</li>
          <li>Hoàn tất hoặc hết giờ để xem trạng thái từng câu; bản thử không chấm điểm.</li>
        </ol>
      </section>
    </aside>
  </div>
}
