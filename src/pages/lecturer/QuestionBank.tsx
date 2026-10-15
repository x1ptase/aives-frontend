import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    getMySubjects, questionApi, BloomLevel, QuestionItem, QuestionSourceType, QuestionStatus, QuestionSummary,
    QuestionUpsertPayload, SubjectResponse,
} from '@/services/api'
import GenerateQuestionsModal from '@/components/questions/GenerateQuestionsModal'
import QuestionDetailModal from '@/components/questions/QuestionDetailModal'
import { questionErrorMessage } from '@/components/questions/questionErrors'
import QuestionStatusBadge, {
    QUESTION_STATUSES, isDeletableStatus, isEditableStatus,
} from '@/components/questions/QuestionStatusBadge'

// ─── Types ────────────────────────────────────────────────────────────────────
type Subject = SubjectResponse

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LevelBadge = ({ level }: { level?: string | null }) => {
    if (!level) return <span className="text-slate-400 text-xs">—</span>
    const style = level === 'REMEMBER' || level === 'UNDERSTAND'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : level === 'APPLY' || level === 'ANALYZE'
        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
        : 'bg-purple-50 text-purple-700 border-purple-200'

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${style}`}>
            {level}
        </span>
    )
}

// ─── Create / Edit Question Modal ─────────────────────────────────────────────
const BLOOM_OPTIONS: BloomLevel[] = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']

export function CreateQuestionModal({
    subjectId,
    question,
    onClose,
    onCreated,
}: {
    subjectId: string | number
    question?: QuestionItem
    onClose: () => void
    onCreated: () => void
}) {
    const isEdit = !!question
    const [content, setContent] = useState(question?.content ?? '')
    const [referenceAnswer, setReferenceAnswer] = useState(question?.referenceAnswer ?? '')
    const [topics, setTopics] = useState((question?.topics ?? []).join(', '))
    const [bloomLevel, setBloomLevel] = useState<BloomLevel | ''>(question?.bloomLevel ?? '')
    const [timeLimit, setTimeLimit] = useState(
        question?.answerTimeLimitSeconds != null ? String(question.answerTimeLimitSeconds) : ''
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!content.trim()) return setError('Question content is required.')
        const limit = timeLimit.trim() ? Number(timeLimit) : undefined
        if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
            return setError('Answer time limit must be a positive whole number of seconds.')
        }
        const topicList = topics.split(',').map(t => t.trim()).filter(Boolean)

        // PATCH: null clears a field, and topics always replaces the whole list.
        const payload: QuestionUpsertPayload = {
            content: content.trim(),
            referenceAnswer: referenceAnswer.trim() || null,
            topics: topicList,
            bloomLevel: bloomLevel || null,
            answerTimeLimitSeconds: limit ?? null,
        }

        try {
            setLoading(true)
            if (isEdit) {
                await questionApi.update(question!.id, { ...payload, expectedVersion: question!.version ?? 0 })
            } else {
                await questionApi.create({ ...payload, subjectId })
            }
            onCreated()
        } catch (err: any) {
            setError(questionErrorMessage(err, `Failed to ${isEdit ? 'update' : 'create'} question.`))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="m-auto bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {isEdit ? 'Edit Question' : 'Create Question'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Question Content <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Enter question content..."
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Reference Answer <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                                value={referenceAnswer}
                                onChange={e => setReferenceAnswer(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Topics <span className="text-slate-400 font-normal">(optional, comma-separated)</span>
                            </label>
                            <input
                                type="text"
                                value={topics}
                                onChange={e => setTopics(e.target.value)}
                                placeholder="e.g. Microservices, Kafka"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bloom Level</label>
                                <select
                                    value={bloomLevel}
                                    onChange={e => setBloomLevel(e.target.value as BloomLevel | '')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                >
                                    <option value="">Not set</option>
                                    {BLOOM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time limit (sec)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={timeLimit}
                                    onChange={e => setTimeLimit(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            {isEdit ? 'Save Changes' : 'Create Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20
const SOURCE_OPTIONS: QuestionSourceType[] = ['MANUAL', 'IMPORT', 'AI']

export default function QuestionBank() {
    // Read once so later URL changes don't re-trigger subject selection
    const [searchParams] = useSearchParams()
    const [initialSubjectId] = useState(() => searchParams.get('subject'))
    // Subjects state
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [subjectsLoading, setSubjectsLoading] = useState(true)
    const [subjectsError, setSubjectsError] = useState(false)
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

    // Questions state
    const [questions, setQuestions] = useState<QuestionSummary[]>([])
    const [totalElements, setTotalElements] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [questionsLoading, setQuestionsLoading] = useState(false)
    const [questionsError, setQuestionsError] = useState(false)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [bloomFilter, setBloomFilter] = useState<BloomLevel | ''>('')
    const [statusFilter, setStatusFilter] = useState<QuestionStatus | ''>('')
    const [sourceFilter, setSourceFilter] = useState<QuestionSourceType | ''>('')
    const [questionsErrorMsg, setQuestionsErrorMsg] = useState('')
    const [page, setPage] = useState(0)
    const [reloadKey, setReloadKey] = useState(0)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteError, setDeleteError] = useState('')

    // Modals
    const [showCreateQuestion, setShowCreateQuestion] = useState(false)
    const [showGenerateQuestions, setShowGenerateQuestions] = useState(false)
    const [editQuestion, setEditQuestion] = useState<QuestionItem | null>(null)
    const [detailQuestion, setDetailQuestion] = useState<QuestionItem | null>(null)
    const [aiSuccessBanner, setAiSuccessBanner] = useState('')
    const [actionError, setActionError] = useState('')

    // ── Fetch subjects ────────────────────────────────────────────────────────
    const fetchSubjects = useCallback(async () => {
        try {
            setSubjectsLoading(true)
            setSubjectsError(false)
            const list: Subject[] = await getMySubjects()
            setSubjects(list)
            // Auto-select first subject on initial load
            setSelectedSubject(prev => {
                if (prev) return prev // keep current selection on refresh
                // Dashboard shortcut passes ?subject=<id>; fall back to the first subject
                                return list.find(s => String(s.id) === initialSubjectId) ?? list[0] ?? null
            })
        } catch {
            setSubjectsError(true)
        } finally {
            setSubjectsLoading(false)
        }
    }, [initialSubjectId])

    useEffect(() => { fetchSubjects() }, [fetchSubjects])

    // ── Fetch questions (server-side filter + pagination) ─────────────────────
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search.trim())
            setPage(0)
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    useEffect(() => {
        if (!selectedSubject?.id) {
            setQuestions([])
            setTotalElements(0)
            setTotalPages(0)
            return
        }
        let cancelled = false
        const load = async () => {
            try {
                setQuestionsLoading(true)
                setQuestionsError(false)
                setQuestionsErrorMsg('')
                const res = await questionApi.search({
                    subjectId: selectedSubject.id,
                    page,
                    size: PAGE_SIZE,
                    ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
                    ...(bloomFilter ? { bloomLevel: bloomFilter } : {}),
                    ...(statusFilter ? { status: statusFilter } : {}),
                    ...(sourceFilter ? { sourceType: sourceFilter } : {}),
                })
                if (cancelled) return
                const result = res.data?.result
                setQuestions(result?.items ?? [])
                setTotalElements(result?.totalElements ?? 0)
                setTotalPages(result?.totalPages ?? 0)
            } catch (err: any) {
                if (cancelled) return
                const data = err?.response?.data
                setQuestionsErrorMsg(
                    data?.code === 1101 || err?.response?.status === 403
                        ? (data?.message || 'You are not assigned to this subject, so its questions are not available to you.')
                        : (data?.message || '')
                )
                setQuestionsError(true)
            } finally {
                if (!cancelled) setQuestionsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [selectedSubject, page, debouncedSearch, bloomFilter, statusFilter, sourceFilter, reloadKey])

    const refreshQuestions = () => setReloadKey(k => k + 1)

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleQuestionCreated = () => {
        setShowCreateQuestion(false)
        setEditQuestion(null)
        refreshQuestions()
    }

    const handleQuestionsGenerated = (generated: QuestionItem[]) => {
        setShowGenerateQuestions(false)
        refreshQuestions()
        setAiSuccessBanner(`Successfully generated ${generated.length} question(s) with rubrics via AI! They are saved as DRAFT.`)
        setTimeout(() => setAiSuccessBanner(''), 10000)
        if (generated.length > 0) {
            setDetailQuestion(generated[0])
        }
    }

    // The list only carries summaries, so the full question (rubric, version) is fetched on demand.
    const handleViewQuestion = async (q: QuestionSummary) => {
        setActionError('')
        try {
            const res = await questionApi.getById(q.id)
            setDetailQuestion(res.data.result)
        } catch (err: any) {
            setActionError(questionErrorMessage(err, 'Could not load question details.'))
        }
    }

    // Editing needs the current version, so there is no fallback to the summary row.
    const handleEditQuestion = async (q: QuestionSummary) => {
        setActionError('')
        try {
            const res = await questionApi.getById(q.id)
            setEditQuestion(res.data.result)
        } catch (err: any) {
            setActionError(questionErrorMessage(err, 'Could not load the question for editing.'))
        }
    }

    const handleDeleteQuestion = async (id: string | number) => {
        try {
            setDeleteLoading(true)
            setDeleteError('')
            await questionApi.delete(id)
            setConfirmDeleteId(null)
            refreshQuestions()
        } catch (err: any) {
            setDeleteError(questionErrorMessage(err, 'Failed to delete question.'))
        } finally {
            setDeleteLoading(false)
        }
    }

    const hasFilters = !!(debouncedSearch || bloomFilter || statusFilter || sourceFilter)

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f1f5f9]">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Question Bank
                </h1>
                <p className="text-xs text-slate-500 mt-1">Manage questions organised by subject</p>
            </div>

            {/* ── Subject selector bar ────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 mb-5">
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-semibold text-slate-700 shrink-0">Subject</span>

                    {subjectsLoading ? (
                        <div className="h-9 w-72 bg-slate-100 animate-pulse rounded-lg" />
                    ) : subjectsError ? (
                        <div className="text-sm text-red-500 flex items-center gap-2">
                            Failed to load subjects.
                            <button onClick={fetchSubjects} className="text-blue-600 hover:underline font-semibold">Retry</button>
                        </div>
                    ) : subjects.length === 0 ? (
                        <span className="text-sm text-slate-400">You have not been assigned to any subject yet. Please contact an administrator.</span>
                    ) : (
                        <select
                            value={selectedSubject?.id ?? ''}
                            onChange={e => {
                                const found = subjects.find(s => String(s.id) === e.target.value)
                                setSelectedSubject(found || null)
                                setSearch('')
                                setDebouncedSearch('')
                                setBloomFilter('')
                                setStatusFilter('')
                                setSourceFilter('')
                                setPage(0)
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm w-full sm:w-auto sm:min-w-[280px]"
                        >
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.code} - {s.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Selected subject info */}
                {selectedSubject?.description && (
                    <p className="mt-3 text-xs text-slate-500 pl-0">
                        {selectedSubject.description}
                    </p>
                )}
            </div>

            {/* ── Questions section ───────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* AI Success Banner */}
                {aiSuccessBanner && (
                    <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <span className="text-base">✨</span>
                            <span>{aiSuccessBanner}</span>
                        </div>
                        <button onClick={() => setAiSuccessBanner('')} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold ml-4">
                            ✕
                        </button>
                    </div>
                )}

                {actionError && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">{actionError}</div>
                )}

                {/* Questions toolbar */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 flex-wrap min-w-0">
                        <h2 className="font-semibold text-slate-800 text-sm shrink-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            Questions
                            {selectedSubject && (
                                <span className="ml-2 text-slate-400 font-normal text-xs">
                                    ({selectedSubject.code})
                                </span>
                            )}
                        </h2>
                        {selectedSubject && (
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search questions..."
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full sm:w-64"
                            />
                        )}
                        {selectedSubject && (
                            <>
                                <select
                                    value={bloomFilter}
                                    onChange={e => { setBloomFilter(e.target.value as BloomLevel | ''); setPage(0) }}
                                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none"
                                >
                                    <option value="">All Bloom levels</option>
                                    {BLOOM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                                <select
                                    value={statusFilter}
                                    onChange={e => { setStatusFilter(e.target.value as QuestionStatus | ''); setPage(0) }}
                                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none"
                                >
                                    <option value="">All statuses</option>
                                    {QUESTION_STATUSES.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                                <select
                                    value={sourceFilter}
                                    onChange={e => { setSourceFilter(e.target.value as QuestionSourceType | ''); setPage(0) }}
                                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none"
                                >
                                    <option value="">All sources</option>
                                    {SOURCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </>
                        )}
                    </div>
                    {selectedSubject && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowGenerateQuestions(true)}
                                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                title="Generate Questions & Rubrics from Learning Materials via AI RAG"
                            >
                                <svg className="w-4 h-4 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                                </svg>
                                <span>✨ Generate with AI</span>
                            </button>
                            <button
                                onClick={() => setShowCreateQuestion(true)}
                                className="px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg transition-colors shadow-sm"
                            >
                                + Create Manually
                            </button>
                        </div>
                    )}
                </div>

                {/* Questions table */}
                <div className="overflow-x-auto">
                    {!selectedSubject ? (
                        <div className="px-6 py-12 text-center text-slate-500 text-sm">
                            {subjects.length === 0
                                ? 'You need to be assigned to a subject before you can add questions.'
                                : 'Select a subject to view its questions.'}
                        </div>
                    ) : questionsLoading ? (
                        <div className="p-8 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : questionsError ? (
                        <div className="px-6 py-12 text-center text-red-500 text-sm">
                            {questionsErrorMsg || 'Failed to load questions.'}
                            <button
                                onClick={refreshQuestions}
                                className="ml-2 text-blue-600 hover:underline font-semibold"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-full">
                                        Question & Details
                                    </th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        Topic
                                    </th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        Bloom / Level
                                    </th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        Rubric
                                    </th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {questions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            {hasFilters ? 'No questions match your filters.' : 'No questions yet. Click "✨ Generate with AI" or "+ Create Manually" to get started.'}
                                        </td>
                                    </tr>
                                ) : (
                                    questions.map(q => (
                                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-slate-700 max-w-lg">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[11px] font-mono text-slate-400">#{q.id}</span>
                                                        {q.sourceType === 'AI' && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                                ✨ AI
                                                            </span>
                                                        )}
                                                        <QuestionStatusBadge status={q.status} />
                                                        {q.sourceType && q.sourceType !== 'AI' && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                                                                {q.sourceType}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="line-clamp-2 text-slate-800 font-medium">{q.contentPreview || '—'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">
                                                {Array.isArray(q.topics) && q.topics.length > 0 ? q.topics.join(', ') : '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <LevelBadge level={q.bloomLevel} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {q.hasRubric ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                        📊 Rubric
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {confirmDeleteId === q.id ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {deleteError && (
                                                            <span className="text-[11px] text-red-500 max-w-[120px] truncate" title={deleteError}>
                                                                {deleteError}
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => { setConfirmDeleteId(null); setDeleteError('') }}
                                                            disabled={deleteLoading}
                                                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors disabled:opacity-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQuestion(q.id)}
                                                            disabled={deleteLoading}
                                                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-70 flex items-center gap-1"
                                                        >
                                                            {deleteLoading && (
                                                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                </svg>
                                                            )}
                                                            Confirm
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleViewQuestion(q)}
                                                            className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors flex items-center gap-1"
                                                            title="View question details & Rubric"
                                                        >
                                                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            <span>Rubric</span>
                                                        </button>
                                                        {isEditableStatus(q.status) && (
                                                            <button
                                                                onClick={() => handleEditQuestion(q)}
                                                                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                        {isDeletableStatus(q.status) && (
                                                            <button
                                                                onClick={() => { setConfirmDeleteId(q.id); setDeleteError('') }}
                                                                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {/* ── Pagination ────────────────────────────────── */}
                        {totalPages > 1 && (
                            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        ← Prev
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i).slice(
                                        Math.max(0, page - 2),
                                        Math.min(totalPages, page + 3)
                                    ).map(i => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i)}
                                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                                i === page
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200'
                                            }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Modals ──────────────────────────────────────────────────── */}
            {showCreateQuestion && selectedSubject && (
                <CreateQuestionModal
                    subjectId={selectedSubject.id}
                    onClose={() => setShowCreateQuestion(false)}
                    onCreated={handleQuestionCreated}
                />
            )}

            {editQuestion && selectedSubject && (
                <CreateQuestionModal
                    subjectId={selectedSubject.id}
                    question={editQuestion}
                    onClose={() => setEditQuestion(null)}
                    onCreated={handleQuestionCreated}
                />
            )}

            {showGenerateQuestions && selectedSubject && (
                <GenerateQuestionsModal
                    subject={{
                        id: selectedSubject.id,
                        code: selectedSubject.code,
                        name: selectedSubject.name,
                    }}
                    onClose={() => setShowGenerateQuestions(false)}
                    onGenerated={handleQuestionsGenerated}
                />
            )}

            {detailQuestion && (
                <QuestionDetailModal
                    question={detailQuestion}
                    onClose={() => setDetailQuestion(null)}
                />
            )}
        </div>
    )
}
