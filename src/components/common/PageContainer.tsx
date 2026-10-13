import { type ReactNode } from 'react'

interface PageContainerProps {
  title?: string
  subtitle?: string
  children: ReactNode
}

export default function PageContainer({ title, subtitle, children }: PageContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {title}
            </h1>
          )}
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
