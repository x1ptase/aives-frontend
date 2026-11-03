import axiosInstance from '@/shared/api/axios'
import { examIdentifier } from './examHelpers'

export interface OralProgressEvent { type: 'ready' | 'progress'; revision: number }

/** Fetch streaming cho phép bearer header; không dùng EventSource với token trong query string. */
export async function readOralProgressEvents(examId: number, signal: AbortSignal, event: (value: OralProgressEvent) => void, activity: () => void): Promise<void> {
  const base = (axiosInstance.defaults.baseURL || 'http://localhost:8080').replace(/\/+$/, '')
  const token = localStorage.getItem('access_token')
  const response = await fetch(`${base}/student-exams/${examIdentifier(examId)}/oral-examination/events`, {
    signal, cache: 'no-store', headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!response.ok || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'text/event-stream' || !response.body) {
    await response.body?.cancel().catch(() => {})
    throw new Error('Kênh tiến độ chưa sẵn sàng.')
  }
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let buffer = '', name = '', data: string[] = []
  const line = (value: string) => {
    if (value.length > 4096) throw new Error('Sự kiện quá lớn.')
    if (!value) {
      if (name === 'ready' || name === 'progress') {
        const parsed = JSON.parse(data.join('\n'))
        if (!Number.isSafeInteger(parsed?.revision) || parsed.revision < 0) throw new Error('Sự kiện tiến độ chưa hợp lệ.')
        event({ type: name, revision: parsed.revision })
      }
      name = ''; data = []; return
    }
    if (value.startsWith(':')) return
    const separator = value.indexOf(':')
    const field = separator < 0 ? value : value.slice(0, separator)
    let content = separator < 0 ? '' : value.slice(separator + 1)
    if (content.startsWith(' ')) content = content.slice(1)
    if (field === 'event') name = content
    if (field === 'data') { data.push(content); if (data.join('\n').length > 4096) throw new Error('Sự kiện quá lớn.') }
  }
  try {
    while (!signal.aborted) {
      const part = await reader.read()
      if (part.done) break
      if (signal.aborted) return
      activity(); buffer += decoder.decode(part.value, { stream: true })
      let index: number
      while ((index = buffer.indexOf('\n')) >= 0) {
        line(buffer.slice(0, index).replace(/\r$/, '')); buffer = buffer.slice(index + 1)
      }
      if (buffer.length > 8192) throw new Error('Sự kiện quá lớn.')
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
