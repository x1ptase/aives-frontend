import { before, beforeEach, afterEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'
import { createElement, act } from 'react'
import { createServer } from 'vite'
import { initTestI18n } from '../../test-utils/i18n.mjs'

/** DOM React thật, API giả; không gọi TTS, backend hoặc ghi âm thật. */
let dom, server, Room, api, client, createRoot, root, host, calls, adapter
const turn = '11111111-1111-4111-8111-111111111111'
const nextTurn = '22222222-2222-4222-8222-222222222222'
const state = (phase = 'ANSWERING', extra = {}) => ({ studentExamId: 7, status: 'IN_PROGRESS', phase, revision: 2,
  serverTime: '2035-01-01T10:00:00Z', deadline: '2035-01-01T10:20:00Z', leaseUntil: '2035-01-01T10:00:45Z',
  mainCount: 2, currentQuestionOrder: 1, currentTurnId: turn, followUpIndex: 0, language: 'vi', followUpsUsed: 0, maxFollowUps: 2,
  answerRemainingMs: 180000, submissionId: null, questions: [{ questionOrder: 1, status: 'ACTIVE', answerRemainingMs: 180000, outcomeReason: null }], transcripts: [], ...extra })
const result = (extra = {}) => ({ code: 1000, result: { turnId: turn, questionOrder: 1, followUpIndex: 0, language: 'vi', text: 'Vật chất và ý thức có quan hệ như thế nào?', ...extra } })
const button = label => [...host.querySelectorAll('button')].find(item => item.textContent === label)
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)) }) }
const render = async value => { await act(async () => root.render(createElement(Room, { state: value, receivedAt: performance.now(), demo: false, blocked: false, onCommand() { assert.fail('Xem text không được gửi lệnh thi') }, onFinish() { assert.fail('Xem text không nộp bài') } }))) }
const click = async label => { const target = button(label); assert.ok(target, label); await act(async () => target.click()); await settle() }

before(async () => {
  dom = new Window({ url: 'http://localhost:5173/student/exams/7/oral' })
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'localStorage', 'sessionStorage']) Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? dom : dom[name] })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  createRoot = (await import('react-dom/client')).createRoot
  server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  await initTestI18n(server)
  Room = (await server.ssrLoadModule('/src/modules/exams/components/OralExamRoom.tsx')).default
  api = (await server.ssrLoadModule('/src/modules/exams/oralApi.ts')).oralApi
  client = (await server.ssrLoadModule('/src/shared/api/axios.ts')).default
  client.defaults.adapter = async config => { calls.push(config); return { data: await adapter(config), status: 200, statusText: 'OK', headers: {}, config } }
})
beforeEach(() => {
  calls = []; adapter = async () => result()
  localStorage.setItem('access_token', 'FIXTURE_TOKEN')
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
after(async () => { await server.close(); await dom.happyDOM.abort(); delete globalThis.IS_REACT_ACT_ENVIRONMENT })

test('Nút chỉ có sau khi nghe xong, không tự tải câu hoặc gọi lại TTS khi mở/ẩn/mở', async () => {
  await render(state('PREPARING')); assert.equal(button('Hiển thị câu hỏi dạng text'), undefined)
  await render(state('SPEAKING')); assert.equal(button('Hiển thị câu hỏi dạng text'), undefined)
  await render(state()); assert.equal(calls.length, 0); assert.ok(!host.textContent.includes(result().result.text))
  await click('Hiển thị câu hỏi dạng text')
  assert.equal(calls.length, 1); assert.equal(calls[0].method, 'get')
  assert.equal(calls[0].url, `/student-exams/7/oral-examination/turns/${turn}/question-text`)
  assert.equal(calls[0].headers.Authorization, 'Bearer FIXTURE_TOKEN')
  assert.equal(button('Ẩn câu hỏi dạng text').getAttribute('aria-expanded'), 'true')
  assert.match(host.textContent, /Vật chất và ý thức/)
  await click('Ẩn câu hỏi dạng text'); assert.ok(!host.textContent.includes(result().result.text))
  await click('Hiển thị câu hỏi dạng text'); assert.equal(calls.length, 1)
})

test('Đổi follow-up/câu chính xóa text cũ và không tự mở câu mới; text được escape', async () => {
  await render(state()); await click('Hiển thị câu hỏi dạng text')
  await render(state('ANSWERING', { currentTurnId: nextTurn, followUpIndex: 1 }))
  assert.equal(calls.length, 1); assert.ok(!host.textContent.includes(result().result.text))
  adapter = async () => result({ turnId: nextTurn, followUpIndex: 1, text: '<script>alert(1)</script> Giải thích thêm?' })
  await click('Hiển thị câu hỏi dạng text')
  assert.equal(host.querySelector('script'), null); assert.match(host.textContent, /<script>alert\(1\)<\/script> Giải thích thêm\?/)
  await render(state('PREPARING', { currentTurnId: nextTurn, currentQuestionOrder: 2 }))
  assert.equal(button('Hiển thị câu hỏi dạng text'), undefined); assert.ok(!host.textContent.includes('Giải thích thêm?'))
})

test('Đang tải mà đổi lượt thì hủy request; kết quả về muộn không hiện ở câu mới', async () => {
  let resolve
  adapter = () => new Promise(done => { resolve = done })
  await render(state()); await click('Hiển thị câu hỏi dạng text')
  assert.ok(button('Đang tải câu hỏi…').disabled)
  const signal = calls[0].signal
  await render(state('ANSWERING', { currentTurnId: nextTurn, currentQuestionOrder: 2 }))
  assert.equal(signal.aborted, true)
  await act(async () => resolve(result())); await settle()
  assert.ok(!host.textContent.includes(result().result.text)); assert.ok(button('Hiển thị câu hỏi dạng text'))
})

test('Response sai thứ tự/ngôn ngữ không được hiện, lỗi cho phép thử lại và không đổi tiến trình', async () => {
  adapter = async () => result({ questionOrder: 2, language: 'en', text: 'Wrong question' })
  await render(state()); await click('Hiển thị câu hỏi dạng text')
  assert.ok(!host.textContent.includes('Wrong question')); assert.ok(host.querySelector('[role="status"]'))
  adapter = async () => result()
  await click('Hiển thị câu hỏi dạng text'); assert.match(host.textContent, /Vật chất và ý thức/)
  await render(state('TRANSCRIBING')); assert.equal(button('Hiển thị câu hỏi dạng text'), undefined)
  assert.ok(!host.textContent.includes(result().result.text))
})

test('API chặn UUID/mã lượt sai và response không hợp lệ, chỉ trả các trường được công bố', async () => {
  await assert.rejects(api.questionText(0, turn)); await assert.rejects(api.questionText(7, 'wrong')); assert.equal(calls.length, 0)
  for (const value of [result({ turnId: nextTurn }), result({ text: '' }), result({ text: 'a'.repeat(10001) }), result({ language: 'fr' }), result({ followUpIndex: -1 })]) {
    adapter = async () => value; await assert.rejects(api.questionText(7, turn))
  }
  adapter = async () => result({ referenceAnswer: 'PRIVATE', rubric: 'PRIVATE' })
  assert.deepEqual(await api.questionText(7, turn), result().result)
})
