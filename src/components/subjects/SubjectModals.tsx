import { useState, useEffect, useCallback } from 'react'
import { subjectApi, SubjectResponse } from '@/services/api'

type Subject = SubjectResponse

// ─── Create Subject Modal ─────────────────────────────────────────────────────
export function CreateSubjectModal({
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
export function EditSubjectModal({
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
export function SubjectDetailModal({
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
export function DeleteSubjectModal({
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

