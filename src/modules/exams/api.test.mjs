import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { AxiosError } from 'axios'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/** Test hợp đồng và helper thật qua Vite resolver hiện có, không thêm framework hoặc gọi backend. */
let server, api, helpers, client, FeedbackProvider
/** Ghi nhận request qua adapter giả, tuyệt đối không gửi token/dữ liệu ra mạng. */
let requests = []
/** Lỗi HTTP giả cho các ca kiểm tra hiển thị lỗi. */
let failure = null
/** Rubric môn giả hợp lệ; mỗi test có thể thay payload để kiểm tra cổng tạo phiên. */
let rubricReply
/** Giữ lại môi trường Node sau kiểm thử. */
const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'TEST_ONLY_TOKEN', removeItem() {} } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname: '/lecturer/exams', href: '' } } })
  server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  api = await server.ssrLoadModule('/src/modules/exams/api.ts')
  helpers = await server.ssrLoadModule('/src/modules/exams/components/examHelpers.ts')
  FeedbackProvider = (await server.ssrLoadModule('/src/modules/exams/components/ExamFeedbackProvider.tsx')).default
  client = (await server.ssrLoadModule('/src/shared/api/axios.ts')).default
  client.defaults.adapter = async config => {
    requests.push({ url: config.url, method: config.method, data: config.data ? JSON.parse(config.data) : undefined,
      params: config.params, token: config.headers.Authorization })
    if (failure && (!failure.url || failure.url === config.url)) throw new AxiosError('Test HTTP failure', 'ERR_BAD_REQUEST', config, undefined,
      { status: failure.status, data: failure.data, headers: {}, statusText: 'Test', config })
    if (config.url.startsWith('/rubrics/subject/')) return { data: rubricReply, status: 200, statusText: 'OK', headers: {}, config }
    return { data: { code: 1000, result: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } },
      status: 200, statusText: 'OK', headers: {}, config }
  }
})

beforeEach(() => {
  requests = []; failure = null
  rubricReply = { code: 1000, result: { id: 1, subjectId: 1, title: 'Rubric môn học', criteria: [
    { id: 1, criterionText: 'Độ chính xác', pointWeight: 4, isMandatory: false, displayOrder: 1 },
    { id: 2, criterionText: 'Mức độ đầy đủ', pointWeight: 6, isMandatory: false, displayOrder: 2 },
  ] } }
})
after(async () => {
  await server?.close()
  if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage)
  else delete globalThis.localStorage
  if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow)
  else delete globalThis.window
})

/** Cấu hình giả ở tương lai, không dùng lịch/dữ liệu Supabase. */
const original = { id: 7, title: 'Exam', lecturerId: 4, subjectId: 1, subjectCode: 'JAVA', subjectName: 'Java',
  status: 'UPCOMING', scheduledStartAt: '2035-01-15T10:00:00.123456+07:00', scheduledEndAt: '2035-01-15T12:00:00+07:00',
  slotDurationMinutes: 20, maxMainQuestions: 3, maxFollowUps: 0, createdAt: '2026-10-01T00:00:00Z' }

/** Các modal con dùng provider cấp trang thật, không giả lập hộp thoại trình duyệt. */
const renderExam = (Component, props) => renderToStaticMarkup(createElement(FeedbackProvider, null, createElement(Component, props)))

