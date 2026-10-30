import { useOralSpeech } from '../hooks/useOralSpeech'

/** Chỉ phát audio hiện tại; không có player controls tua, đổi tốc độ hoặc danh sách đề. */
export default function OralSpeechControls({ turnId, enabled, blocked, valid, fetch, ended }: {
  turnId: string | null; enabled: boolean; blocked: boolean
  valid: (turnId: string) => boolean; fetch: (turnId: string, signal: AbortSignal) => Promise<Blob>; ended: (turnId: string) => void
}) {
  const key = turnId || 'no-turn'
  const speech = useOralSpeech(key, enabled, () => !!turnId && valid(turnId), signal => fetch(key, signal), () => ended(key))
  if (!enabled) return null
  return <div className="mb-5 text-center">
    <button type="button" disabled={blocked || speech.status === 'loading' || speech.status === 'playing'}
      onClick={() => void (speech.status === 'ready' ? speech.play() : speech.load())}
      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
      {speech.status === 'loading' ? 'Đang chuẩn bị giọng đọc…' : speech.status === 'playing' ? 'AI đang đọc câu hỏi…' : speech.status === 'ready' ? 'Phát giọng đọc' : 'Nghe câu hỏi'}
    </button>
    {speech.error && <p role="status" className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-700">{speech.error}</p>}
    <p className="mt-3 text-xs leading-5 text-slate-500">Micro chưa bật. Thời gian trả lời chỉ bắt đầu sau khi audio phát xong.</p>
  </div>
}
