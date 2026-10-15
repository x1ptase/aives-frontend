import { useCallback, useEffect, useState } from 'react'
import {
  questionApi, subjectApi, BloomLevel, QuestionItem, QuestionStatus, QuestionSummary, SubjectResponse,
} from '@/services/api'
import GenerateQuestionsModal from '@/components/questions/GenerateQuestionsModal'
import QuestionDetailModal from '@/components/questions/QuestionDetailModal'
import { questionErrorMessage } from '@/components/questions/questionErrors'
import QuestionStatusBadge, { QUESTION_STATUSES, isApprovableStatus, isDeletableStatus } from '@/components/questions/QuestionStatusBadge'
import { SearchIcon, TrashIcon } from '@/components/common/Icons'

const PAGE_SIZE = 10
const BLOOM_LEVELS: BloomLevel[] = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']

const unwrapList = <T,>(data: any): T[] =>
  Array.isArray(data) ? data
    : Array.isArray(data?.result) ? data.result
    : Array.isArray(data?.result?.content) ? data.result.content
    : Array.isArray(data?.result?.data) ? data.result.data : []

const errMsg = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback

export default function AdminQuestionBank() {
  const [questions, setQuestions] = useState<QuestionSummary[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [subjects, setSubjects] = useState<SubjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [bloomFilter, setBloomFilter] = useState<BloomLevel | ''>('')
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | ''>('')
  const [page, setPage] = useState(0)

  const [detail, setDetail] = useState<QuestionItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QuestionSummary | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionError, setActionError] = useState('')

  const [pickingSubject, setPickingSubject] = useState(false)
  const [genSubjectId, setGenSubjectId] = useState('')
  const [genSubject, setGenSubject] = useState<SubjectResponse | null>(null)
  const [banner, setBanner] = useState('')

  useEffect(() => {
    subjectApi.getAll()
      .then(res => setSubjects(unwrapList<SubjectResponse>(res.data)))
      .catch(() => setSubjects([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    questionApi
      .search({
        page,
        size: PAGE_SIZE,
        ...(subjectFilter ? { subjectId: subjectFilter } : {}),
        ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
        ...(bloomFilter ? { bloomLevel: bloomFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      })
      .then(res => {
        if (cancelled) return
        const result = res.data?.result
        setQuestions(result?.items ?? [])
        setTotalElements(result?.totalElements ?? 0)
        setTotalPages(result?.totalPages ?? 0)
      })
      .catch(err => {
        if (cancelled) return
        setQuestions([])
        setError(errMsg(err, 'Could not load questions.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page, subjectFilter, debouncedSearch, bloomFilter, statusFilter, reloadKey])

  const load = () => setReloadKey(k => k + 1)

  const subjectLabel = useCallback(
    (q: QuestionSummary) => {
      if (q.subjectName) return q.subjectName
      const s = subjects.find(x => String(x.id) === String(q.subjectId))
      return s ? `${s.code} - ${s.name}` : `#${q.subjectId}`
    },
    [subjects]
  )

  const hasFilters = !!(debouncedSearch || subjectFilter || bloomFilter || statusFilter)
  const reset = () => setPage(0)

  const openDetail = async (q: QuestionSummary) => {
    setActionError('')
    try {
      const res = await questionApi.getById(q.id)
      setDetail(res.data?.result || q)
    } catch (err) {
      setActionError(questionErrorMessage(err, 'Could not load question details.'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleteLoading(true)
      setDeleteError('')
      await questionApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setDeleteError(questionErrorMessage(err, 'Failed to delete question.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleApprove = async (id: number | string) => {
    setActionError('')
    try {
      await questionApi.approve(id)
      setBanner('Question approved successfully!')
      setTimeout(() => setBanner(''), 6000)
      load()
    } catch (err) {
      setActionError(questionErrorMessage(err, 'Failed to approve question.'))
    }
  }

  const startGenerate = () => {
    const s = subjects.find(x => String(x.id) === genSubjectId)
    if (!s) return
    setPickingSubject(false)
    setGenSubject(s)
  }

  const selectCls =
    'px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:bg-white'

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f1f5f9]">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Question Bank
          </h1>
          <p className="text-sm text-slate-500 mt-1">Questions across all subjects.</p>
        </div>
        <button
          onClick={() => { setGenSubjectId(''); setPickingSubject(true) }}
          disabled={subjects.length === 0}
          title={subjects.length === 0 ? 'No subjects exist yet. Create one in Subject Management first.' : undefined}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✨ Generate Questions
        </button>
      </div>

      {banner && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm">{banner}</div>}
      {actionError && <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">{actionError}</div>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52 max-w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search question…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:bg-white transition-all"
            />
          </div>
          <select value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); reset() }} className={selectCls}>
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.code} - {s.name}</option>)}
          </select>
          <select value={bloomFilter} onChange={e => { setBloomFilter(e.target.value as BloomLevel | ''); reset() }} className={selectCls}>
            <option value="">All Bloom levels</option>
            {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as QuestionStatus | ''); reset() }} className={selectCls}>
            <option value="">All statuses</option>
            {QUESTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setDebouncedSearch(''); setSubjectFilter(''); setBloomFilter(''); setStatusFilter(''); reset() }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-red-600">Could not load questions</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
            <button onClick={load} className="mt-4 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg">
              Retry
            </button>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {hasFilters ? 'No questions match your filters.' : 'No questions yet. Use "Generate Questions" to create some.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 w-16">ID</th>
                    <th className="px-4 py-3 min-w-[260px]">Question</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Bloom</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {questions.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{q.id}</td>
                      <td className="px-4 py-3 min-w-[260px] max-w-sm"><p className="line-clamp-2 text-slate-800">{q.contentPreview}</p></td>
                      <td className="px-4 py-3">{subjectLabel(q)}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{q.bloomLevel || '—'}</td>
                      <td className="px-4 py-3 text-xs">{q.sourceType || '—'}</td>
                      <td className="px-4 py-3"><QuestionStatusBadge status={q.status} /></td>
                      <td className="px-4 py-3 text-slate-500">{q.createdAt ? new Date(q.createdAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openDetail(q)} className="px-2.5 py-1.5 mr-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors">
                          View
                        </button>
                        {isApprovableStatus(q.status) && (
                          <button
                            onClick={() => handleApprove(q.id)}
                            className="px-2.5 py-1.5 mr-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                            title="Approve question into official bank"
                          >
                            Approve
                          </button>
                        )}
                        {isDeletableStatus(q.status) && (
                          <button onClick={() => { setDeleteTarget(q); setDeleteError('') }} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors">
                            <TrashIcon /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{totalElements} question(s)</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50">Prev</button>
                <span>Page {page + 1} / {Math.max(1, totalPages)}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {detail && (
        <QuestionDetailModal
          question={detail}
          onClose={() => setDetail(null)}
          onApprove={() => {
            load()
          }}
        />
      )}

      {pickingSubject && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="m-auto bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>Choose a subject</h2>
            <p className="text-sm text-slate-500 mt-1">Questions are generated from a subject's learning materials.</p>
            <select value={genSubjectId} onChange={e => setGenSubjectId(e.target.value)} className={`${selectCls} w-full mt-4`}>
              <option value="">Select a subject…</option>
              {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.code} - {s.name}</option>)}
            </select>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setPickingSubject(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={startGenerate} disabled={!genSubjectId} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">Continue</button>
            </div>
          </div>
        </div>
      )}

      {genSubject && (
        <GenerateQuestionsModal
          subject={{ id: genSubject.id, code: genSubject.code, name: genSubject.name }}
          onClose={() => setGenSubject(null)}
          onGenerated={generated => {
            setGenSubject(null)
            setBanner(`Generated ${generated.length} question(s).`)
            setTimeout(() => setBanner(''), 8000)
            load()
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="m-auto bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>Delete question?</h2>
            <p className="text-sm text-slate-600 mt-2 line-clamp-3">{deleteTarget.contentPreview}</p>
            <p className="mt-2 text-xs text-slate-500">This action cannot be undone.</p>
            {deleteError && <div className="mt-3 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">{deleteError}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-70">
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
