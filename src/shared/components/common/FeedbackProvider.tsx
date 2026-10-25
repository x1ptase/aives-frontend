import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { FeedbackContext, type Confirmation, type FeedbackMessage } from './feedback'
import FeedbackPopup from './FeedbackPopup'

/** Một mục trong hàng đợi popup; resolver chỉ tồn tại cho yêu cầu xác nhận. */
interface FeedbackEntry {
  /** ID ngăn thao tác đóng cũ vô tình đóng popup kế tiếp. */ id: number
  /** Nội dung an toàn để render. */ content: Confirmation
  /** Hàm hoàn tất Promise khi người dùng chọn hoặc rời trang. */ resolve?: (accepted: boolean) => void
}

/** Provider cấp trang giữ popup sống sau khi form/modal con đã đóng; không cài đặt thư viện mới. */
export default function FeedbackProvider({ children }: {
  /** Trang hiện hành và các modal con dùng chung popup. */ children: ReactNode
}) {
  const [queue, setQueue] = useState<FeedbackEntry[]>([])
  const sequence = useRef(0)
  const mounted = useRef(true)
  const pending = useRef(new Set<(accepted: boolean) => void>())
  useEffect(() => {
    mounted.current = true
    const resolutions = pending.current
    return () => {
      mounted.current = false
      resolutions.forEach(resolve => resolve(false))
      resolutions.clear()
    }
  }, [])

  /** Dồn phản hồi thay vì ghi đè khi nhiều request trả lỗi/kết quả cùng lúc. */
  const notify = useCallback((content: FeedbackMessage) => {
    if (!mounted.current) return
    const entry = { id: ++sequence.current, content }
    setQueue(items => [...items, entry])
  }, [])

  /** Chỉ Promise được chấp nhận mới cho phép caller gửi request ghi. */
  const confirm = useCallback((content: Confirmation): Promise<boolean> => {
    if (!mounted.current) return Promise.resolve(false)
    return new Promise(resolve => {
      const settle = (accepted: boolean) => { pending.current.delete(settle); resolve(accepted) }
      pending.current.add(settle)
      const entry = { id: ++sequence.current, content, resolve: settle }
      setQueue(items => [...items, entry])
    })
  }, [])

  const feedback = useMemo(() => ({ notify, confirm }), [notify, confirm])
  const entry = queue[0]
  /** Xác nhận một mục duy nhất; click lặp không được loại bỏ mục kế tiếp trong hàng đợi. */
  const dismiss = (accepted: boolean) => {
    if (!entry) return
    entry.resolve?.(accepted)
    setQueue(items => items[0]?.id === entry.id ? items.slice(1) : items)
  }
  return <FeedbackContext.Provider value={feedback}>
    {children}
    {entry && <FeedbackPopup key={entry.id} content={entry.content} confirmation={!!entry.resolve} onResolve={dismiss} />}
  </FeedbackContext.Provider>
}
