/** Hợp đồng mô phỏng độc lập với API thi thật; không chứa đáp án hay rubric. */
export interface PreviewConfig {
  language: 'vi' | 'en' | 'mixed'
  mainCount: number
  followUpLimit: number
  slotMinutes: number
  answerSeconds: number
}

/** Các bước tương tác; PAUSED dành cho khôi phục hoặc lỗi kỹ thuật. */
export type PreviewPhase = 'SPEAKING' | 'ANSWERING' | 'PROCESSING' | 'REVIEW' | 'PAUSED' | 'COMPLETED' | 'EXPIRED'
/** Kết quả của câu chính, không phải điểm chấm. */
export type PreviewOutcome = 'PENDING' | 'ACTIVE' | 'DEFERRED' | 'ANSWERED' | 'NO_ANSWER'
/** Transcript mẫu chỉ được thêm sau khi xử lý lượt trả lời thành công. */
export interface PreviewTranscript { followUp: number; text: string }
/** Ngân sách trả lời được giữ nguyên khi nghe lại hoặc tạm bỏ qua. */
export interface PreviewQuestion {
  status: PreviewOutcome
  remainingMs: number
  followUps: number
  transcripts: PreviewTranscript[]
}
/** Dữ liệu mẫu lưu trong tab hiện tại; không mang ID lượt thi thật. */
export interface OralPreviewState {
  version: 1
  config: PreviewConfig
  phase: PreviewPhase
  current: number
  turn: number
  speechId: number
  followUpsUsed: number
  startedAt: number
  deadline: number
  lastTick: number
  clockOffset: number
  questions: PreviewQuestion[]
  pending: 'clear' | 'brief' | null
  resumePhase: 'SPEAKING' | 'ANSWERING' | 'PROCESSING'
  notice: string
}
/** Lệnh có thời điểm và mã lượt để bỏ qua callback phát âm/xử lý cũ. */
export type PreviewAction =
  | { type: 'TICK'; now: number }
  | { type: 'SPOKEN'; now: number; speechId: number }
  | { type: 'SUBMIT'; now: number; style: 'clear' | 'brief' | 'empty' }
  | { type: 'PROCESSED'; now: number; speechId: number }
  | { type: 'REPLAY' | 'DEFER' | 'RESUME' | 'FINISH' | 'PAUSE'; now: number }
  | { type: 'REVISIT'; now: number; index: number }
  | { type: 'FAIL'; now: number; message: string }
  | { type: 'FAST_FORWARD'; now: number }

/** Cấu hình mẫu cho một lượt thi, không thay đổi cấu hình của giảng viên. */
export const defaultPreviewConfig: PreviewConfig = { language: 'vi', mainCount: 3, followUpLimit: 2, slotMinutes: 5, answerSeconds: 90 }

/** Tình huống SWD392 chuẩn bị sẵn bằng hai ngôn ngữ; chỉ đưa nội dung cho giọng đọc. */
const samples = {
  vi: [
    ['Hãy giải thích mục đích của Use Case trong phân tích yêu cầu phần mềm.', 'Em có thể nêu một ví dụ cụ thể không?', 'Trong ví dụ đó, ai là tác nhân tương tác với hệ thống?'],
    ['Hãy phân biệt yêu cầu chức năng và yêu cầu phi chức năng.', 'Em có thể minh họa sự khác nhau bằng một hệ thống đặt vé không?', 'Vì sao thời gian phản hồi cần được mô tả bằng một giá trị đo được?'],
    ['Vì sao cần xác nhận yêu cầu với các bên liên quan trước khi triển khai?', 'Điều gì có thể xảy ra nếu các bên hiểu yêu cầu khác nhau?', 'Em sẽ làm rõ một yêu cầu còn mơ hồ như thế nào?'],
  ],
  en: [
    ['Explain the purpose of a use case in software requirements analysis.', 'Could you give a concrete example?', 'Who interacts with the system in your example?'],
    ['Explain the difference between functional and non-functional requirements.', 'Could you illustrate this with a ticket booking system?', 'Why should response time be expressed as a measurable value?'],
    ['Why should requirements be validated with stakeholders before implementation?', 'What happens when stakeholders interpret a requirement differently?', 'How would you clarify an ambiguous requirement?'],
  ],
}

