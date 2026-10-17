import { type ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: string
  icon?: ReactNode
  trend?: string
  trendType?: 'positive' | 'warning' | 'neutral'
  isBar?: boolean
  barPct?: number
  barColor?: string
}

export default function StatCard({
  label,
  value,
  sub,
  accent = '#eff6ff',
  icon,
  trend,
  trendType = 'positive',
  isBar,
  barPct = 0,
  barColor = '#2563eb',
}: StatCardProps) {
  const trendCls =
    trendType === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : trendType === 'neutral'
      ? 'bg-slate-100 text-slate-500'
      : 'bg-emerald-50 text-emerald-700'

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent }}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${trendCls}`}>{trend}</span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {value}
      </div>
      <div className="text-xs text-slate-500 font-medium mb-2">{label}</div>
      {isBar && (
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
          <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
        </div>
      )}
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}
