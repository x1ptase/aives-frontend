import axiosInstance from '@/shared/api/axios'
import { examIdentifier } from './components/examHelpers'
import { parseOralRuntime, parseOralState, validateOralCommand, oralUuid } from './components/oralExamHelpers'

/** Trạng thái hội thoại do backend quyết định, không dùng reducer mô phỏng. */
export type OralPhase = 'PREPARING' | 'SPEAKING' | 'ANSWERING' | 'TRANSCRIBING' | 'DECIDING' | 'REVIEW' | 'PAUSED' | 'TECHNICAL_ERROR' | 'COMPLETED' | 'EXPIRED'
/** Kết quả thực hiện từng câu, không phải điểm. */
export type OralQuestionStatus = 'PENDING' | 'ACTIVE' | 'DEFERRED' | 'ANSWERED' | 'NO_ANSWER' | 'TECHNICAL_ERROR'
/** Các lệnh Student được backend công bố. */
export type OralAction = 'PROMPT_FINISHED' | 'REPLAY' | 'DEFER' | 'REVISIT' | 'SUBMIT' | 'PAUSE' | 'RESUME' | 'RETRY' | 'FINISH' | 'HEARTBEAT'
/** Khả năng lấy từ backend; LOCAL_DEMO chỉ được cung cấp bởi chương trình test riêng. */
export interface OralRuntime { mode: 'FOUNDATION' | 'LOCAL_DEMO' | 'LIVE'; providersReady: boolean; message: string; speechReady?: boolean; transcriptionReady?: boolean; audioStorageReady?: boolean }
/** View tối thiểu, không có nội dung đề/đáp án/rubric. */
export interface OralState {
  studentExamId: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED'
  phase: OralPhase
  revision: number
  serverTime: string
  deadline: string
  leaseUntil: string
  mainCount: number
  currentQuestionOrder: number | null
  currentTurnId: string | null
  followUpIndex: number | null
  language: 'vi' | 'en' | null
  followUpsUsed: number
  maxFollowUps: number
  answerRemainingMs: number | null
  submissionId: string | null
  questions: { questionOrder: number; status: OralQuestionStatus; answerRemainingMs: number | null; outcomeReason: string | null }[]
  transcripts: { questionOrder: number; followUpIndex: number; content: string; savedAt: string }[]
  audioReceived?: boolean
  processingErrorCode?: number | null
}
/** Giữ nguyên payload này khi retry một yêu cầu chưa biết kết quả. */
export interface OralCommand {
  requestId: string
  clientSessionId: string
  expectedRevision: number
  turnId: string | null
  action: OralAction
  targetQuestionOrder?: number
}
/** Nhánh thử chỉ gửi đến chương trình test loopback, không phải API production. */
export type OralDemoScenario = 'CLEAR' | 'BRIEF' | 'EMPTY' | 'TECHNICAL_ERROR'

/** Tải audio có bearer và timeout riêng; không đưa token vào URL hoặc dùng URL public. */
async function speech(path: string, body: object, signal?: AbortSignal): Promise<Blob> {
  try {
    const response = await axiosInstance.post(path, body, { responseType: 'blob', timeout: 45000, signal })
    const blob = response.data
    if (!(blob instanceof Blob) || !['audio/wav', 'audio/x-wav'].includes(blob.type.split(';')[0]) || blob.size < 46 || blob.size > 8 * 1024 * 1024) throw new Error('Audio chưa hợp lệ.')
    return blob
  } catch (cause: any) {
    // Axios giữ lỗi JSON ở dạng Blob khi responseType=blob; chỉ đọc envelope nhỏ, không hiện nội dung thô.
    if (cause?.response?.data instanceof Blob && cause.response.data.size <= 16000) {
      try { cause.response.data = JSON.parse(await cause.response.data.text()) } catch { /* Giữ lỗi an toàn chung. */ }
    }
    throw cause
  }
}

/** Không gửi công cụ fixture tới server bên ngoài, kể cả khi có response giả chế độ demo. */
export function isLocalOralDemo(runtime: OralRuntime | null): boolean {
  try {
    const base = new URL(axiosInstance.defaults.baseURL || 'http://localhost:8080', 'http://localhost')
    return runtime?.mode === 'LOCAL_DEMO' && runtime.providersReady && base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname)
  } catch { return false }
}

