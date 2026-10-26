import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Dialog dùng chung, giữ giao diện hiện có và quản lý focus/Escape bằng phần tử dialog. */
export default function Dialog({ title, subtitle, busy, onClose, children, compact = false, descriptionId }: {
  /** Tiêu đề accessible. */ title: string
  /** Mô tả bổ sung. */ subtitle?: string
  /** Không cho đóng khi request ghi đang chạy. */ busy: boolean
  /** Parent quản lý đóng modal. */ onClose: () => void
  /** Nội dung form hoặc danh sách. */ children: ReactNode
  /** Popup thông báo/xác nhận nhỏ; form hiện có giữ kích thước cũ. */ compact?: boolean
  /** ID nội dung popup để trình đọc màn hình đọc cùng tiêu đề. */ descriptionId?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const subtitleId = useId()
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element?.showModal()
    return () => {
      element?.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId ?? (subtitle ? subtitleId : undefined)} aria-busy={busy}
      onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
      className={`m-auto w-[calc(100%_-_2rem)] ${compact ? 'max-w-md shadow-sm' : 'max-w-3xl shadow-xl'} max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-800 backdrop:bg-slate-900/40`}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
        <div><h2 id={titleId} className="text-lg font-bold">{title}</h2>
          {subtitle && <p id={subtitleId} className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>
        <button type="button" aria-label="Đóng cửa sổ" disabled={busy} onClick={onClose}
          className="rounded px-3 py-1 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50">×</button>
      </div>
      {children}
    </dialog>
  )
}
