import { useEffect, useState } from 'react'
import { BloomLevel, MaterialResponse, QuestionItem, learningMaterialApi, questionApi } from '@/services/api'

interface GenerateQuestionsModalProps {
  subject: {
    id: string | number
    code: string
    name: string
  }
  onClose: () => void
  onGenerated: (questions: QuestionItem[]) => void
}

const BLOOM_LEVELS: { value: BloomLevel; label: string; desc: string }[] = [
  { value: 'REMEMBER', label: 'REMEMBER (Ghi nhớ)', desc: 'Recall facts and basic concepts' },
  { value: 'UNDERSTAND', label: 'UNDERSTAND (Thông hiểu)', desc: 'Explain ideas or concepts' },
  { value: 'APPLY', label: 'APPLY (Vận dụng)', desc: 'Use information in new situations' },
  { value: 'ANALYZE', label: 'ANALYZE (Phân tích)', desc: 'Draw connections among ideas' },
  { value: 'EVALUATE', label: 'EVALUATE (Đánh giá)', desc: 'Justify a stand or decision' },
  { value: 'CREATE', label: 'CREATE (Sáng tạo)', desc: 'Produce new or original work' },
]

export default function GenerateQuestionsModal({
  subject,
  onClose,
  onGenerated,
}: GenerateQuestionsModalProps) {
  const [keyword, setKeyword] = useState('')
  const [bloomLevel, setBloomLevel] = useState<BloomLevel | ''>('')
  const [count, setCount] = useState<number>(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
      setError('Please enter a topic or keyword.')
      return
    }

    if (count < 1 || count > 10) {
      setError('Question count must be between 1 and 10.')
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
      })

      const generated = Array.isArray(res.data?.result)
        ? res.data.result
        : Array.isArray(res.data)
        ? (res.data as any)
        : []

      onGenerated(generated)
    } catch (err: unknown) {
      let code: number | undefined
      let message = 'Failed to generate questions. Please try again.'

      if (typeof err === 'object' && err !== null && 'response' in err) {
        const res = (err as { response?: { data?: { code?: number; message?: string } } }).response
        code = res?.data?.code
        message = res?.data?.message || message
      } else if (err instanceof Error) {
        message = err.message
      }

      if (code === 1024 || message.includes('NO_RELEVANT_MATERIALS') || message.includes('chưa có tài liệu')) {
        setError(
          'No ready learning materials found for this subject. Please upload and prepare subject materials before generating questions with AI.'
        )
      } else if (code === 1101 || message.includes('SUBJECT_NOT_ASSIGNED') || message.includes('chưa được phân công')) {
        setError(
          'You are not assigned to this subject. Only assigned lecturers or administrators can generate questions.'
        )
      } else if (code === 1016 || message.includes('SUBJECT_NOT_FOUND')) {
        setError('Subject not found. It may have been deleted; please refresh and select another subject.')
      } else if (code === 1025 || message.includes('AI_GENERATION_FAILED')) {
        setError(
          'AI service error while generating questions. Please check your network and try again.'
        )
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                Generate Questions & Rubrics (AI RAG)
              </h2>
              <p className="text-xs text-slate-500">
                Subject: <span className="font-semibold text-blue-700">{subject.code} - {subject.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
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
              Topic / Keyword <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="e.g. Kanji JPD316, Microservices Architecture, Database Indexing..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 transition-all"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              AI retrieves the top relevant document chunks via cosine distance to generate contextual oral exam questions.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Cognitive Bloom Level
            </label>
            <select
              disabled={loading}
              value={bloomLevel}
              onChange={e => setBloomLevel(e.target.value as BloomLevel | '')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 bg-white transition-all"
            >
              <option value="">✨ Auto (AI analyzes topic and assigns the best level)</option>
              {BLOOM_LEVELS.map(b => (
                <option key={b.value} value={b.value}>
                  {b.label} — {b.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-700">
                Number of Questions
              </label>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {count} question{count > 1 ? 's' : ''}
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
              <p className="text-[11px] text-slate-400">1 to 5 questions recommended for fastest generation</p>
            </div>
          </div>

          {materials.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Learning Materials <span className="text-xs font-normal text-slate-400">(optional — none selected uses all ready materials)</span>
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
                    <span className="flex-1 truncate">{m.title || m.originalFileName || `Material ${m.id}`}</span>
                    {m.processingStatus && <span className="text-[10px] text-slate-400">{m.processingStatus}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>📋 Output Specification:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
              <li>Oral questions with reference answer & time limit</li>
              <li>Rubric with weighted assessment criteria</li>
              <li>Saved as <strong className="text-slate-700">DRAFT</strong> in your question bank for review</li>
            </ul>
          </div>

          {loading && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-3 animate-in fade-in">
              <svg className="animate-spin h-5 w-5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-xs text-blue-800">
                <p className="font-semibold">AI is analyzing learning materials...</p>
                <p className="text-blue-600">Generating questions and rubrics. This may take 5 - 15 seconds.</p>
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
              Cancel
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
                  <span>Generating Questions...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <span>Generate with AI</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