/** Ngôn ngữ của câu đào sâu luôn theo câu chính tương ứng. */
export function previewLanguage(state: OralPreviewState): 'vi' | 'en' {
  return state.config.language === 'mixed' ? (state.current === 1 ? 'en' : 'vi') : state.config.language
}

/** Văn bản này dùng cho âm thanh, tuyệt đối không render thành danh sách đề. */
export function previewSpeech(state: OralPreviewState): string {
  const language = previewLanguage(state)
  const prefix = language === 'vi'
    ? (state.turn ? `Câu hỏi đào sâu ${state.turn}.` : `Câu số ${state.current + 1}.`)
    : (state.turn ? `Follow-up question ${state.turn}.` : `Question number ${state.current + 1}.`)
  return `${prefix} ${samples[language][state.current][state.turn]}`
}

/** Kiểm tra cấu hình ở biên form và khi khôi phục dữ liệu của tab. */
export function validPreviewConfig(value: unknown): value is PreviewConfig {
  if (!value || typeof value !== 'object') return false
  const c = value as PreviewConfig
  return ['vi', 'en', 'mixed'].includes(c.language) && [1, 2, 3].includes(c.mainCount) && [0, 1, 2].includes(c.followUpLimit)
    && [3, 5, 10].includes(c.slotMinutes) && [60, 90, 120].includes(c.answerSeconds)
}

/** Tạo phiên mô phỏng mới; thời hạn tuyệt đối không được đặt lại khi tiếp tục. */
export function createOralPreview(config: PreviewConfig, now: number): OralPreviewState {
  if (!validPreviewConfig(config)) throw new Error('Cấu hình mô phỏng không hợp lệ.')
  return { version: 1, config: { ...config }, phase: 'SPEAKING', current: 0, turn: 0, speechId: 1,
    followUpsUsed: 0, startedAt: now, deadline: now + config.slotMinutes * 60000, lastTick: now, clockOffset: 0,
    questions: Array.from({ length: config.mainCount }, (_, index) => ({ status: index ? 'PENDING' : 'ACTIVE', remainingMs: config.answerSeconds * 1000, followUps: 0, transcripts: [] })),
    pending: null, resumePhase: 'SPEAKING', notice: '' }
}

/** Chuyển câu chính; các câu tạm bỏ qua chỉ được mở lại sau lượt đầu. */
function nextQuestion(state: OralPreviewState): OralPreviewState {
  const index = state.questions.findIndex(q => q.status === 'PENDING')
  if (index < 0) return { ...state, pending: null, phase: state.questions.some(q => q.status === 'DEFERRED') ? 'REVIEW' : 'COMPLETED' }
  state.questions[index].status = 'ACTIVE'
  return { ...state, current: index, turn: 0, pending: null, phase: 'SPEAKING', speechId: state.speechId + 1 }
}

/** Đồng bộ đồng hồ trước mọi thao tác, kể cả tab chạy nền và callback trả về muộn. */
function advanceTime(state: OralPreviewState, now: number): OralPreviewState {
  if (state.phase === 'COMPLETED' || state.phase === 'EXPIRED') return state
  const time = Math.max(state.lastTick, now)
  const next = { ...state, lastTick: time, questions: state.questions.map(q => ({ ...q, transcripts: [...q.transcripts] })) }
  if (time >= state.deadline) {
    next.questions.forEach(q => { if (q.status !== 'ANSWERED') q.status = q.transcripts.length ? 'ANSWERED' : 'NO_ANSWER' })
    return { ...next, phase: 'EXPIRED', pending: null, notice: 'Đã hết thời gian lượt thi mô phỏng. Các lượt trả lời đã lưu được giữ nguyên.' }
  }
  if (state.phase === 'ANSWERING') {
    const question = next.questions[state.current]
    question.remainingMs = Math.max(0, question.remainingMs - (time - state.lastTick))
    if (question.remainingMs === 0) {
      question.status = question.transcripts.length ? 'ANSWERED' : 'NO_ANSWER'
      return nextQuestion({ ...next, notice: 'Đã hết thời gian trả lời của câu trước. Không tạo transcript cho phần chưa trả lời.' })
    }
  }
  return next
}

