import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '@/shared/i18n/format'
import type { SubjectResponse } from '@/modules/subjects'
import Dialog from '@/shared/components/common/Dialog'
import { useFeedback } from '@/shared/components/common/feedback'
import { subjectRubricApi, type SubjectRubric } from '../api'
import { parseSubjectRubric, rubricCreatePayload, rubricError, rubricForm, rubricIdentifier, rubricTotal, rubricUpdatePayload } from './rubricHelpers'

/** Form rubric cấp môn, dùng API hiện có; không tự tạo rubric cho từng câu hỏi. */
export default function RubricFormModal({ subject, rubric, onClose, onSaved, onWritingChange }: {
  /** Môn được phân công, bất biến trong form. */ subject: SubjectResponse
  /** Null khi tạo mới; bản mới nhất khi sửa. */ rubric: SubjectRubric | null
  /** Đóng không tự lưu. */ onClose: () => void
  /** Tải lại sau khi server xác nhận ghi thành công. */ onSaved: () => void
  /** Khóa thao tác nền trong khi gửi request. */ onWritingChange: (writing: boolean) => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState(() => rubricForm(subject, rubric))
  const [busy, setBusy] = useState(false)
  const writing = useRef(false)
  const sequence = useRef(form.criteria.length)
  const feedback = useFeedback()
  const total = rubricTotal(form.criteria)
  const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100'

  /** Chỉ đổi vị trí trên form; payload lưu thứ tự liên tục, không sửa server trước khi xác nhận lưu. */
  const move = (index: number, direction: number) => {
    const next = [...form.criteria]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setForm({ ...form, criteria: next })
  }

  /** Một request ghi duy nhất, không tự retry POST khi mất phản hồi. */
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (writing.current) return
    try {
      const update = rubricUpdatePayload(form)
      const creation = rubric ? null : rubricCreatePayload(form, subject.id)
      writing.current = true; setBusy(true); onWritingChange(true)
      const response = rubric ? await subjectRubricApi.update(rubricIdentifier(rubric.id), update) : await subjectRubricApi.create(creation!)
      parseSubjectRubric(response.data, rubricIdentifier(subject.id))
      feedback.notify({ title: rubric ? t('questions.form.updatedTitle') : t('questions.form.createdTitle'),
        message: t('questions.form.saved', { code: subject.code }), tone: 'success' })
      onSaved()
    } catch (error) { feedback.notify({ title: t('questions.form.failTitle'), message: rubricError(error, t('questions.form.fail')), tone: 'error' }) }
    finally { writing.current = false; setBusy(false); onWritingChange(false) }
  }

  return <Dialog title={rubric ? t('questions.form.editDialog') : t('questions.form.createDialog')} subtitle={`${subject.code} — ${subject.name}`} busy={busy} onClose={onClose}>
    <form noValidate onSubmit={save} className="space-y-5 p-6">
      <label className="block text-sm font-semibold">{t('questions.form.name')}
        <input autoFocus required maxLength={255} disabled={busy} value={form.title} className={`${input} mt-2`}
          onChange={event => setForm({ ...form, title: event.target.value })} /></label>
      <label className="block text-sm font-semibold">{t('questions.form.description')}
        <textarea rows={3} disabled={busy} value={form.description} className={`${input} mt-2`}
          onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{t('questions.form.criteria')}</h3>
        <p aria-live="polite" className={`text-sm font-semibold ${total === 10 ? 'text-emerald-700' : 'text-amber-800'}`}>{t('questions.form.total', { value: total === null ? t('questions.form.incomplete') : formatNumber(total, { minimumFractionDigits: 2 }) })}</p>
      </div>
      <ol className="space-y-4">
        {form.criteria.map((criterion, index) => <li key={criterion.key} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t('questions.form.criterion', { n: index + 1 })}</span>
            <div className="flex gap-2">
              <button type="button" aria-label={t('questions.form.moveUp', { n: index + 1 })} disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded border px-2 py-1 text-xs disabled:opacity-40">{t('questions.form.up')}</button>
              <button type="button" aria-label={t('questions.form.moveDown', { n: index + 1 })} disabled={busy || index === form.criteria.length - 1} onClick={() => move(index, 1)} className="rounded border px-2 py-1 text-xs disabled:opacity-40">{t('questions.form.down')}</button>
              <button type="button" aria-label={t('questions.form.removeAria', { n: index + 1 })} disabled={busy || form.criteria.length === 1} onClick={() => setForm({ ...form, criteria: form.criteria.filter(row => row.key !== criterion.key) })} className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 disabled:opacity-40">{t('questions.form.remove')}</button>
            </div>
          </div>
          <label className="block text-sm">{t('questions.form.content')}
            <textarea required rows={2} disabled={busy} value={criterion.text} className={`${input} mt-1.5`}
              onChange={event => setForm({ ...form, criteria: form.criteria.map(row => row.key === criterion.key ? { ...row, text: event.target.value } : row) })} /></label>
          <div className="flex flex-wrap items-end gap-4">
            <label className="block w-36 text-sm">{t('questions.form.points')}
              <input required type="number" min="0.01" max="10" step="0.01" disabled={busy} value={criterion.points} className={`${input} mt-1.5`}
                onChange={event => setForm({ ...form, criteria: form.criteria.map(row => row.key === criterion.key ? { ...row, points: event.target.value } : row) })} /></label>
            <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" disabled={busy} checked={criterion.mandatory}
              onChange={event => setForm({ ...form, criteria: form.criteria.map(row => row.key === criterion.key ? { ...row, mandatory: event.target.checked } : row) })} />{t('questions.form.mandatory')}</label>
          </div>
        </li>)}
      </ol>
      <button type="button" disabled={busy} onClick={() => { const key = `criterion-${sequence.current++}`; setForm({ ...form, criteria: [...form.criteria, { key, text: '', points: '', mandatory: false }] }) }} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">{t('questions.form.add')}</button>
      <p className="text-xs leading-relaxed text-slate-500">{t('questions.form.note')}</p>
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold">{t('questions.form.cancel')}</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? t('questions.form.saving') : t('questions.form.save')}</button>
      </div>
    </form>
  </Dialog>
}
