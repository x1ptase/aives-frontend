import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { readOralProgressEvents, type OralProgressEvent } from '../components/oralProgressEvents'

/** SSE chỉ giảm chờ cập nhật; REST/polling vẫn phục hồi khi mất sự kiện hoặc server không hỗ trợ. */
export function useOralProgressEvents(examId: number, enabled: boolean, changed: (event: OralProgressEvent) => void) {
  const [connected, setConnected] = useState(false)
  const callback = useRef(changed)
  useLayoutEffect(() => { callback.current = changed }, [changed])
  useEffect(() => {
    if (!enabled || import.meta.env.VITE_ORAL_SSE_ENABLED === 'false') return
    let disposed = false, active: AbortController | null = null, retry: ReturnType<typeof setTimeout> | undefined
    let idle: ReturnType<typeof setTimeout> | undefined, backoff = 1000
    queueMicrotask(() => { if (!disposed) setConnected(false) })
    const visible = () => document.visibilityState !== 'hidden'
    const connect = async () => {
      if (disposed || !visible() || active) return
      const controller = new AbortController(); active = controller
      const touch = () => { window.clearTimeout(idle); idle = window.setTimeout(() => controller.abort(), 30000) }
      // Cả trường hợp proxy không trả header lẫn stream im lặng đều phải trở về polling.
      idle = window.setTimeout(() => controller.abort(), 10000)
      try {
        await readOralProgressEvents(examId, controller.signal, value => {
          if (disposed || controller.signal.aborted) return
          if (value.type === 'ready') { backoff = 1000; setConnected(true) }
          callback.current(value)
        }, touch)
      } catch { /* SSE lỗi không khóa UI hoặc làm mất bản ghi; REST giữ cách xử lý lỗi/xác thực hiện tại. */ }
      finally {
        controller.abort()
        if (active === controller) active = null
        window.clearTimeout(idle)
        if (!disposed) {
          setConnected(false)
          if (visible()) { retry = window.setTimeout(() => void connect(), backoff); backoff = Math.min(backoff * 2, 10000) }
        }
      }
    }
    const visibility = () => {
      window.clearTimeout(retry)
      if (document.visibilityState === 'hidden') { active?.abort(); setConnected(false) }
      else if (!active) void connect()
    }
    document.addEventListener('visibilitychange', visibility)
    void connect()
    return () => { disposed = true; active?.abort(); window.clearTimeout(retry); window.clearTimeout(idle); document.removeEventListener('visibilitychange', visibility) }
  }, [examId, enabled])
  return enabled && connected
}
