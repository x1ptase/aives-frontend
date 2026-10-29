import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth'
import PageContainer from '@/shared/components/common/PageContainer'
import FeedbackProvider from '@/shared/components/common/FeedbackProvider'
import { useFeedback } from '@/shared/components/common/feedback'
import LoadingState from '@/shared/components/common/LoadingState'
import OralExamRoom from '../components/OralExamRoom'
import { oralTerminal } from '../components/oralExamHelpers'
import { useOralExam } from '../hooks/useOralExam'
import { isLocalOralDemo } from '../oralApi'
import OralSpeechPreview from '../components/OralSpeechPreview'
import OralTranscriptionPreview from '../components/OralTranscriptionPreview'

/** Cùng quy ước nút của module Exams hiện có. */
const oralPrimaryButton = 'rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40'
const oralSecondaryButton = 'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'

/** Trang nối API oral thật, tách khỏi bản preview độc lập để không trộn dữ liệu. */
function OralExamContent({ examId, userId }: { examId: number; userId: string }) {
  const oral = useOralExam(examId, userId)
  const [accepted, setAccepted] = useState(false)
  const navigate = useNavigate(); const location = useLocation(); const feedback = useFeedback()
  const demo = isLocalOralDemo(oral.runtime)
  const title = typeof location.state?.title === 'string' ? location.state.title : `Thi vấn đáp · Lượt #${examId}`
  /** Rời phòng không gọi Finish; pause được gửi nếu còn quyền và đang ở bước nghe/trả lời. */
  const leave = async () => {
    if (oral.state && !oralTerminal(oral.state)) {
      if (!await feedback.confirm({ title: 'Rời phòng thi?', message: 'Transcript đã xác nhận được giữ ở backend. Bản ghi đang ghi chưa bấm gửi sẽ bị hủy. Thời hạn toàn bài vẫn chạy; rời trang không nộp bài hoặc cộng thêm thời gian.', confirmLabel: 'Rời phòng' })) return
      await oral.pauseBeforeLeave()
    }
    navigate('/student/exams')
  }
  /** Nộp câu bỏ qua chỉ sau xác nhận, BE kiểm tra lại thời gian và trạng thái. */
  const finish = async () => {
    if (await feedback.confirm({ title: 'Nộp với các câu chưa trả lời?', message: 'Các câu còn tạm bỏ qua sẽ được ghi nhận là không có câu trả lời. Không tự tạo transcript hoặc điểm.', confirmLabel: 'Xác nhận nộp' })) await oral.command('FINISH')
  }
  return <PageContainer title={title} subtitle="Phòng thi vấn đáp · Tiến trình do backend quản lý">
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${demo ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-100 bg-blue-50 text-blue-800'}`}>{demo ? 'KIỂM THỬ CỤC BỘ' : 'ĐÃ NỐI BACKEND'}</span>
        <p className="text-xs text-slate-500">{demo ? 'PostgreSQL riêng · Dịch vụ mẫu · Không ghi Supabase' : oral.runtime?.providersReady ? 'Giọng đọc · Nhận dạng · AI hội thoại đã cấu hình' : 'Cần kiểm tra cấu hình dịch vụ và migration trước khi thi'}</p>
      </div><button type="button" disabled={oral.busy} onClick={leave} className="text-sm font-medium text-blue-700 disabled:opacity-40">Về lịch thi</button></div>
      {!oral.state && oral.runtime?.speechReady && <OralSpeechPreview />}
      {!oral.state && oral.runtime?.transcriptionReady && <OralTranscriptionPreview />}
      {oral.audioDraft && <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Có bản ghi đang chờ backend xác nhận</p><p className="mt-2 text-sm text-amber-900">Bản ghi đã được giữ trong trình duyệt. Nhận lại quyền của tab, kiểm tra tiến trình rồi gửi lại đúng bản này.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={oral.busy || oral.uploading || !oral.controlled} onClick={() => void oral.resumeAudio()} className={oralSecondaryButton}>{oral.uploading ? 'Đang gửi bản ghi…' : 'Gửi lại bản ghi đang chờ'}</button>
        {!oral.pending && oral.state && ['ANSWERING', 'SPEAKING'].includes(oral.state.phase) && <button type="button" disabled={oral.busy || oral.uploading} onClick={async () => { if (await feedback.confirm({ title: 'Bỏ bản ghi chưa nộp?', message: 'Chỉ bỏ bản giữ tại trình duyệt khi backend vẫn chờ trả lời. Bạn cần ghi lại; thời gian đã dùng không được cấp lại.', confirmLabel: 'Bỏ bản ghi local' })) await oral.discardAudio() }} className={oralSecondaryButton}>Bỏ bản ghi chưa nộp</button>}</div></section>}
      {oral.storageWarning && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Trình duyệt không cho lưu danh tính tab/yêu cầu chờ. Nếu tải lại trang, bạn có thể cần chờ hết quyền của tab trước để tiếp tục.</p>}
      {oral.issue && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-800"><p>{oral.issue}</p><button type="button" disabled={oral.busy} onClick={() => void oral.refresh()} className="font-semibold underline disabled:opacity-40">Cập nhật trạng thái</button></div>}
      {oral.pending && !oral.busy && <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Một thao tác chưa được xác nhận</p><p className="mt-1 text-sm leading-6 text-amber-900">Backend có thể đã xử lý. Kiểm tra trạng thái hoặc gửi lại đúng yêu cầu đang chờ; chưa gửi thao tác mới.</p>
        <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={oral.busy} onClick={() => void oral.refresh()} className={oralSecondaryButton}>Kiểm tra trạng thái</button><button type="button" disabled={oral.busy} onClick={() => void oral.retryPending()} className={oralPrimaryButton}>Gửi lại thao tác</button></div>
      </section>}
      {oral.loading ? <LoadingState /> : !oral.state ? <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Chuẩn bị vào phòng thi</p><h2 className="mt-3 text-xl font-semibold text-slate-900">Bắt đầu đúng lượt đã được phân công</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Khi xác nhận, backend kiểm tra lịch, chốt bộ câu và tính thời hạn theo slot đã được giảng viên phân công. Không được chọn lại số câu hoặc tăng thời gian từ màn hình này.</p>
        {demo ? <label className="mt-5 flex max-w-2xl cursor-pointer items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" /><span>Tôi đang thử trên database Docker riêng. Giọng đọc, transcript và follow-up là mẫu; phòng này chưa ghi âm hoặc gọi AI thật.</span></label>
          : <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">{oral.runtime?.providersReady ? 'Hãy kiểm tra loa và micro trước khi bắt đầu. AI lần lượt đọc câu hỏi, nghe câu trả lời và có thể hỏi thêm trong giới hạn của phiên thi. Transcript của bạn được lưu chỉ đọc; hết slot vẫn kết thúc dù dịch vụ đang xử lý.' : 'Có thể kiểm tra thiết bị đã cấu hình ở phía trên. Cần đủ cấu hình TTS, STT, AI hội thoại và migration trước khi mở lượt mới.'}</p>}
        <button type="button" disabled={oral.busy || !oral.runtime?.providersReady || demo && !accepted || !!oral.pending} onClick={() => void oral.open()} className={`mt-5 ${oralPrimaryButton}`}>{oral.busy ? 'Đang mở phòng…' : 'Bắt đầu lượt thi'}</button>
      </section> : <>
        {!oral.controlled && !oralTerminal(oral.state) && <section className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-blue-100 bg-white p-4"><p className="text-sm leading-6 text-slate-600">Đang xem tiến trình đã lưu. Bấm tiếp tục để backend xác nhận quyền điều khiển của tab này.</p><button type="button" disabled={oral.busy || !!oral.pending && oral.pending.action !== 'SUBMIT'} onClick={() => void oral.open()} className={oralPrimaryButton}>Tiếp tục / nhận lại quyền</button></section>}
        {!demo && !oral.runtime?.providersReady && <p className="mb-4 rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-600">Chưa đủ cấu hình hoặc migration cho pipeline giọng nói. Transcript đã lưu được giữ nguyên; liên hệ người quản lý hệ thống để kiểm tra trước khi tiếp tục.</p>}
        <OralExamRoom state={oral.state} receivedAt={oral.receivedAt} demo={demo} blocked={oral.busy || !oral.controlled || !!oral.pending}
          speech={{ ready: !!oral.runtime?.speechReady, controlled: oral.controlled, valid: oral.speechCurrent, fetch: oral.speech, ended: turn => void oral.speechFinished(turn) }}
          recording={{ ready: !!oral.runtime?.transcriptionReady && !!oral.runtime.audioStorageReady, controlled: oral.controlled, hasDraft: oral.audioDraft, valid: oral.recordingCurrent, recorded: oral.submitRecording }}
          onCommand={(action, target, scenario) => void oral.command(action, target, scenario)} onFinish={finish} />
      </>}
    </div>
  </PageContainer>
}

/** Key theo user/lượt để route đổi không giữ request hoặc state của lượt cũ. */
export default function OralExamPage() {
  const { studentExamId } = useParams(); const userId = useAuthStore(s => s.user?.id ?? 'anonymous')
  const id = Number(studentExamId)
  if (!studentExamId || !/^\d+$/.test(studentExamId) || !Number.isSafeInteger(id) || id <= 0) return <PageContainer title="Không tìm thấy lượt thi"><p className="text-sm text-slate-600">Mã lượt thi không hợp lệ. Hãy mở phòng từ My Exams.</p></PageContainer>
  return <FeedbackProvider><OralExamContent key={`${userId}:${id}`} userId={userId} examId={id} /></FeedbackProvider>
}