/** Máy trạng thái thuần giúp kiểm thử luồng trước khi nối adapter dịch vụ thật. */
export function oralPreviewReducer(previous: OralPreviewState, action: PreviewAction): OralPreviewState {
  const now = action.now + previous.clockOffset
  const state = advanceTime(previous, now)
  if (state.phase === 'COMPLETED' || state.phase === 'EXPIRED') return state
  // Nếu đồng hồ đã chuyển sang câu khác, không áp dụng thao tác cũ vào câu mới.
  if (state.current !== previous.current || state.phase !== previous.phase) return state
  const question = state.questions[state.current]
  switch (action.type) {
    case 'TICK': return state
    case 'FAST_FORWARD': return advanceTime({ ...state, clockOffset: state.clockOffset + 30000 }, now + 30000)
    case 'SPOKEN': return state.phase === 'SPEAKING' && action.speechId === state.speechId ? { ...state, phase: 'ANSWERING', notice: '' } : state
    case 'SUBMIT':
      if (state.phase !== 'ANSWERING') return state
      if (action.style === 'empty') return { ...state, notice: 'Âm thanh mẫu rỗng: chưa có câu trả lời. Bạn có thể thử lại hoặc tạm bỏ qua; đồng hồ vẫn chạy.' }
      return { ...state, phase: 'PROCESSING', pending: action.style, notice: '' }
    case 'PROCESSED': {
      if (state.phase !== 'PROCESSING' || !state.pending || action.speechId !== state.speechId) return state
      const language = previewLanguage(state)
      const text = state.pending === 'brief' ? (language === 'vi' ? 'Theo em, cần xác định rõ nhu cầu của người dùng.' : 'I think we need to identify what users need.')
        : (language === 'vi' ? 'Em sẽ xác định mục tiêu của người dùng, mô tả tương tác và kiểm tra lại với các bên liên quan bằng một tình huống cụ thể.' : 'I would identify the user goal, describe the interactions, and validate them with stakeholders using a concrete scenario.')
      question.transcripts.push({ followUp: state.turn, text })
      if (state.pending === 'brief' && state.followUpsUsed < state.config.followUpLimit) {
        question.followUps += 1
        return { ...state, turn: question.followUps, followUpsUsed: state.followUpsUsed + 1, pending: null, phase: 'SPEAKING', speechId: state.speechId + 1 }
      }
      question.status = 'ANSWERED'
      return nextQuestion(state)
    }
    case 'REPLAY': return state.phase === 'ANSWERING' ? { ...state, phase: 'SPEAKING', speechId: state.speechId + 1, notice: '' } : state
    case 'DEFER':
      if (state.phase !== 'ANSWERING' || state.turn || question.transcripts.length) return state
      question.status = 'DEFERRED'
      return nextQuestion({ ...state, notice: 'Đã tạm bỏ qua; thời gian trả lời còn lại của câu được giữ nguyên.' })
    case 'REVISIT':
      if (state.phase !== 'REVIEW' || state.questions[action.index]?.status !== 'DEFERRED') return state
      state.questions[action.index].status = 'ACTIVE'
      return { ...state, current: action.index, turn: 0, phase: 'SPEAKING', speechId: state.speechId + 1, notice: '' }
    case 'FINISH':
      if (state.phase !== 'REVIEW') return state
      state.questions.forEach(q => { if (q.status === 'DEFERRED') q.status = 'NO_ANSWER' })
      return { ...state, phase: 'COMPLETED', notice: '' }
    case 'PAUSE':
    case 'FAIL':
      if (!['ANSWERING', 'SPEAKING', 'PROCESSING'].includes(state.phase)) return state
      return { ...state, resumePhase: state.phase as OralPreviewState['resumePhase'], phase: 'PAUSED',
        notice: action.type === 'FAIL' ? action.message : 'Tiến trình đã được giữ lại trong tab này. Thời hạn lượt thi vẫn tiếp tục.' }
    case 'RESUME':
      return state.phase === 'PAUSED' ? { ...state, phase: state.resumePhase === 'PROCESSING' ? 'PROCESSING' : 'SPEAKING', speechId: state.speechId + 1, notice: '' } : state
  }
}

