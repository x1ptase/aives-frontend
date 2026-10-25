interface ErrorStateProps {
  title: string
  message: string
  onRetry?: () => void
  /** Nhãn nút thử lại theo ngôn ngữ của màn hình; mặc định giữ giao diện hiện có. */
  retryLabel?: string
}

export default function ErrorState({ title, message, onRetry, retryLabel = 'Retry' }: ErrorStateProps) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-semibold text-red-600">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
