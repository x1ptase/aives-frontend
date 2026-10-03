import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'

type AiServiceConfig = {
  provider?: string
  model?: string
  apiKeyMasked?: string
  active?: boolean
}

type AiConfigResponse = {
  stt?: AiServiceConfig
  tts?: AiServiceConfig
  embedding?: AiServiceConfig
  evaluator?: AiServiceConfig
}

const SERVICE_META: Record<string, { name: string, description: string, accent: string, iconColor: string, icon: React.ReactNode }> = {
  stt: {
    name: 'Speech-to-Text',
    description: 'Converts student speech to text during viva sessions.',
    accent: '#eff6ff',
    iconColor: '#2563eb',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
    ),
  },
  tts: {
    name: 'Text-to-Speech',
    description: 'Reads AI questions aloud during viva sessions.',
    accent: '#f0fdf4',
    iconColor: '#15803d',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ),
  },
  embedding: {
    name: 'RAG / Embedding',
    description: 'Generates embeddings for learning materials and RAG retrieval.',
    accent: '#fff7ed',
    iconColor: '#ea580c',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" />
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  evaluator: {
    name: 'AI Evaluator',
    description: 'Evaluates student answers and generates scores and feedback.',
    accent: '#faf5ff',
    iconColor: '#7c3aed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    ),
  },
}

function StatusPill({ status }: { status: 'Active' | 'Inactive' | 'Not configured' }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Active
      </span>
    )
  }
  if (status === 'Inactive') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Inactive
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Not configured
    </span>
  )
}

export default function AiConfigPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [config, setConfig] = useState<AiConfigResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Guard route for Admin only
  useEffect(() => {
    const role = user?.role?.toLowerCase()
    if (role !== 'admin') {
      navigate('/login')
    }
  }, [user, navigate])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await adminApi.getAiConfig()
      const data = res.data?.result || {}
      setConfig(data)
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  if (user?.role?.toLowerCase() !== 'admin') return null

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            AI & API Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Read-only view of AI services and API connections used by the AIVES platform.
          </p>
        </div>
        <button
          onClick={fetchConfig}
          disabled={loading}
          className="px-4 py-2 flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading && !config ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 animate-spin mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm font-medium">Loading AI configuration...</p>
        </div>
      ) : error && !config ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-red-500 mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium mb-4 text-slate-600">Unable to load AI configuration. Please try again.</p>
          <button
            onClick={fetchConfig}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {['stt', 'tts', 'embedding', 'evaluator'].map(key => {
            const meta = SERVICE_META[key]
            const svcData = config?.[key as keyof AiConfigResponse]
            
            const isConfigured = !!svcData && !!svcData.provider
            const statusLabel = isConfigured ? (svcData.active ? 'Active' : 'Inactive') : 'Not configured'

            return (
              <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.accent, color: meta.iconColor }}>
                    {meta.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-0.5">
                      <h2 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{meta.name}</h2>
                      <StatusPill status={statusLabel} />
                    </div>
                    <p className="text-xs text-slate-400 mb-6">{meta.description}</p>

                    {/* Read-Only Fields */}
                    <div className="flex items-start gap-12 flex-wrap">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Provider</span>
                        <div className="text-sm font-medium text-slate-800">
                          {isConfigured ? svcData.provider : '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Model / Engine</span>
                        <div className="text-sm font-medium text-slate-800">
                          {isConfigured && svcData.model ? svcData.model : '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">API Key</span>
                        <div className="text-sm font-medium flex items-center h-[20px]">
                          {isConfigured && svcData.apiKeyMasked ? (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500 tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {svcData.apiKeyMasked}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
