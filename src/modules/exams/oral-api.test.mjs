import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { AxiosError } from 'axios'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/** Hợp đồng HTTP và parser thật, không có request ra backend hoặc dịch vụ AI. */
let server, api, helper, session, client, Room, Player, Recorder, micError, draftStorage, calls, reply, lastConfig
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const previousSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const storage = new Map()
const clientId = '11111111-1111-4111-8111-111111111111'
const turnId = '22222222-2222-4222-8222-222222222222'
const requestId = '33333333-3333-4333-8333-333333333333'
const jobId = '44444444-4444-4444-8444-444444444444'
const fixture = () => ({ code: 1000, result: { studentExamId: 7, status: 'IN_PROGRESS', phase: 'ANSWERING', revision: 2,
  serverTime: '2035-01-01T10:00:00Z', deadline: '2035-01-01T10:10:00Z', leaseUntil: '2035-01-01T10:00:45Z', mainCount: 2,
  currentQuestionOrder: 1, currentTurnId: turnId, followUpIndex: 0, language: 'vi', followUpsUsed: 0, maxFollowUps: 2,
  answerRemainingMs: 90000, submissionId: null, questions: [
    { questionOrder: 1, status: 'ACTIVE', answerRemainingMs: 90000, outcomeReason: null },
    { questionOrder: 2, status: 'PENDING', answerRemainingMs: 90000, outcomeReason: null },
  ], transcripts: [] } })
const command = () => ({ requestId, clientSessionId: clientId, expectedRevision: 2, turnId, action: 'SUBMIT' })
const demo = { mode: 'LOCAL_DEMO', providersReady: true, message: 'Database Docker riêng.' }

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'TEST_TOKEN', setItem() {}, removeItem() {} } })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname: '/student/exams/7/oral' } } })
  server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  api = await server.ssrLoadModule('/src/modules/exams/oralApi.ts')
  helper = await server.ssrLoadModule('/src/modules/exams/components/oralExamHelpers.ts')
  session = await server.ssrLoadModule('/src/modules/exams/components/oralExamSession.ts')
  Room = (await server.ssrLoadModule('/src/modules/exams/components/OralExamRoom.tsx')).default
  Player = (await server.ssrLoadModule('/src/modules/exams/components/oralAudioPlayer.ts')).OralAudioPlayer
  const recorderModule = await server.ssrLoadModule('/src/modules/exams/components/oralAudioRecorder.ts')
  Recorder = recorderModule.OralAudioRecorder; micError = recorderModule.oralMicrophoneError
  draftStorage = await server.ssrLoadModule('/src/modules/exams/components/oralAudioDraft.ts')
  client = (await server.ssrLoadModule('/src/shared/api/axios.ts')).default
  client.defaults.adapter = async config => {
    lastConfig = config
    calls.push({ method: config.method, url: config.url, data: config.data instanceof FormData ? config.data : config.data ? JSON.parse(config.data) : undefined, bearer: config.headers.Authorization })
    return { data: reply, status: 200, statusText: 'OK', headers: {}, config }
  }
})

