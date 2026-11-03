import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/shared/i18n'
import { Link } from 'react-router-dom'
import type { PageResult } from '@/shared/api/types'
import PageContainer from '@/shared/components/common/PageContainer'
import SectionCard from '@/shared/components/common/SectionCard'
import LoadingState from '@/shared/components/common/LoadingState'
import EmptyState from '@/shared/components/common/EmptyState'
import { studentExamApi, type MyStudentExam } from '../api'
import { examError, examPage, formatExamTime, studentExamStatusLabel } from './examHelpers'
import ExamPagination from './ExamPagination'
import ExamFeedbackProvider from './ExamFeedbackProvider'
import { useExamFeedback } from './examFeedback'

/** Lịch cá nhân có phân trang; không đoán endpoint Start/chấm điểm hoặc hiện dữ liệu nội bộ. */
function StudentExamListContent({ title, subtitle, showOralPreview = false }: {
  /** Tiêu đề trang hiện có. */ title: string
  /** Mô tả đúng phạm vi dữ liệu API cung cấp. */ subtitle: string
  /** Lối vào bản thử Feature 3, tách biệt khỏi thao tác bắt đầu thi thật. */ showOralPreview?: boolean
}) {
  const { t } = useTranslation()
  const [result, setResult] = useState<PageResult<MyStudentExam> | null>(null)
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const feedback = useExamFeedback()
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    studentExamApi.getAll({ page, size: 20 }, controller.signal).then(response => {
      const next = examPage(response.data)
      if (page > 0 && next.items.length === 0) setPage(Math.max(0, next.totalPages - 1))
      else setResult(next)
    }).catch(cause => {
      if (!controller.signal.aborted) {
        const message = examError(cause, i18n.t('exams.list.loadFailed'))
        setError(message); feedback.notify({ title: i18n.t('exams.list.loadFailedTitle'), message, tone: 'error' })
      }
    })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, reload, feedback])

  return <PageContainer title={title} subtitle={subtitle}>
    {showOralPreview && <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-white p-5">
      <div><p className="text-sm font-semibold text-slate-900">{t('exams.list.previewTitle')}</p><p className="mt-1 text-xs leading-5 text-slate-500">{t('exams.list.previewDesc')}</p></div>
      <Link to="/student/exams/oral-preview" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{t('exams.list.previewLink')}</Link>
    </div>}
    <SectionCard title={t('exams.list.records')} action={<button type="button" disabled={loading} onClick={() => setReload(value => value + 1)} className="text-sm text-blue-600 disabled:opacity-40">{t('exams.list.refresh')}</button>}>
      {loading ? <LoadingState /> : error ? <div className="py-8 text-center"><button type="button" onClick={() => setReload(value => value + 1)} className="rounded-lg border px-4 py-2 text-sm">{t('exams.list.reload')}</button></div>
        : result?.items.length === 0 ? <EmptyState message={t('exams.list.empty')} />
        : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-3">{t('exams.list.colExam')}</th><th className="p-3">{t('exams.list.colSlot')}</th><th className="p-3">{t('exams.list.colTime')}</th><th className="p-3">{t('exams.list.colStatus')}</th><th className="p-3">{t('exams.list.colAction')}</th></tr></thead>
          <tbody>{result?.items.map(exam => <tr key={exam.id} className="border-b border-slate-100">
            <td className="p-3 font-semibold">{exam.sessionTitle}<div className="mt-1 text-xs font-normal text-slate-500">{exam.subjectCode} - {exam.subjectName}</div></td>
            <td className="p-3">{exam.slotOrder ?? t('exams.time.notScheduled')}</td>
            <td className="p-3 text-xs">{formatExamTime(exam.scheduledStartAt)}<div>{formatExamTime(exam.scheduledEndAt)}</div></td>
            <td className="p-3 text-xs"><div>{t(`exams.sessionStatus.${exam.sessionStatus}`)}</div><div className="mt-1 font-semibold">{studentExamStatusLabel(exam.status)}</div></td>
            <td className="p-3">{exam.sessionStatus !== 'COMPLETED' && (exam.status === 'ASSIGNED' || exam.status === 'IN_PROGRESS') &&
              <Link to={`/student/exams/${exam.id}/oral`} state={{ title: exam.sessionTitle }} className="inline-block rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {exam.status === 'IN_PROGRESS' ? t('exams.list.continue') : t('exams.list.begin')}</Link>}</td>
          </tr>)}</tbody>
        </table></div>}
      {result && <ExamPagination page={page} totalPages={result.totalPages} totalElements={result.totalElements} busy={loading} onChange={setPage} />}
      <p className="mt-4 text-xs text-slate-500">{t('exams.list.note')}</p>
    </SectionCard>
  </PageContainer>
}

/** Giữ popup cấp trang khi cửa sổ làm bài được đóng hoặc hoàn thành. */
export default function StudentExamList(props: {
  /** Tiêu đề màn hình. */ title: string
  /** Mô tả màn hình. */ subtitle: string
  /** Chỉ hiển thị ở lịch thi hiện tại, không hiển thị ở lịch sử. */ showOralPreview?: boolean
}) {
  return <ExamFeedbackProvider><StudentExamListContent {...props} /></ExamFeedbackProvider>
}
