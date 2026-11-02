import { useState } from 'react'
import { oralApi } from '../oralApi'
import { useOralSpeech } from '../hooks/useOralSpeech'

/** Nghe giọng Gemini bằng mẫu cố định; không bắt đầu exam, ghi âm hoặc lưu câu trả lời. */
export default function OralSpeechPreview() {
  const [language, setLanguage] = useState<'vi' | 'en'>('vi')
  const speech = useOralSpeech(`preview-${language}`, true, () => true, signal => oralApi.previewSpeech(language, signal), () => {})
  return <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-semibold text-slate-900">Kiểm tra giọng đọc</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Nghe mẫu cố định, không mở lượt thi hoặc sử dụng micro.</p>
    <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm text-slate-700">Ngôn ngữ
      <select className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2" value={language} onChange={e => setLanguage(e.target.value as 'vi' | 'en')}><option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option></select>
    </label><button type="button" disabled={speech.status === 'loading' || speech.status === 'playing'} onClick={() => void (speech.status === 'ready' ? speech.play() : speech.load())} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{speech.status === 'loading' ? 'Đang tải giọng đọc…' : speech.status === 'playing' ? 'Đang phát…' : speech.status === 'ready' ? 'Phát giọng đọc' : 'Nghe thử giọng đọc'}</button>
    <button type="button" onClick={speech.stop} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Dừng</button></div>
    {speech.error && <p role="status" className="mt-3 text-sm text-red-700">{speech.error}</p>}
  </section>
}