test('STT upload dùng submission đã cấp, metadata JSON và Blob multipart; không gửi transcript', async () => {
  reply = fixture(); reply.result.phase = 'TRANSCRIBING'; reply.result.submissionId = jobId; reply.result.audioReceived = true
  const blob = new Blob([new Uint8Array(256)], { type: 'audio/webm;codecs=opus' })
  const state = await api.oralApi.uploadAudio(7, jobId, { clientSessionId: clientId, turnId, transcript: 'FORGED' }, blob)
  assert.equal(state.audioReceived, true); assert.equal(calls[0].url, `/student-exams/7/oral-examination/submissions/${jobId}/audio`)
  assert.equal(calls[0].bearer, 'Bearer TEST_TOKEN')
  assert.deepEqual(JSON.parse(await calls[0].data.get('metadata').text()), { clientSessionId: clientId, turnId })
  assert.equal(calls[0].data.get('audio').size, 256); assert.equal(calls[0].data.has('transcript'), false)
  assert.notEqual(lastConfig.headers.getContentType(), 'application/json')
})
test('STT preview chỉ hiển thị transcript hợp lệ và giữ đúng ngôn ngữ', async () => {
  reply = { code: 1000, result: { language: 'vi', transcript: 'Em không biết', hasSpeech: true } }
  assert.equal(await api.oralApi.previewTranscription('vi', new Blob([new Uint8Array(256)], { type: 'audio/wav' })), 'Em không biết')
  reply.result.hasSpeech = false
  await assert.rejects(api.oralApi.previewTranscription('vi', new Blob([new Uint8Array(256)], { type: 'audio/wav' })))
})
test('STT chặn blob rỗng/sai định dạng và job id giả trước HTTP', async () => {
  await assert.rejects(api.oralApi.uploadAudio(7, 'bad', { clientSessionId: clientId, turnId }, new Blob(['data'])))
  await assert.rejects(api.oralApi.previewTranscription('vi', new Blob([new Uint8Array(256)], { type: 'text/html' })))
  assert.equal(calls.length, 0)
})
test('Mã lỗi STT không lộ message provider và thiếu IndexedDB không được giả đã lưu draft', async () => {
  for (const code of [1810,1811,1812,1813,1814]) assert.doesNotMatch(helper.oralError(new AxiosError('PRIVATE', undefined, undefined, undefined, { data: { code, message: 'PRIVATE_PROVIDER' } })), /PRIVATE/)
  await assert.rejects(draftStorage.saveAudioDraft('fixture', { command: command(), blob: new Blob(['audio']) }))
})

/** Thiết bị giả kiểm tra lifecycle, không xin quyền hoặc thu âm của người dùng thật. */
async function recorderFixture(run, getStream) {
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator'), oldRecorder = globalThis.MediaRecorder, oldContext = globalThis.AudioContext
  const tracks = [{ stopped: 0, stop() { this.stopped++ } }], stream = { getTracks: () => tracks }
  const instances = []
  class MediaRecorder {
    static isTypeSupported(type) { return type.startsWith('audio/webm') }
    constructor(stream, options) { this.state = 'inactive'; this.mimeType = options.mimeType; instances.push(this) }
    start() { this.state = 'recording' }
    stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob([new Uint8Array(256)], { type: this.mimeType }) }); this.onstop?.() }) }
  }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: getStream || (async () => stream) } } })
  globalThis.MediaRecorder = MediaRecorder; globalThis.AudioContext = undefined
  try { await run({ tracks, stream, instances }) } finally { if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator; globalThis.MediaRecorder = oldRecorder; globalThis.AudioContext = oldContext }
}
test('Ghi xong thu Blob cuối rồi tắt tracks; không tự tạo transcript', async () => recorderFixture(async ({ tracks }) => {
  const recorder = new Recorder()
  assert.equal(await recorder.start(() => true, () => {}, () => {}), true)
  const recording = await recorder.finish()
  assert.equal(recording.blob.size, 256); assert.equal(recording.hasSpeech, null); assert.equal(tracks[0].stopped, 1)
  assert.equal('transcript' in recording, false); recorder.cancel()
}))
test('Permission về sau khi đổi lượt phải đóng track, không khởi động ghi', async () => {
  let release
  await recorderFixture(async ({ stream, tracks, instances }) => {
    const recorder = new Recorder(), pending = recorder.start(() => true, () => {}, () => {})
    recorder.cancel(); release(stream)
    assert.equal(await pending, false); assert.equal(tracks[0].stopped, 1); assert.equal(instances.length, 0)
  }, () => new Promise(resolve => { release = resolve }))
})
test('Hủy trong lúc gom Blob không gửi phần dở và báo AbortError', async () => recorderFixture(async () => {
  const recorder = new Recorder(); await recorder.start(() => true, () => {}, () => {})
  const pending = recorder.finish(); recorder.cancel(); await assert.rejects(pending, { name: 'AbortError' })
}))
test('Lỗi quyền/thiết bị micro được Việt hóa, không hiện tên thiết bị hoặc lỗi thô', () => {
  assert.match(micError({ name: 'NotAllowedError' }), /chưa cho phép/)
  assert.match(micError({ name: 'NotFoundError' }), /Không tìm thấy/)
  assert.match(micError({ name: 'NotReadableError' }), /ứng dụng khác/)
})

