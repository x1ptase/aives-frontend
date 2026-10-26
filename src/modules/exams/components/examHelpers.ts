import axios from 'axios'
import { subjectRubricApi, type SubjectRubric } from '@/modules/questions'
import { examSessionApi } from '../api'
import type { PageResult } from '@/shared/api/types'
import type { ExamApiResponse, ExamSession, ExamSessionPatch, ExamSessionPayload, StartedExam, StudentExamStatus } from '../api'

/** Lỗi đã có thông báo tiếng Việt an toàn để hiển thị trong Feature 2. */
export class ExamUiError extends Error {}

/** Việt hóa theo mã API, không hiển thị thông báo kỹ thuật hoặc tiếng Anh từ máy chủ. */
const examErrorMessages: Readonly<Partial<Record<number, string>>> = {
  1001: 'Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra và thử lại.',
  1002: 'Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra và thử lại.',
  1003: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
  1004: 'Bạn không có quyền thực hiện thao tác này.',
  1006: 'Không tìm thấy tài khoản được yêu cầu.',
  1014: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
  1016: 'Không tìm thấy môn học được yêu cầu.',
  1101: 'Bạn chưa được phân công môn học này hoặc phân công đã bị thu hồi.',
  1201: 'Phân công đang thay đổi. Vui lòng tải lại và thử lại.',
  1300: 'Không tìm thấy phiên thi hoặc bạn không có quyền xem phiên thi này.',
  1301: 'Chỉ được sửa hoặc xóa phiên thi chưa bắt đầu.',
  1302: 'Phiên thi đã có dữ liệu bài thi liên quan nên không thể thực hiện thao tác này.',
  1303: 'Phiên thi hoặc phân công đang thay đổi. Vui lòng tải lại và thử lại.',
  1304: 'Lịch thi phải đầy đủ, bắt đầu trong tương lai và kết thúc sau bắt đầu. Tổng thời gian phiên không được nhỏ hơn thời gian mỗi sinh viên; các giới hạn phải hợp lệ.',
  1305: 'Bạn phải tạo đầy đủ Rubrics cho môn',
  1306: 'Bạn phải tạo đủ số câu hỏi chính đã được APPROVED theo cấu hình phiên thi.',
  1400: 'Không tìm thấy lượt thi sinh viên hoặc bạn không có quyền thao tác.',
  1401: 'Tài khoản được chọn không có vai trò sinh viên.',
  1402: 'Phiên thi không còn đủ khung giờ cho toàn bộ sinh viên được chọn.',
  1403: 'Lịch phiên thi hoặc lượt thi hiện có chưa hợp lệ để phân công thêm sinh viên.',
  1404: 'Lượt thi đã được sử dụng hoặc có dữ liệu cần bảo toàn nên không thể thu hồi.',
  1405: 'Không được thay đổi lịch hoặc thời gian mỗi sinh viên khi phiên đã có sinh viên được phân công.',
  1500: 'Không đủ câu hỏi hợp lệ để chuẩn bị bài thi.',
  1501: 'Rubric của môn học chưa sẵn sàng để bắt đầu thi. Vui lòng liên hệ giảng viên kiểm tra rubric và các tiêu chí: tổng điểm phải bằng 10, thứ tự phải là số dương không trùng nhau.',
  1502: 'Bộ câu hỏi đã lưu không nhất quán. Cần kiểm tra dữ liệu bài thi.',
  1503: 'Dữ liệu câu hỏi đã thay đổi. Vui lòng tải lại và thử lại.',
  1504: 'Không thể chuẩn bị bộ câu hỏi với trạng thái bài thi hiện tại.',
  1505: 'Dữ liệu bài thi đang thay đổi. Vui lòng tải lại và thử lại.',
  1506: 'Bản chụp bài thi thiếu hoặc không hợp lệ. Cần kiểm tra dữ liệu.',
  1700: 'Trạng thái bài thi không cho phép thực hiện thao tác này.',
  1701: 'Lịch lượt thi chưa hợp lệ. Vui lòng liên hệ giảng viên.',
  1702: 'Chưa đến giờ thi hoặc đã hết khung giờ được phân công.',
  1703: 'Chưa thể hoàn thành: hệ thống chưa lưu đầy đủ câu trả lời cho các câu hỏi chính. Vui lòng hoàn tất phần trả lời ở Feature 3 trước.',
  1704: 'Dữ liệu trạng thái bài thi không nhất quán. Cần kiểm tra trước khi tiếp tục.',
  1705: 'Chưa đến giờ kết thúc phiên thi nên chưa thể đóng phiên.',
  9999: 'Không thể xử lý yêu cầu lúc này. Vui lòng tải lại để kiểm tra kết quả trước khi thử lại.',
}