test('GET sessions sends server pagination and filters with the existing bearer interceptor', async () => {
  await api.examSessionApi.getAll({ page: 2, size: 20, subjectId: 1, status: 'UPCOMING' })
  assert.deepEqual(requests[0], { url: '/exam-sessions', method: 'get', data: undefined,
    params: { page: 2, size: 20, subjectId: 1, status: 'UPCOMING' }, token: 'Bearer TEST_ONLY_TOKEN' })
})
test('GET details uses the existing session route', async () => {
  await api.examSessionApi.getById(7)
  assert.equal(requests[0].url, '/exam-sessions/7')
})
test('POST session uses camelCase payload, not lecturerId/status or snake_case', async () => {
  const payload = helpers.createExamPayload(helpers.examForm(original), 0)
  await api.examSessionApi.create(payload)
  assert.equal(requests[0].method, 'post')
  assert.deepEqual(Object.keys(requests[0].data).sort(), ['title', 'subjectId', 'scheduledStartAt', 'scheduledEndAt', 'slotDurationMinutes', 'maxMainQuestions', 'maxFollowUps'].sort())
  assert.ok(requests[0].data.scheduledStartAt.endsWith('Z'))
})
test('PATCH uses changed fields only and preserves source timestamp precision when untouched', async () => {
  const form = helpers.examForm(original)
  const patch = helpers.updateExamPayload({ ...form, title: 'New title' }, original)
  assert.deepEqual(patch, { title: 'New title' })
  await api.examSessionApi.update(7, patch)
  assert.equal(requests[0].method, 'patch')
  assert.deepEqual(requests[0].data, { title: 'New title' })
})
test('Unchanged edit is an empty patch and does not fabricate schedule updates', () => {
  assert.deepEqual(helpers.updateExamPayload(helpers.examForm(original), original), {})
})
test('DELETE uses session ID, not a user or subject ID', async () => {
  await api.examSessionApi.delete(7)
  assert.equal(requests[0].method, 'delete'); assert.equal(requests[0].url, '/exam-sessions/7')
})
test('Eligible search does not call /users or send an email filter', async () => {
  await api.studentExamApi.eligible({ query: 'An_%', page: 1, size: 20 })
  assert.equal(requests[0].url, '/students/eligible')
  assert.deepEqual(requests[0].params, { query: 'An_%', page: 1, size: 20 })
})
test('Assigned roster is scoped to one session with pagination', async () => {
  await api.studentExamApi.assigned(7, { page: 1, size: 20 })
  assert.equal(requests[0].url, '/exam-sessions/7/students')
  assert.equal(requests[0].params.page, 1)
})
test('All selected students use exactly one atomic batch POST', async () => {
  await api.studentExamApi.assign(7, [4, 6, 11])
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, '/exam-sessions/7/students')
  assert.deepEqual(requests[0].data, { studentIds: [4, 6, 11] })
})
test('Revoke uses StudentExam ID and a separate DELETE, not a bulk checkbox diff', async () => {
  await api.studentExamApi.unassign(501)
  assert.equal(requests[0].method, 'delete'); assert.equal(requests[0].url, '/student-exams/501')
})
test('Student schedule uses /me without accepting a student ID', async () => {
  await api.studentExamApi.getAll({ page: 3, size: 20 })
  assert.equal(requests[0].url, '/student-exams/me')
  assert.deepEqual(requests[0].params, { page: 3, size: 20 })
})
test('Canceled list request never reaches the network adapter', async () => {
  const controller = new AbortController(); controller.abort()
  await assert.rejects(api.examSessionApi.getAll({}, controller.signal), error => error.code === 'ERR_CANCELED')
  assert.equal(requests.length, 0)
})
test('A 409 business error is shown in Vietnamese by code even if the backend message is English', async () => {
  failure = { status: 409, data: { code: 1402, message: 'Not enough slots' } }
  await assert.rejects(api.studentExamApi.assign(7, [4, 6]), error =>
    helpers.examError(error, 'Không thể phân công sinh viên.') === 'Phiên thi không còn đủ khung giờ cho toàn bộ sinh viên được chọn.')
})

/** Mọi mã lỗi có thể gặp trong luồng Feature 2 phải có bản dịch riêng, không lộ chuỗi từ máy chủ. */
for (const code of [1001, 1002, 1003, 1004, 1006, 1014, 1016, 1101, 1201,
  1300, 1301, 1302, 1303, 1304, 1305, 1400, 1401, 1402, 1403, 1404, 1405,
  1500, 1501, 1502, 1503, 1504, 1505, 1506, 1700, 1701, 1702, 1703, 1704, 1705, 9999]) {
  test(`Business code ${code} has a controlled Vietnamese error message`, () => {
    const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
      { status: 400, data: { code, message: 'Internal English error must not be displayed' } })
    const message = helpers.examError(error, 'Thông báo dự phòng.')
    assert.match(message, /[À-ỹ]/u)
    assert.notEqual(message, 'Thông báo dự phòng.')
    // Mã validation dùng cùng thông báo 400; các mã nghiệp vụ khác không được mất ý nghĩa riêng.
    if (code === 1001 || code === 1002) assert.match(message, /Dữ liệu yêu cầu/)
    else assert.notEqual(message, 'Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra và thử lại.')
  })
}

