import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/shared/i18n'
import type { PageResult } from '@/shared/api/types'
import { studentExamApi, type EligibleStudent, type ExamSession, type StudentExamAssignment } from '../api'
import { examError, examIdentifier, examPage, ExamUiError, formatExamTime, studentExamStatusLabel } from './examHelpers'
import ExamDialog from './ExamDialog'
import ExamPagination from './ExamPagination'
import { useExamFeedback } from './examFeedback'

/** Gán một batch nguyên tử và thu hồi từng lượt riêng; không suy diễn xóa từ checkbox đã lọc. */
export default function StudentAssignmentsModal({ exam, canWrite, onClose }: {
  /** Phiên được quản lý. */ exam: ExamSession
  /** Chỉ ghi khi còn phân công môn và phiên UPCOMING. */ canWrite: boolean
  /** Đóng và quay về danh sách phiên. */ onClose: () => void
}) {
  const { t } = useTranslation()
  const [assigned, setAssigned] = useState<PageResult<StudentExamAssignment> | null>(null)
  const [eligible, setEligible] = useState<PageResult<EligibleStudent> | null>(null)
  const [assignedPage, setAssignedPage] = useState(0)
  const [eligiblePage, setEligiblePage] = useState(0)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [assignedLoading, setAssignedLoading] = useState(true)
  const [eligibleLoading, setEligibleLoading] = useState(canWrite)
  const [assignedError, setAssignedError] = useState('')
  const [eligibleError, setEligibleError] = useState('')
  const feedback = useExamFeedback()
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const writing = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    setAssignedLoading(true); setAssignedError('')
    studentExamApi.assigned(exam.id, { page: assignedPage, size: 20 }, controller.signal).then(response => {
      const page = examPage(response.data)
      if (assignedPage > 0 && page.items.length === 0) setAssignedPage(Math.max(0, page.totalPages - 1))
      else setAssigned(page)
    }).catch(cause => {
      if (!controller.signal.aborted) {
        const message = examError(cause, i18n.t('exams.assign.loadAssignedFailed'))
        setAssignedError(message); feedback.notify({ title: i18n.t('exams.assign.loadAssignedTitle'), message, tone: 'error' })
      }
    })
      .finally(() => { if (!controller.signal.aborted) setAssignedLoading(false) })
    return () => controller.abort()
  }, [exam.id, assignedPage, reload, feedback])

  useEffect(() => {
    if (!canWrite) return
    const controller = new AbortController()
    setEligibleLoading(true); setEligibleError('')
    studentExamApi.eligible({ query, page: eligiblePage, size: 20 }, controller.signal).then(response => setEligible(examPage(response.data)))
      .catch(cause => {
        if (!controller.signal.aborted) {
          const message = examError(cause, i18n.t('exams.assign.searchFailed'))
          setEligibleError(message); feedback.notify({ title: i18n.t('exams.assign.searchFailedTitle'), message, tone: 'error' })
        }
      })
      .finally(() => { if (!controller.signal.aborted) setEligibleLoading(false) })
    return () => controller.abort()
  }, [canWrite, query, eligiblePage, reload, feedback])

  /** Chọn tối đa 100 người, giữ lựa chọn khi tìm kiếm hoặc chuyển trang. */
  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else {
      if (next.size >= 100) { feedback.notify({ title: t('exams.assign.limitTitle'), message: t('exams.assign.limitMessage'), tone: 'error' }); return }
      next.add(id)
    }
    setSelected(next)
  }

  /** Đúng một POST cho toàn bộ lựa chọn; backend quyết định slot và giữ nguyên người đã có. */
  const assign = async () => {
    if (!canWrite || writing.current || selected.size === 0) return
    writing.current = true; setBusy(true)
    try {
      const response = await studentExamApi.assign(exam.id, [...selected].map(examIdentifier))
      const result = response.data.result
      if (response.data.code !== 1000 || !Array.isArray(result?.created) || !Array.isArray(result?.unchanged))
        throw new ExamUiError(t('exams.assign.invalidResponse'))
      feedback.notify({ title: t('exams.assign.processedTitle'), message: t('exams.assign.processedMessage', { created: result.created.length, unchanged: result.unchanged.length }), tone: 'success' })
      setSelected(new Set()); setReload(value => value + 1)
    } catch (cause) { feedback.notify({ title: t('exams.assign.failTitle'), message: examError(cause, t('exams.assign.failFallback')), tone: 'error' }); setReload(value => value + 1) }
    finally { writing.current = false; setBusy(false) }
  }

  /** Xác nhận thu hồi đúng StudentExam, không gửi studentId thay cho ID lượt thi. */
  const revoke = async (row: StudentExamAssignment) => {
    if (!canWrite || writing.current) return
    writing.current = true
    try {
      if (!await feedback.confirm({ title: t('exams.assign.revokeTitle'), message: t('exams.assign.revokeMessage', { name: row.studentFullName || row.studentUsername, exam: exam.title }), confirmLabel: t('exams.assign.revokeLabel'), tone: 'error' })) return
      setBusy(true)
      await studentExamApi.unassign(row.id)
      feedback.notify({ title: t('exams.assign.revokedTitle'), message: t('exams.assign.revokedMessage'), tone: 'success' }); setReload(value => value + 1)
    } catch (cause) { feedback.notify({ title: t('exams.assign.revokeFailTitle'), message: examError(cause, t('exams.assign.revokeFailFallback')), tone: 'error' }); setReload(value => value + 1) }
    finally { writing.current = false; setBusy(false) }
  }

  /** Chỉ tìm theo tên/username như hợp đồng backend, không tìm email qua API quản trị. */
  const searchStudents = (event: FormEvent) => { event.preventDefault(); setQuery(search.trim()); setEligiblePage(0) }

  return <ExamDialog title={t('exams.assign.title')} subtitle={`${exam.title} · ${exam.subjectCode} · ${t(`exams.sessionStatus.${exam.status}`, { defaultValue: exam.status })}`} busy={busy} onClose={onClose}>
    <div className="space-y-5 p-6">
      {!canWrite && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('exams.assign.readOnly')}</p>}
      {canWrite && <section aria-label={t('exams.assign.addSection')} className="space-y-3">
        <h3 className="font-semibold">{t('exams.assign.addSection')}</h3>
        <form onSubmit={searchStudents} className="flex flex-wrap gap-2">
          <input aria-label={t('exams.assign.searchAria')} maxLength={100} placeholder={t('exams.assign.searchPlaceholder')} value={search} disabled={busy}
            onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" disabled={busy} className="rounded-lg border px-4 py-2 text-sm">{t('exams.assign.search')}</button>
        </form>
        <p className="text-xs text-slate-500">{t('exams.assign.selectedNote', { count: selected.size })}</p>
        {eligibleError && <button type="button" onClick={() => setReload(value => value + 1)} className="rounded-lg border px-3 py-2 text-sm">{t('exams.assign.retrySearch')}</button>}
        {eligibleLoading ? <p role="status" className="text-sm text-slate-500">{t('exams.assign.loadingStudents')}</p>
          : !eligibleError && <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {eligible?.items.length === 0 && <p className="p-3 text-sm text-slate-500">{t('exams.assign.noMatch')}</p>}
            {eligible?.items.map(student => <label key={student.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
              <input type="checkbox" checked={selected.has(student.id)} disabled={busy} onChange={() => toggle(student.id)} />
              <span className="text-sm"><span className="font-semibold">{student.fullName || student.username}</span> <span className="text-slate-500">@{student.username}</span></span>
            </label>)}
          </div>}
        {eligible && <ExamPagination page={eligiblePage} totalPages={eligible.totalPages} totalElements={eligible.totalElements} busy={busy || eligibleLoading} onChange={setEligiblePage} />}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy || selected.size === 0} onClick={() => setSelected(new Set())} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">{t('exams.assign.clear')}</button>
          <button type="button" disabled={busy || selected.size === 0} onClick={assign} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? t('exams.assign.processing') : t('exams.assign.assignSelected')}</button>
        </div>
      </section>}
      <section aria-label={t('exams.assign.assignedSection')} className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="font-semibold">{t('exams.assign.assignedSection')}</h3>
          <button type="button" disabled={busy || assignedLoading} onClick={() => setReload(value => value + 1)} className="text-sm text-blue-600">{t('exams.assign.refresh')}</button></div>
        {assignedError && <button type="button" onClick={() => setReload(value => value + 1)} className="rounded-lg border px-3 py-2 text-sm">{t('exams.assign.retryAssigned')}</button>}
        {assignedLoading ? <p role="status" className="text-sm text-slate-500">{t('exams.assign.loadingAssignments')}</p>
          : !assignedError && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-2">{t('exams.assign.colStudent')}</th><th className="p-2">{t('exams.assign.colSlot')}</th><th className="p-2">{t('exams.assign.colSchedule')}</th><th className="p-2">{t('exams.assign.colStatus')}</th><th className="p-2">{t('exams.assign.colAction')}</th></tr></thead>
            <tbody>{assigned?.items.length === 0 && <tr><td colSpan={5} className="p-4 text-slate-500">{t('exams.assign.noneAssigned')}</td></tr>}
              {assigned?.items.map(row => <tr key={row.id} className="border-b border-slate-100">
                <td className="p-2">{row.studentFullName}<div className="text-xs text-slate-500">@{row.studentUsername}</div></td>
                <td className="p-2">{row.slotOrder ?? t('exams.time.notScheduled')}</td>
                <td className="p-2 text-xs">{formatExamTime(row.scheduledStartAt)}<div>{formatExamTime(row.scheduledEndAt)}</div></td>
                <td className="p-2">{studentExamStatusLabel(row.status)}</td><td className="p-2"><button type="button" disabled={busy || !canWrite || row.status !== 'ASSIGNED'} onClick={() => revoke(row)}
                  className="rounded bg-red-50 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40">{t('exams.assign.remove')}</button></td>
              </tr>)}</tbody>
          </table></div>}
        {assigned && <ExamPagination page={assignedPage} totalPages={assigned.totalPages} totalElements={assigned.totalElements} busy={busy || assignedLoading} onChange={setAssignedPage} />}
        <p className="text-xs text-slate-500">{t('exams.assign.assignedNote')}</p>
      </section>
      <div className="flex justify-end"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">{t('exams.assign.close')}</button></div>
    </div>
  </ExamDialog>
}