/** Thông báo dự phòng khi máy chủ không trả mã nghiệp vụ đã biết. */
const examHttpErrorMessages: Readonly<Partial<Record<number, string>>> = {
  400: 'Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra và thử lại.',
  401: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu được yêu cầu. Vui lòng tải lại danh sách.',
  409: 'Dữ liệu hoặc trạng thái đã thay đổi. Vui lòng tải lại trước khi thử lại.',
  422: 'Dữ liệu yêu cầu chưa đáp ứng điều kiện. Vui lòng kiểm tra và thử lại.',
  429: 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.',
}

/** Dữ liệu form giữ chuỗi để phân biệt ô rỗng với số 0 hợp lệ. */
export interface ExamSessionForm {
  /** Tiêu đề. */ title: string
  /** ID môn trong dropdown. */ subjectId: string
  /** Giờ local do trình duyệt nhập. */ scheduledStartAt: string
  /** Giờ local kết thúc. */ scheduledEndAt: string
  /** Phút mỗi slot. */ slotDurationMinutes: string
  /** Số câu chính. */ maxMainQuestions: string
  /** Số câu phụ. */ maxFollowUps: string
}

/** Định dạng thời điểm theo múi giờ trình duyệt; không chế tạo lịch cho giá trị null. */
export function formatExamTime(value: string | null | undefined): string {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Ngày giờ không hợp lệ' : date.toLocaleString()
}

/** Chuyển ISO có offset thành datetime-local, giữ tới mili giây và không đổi instant nguồn. */
export function toLocalExamTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number, length = 2) => String(n).padStart(length, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}

/** Form mới dùng cùng mặc định với backend; không tự sinh lịch hoặc quyền sở hữu. */
export function examForm(exam?: ExamSession, subjectId = ''): ExamSessionForm {
  return {
    title: exam?.title ?? '', subjectId: exam ? String(exam.subjectId) : subjectId,
    scheduledStartAt: toLocalExamTime(exam?.scheduledStartAt ?? null),
    scheduledEndAt: toLocalExamTime(exam?.scheduledEndAt ?? null),
    slotDurationMinutes: exam ? (exam.slotDurationMinutes == null ? '' : String(exam.slotDurationMinutes)) : '20',
    maxMainQuestions: String(exam?.maxMainQuestions ?? 3), maxFollowUps: String(exam?.maxFollowUps ?? 2),
  }
}

/** Chỉ nhận ID nguyên dương biểu diễn an toàn trong JavaScript. */
export function examIdentifier(value: string | number): number {
  const number = Number(value)
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(number) || number < 1) throw new ExamUiError('Mã định danh không hợp lệ.')
  return number
}

/** Validate số nguyên theo miền Integer backend, không nhận số thập phân hoặc ô trống. */
function integer(value: string, label: string, min: number): number {
  const number = Number(value)
  if (!/^\d+$/.test(value) || !Number.isInteger(number) || number < min || number > 2147483647)
    throw new ExamUiError(`${label} phải là số nguyên từ ${min} đến 2147483647.`)
  return number
}

/** Chuẩn hóa giờ local thành UTC có offset; chặn ngày sai và giờ không tồn tại khi đổi DST. */
function utcTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value)) throw new ExamUiError('Vui lòng nhập đầy đủ ngày và giờ thi.')
  const date = new Date(value)
  const parts = value.split(/[-T:.]/).map(Number)
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== parts[0] || date.getMonth() + 1 !== parts[1]
    || date.getDate() !== parts[2] || date.getHours() !== parts[3] || date.getMinutes() !== parts[4])
    throw new ExamUiError('Ngày giờ đã chọn không hợp lệ theo múi giờ trình duyệt.')
  return date.toISOString()
}

