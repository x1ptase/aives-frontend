import axiosInstance from '@/shared/api/axios'
import type { OralCommand, OralState } from '../oralApi'
import { parseOralState, oralUuid } from './oralExamHelpers'
import { examIdentifier } from './examHelpers'

export function streamError(code: number): Error {
  return Object.assign(new Error('Kênh âm thanh chưa sẵn sàng.'), { response: { data: { code } } })
}
const apiBase = () => (axiosInstance.defaults.baseURL || 'http://localhost:8080').replace(/\/+$/, '')

/** Token chỉ gửi trong AUTH frame qua ws/wss, không nằm trong URL/subprotocol hoặc log. */
export class OralStreamingConnection {
  private socket!: WebSocket
  private connect: () => void
  private readyResolve!: () => void
  private readyReject!: (cause: Error) => void
  private resultResolve?: (state: OralState) => void
  private resultReject?: (cause: Error) => void
  private failure: Error | null = null
  private ready: Promise<void>
  private timer?: ReturnType<typeof setTimeout>
  private finished = false
  constructor(private examId: number, request: Pick<OralCommand, 'clientSessionId' | 'turnId' | 'expectedRevision'>,
    private update: (kind: 'PARTIAL' | 'FINAL', index: number, text: string) => void, private changed: (revision: number) => void = () => {}) {
    examIdentifier(examId); oralUuid(request.clientSessionId); oralUuid(request.turnId)
    const url = new URL(`${apiBase()}/student-exams/${examId}/oral-examination/stream`, window.location.href)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    if (!['ws:', 'wss:'].includes(url.protocol)) throw streamError(1810)
    this.ready = new Promise((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject })
    void this.ready.catch(() => {}) // Mic permission dialog may outlive a failed connection; opened() still rejects.
    // Chỉ mở Azure sau khi microphone đã được cấp quyền; hộp thoại quyền không tiêu idle budget F0.
    this.connect = () => {
      this.socket = new WebSocket(url)
      this.timer = setTimeout(() => this.fail(streamError(1811)), 15000)
      this.socket.onopen = () => { if (!this.failure) this.socket.send(JSON.stringify({ type: 'AUTH', token: localStorage.getItem('access_token') || '' })) }
      this.socket.onerror = () => this.fail(streamError(1811))
      this.socket.onclose = () => { if (!this.finished) this.fail(streamError(1811)) }
      this.socket.onmessage = event => {
        if (this.failure) return
        try {
          if (typeof event.data !== 'string' || event.data.length > 256000) throw streamError(1811)
          const value = JSON.parse(event.data)
          if (value.type === 'AUTHENTICATED') this.socket.send(JSON.stringify({ type: 'START', request }))
          else if (value.type === 'READY' && value.sampleRate === 16000) { clearTimeout(this.timer); this.readyResolve() }
          else if (['PARTIAL', 'FINAL'].includes(value.type) && Number.isSafeInteger(value.segmentIndex) && value.segmentIndex > 0
            && typeof value.text === 'string' && value.text.length <= 20000 && !value.text.includes('\0')) this.update(value.type, value.segmentIndex, value.text)
          else if (value.type === 'RESULT' && this.resultResolve) {
            const state = parseOralState({ code: 1000, result: value.state }, this.examId)
            this.finished = true; clearTimeout(this.timer); this.resultResolve(state)
            if (state.phase !== 'DECIDING') this.socket.close()
          } else if (value.type === 'PROGRESS' && Number.isSafeInteger(value.revision) && value.revision >= 0) {
            this.changed(value.revision)
          } else if (value.type === 'ERROR' && Number.isInteger(value.code)) this.fail(streamError(value.code))
          else throw streamError(1811)
        } catch (cause) { this.fail(cause instanceof Error ? cause : streamError(1811)) }
      }
    }
  }
  async opened(): Promise<void> { if (!this.socket && !this.failure) this.connect(); await this.ready }
  write(pcm: ArrayBuffer): void {
    if (this.failure) throw this.failure
    if (this.socket.readyState !== WebSocket.OPEN || this.socket.bufferedAmount > 128 * 1024) { this.fail(streamError(1811)); throw this.failure }
    this.socket.send(pcm)
  }
  async finish(command: OralCommand): Promise<OralState> {
    await this.opened(); if (this.failure) throw this.failure
    if (this.resultResolve) throw streamError(1811)
    return new Promise((resolve, reject) => {
      this.resultResolve = resolve; this.resultReject = reject
      this.timer = setTimeout(() => this.fail(streamError(1811)), 30000)
      this.socket.send(JSON.stringify({ type: 'FINISH', command }))
    })
  }
  private fail(cause: Error) {
    if (this.failure) return
    this.failure = cause; clearTimeout(this.timer); this.readyReject(cause); this.resultReject?.(cause); this.socket?.close()
  }
  close() { this.fail(new DOMException('Đã dừng kênh âm thanh.', 'AbortError')); clearTimeout(this.timer); this.socket?.close() }
}

/** Audio-only NDJSON, end bắt buộc; không coi EOF/error thành đã nghe xong. */
export async function readSpeechStream(examId: number, request: Pick<OralCommand, 'clientSessionId' | 'turnId' | 'expectedRevision'>,
  signal: AbortSignal, chunk: (pcm: Uint8Array) => void): Promise<void> {
  const token = localStorage.getItem('access_token')
  const response = await fetch(`${apiBase()}/student-exams/${examIdentifier(examId)}/oral-examination/speech-stream`, {
    method: 'POST', signal, cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(request),
  })
  if (!response.ok || !response.body || response.headers.get('content-type')?.split(';')[0] !== 'application/x-ndjson') {
    await response.body?.cancel(); throw streamError(response.status === 401 ? 1003 : response.status === 403 ? 1004 : 1808)
  }
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let buffer = '', ended = false, total = 0
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read(); if (done) break
      buffer += decoder.decode(value, { stream: true })
      let i: number
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i); buffer = buffer.slice(i + 1)
        if (line.length > 16000 || ended) throw streamError(1808)
        const frame = JSON.parse(line)
        if (frame.type === 'audio' && typeof frame.data === 'string' && frame.data.length <= 12000) {
          const raw = atob(frame.data), pcm = Uint8Array.from(raw, char => char.charCodeAt(0)); total += pcm.length
          if (!pcm.length || pcm.length % 2 || total > 8 * 1024 * 1024) throw streamError(1808)
          chunk(pcm)
        } else if (frame.type === 'end' && total > 0) ended = true
        else if (frame.type === 'error' && Number.isInteger(frame.code)) throw streamError(frame.code)
        else throw streamError(1808)
      }
      if (buffer.length > 16000) throw streamError(1808)
    }
    if (signal.aborted) throw new DOMException('Đã hủy audio.', 'AbortError')
    if (!ended || buffer.trim()) throw streamError(1808)
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
