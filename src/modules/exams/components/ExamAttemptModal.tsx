import { useRef, useState } from 'react'
import { studentExamApi, type StartedExam } from '../api'
import { examError, ExamUiError, formatExamTime } from './examHelpers'
import ExamDialog from './ExamDialog'
import { useExamFeedback } from './examFeedback'

/** Hiển thị đề snapshot và cổng Finish; không giả lập lưu bài hoặc chấm điểm của Feature 3/4. */
export default function ExamAttemptModal({ exam, title, onClose, onFinished }: {
  /** Đề đã được máy chủ xác nhận bắt đầu. */ exam: StartedExam
  /** Tên phiên từ lịch thi của sinh viên. */ title: string
  /** Đóng cửa sổ không đồng nghĩa nộp bài hoặc dừng đồng hồ. */ onClose: () => void
  /** Tải lại lịch sau khi máy chủ xác nhận hoàn thành. */ onFinished: () => void
}) {
  const [busy, setBusy] = useState(false)
  const feedback = useExamFeedback()
  const writing = useRef(false)

  /** Finish chỉ xác nhận dữ liệu Feature 3 đã lưu; không gửi câu trả lời hoặc điểm trong body. */
  const finish = async () => {
    if (writing.current) return
    writing.current = true
    try {
      if (!await feedback.confirm({ title: 'Hoàn thành bài thi?', message: 'Hệ thống chỉ chấp nhận khi Feature 3 đã lưu đủ câu trả lời. Sau khi hoàn thành, bạn không thể tiếp tục sửa bài.', confirmLabel: 'Hoàn thành bài thi' })) return
      setBusy(true)
      const { data } = await studentExamApi.finish(exam.attempt.id)
      if (data.code !== 1000 || data.result?.id !== exam.attempt.id || data.result.status !== 'COMPLETED' || !data.result.completedAt)
        throw new ExamUiError('Phản hồi hoàn thành bài thi không hợp lệ. Vui lòng tải lại lịch thi để kiểm tra kết quả.')
      feedback.notify({ title: 'Đã hoàn thành bài thi', message: 'Hệ thống đã ghi nhận thời điểm hoàn thành. Kết quả chấm điểm được xử lý ở luồng riêng.', tone: 'success' })
      onFinished()
    } catch (cause) { feedback.notify({ title: 'Chưa thể hoàn thành bài thi', message: examError(cause, 'Không thể hoàn thành bài thi. Vui lòng tải lại lịch thi để kiểm tra kết quả trước khi thử lại.'), tone: 'error' }) }
    finally { writing.current = false; setBusy(false) }
  }

  return <ExamDialog title={title} subtitle="Đề thi đã chốt — đang thực hiện" busy={busy} onClose={onClose}>
    <div className="space-y-5 p-6">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Bắt đầu thực tế</dt><dd className="mt-1 font-semibold">{formatExamTime(exam.attempt.startedAt)}</dd></div>
        <div><dt className="text-slate-500">Hạn hoàn thành</dt><dd className="mt-1 font-semibold">{formatExamTime(exam.attempt.deadlineAt)}</dd></div>
      </dl>
      <p className="text-sm text-slate-600">Vào muộn hoặc đóng cửa sổ này không gia hạn thời gian. Câu trả lời phải được Feature 3 lưu trước khi hoàn thành; màn hình này không nhập bài thay cho Feature 3.</p>
      <ol className="divide-y divide-slate-200">
        {exam.questions.map(question => <li key={question.studentExamQuestionId} className="space-y-2 py-4">
          <h3 className="text-sm font-semibold">Câu {question.questionOrder}</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{question.content}</p>
          {question.answerTimeLimitSeconds !== null && <p className="text-xs text-slate-500">Giới hạn riêng: {question.answerTimeLimitSeconds} giây; không vượt quá hạn hoàn thành.</p>}
        </li>)}
      </ol>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Quay lại lịch thi</button>
        <button type="button" disabled={busy} onClick={finish} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Hoàn thành bài thi'}</button>
      </div>
    </div>
  </ExamDialog>
}
