import { useTranslation } from 'react-i18next'
import { useOralRecording } from '../hooks/useOralRecording'

/** Chỉ mở mic ở ANSWERING; phát lại, tạm dừng hoặc đổi lượt sẽ hủy audio chưa gửi. */
export default function OralRecordingControls({ turnId, enabled, blocked, valid, recorded }: {
  turnId: string | null; enabled: boolean; blocked: boolean; valid: (turn: string) => boolean; recorded: (turn: string, blob: Blob) => Promise<void>
}) {
  const { t } = useTranslation()
  const turn = turnId || 'no-turn'
  const mic = useOralRecording(turn, enabled, () => !!turnId && valid(turnId), blob => recorded(turn, blob), true)
  if (!enabled) return null
  return <div className="mb-5 text-center">
    <p role="status" className="mb-3 text-sm font-medium text-slate-700">{mic.status === 'recording' ? t('exams.recordingControls.recording') : mic.status === 'permission' ? t('exams.recordingControls.permission') : mic.status === 'sending' ? t('exams.recordingControls.sending') : t('exams.recordingControls.idle')}</p>
    <button type="button" disabled={blocked || ['permission', 'sending'].includes(mic.status)} onClick={() => void (mic.status === 'recording' ? mic.finish() : mic.start())}
      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{mic.status === 'recording' ? t('exams.recordingControls.done') : t('exams.recordingControls.start')}</button>
    {mic.error && <p role="status" className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-700">{mic.error}</p>}
    <p className="mt-3 text-xs leading-5 text-slate-500">{t('exams.recordingControls.note')}</p>
  </div>
}
