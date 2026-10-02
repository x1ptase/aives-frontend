import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '@/services/api'

type AiConfig = { label: string, detail: string, status: string }

export default function AiConfigStatus() {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<AiConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data } = await adminApi.getAiConfig()
        setConfigs(data)
      } catch (error) {
        console.error('Failed to fetch AI config', error)
      } finally {
        setLoading(false)
      }
    }
    fetchConfigs()
  }, [])

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-64 animate-pulse"></div>
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
      <h2 className="font-semibold text-slate-800 text-sm mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        AI Service Status
      </h2>
      <div className="flex-1">
        {configs.map(s => (
          <div key={s.label} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">{s.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.detail}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span className={`text-xs font-semibold ${s.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>{s.status}</span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/admin/ai-config')}
        className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', fontFamily: 'DM Sans, sans-serif' }}
      >
        Manage AI Configuration
      </button>
    </div>
  )
}
