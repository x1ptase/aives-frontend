import { useState } from 'react'

type ServiceConfig = {
  id: string
  name: string
  description: string
  provider: string
  model: string
  status: 'Active' | 'Inactive'
  apiKeyMasked: string
  accent: string
  iconColor: string
  icon: React.ReactNode
}

const initialServices: ServiceConfig[] = [
  {
    id: 'stt',
    name: 'Speech-to-Text',
    description: 'Converts student speech to text during viva sessions',
    provider: 'OpenAI',
    model: 'Whisper',
    status: 'Active',
    apiKeyMasked: 'sk-••••••••••••••••••WXYZ',
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
  {
    id: 'tts',
    name: 'Text-to-Speech',
    description: 'Converts AI-generated questions to spoken audio for students',
    provider: 'ElevenLabs',
    model: 'TTS Engine',
    status: 'Active',
    apiKeyMasked: 'el-••••••••••••••••••ABCD',
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
  {
    id: 'llm',
    name: 'AI Evaluator',
    description: 'Evaluates and scores student answers using a large language model',
    provider: 'OpenAI',
    model: 'GPT-4o',
    status: 'Active',
    apiKeyMasked: 'sk-••••••••••••••••••MNOP',
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
  {
    id: 'rag',
    name: 'RAG / Embedding',
    description: 'Provides semantic search and retrieval for question bank content',
    provider: 'OpenAI',
    model: 'text-embedding-3-small',
    status: 'Active',
    apiKeyMasked: 'sk-••••••••••••••••••QRST',
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
]

function StatusPill({ status }: { status: 'Active' | 'Inactive' }) {
  return status === 'Active'
    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Active</span>
    : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Inactive</span>
}

export default function AiConfigPage() {
  const [services, setServices] = useState<ServiceConfig[]>(initialServices)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ provider: string; model: string }>({ provider: '', model: '' })
  const [savedId, setSavedId] = useState<string | null>(null)

  const startEdit = (svc: ServiceConfig) => {
    setEditingId(svc.id)
    setEditValues({ provider: svc.provider, model: svc.model })
    setSavedId(null)
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...editValues } : s))
    setEditingId(null)
    setSavedId(id)
    setTimeout(() => setSavedId(null), 2000)
  }

  const toggleStatus = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s))
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-xl font-bold text-slate-900 leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          AI & API Configuration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage AI services and API connections used by the AIVES platform.
        </p>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 gap-5">
        {services.map(svc => (
          <div key={svc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: svc.accent, color: svc.iconColor }}>
                {svc.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <h2 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{svc.name}</h2>
                  <StatusPill status={svc.status} />
                  {savedId === svc.id && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3"><path d="M20 6L9 17l-5-5" /></svg>
                      Saved
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-4">{svc.description}</p>

                {/* Fields */}
                {editingId === svc.id ? (
                  <div className="grid grid-cols-2 gap-3 max-w-lg">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Provider</label>
                      <input
                        value={editValues.provider}
                        onChange={e => setEditValues(v => ({ ...v, provider: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Model / Engine</label>
                      <input
                        value={editValues.model}
                        onChange={e => setEditValues(v => ({ ...v, model: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">API Key</label>
                      <input
                        disabled
                        value={svc.apiKeyMasked}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">API keys are managed securely and cannot be changed here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 flex-wrap">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Provider</span>
                      <div className="text-sm font-medium text-slate-700 mt-0.5">{svc.provider}</div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Model / Engine</span>
                      <div className="text-sm font-medium text-slate-700 mt-0.5">{svc.model}</div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">API Key</span>
                      <div className="text-sm font-medium text-slate-500 mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{svc.apiKeyMasked}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {editingId === svc.id ? (
                  <>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(svc.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors"
                      style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)' }}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => toggleStatus(svc.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        svc.status === 'Active'
                          ? 'text-slate-600 border-slate-200 hover:bg-slate-50'
                          : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      {svc.status === 'Active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => startEdit(svc)}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors"
                      style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)' }}
                    >
                      Configure
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
