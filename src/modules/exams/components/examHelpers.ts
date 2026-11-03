import axios from 'axios'
import i18n from '@/shared/i18n'
import { formatDateTime } from '@/shared/i18n/format'
import { subjectRubricApi, type SubjectRubric } from '@/modules/questions'
import { examSessionApi } from '../api'
import type { PageResult } from '@/shared/api/types'
import type { ExamApiResponse, ExamSession, ExamSessionPatch, ExamSessionPayload, StartedExam, StudentExamStatus } from '../api'

/** Lỗi đã có thông báo tiếng Việt an toàn để hiển thị trong Feature 2. */
export class ExamUiError extends Error {}

/** Việt hóa theo mã API (khóa exams.errors.biz.<mã>), không hiển thị thông báo kỹ thuật hoặc tiếng Anh từ máy chủ. */
const examErrorCodes: ReadonlySet<number> = new Set([1001, 1002, 1003, 1004, 1006, 1014, 1016, 1101, 1201, 1300, 1301, 1302, 1303, 1304, 1305, 1306, 1400, 1401, 1402, 1403, 1404, 1405, 1500, 1501, 1502, 1503, 1504, 1505, 1506, 1700, 1701, 1702, 1703, 1704, 1705, 9999])

/** Thông báo dự phòng theo HTTP status (khóa exams.errors.http.<status>) khi máy chủ không trả mã nghiệp vụ đã biết. */
const examHttpStatuses: ReadonlySet<number> = new Set([400, 401, 403, 404, 409, 422, 429])

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
  if (!value) return i18n.t('exams.time.notScheduled')
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? i18n.t('exams.time.invalid') : formatDateTime(date)
}

/** Form chỉ hiển thị tới phút; PATCH bỏ qua ô không đổi để giữ nguyên độ chính xác lịch cũ. */
export function toLocalExamTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(number) || number < 1) throw new ExamUiError(i18n.t('exams.validation.invalidId'))
  return number
}

/** Validate số nguyên theo miền Integer backend, không nhận số thập phân hoặc ô trống. */
function integer(value: string, label: string, min: number): number {
  const number = Number(value)
  if (!/^\d+$/.test(value) || !Number.isInteger(number) || number < min || number > 2147483647)
    throw new ExamUiError(i18n.t('exams.validation.intRange', { label, min }))
  return number
}

/** Chuẩn hóa lịch được chọn thành đầu phút UTC; chặn ngày sai và giờ không tồn tại khi đổi DST. */
function utcTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value)) throw new ExamUiError(i18n.t('exams.validation.dateIncomplete'))
  const date = new Date(value)
  const parts = value.split(/[-T:.]/).map(Number)
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== parts[0] || date.getMonth() + 1 !== parts[1]
    || date.getDate() !== parts[2] || date.getHours() !== parts[3] || date.getMinutes() !== parts[4])
    throw new ExamUiError(i18n.t('exams.validation.dateInvalid'))
  date.setSeconds(0, 0)
  return date.toISOString()
}

/** Tạo payload whitelist và kiểm tra phiên đủ một slot; không gửi status hoặc lecturerId. */
export function createExamPayload(form: ExamSessionForm, now = Date.now()): ExamSessionPayload {
  return validatedExamPayload(form, now)
}

/** Lịch mới/được đổi chỉ có phút; các ô không đổi khi Edit dùng lại timestamp nguồn để kiểm tra đúng thời lượng. */
function validatedExamPayload(form: ExamSessionForm, now: number, original?: ExamSession): ExamSessionPayload {
  const title = form.title.trim()
  if (!title || title.length > 255 || title.includes('\0')) throw new ExamUiError(i18n.t('exams.validation.titleInvalid'))
  const scheduledStartAt = original?.scheduledStartAt && form.scheduledStartAt === toLocalExamTime(original.scheduledStartAt)
    ? original.scheduledStartAt : utcTime(form.scheduledStartAt)
  const scheduledEndAt = original?.scheduledEndAt && form.scheduledEndAt === toLocalExamTime(original.scheduledEndAt)
    ? original.scheduledEndAt : utcTime(form.scheduledEndAt)
  if (Date.parse(scheduledStartAt) <= now) throw new ExamUiError(i18n.t('exams.validation.startFuture'))
  if (Date.parse(scheduledEndAt) <= Date.parse(scheduledStartAt)) throw new ExamUiError(i18n.t('exams.validation.endAfterStart'))
  const slotDurationMinutes = integer(form.slotDurationMinutes, i18n.t('exams.validation.slotDurationLabel'), 1)
  if (Date.parse(scheduledEndAt) - Date.parse(scheduledStartAt) < slotDurationMinutes * 60_000)
    throw new ExamUiError(i18n.t('exams.validation.slotTooLong'))
  return { title, subjectId: examIdentifier(form.subjectId), scheduledStartAt, scheduledEndAt,
    slotDurationMinutes,
    maxMainQuestions: integer(form.maxMainQuestions, i18n.t('exams.validation.mainQuestionsLabel'), 1),
    maxFollowUps: integer(form.maxFollowUps, i18n.t('exams.validation.followUpsLabel'), 0) }
}

