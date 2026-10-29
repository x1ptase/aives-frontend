import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

/** Kiểm thử luồng mẫu không gọi backend, AI hoặc mic thật. */
let server, machine, Room, Setup
const now = 1800000000000
before(async () => {
  server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  machine = await server.ssrLoadModule('/src/modules/exams/components/oralPreviewMachine.ts')
  Room = (await server.ssrLoadModule('/src/modules/exams/components/OralPreviewRoom.tsx')).default
  Setup = (await server.ssrLoadModule('/src/modules/exams/components/OralPreviewSetup.tsx')).default
})
after(async () => { await server?.close() })
const create = (config = {}) => machine.createOralPreview({ ...machine.defaultPreviewConfig, ...config }, now)
const act = (state, type, extra = {}) => machine.oralPreviewReducer(state, { type, now: state.lastTick - state.clockOffset, ...extra })
const spoken = state => act(state, 'SPOKEN', { speechId: state.speechId })
const answer = (state, style = 'clear') => {
  const processing = act(spoken(state), 'SUBMIT', { style })
  return act(processing, 'PROCESSED', { speechId: processing.speechId })
}
const renderRoom = state => renderToStaticMarkup(createElement(Room, { state, send() {}, onFinish() {}, onReset() {} }))

test('tạo cấu hình mẫu hợp lệ và từ chối số câu không có fixture', () => {
  const state = create()
  assert.equal(state.questions.length, 3)
  assert.equal(state.deadline - now, 300000)
  assert.throws(() => create({ mainCount: 4 }), /không hợp lệ/)
})
test('lần lượt trả lời đủ số câu chính rồi tự hoàn tất, không bắt dùng hết follow-up', () => {
  let state = create()
  for (let index = 0; index < 3; index++) {
    assert.equal(state.current, index)
    state = answer(state)
  }
  assert.equal(state.phase, 'COMPLETED')
  assert.equal(state.followUpsUsed, 0)
  assert.ok(state.questions.every(q => q.status === 'ANSWERED'))
})
test('follow-up tối đa tính toàn bài, câu sau không được cấp lại ngân sách', () => {
  let state = create()
  for (let n = 0; n < 3; n++) state = answer(state, 'brief')
  assert.equal(state.current, 1)
  assert.equal(state.followUpsUsed, 2)
  state = answer(state, 'brief')
  assert.equal(state.current, 2)
  assert.equal(state.followUpsUsed, 2)
})
test('giới hạn follow-up bằng 0 vẫn lưu câu trả lời và chuyển câu', () => {
  const state = answer(create({ followUpLimit: 0 }), 'brief')
  assert.equal(state.current, 1)
  assert.equal(state.followUpsUsed, 0)
})
test('nghe lại giữ câu, thời gian và số follow-up, không thêm transcript', () => {
  let state = answer(create(), 'brief')
  state = spoken(state)
  state = act(state, 'TICK', { now: now + 9000 })
  const before = structuredClone(state)
  state = act(state, 'REPLAY')
  assert.equal(state.phase, 'SPEAKING')
  assert.equal(state.questions[0].remainingMs, before.questions[0].remainingMs)
  assert.equal(state.followUpsUsed, 1)
  assert.deepEqual(state.questions[0].transcripts, before.questions[0].transcripts)
  assert.equal(machine.previewSpeech(state), machine.previewSpeech(before))
})
test('bỏ qua rồi quay lại sau lượt đầu giữ ngân sách câu và không tự nộp', () => {
  let state = spoken(create({ mainCount: 2 }))
  state = act(state, 'TICK', { now: now + 15000 })
  state = act(state, 'DEFER')
  assert.equal(state.current, 1)
  assert.equal(state.questions[0].status, 'DEFERRED')
  assert.equal(act(state, 'REVISIT', { index: 0 }).current, 1)
  state = answer(state)
  assert.equal(state.phase, 'REVIEW')
  state = act(state, 'REVISIT', { index: 0 })
  assert.equal(state.questions[0].remainingMs, 75000)
  assert.equal(state.phase, 'SPEAKING')
  state = answer(state)
  assert.equal(state.phase, 'COMPLETED')
})
test('không cho bỏ qua follow-up hoặc quay lại câu đã trả lời', () => {
  let state = spoken(answer(create(), 'brief'))
  assert.equal(act(state, 'DEFER').phase, 'ANSWERING')
  state = answer(state)
  assert.equal(state.current, 1)
  assert.equal(act(state, 'REVISIT', { index: 0 }).current, 1)
})
test('âm thanh rỗng không tạo transcript, không chuyển câu và không đóng đồng hồ', () => {
  let state = spoken(create())
  state = act(state, 'SUBMIT', { style: 'empty', now: now + 1000 })
  assert.equal(state.phase, 'ANSWERING')
  assert.equal(state.questions[0].transcripts.length, 0)
  assert.equal(state.questions[0].remainingMs, 89000)
  assert.match(state.notice, /rỗng/)
})
test('lỗi kỹ thuật khi xử lý được retry cùng lượt, không thêm transcript hoặc follow-up trùng', () => {
  let state = act(spoken(create()), 'SUBMIT', { style: 'brief' })
  const oldId = state.speechId
  state = act(state, 'FAIL', { message: 'Lỗi STT mẫu' })
  assert.equal(state.phase, 'PAUSED')
  assert.equal(state.questions[0].status, 'ACTIVE')
  state = act(state, 'RESUME')
  assert.equal(state.phase, 'PROCESSING')
  state = act(state, 'PROCESSED', { speechId: oldId })
  assert.equal(state.phase, 'PROCESSING')
  state = act(state, 'PROCESSED', { speechId: state.speechId })
  assert.equal(state.questions[0].transcripts.length, 1)
  assert.equal(state.followUpsUsed, 1)
  assert.equal(act(state, 'PROCESSED', { speechId: state.speechId }).questions[0].transcripts.length, 1)
})
test('chỉ thời gian trả lời trừ ngân sách câu, không trừ lúc giọng đọc hoặc xử lý', () => {
  let state = act(create(), 'TICK', { now: now + 5000 })
  assert.equal(state.questions[0].remainingMs, 90000)
  state = spoken(state)
  state = act(state, 'SUBMIT', { style: 'clear', now: now + 8000 })
  state = act(state, 'TICK', { now: now + 15000 })
  assert.equal(state.questions[0].remainingMs, 87000)
})
test('hết ngân sách trong im lặng là NO_ANSWER, không sinh transcript giả', () => {
  const state = act(spoken(create()), 'TICK', { now: now + 90000 })
  assert.equal(state.questions[0].status, 'NO_ANSWER')
  assert.equal(state.questions[0].transcripts.length, 0)
  assert.equal(state.current, 1)
})
test('hết thời gian follow-up vẫn giữ câu trả lời chính trước đó', () => {
  const state = act(spoken(answer(create(), 'brief')), 'TICK', { now: now + 90000 })
  assert.equal(state.questions[0].status, 'ANSWERED')
  assert.equal(state.questions[0].transcripts.length, 1)
})
test('bấm nộp đúng thời điểm hết giờ câu không áp dụng trả lời cho câu kế tiếp', () => {
  const state = act(spoken(create()), 'SUBMIT', { style: 'clear', now: now + 90000 })
  assert.equal(state.current, 1)
  assert.equal(state.phase, 'SPEAKING')
  assert.equal(state.pending, null)
})
for (const phase of ['SPEAKING', 'ANSWERING', 'PROCESSING', 'PAUSED', 'REVIEW']) {
  test(`deadline tuyệt đối thắng thao tác khi đang ${phase}`, () => {
    let state = create({ mainCount: 1 })
    if (phase !== 'SPEAKING') state = spoken(state)
    if (phase === 'PROCESSING') state = act(state, 'SUBMIT', { style: 'brief' })
    if (phase === 'PAUSED') state = act(state, 'PAUSE')
    if (phase === 'REVIEW') state = act(state, 'DEFER')
    state = act(state, 'TICK', { now: state.deadline })
    assert.equal(state.phase, 'EXPIRED')
    assert.equal(state.questions[0].status, 'NO_ANSWER')
    assert.equal(state.questions[0].transcripts.length, 0)
    assert.equal(act(state, 'PROCESSED', { speechId: state.speechId }).phase, 'EXPIRED')
  })
}
test('nộp các câu bỏ qua giữ transcript câu đã trả lời, không sinh điểm', () => {
  let state = act(spoken(create({ mainCount: 2 })), 'DEFER')
  state = answer(state)
  state = act(state, 'FINISH')
  assert.equal(state.phase, 'COMPLETED')
  assert.equal(state.questions[0].status, 'NO_ANSWER')
  assert.equal(state.questions[1].transcripts.length, 1)
  assert.equal('score' in state, false)
})
test('refresh giữ deadline, ngân sách, lượt đào sâu và chờ thao tác tiếp tục', () => {
  let state = spoken(answer(create(), 'brief'))
  state = act(state, 'TICK', { now: now + 12000 })
  const restored = machine.restoreOralPreview(JSON.stringify(state), now + 25000)
  assert.equal(restored.phase, 'PAUSED')
  assert.equal(restored.deadline, state.deadline)
  assert.equal(restored.questions[0].remainingMs, 78000)
  assert.equal(restored.followUpsUsed, 1)
  assert.equal(act(restored, 'RESUME').turn, 1)
})
test('refresh khi đang xử lý tiếp tục đúng lượt, không gửi mẫu hai lần', () => {
  const state = act(spoken(create()), 'SUBMIT', { style: 'brief' })
  const restored = machine.restoreOralPreview(JSON.stringify(state), now + 5000)
  assert.equal(restored.resumePhase, 'PROCESSING')
  const resumed = act(restored, 'RESUME')
  assert.equal(resumed.phase, 'PROCESSING')
  assert.equal(act(resumed, 'PROCESSED', { speechId: resumed.speechId }).questions[0].transcripts.length, 1)
})
test('refresh sau deadline thành EXPIRED, không cấp thêm thời gian', () => {
  const state = create()
  assert.equal(machine.restoreOralPreview(JSON.stringify(state), state.deadline + 1).phase, 'EXPIRED')
})
test('dữ liệu sessionStorage hỏng bị bỏ qua an toàn', () => {
  for (const value of [null, '', '{', 'null', '{}', JSON.stringify({ ...create(), turn: 99 }), JSON.stringify({ ...create(), questions: [null] })]) {
    assert.equal(machine.restoreOralPreview(value, now), null)
  }
})
test('tua thời gian mẫu tác động đồng hồ và được giữ khi refresh', () => {
  const state = act(spoken(create()), 'FAST_FORWARD')
  assert.equal(state.clockOffset, 30000)
  assert.equal(state.questions[0].remainingMs, 60000)
  assert.equal(machine.restoreOralPreview(JSON.stringify(state), now).clockOffset, 30000)
})
test('giọng đọc có số thứ tự, Việt/Anh theo câu chính và follow-up cùng ngôn ngữ', () => {
  let state = create({ language: 'mixed' })
  assert.match(machine.previewSpeech(state), /^Câu số 1\./)
  state = answer(state)
  assert.match(machine.previewSpeech(state), /^Question number 2\./)
  state = answer(state, 'brief')
  assert.equal(machine.previewLanguage(state), 'en')
  assert.match(machine.previewSpeech(state), /^Follow-up question 1\./)
})
test('callback đọc cũ không mở lượt trả lời mới', () => {
  const state = act(spoken(create()), 'REPLAY')
  assert.equal(act(state, 'SPOKEN', { speechId: state.speechId - 1 }).phase, 'SPEAKING')
})
test('reducer không thay đổi state đầu vào khi trả lời, bỏ qua hoặc hết giờ', () => {
  const state = spoken(create())
  const snapshot = JSON.stringify(state)
  act(state, 'DEFER')
  answer(state)
  act(state, 'TICK', { now: now + 90000 })
  assert.equal(JSON.stringify(state), snapshot)
})
test('giao diện phòng không render câu hỏi, đáp án, input transcript hoặc danh sách đề', () => {
  const state = answer(create(), 'brief')
  const html = renderRoom(state)
  assert.ok(!html.includes('Hãy giải thích mục đích'))
  assert.ok(!html.includes('Em có thể nêu một ví dụ cụ thể không?'))
  assert.ok(!html.includes('<textarea'))
  assert.match(html, /Dữ liệu mẫu · Chỉ đọc/)
  assert.match(html, /Theo em, cần xác định rõ nhu cầu/)
})
test('màn hình chuẩn bị ghi rõ mock và chặn bắt đầu trước khi đồng ý', () => {
  const html = renderToStaticMarkup(createElement(Setup, { onStart() {} }))
  assert.match(html, /không ghi kết quả vào bài thi thật/)
  assert.match(html, /disabled=""[^>]*>Bắt đầu mô phỏng/)
  assert.match(html, /Kiểm tra quyền mic/)
})
test('màn tổng kết và hàng đợi không cung cấp nút sửa câu đã trả lời', () => {
  let state = act(spoken(create({ mainCount: 2 })), 'DEFER')
  state = answer(state)
  const review = renderRoom(state)
  assert.match(review, /Trả lời câu chính 1/)
  assert.ok(!review.includes('Trả lời câu chính 2'))
  assert.match(review, /Nộp bài với các câu chưa trả lời/)
  assert.match(renderRoom(act(state, 'FINISH')), /Đã hoàn tất mô phỏng/)
})

test('trang con phòng thử vẫn chọn My Exams ở sidebar và breadcrumb', async () => {
  const Sidebar = (await server.ssrLoadModule('/src/app/layout/Sidebar.tsx')).default
  const Header = (await server.ssrLoadModule('/src/app/layout/TopHeader.tsx')).default
  const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/student/exams/oral-preview'] },
    createElement(Sidebar, { role: 'student', open: false, onClose() {} }), createElement(Header, { role: 'student' })))
  assert.match(html, /aria-label="My Exams"[^>]*bg-\[#EFF6FF\]/)
  assert.match(html, /text-slate-700 font-medium truncate">My Exams/)
})
