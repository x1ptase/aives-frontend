import { useEffect, useRef, useState } from 'react'
import { getMySubjects, type SubjectResponse } from '@/modules/subjects'
import type { PageResult } from '@/shared/api/types'
import { examSessionApi, type ExamSession, type ExamSessionStatus } from '../api'
import { examError, examPage, ExamUiError, formatExamTime } from '../components/examHelpers'
import ExamSessionModal from '../components/ExamSessionModal'
import StudentAssignmentsModal from '../components/StudentAssignmentsModal'
import ExamPagination from '../components/ExamPagination'
import PageContainer from '@/shared/components/common/PageContainer'
import LoadingState from '@/shared/components/common/LoadingState'
import ExamFeedbackProvider from '../components/ExamFeedbackProvider'
import { useExamFeedback } from '../components/examFeedback'

/** Quản lý phiên và sinh viên bằng API thật; quyền sở hữu/lọc danh sách thuộc backend. */
function LecturerMyExamsContent() {
  const [result, setResult] = useState<PageResult<ExamSession> | null>(null)
  const [subjects, setSubjects] = useState<SubjectResponse[]>([])
  const [subjectsError, setSubjectsError] = useState('')
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const feedback = useExamFeedback()
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  const [subjectId, setSubjectId] = useState('')
  const [status, setStatus] = useState<ExamSessionStatus | ''>('')
  const [reload, setReload] = useState(0)
  const [modal, setModal] = useState<{ exam: ExamSession | null } | null>(null)
  const [assigning, setAssigning] = useState<ExamSession | null>(null)
  const acting = useRef(false)

  useEffect(() => {
    let active = true
    setSubjectsLoading(true); setSubjectsError('')
    getMySubjects().then(items => { if (active) setSubjects(items) })
      .catch(cause => {
        if (active) {
          const message = examError(cause, 'Không thể tải danh sách môn học được phân công.')
          setSubjectsError(message); feedback.notify({ title: 'Không thể tải môn học', message, tone: 'error' })
        }
      })
      .finally(() => { if (active) setSubjectsLoading(false) })
    return () => { active = false }
  }, [reload, feedback])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    examSessionApi.getAll({ page, size: 20, subjectId: subjectId ? Number(subjectId) : undefined, status: status || undefined }, controller.signal)
      .then(response => {
        const next = examPage(response.data)
        if (page > 0 && next.items.length === 0) setPage(Math.max(0, next.totalPages - 1))
        else setResult(next)
      }).catch(cause => {
        if (!controller.signal.aborted) {
          const message = examError(cause, 'Không thể tải danh sách phiên thi. Vui lòng thử lại.')
          setError(message); feedback.notify({ title: 'Không thể tải phiên thi', message, tone: 'error' })
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, subjectId, status, reload, feedback])

  /** Kiểm tra phân công chỉ để điều khiển UI; backend vẫn quyết định quyền ghi cuối cùng. */
  const canWrite = (exam: ExamSession) => !subjectsLoading && !subjectsError && exam.status === 'UPCOMING'
    && subjects.some(subject => String(subject.id) === String(exam.subjectId))

  /** Lấy dữ liệu mới trước khi sửa hoặc xem sinh viên, không dựa trên row cache cũ. */
  const openExisting = async (exam: ExamSession, mode: 'edit' | 'students') => {
    if (acting.current) return
    acting.current = true; setBusy(true)
    try {
      const response = await examSessionApi.getById(exam.id)
      if (response.data.code !== 1000 || !response.data.result) throw new ExamUiError('Không thể đọc thông tin phiên thi. Vui lòng tải lại trước khi thử lại.')
      if (mode === 'edit') setModal({ exam: response.data.result })
      else setAssigning(response.data.result)
    } catch (cause) { feedback.notify({ title: 'Không thể mở phiên thi', message: examError(cause, 'Không thể mở phiên thi này. Vui lòng thử lại.'), tone: 'error' }) }
    finally { acting.current = false; setBusy(false) }
  }

  /** Chỉ tải lại sau khi backend xác nhận phiên chưa được dùng và đã xóa thành công. */
  const remove = async (exam: ExamSession) => {
    if (acting.current) return
    acting.current = true
    try {
      if (!await feedback.confirm({ title: 'Xóa phiên thi?', message: `Bạn muốn xóa phiên "${exam.title}"? Phiên đã có sinh viên hoặc dữ liệu bài thi không được phép xóa.`, confirmLabel: 'Xóa phiên thi', tone: 'error' })) return
      setBusy(true)
      await examSessionApi.delete(exam.id); setReload(value => value + 1)
      feedback.notify({ title: 'Đã xóa phiên thi', message: `Đã xóa phiên "${exam.title}".`, tone: 'success' })
    }
    catch (cause) { feedback.notify({ title: 'Không thể xóa phiên thi', message: examError(cause, 'Không thể xóa phiên thi. Vui lòng tải lại danh sách để kiểm tra kết quả trước khi thử lại.'), tone: 'error' }) }
    finally { acting.current = false; setBusy(false) }
  }

  /** Chủ phiên xác nhận đóng; server phân loại vắng/hết giờ và quyết định đủ điều kiện thời gian. */
  const closeSession = async (exam: ExamSession) => {
    if (acting.current) return
    acting.current = true
    try {
      if (!await feedback.confirm({ title: 'Đóng phiên thi?', message: `Đóng phiên "${exam.title}"? Chỉ được đóng sau giờ kết thúc. Người chưa thi sẽ được ghi vắng; lượt chưa hoàn thành sẽ được ghi hết giờ. Dữ liệu đã lưu được giữ nguyên.`, confirmLabel: 'Đóng phiên', tone: 'error' })) return
      setBusy(true)
      const { data } = await examSessionApi.close(exam.id)
      if (data.code !== 1000 || data.result?.sessionId !== exam.id || data.result.status !== 'COMPLETED'
        || ![data.result.completedCount, data.result.absentCount, data.result.expiredCount].every(value => Number.isSafeInteger(value) && value >= 0))
        throw new ExamUiError('Phản hồi đóng phiên không hợp lệ. Vui lòng tải lại danh sách để kiểm tra kết quả.')
      feedback.notify({ title: 'Đã đóng phiên thi', message: `${data.result.completedCount} hoàn thành, ${data.result.absentCount} vắng thi, ${data.result.expiredCount} hết giờ chưa hoàn thành.`, tone: 'success' })
    } catch (cause) { feedback.notify({ title: 'Không thể đóng phiên thi', message: examError(cause, 'Không thể đóng phiên thi. Vui lòng tải lại danh sách để kiểm tra kết quả trước khi thử lại.'), tone: 'error' }) }
    finally { acting.current = false; setBusy(false); setReload(value => value + 1) }
  }

  return <PageContainer title="My Exams" subtitle="Manage exam sessions, student assignments and scheduled slots.">
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filter by subject" disabled={busy} value={subjectId} onChange={event => { setSubjectId(event.target.value); setPage(0) }} className="max-w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">All subjects</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>)}
          </select>
          <select aria-label="Filter by status" disabled={busy} value={status} onChange={event => { setStatus(event.target.value as ExamSessionStatus | ''); setPage(0) }} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">All statuses</option>{(['UPCOMING', 'ONGOING', 'COMPLETED'] as const).map(value => <option key={value}>{value}</option>)}
          </select>
          <button type="button" disabled={busy || loading} onClick={() => setReload(value => value + 1)} className="rounded-lg border px-3 py-2 text-sm">Refresh</button>
        </div>
        <button type="button" disabled={busy || subjectsLoading || !!subjectsError || subjects.length === 0} onClick={() => setModal({ exam: null })}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">+ New Exam</button>
      </div>
      {subjectsError && <button type="button" onClick={() => setReload(value => value + 1)} className="m-5 rounded-lg border px-4 py-2 text-sm">Thử tải lại môn học</button>}
      {!subjectsLoading && !subjectsError && subjects.length === 0 && <p className="m-5 text-sm text-amber-800">Bạn chưa được phân công môn học. Vui lòng liên hệ quản trị viên để được phân công trước khi tạo phiên thi. Bạn vẫn có thể xem các phiên đã tạo.</p>}
      {loading ? <LoadingState /> : error ? <div className="py-8 text-center"><button type="button" onClick={() => setReload(value => value + 1)} className="rounded-lg border px-4 py-2 text-sm">Thử tải lại phiên thi</button></div>
        : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Exam title</th><th className="px-5 py-4">Subject</th><th className="px-5 py-4">Schedule</th><th className="px-5 py-4">Status / Config</th><th className="px-5 py-4">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{result?.items.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No exam sessions found.</td></tr>}
            {result?.items.map(exam => <tr key={exam.id} className="hover:bg-slate-50/50">
              <td className="px-5 py-4 font-semibold">{exam.title}<div className="mt-1 text-xs font-normal text-slate-500">#{exam.id} · Created {formatExamTime(exam.createdAt)}</div></td>
              <td className="px-5 py-4">{exam.subjectCode}<div className="text-xs text-slate-500">{exam.subjectName}</div></td>
              <td className="px-5 py-4 text-xs">{formatExamTime(exam.scheduledStartAt)}<div>{formatExamTime(exam.scheduledEndAt)}</div><div className="mt-1 text-slate-500">{exam.slotDurationMinutes == null ? 'No slot duration' : exam.slotDurationMinutes + ' min / student'}</div></td>
              <td className="px-5 py-4"><span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold">{exam.status}</span><div className="mt-2 text-xs text-slate-500">Main: {exam.maxMainQuestions} · Follow-ups: {exam.maxFollowUps}</div></td>
              <td className="px-5 py-4"><div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => openExisting(exam, 'students')} className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-40">Manage Students</button>
                <button type="button" disabled={busy || !canWrite(exam)} onClick={() => openExisting(exam, 'edit')} className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-40">Edit</button>
                <button type="button" disabled={busy || !canWrite(exam)} onClick={() => remove(exam)} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40">Delete</button>
                {exam.status !== 'COMPLETED' && <button type="button" disabled={busy || subjectsLoading || !!subjectsError || !subjects.some(subject => String(subject.id) === String(exam.subjectId))}
                  onClick={() => closeSession(exam)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40">Đóng phiên</button>}
              </div></td>
            </tr>)}</tbody>
        </table></div>}
      {result && <div className="px-5"><ExamPagination page={page} totalPages={result.totalPages} totalElements={result.totalElements} busy={busy || loading} onChange={setPage} /></div>}
    </div>
    <p className="mt-4 text-xs text-slate-500">Sinh viên bắt đầu lượt thi trong khung giờ đã gán; đề và rubric được chốt bằng snapshot. Chỉ đóng phiên sau giờ kết thúc; vắng thi và hết giờ không được tính là đã hoàn thành bài.</p>
    {modal && <ExamSessionModal exam={modal.exam} subjects={subjects} onClose={() => setModal(null)} onSaved={() => { setModal(null); setReload(value => value + 1) }} />}
    {assigning && <StudentAssignmentsModal exam={assigning} canWrite={canWrite(assigning)} onClose={() => { setAssigning(null); setReload(value => value + 1) }} />}
  </PageContainer>
}

/** Popup thống nhất cho trang quản lý, các form con và kết quả thao tác sau khi form đóng. */
export default function LecturerMyExams() {
  return <ExamFeedbackProvider><LecturerMyExamsContent /></ExamFeedbackProvider>
}
