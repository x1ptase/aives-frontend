import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/modules/auth'
import PageContainer from '@/shared/components/common/PageContainer'
import FeedbackProvider from '@/shared/components/common/FeedbackProvider'
import { useFeedback } from '@/shared/components/common/feedback'
import OralPreviewSetup from '../components/OralPreviewSetup'
import OralPreviewRoom from '../components/OralPreviewRoom'
import { useOralPreview } from '../hooks/useOralPreview'

/** Trang thử độc lập để duyệt UI/luồng Feature 3, không dùng dữ liệu thi thật. */
function OralExamPreviewContent() {
  const { t } = useTranslation()
  const userId = useAuthStore(s => s.user?.id ?? 'preview')
  const { state, send, start, reset, storageWarning } = useOralPreview(userId)
  const feedback = useFeedback()
  const navigate = useNavigate()
  const active = state && state.phase !== 'COMPLETED' && state.phase !== 'EXPIRED'
  /** Xác nhận rời trang bằng popup chung, giữ bản thử và không gia hạn deadline. */
  const leave = async () => {
    if (active && !await feedback.confirm({ title: t('exams.previewPage.leaveTitle'), message: t('exams.previewPage.leaveMessage'), confirmLabel: t('exams.previewPage.leaveLabel') })) return
    navigate('/student/exams')
  }
  /** Reset chỉ xóa dữ liệu mẫu của tab hiện tại. */
  const restart = async () => {
    if (await feedback.confirm({ title: t('exams.previewPage.restartTitle'), message: t('exams.previewPage.restartMessage'), confirmLabel: t('exams.previewPage.restartLabel') })) reset()
  }
  /** Chỉ nộp các câu còn bỏ qua sau khi người dùng xác nhận rõ hậu quả. */
  const finish = async () => {
    if (await feedback.confirm({ title: t('exams.previewPage.finishTitle'), message: t('exams.previewPage.finishMessage'), confirmLabel: t('exams.previewPage.finishLabel') })) send({ type: 'FINISH', now: Date.now() })
  }
  return <PageContainer title={t('exams.previewPage.title')} subtitle={t('exams.previewPage.subtitle')}>
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3"><span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">{t('exams.previewPage.badge')}</span><p className="text-sm text-slate-500">{t('exams.previewPage.note')}</p></div>
        <div className="flex gap-4 text-sm font-medium text-blue-700">{state && <button type="button" onClick={restart} className="hover:underline">{t('exams.previewPage.restart')}</button>}<button type="button" onClick={leave} className="hover:underline">{t('exams.previewPage.backToSchedule')}</button></div>
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
