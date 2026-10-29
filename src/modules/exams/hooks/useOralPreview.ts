import { useCallback, useEffect, useRef, useState } from 'react'
import { createOralPreview, oralPreviewReducer, restoreOralPreview, type OralPreviewState, type PreviewAction, type PreviewConfig } from '../components/oralPreviewMachine'

/** Điều phối bản thử trong tab; không gọi Start/Finish hoặc lưu dữ liệu lên máy chủ. */
export function useOralPreview(userId: string) {
  const storageKey = `aives:oral-preview:v1:${userId}`
  const [state, setState] = useState<OralPreviewState | null>(() => {
    try { return restoreOralPreview(sessionStorage.getItem(storageKey), Date.now()) } catch { return null }
  })
  const [storageWarning, setStorageWarning] = useState('')
  const current = useRef(state)
  useEffect(() => { current.current = state }, [state])

  /** Dùng cùng reducer cho timer và thao tác để không áp dụng callback lên lượt mới. */
  const send = useCallback((action: PreviewAction) => {
    setState(previous => previous ? oralPreviewReducer(previous, action) : previous)
  }, [])

  useEffect(() => {
    if (!state) return
    let mounted = true
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)) }
    catch { queueMicrotask(() => { if (mounted) setStorageWarning('Trình duyệt không cho lưu bản thử trong tab. Tải lại trang sẽ mất tiến trình mô phỏng.') }) }
    return () => { mounted = false }
  }, [state, storageKey])

  useEffect(() => {
    const tick = window.setInterval(() => send({ type: 'TICK', now: Date.now() }), 250)
    /** Rời tab dừng tương tác, giữ thời hạn tuyệt đối thay vì tự gia hạn. */
    const pause = () => {
      if (document.visibilityState === 'hidden') send({ type: 'PAUSE', now: Date.now() })
    }
    /** pagehide ghi ngay trước khi trang bị đóng, không hiện hộp thoại trình duyệt. */
    const save = () => {
      if (!current.current) return
      const paused = oralPreviewReducer(current.current, { type: 'PAUSE', now: Date.now() })
      try { sessionStorage.setItem(storageKey, JSON.stringify(paused)) } catch { /* Đã có thông báo lưu trữ ở trang. */ }
    }
    document.addEventListener('visibilitychange', pause)
    window.addEventListener('pagehide', save)
    return () => { window.clearInterval(tick); document.removeEventListener('visibilitychange', pause); window.removeEventListener('pagehide', save) }
  }, [send, storageKey])

  useEffect(() => {
    if (state?.phase !== 'PROCESSING') return
    // Độ trễ mẫu; không gửi audio hoặc nội dung tới dịch vụ bên ngoài.
    const timeout = window.setTimeout(() => send({ type: 'PROCESSED', speechId: state.speechId, now: Date.now() }), 1100)
    return () => window.clearTimeout(timeout)
  }, [state?.phase, state?.speechId, send])

  /** Khởi tạo mới chỉ sau khi người dùng bấm bắt đầu trong màn hình chuẩn bị. */
  const start = (config: PreviewConfig) => setState(createOralPreview(config, Date.now()))
  /** Xóa đúng bản thử của tài khoản hiện tại, không chạm dữ liệu thi thật. */
  const reset = () => {
    try { sessionStorage.removeItem(storageKey) } catch { /* Reset vẫn hoạt động trong bộ nhớ. */ }
    setState(null)
  }
  return { state, send, start, reset, storageWarning }
}