for (const [status, expected] of [[400, 'Dữ liệu yêu cầu'], [401, 'đăng nhập lại'], [403, 'không có quyền'],
  [404, 'Không tìm thấy'], [409, 'đã thay đổi'], [422, 'chưa đáp ứng'], [429, 'quá nhiều yêu cầu'],
  [500, 'Không thể xử lý'], [502, 'Không thể xử lý'], [503, 'Không thể xử lý'], [504, 'Không thể xử lý']]) {
  test(`HTTP ${status} without a known business code does not show English server messages`, () => {
    const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined,
      { status, data: { code: 777777, message: 'Internal server error' } })
    assert.ok(helpers.examError(error, 'Không thể tải dữ liệu.').includes(expected))
  })
}

test('Unknown response data and unexpected JavaScript errors use Vietnamese contextual fallbacks', () => {
  const fallback = 'Không thể tải danh sách phiên thi.'
  for (const data of [null, undefined, '<html>Bad Gateway</html>', {}, { message: 'English error' }]) {
    const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, { status: 418, data })
    assert.equal(helpers.examError(error, fallback), fallback)
  }
  for (const error of [new Error('TypeError: internal details'), 'Unknown English error', null])
    assert.equal(helpers.examError(error, fallback), fallback)
  assert.equal(helpers.examError(new helpers.ExamUiError('Vui lòng kiểm tra lịch thi.'), fallback), 'Vui lòng kiểm tra lịch thi.')
})
test('Missing page envelope is rejected instead of silently rendering an empty list', () => {
  for (const data of [{}, [], { code: 1000, result: [] }, { code: 9999, result: {} }]) assert.throws(() => helpers.examPage(data))
})
test('Page totals come from the server, not the number of current-page rows', () => {
  const page = { items: [original], page: 0, size: 20, totalElements: 41, totalPages: 3 }
  assert.equal(helpers.examPage({ code: 1000, result: page }).totalElements, 41)
})
test('Legacy missing schedule/duration remains missing in the edit form', () => {
  const form = helpers.examForm({ ...original, scheduledStartAt: null, scheduledEndAt: null, slotDurationMinutes: null })
  assert.equal(form.scheduledStartAt, ''); assert.equal(form.scheduledEndAt, ''); assert.equal(form.slotDurationMinutes, '')
  assert.throws(() => helpers.createExamPayload(form))
})
test('Zero follow-ups remains zero and ISO time preserves the intended instant', () => {
  const payload = helpers.createExamPayload(helpers.examForm(original), 0)
  assert.equal(payload.maxFollowUps, 0)
  assert.equal(Date.parse(payload.scheduledStartAt), Date.parse(original.scheduledStartAt))
})

