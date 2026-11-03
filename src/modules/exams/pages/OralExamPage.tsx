import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const oral = useOralExam(examId, userId)
  const [accepted, setAccepted] = useState(false)
  const navigate = useNavigate(); const location = useLocation(); const feedback = useFeedback()
  const demo = isLocalOralDemo(oral.runtime)
  const streaming = !demo && import.meta.env.VITE_ORAL_STREAMING_ENABLED !== 'false' && typeof AudioContext !== 'undefined' && typeof AudioWorkletNode !== 'undefined'
  const title = typeof location.state?.title === 'string' ? location.state.title : t('exams.oralPage.defaultTitle', { id: examId })
  /** Rời phòng không gọi Finish; pause được gửi nếu còn quyền và đang ở bước nghe/trả lời. */
  const leave = async () => {
    if (oral.state && !oralTerminal(oral.state)) {
      if (!await feedback.confirm({ title: t('exams.oralPage.leaveTitle'), message: t('exams.oralPage.leaveMessage'), confirmLabel: t('exams.oralPage.leaveLabel') })) return
      await oral.pauseBeforeLeave()
    }
    navigate('/student/exams')
  }
  /** Nộp câu bỏ qua chỉ sau xác nhận, BE kiểm tra lại thời gian và trạng thái. */
  const finish = async () => {
    if (await feedback.confirm({ title: t('exams.oralPage.finishTitle'), message: t('exams.oralPage.finishMessage'), confirmLabel: t('exams.oralPage.finishLabel') })) await oral.command('FINISH')
  }
  return <PageContainer title={title} subtitle={t('exams.oralPage.subtitle')}>
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${demo ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-100 bg-blue-50 text-blue-800'}`}>{demo ? t('exams.oralPage.badgeDemo') : t('exams.oralPage.badgeLive')}</span>
        <p className="text-xs text-slate-500">{demo ? t('exams.oralPage.noteDemo') : oral.runtime?.providersReady ? t('exams.oralPage.noteReady') : t('exams.oralPage.noteNotReady')}</p>
      </div><button type="button" disabled={oral.busy} onClick={leave} className="text-sm font-medium text-blue-700 disabled:opacity-40">{t('exams.oralPage.backToSchedule')}</button></div>
      {!oral.state && oral.runtime?.speechReady && <OralSpeechPreview />}
      {!oral.state && oral.runtime?.transcriptionReady && <OralTranscriptionPreview />}
      {oral.audioDraft && <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">{t('exams.oralPage.draftTitle')}</p><p className="mt-2 text-sm text-amber-900">{t('exams.oralPage.draftDesc')}</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={oral.busy || oral.uploading || !oral.controlled} onClick={() => void oral.resumeAudio()} className={oralSecondaryButton}>{oral.uploading ? t('exams.oralPage.draftSending') : t('exams.oralPage.draftResend')}</button>
        {!oral.pending && oral.state && ['ANSWERING', 'SPEAKING'].includes(oral.state.phase) && <button type="button" disabled={oral.busy || oral.uploading} onClick={async () => { if (await feedback.confirm({ title: t('exams.oralPage.discardTitle'), message: t('exams.oralPage.discardMessage'), confirmLabel: t('exams.oralPage.discardLabel') })) await oral.discardAudio() }} className={oralSecondaryButton}>{t('exams.oralPage.discard')}</button>}</div></section>}
      {oral.storageWarning && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{t('exams.oralPage.storageWarning')}</p>}
      {oral.issue && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-800"><p>{oral.issue}</p><button type="button" disabled={oral.busy} onClick={() => void oral.refresh()} className="font-semibold underline disabled:opacity-40">{t('exams.oralPage.refreshState')}</button></div>}
      {oral.pending && !oral.busy && <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">{t('exams.oralPage.pendingTitle')}</p><p className="mt-1 text-sm leading-6 text-amber-900">{t('exams.oralPage.pendingDesc')}</p>
        <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={oral.busy} onClick={() => void oral.refresh()} className={oralSecondaryButton}>{t('exams.oralPage.checkState')}</button><button type="button" disabled={oral.busy} onClick={() => void oral.retryPending()} className={oralPrimaryButton}>{t('exams.oralPage.resend')}</button></div>
      </section>}
      {oral.loading ? <LoadingState /> : !oral.state ? <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{t('exams.oralPage.prepare')}</p><h2 className="mt-3 text-xl font-semibold text-slate-900">{t('exams.oralPage.startAssigned')}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t('exams.oralPage.startDesc')}</p>
        {demo ? <label className="mt-5 flex max-w-2xl cursor-pointer items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" /><span>{t('exams.oralPage.demoAccept')}</span></label>
          : <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">{oral.runtime?.providersReady ? t('exams.oralPage.readyNote') : t('exams.oralPage.notReadyNote')}</p>}
        <button type="button" disabled={oral.busy || !oral.runtime?.providersReady || demo && !accepted || !!oral.pending} onClick={() => void oral.open()} className={`mt-5 ${oralPrimaryButton}`}>{oral.busy ? t('exams.oralPage.opening') : t('exams.oralPage.startExam')}</button>
      </section> : <>
        {!oral.controlled && !oralTerminal(oral.state) && <section className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-blue-100 bg-white p-4"><p className="text-sm leading-6 text-slate-600">{t('exams.oralPage.viewing')}</p><button type="button" disabled={oral.busy || !!oral.pending && oral.pending.action !== 'SUBMIT'} onClick={() => void oral.open()} className={oralPrimaryButton}>{t('exams.oralPage.regain')}</button></section>}
        {!demo && !oral.runtime?.providersReady && <p className="mb-4 rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-600">{t('exams.oralPage.providersNotReady')}</p>}
        <OralExamRoom state={oral.state} receivedAt={oral.receivedAt} demo={demo} blocked={oral.busy || !oral.controlled || !!oral.pending}
          speech={{ ready: !!oral.runtime?.speechReady, controlled: oral.controlled, valid: oral.speechCurrent, fetch: oral.speech, ended: turn => void oral.speechFinished(turn),
            stream: streaming && oral.runtime?.streamingTtsReady ? oral.speechStream : undefined }}
          recording={{ ready: (!!oral.runtime?.transcriptionReady || streaming && !!oral.runtime?.streamingSttReady) && !!oral.runtime?.audioStorageReady, controlled: oral.controlled, hasDraft: oral.audioDraft, valid: oral.recordingCurrent, recorded: oral.submitRecording,
            streaming: streaming && oral.runtime?.streamingSttReady ? { open: oral.openRecordingStream, submit: oral.submitStreamingRecording } : undefined }}
          onCommand={(action, target, scenario) => void oral.command(action, target, scenario)} onFinish={finish} />
      </>}
    </div>
  </PageContainer>
}

/** Key theo user/lượt để route đổi không giữ request hoặc state của lượt cũ. */
export default function OralExamPage() {
  const { t } = useTranslation()
  const { studentExamId } = useParams(); const userId = useAuthStore(s => s.user?.id ?? 'anonymous')
  const id = Number(studentExamId)
  if (!studentExamId || !/^\d+$/.test(studentExamId) || !Number.isSafeInteger(id) || id <= 0) return <PageContainer title={t('exams.oralPage.notFoundTitle')}><p className="text-sm text-slate-600">{t('exams.oralPage.notFoundDesc')}</p></PageContainer>
  return <FeedbackProvider><OralExamContent key={`${userId}:${id}`} userId={userId} examId={id} /></FeedbackProvider>
}
