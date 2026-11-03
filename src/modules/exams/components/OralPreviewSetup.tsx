import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { usePreviewMicrophone, usePreviewSpeech } from '../hooks/usePreviewAudio'
import { defaultPreviewConfig, type PreviewConfig } from './oralPreviewMachine'

/** Màn hình chuẩn bị chỉ dùng cấu hình mẫu, không tạo hoặc bắt đầu ca thi thật. */
export default function OralPreviewSetup({ onStart }: { /** Bắt đầu bản thử sau khi đọc hướng dẫn. */ onStart: (config: PreviewConfig) => void }) {
  const { t } = useTranslation()
  const [config, setConfig] = useState<PreviewConfig>({ ...defaultPreviewConfig })
  const [accepted, setAccepted] = useState(false)
  const [speakerTest, setSpeakerTest] = useState(false)
  const [speakerId, setSpeakerId] = useState(0)
  const [speakerDone, setSpeakerDone] = useState(false)
  const microphone = usePreviewMicrophone()
  const speech = usePreviewSpeech(t('exams.setup.speakerSample'), 'vi', speakerTest, speakerId, () => { setSpeakerDone(true); setSpeakerTest(false) })
  const input = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,1fr)]">
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="preview-setup">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{t('exams.setup.step')}</p>
      <h2 id="preview-setup" className="mt-2 text-xl font-semibold text-slate-900">{t('exams.setup.title')}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500"><Trans i18nKey="exams.setup.sample" components={{ b: <strong className="font-medium text-slate-700" /> }} /></p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">{t('exams.setup.language')}
          <select className={input} value={config.language} onChange={e => setConfig({ ...config, language: e.target.value as PreviewConfig['language'] })}>
            <option value="vi">{t('exams.language.vi')}</option><option value="en">{t('exams.language.en')}</option><option value="mixed">{t('exams.setup.both')}</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">{t('exams.setup.mainCount')}
          <select className={input} value={config.mainCount} onChange={e => setConfig({ ...config, mainCount: Number(e.target.value) })}>{[1, 2, 3].map(n => <option key={n} value={n}>{t('exams.setup.nQuestions', { n })}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700">{t('exams.setup.followUp')}
          <select className={input} value={config.followUpLimit} onChange={e => setConfig({ ...config, followUpLimit: Number(e.target.value) })}>{[0, 1, 2].map(n => <option key={n} value={n}>{t('exams.setup.nQuestions', { n })}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700">{t('exams.setup.slot')}
          <select className={input} value={config.slotMinutes} onChange={e => setConfig({ ...config, slotMinutes: Number(e.target.value) })}>{[3, 5, 10].map(n => <option key={n} value={n}>{t('exams.setup.nMinutes', { n })}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">{t('exams.setup.answerBudget')}
          <select className={input} value={config.answerSeconds} onChange={e => setConfig({ ...config, answerSeconds: Number(e.target.value) })}>{[60, 90, 120].map(n => <option key={n} value={n}>{t('exams.setup.nSeconds', { n })}</option>)}</select>
        </label>
      </div>
      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
        <span>{t('exams.setup.accept')}</span>
      </label>
      <button type="button" disabled={!accepted || microphone.status === 'checking' || speakerTest} onClick={() => onStart(config)} className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{t('exams.setup.start')}</button>
    </section>
    <aside className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="preview-devices">
        <h2 id="preview-devices" className="font-semibold text-slate-900">{t('exams.setup.devices')} <span className="text-xs font-normal text-slate-500">{t('exams.setup.optional')}</span></h2>
        <div className="mt-5 border-b border-slate-100 pb-5">
          <button type="button" onClick={() => { setSpeakerDone(false); setSpeakerId(n => n + 1); setSpeakerTest(true) }} disabled={speakerTest && !speech.issue} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t('exams.setup.speakerTest')}</button>
          <p className="mt-2 text-xs leading-5 text-slate-500" role="status">{speech.issue || (speakerDone ? t('exams.setup.speakerDone') : speakerTest ? t('exams.setup.speakerPlaying') : t('exams.setup.speakerHint'))}</p>
          {speakerTest && speech.issue && <button type="button" onClick={() => setSpeakerTest(false)} className="mt-2 text-sm font-medium text-blue-700">{t('exams.setup.speakerStop')}</button>}
        </div>
        <div className="pt-5">
          <button type="button" disabled={microphone.status === 'checking'} onClick={microphone.check} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{microphone.status === 'checking' ? t('exams.setup.micChecking') : t('exams.setup.micCheck')}</button>
          <p role="status" className="mt-2 text-xs leading-5 text-slate-500">{microphone.message}</p>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="preview-how">
        <h2 id="preview-how" className="font-semibold text-slate-900">{t('exams.setup.how')}</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
          <li>{t('exams.setup.step1')}</li>
          <li>{t('exams.setup.step2')}</li>
          <li>{t('exams.setup.step3')}</li>
          <li>{t('exams.setup.step4')}</li>
        </ol>
      </section>
    </aside>
  </div>
}
