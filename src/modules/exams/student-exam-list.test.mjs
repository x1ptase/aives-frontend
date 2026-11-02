import { before, beforeEach, afterEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'
import { createElement, act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

/** Mount danh sách thật, dùng đồng hồ/timer chủ động và adapter giả; không gọi BE hoặc AI. */
let dom, server, Component, client, root, host, createRoot, adapter, calls, timers
const item = status => ({ id: 7, sessionId: 3, sessionTitle: 'Test trạng thái', subjectId: 1, subjectCode: 'MLN111', subjectName: 'Triết học', sessionStatus: 'ONGOING', status, slotOrder: 1,
  scheduledStartAt: '2020-01-01T10:00:00Z', scheduledEndAt: '2020-01-01T10:20:00Z' })
const reply = status => ({ code: 1000, result: { items: [item(status)], page: 0, size: 20, totalElements: 1, totalPages: 1 } })
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)) }) }
const tick = async () => { await act(async () => { for (const callback of timers.values()) callback(); await new Promise(resolve => setTimeout(resolve, 5)) }) }
const mount = async () => { await act(async () => root.render(createElement(MemoryRouter, null, createElement(Component, { title: 'My Exams', subtitle: 'Lịch thi' })))); await settle() }

before(async () => {
  dom = new Window({ url: 'http://localhost:5173/student/exams' })
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'localStorage', 'sessionStorage']) Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? dom : dom[name] })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  createRoot = (await import('react-dom/client')).createRoot
  const interval = dom.setInterval.bind(dom), clear = dom.clearInterval.bind(dom)
  let timerId = 100000
  dom.setInterval = (callback, ms, ...args) => { if (ms === 5000) { const id = timerId++; timers.set(id, callback); return id }; return interval(callback, ms, ...args) }
  dom.clearInterval = id => { if (!timers.delete(id)) clear(id) }
  server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  Component = (await server.ssrLoadModule('/src/modules/exams/components/StudentExamList.tsx')).default
  client = (await server.ssrLoadModule('/src/shared/api/axios.ts')).default
  client.defaults.adapter = async config => { calls++; return { data: await adapter(config), status: 200, statusText: 'OK', headers: {}, config } }
})
beforeEach(() => {
  calls = 0; timers = new Map()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); assert.equal(timers.size, 0); host.remove() })
after(async () => { await server.close(); await dom.happyDOM.abort(); delete globalThis.IS_REACT_ACT_ENVIRONMENT })

test('Danh sách tự nhận EXPIRED từ BE và bỏ nút tiếp tục; không đoán hết giờ theo đồng hồ máy Student', async () => {
  adapter = async () => reply(calls === 1 ? 'IN_PROGRESS' : 'EXPIRED')
  await mount()
  assert.match(host.textContent, /Đang thi/)
  assert.ok(host.querySelector('a[href="/student/exams/7/oral"]'))
  await tick()
  assert.match(host.textContent, /Hết giờ — chưa hoàn thành/)
  assert.match(host.textContent, /ONGOING/)
  assert.equal(host.querySelector('a[href="/student/exams/7/oral"]'), null)
  assert.equal(calls, 2)
  await tick(); assert.equal(calls, 2)
})

test('Poll chậm không chồng request hoặc làm bảng nháy loading, kết quả COMPLETED vẫn được giữ', async () => {
  let resolve, signal
  adapter = async config => {
    if (calls === 1) return reply('IN_PROGRESS')
    signal = config.signal
    return new Promise(done => { resolve = done })
  }
  await mount(); await tick(); await tick()
  assert.equal(calls, 2); assert.match(host.textContent, /Đang thi/)
  await act(async () => { resolve(reply('COMPLETED')); await new Promise(done => setTimeout(done, 5)) })
  assert.match(host.textContent, /Đã hoàn thành/)
  await tick(); assert.equal(calls, 2); assert.equal(signal.aborted, false)
})

test('Tab ẩn không poll; quay lại tab đọc trạng thái mới và cleanup hủy request đang chờ', async () => {
  let signal
  adapter = async config => {
    if (calls === 1) return reply('IN_PROGRESS')
    signal = config.signal
    return new Promise(() => {})
  }
  await mount()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  await tick(); assert.equal(calls, 1)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  await act(async () => document.dispatchEvent(new dom.Event('visibilitychange')))
  assert.equal(calls, 2)
  await act(async () => root.unmount()); assert.equal(signal.aborted, true)
  root = { unmount() {} }
})
