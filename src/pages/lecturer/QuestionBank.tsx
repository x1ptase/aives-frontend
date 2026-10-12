import { useState, useEffect, useCallback } from 'react'
import { subjectApi, questionApi, BloomLevel, QuestionItem, QuestionUpsertPayload, SubjectResponse } from '@/services/api'
import GenerateQuestionsModal from '@/components/questions/GenerateQuestionsModal'
import QuestionDetailModal from '@/components/questions/QuestionDetailModal'

// ─── Types ────────────────────────────────────────────────────────────────────
type Subject = SubjectResponse

type Question = QuestionItem & { difficulty?: string; topic?: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LevelBadge = ({ level, difficulty }: { level?: string; difficulty?: string }) => {
    const val = level || difficulty || 'N/A'
    const l = val.toUpperCase()
    const isBloom = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'].includes(l)
    const style = isBloom
        ? l === 'REMEMBER' || l === 'UNDERSTAND'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : l === 'APPLY' || l === 'ANALYZE'
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-purple-50 text-purple-700 border-purple-200'
        : val.toLowerCase() === 'hard'
        ? 'bg-red-50 text-red-700 border-red-200'
        : val.toLowerCase() === 'medium'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${style}`}>
            {val}
        </span>
    )
}

// ─── Create Subject Modal ─────────────────────────────────────────────────────
function CreateSubjectModal({
    onClose,
    onCreated,
}: {
    onClose: () => void
    onCreated: (subject: Subject) => void
}) {
    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!code.trim()) return setError('Subject Code is required.')
        if (!name.trim()) return setError('Subject Name is required.')

        try {
            setLoading(true)
            const res = await subjectApi.create({
                code: code.trim(),
                name: name.trim(),
                description: description.trim() || undefined,
            })
            // Backend may return the created subject in res.data or res.data.result
            const created = ((res.data as { result?: Subject })?.result || res.data) as Subject
            onCreated(created)
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to create subject.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Create Subject
                    </h2>
                    <button onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
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
                                Subject Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={code}
                                disabled={loading}
                                onChange={e => setCode(e.target.value)}
                                placeholder="e.g. SWD392"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-slate-50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Subject Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                disabled={loading}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Software Architecture and Design"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-slate-50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Description <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                                value={description}
                                disabled={loading}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Brief description of this subject"
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none disabled:bg-slate-50"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
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
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            Create Subject
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Edit Subject Modal ───────────────────────────────────────────────────────
function EditSubjectModal({
    subject,
    onClose,
    onUpdated,
}: {
    subject: Subject
    onClose: () => void
    onUpdated: (subject: Subject) => void
}) {
    const [code, setCode] = useState(subject.code || '')
    const [name, setName] = useState(subject.name || '')
    const [description, setDescription] = useState(subject.description || '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!code.trim()) return setError('Subject Code is required.')
        if (!name.trim()) return setError('Subject Name is required.')

        try {
            setLoading(true)
            const res = await subjectApi.update(subject.id, {
                code: code.trim(),
                name: name.trim(),
                description: description.trim() || undefined,
            })
            const updated = ((res.data as { result?: Subject })?.result || res.data || { ...subject, code: code.trim(), name: name.trim(), description: description.trim() }) as Subject
            onUpdated(updated)
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to update subject.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Edit Subject
                    </h2>
                    <button onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
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
                                Subject Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={code}
                                disabled={loading}
                                onChange={e => setCode(e.target.value)}
                                placeholder="e.g. SWD392"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-slate-50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Subject Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                disabled={loading}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Software Architecture and Design"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-slate-50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Description <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                                value={description}
                                disabled={loading}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Brief description of this subject"
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none disabled:bg-slate-50"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
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
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Subject Detail Modal ─────────────────────────────────────────────────────
function SubjectDetailModal({
    subjectId,
    onClose,
    onEdit,
}: {
    subjectId: string | number
    onClose: () => void
    onEdit: () => void
}) {
    const [subject, setSubject] = useState<Subject | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchDetail = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const res = await subjectApi.getById(subjectId)
            const data = ((res.data as { result?: Subject })?.result || res.data) as Subject
            setSubject(data)
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to load subject details.')
        } finally {
            setLoading(false)
        }
    }, [subjectId])

    useEffect(() => {
        fetchDetail()
    }, [fetchDetail])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Subject Details
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-4 bg-slate-100 rounded w-1/3" />
                            <div className="h-6 bg-slate-100 rounded w-3/4" />
                            <div className="h-16 bg-slate-100 rounded w-full" />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">
                            <p className="font-semibold mb-1">Failed to load subject</p>
                            <p>{error}</p>
                            <button
                                onClick={fetchDetail}
                                className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : subject ? (
                        <div className="space-y-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subject Code</span>
                                <div className="mt-1">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        {subject.code}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subject Name</span>
                                <p className="mt-1 text-base font-semibold text-slate-800">{subject.name}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</span>
                                <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg p-3">
                                    {subject.description || 'No description provided.'}
                                </p>
                            </div>
                            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                                Subject ID: {subject.id}
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        {subject && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose()
                                    onEdit()
                                }}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                            >
                                Edit Subject
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Delete Subject Confirmation Modal ────────────────────────────────────────
function DeleteSubjectModal({
    subject,
    onClose,
    onDeleted,
}: {
    subject: Subject
    onClose: () => void
    onDeleted: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleDelete = async () => {
        try {
            setLoading(true)
            setError('')
            await subjectApi.delete(subject.id)
            onDeleted()
        } catch (err: any) {
            let msg = err.response?.data?.message || err.message || 'Failed to delete subject.'
            if (typeof msg === 'string' && (msg.includes('foreign key constraint') || msg.includes('violates foreign key'))) {
                msg = 'Cannot delete this subject because it is linked to existing questions, learning materials, or exam sessions. Please delete linked items first.'
            }
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Delete Subject
                    </h2>
                    <button onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}
                    <p className="text-sm text-slate-600">
                        Are you sure you want to delete <span className="font-bold text-slate-800">{subject.code} - {subject.name}</span>?
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        This action cannot be undone. Any linked questions, learning materials, or exam sessions may prevent deletion or be affected.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            Delete Subject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Create / Edit Question Modal ─────────────────────────────────────────────
const BLOOM_OPTIONS: BloomLevel[] = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']

function CreateQuestionModal({
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

        const payload: QuestionUpsertPayload = {
            content: content.trim(),
            referenceAnswer: referenceAnswer.trim() || undefined,
            topics: topicList.length > 0 ? topicList : undefined,
            bloomLevel: bloomLevel || undefined,
            answerTimeLimitSeconds: limit,
        }

        try {
            setLoading(true)
            if (isEdit) {
                await questionApi.update(question!.id, payload)
            } else {
                await questionApi.create({ ...payload, subjectId })
            }
            onCreated()
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || `Failed to ${isEdit ? 'update' : 'create'} question.`
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
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
                        <div className="grid grid-cols-2 gap-4">
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
export default function QuestionBank() {
    // Subjects state
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [subjectsLoading, setSubjectsLoading] = useState(true)
    const [subjectsError, setSubjectsError] = useState(false)
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

    // Questions state
    const [questions, setQuestions] = useState<Question[]>([])
    const [questionsLoading, setQuestionsLoading] = useState(false)
    const [questionsError, setQuestionsError] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const PAGE_SIZE = 20

    // Modals
    const [showCreateSubject, setShowCreateSubject] = useState(false)
    const [showEditSubject, setShowEditSubject] = useState(false)
    const [showSubjectDetail, setShowSubjectDetail] = useState(false)
    const [showDeleteSubject, setShowDeleteSubject] = useState(false)
    const [showCreateQuestion, setShowCreateQuestion] = useState(false)
    const [showGenerateQuestions, setShowGenerateQuestions] = useState(false)
    const [editQuestion, setEditQuestion] = useState<QuestionItem | null>(null)
    const [detailQuestion, setDetailQuestion] = useState<QuestionItem | null>(null)
    const [aiSuccessBanner, setAiSuccessBanner] = useState('')

    // ── Fetch subjects ────────────────────────────────────────────────────────
    const fetchSubjects = useCallback(async () => {
        try {
            setSubjectsLoading(true)
            setSubjectsError(false)
            const res = await subjectApi.getAll()
            const list: Subject[] = Array.isArray(res.data) ? res.data
                : Array.isArray(res.data?.result) ? res.data.result : []
            setSubjects(list)
            // Auto-select first subject on initial load
            setSelectedSubject(prev => {
                if (prev) return prev // keep current selection on refresh
                return list.length > 0 ? list[0] : null
            })
        } catch {
            setSubjectsError(true)
        } finally {
            setSubjectsLoading(false)
        }
    }, [])

    useEffect(() => { fetchSubjects() }, [fetchSubjects])

    // ── Fetch questions when subject changes ──────────────────────────────────
    const fetchQuestions = useCallback(async (subjectId: string | number) => {
        try {
            setQuestionsLoading(true)
            setQuestionsError(false)
            const res = await questionApi.getBySubject(subjectId)
            const list: Question[] = Array.isArray(res.data) ? res.data
                : Array.isArray(res.data?.result) ? res.data.result
                : Array.isArray(res.data?.result?.data) ? res.data.result.data
                : Array.isArray(res.data?.result?.content) ? res.data.result.content : []
            setQuestions(list)
        } catch {
            setQuestionsError(true)
        } finally {
            setQuestionsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedSubject?.id) {
            setPage(0)
            fetchQuestions(selectedSubject.id)
        } else {
            setQuestions([])
        }
    }, [selectedSubject, fetchQuestions])

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSubjectCreated = async (created: Subject) => {
        setShowCreateSubject(false)
        await fetchSubjects()
        // Select the newly created subject
        if (created?.id) {
            setSelectedSubject(created)
        }
    }

    const handleSubjectUpdated = async (updated: Subject) => {
        setShowEditSubject(false)
        await fetchSubjects()
        setSelectedSubject(updated)
    }

    const handleSubjectDeleted = async () => {
        setShowDeleteSubject(false)
        setSelectedSubject(null)
        await fetchSubjects()
    }

    const handleQuestionCreated = async () => {
        setShowCreateQuestion(false)
        setEditQuestion(null)
        if (selectedSubject?.id) {
            await fetchQuestions(selectedSubject.id)
        }
    }

    const handleQuestionsGenerated = async (generated: QuestionItem[]) => {
        setShowGenerateQuestions(false)
        if (selectedSubject?.id) {
            await fetchQuestions(selectedSubject.id)
        }
        setAiSuccessBanner(`Successfully generated ${generated.length} question(s) with rubrics via AI!`)
        setTimeout(() => setAiSuccessBanner(''), 10000)
        if (generated.length > 0) {
            setDetailQuestion(generated[0])
        }
    }

    const handleViewQuestion = async (q: Question) => {
        if (q.rubric) {
            setDetailQuestion(q)
        } else {
            try {
                const res = await questionApi.getById(q.id)
                const full = res.data?.result || q
                setDetailQuestion(full)
            } catch {
                setDetailQuestion(q)
            }
        }
    }

    const handleEditQuestion = async (q: Question) => {
        try {
            const res = await questionApi.getById(q.id)
            setEditQuestion(res.data?.result || q)
        } catch {
            setEditQuestion(q)
        }
    }

    const handleDeleteQuestion = async (id: string | number) => {
        try {
            setDeleteLoading(true)
            setDeleteError('')
            await questionApi.delete(id)
            setConfirmDeleteId(null)
            if (selectedSubject?.id) await fetchQuestions(selectedSubject.id)
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete question.'
            setDeleteError(msg)
        } finally {
            setDeleteLoading(false)
        }
    }

    // ── Filtered questions by search (client-side) ────────────────────────────
    const filteredQuestions = questions.filter(q => {
        if (!search.trim()) return true
        const s = search.toLowerCase()
        const topicStr = Array.isArray(q.topics) ? q.topics.join(' ') : (q.topic || '')
        return (q.content || '').toLowerCase().includes(s)
            || topicStr.toLowerCase().includes(s)
            || (q.bloomLevel || '').toLowerCase().includes(s)
            || (q.difficulty || '').toLowerCase().includes(s)
            || (q.status || '').toLowerCase().includes(s)
    })

    const totalPages = Math.ceil(filteredQuestions.length / PAGE_SIZE)
    const pagedQuestions = filteredQuestions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
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
                        <span className="text-sm text-slate-400">No subjects found.</span>
                    ) : (
                        <select
                            value={selectedSubject?.id ?? ''}
                            onChange={e => {
                                const found = subjects.find(s => String(s.id) === e.target.value)
                                setSelectedSubject(found || null)
                                setSearch('')
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-w-[280px]"
                        >
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.code} - {s.name}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={() => setShowCreateSubject(true)}
                        className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shrink-0"
                    >
                        + Create Subject
                    </button>

                    {selectedSubject && (
                        <>
                            <button
                                onClick={() => setShowSubjectDetail(true)}
                                className="px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
                                title="View Subject Details"
                            >
                                <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                Details
                            </button>
                            <button
                                onClick={() => setShowEditSubject(true)}
                                className="px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
                                title="Edit Subject"
                            >
                                <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                            </button>
                            <button
                                onClick={() => setShowDeleteSubject(true)}
                                className="px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
                                title="Delete Subject"
                            >
                                <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                </svg>
                                Delete
                            </button>
                        </>
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

                {/* Questions toolbar */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
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
                                onChange={e => { setSearch(e.target.value); setPage(0) }}
                                placeholder="Search questions..."
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64"
                            />
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
                                ? 'Create a subject first to start adding questions.'
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
                            Failed to load questions.
                            <button
                                onClick={() => fetchQuestions(selectedSubject.id)}
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
                                {filteredQuestions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            {search ? 'No questions match your search.' : 'No questions yet. Click "✨ Generate with AI" or "+ Create Manually" to get started.'}
                                        </td>
                                    </tr>
                                ) : (
                                    pagedQuestions.map(q => (
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
                                                        {q.status && (
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                q.status === 'ACTIVE'
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                            }`}>
                                                                {q.status}
                                                            </span>
                                                        )}
                                                        {q.answerTimeLimitSeconds && (
                                                            <span className="text-[11px] text-slate-400">
                                                                ⏱️ {q.answerTimeLimitSeconds}s
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="line-clamp-2 text-slate-800 font-medium">{q.content || '—'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">
                                                {Array.isArray(q.topics) && q.topics.length > 0 ? q.topics.join(', ') : (q.topic || '—')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <LevelBadge level={q.bloomLevel} difficulty={q.difficulty} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {q.rubric ? (() => {
                                                    const totalWeight = Array.isArray(q.rubric.criteria)
                                                        ? q.rubric.criteria.reduce((sum, c) => sum + (c.pointWeight ?? 0), 0)
                                                        : 0
                                                    const count = Array.isArray(q.rubric.criteria) ? q.rubric.criteria.length : 0
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                            📊 {count > 0 ? `${count} criteria · ${totalWeight} pts` : 'Rubric'}
                                                        </span>
                                                    )
                                                })() : (
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
                                                        <button
                                                            onClick={() => handleEditQuestion(q)}
                                                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => { setConfirmDeleteId(q.id); setDeleteError('') }}
                                                            className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                                                        >
                                                            Delete
                                                        </button>
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
                                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredQuestions.length)} of {filteredQuestions.length}
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
            {showCreateSubject && (
                <CreateSubjectModal
                    onClose={() => setShowCreateSubject(false)}
                    onCreated={handleSubjectCreated}
                />
            )}

            {showSubjectDetail && selectedSubject && (
                <SubjectDetailModal
                    subjectId={selectedSubject.id}
                    onClose={() => setShowSubjectDetail(false)}
                    onEdit={() => setShowEditSubject(true)}
                />
            )}

            {showEditSubject && selectedSubject && (
                <EditSubjectModal
                    subject={selectedSubject}
                    onClose={() => setShowEditSubject(false)}
                    onUpdated={handleSubjectUpdated}
                />
            )}

            {showDeleteSubject && selectedSubject && (
                <DeleteSubjectModal
                    subject={selectedSubject}
                    onClose={() => setShowDeleteSubject(false)}
                    onDeleted={handleSubjectDeleted}
                />
            )}

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
