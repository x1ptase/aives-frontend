import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { SubjectResponse } from '@/modules/subjects'
import { examSessionApi, type ExamSession } from '../api'
import { createExamPayload, createExamWithRubricCheck, examError, examForm, ExamUiError, updateExamPayload } from './examHelpers'
import ExamDialog from './ExamDialog'
import { useExamFeedback } from './examFeedback'

/** Form tạo/sửa phiên đúng contract; chỉ dropdown môn được phân công và không gửi trạng thái. */
export default function ExamSessionModal({ exam, subjects, onClose, onSaved }: {
  /** Phiên mới nhất khi sửa; null khi tạo. */ exam: ExamSession | null
  /** Các môn được phân công hiện hành. */ subjects: SubjectResponse[]
  /** Đóng modal không ghi dữ liệu. */ onClose: () => void
  /** Parent tải lại danh sách sau thành công. */ onSaved: () => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState(() => examForm(exam ?? undefined, String(subjects[0]?.id ?? '')))
  const [busy, setBusy] = useState(false)
  const feedback = useExamFeedback()
  const submitting = useRef(false)
  const inputStyle = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100'

  /** Kiểm tra form bằng thông báo tiếng Việt thay popup mặc định; chỉ gửi một request ghi mỗi lần. */
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting.current) return
    try {
      if (!exam && !subjects.some(subject => String(subject.id) === form.subjectId))
        throw new ExamUiError(t('exams.session.pickSubject'))
      const patch = exam ? updateExamPayload(form, exam) : null
      const creation = exam ? null : createExamPayload(form)
      if (patch && Object.keys(patch).length === 0) { onClose(); return }
      submitting.current = true
      setBusy(true)
      const response = exam && patch ? await examSessionApi.update(exam.id, patch) : await createExamWithRubricCheck(creation!)
      if (response.data.code !== 1000 || !response.data.result) throw new ExamUiError(t('exams.session.invalidResponse'))
      feedback.notify({ title: exam ? t('exams.session.updatedTitle') : t('exams.session.createdTitle'), message: t('exams.session.savedMessage'), tone: 'success' })
      onSaved()
    } catch (cause) { feedback.notify({ title: t('exams.session.failTitle'), message: examError(cause, t('exams.session.failFallback')), tone: 'error' }) }
    finally { submitting.current = false; setBusy(false) }
  }

  return <ExamDialog title={exam ? t('exams.session.editTitle') : t('exams.session.newTitle')} subtitle={t('exams.session.subtitle')}
    busy={busy} onClose={onClose}>
    <form noValidate onSubmit={submit} className="space-y-4 p-6">
      <label className="block text-sm font-semibold">{t('exams.session.examTitle')}
        <input autoFocus required maxLength={255} disabled={busy} className={`${inputStyle} mt-1.5`} value={form.title}
          onChange={event => setForm({ ...form, title: event.target.value })} /></label>
      <label className="block text-sm font-semibold">{t('exams.session.subject')}
        <select required disabled={busy || !!exam} className={`${inputStyle} mt-1.5`} value={form.subjectId}
          onChange={event => setForm({ ...form, subjectId: event.target.value })}>
          <option value="" disabled>{t('exams.session.selectSubject')}</option>
          {exam ? <option value={exam.subjectId}>{exam.subjectCode} - {exam.subjectName}</option>
            : subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>)}
        </select></label>
      <p className="text-xs text-slate-500">{t('exams.session.status', { status: t(`exams.sessionStatus.${exam?.status ?? 'UPCOMING'}`) })}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">{t('exams.session.start')}
          <input required type="datetime-local" step="60" disabled={busy} className={`${inputStyle} mt-1.5`}
            value={form.scheduledStartAt} onChange={event => setForm({ ...form, scheduledStartAt: event.target.value })} /></label>
        <label className="block text-sm font-semibold">{t('exams.session.end')}
          <input required type="datetime-local" step="60" disabled={busy} className={`${inputStyle} mt-1.5`}
            value={form.scheduledEndAt} onChange={event => setForm({ ...form, scheduledEndAt: event.target.value })} /></label>
      </div>
      <p className="text-xs text-slate-500">{t('exams.session.timeNote')}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {([{ key: 'slotDurationMinutes', label: t('exams.session.minutesPerStudent'), min: 1 },
          { key: 'maxMainQuestions', label: t('exams.session.mainQuestions'), min: 1 },
          { key: 'maxFollowUps', label: t('exams.session.maxFollowUps'), min: 0 }] as const).map(field =>
          <label key={field.key} className="block text-sm font-semibold">{field.label}
            <input required type="number" step="1" min={field.min} max={2147483647} disabled={busy} className={`${inputStyle} mt-1.5`}
              value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })} /></label>)}
      </div>
      {!exam && <p className="text-xs text-slate-500">{t('exams.session.createNote')}</p>}
      {exam && <p className="text-xs text-slate-500">{t('exams.session.editNote')}</p>}
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">{t('exams.session.cancel')}</button>
        <button type="submit" disabled={busy || (!exam && subjects.length === 0)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? t('exams.session.saving') : exam ? t('exams.session.save') : t('exams.session.create')}</button>
      </div>
    </form>
  </ExamDialog>
}