for (const [field, value] of [['title', ' '], ['title', 'x'.repeat(256)], ['title', 'a\0b'], ['subjectId', '0'],
  ['subjectId', '9007199254740993'], ['maxMainQuestions', ''], ['maxMainQuestions', '1.5'], ['maxMainQuestions', '0'],
  ['slotDurationMinutes', '-1'], ['maxFollowUps', '-1'], ['maxFollowUps', '2147483648'], ['scheduledStartAt', 'not-a-date'],
  ['scheduledStartAt', '2035-02-30T10:00'], ['scheduledEndAt', '2035-01-01T00:00']]) {
  test(`Reject invalid ${field}: ${JSON.stringify(value)}`, () => {
    assert.throws(() => helpers.createExamPayload({ ...helpers.examForm(original), [field]: value }, 0), error => {
      assert.ok(error instanceof helpers.ExamUiError)
      assert.match(error.message, /[À-ỹ]/u)
      return true
    })
  })
}
test('Past start time is rejected before sending a create request', () => {
  assert.throws(() => helpers.createExamPayload(helpers.examForm(original), Date.parse(original.scheduledEndAt)))
})
/** Lịch giả khớp ví dụ lỗi và các biên thời gian, không phụ thuộc giờ chạy test. */
for (const [durationMs, slotMinutes, valid] of [
  [121 * 60_000, 200, false],
  [20 * 60_000 - 1000, 20, false],
  [20 * 60_000 - 1, 20, false],
  [20 * 60_000, 20, true],
  [20 * 60_000 + 1, 20, true],
  [121 * 60_000, 120, true],
]) {
  test(`Create validates total duration ${durationMs}ms against ${slotMinutes} minutes per student`, () => {
    const start = Date.parse('2035-01-15T10:00:00+07:00')
    const form = { ...helpers.examForm(original), scheduledStartAt: helpers.toLocalExamTime(new Date(start).toISOString()),
      scheduledEndAt: helpers.toLocalExamTime(new Date(start + durationMs).toISOString()), slotDurationMinutes: String(slotMinutes) }
    if (valid) assert.equal(helpers.createExamPayload(form, 0).slotDurationMinutes, slotMinutes)
    else assert.throws(() => helpers.createExamPayload(form, 0), /Thời gian mỗi sinh viên không được vượt quá tổng thời gian phiên thi/)
  })
}

test('Edit rejects a slot longer than the unchanged session before sending a PATCH', () => {
  assert.throws(() => helpers.updateExamPayload({ ...helpers.examForm(original), slotDurationMinutes: '200' }, original),
    /Thời gian mỗi sinh viên không được vượt quá tổng thời gian phiên thi/)
  assert.equal(requests.length, 0)
})

test('Edit rejects shortening only the schedule below the existing slot duration', () => {
  const form = { ...helpers.examForm(original),
    scheduledEndAt: helpers.toLocalExamTime(new Date(Date.parse(original.scheduledStartAt) + 19 * 60_000).toISOString()) }
  assert.throws(() => helpers.updateExamPayload(form, original), /Thời gian mỗi sinh viên không được vượt quá tổng thời gian phiên thi/)
})

test('Edit accepts changing the schedule and slot together when the final state fits', () => {
  const form = { ...helpers.examForm(original), slotDurationMinutes: '200',
    scheduledEndAt: helpers.toLocalExamTime(new Date(Date.parse(original.scheduledStartAt) + 201 * 60_000).toISOString()) }
  const patch = helpers.updateExamPayload(form, original)
  assert.equal(patch.slotDurationMinutes, 200)
  assert.equal(patch.scheduledEndAt, new Date(form.scheduledEndAt).toISOString())
})

test('Network timeout describes an unknown outcome, not a guaranteed failed write', () => {
  for (const code of ['ECONNABORTED', 'ERR_NETWORK']) {
    const message = helpers.examError(new AxiosError('timeout', code), 'Không thể tải dữ liệu.')
    assert.match(message, /Chưa thể xác nhận kết quả từ máy chủ/)
    assert.match(message, /tải lại để kiểm tra trước khi thử lại/)
    assert.doesNotMatch(message, /timeout|Network Error|Cannot confirm/)
  }
})

