import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth'
import PageContainer from '@/shared/components/common/PageContainer'
import FeedbackProvider from '@/shared/components/common/FeedbackProvider'
import { useFeedback } from '@/shared/components/common/feedback'
import OralPreviewSetup from '../components/OralPreviewSetup'
import OralPreviewRoom from '../components/OralPreviewRoom'
import { useOralPreview } from '../hooks/useOralPreview'

/** Trang thử độc lập để duyệt UI/luồng Feature 3, không dùng dữ liệu thi thật. */
function OralExamPreviewContent() {
  const userId = useAuthStore(s => s.user?.id ?? 'preview')
  const { state, send, start, reset, storageWarning } = useOralPreview(userId)
  const feedback = useFeedback()
  const navigate = useNavigate()
  const active = state && state.phase !== 'COMPLETED' && state.phase !== 'EXPIRED'
  /** Xác nhận rời trang bằng popup chung, giữ bản thử và không gia hạn deadline. */
  const leave = async () => {
    if (active && !await feedback.confirm({ title: 'Rời phòng mô phỏng?', message: 'Tiến trình được giữ trong tab này; thời hạn lượt thi vẫn chạy. Không thay đổi bài thi thật.', confirmLabel: 'Rời phòng' })) return
    navigate('/student/exams')
  }
  /** Reset chỉ xóa dữ liệu mẫu của tab hiện tại. */
  const restart = async () => {
    if (await feedback.confirm({ title: 'Bắt đầu bản thử mới?', message: 'Xóa tiến trình và transcript mẫu của lượt thử này. Dữ liệu thi thật được giữ nguyên.', confirmLabel: 'Tạo bản thử mới' })) reset()
  }
  /** Chỉ nộp các câu còn bỏ qua sau khi người dùng xác nhận rõ hậu quả. */
  const finish = async () => {
    if (await feedback.confirm({ title: 'Nộp với các câu chưa trả lời?', message: 'Các câu còn tạm bỏ qua sẽ được ghi nhận là chưa trả lời (NO_ANSWER). Không tạo transcript thay thế và không chấm điểm trong bản thử.', confirmLabel: 'Hoàn tất bản thử' })) send({ type: 'FINISH', now: Date.now() })
  }
  return <PageContainer title="Phòng thi vấn đáp" subtitle="Feature 3 · Kiểm tra trải nghiệm trước khi nối dịch vụ thật">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3"><span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">MÔ PHỎNG</span><p className="text-sm text-slate-500">Không ghi kết quả thi · Không gọi AI thật</p></div>
        <div className="flex gap-4 text-sm font-medium text-blue-700">{state && <button type="button" onClick={restart} className="hover:underline">Làm lại</button>}<button type="button" onClick={leave} className="hover:underline">Về lịch thi</button></div>
      </div>
      {storageWarning && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{storageWarning}</p>}
      {state ? <OralPreviewRoom state={state} send={send} onFinish={finish} onReset={restart} /> : <OralPreviewSetup onStart={start} />}
    </div>
  </PageContainer>
}

/** Popup ở cấp trang để xác nhận không biến mất khi chuyển màn hình con. */
export default function OralExamPreview() {
  return <FeedbackProvider><OralExamPreviewContent /></FeedbackProvider>
}
