import { useEffect, useState } from 'react'
import FlagIcon from '@/shared/components/common/FlagIcon'
import { useTranslation, Trans } from 'react-i18next'
import { formatNumber } from '@/shared/i18n/format'
import QuestionStatusBadge from './QuestionStatusBadge'
import { BloomLevel, QuestionItem, questionApi } from '../api'
import { MaterialResponse, learningMaterialApi } from '@/modules/materials'

interface GenerateQuestionsModalProps {
  subject: {
    id: string | number
    code: string
    name: string
  }
  onClose: () => void
  onGenerated: (questions: QuestionItem[]) => void
}

const BLOOM_LEVELS: BloomLevel[] = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']

export default function GenerateQuestionsModal({
  subject,
  onClose,
  onGenerated,
}: GenerateQuestionsModalProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [bloomLevel, setBloomLevel] = useState<BloomLevel | ''>('')
  const [language, setLanguage] = useState<'AUTO' | 'vi' | 'en'>('AUTO')
  const [count, setCount] = useState<number>(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<QuestionItem[] | null>(null)
  const [materials, setMaterials] = useState<MaterialResponse[]>([])
  const [materialIds, setMaterialIds] = useState<(number | string)[]>([])

  useEffect(() => {
    let cancelled = false
    learningMaterialApi
      .getBySubject(subject.id)
      .then(res => {
        const data = res.data as { result?: MaterialResponse[] } | MaterialResponse[]
        const list = Array.isArray(data) ? data : data?.result
        if (!cancelled) setMaterials(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setMaterials([])
      })
    return () => {
      cancelled = true
    }
  }, [subject.id])

  const toggleMaterial = (id: number | string) =>
    setMaterialIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!keyword.trim()) {
      setError(t('questions.generate.keywordRequired'))
      return
    }

    if (count < 1 || count > 10) {
      setError(t('questions.generate.countRange'))
      return
    }

    setLoading(true)
    try {
      const res = await questionApi.generate({
        subjectId: subject.id,
        keyword: keyword.trim(),
        ...(bloomLevel ? { bloomLevel } : {}),
        count,
        ...(materialIds.length > 0 ? { materialIds } : {}),
        language,
      })

      const generated = Array.isArray(res.data?.result)
        ? res.data.result
        : Array.isArray(res.data)
        ? (res.data as any)
        : []

      if (generated.length === 0) {
        setError(t('questions.generate.noQuestions'))
        return
      }
      setResults(generated)
    } catch (err: unknown) {
      let code: number | undefined
      let message = t('questions.generate.failed')
      let status: number | undefined

      if (typeof err === 'object' && err !== null && 'response' in err) {
        const res = (err as { response?: { data?: { code?: number; message?: string } } }).response
        code = res?.data?.code
        status = (err as { response?: { status?: number } }).response?.status
        message = res?.data?.message || message
      } else if (err instanceof Error) {
        message = err.message
      }

      if (code === 1024 || message.includes('NO_RELEVANT_MATERIALS') || message.includes('chưa có tài liệu')) {
        setError(t('questions.generate.noMaterials'))
      } else if (code === 1101 || message.includes('SUBJECT_NOT_ASSIGNED') || message.includes('chưa được phân công')) {
        setError(t('questions.generate.notAssigned'))
      } else if (status === 403) {
        setError(message || t('questions.generate.forbidden'))
      } else if (status === 401) {
        setError(t('questions.generate.sessionExpired'))
      } else if (code === 1016 || message.includes('SUBJECT_NOT_FOUND')) {
        setError(t('questions.generate.subjectNotFound'))
      } else if (code === 1025 || message.includes('AI_GENERATION_FAILED')) {
        setError(t('questions.generate.aiFailed'))
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Questions are already persisted by the backend once returned, so closing the results view refreshes the parent list.
  const handleClose = () => (results ? onGenerated(results) : onClose())

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className={`m-auto bg-white rounded-2xl shadow-xl w-full ${results ? 'max-w-2xl' : 'max-w-lg'} overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {t('questions.generate.title')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('questions.generate.subject')} <span className="font-semibold text-blue-700">{subject.code} - {subject.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        {results ? (
          <div className="p-6 space-y-4">
            <div className="p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {t('questions.generate.resultSummary', { count: results.length, code: subject.code })}
            </div>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {results.map((q, i) => (
                <div key={q.id ?? i} className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">#{q.id}</span>
                    {q.language && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        q.language === 'en'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <FlagIcon language={q.language} />{q.language === 'en' ? 'EN' : 'VI'}
                      </span>
                    )}
                    {q.bloomLevel && <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{t(`questions.bloom.${q.bloomLevel}`, { defaultValue: q.bloomLevel })}</span>}
                    <QuestionStatusBadge status={q.status} />
                    {q.answerTimeLimitSeconds != null && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{t('questions.seconds', { value: formatNumber(q.answerTimeLimitSeconds) })}</span>}
                  </div>
                  <p className="text-sm font-medium text-slate-800">{q.content}</p>
                  {q.referenceAnswer && (
                    <p className="text-xs text-slate-600 whitespace-pre-line"><span className="font-semibold">{t('questions.generate.referenceAnswer')}</span>{q.referenceAnswer}</p>
                  )}
                  {q.rubric ? (
                    <div className="text-xs text-slate-600">
                      <p className="font-semibold">{t('questions.generate.rubric')}{q.rubric.title ? `: ${q.rubric.title}` : ''}</p>
                      {q.rubric.criteria?.length > 0 && (
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {q.rubric.criteria.map((c, j) => (
                            <li key={c.id ?? j}>
                              {c.criterionText}
                              {c.pointWeight != null && <> — {t('questions.points', { value: formatNumber(Number(c.pointWeight), { maximumFractionDigits: 6 }) })}</>}
                              {c.isMandatory && <span className="text-red-600"> {t('questions.generate.required')}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{t('questions.generate.noRubric')}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                {t('questions.generate.back')}
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth={2} strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2} strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t('questions.generate.keyword')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={t('questions.generate.keywordPlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 transition-all"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {t('questions.generate.keywordHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t('questions.generate.bloomLabel')}
            </label>
            <select
              disabled={loading}
              value={bloomLevel}
              onChange={e => setBloomLevel(e.target.value as BloomLevel | '')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 bg-white transition-all"
            >
              <option value="">{t('questions.generate.bloomAuto')}</option>
              {BLOOM_LEVELS.map(b => (
                <option key={b} value={b}>
                  {t(`questions.bloom.${b}`)} — {t(`questions.generate.bloomDesc.${b}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t('questions.generate.languageLabel')} <span className="text-xs font-normal text-slate-400">{t('questions.generate.languageHint')}</span>
            </label>
            <select
              disabled={loading}
              value={language}
              onChange={e => setLanguage(e.target.value as 'AUTO' | 'vi' | 'en')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 bg-white transition-all"
            >
              <option value="AUTO">🌐 {t('common.contentLanguage.auto')}</option>
              <option value="vi">{t('common.contentLanguage.vi')}</option>
              <option value="en">{t('common.contentLanguage.en')}</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-700">
                {t('questions.generate.countLabel')}
              </label>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {t('questions.generate.countBadge', { count })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                disabled={loading}
                value={count}
                onChange={e => setCount(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex gap-1.5">
                {[1, 3, 5, 10].map(val => (
                  <button
                    key={val}
                    type="button"
                    disabled={loading}
                    onClick={() => setCount(val)}
                    className={`px-2 py-0.5 text-xs font-medium rounded border transition-colors ${
                      count === val
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">{t('questions.generate.countHint')}</p>
            </div>
          </div>

          {materials.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {t('questions.generate.materials')} <span className="text-xs font-normal text-slate-400">{t('questions.generate.materialsHint')}</span>
              </label>
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {materials.map(m => (
                  <label key={m.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      disabled={loading}
                      checked={materialIds.includes(m.id)}
                      onChange={() => toggleMaterial(m.id)}
                    />
                    <span className="flex-1 truncate">{m.title || m.fileName || t('materials.fallbackName', { id: m.id })}</span>
                    {m.language && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        m.language === 'en'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {m.language === 'en' ? 'EN' : 'VI'}
                      </span>
                    )}
                    {m.processingStatus && <span className="text-[10px] text-slate-400">{t(`materials.status.${m.processingStatus.toUpperCase()}`, { defaultValue: m.processingStatus })}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>{t('questions.generate.specTitle')}</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
              <li>{t('questions.generate.spec1')}</li>
              <li>{t('questions.generate.spec2')}</li>
              <li><Trans i18nKey="questions.generate.spec3" components={{ b: <strong className="text-slate-700" /> }} /></li>
            </ul>
          </div>

          {loading && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-3 animate-in fade-in">
              <svg className="animate-spin h-5 w-5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-xs text-blue-800">
                <p className="font-semibold">{t('questions.generate.loadingTitle')}</p>
                <p className="text-blue-600">{t('questions.generate.loadingDesc')}</p>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('questions.generate.generating')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <span>{t('questions.generate.submit')}</span>
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