test('TTS gửi bearer và turn hiện tại, timeout riêng; không gửi đề hoặc key', async () => {
  reply = new Blob([new Uint8Array(48)], { type: 'audio/wav' })
  const blob = await api.oralApi.speech(7, { clientSessionId: clientId, turnId, expectedRevision: 2, text: 'PRIVATE', apiKey: 'PRIVATE' })
  assert.equal(blob.size, 48)
  assert.deepEqual(calls[0].data, { clientSessionId: clientId, turnId, expectedRevision: 2 })
  assert.equal(lastConfig.timeout, 45000); assert.equal(lastConfig.responseType, 'blob')
  assert.equal(calls[0].bearer, 'Bearer TEST_TOKEN')
})
test('TTS preview chỉ gửi vi/en; backend cũ chưa có speechReady vẫn đọc được', async () => {
  reply = new Blob([new Uint8Array(48)], { type: 'audio/wav' })
  await api.oralApi.previewSpeech('vi'); assert.deepEqual(calls[0].data, { language: 'vi' })
  await assert.rejects(api.oralApi.previewSpeech('fr'))
  assert.equal(helper.parseOralRuntime({ code: 1000, result: { mode: 'FOUNDATION', providersReady: false, message: 'STT chưa có', speechReady: true } }).speechReady, true)
})
test('TTS chặn Blob JSON/rỗng và mã turn không hợp lệ', async () => {
  reply = new Blob(['{}'], { type: 'application/json' })
  await assert.rejects(api.oralApi.previewSpeech('en'))
  await assert.rejects(api.oralApi.speech(7, { clientSessionId: clientId, turnId: 'invalid', expectedRevision: 2 }))
})

/** Media fixture chỉ kiểm tra sự kiện; không giả đã nghe giọng thật trên máy. */
async function mediaFixture(run) {
  const old = globalThis.Audio, create = URL.createObjectURL, revoke = URL.revokeObjectURL
  const media = [], revoked = []
  class Audio {
    constructor(url) { this.url = url; media.push(this) }
    async play() { if (this.blocked) throw new Error('NotAllowedError') }
    pause() { this.paused = true }
    removeAttribute() {}
    load() {}
  }
  globalThis.Audio = Audio; URL.createObjectURL = () => 'blob:fixture'; URL.revokeObjectURL = url => revoked.push(url)
  try { await run(media, revoked) } finally { globalThis.Audio = old; URL.createObjectURL = create; URL.revokeObjectURL = revoke }
}
test('Chỉ audio ended thật xác nhận đúng một lần; autoplay bị chặn không chuyển câu', async () => mediaFixture(async media => {
  let ended = 0; const player = new Player()
  await player.load(async () => new Blob(['wave']), () => true, () => ended++, () => {})
  media[0].blocked = true; await assert.rejects(player.play()); assert.equal(ended, 0)
  media[0].blocked = false; await player.play(); assert.equal(ended, 0)
  media[0].onended(); media[0].onended(); assert.equal(ended, 1); player.stop()
}))
test('Hủy tải/đổi lượt loại audio về muộn và callback cũ; thu hồi Blob URL', async () => mediaFixture(async (media, revoked) => {
  let resolve, ended = 0; const player = new Player()
  const pending = player.load(() => new Promise(done => { resolve = done }), () => true, () => ended++, () => {})
  player.stop(); resolve(new Blob(['old'])); assert.equal(await pending, false); assert.equal(media.length, 0)
  await player.load(async () => new Blob(['new']), () => true, () => ended++, () => {})
  const stale = media[0].onended; player.stop(); stale(); assert.equal(ended, 0); assert.deepEqual(revoked, ['blob:fixture'])
  await player.load(async () => new Blob(['next-turn']), () => true, () => ended++, () => {})
  stale(); assert.equal(ended, 0); media[1].onended(); assert.equal(ended, 1); player.stop()
}))
test('Lỗi audio hoặc hết thời hạn không được gửi đã nghe xong', async () => mediaFixture(async media => {
  let valid = true, ended = 0, failed = 0; const player = new Player()
  await player.load(async () => new Blob(['wave']), () => valid, () => ended++, () => failed++)
  media[0].onerror(); media[0].onended(); assert.equal(failed, 1); assert.equal(ended, 0)
  await player.load(async () => new Blob(['wave']), () => valid, () => ended++, () => {})
  valid = false; media[1].onended(); assert.equal(ended, 0); player.stop()
}))
beforeEach(() => { calls = []; reply = fixture(); storage.clear(); client.defaults.baseURL = 'http://127.0.0.1:8081' })
after(async () => {
  await server?.close()
  for (const [key, descriptor] of [['localStorage', previousStorage], ['sessionStorage', previousSession], ['window', previousWindow]]) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]
  }
})

