import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../api'

// Giá trị status nội bộ ('Active'...) -> khóa dịch hiển thị.
const STATUS_KEY: Record<string, string> = {
  Active: 'aiConfig.status.active',
  Inactive: 'aiConfig.status.inactive',
  'Not configured': 'aiConfig.status.notConfigured',
}

type AiConfig = { labelKey: string, status: string }

export default function AiConfigStatus() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<AiConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data } = await adminApi.getAiConfig()
        const configData = data?.result || {}
        
        const parseStatus = (svc: any) => svc?.active ? 'Active' : (svc?.provider ? 'Inactive' : 'Not configured')
        
        setConfigs([
          { labelKey: 'stt', status: parseStatus(configData.stt) },
          { labelKey: 'tts', status: parseStatus(configData.tts) },
          { labelKey: 'evaluator', status: parseStatus(configData.evaluator) },
          { labelKey: 'embedding', status: parseStatus(configData.embedding) },
        ])
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
        {t('aiConfig.card.title')}
      </h2>
      <div className="flex-1">
        {configs.map(s => (
          <div key={s.labelKey} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">{t(`aiConfig.services.${s.labelKey}.name`)}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : s.status === 'Inactive' ? 'bg-slate-400' : 'bg-red-500'}`}></span>
              <span className={`text-xs font-semibold ${s.status === 'Active' ? 'text-emerald-600' : s.status === 'Inactive' ? 'text-slate-500' : 'text-red-600'}`}>{t(STATUS_KEY[s.status])}</span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/admin/ai-config')}
        className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', fontFamily: 'DM Sans, sans-serif' }}
      >
        {t('aiConfig.card.view')}
      </button>
    </div>
  )
}