/** HTTP cùng bearer interceptor hiện có; mọi response được kiểm tra trước khi hiển thị. */
export const oralApi = {
  renewLease: async (id: number, clientSessionId: string, signal?: AbortSignal): Promise<{ serverTime: string; leaseUntil: string | null; terminal: boolean }> => {
    oralUuid(clientSessionId)
    const envelope = (await axiosInstance.post(`/student-exams/${examIdentifier(id)}/oral-examination/lease`, { clientSessionId }, { signal })).data
    const r = envelope?.result
    if (envelope?.code !== 1000 || typeof r?.serverTime !== 'string' || !Number.isFinite(Date.parse(r.serverTime))
      || r.terminal !== undefined && typeof r.terminal !== 'boolean'
      || (r.terminal === true ? r.leaseUntil !== null : typeof r.leaseUntil !== 'string' || !Number.isFinite(Date.parse(r.leaseUntil)) || Date.parse(r.leaseUntil) <= Date.parse(r.serverTime))) throw new Error('Kết quả giữ quyền chưa hợp lệ.')
    return { serverTime: r.serverTime, leaseUntil: r.leaseUntil, terminal: r.terminal === true }
  },
  uploadAudio: async (id: number, submissionId: string, metadata: { clientSessionId: string; turnId: string }, blob: Blob, signal?: AbortSignal): Promise<OralState> => {
    oralUuid(submissionId); oralUuid(metadata.clientSessionId); oralUuid(metadata.turnId)
    const form = audioForm(blob)
    form.append('metadata', new Blob([JSON.stringify({ clientSessionId: metadata.clientSessionId, turnId: metadata.turnId })], { type: 'application/json' }))
    const examId = examIdentifier(id)
    return parseOralState((await axiosInstance.post(`/student-exams/${examId}/oral-examination/submissions/${submissionId}/audio`, form,
      { signal, timeout: 20000, headers: { 'Content-Type': undefined } })).data, examId)
  },
  previewTranscription: async (language: 'vi' | 'en', blob: Blob, signal?: AbortSignal): Promise<string> => {
    if (!['vi', 'en'].includes(language)) throw new Error('Ngôn ngữ chưa được hỗ trợ.')
    const form = audioForm(blob); form.append('language', language)
    const envelope = (await axiosInstance.post('/oral-examination/transcription-preview', form, { signal, timeout: 45000, headers: { 'Content-Type': undefined } })).data
    const r = envelope?.result
    if (envelope?.code !== 1000 || !r || r.language !== language || typeof r.transcript !== 'string' || r.transcript.length > 20000 || r.hasSpeech !== !!r.transcript.trim()) throw new Error('Kết quả nhận dạng chưa hợp lệ.')
    return r.transcript
  },
  speech: async (id: number, request: Pick<OralCommand, 'clientSessionId' | 'turnId' | 'expectedRevision'>, signal?: AbortSignal): Promise<Blob> => {
    oralUuid(request.clientSessionId); oralUuid(request.turnId)
    if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) throw new Error('Phiên bản lượt hỏi không hợp lệ.')
    return speech(`/student-exams/${examIdentifier(id)}/oral-examination/speech`, { clientSessionId: request.clientSessionId, turnId: request.turnId, expectedRevision: request.expectedRevision }, signal)
  },
  previewSpeech: (language: 'vi' | 'en', signal?: AbortSignal): Promise<Blob> => {
    if (!['vi', 'en'].includes(language)) return Promise.reject(new Error('Ngôn ngữ chưa được hỗ trợ.'))
    return speech('/oral-examination/speech-preview', { language }, signal)
  },
  runtime: async (signal?: AbortSignal): Promise<OralRuntime> => parseOralRuntime((await axiosInstance.get('/oral-examination/runtime', { signal })).data),
  get: async (id: number, signal?: AbortSignal): Promise<OralState> => {
    const examId = examIdentifier(id)
    return parseOralState((await axiosInstance.get(`/student-exams/${examId}/oral-examination`, { signal })).data, examId)
  },
  open: async (id: number, clientSessionId: string): Promise<OralState> => {
    const examId = examIdentifier(id); oralUuid(clientSessionId)
    return parseOralState((await axiosInstance.post(`/student-exams/${examId}/oral-examination`, { clientSessionId })).data, examId)
  },
  action: async (id: number, command: OralCommand): Promise<OralState> => {
    const examId = examIdentifier(id); validateOralCommand(command)
    const body: OralCommand = { requestId: command.requestId, clientSessionId: command.clientSessionId, expectedRevision: command.expectedRevision, turnId: command.turnId, action: command.action }
    if (command.action === 'REVISIT') body.targetQuestionOrder = command.targetQuestionOrder
    return parseOralState((await axiosInstance.post(`/student-exams/${examId}/oral-examination/actions`, body)).data, examId)
  },
  chooseDemoScenario: async (id: number, turnId: string, scenario: OralDemoScenario, runtime: OralRuntime): Promise<void> => {
    if (!isLocalOralDemo(runtime)) throw new Error('Công cụ mô phỏng chỉ dùng với backend test cục bộ.')
    oralUuid(turnId)
    if (!['CLEAR', 'BRIEF', 'EMPTY', 'TECHNICAL_ERROR'].includes(scenario)) throw new Error('Tình huống mẫu không hợp lệ.')
    await axiosInstance.post(`/_oral-demo/student-exams/${examIdentifier(id)}/scenario`, { turnId, scenario })
  },
}

/** Không cho gửi text thay audio hoặc tải file tùy ý; boundary multipart do browser tạo. */
function audioForm(blob: Blob): FormData {
  const type = blob?.type?.split(';')[0]
  const extension = ({ 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'mp4', 'audio/wav': 'wav' } as Record<string,string>)[type]
  if (!(blob instanceof Blob) || !extension || blob.size < 128 || blob.size > 8 * 1024 * 1024) throw new Error('Bản ghi âm không hợp lệ hoặc vượt quá 8 MiB.')
  const form = new FormData(); form.append('audio', blob, `answer.${extension}`); return form
}