/** Kiểm tra rubric cấp môn bằng điểm nguyên theo phần trăm điểm để tránh sai số cộng số thực. */
export function requireCompleteSubjectRubric(data: { code: number; result: SubjectRubric }, subjectId: number): void {
  const reject = () => { throw new ExamUiError(i18n.t('exams.validation.rubricRequired')) }
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
      throw new ExamUiError(i18n.t('exams.validation.rubricRequired'))
    throw cause
  }
  return examSessionApi.create(payload)
}

/** Chỉ gửi giá trị thay đổi, tránh làm tròn lịch nguồn hoặc ghi đè lịch đã khóa khi sửa tiêu đề. */
export function updateExamPayload(form: ExamSessionForm, original: ExamSession): ExamSessionPatch {
  const next = validatedExamPayload(form, Date.now(), original)
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
    || !Number.isInteger(page.totalPages) || page.totalPages < 0) throw new ExamUiError(i18n.t('exams.validation.pageInvalid'))
  return page
}

/** Chỉ hiển thị lỗi tiếng Việt đã kiểm soát; timeout không đồng nghĩa yêu cầu ghi chưa được lưu. */
export function examError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return i18n.t('exams.errors.noResponse')
    const code = error.response.data?.code
    // Chỉ nhận mẫu tiếng Việt cố định với số nguyên dương; không hiển thị chuỗi lỗi máy chủ tùy ý.
    if (code === 1306) {
      const message: unknown = error.response.data?.message
      const match = typeof message === 'string' ? /^Bạn phải tạo đủ ([1-9]\d{0,9}) số câu hỏi chính đã được APPROVED$/.exec(message) : null
      const required = match ? Number(match[1]) : 0
      if (Number.isSafeInteger(required) && required > 0 && required <= 2147483647)
        return i18n.t('exams.errors.shortage', { count: required })
      return i18n.t('exams.errors.biz.1306')
    }
    if (typeof code === 'number' && examErrorCodes.has(code)) return i18n.t(`exams.errors.biz.${code}`)
    if (examHttpStatuses.has(error.response.status)) return i18n.t(`exams.errors.http.${error.response.status}`)
    if (error.response.status >= 500) return i18n.t('exams.errors.biz.9999')
    return fallback
  }
  return error instanceof ExamUiError ? error.message : fallback
}

/** Nhãn hiển thị riêng, giữ nguyên enum gửi/nhận API. */
export function studentExamStatusLabel(status: StudentExamStatus): string {
  return i18n.t(`exams.studentStatus.${status}`)
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
    throw new ExamUiError(i18n.t('exams.validation.startInvalid'))
  return {
    attempt: { id: attempt.id, sessionId: attempt.sessionId, status: attempt.status, sessionStatus: attempt.sessionStatus,
      startedAt: attempt.startedAt, completedAt: attempt.completedAt, deadlineAt: attempt.deadlineAt },
    questions: questions.map((question, index) => {
      if (!question || !Number.isSafeInteger(question.studentExamQuestionId) || question.studentExamQuestionId < 1
        || question.questionOrder !== index + 1 || typeof question.content !== 'string' || !question.content.trim()
        || (question.answerTimeLimitSeconds !== null && (!Number.isSafeInteger(question.answerTimeLimitSeconds) || question.answerTimeLimitSeconds < 1)))
        throw new ExamUiError(i18n.t('exams.validation.questionsInvalid'))
      return { studentExamQuestionId: question.studentExamQuestionId, questionOrder: question.questionOrder,
        content: question.content, answerTimeLimitSeconds: question.answerTimeLimitSeconds }
    }),
  }
}