test('Create form renders both schedule inputs and does not offer a writable status', async () => {
  const Form = (await server.ssrLoadModule('/src/modules/exams/components/ExamSessionModal.tsx')).default
  const html = renderExam(Form, { exam: null,
    subjects: [{ id: 1, code: 'JAVA', name: 'Java' }], onClose() {}, onSaved() {} })
  assert.equal((html.match(/type="datetime-local"/g) ?? []).length, 2)
  assert.match(html, /<form[^>]*no[Vv]alidate/i)
  assert.match(html, /Minutes per student/)
  assert.match(html, /JAVA - Java/)
  assert.doesNotMatch(html, /<option[^>]*>ONGOING/)
  assert.doesNotMatch(html, /lecturerId|referenceAnswer|rubricSnapshot/)
})
test('Edit form keeps subject read-only, even when it is no longer in the assigned-subject list', async () => {
  const Form = (await server.ssrLoadModule('/src/modules/exams/components/ExamSessionModal.tsx')).default
  const html = renderExam(Form, { exam: original, subjects: [], onClose() {}, onSaved() {} })
  assert.match(html, /<select[^>]*disabled/)
  assert.match(html, /JAVA - Java/)
})
test('Revoked or non-UPCOMING session hides all batch-assignment controls', async () => {
  const Modal = (await server.ssrLoadModule('/src/modules/exams/components/StudentAssignmentsModal.tsx')).default
  const html = renderExam(Modal, { exam: original, canWrite: false, onClose() {} })
  assert.match(html, /Chỉ được xem/)
  assert.doesNotMatch(html, /Assign selected|aria-label="Search students"/)
})
test('Pagination disables next when the current page is the last server page', async () => {
  const Pagination = (await server.ssrLoadModule('/src/modules/exams/components/ExamPagination.tsx')).default
  const html = renderToStaticMarkup(createElement(Pagination, { page: 2, totalPages: 3, totalElements: 41, busy: false, onChange() {} }))
  assert.match(html, /41 record/)
  assert.match(html, /<button[^>]*disabled[^>]*>Next/)
})

test('Error state supports Vietnamese retry text without changing defaults on other screens', async () => {
  const ErrorState = (await server.ssrLoadModule('/src/shared/components/common/ErrorState.tsx')).default
  const props = { title: 'Không thể tải lịch thi', message: 'Vui lòng thử lại.', onRetry() {} }
  const translated = renderToStaticMarkup(createElement(ErrorState, { ...props, retryLabel: 'Thử lại' }))
  assert.match(translated, /Không thể tải lịch thi/)
  assert.match(translated, />Thử lại<\/button>/)
  assert.doesNotMatch(translated, /Retry|Exams unavailable/)
  const unchanged = renderToStaticMarkup(createElement(ErrorState, props))
  assert.match(unchanged, />Retry<\/button>/)
})

/** Form bỏ popup theo ngôn ngữ trình duyệt nhưng vẫn kiểm tra đầy đủ các trường bắt buộc. */
for (const field of ['title', 'subjectId', 'scheduledStartAt', 'scheduledEndAt', 'slotDurationMinutes', 'maxMainQuestions', 'maxFollowUps']) {
  test(`Empty ${field} is rejected in Vietnamese by the form helper`, () => {
    assert.throws(() => helpers.createExamPayload({ ...helpers.examForm(original), [field]: '' }, 0), error => {
      assert.ok(error instanceof helpers.ExamUiError)
      assert.match(error.message, /[À-ỹ]/u)
      return true
    })
  })
}

/** Đề giả chỉ chứa trường được phép hiển thị; không có token hoặc dữ liệu Supabase. */
const startedFixture = { code: 1000, result: {
  attempt: { id: 7, sessionId: 3, status: 'IN_PROGRESS', sessionStatus: 'ONGOING',
    startedAt: '2035-01-15T03:00:00Z', completedAt: null, deadlineAt: '2035-01-15T03:20:00Z' },
  questions: [{ studentExamQuestionId: 12, questionOrder: 1, content: 'Phân tích thiết kế phần mềm.', answerTimeLimitSeconds: null }],
} }

for (const [action, url] of [['start', '/student-exams/7/starts'], ['finish', '/student-exams/7/completions']]) {
  test(`${action} sends an empty-body POST scoped to the attempt, without answers or scores`, async () => {
    await api.studentExamApi[action](7)
    assert.deepEqual(requests[0], { url, method: 'post', data: undefined, params: undefined, token: 'Bearer TEST_ONLY_TOKEN' })
  })
}

test('Close Session posts to its own resource without client-selected statuses or results', async () => {
  await api.examSessionApi.close(3)
  assert.deepEqual(requests[0], { url: '/exam-sessions/3/closures', method: 'post', data: undefined, params: undefined, token: 'Bearer TEST_ONLY_TOKEN' })
})

