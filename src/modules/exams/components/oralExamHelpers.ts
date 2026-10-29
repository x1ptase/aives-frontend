import axios from 'axios'
import type { OralAction, OralCommand, OralPhase, OralQuestionStatus, OralRuntime, OralState } from '../oralApi'
import { examError, ExamUiError } from './examHelpers'

/** Giữ whitelist đúng hợp đồng backend; không suy diễn trạng thái lạ thành thành công. */
export const oralPhases: readonly OralPhase[] = ['PREPARING', 'SPEAKING', 'ANSWERING', 'TRANSCRIBING', 'DECIDING', 'REVIEW', 'PAUSED', 'TECHNICAL_ERROR', 'COMPLETED', 'EXPIRED']
const questionStatuses: readonly OralQuestionStatus[] = ['PENDING', 'ACTIVE', 'DEFERRED', 'ANSWERED', 'NO_ANSWER', 'TECHNICAL_ERROR']
const actions: readonly OralAction[] = ['PROMPT_FINISHED', 'REPLAY', 'DEFER', 'REVISIT', 'SUBMIT', 'PAUSE', 'RESUME', 'RETRY', 'FINISH', 'HEARTBEAT']
/** Nội dung lỗi chỉ lấy từ mã đã biết, không hiện SQL hoặc phản hồi tiếng Anh của server. */
const messages: Record<number, string> = {
  1800: 'Bạn chưa bắt đầu tiến trình thi vấn đáp này.',
  1801: 'Thao tác chưa phù hợp với bước thi hiện tại. Hãy cập nhật tiến trình.',
  1802: 'Tiến trình đã thay đổi. Hãy kiểm tra câu hiện tại trước khi thao tác lại.',
  1803: 'Quyền tương tác đã hết hạn hoặc lượt thi đang được điều khiển ở tab khác. Đóng tab cũ nếu có, rồi bấm tiếp tục để nhận lại quyền.',
  1804: 'Lượt thi đã có hội thoại cũ. Vui lòng liên hệ giảng viên để kiểm tra.',
  1805: 'Kết quả xử lý giọng nói hoặc hội thoại chưa hợp lệ. Vui lòng thử lại.',
  1806: 'Database chưa được nâng cấp cho Feature 3. Vui lòng liên hệ người quản lý hệ thống.',
  1807: 'Giọng đọc chưa sẵn sàng. Vui lòng kiểm tra cấu hình hoặc API key TTS ở backend.',
  1808: 'Chưa tạo được giọng đọc. Hãy thử lại lượt hiện tại; bài thi chưa được cộng thêm thời gian.',
  1809: 'Dịch vụ giọng đọc đang bận hoặc đã hết hạn mức. Vui lòng thử lại sau.',
  1810: 'Nhận dạng giọng nói chưa sẵn sàng. Vui lòng kiểm tra cấu hình Groq ở backend.',
  1811: 'Chưa nhận dạng được câu trả lời. Đây là lỗi kỹ thuật; hãy thử lại lượt xử lý.',
  1812: 'Dịch vụ nhận dạng đang bận hoặc đã hết hạn mức. Vui lòng thử lại sau.',
  1813: 'Bản ghi âm chưa hợp lệ. Hãy ghi lại bằng micro của trình duyệt.',
  1814: 'Bản ghi của lượt xử lý đã được chốt, không thể thay bằng bản ghi khác.',
  1815: 'AI hội thoại chưa sẵn sàng. Vui lòng kiểm tra cấu hình Gemini ở backend.',
  1816: 'AI chưa quyết định được lượt hỏi tiếp theo. Transcript đã lưu; hãy thử lại lượt xử lý.',
  1817: 'AI hội thoại đang bận hoặc đã hết hạn mức. Vui lòng thử lại sau.',
}
/** Chỉ đọc mã lỗi từ envelope HTTP, không đoán theo chuỗi thông báo. */
export function oralErrorCode(cause: unknown): number | undefined {
  return axios.isAxiosError(cause) && Number.isInteger(cause.response?.data?.code) ? cause.response?.data?.code : undefined
}
/** Việt hóa lỗi nghiệp vụ và tái dùng lỗi chuẩn của Exam đã có. */
export function oralError(cause: unknown): string {
  const code = oralErrorCode(cause)
  return (code !== undefined && messages[code]) || examError(cause, 'Chưa kết nối được backend. Đồng hồ bài thi vẫn theo thời hạn máy chủ; hãy kiểm tra trạng thái trước khi gửi lại.')
}
/** Mã STT trong state chỉ hiện lời đã kiểm soát, không dùng message thô của provider. */
export function oralProcessingError(code: number): string { return messages[code] || 'Lượt xử lý gặp lỗi kỹ thuật. Hãy thử lại sau.' }
/** Mất kết nối/5xx không đủ để kết luận thao tác đã rollback; giữ payload cũ để retry. */
export function uncertainOralWrite(cause: unknown): boolean {
  return !axios.isAxiosError(cause) || !cause.response || cause.response.status >= 500
}
/** UUID ổn định, không chấp nhận dữ liệu dùng để ghép URL hoặc chọn user. */
export function oralUuid(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ExamUiError('Mã lượt tương tác không hợp lệ.')
}
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)
const integer = (value: unknown, min = 0): value is number => Number.isSafeInteger(value) && Number(value) >= min
const time = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
const remaining = (value: unknown): value is number | null => value == null || integer(value)
const invalid = (): never => { throw new ExamUiError('Backend trả tiến trình chưa hợp lệ. Không thể tiếp tục cho đến khi tải lại thành công.') }
/** Envelope bị hỏng không được hiển thị như một bài thi trống hoặc đã hoàn thành. */
function result(value: unknown): Record<string, any> {
  if (!object(value) || value.code !== 1000 || !object(value.result)) return invalid()
  return value.result
}
/** Cấu hình pipeline phải đến từ backend, không từ localStorage hoặc biến VITE. */
export function parseOralRuntime(value: unknown): OralRuntime {
  const r = result(value)
  if (!['FOUNDATION', 'LOCAL_DEMO', 'LIVE'].includes(r.mode) || typeof r.providersReady !== 'boolean' || typeof r.message !== 'string' || r.message.length > 1000
    || r.mode === 'FOUNDATION' && r.providersReady) return invalid()
  if (r.mode === 'LIVE' && (!r.providersReady || r.speechReady !== true || r.transcriptionReady !== true || r.audioStorageReady !== true)) return invalid()
  if (['speechReady', 'transcriptionReady', 'audioStorageReady'].some(key => r[key] != null && typeof r[key] !== 'boolean')) return invalid()
  return { mode: r.mode, providersReady: r.providersReady, message: r.message, speechReady: r.speechReady === true, transcriptionReady: r.transcriptionReady === true, audioStorageReady: r.audioStorageReady === true }
}
/** Kiểm tra scope, thứ tự, UUID và đồng hồ trước khi dùng response điều khiển phòng thi. */
export function parseOralState(value: unknown, expectedId: number): OralState {
  const r = result(value)
  if (r.studentExamId !== expectedId || !integer(r.revision) || !integer(r.mainCount, 1) || !oralPhases.includes(r.phase)
    || !['IN_PROGRESS', 'COMPLETED', 'EXPIRED'].includes(r.status) || !time(r.serverTime) || !time(r.deadline) || !time(r.leaseUntil)
    || !integer(r.followUpsUsed) || !integer(r.maxFollowUps) || r.followUpsUsed > r.maxFollowUps || !remaining(r.answerRemainingMs)
    || !Array.isArray(r.questions) || r.questions.length !== r.mainCount || !Array.isArray(r.transcripts)) return invalid()
  if (r.phase === 'COMPLETED' && r.status !== 'COMPLETED' || r.phase === 'EXPIRED' && r.status !== 'EXPIRED'
    || !['COMPLETED', 'EXPIRED'].includes(r.phase) && r.status !== 'IN_PROGRESS') return invalid()
  const inactive = ['REVIEW', 'COMPLETED', 'EXPIRED'].includes(r.phase)
  if (inactive) { if (r.currentTurnId != null || r.currentQuestionOrder != null || r.followUpIndex != null || r.language != null || r.submissionId != null) return invalid() }
  else {
    oralUuid(r.currentTurnId)
    if (!integer(r.currentQuestionOrder, 1) || r.currentQuestionOrder > r.mainCount || !integer(r.followUpIndex) || r.followUpIndex > r.followUpsUsed) return invalid()
  }
  if (r.submissionId != null) oralUuid(r.submissionId)
  if (r.audioReceived != null && typeof r.audioReceived !== 'boolean' || r.processingErrorCode != null && ![1810,1811,1812,1813,1815,1816,1817].includes(r.processingErrorCode)) return invalid()
  if (['TRANSCRIBING', 'DECIDING'].includes(r.phase) && r.submissionId == null) return invalid()
  if (r.language != null && !['vi', 'en'].includes(r.language)) return invalid()
  if (['SPEAKING', 'ANSWERING', 'TRANSCRIBING', 'DECIDING', 'PAUSED'].includes(r.phase) && r.language == null) return invalid()
  const questions = r.questions.map((q: unknown, index: number) => {
    if (!object(q) || q.questionOrder !== index + 1 || !questionStatuses.includes(q.status) || !remaining(q.answerRemainingMs)
      || q.outcomeReason != null && (typeof q.outcomeReason !== 'string' || q.outcomeReason.length > 80)) return invalid()
    return { questionOrder: q.questionOrder, status: q.status, answerRemainingMs: q.answerRemainingMs ?? null, outcomeReason: q.outcomeReason ?? null }
  })
  const transcripts = r.transcripts.map((t: unknown) => {
    if (!object(t) || !integer(t.questionOrder, 1) || t.questionOrder > r.mainCount || !integer(t.followUpIndex) || t.followUpIndex > r.followUpsUsed
      || typeof t.content !== 'string' || !t.content.trim() || t.content.length > 20000 || !time(t.savedAt) || Date.parse(t.savedAt) > Date.parse(r.serverTime)) return invalid()
    return { questionOrder: t.questionOrder, followUpIndex: t.followUpIndex, content: t.content, savedAt: t.savedAt }
  })
  if (new Set(transcripts.map(t => `${t.questionOrder}:${t.followUpIndex}`)).size !== transcripts.length) return invalid()
  if (!inactive && (questions.filter(q => q.status === 'ACTIVE').length !== 1 || questions[r.currentQuestionOrder - 1].status !== 'ACTIVE'
    || questions[r.currentQuestionOrder - 1].answerRemainingMs !== (r.answerRemainingMs ?? null))) return invalid()
  if (r.phase === 'REVIEW' && (!questions.some(q => q.status === 'DEFERRED') || questions.some(q => ['PENDING', 'ACTIVE'].includes(q.status)))) return invalid()
  if (r.phase === 'COMPLETED' && questions.some(q => !['ANSWERED', 'NO_ANSWER'].includes(q.status))) return invalid()
  return { studentExamId: r.studentExamId, status: r.status, phase: r.phase, revision: r.revision, serverTime: r.serverTime, deadline: r.deadline,
    leaseUntil: r.leaseUntil, mainCount: r.mainCount, currentQuestionOrder: r.currentQuestionOrder ?? null, currentTurnId: r.currentTurnId ?? null,
    followUpIndex: r.followUpIndex ?? null, language: r.language ?? null, followUpsUsed: r.followUpsUsed, maxFollowUps: r.maxFollowUps,
    answerRemainingMs: r.answerRemainingMs ?? null, submissionId: r.submissionId ?? null, questions, transcripts, audioReceived: r.audioReceived === true, processingErrorCode: r.processingErrorCode ?? null }
}
/** Chặn payload tùy biến trước request; không gửi transcript, thời gian hoặc điểm từ frontend. */
export function validateOralCommand(command: OralCommand): void {
  oralUuid(command.requestId); oralUuid(command.clientSessionId)
  if (command.turnId != null) oralUuid(command.turnId)
  if (!integer(command.expectedRevision) || !actions.includes(command.action) || (command.action === 'REVISIT' ? !integer(command.targetQuestionOrder, 1) : command.targetQuestionOrder != null)) throw new ExamUiError('Thao tác thi chưa hợp lệ.')
}
/** Chỉ nội suy để hiển thị; quyết định hết giờ/chuyển câu luôn thuộc backend. */
export function oralCountdown(state: OralState, elapsedMs: number): { slot: number; answer: number | null } {
  const elapsed = oralTerminal(state) ? 0 : Math.max(0, elapsedMs)
  return { slot: Math.max(0, Date.parse(state.deadline) - Date.parse(state.serverTime) - elapsed),
    answer: state.answerRemainingMs == null ? null : Math.max(0, state.answerRemainingMs - (state.phase === 'ANSWERING' ? elapsed : 0)) }
}
/** Trạng thái cuối không tự đổi sang chưa thi hoặc gọi Finish từ giao diện. */
export function oralTerminal(state: OralState): boolean { return state.phase === 'COMPLETED' || state.phase === 'EXPIRED' }