/** Đọc dữ liệu mẫu đã lưu, loại dữ liệu hỏng và không tự phát âm sau refresh. */
export function restoreOralPreview(raw: string | null, now: number): OralPreviewState | null {
  try {
    if (!raw || raw.length > 40000) return null
    const state = JSON.parse(raw) as OralPreviewState
    if (state.version !== 1 || !validPreviewConfig(state.config) || !Array.isArray(state.questions) || state.questions.length !== state.config.mainCount
      || !['SPEAKING', 'ANSWERING', 'PROCESSING', 'REVIEW', 'PAUSED', 'COMPLETED', 'EXPIRED'].includes(state.phase)
      || !['SPEAKING', 'ANSWERING', 'PROCESSING'].includes(state.resumePhase)
      || !Number.isInteger(state.current) || state.current < 0 || state.current >= state.questions.length
      || !Number.isInteger(state.turn) || state.turn < 0 || state.turn > 2
      || !Number.isInteger(state.speechId) || state.speechId < 1
      || !Number.isInteger(state.followUpsUsed) || state.followUpsUsed < 0 || state.followUpsUsed > state.config.followUpLimit
      || ![state.startedAt, state.deadline, state.lastTick, state.clockOffset].every(Number.isFinite)
      || state.clockOffset < 0 || state.deadline - state.startedAt !== state.config.slotMinutes * 60000
      || ![null, 'clear', 'brief'].includes(state.pending) || typeof state.notice !== 'string' || state.notice.length > 1000) return null
    if (!state.questions.every(q => ['PENDING', 'ACTIVE', 'DEFERRED', 'ANSWERED', 'NO_ANSWER'].includes(q.status)
      && Number.isFinite(q.remainingMs) && q.remainingMs >= 0 && q.remainingMs <= state.config.answerSeconds * 1000
      && Number.isInteger(q.followUps) && q.followUps >= 0 && q.followUps <= 2 && Array.isArray(q.transcripts) && q.transcripts.length <= 3
      && q.transcripts.every(t => typeof t.text === 'string' && t.text.length <= 2000 && Number.isInteger(t.followUp) && t.followUp >= 0 && t.followUp <= 2))) return null
    if (state.questions.reduce((sum, q) => sum + q.followUps, 0) !== state.followUpsUsed || state.turn !== state.questions[state.current].followUps) return null
    if (['SPEAKING', 'ANSWERING', 'PROCESSING', 'PAUSED'].includes(state.phase)) {
      if (state.questions[state.current].status !== 'ACTIVE' || (state.phase === 'PROCESSING' && !state.pending)) return null
      state.resumePhase = state.phase === 'PROCESSING' || (state.phase === 'PAUSED' && state.resumePhase === 'PROCESSING') ? 'PROCESSING' : 'SPEAKING'
      state.phase = 'PAUSED'
      state.notice = 'Đã khôi phục bản mô phỏng. Bấm tiếp tục để nghe lại câu hiện tại; không được cộng thêm thời gian.'
    }
    // Không coi thời gian đóng mic trong lúc tải lại trang là thời gian trả lời.
    state.lastTick = Math.max(state.lastTick, now + state.clockOffset)
    return advanceTime(state, now + state.clockOffset)
  } catch { return null }
}

/** Định dạng đồng hồ dùng chung cho ngân sách câu và thời hạn lượt thi. */
export function previewTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