test('Start parser whitelists snapshot display fields instead of retaining answers or rubric', () => {
  const value = structuredClone(startedFixture)
  value.result.rubric = 'PRIVATE_RUBRIC'
  value.result.attempt.finalScore = 10
  value.result.questions[0].referenceAnswer = 'PRIVATE_REFERENCE_ANSWER'
  assert.deepEqual(helpers.startedExam(value, 7), startedFixture.result)
})

for (const variant of ['wrongId', 'wrongSession', 'wrongStatus', 'wrongParent', 'missingStart', 'missingDeadline',
  'badDate', 'reverseDeadline', 'completed', 'emptyQuestions', 'duplicate', 'badOrder', 'emptyContent', 'badLimit']) {
  test(`Start parser rejects ${variant} with a Vietnamese error`, () => {
    const value = structuredClone(startedFixture)
    const attempt = value.result.attempt
    const question = value.result.questions[0]
    if (variant === 'wrongId') attempt.id = 99
    if (variant === 'wrongSession') attempt.sessionId = 0
    if (variant === 'wrongStatus') attempt.status = 'COMPLETED'
    if (variant === 'wrongParent') attempt.sessionStatus = 'UPCOMING'
    if (variant === 'missingStart') attempt.startedAt = null
    if (variant === 'missingDeadline') attempt.deadlineAt = null
    if (variant === 'badDate') attempt.startedAt = 'invalid'
    if (variant === 'reverseDeadline') attempt.deadlineAt = attempt.startedAt
    if (variant === 'completed') attempt.completedAt = attempt.startedAt
    if (variant === 'emptyQuestions') value.result.questions = []
    if (variant === 'duplicate') value.result.questions.push({ ...question, questionOrder: 2 })
    if (variant === 'badOrder') question.questionOrder = 2
    if (variant === 'emptyContent') question.content = ' '
    if (variant === 'badLimit') question.answerTimeLimitSeconds = 0
    assert.throws(() => helpers.startedExam(value, 7), error => {
      assert.ok(error instanceof helpers.ExamUiError)
      assert.match(error.message, /không hợp lệ/)
      return true
    })
  })
}

test('Attempt dialog shows immutable questions and Finish but does not offer fake answer submission or grading', async () => {
  const Modal = (await server.ssrLoadModule('/src/modules/exams/components/ExamAttemptModal.tsx')).default
  const html = renderExam(Modal, { exam: startedFixture.result, title: 'Phiên thi thử', onClose() {}, onFinished() {} })
  assert.match(html, /Phân tích thiết kế phần mềm/)
  assert.match(html, /Hoàn thành bài thi/)
  assert.match(html, /Feature 3/)
  assert.doesNotMatch(html, /<textarea|<input|referenceAnswer|rubricSnapshot|finalScore|PRIVATE_REFERENCE/)
})

test('Absent and expired attempts are distinguished from completed exams in Vietnamese', () => {
  assert.equal(helpers.studentExamStatusLabel('ABSENT'), 'Vắng thi')
  assert.equal(helpers.studentExamStatusLabel('EXPIRED'), 'Hết giờ — chưa hoàn thành')
  assert.equal(helpers.studentExamStatusLabel('COMPLETED'), 'Đã hoàn thành')
})

test('Confirmation popup is an application dialog with Vietnamese cancel and explicit action buttons', async () => {
  const Popup = (await server.ssrLoadModule('/src/modules/exams/components/ExamFeedbackPopup.tsx')).default
  const html = renderToStaticMarkup(createElement(Popup, { confirmation: true, content: {
    title: 'Đóng phiên thi?', message: 'Chỉ đóng sau giờ kết thúc.', confirmLabel: 'Đóng phiên', tone: 'error',
  }, onResolve() {} }))
  assert.match(html, /<dialog/)
  assert.match(html, /max-w-md/)
  assert.match(html, /Đóng phiên thi\?/)
  assert.match(html, />Hủy<\/button>/)
  assert.match(html, />Đóng phiên<\/button>/)
  assert.match(html, /aria-label="Đóng cửa sổ"/)
  const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1]
  assert.ok(descriptionId)
  assert.ok(html.includes(`id="${descriptionId}"`))
})

