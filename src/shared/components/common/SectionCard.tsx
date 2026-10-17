import { type ReactNode } from 'react'

interface SectionCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

export default function SectionCard({ title, subtitle, children, action, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {title}
          </h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}
