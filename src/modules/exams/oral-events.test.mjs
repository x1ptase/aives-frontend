import { before, beforeEach, afterEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'
import { IDBFactory } from 'fake-indexeddb'
import { createElement, act, useLayoutEffect } from 'react'
import { createServer } from 'vite'
import { initTestI18n } from '../../test-utils/i18n.mjs'

/** HTTP/SSE giả, hook React thật; không gọi backend, Supabase, TTS hoặc mic. */
let dom, server, readEvents, useExam, Provider, client, root, host, createRoot, latest, adapter, fetchCalls, streams, gets, timers
const previousFetch = globalThis.fetch, encode = text => new TextEncoder().encode(text)
const turn = '22222222-2222-4222-8222-222222222222', job = '33333333-3333-4333-8333-333333333333'
const fixture = (extra = {}) => ({ studentExamId: 7, status: 'IN_PROGRESS', phase: 'TRANSCRIBING', revision: 8,
  serverTime: '2035-01-01T10:00:00Z', deadline: '2035-01-01T10:20:00Z', leaseUntil: '2035-01-01T10:00:45Z', mainCount: 1,
  currentQuestionOrder: 1, currentTurnId: turn, followUpIndex: 0, language: 'vi', followUpsUsed: 0, maxFollowUps: 2,
  answerRemainingMs: 180000, submissionId: job, questions: [{ questionOrder: 1, status: 'ACTIVE', answerRemainingMs: 180000, outcomeReason: null }], transcripts: [], ...extra })
const envelope = result => ({ code: 1000, result })
const ready = envelope({ mode: 'LIVE', providersReady: true, speechReady: true, transcriptionReady: true, audioStorageReady: true, message: 'Đã cấu hình.' })
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)) }) }
async function wait(predicate) { for (let i=0; i<400; i++) { await settle(); if (predicate()) return }; assert.fail('Chưa nhận SSE/trạng thái mong đợi') }
function Probe() { const value = useExam(7, 'student'); useLayoutEffect(() => { latest = value }); return null }
async function mount() { await act(async () => root.render(createElement(Provider, null, createElement(Probe)))); await wait(() => latest?.state && streams.length) }
async function emit(index, type, revision) { await act(async () => streams[index].controller.enqueue(encode(`event:${type}\ndata:{"revision":${revision}}\n\n`))); await settle() }

before(async () => {
  dom = new Window({ url: 'http://localhost:5173/student/exams/7/oral' })
  for (const name of ['window','document','navigator','HTMLElement','Node','localStorage','sessionStorage']) Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? dom : dom[name] })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  createRoot = (await import('react-dom/client')).createRoot
  const timeout = dom.setTimeout.bind(dom)
  dom.setTimeout = (callback, ms, ...args) => { if ([800, 3000, 15000].includes(ms)) { timers.push(ms); return timeout(() => {}, 60000) }; return timeout(callback, ms, ...args) }
  server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  await initTestI18n(server)
  readEvents = (await server.ssrLoadModule('/src/modules/exams/components/oralProgressEvents.ts')).readOralProgressEvents
  useExam = (await server.ssrLoadModule('/src/modules/exams/hooks/useOralExam.ts')).useOralExam
  Provider = (await server.ssrLoadModule('/src/shared/components/common/FeedbackProvider.tsx')).default
  client = (await server.ssrLoadModule('/src/shared/api/axios.ts')).default
  client.defaults.baseURL = 'http://localhost:8080'
  client.defaults.adapter = async config => { if (config.url.endsWith('/runtime')) return { data: ready, status: 200, headers: {}, config }; gets++; return { data: envelope(await adapter(config)), status: 200, headers: {}, config } }
})
beforeEach(() => {
  latest = null; gets = 0; fetchCalls = []; streams = []; timers = []; adapter = async () => fixture()
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('access_token', 'FIXTURE_TOKEN')
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url, options })
    let controller
    const record = { cancelled: false }
    const stream = new ReadableStream({ start(value) { controller = value }, cancel() { record.cancelled = true } })
    record.controller = controller; streams.push(record)
    options.signal.addEventListener('abort', () => { try { controller.close() } catch {} }, { once: true })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=UTF-8' } })
  }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
after(async () => { globalThis.fetch = previousFetch; await server.close(); await dom.happyDOM.abort(); delete globalThis.IS_REACT_ACT_ENVIRONMENT })

