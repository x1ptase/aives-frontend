import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/shared/i18n/format'
import type { OralAction, OralDemoScenario, OralState } from '../oralApi'
import { oralCountdown, oralTerminal, oralProcessingError } from './oralExamHelpers'
import { previewTime } from './oralPreviewMachine'
import OralSpeechControls from './OralSpeechControls'
import OralRecordingControls from './OralRecordingControls'

/** Nhãn giao diện chỉ mô tả kết quả thực hiện, không suy ra điểm (khóa exams.room.q.* và exams.room.phase.*). */
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
  const { t } = useTranslation()
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
      <div><h2 className="font-semibold text-slate-900">{t('exams.room.examTurn', { id: state.studentExamId })}</h2><p className="mt-1 text-xs text-slate-500">{t('exams.room.summary', { main: state.mainCount, followUps: state.maxFollowUps })}</p></div>
      <div className="text-right"><p className="text-xs text-slate-500">{terminal ? t('exams.room.timeAtClose') : t('exams.room.timeLeft')}</p><p role="timer" aria-label={t('exams.room.timeLeft')} className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${time.slot < 60000 ? 'text-red-700' : 'text-slate-900'}`}>{previewTime(time.slot)}</p></div>
    </section>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8" aria-labelledby="live-oral-phase">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
            <span>{state.currentQuestionOrder ? t('exams.room.mainQuestion', { current: state.currentQuestionOrder, total: state.mainCount }) : terminal ? t('exams.room.resultLabel') : t('exams.room.afterFirst')}</span>
            {state.language && <span className="rounded bg-slate-100 px-2 py-1">{state.language === 'vi' ? t('exams.language.vi') : t('exams.language.en')}{state.followUpIndex ? ` · ${t('exams.room.followUp', { n: state.followUpIndex })}` : ''}</span>}
          </div>
          <div className="py-9 text-center">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${state.phase === 'ANSWERING' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              <svg aria-hidden="true" width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                {state.phase === 'ANSWERING' ? <><rect x="12" y="3" width="8" height="17" rx="4" /><path d="M8 15v2a8 8 0 0016 0v-2M16 25v4M11 29h10" /></> : terminal ? <path d="M7 16l6 6L26 9" /> : <><path d="M5 12h6l7-6v20l-7-6H5zM23 11a8 8 0 010 10M27 7a14 14 0 010 18" /></>}
              </svg>
            </div>
            <h2 id="live-oral-phase" aria-live="polite" className="mt-5 text-xl font-semibold text-slate-900 sm:text-2xl">{t(`exams.room.phase.${state.phase}`)}</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              {state.phase === 'SPEAKING' ? demo ? t('exams.room.desc.speakingDemo') : speech?.ready ? t('exams.room.desc.speakingReady') : t('exams.room.desc.speakingWait')
                : state.phase === 'ANSWERING' ? demo ? t('exams.room.desc.answeringDemo') : t('exams.room.desc.answeringLive')
                : state.phase === 'PREPARING' ? t('exams.room.desc.preparing')
                : state.phase === 'TRANSCRIBING' ? t('exams.room.desc.transcribing')
                : state.phase === 'DECIDING' ? t('exams.room.desc.deciding')
                : state.phase === 'REVIEW' ? t('exams.room.desc.review')
                : state.phase === 'TECHNICAL_ERROR' ? t('exams.room.desc.technical')
                : state.phase === 'PAUSED' ? t('exams.room.desc.paused')
                : t('exams.room.desc.final')}
            </p>
          </div>
          {state.phase === 'TECHNICAL_ERROR' && state.processingErrorCode && <p role="status" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{oralProcessingError(state.processingErrorCode)}</p>}
          {!demo && speech?.ready && <OralSpeechControls turnId={state.currentTurnId} enabled={speech.controlled && ['PREPARING', 'SPEAKING'].includes(state.phase)} blocked={blocked} valid={speech.valid} fetch={speech.fetch} ended={speech.ended} />}
          {!demo && recording?.ready && <OralRecordingControls turnId={state.currentTurnId} enabled={recording.controlled && !recording.hasDraft && state.phase === 'ANSWERING'} blocked={blocked} valid={recording.valid} recorded={recording.recorded} />}
          {!terminal && time.slot === 0 && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t('exams.room.waitingExpiry')}</p>}
          {!terminal && state.currentQuestionOrder != null && <div className="mb-5 border-t border-slate-100 pt-5">
            <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">{t('exams.room.answerTimeLeft')}</span><span className="shrink-0 font-mono font-semibold text-slate-800">{time.answer == null ? t('exams.room.bySlot') : previewTime(time.answer)}</span></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{t('exams.room.answerNote')}</p>
          </div>}
          <div className="flex flex-wrap justify-center gap-3">
            {state.phase === 'SPEAKING' && demo && <button type="button" disabled={disabled} onClick={() => onCommand('PROMPT_FINISHED')} className={oralPrimaryButton}>{t('exams.room.heardDemo')}</button>}
            {state.phase === 'ANSWERING' && demo && <>
              <button type="button" disabled={disabled} onClick={() => onCommand('SUBMIT', undefined, scenario)} className={oralPrimaryButton}>{t('exams.room.done')}</button>
              <button type="button" disabled={disabled} onClick={() => onCommand('REPLAY')} className={oralSecondaryButton}>{t('exams.room.replay')}</button>
              {!state.followUpIndex && !ownMainAnswer && <button type="button" disabled={disabled} onClick={() => onCommand('DEFER')} className={oralSecondaryButton}>{t('exams.room.defer')}</button>}
            </>}
            {state.phase === 'ANSWERING' && !demo && speech?.ready && <button type="button" disabled={disabled} onClick={() => onCommand('REPLAY')} className={oralSecondaryButton}>{t('exams.room.replay')}</button>}
            {['ANSWERING', 'SPEAKING'].includes(state.phase) && <button type="button" disabled={disabled} onClick={() => onCommand('PAUSE')} className={oralSecondaryButton}>{t('exams.room.pause')}</button>}
            {state.phase === 'PAUSED' && <button type="button" disabled={disabled} onClick={() => onCommand('RESUME')} className={oralPrimaryButton}>{t('exams.room.resume')}</button>}
            {state.phase === 'TECHNICAL_ERROR' && <button type="button" disabled={disabled} onClick={() => onCommand('RETRY')} className={oralPrimaryButton}>{t('exams.room.retry')}</button>}
            {state.phase === 'REVIEW' && <button type="button" disabled={disabled} onClick={onFinish} className={oralSecondaryButton}>{t('exams.room.submitUnanswered')}</button>}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="live-oral-transcripts">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="live-oral-transcripts" className="font-semibold text-slate-900">{t('exams.room.transcriptTitle')}</h2><span className="text-xs text-slate-500">{demo ? t('exams.room.demoData') : ''}{t('exams.room.readOnly')}</span></div>
          {!state.transcripts.length ? <p className="py-7 text-sm leading-6 text-slate-500">{t('exams.room.noTranscript')}</p>
            : <ol className="mt-4 divide-y divide-slate-100">{state.transcripts.map(tr => <li key={`${tr.questionOrder}:${tr.followUpIndex}`} className="py-4">
              <p className="mb-2 text-xs font-semibold text-blue-700">{t('exams.room.transcriptItem', { order: tr.questionOrder })}{tr.followUpIndex ? ` · ${t('exams.room.followUp', { n: tr.followUpIndex })}` : ''}</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{tr.content}</p><p className="mt-2 text-xs text-slate-500">{t('exams.room.savedAt', { time: formatDateTime(tr.savedAt) })}</p>
            </li>)}</ol>}
        </section>
      </div>
      <aside className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="live-oral-progress">
          <h2 id="live-oral-progress" className="font-semibold text-slate-900">{t('exams.room.progressTitle')}</h2><p className="mt-1 text-xs text-slate-500">{t('exams.room.resolved', { done: resolved, total: state.mainCount })}</p>
          <ol className="mt-4 divide-y divide-slate-100">{state.questions.map(q => <li key={q.questionOrder} className="flex items-center justify-between gap-3 py-3">
            <div><p className="text-sm font-medium text-slate-800">{t('exams.room.transcriptItem', { order: q.questionOrder })}</p><p className={`mt-1 text-xs ${q.status === 'DEFERRED' ? 'text-amber-800' : 'text-slate-500'}`}>{t(`exams.room.q.${q.status}`)}</p></div>
            {state.phase === 'REVIEW' && q.status === 'DEFERRED' && <button type="button" disabled={disabled} aria-label={t('exams.room.answerAria', { order: q.questionOrder })} onClick={() => onCommand('REVISIT', q.questionOrder)} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40">{t('exams.room.answerBtn')}</button>}
          </li>)}</ol>
          <div className="mt-3 border-t border-slate-200 pt-4"><p className="text-sm font-medium text-slate-800">{t('exams.room.followUpCount', { used: state.followUpsUsed, max: state.maxFollowUps })}</p><p className="mt-1 text-xs leading-5 text-slate-500">{t('exams.room.followUpNote')}</p></div>
        </section>
        {demo && !terminal && <section className="rounded-xl border border-amber-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">{t('exams.room.demoTitle')}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{t('exams.room.demoDesc')}</p>
          <label className="mt-4 block text-xs font-medium text-slate-700">{t('exams.room.nextAnswer')}
            <select value={scenario} disabled={blocked} onChange={e => setScenario(e.target.value as OralDemoScenario)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm">
              <option value="BRIEF">{t('exams.room.scBrief')}</option><option value="CLEAR">{t('exams.room.scClear')}</option><option value="EMPTY">{t('exams.room.scEmpty')}</option><option value="TECHNICAL_ERROR">{t('exams.room.scTech')}</option>
            </select>
          </label>
        </section>}
        <p className="px-1 text-xs leading-6 text-slate-500">{t('exams.room.footer')}</p>
      </aside>
    </div>
  </>
}