for (const tone of ['error', 'success', 'info']) {
  test(`${tone} notification renders as a safe application popup, not an inline banner or native alert`, async () => {
    const Popup = (await server.ssrLoadModule('/src/modules/exams/components/ExamFeedbackPopup.tsx')).default
    const html = renderToStaticMarkup(createElement(Popup, { confirmation: false,
      content: { title: 'Thông báo', message: '<script>KHÔNG THỰC THI</script>', tone }, onResolve() {} }))
    assert.match(html, /<dialog/)
    assert.match(html, />Đã hiểu<\/button>/)
    assert.doesNotMatch(html, />Hủy<\/button>|<script>/)
    assert.match(html, /&lt;script&gt;/)
  })
}

test('Stacked form and feedback dialogs have distinct accessible title IDs', async () => {
  const Dialog = (await server.ssrLoadModule('/src/modules/exams/components/ExamDialog.tsx')).default
  const html = renderToStaticMarkup(createElement('div', null,
    createElement(Dialog, { title: 'Form phiên thi', busy: false, onClose() {} }),
    createElement(Dialog, { title: 'Xác nhận', busy: false, compact: true, onClose() {} })))
  const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(match => match[1])
  assert.equal(ids.length, 2)
  assert.equal(new Set(ids).size, 2)
  for (const id of ids) assert.ok(html.includes(`id="${id}"`))
})