/** Tạo payload whitelist và kiểm tra phiên đủ một slot; không gửi status hoặc lecturerId. */
export function createExamPayload(form: ExamSessionForm, now = Date.now()): ExamSessionPayload {
  const title = form.title.trim()
  if (!title || title.length > 255 || title.includes('\0')) throw new ExamUiError('Tiêu đề không được để trống, vượt quá 255 ký tự hoặc chứa ký tự không hợp lệ.')
  const scheduledStartAt = utcTime(form.scheduledStartAt)
  const scheduledEndAt = utcTime(form.scheduledEndAt)
  if (Date.parse(scheduledStartAt) <= now) throw new ExamUiError('Thời gian bắt đầu phải ở tương lai.')
  if (Date.parse(scheduledEndAt) <= Date.parse(scheduledStartAt)) throw new ExamUiError('Thời gian kết thúc phải sau thời gian bắt đầu.')
  const slotDurationMinutes = integer(form.slotDurationMinutes, 'Thời gian mỗi sinh viên', 1)
  if (Date.parse(scheduledEndAt) - Date.parse(scheduledStartAt) < slotDurationMinutes * 60_000)
    throw new ExamUiError('Thời gian mỗi sinh viên không được vượt quá tổng thời gian phiên thi.')
  return { title, subjectId: examIdentifier(form.subjectId), scheduledStartAt, scheduledEndAt,
    slotDurationMinutes,
    maxMainQuestions: integer(form.maxMainQuestions, 'Số câu hỏi chính', 1),
    maxFollowUps: integer(form.maxFollowUps, 'Số câu hỏi bổ sung', 0) }
}

/** Kiểm tra rubric cấp môn bằng điểm nguyên theo phần trăm điểm để tránh sai số cộng số thực. */
export function requireCompleteSubjectRubric(data: { code: number; result: SubjectRubric }, subjectId: number): void {
  const reject = () => { throw new ExamUiError('Bạn phải tạo đầy đủ Rubrics cho môn') }
  const rubric = data?.result
  if (data?.code !== 1000 || !rubric || Number(rubric.subjectId) !== subjectId || !Array.isArray(rubric.criteria) || rubric.criteria.length === 0) reject()
  const ids = new Set<number>()
  const orders = new Set<number>()
  let total = 0
  try { examIdentifier(rubric.id) } catch { reject() }
  for (const criterion of rubric.criteria) {
    if (!criterion) reject()
    let id = 0
    try { id = examIdentifier(criterion.id) } catch { reject() }
    const points = criterion.pointWeight
    const cents = Math.round(points * 100)
    if (ids.has(id) || typeof criterion.criterionText !== 'string' || !criterion.criterionText.trim() || criterion.criterionText.includes('\0')
      || typeof points !== 'number' || !Number.isFinite(points) || points <= 0 || points > 10 || Math.abs(points * 100 - cents) > 1e-8
      || typeof criterion.isMandatory !== 'boolean' || !Number.isSafeInteger(criterion.displayOrder) || criterion.displayOrder < 1
      || orders.has(criterion.displayOrder)) reject()
    ids.add(id); orders.add(criterion.displayOrder); total += cents
  }
  if (total !== 1000) reject()
}

/** Chặn ở FE trước POST; BE vẫn kiểm tra lại dưới khóa nếu rubric thay đổi giữa hai request. */
export async function createExamWithRubricCheck(payload: ExamSessionPayload) {
  try {
    const { data } = await subjectRubricApi.getBySubject(payload.subjectId)
    requireCompleteSubjectRubric(data, payload.subjectId)
  } catch (cause) {
    if (axios.isAxiosError(cause) && cause.response?.data?.code === 1600)
      throw new ExamUiError('Bạn phải tạo đầy đủ Rubrics cho môn')
    throw cause
  }
  return examSessionApi.create(payload)
}

/** Chỉ gửi giá trị thay đổi, tránh làm tròn lịch nguồn hoặc ghi đè lịch đã khóa khi sửa tiêu đề. */
export function updateExamPayload(form: ExamSessionForm, original: ExamSession): ExamSessionPatch {
  const next = createExamPayload(form)
  const patch: ExamSessionPatch = {}
  if (next.title !== original.title) patch.title = next.title
  if (form.scheduledStartAt !== toLocalExamTime(original.scheduledStartAt)) patch.scheduledStartAt = next.scheduledStartAt
  if (form.scheduledEndAt !== toLocalExamTime(original.scheduledEndAt)) patch.scheduledEndAt = next.scheduledEndAt
  if (next.slotDurationMinutes !== original.slotDurationMinutes) patch.slotDurationMinutes = next.slotDurationMinutes
  if (next.maxMainQuestions !== original.maxMainQuestions) patch.maxMainQuestions = next.maxMainQuestions
  if (next.maxFollowUps !== original.maxFollowUps) patch.maxFollowUps = next.maxFollowUps
  return patch
}

/** Không biến payload lỗi hoặc envelope khác hợp đồng thành danh sách rỗng giả. */
export function examPage<T>(data: ExamApiResponse<PageResult<T>>): PageResult<T> {
  const page = data?.result
  if (data?.code !== 1000 || !page || !Array.isArray(page.items) || !Number.isInteger(page.page) || page.page < 0
    || !Number.isInteger(page.size) || page.size < 1 || !Number.isInteger(page.totalElements) || page.totalElements < 0
    || !Number.isInteger(page.totalPages) || page.totalPages < 0) throw new ExamUiError('Dữ liệu phiên thi trả về không hợp lệ. Vui lòng tải lại trang.')
  return page
}

