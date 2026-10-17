interface LoadingStateProps {
  rows?: number
}

export default function LoadingState({ rows = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 bg-slate-100 rounded-lg" />
      ))}
    </div>
  )
}