test('Feature 2 actions no longer call browser-native alert, confirm or prompt', async () => {
  const { readFile } = await import('node:fs/promises')
  const paths = ['pages/LecturerMyExams.tsx', 'components/StudentExamList.tsx', 'components/ExamAttemptModal.tsx',
    'components/ExamSessionModal.tsx', 'components/StudentAssignmentsModal.tsx']
  for (const path of paths) {
    const source = await readFile(new URL(`./${path}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /window\.(?:alert|confirm|prompt)\s*\(|(?<![\w.])(?:alert|confirm|prompt)\s*\(/)
    assert.match(source, /useExamFeedback/)
    assert.doesNotMatch(source, /role="alert"/)
  }
})

test('New Exam checks the subject rubric before sending the session POST', async () => {
  const payload = helpers.createExamPayload(helpers.examForm(original), 0)
  await helpers.createExamWithRubricCheck(payload)
  assert.deepEqual(requests.map(request => [request.method, request.url]), [['get', '/rubrics/subject/1'], ['post', '/exam-sessions']])
  assert.deepEqual(requests[1].data, payload)
})

test('Missing subject rubric shows the exact requested Vietnamese message and never sends POST', async () => {
  failure = { status: 404, data: { code: 1600, message: 'Không tìm thấy rubric' } }
  await assert.rejects(helpers.createExamWithRubricCheck(helpers.createExamPayload(helpers.examForm(original), 0)),
    error => error instanceof helpers.ExamUiError && error.message === 'Bạn phải tạo đầy đủ Rubrics cho môn')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, '/rubrics/subject/1')
})

for (const variant of ['empty', 'wrongSubject', 'wrongTotal', 'zeroWeight', 'tooManyDecimals', 'blankText', 'duplicateOrder', 'missingOrder', 'duplicateId', 'missingMandatory', 'badEnvelope']) {
  test(`New Exam rejects ${variant} rubric before a session can be created`, async () => {
    const rubric = rubricReply.result
    if (variant === 'empty') rubric.criteria = []
    if (variant === 'wrongSubject') rubric.subjectId = 2
    if (variant === 'wrongTotal') rubric.criteria[0].pointWeight = 3
    if (variant === 'zeroWeight') rubric.criteria[0].pointWeight = 0
    if (variant === 'tooManyDecimals') rubric.criteria[0].pointWeight = 4.001
    if (variant === 'blankText') rubric.criteria[0].criterionText = ' '
    if (variant === 'duplicateOrder') rubric.criteria[1].displayOrder = 1
    if (variant === 'missingOrder') rubric.criteria[1].displayOrder = null
    if (variant === 'duplicateId') rubric.criteria[1].id = 1
    if (variant === 'missingMandatory') rubric.criteria[0].isMandatory = null
    if (variant === 'badEnvelope') rubricReply = { code: 1000 }
    await assert.rejects(helpers.createExamWithRubricCheck(helpers.createExamPayload(helpers.examForm(original), 0)),
      error => error instanceof helpers.ExamUiError && error.message === 'Bạn phải tạo đầy đủ Rubrics cho môn')
    assert.equal(requests.length, 1)
    assert.ok(requests.every(request => request.method === 'get'))
  })
}

test('Fractional rubric points are summed in cents without floating-point rounding errors', () => {
  const data = { code: 1000, result: { id: 1, subjectId: 1, criteria: Array.from({ length: 100 }, (_, index) =>
    ({ id: index + 1, displayOrder: index + 1, criterionText: 'Tiêu chí', pointWeight: 0.1, isMandatory: false })) } }
  assert.doesNotThrow(() => helpers.requireCompleteSubjectRubric(data, 1))
})

test('A network failure during rubric check is not misreported as missing rubric and does not POST', async () => {
  failure = { status: 503, data: { message: 'Unavailable' } }
  await assert.rejects(helpers.createExamWithRubricCheck(helpers.createExamPayload(helpers.examForm(original), 0)), error =>
    helpers.examError(error, 'Không thể lưu phiên thi.') !== 'Bạn phải tạo đầy đủ Rubrics cho môn')
  assert.equal(requests.length, 1)
})

test('Backend rubric rejection after a successful precheck is still shown with the exact message', async () => {
  failure = { url: '/exam-sessions', status: 400, data: { code: 1305, message: 'Server message' } }
  await assert.rejects(helpers.createExamWithRubricCheck(helpers.createExamPayload(helpers.examForm(original), 0)), error =>
    helpers.examError(error, 'Không thể lưu phiên thi.') === 'Bạn phải tạo đầy đủ Rubrics cho môn')
  assert.equal(requests.length, 2)
})

for (const required of [1, 3, 7, 2147483647]) {
  test(`New Exam shortage shows the exact Vietnamese minimum ${required} from the backend`, async () => {
    const message = `Bạn phải tạo đủ ${required} số câu hỏi chính đã được APPROVED`
    failure = { url: '/exam-sessions', status: 400, data: { code: 1306, message } }
    await assert.rejects(helpers.createExamWithRubricCheck(helpers.createExamPayload(helpers.examForm(original), 0)), error =>
      helpers.examError(error, 'Không thể lưu phiên thi.') === message)
    assert.equal(requests.length, 2)
    assert.equal(requests.filter(request => request.method === 'post').length, 1)
  })
}

test('Edit changing Main sends a single PATCH and shows the exact minimum from code 1306', async () => {
  const form = { ...helpers.examForm(original), maxMainQuestions: '10' }
  const patch = helpers.updateExamPayload(form, original)
  const message = 'Bạn phải tạo đủ 10 số câu hỏi chính đã được APPROVED'
  failure = { url: '/exam-sessions/7', status: 400, data: { code: 1306, message } }
  await assert.rejects(api.examSessionApi.update(7, patch), error => helpers.examError(error, 'Không thể lưu phiên thi.') === message)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, 'patch')
  assert.deepEqual(requests[0].data, { maxMainQuestions: 10 })
})

for (const message of ['Not enough questions', '<script>Internal SQL</script>', undefined,
  'Bạn phải tạo đủ 0 số câu hỏi chính đã được APPROVED',
  'Bạn phải tạo đủ 2147483648 số câu hỏi chính đã được APPROVED',
  'Bạn phải tạo đủ 3 số câu hỏi chính đã được APPROVED\nprivate SQL']) {
  test(`Malformed question shortage text is replaced by a safe Vietnamese message: ${JSON.stringify(message)}`, () => {
    const error = new AxiosError('HTTP failure', '', undefined, undefined, { status: 400, data: { code: 1306, message } })
    assert.equal(helpers.examError(error, 'Thông báo dự phòng.'), 'Bạn phải tạo đủ số câu hỏi chính đã được APPROVED theo cấu hình phiên thi.')
  })
}