test('Parser nhận frame bị chia nhỏ/CRLF, bỏ heartbeat, chỉ công bố revision và dùng bearer header', async () => {
  const seen = [], controller = new AbortController()
  const reading = readEvents(7, controller.signal, value => seen.push(value), () => {})
  await wait(() => streams.length)
  for (const text of [':keepalive\r\n\r\nevent:rea', 'dy\r\ndata: {"revision":8,"private":"ignored"}\r\n\r', '\nevent:progress\ndata:{"revision":9}\n\n']) streams[0].controller.enqueue(encode(text))
  streams[0].controller.close(); await reading
  assert.deepEqual(seen, [{ type: 'ready', revision: 8 }, { type: 'progress', revision: 9 }])
  assert.equal(fetchCalls[0].options.headers.Authorization, 'Bearer FIXTURE_TOKEN')
  assert.ok(!fetchCalls[0].url.includes('FIXTURE_TOKEN')); assert.equal(fetchCalls[0].options.cache, 'no-store')
})

test('SSE ready đồng bộ lại trạng thái, progress cập nhật ngay không chờ poll; trùng revision không GET thêm', async () => {
  await mount(); await emit(0, 'ready', 8); await wait(() => timers.includes(15000))
  const initialGets = gets
  adapter = async () => fixture({ phase: 'DECIDING', revision: 9 })
  await emit(0, 'progress', 9); await wait(() => latest.state.phase === 'DECIDING')
  assert.equal(gets, initialGets + 1)
  await emit(0, 'progress', 8); await emit(0, 'progress', 9); assert.equal(gets, initialGets + 1)
  assert.equal(latest.pending, null); assert.equal(latest.controlled, false)
})

test('Sự kiện đến khi GET đang chạy được giữ lại và đọc tiếp, không bỏ mất bước chuyển câu', async () => {
  await mount(); await emit(0, 'ready', 8)
  let release
  adapter = () => new Promise(resolve => { release = resolve })
  const pending = latest.refresh(); await wait(() => !!release)
  await emit(0, 'progress', 10)
  adapter = async () => fixture({ phase: 'PREPARING', revision: 10, submissionId: null, language: null })
  await act(async () => { release(fixture()); await pending })
  await wait(() => latest.state.revision === 10)
  assert.equal(latest.state.phase, 'PREPARING')
})

test('Mất SSE trở về polling; reconnect nhận ready rồi lấy trạng thái mới ngay', async () => {
  await mount(); await emit(0, 'ready', 8); await wait(() => timers.includes(15000))
  await act(async () => streams[0].controller.close()); await wait(() => timers.at(-1) === 800)
  await wait(() => streams.length === 2)
  adapter = async () => fixture({ phase: 'DECIDING', revision: 9 })
  await emit(1, 'ready', 9); await wait(() => latest.state.revision === 9)
})

test('SSE khỏe vẫn đồng bộ đúng mốc hết ngân sách câu, không đợi timer đối soát 15 giây', async () => {
  adapter = async () => fixture({ phase: 'ANSWERING', submissionId: null, answerRemainingMs: 100,
    questions: [{ questionOrder: 1, status: 'ACTIVE', answerRemainingMs: 100, outcomeReason: null }] })
  await mount(); await emit(0, 'ready', 8); await wait(() => timers.includes(15000))
  adapter = async () => fixture({ phase: 'PREPARING', revision: 9, language: null, submissionId: null })
  await wait(() => latest.state.revision === 9)
  assert.equal(latest.state.phase, 'PREPARING')
})

test('Tab ẩn đóng stream; hiện lại mở stream mới; terminal đóng và không tự mở bài thi', async () => {
  await mount(); await emit(0, 'ready', 8)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  await act(async () => document.dispatchEvent(new window.Event('visibilitychange')))
  assert.equal(fetchCalls[0].options.signal.aborted, true)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  await act(async () => document.dispatchEvent(new window.Event('visibilitychange'))); await wait(() => streams.length === 2)
  adapter = async () => fixture({ status: 'COMPLETED', phase: 'COMPLETED', revision: 9, currentQuestionOrder: null, currentTurnId: null, followUpIndex: null, language: null, submissionId: null, answerRemainingMs: null, questions: [{ questionOrder: 1, status: 'ANSWERED', answerRemainingMs: 180000, outcomeReason: null }] })
  await emit(1, 'ready', 9); await wait(() => latest.state.phase === 'COMPLETED')
  assert.equal(fetchCalls[1].options.signal.aborted, true)
})

test('Frame sai/hỏng hoặc quá lớn bị từ chối, không suy diễn thành trạng thái thi', async () => {
  for (const data of ['{"revision":-1}', '{broken', 'x'.repeat(9000)]) {
    const index = streams.length
    const reading = readEvents(7, new AbortController().signal, () => assert.fail('Không được dispatch'), () => {})
    await wait(() => streams.length > index)
    streams[index].controller.enqueue(encode(`event:progress\ndata:${data}\n\n`))
    await assert.rejects(reading)
  }
})