/** Chỉ hiển thị lỗi tiếng Việt đã kiểm soát; timeout không đồng nghĩa yêu cầu ghi chưa được lưu. */
export function examError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Chưa thể xác nhận kết quả từ máy chủ. Vui lòng tải lại để kiểm tra trước khi thử lại; kiểm tra kết nối máy chủ ứng dụng và việc cập nhật cấu trúc cơ sở dữ liệu.'
    const code = error.response.data?.code
    // Chỉ nhận mẫu tiếng Việt cố định với số nguyên dương; không hiển thị chuỗi lỗi máy chủ tùy ý.
    if (code === 1306) {
      const message: unknown = error.response.data?.message
      const match = typeof message === 'string' ? /^Bạn phải tạo đủ ([1-9]\d{0,9}) số câu hỏi chính đã được APPROVED$/.exec(message) : null
      const required = match ? Number(match[1]) : 0
      if (Number.isSafeInteger(required) && required > 0 && required <= 2147483647)
        return `Bạn phải tạo đủ ${required} số câu hỏi chính đã được APPROVED`
      return examErrorMessages[1306]!
    }
    const businessMessage = typeof code === 'number' ? examErrorMessages[code] : undefined
    if (businessMessage) return businessMessage
    const httpMessage = examHttpErrorMessages[error.response.status]
    if (httpMessage) return httpMessage
    if (error.response.status >= 500) return examErrorMessages[9999] ?? fallback
    return fallback
  }
  return error instanceof ExamUiError ? error.message : fallback
}

/** Nhãn hiển thị riêng, giữ nguyên enum gửi/nhận API. */
export function studentExamStatusLabel(status: StudentExamStatus): string {
  return { ASSIGNED: 'Chưa thi', IN_PROGRESS: 'Đang thi', COMPLETED: 'Đã hoàn thành',
    ABSENT: 'Vắng thi', EXPIRED: 'Hết giờ — chưa hoàn thành' }[status]
}

/** Kiểm tra và whitelist đề Start trước khi hiển thị; không giữ field chấm điểm ngoài hợp đồng. */
export function startedExam(data: ExamApiResponse<StartedExam>, expectedId: number): StartedExam {
  const attempt = data?.result?.attempt
  const questions = data?.result?.questions
  if (data?.code !== 1000 || !attempt || attempt.id !== expectedId || !Number.isSafeInteger(attempt.sessionId)
    || attempt.sessionId < 1 || attempt.status !== 'IN_PROGRESS' || attempt.sessionStatus !== 'ONGOING'
    || !attempt.startedAt || !attempt.deadlineAt || !Number.isFinite(Date.parse(attempt.startedAt))
    || !Number.isFinite(Date.parse(attempt.deadlineAt)) || Date.parse(attempt.deadlineAt) <= Date.parse(attempt.startedAt)
    || attempt.completedAt !== null || !Array.isArray(questions) || questions.length === 0
    || new Set(questions.map(question => question?.studentExamQuestionId)).size !== questions.length)
    throw new ExamUiError('Phản hồi bắt đầu thi không hợp lệ. Vui lòng tải lại danh sách để kiểm tra kết quả trước khi thử lại.')
  return {
    attempt: { id: attempt.id, sessionId: attempt.sessionId, status: attempt.status, sessionStatus: attempt.sessionStatus,
      startedAt: attempt.startedAt, completedAt: attempt.completedAt, deadlineAt: attempt.deadlineAt },
    questions: questions.map((question, index) => {
      if (!question || !Number.isSafeInteger(question.studentExamQuestionId) || question.studentExamQuestionId < 1
        || question.questionOrder !== index + 1 || typeof question.content !== 'string' || !question.content.trim()
        || (question.answerTimeLimitSeconds !== null && (!Number.isSafeInteger(question.answerTimeLimitSeconds) || question.answerTimeLimitSeconds < 1)))
        throw new ExamUiError('Bộ câu hỏi trả về không hợp lệ. Vui lòng tải lại danh sách trước khi tiếp tục.')
      return { studentExamQuestionId: question.studentExamQuestionId, questionOrder: question.questionOrder,
        content: question.content, answerTimeLimitSeconds: question.answerTimeLimitSeconds }
    }),
  }
}
