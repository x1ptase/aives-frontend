import { useRef, useState, type FormEvent } from 'react'
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
        throw new ExamUiError('Vui lòng chọn môn học đang được phân công cho bạn.')
      const patch = exam ? updateExamPayload(form, exam) : null
      const creation = exam ? null : createExamPayload(form)
      if (patch && Object.keys(patch).length === 0) { onClose(); return }
      submitting.current = true
      setBusy(true)
      const response = exam && patch ? await examSessionApi.update(exam.id, patch) : await createExamWithRubricCheck(creation!)
      if (response.data.code !== 1000 || !response.data.result) throw new ExamUiError('Phản hồi lưu phiên thi không hợp lệ. Vui lòng tải lại danh sách để kiểm tra kết quả.')
      feedback.notify({ title: exam ? 'Đã cập nhật phiên thi' : 'Đã tạo phiên thi', message: 'Thông tin phiên thi đã được lưu thành công.', tone: 'success' })
      onSaved()
    } catch (cause) { feedback.notify({ title: 'Không thể lưu phiên thi', message: examError(cause, 'Không thể lưu phiên thi. Vui lòng tải lại danh sách để kiểm tra kết quả trước khi thử lại.'), tone: 'error' }) }
    finally { submitting.current = false; setBusy(false) }
  }

  return <ExamDialog title={exam ? 'Edit Exam' : 'New Exam'} subtitle="Times use your browser timezone. The backend controls ownership and status."
    busy={busy} onClose={onClose}>
    <form noValidate onSubmit={submit} className="space-y-4 p-6">
      <label className="block text-sm font-semibold">Exam title
        <input autoFocus required maxLength={255} disabled={busy} className={`${inputStyle} mt-1.5`} value={form.title}
          onChange={event => setForm({ ...form, title: event.target.value })} /></label>
      <label className="block text-sm font-semibold">Subject
        <select required disabled={busy || !!exam} className={`${inputStyle} mt-1.5`} value={form.subjectId}
          onChange={event => setForm({ ...form, subjectId: event.target.value })}>
          <option value="" disabled>Select a subject</option>
          {exam ? <option value={exam.subjectId}>{exam.subjectCode} - {exam.subjectName}</option>
            : subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>)}
        </select></label>
      <p className="text-xs text-slate-500">Status: {exam?.status ?? 'UPCOMING'} (managed by the backend)</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Scheduled start
          <input required type="datetime-local" step="0.001" disabled={busy} className={`${inputStyle} mt-1.5`}
            value={form.scheduledStartAt} onChange={event => setForm({ ...form, scheduledStartAt: event.target.value })} /></label>
        <label className="block text-sm font-semibold">Scheduled end
          <input required type="datetime-local" step="0.001" disabled={busy} className={`${inputStyle} mt-1.5`}
            value={form.scheduledEndAt} onChange={event => setForm({ ...form, scheduledEndAt: event.target.value })} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {([{ key: 'slotDurationMinutes', label: 'Minutes per student', min: 1 },
          { key: 'maxMainQuestions', label: 'Main questions', min: 1 },
          { key: 'maxFollowUps', label: 'Max follow-ups', min: 0 }] as const).map(field =>
          <label key={field.key} className="block text-sm font-semibold">{field.label}
            <input required type="number" step="1" min={field.min} max={2147483647} disabled={busy} className={`${inputStyle} mt-1.5`}
              value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })} /></label>)}
      </div>
      {!exam && <p className="text-xs text-slate-500">Môn học phải có rubric hợp lệ và đủ số câu hỏi chính đã được APPROVED, chưa lưu trữ. Số tối thiểu bằng Main questions; máy chủ kiểm tra trước khi tạo phiên.</p>}
      {exam && <p className="text-xs text-slate-500">Existing student assignments lock the schedule. Once snapshots are captured, question counts are also locked. The server validates these rules.</p>}
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
        <button type="submit" disabled={busy || (!exam && subjects.length === 0)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Saving…' : exam ? 'Save Changes' : 'Create Exam'}</button>
      </div>
    </form>
  </ExamDialog>
}
