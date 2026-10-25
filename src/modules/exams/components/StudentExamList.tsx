import { useEffect, useRef, useState } from 'react'
import type { PageResult } from '@/shared/api/types'
import PageContainer from '@/shared/components/common/PageContainer'
import SectionCard from '@/shared/components/common/SectionCard'
import LoadingState from '@/shared/components/common/LoadingState'
import EmptyState from '@/shared/components/common/EmptyState'
import { studentExamApi, type MyStudentExam, type StartedExam } from '../api'
import { examError, examPage, formatExamTime, startedExam, studentExamStatusLabel } from './examHelpers'
import ExamPagination from './ExamPagination'
import ExamAttemptModal from './ExamAttemptModal'
import ExamFeedbackProvider from './ExamFeedbackProvider'
import { useExamFeedback } from './examFeedback'

/** Lịch cá nhân có phân trang; không đoán endpoint Start/chấm điểm hoặc hiện dữ liệu nội bộ. */
function StudentExamListContent({ title, subtitle }: {
  /** Tiêu đề trang hiện có. */ title: string
  /** Mô tả đúng phạm vi dữ liệu API cung cấp. */ subtitle: string
}) {
  const [result, setResult] = useState<PageResult<MyStudentExam> | null>(null)
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const feedback = useExamFeedback()
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState<{ exam: StartedExam; title: string } | null>(null)
  const writing = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    studentExamApi.getAll({ page, size: 20 }, controller.signal).then(response => {
      const next = examPage(response.data)
      if (page > 0 && next.items.length === 0) setPage(Math.max(0, next.totalPages - 1))
      else setResult(next)
    }).catch(cause => {
      if (!controller.signal.aborted) {
        const message = examError(cause, 'Không thể tải lịch thi của bạn. Vui lòng thử lại.')
        setError(message); feedback.notify({ title: 'Không thể tải lịch thi', message, tone: 'error' })
      }
    })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, reload, feedback])

  /** Start lặp tiếp tục cùng đề; tải lại lịch cả khi mất phản hồi để không đoán trạng thái ghi. */
  const openAttempt = async (row: MyStudentExam) => {
    if (writing.current) return
    writing.current = true; setBusy(true)
    try {
      const response = await studentExamApi.start(row.id)
      setAttempt({ exam: startedExam(response.data, row.id), title: row.sessionTitle })
    } catch (cause) { feedback.notify({ title: 'Không thể bắt đầu bài thi', message: examError(cause, 'Không thể bắt đầu bài thi. Vui lòng tải lại lịch thi để kiểm tra kết quả trước khi thử lại.'), tone: 'error' }) }
    finally { writing.current = false; setBusy(false); setReload(value => value + 1) }
  }

  return <PageContainer title={title} subtitle={subtitle}>
    <SectionCard title="My exam records" action={<button type="button" disabled={loading} onClick={() => setReload(value => value + 1)} className="text-sm text-blue-600 disabled:opacity-40">Refresh</button>}>
      {loading ? <LoadingState /> : error ? <div className="py-8 text-center"><button type="button" onClick={() => setReload(value => value + 1)} className="rounded-lg border px-4 py-2 text-sm">Thử tải lại lịch thi</button></div>
        : result?.items.length === 0 ? <EmptyState message="You have no exams assigned yet." />
        : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-3">Exam / Subject</th><th className="p-3">Slot</th><th className="p-3">Scheduled time</th><th className="p-3">Session / Attempt status</th><th className="p-3">Thao tác</th></tr></thead>
          <tbody>{result?.items.map(exam => <tr key={exam.id} className="border-b border-slate-100">
            <td className="p-3 font-semibold">{exam.sessionTitle}<div className="mt-1 text-xs font-normal text-slate-500">{exam.subjectCode} - {exam.subjectName}</div></td>
            <td className="p-3">{exam.slotOrder ?? 'Not scheduled'}</td>
            <td className="p-3 text-xs">{formatExamTime(exam.scheduledStartAt)}<div>{formatExamTime(exam.scheduledEndAt)}</div></td>
            <td className="p-3 text-xs"><div>{exam.sessionStatus}</div><div className="mt-1 font-semibold">{studentExamStatusLabel(exam.status)}</div></td>
            <td className="p-3">{exam.sessionStatus !== 'COMPLETED' && (exam.status === 'ASSIGNED' || exam.status === 'IN_PROGRESS') &&
              <button type="button" disabled={busy} onClick={() => openAttempt(exam)} className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">
                {exam.status === 'IN_PROGRESS' ? 'Tiếp tục bài thi' : 'Bắt đầu thi'}</button>}</td>
          </tr>)}</tbody>
        </table></div>}
      {result && <ExamPagination page={page} totalPages={result.totalPages} totalElements={result.totalElements} busy={loading} onChange={setPage} />}
      <p className="mt-4 text-xs text-slate-500">Chỉ hiển thị lượt thi của bạn. Máy chủ kiểm tra khung giờ khi bắt đầu/hoàn thành; thời gian vào muộn không được cộng thêm. Điểm và phản hồi thuộc luồng chấm thi riêng.</p>
    </SectionCard>
    {attempt && <ExamAttemptModal exam={attempt.exam} title={attempt.title} onClose={() => { setAttempt(null); setReload(value => value + 1) }}
      onFinished={() => { setAttempt(null); setReload(value => value + 1) }} />}
  </PageContainer>
}

/** Giữ popup cấp trang khi cửa sổ làm bài được đóng hoặc hoàn thành. */
export default function StudentExamList(props: {
  /** Tiêu đề màn hình. */ title: string
  /** Mô tả màn hình. */ subtitle: string
}) {
  return <ExamFeedbackProvider><StudentExamListContent {...props} /></ExamFeedbackProvider>
}
