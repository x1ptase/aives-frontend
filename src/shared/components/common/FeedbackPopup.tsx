import { useId } from 'react'
import type { Confirmation } from './feedback'
import Dialog from './Dialog'

/** Popup xác nhận/thông báo trong ứng dụng; không dùng hộp thoại hệ thống của trình duyệt. */
export default function FeedbackPopup({ content, confirmation, onResolve }: {
  /** Nội dung chỉ hiển thị dạng text để tránh đưa HTML máy chủ vào DOM. */ content: Confirmation
  /** Chế độ xác nhận có hai nút, thông báo chỉ có nút đóng. */ confirmation: boolean
  /** Đóng/Escape là false; chỉ nút xác nhận mới trả true. */ onResolve: (accepted: boolean) => void
}) {
  const messageId = useId()
  return <Dialog title={content.title} busy={false} compact descriptionId={messageId} onClose={() => onResolve(false)}>
    <div className="space-y-6 p-6">
      <p id={messageId} className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${content.tone === 'error' ? 'text-red-700' : content.tone === 'success' ? 'text-emerald-800' : 'text-slate-600'}`}>{content.message}</p>
      <div className="flex flex-wrap justify-end gap-3">
        {confirmation && <button autoFocus type="button" onClick={() => onResolve(false)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Hủy</button>}
        <button autoFocus={!confirmation} type="button" onClick={() => onResolve(confirmation)}
          className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${confirmation && content.tone === 'error' ? 'bg-red-700 hover:bg-red-800' : 'bg-slate-800 hover:bg-slate-700'}`}>
          {confirmation ? content.confirmLabel ?? 'Xác nhận' : 'Đã hiểu'}
        </button>
      </div>
    </div>
  </Dialog>
}