test('GET oral dùng đúng StudentExam ID và bearer hiện có, không nhận studentId', async () => {
  const state = await api.oralApi.get(7)
  assert.equal(state.revision, 2)
  assert.deepEqual(calls[0], { method: 'get', url: '/student-exams/7/oral-examination', data: undefined, bearer: 'Bearer TEST_TOKEN' })
})
test('POST mở chỉ gửi clientSessionId, không có thời gian/cấu hình/đáp án', async () => {
  await api.oralApi.open(7, clientId)
  assert.deepEqual(calls[0].data, { clientSessionId: clientId })
  assert.equal(calls[0].url, '/student-exams/7/oral-examination')
})
test('action giữ nguyên requestId, revision và turn khi retry', async () => {
  const original = command(); await api.oralApi.action(7, original); await api.oralApi.action(7, original)
  assert.deepEqual(calls[0], calls[1]); assert.equal(calls[0].url, '/student-exams/7/oral-examination/actions')
})
test('không serialize transcript/điểm hoặc trường thừa do caller truyền vào action', async () => {
  await api.oralApi.action(7, { ...command(), transcript: 'Tự khai', score: 10, deadline: '2099-01-01' })
  assert.deepEqual(calls[0].data, command())
})
test('chỉ REVISIT được gửi targetQuestionOrder', async () => {
  await api.oralApi.action(7, { ...command(), action: 'REVISIT', turnId: null, targetQuestionOrder: 2 })
  assert.equal(calls[0].data.targetQuestionOrder, 2)
  await assert.rejects(api.oralApi.action(7, { ...command(), targetQuestionOrder: 2 }))
  assert.equal(calls.length, 1)
})
test('ID hoặc UUID sai không phát request', async () => {
  await assert.rejects(api.oralApi.get(0)); await assert.rejects(api.oralApi.open(7, 'invalid'))
  await assert.rejects(api.oralApi.action(7, { ...command(), requestId: 'invalid' }))
  assert.equal(calls.length, 0)
})
test('runtime phải do backend khai báo, FOUNDATION không được nhận providersReady=true', async () => {
  reply = { code: 1000, result: { mode: 'FOUNDATION', providersReady: false, message: 'Chưa có provider.' } }
  assert.equal((await api.oralApi.runtime()).providersReady, false)
  assert.throws(() => helper.parseOralRuntime({ code: 1000, result: { ...demo, mode: 'FOUNDATION' } }))
})
test('LIVE chỉ mở khi backend xác nhận đủ giọng đọc, STT và migration; không biến thành công cụ demo', async () => {
  const live = { mode: 'LIVE', providersReady: true, speechReady: true, transcriptionReady: true, audioStorageReady: true, message: 'Đã cấu hình.' }
  reply = { code: 1000, result: live }
  assert.equal((await api.oralApi.runtime()).mode, 'LIVE'); assert.equal(api.isLocalOralDemo(live), false)
  for (const field of ['providersReady', 'speechReady', 'transcriptionReady', 'audioStorageReady']) assert.throws(() => helper.parseOralRuntime({ code: 1000, result: { ...live, [field]: false } }))
})
test('lỗi AI giữ mã kỹ thuật và chỉ hiện tiếng Việt, không lộ response nhà cung cấp', () => {
  for (const code of [1815,1816,1817]) {
    const value = fixture(); Object.assign(value.result, { phase: 'TECHNICAL_ERROR', submissionId: jobId, processingErrorCode: code })
    assert.equal(helper.parseOralState(value, 7).processingErrorCode, code)
    const cause = new AxiosError('SECRET', 'ERR', undefined, undefined, { status: 502, data: { code, message: 'PRIVATE_PROVIDER_BODY' } })
    assert.ok(!helper.oralError(cause).includes('PRIVATE_')); assert.ok(helper.oralProcessingError(code).includes('AI'))
  }
  const value = fixture(); value.result.processingErrorCode = 9999; assert.throws(() => helper.parseOralState(value, 7))
})
test('công cụ demo chỉ gửi tình huống mẫu tới server loopback có khai báo LOCAL_DEMO', async () => {
  await api.oralApi.chooseDemoScenario(7, turnId, 'BRIEF', demo)
  assert.deepEqual(calls[0].data, { turnId, scenario: 'BRIEF' })
  assert.equal(calls[0].url, '/_oral-demo/student-exams/7/scenario')
  client.defaults.baseURL = 'https://example.invalid'
  await assert.rejects(api.oralApi.chooseDemoScenario(7, turnId, 'BRIEF', demo))
  client.defaults.baseURL = 'http://127.0.0.1:8081'
  await assert.rejects(api.oralApi.chooseDemoScenario(7, turnId, 'CLEAR', { ...demo, mode: 'FOUNDATION', providersReady: false }))
  assert.equal(calls.length, 1)
})
for (const field of ['studentExamId', 'revision', 'mainCount', 'phase', 'status', 'serverTime', 'deadline', 'leaseUntil', 'currentTurnId', 'followUpIndex', 'language', 'questions', 'transcripts']) {
  test(`response sai ${field} bị từ chối, không hiện thành công giả`, () => {
    const value = fixture(); value.result[field] = 'MALFORMED'
    assert.throws(() => helper.parseOralState(value, 7))
  })
}
test('không chấp nhận scope khác, câu trùng/sai thứ tự, quota hoặc ngân sách âm', () => {
  for (const mutation of [r => r.studentExamId = 8, r => r.questions[1].questionOrder = 1, r => r.followUpsUsed = 3,
    r => r.answerRemainingMs = -1, r => r.questions[1].status = 'ACTIVE', r => r.questions[0].answerRemainingMs = 80000]) {
    const value = fixture(); mutation(value.result); assert.throws(() => helper.parseOralState(value, 7))
  }
})
test('response không đưa prompt/đáp án/rubric vào model FE dù server gửi thừa', () => {
  const value = fixture(); Object.assign(value.result, { promptText: 'PRIVATE_PROMPT', rubric: 'PRIVATE_RUBRIC', referenceAnswer: 'PRIVATE_ANSWER' })
  const parsed = JSON.stringify(helper.parseOralState(value, 7))
  assert.ok(!parsed.includes('PRIVATE_'))
})
test('transcript rỗng, từ tương lai hoặc trùng lượt không được coi là bằng chứng hợp lệ', () => {
  for (const transcripts of [
    [{ questionOrder: 1, followUpIndex: 0, content: '', savedAt: '2035-01-01T10:00:00Z' }],
    [{ questionOrder: 1, followUpIndex: 0, content: 'X', savedAt: '2035-01-01T10:01:00Z' }],
    Array(2).fill({ questionOrder: 1, followUpIndex: 0, content: 'X', savedAt: '2035-01-01T10:00:00Z' }),
  ]) { const value = fixture(); value.result.transcripts = transcripts; assert.throws(() => helper.parseOralState(value, 7)) }
})
test('STT/AI đang xử lý phải có mã submission; ngôn ngữ null chỉ hợp lệ khi chưa chuẩn bị', () => {
  const value = fixture(); value.result.phase = 'TRANSCRIBING'; assert.throws(() => helper.parseOralState(value, 7))
  value.result.submissionId = jobId; assert.equal(helper.parseOralState(value, 7).submissionId, jobId)
  value.result.phase = 'PREPARING'; value.result.submissionId = null; value.result.language = null
  assert.equal(helper.parseOralState(value, 7).language, null)
})
test('timer chỉ nội suy trả lời ở ANSWERING, hạn slot vẫn chạy lúc AI xử lý', () => {
  const state = helper.parseOralState(fixture(), 7)
  assert.deepEqual(helper.oralCountdown(state, 10000), { slot: 590000, answer: 80000 })
  state.phase = 'DECIDING'; assert.deepEqual(helper.oralCountdown(state, 10000), { slot: 590000, answer: 90000 })
  state.phase = 'COMPLETED'; assert.deepEqual(helper.oralCountdown(state, 10000), { slot: 600000, answer: 90000 })
})
for (const code of [1800, 1801, 1802, 1803, 1804, 1805, 1806]) {
  test(`mã ${code} dùng thông báo tiếng Việt có kiểm soát`, () => {
    const cause = new AxiosError('test', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409, data: { code, message: 'PRIVATE_SQL_ERROR' } })
    assert.equal(helper.oralErrorCode(cause), code); assert.ok(!helper.oralError(cause).includes('PRIVATE_'))
  })
}
test('timeout/5xx/malformed response giữ yêu cầu chờ, 409 không tự retry lệnh mới', () => {
  assert.equal(helper.uncertainOralWrite(new AxiosError('timeout')), true)
  assert.equal(helper.uncertainOralWrite(new Error('Malformed response')), true)
  assert.equal(helper.uncertainOralWrite(new AxiosError('bad', 'ERR', undefined, undefined, { status: 500 })), true)
  assert.equal(helper.uncertainOralWrite(new AxiosError('stale', 'ERR', undefined, undefined, { status: 409 })), false)
})
test('danh tính tab và payload chờ khôi phục nguyên vẹn, tách theo user/exam/backend', () => {
  const key = session.oralSessionKey('student', 7, 'http://127.0.0.1:8081')
  const identity = session.loadOralClient(key); assert.equal(session.loadOralClient(key).id, identity.id)
  const request = { ...command(), clientSessionId: identity.id }; session.saveOralPending(key, request)
  assert.deepEqual(session.loadOralPending(key, identity.id), request)
  assert.equal(session.loadOralPending(key, clientId), null)
  assert.notEqual(key, session.oralSessionKey('another', 7, 'http://127.0.0.1:8081'))
  assert.notEqual(key, session.oralSessionKey('student', 8, 'http://127.0.0.1:8081'))
  assert.notEqual(key, session.oralSessionKey('student', 7, 'http://localhost:8080'))
  session.saveOralPending(key, null); assert.equal(session.loadOralPending(key, identity.id), null)
})
test('sessionStorage hỏng không trở thành lệnh gửi tự động', () => {
  storage.set('key:pending', '{broken'); assert.equal(session.loadOralPending('key', clientId), null)
  storage.set('key:pending', JSON.stringify({ ...command(), action: 'CREATE_FAKE_ANSWER' })); assert.equal(session.loadOralPending('key', clientId), null)
})
test('phòng thi thật không hiển thị câu hỏi, đáp án, input sửa transcript hoặc công cụ demo khi ở production', () => {
  const state = helper.parseOralState(fixture(), 7)
  state.transcripts = [{ questionOrder: 1, followUpIndex: 0, content: '<script>Sample</script>', savedAt: state.serverTime }]
  const html = renderToStaticMarkup(createElement(Room, { state, receivedAt: performance.now(), demo: false, blocked: false, onCommand() {}, onFinish() {} }))
  assert.ok(!html.includes('<textarea')); assert.ok(!html.includes('Tình huống thử cục bộ')); assert.ok(!html.includes('<script>Sample'))
  assert.ok(html.includes('&lt;script&gt;Sample&lt;/script&gt;')); assert.ok(html.includes('Tiến độ từ backend'))
})
test('phòng demo ghi nhãn mẫu và không tự viết transcript trong component', () => {
  const html = renderToStaticMarkup(createElement(Room, { state: helper.parseOralState(fixture(), 7), receivedAt: performance.now(), demo: true, blocked: false, onCommand() {}, onFinish() {} }))
  assert.ok(html.includes('Tình huống thử cục bộ')); assert.ok(html.includes('Dữ liệu mẫu từ backend cục bộ'))
  assert.ok(html.includes('Chưa có câu trả lời được backend lưu'))
})
