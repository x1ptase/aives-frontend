import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subjectApi, learningMaterialApi, MaterialResponse, SubjectResponse } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'

type Subject = SubjectResponse
type Material = MaterialResponse

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status?: string }) {
    const s = (status || 'UNKNOWN').toUpperCase()
    const config: Record<string, { label: string; cls: string }> = {
        COMPLETED:  { label: 'Processed',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        PROCESSING: { label: 'Processing…', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        PENDING:    { label: 'Pending',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        FAILED:     { label: 'Failed',       cls: 'bg-red-50 text-red-700 border-red-200' },
    }
    const { label, cls } = config[s] ?? { label: s, cls: 'bg-slate-50 text-slate-600 border-slate-200' }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${cls}`}>
            {s === 'PROCESSING' && (
                <svg className="animate-spin w-2.5 h-2.5 mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {label}
        </span>
    )
}

// ── Edit Title Modal ──────────────────────────────────────────────────────────
export function EditTitleModal({
    material,
    onClose,
    onUpdated,
}: {
    material: Material
    onClose: () => void
    onUpdated: (updated: Material) => void
}) {
    const [title, setTitle] = useState(material.title || material.originalFileName || '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        const trimmed = title.trim()
        if (!trimmed) return setError('Title is required.')
        try {
            setLoading(true)
            const res = await learningMaterialApi.updateTitle(material.id, trimmed)
            const updated: Material = (res.data as any)?.result || res.data || { ...material, title: trimmed }
            onUpdated(updated)
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update title.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Edit Title
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
                    <div className="mb-1 text-xs text-slate-400 truncate">
                        File: {material.originalFileName || '(unknown)'}
                    </div>
                    <input
                        type="text"
                        value={title}
                        disabled={loading}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Enter a display title"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-slate-50"
                        required
                        autoFocus
                    />
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
                            {loading && (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            Save Title
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ── Delete Material Modal ─────────────────────────────────────────────────────
export function DeleteMaterialModal({
    material,
    onClose,
    onDeleted,
}: {
    material: Material
    onClose: () => void
    onDeleted: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleDelete = async () => {
        try {
            setLoading(true)
            setError('')
            await learningMaterialApi.delete(material.id)
            onDeleted()
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to delete material.')
        } finally {
            setLoading(false)
        }
    }

    const displayName = material.title || material.originalFileName || `Material #${material.id}`

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Delete Material
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
                        Are you sure you want to delete{' '}
                        <span className="font-bold text-slate-800">"{displayName}"</span>?
                    </p>
                    <p className="mt-2 text-xs text-slate-500">This action cannot be undone.</p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="button" onClick={handleDelete} disabled={loading}
                            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
                            {loading && (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── File Icon ─────────────────────────────────────────────────────────────────
function FileIcon({ name }: { name?: string }) {
    const ext = (name || '').split('.').pop()?.toLowerCase() ?? ''
    const isPdf = ext === 'pdf'
    const isDoc = ['doc', 'docx'].includes(ext)
    const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)

    if (isPdf) return (
        <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-red-600">PDF</span>
        </div>
    )
    if (isDoc) return (
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-blue-600">DOC</span>
        </div>
    )
    if (isImg) return (
        <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-purple-600">IMG</span>
        </div>
    )
    return (
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LearningMaterials() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const isAdmin = ['ADMIN', 'Admin', 'admin'].includes(user?.role ?? '')

    // Subject state
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [subjectsLoading, setSubjectsLoading] = useState(true)
    const [subjectsError, setSubjectsError] = useState(false)
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

    // Materials state
    const [materials, setMaterials] = useState<Material[]>([])
    const [materialsLoading, setMaterialsLoading] = useState(false)
    const [materialsError, setMaterialsError] = useState(false)

    // Upload state
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [uploadTitle, setUploadTitle] = useState('')
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadSuccess, setUploadSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Modal state
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
    const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null)

    // ── Fetch subjects ─────────────────────────────────────────────────────
    const fetchSubjects = useCallback(async () => {
        try {
            setSubjectsLoading(true)
            setSubjectsError(false)
            const res = await subjectApi.getAll()
            const list: Subject[] = Array.isArray(res.data) ? res.data
                : Array.isArray((res.data as any)?.result) ? (res.data as any).result : []
            setSubjects(list)
            setSelectedSubject(prev => prev ?? (list[0] ?? null))
        } catch {
            setSubjectsError(true)
        } finally {
            setSubjectsLoading(false)
        }
    }, [])

    useEffect(() => { fetchSubjects() }, [fetchSubjects])

    // ── Fetch materials ────────────────────────────────────────────────────
    const fetchMaterials = useCallback(async (subjectId: string | number) => {
        try {
            setMaterialsLoading(true)
            setMaterialsError(false)
            const res = await learningMaterialApi.getBySubject(subjectId)
            const list: Material[] = Array.isArray(res.data) ? res.data
                : Array.isArray((res.data as any)?.result) ? (res.data as any).result : []
            setMaterials(list)
        } catch {
            setMaterialsError(true)
        } finally {
            setMaterialsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedSubject?.id) {
            fetchMaterials(selectedSubject.id)
        } else {
            setMaterials([])
        }
    }, [selectedSubject, fetchMaterials])

    // ── Upload handler ─────────────────────────────────────────────────────
    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !selectedSubject) return
        setUploadError('')
        setUploadSuccess('')
        setUploadProgress(0)
        setUploading(true)

        const file = files[0]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('subjectId', String(selectedSubject.id))
        if (uploadTitle.trim()) {
            formData.append('title', uploadTitle.trim())
        }

        try {
            await learningMaterialApi.upload(formData, setUploadProgress)
            setUploadSuccess(`"${file.name}" uploaded. It will appear below with its processing status.`)
            setUploadTitle('')
            if (fileInputRef.current) fileInputRef.current.value = ''
            await fetchMaterials(selectedSubject.id)
        } catch (err: any) {
            setUploadError(err.response?.data?.message || err.message || 'Upload failed.')
        } finally {
            setUploading(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        handleUpload(e.dataTransfer.files)
    }

    // ── Title update ───────────────────────────────────────────────────────
    const handleTitleUpdated = (updated: Material) => {
        setMaterials(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        setEditingMaterial(null)
    }

    // ── Delete ─────────────────────────────────────────────────────────────
    const handleDeleted = async () => {
        setDeletingMaterial(null)
        if (selectedSubject?.id) await fetchMaterials(selectedSubject.id)
    }

    const statusOptions = useMemo(
        () => Array.from(new Set(materials.map(m => m.processingStatus).filter(Boolean) as string[])),
        [materials]
    )
    const visibleMaterials = useMemo(() => {
        const q = search.trim().toLowerCase()
        return materials.filter(m => {
            if (statusFilter && m.processingStatus !== statusFilter) return false
            if (!q) return true
            return [m.title, m.originalFileName].some(v => (v || '').toLowerCase().includes(q))
        })
    }, [materials, search, statusFilter])

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Learning Materials
                </h1>
                <p className="text-xs text-slate-500 mt-1">Upload and manage study materials organised by subject</p>
            </div>

            {/* ── Subject selector ─────────────────────────────────────────── */}
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
                        <span className="text-sm text-slate-400">No subjects available to your account.</span>
                    ) : (
                        <select
                            value={selectedSubject?.id ?? ''}
                            onChange={e => {
                                const found = subjects.find(s => String(s.id) === e.target.value)
                                setSelectedSubject(found || null)
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-w-[280px]"
                        >
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* ── Upload panel ─────────────────────────────────────────────── */}
            {selectedSubject && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 mb-5">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Upload Material
                        <span className="ml-2 text-xs text-slate-400 font-normal">({selectedSubject.code})</span>
                    </h2>

                    {uploadSuccess && (
                        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium">
                            {uploadSuccess}
                        </div>
                    )}
                    {uploadError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">
                            {uploadError}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <input
                            type="text"
                            value={uploadTitle}
                            onChange={e => setUploadTitle(e.target.value)}
                            disabled={uploading}
                            placeholder="Display title (optional)"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-slate-50"
                        />
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                            dragOver
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        } ${uploading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={e => handleUpload(e.target.files)}
                            disabled={uploading}
                        />
                        {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <p className="text-sm font-medium text-blue-600">Uploading… {uploadProgress}%</p>
                                <div className="w-48 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm font-medium text-slate-700">
                                    {dragOver ? 'Drop to upload' : 'Click or drag file to upload'}
                                </p>
                                <p className="text-xs text-slate-400">Accepted file types are validated by the server</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Materials list ────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Materials
                        {selectedSubject && (
                            <span className="ml-2 text-slate-400 font-normal text-xs">({selectedSubject.code})</span>
                        )}
                    </h2>
                    <div className="flex items-center gap-3">
                        {!materialsLoading && selectedSubject && (
                            <span className="text-xs text-slate-400">{visibleMaterials.length} file{visibleMaterials.length !== 1 ? 's' : ''}</span>
                        )}
                        <button
                            onClick={() => navigate('/lecturer/question-bank')}
                            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            title="Generate questions from materials in the Question Bank"
                        >
                            ✨ Generate Questions
                        </button>
                    </div>
                </div>
                {selectedSubject && materials.length > 0 && (
                    <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search title or file name…"
                            className="flex-1 min-w-48 max-w-72 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                        />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none"
                        >
                            <option value="">All statuses</option>
                            {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                    </div>
                )}

                {!selectedSubject ? (
                    <div className="px-6 py-16 text-center text-slate-400">
                        <svg className="w-10 h-10 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-sm">Select a subject to view materials</p>
                    </div>
                ) : materialsLoading ? (
                    <div className="divide-y divide-slate-50">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                <div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : materialsError ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-sm text-red-500 mb-3">Failed to load materials.</p>
                        <button
                            onClick={() => selectedSubject?.id && fetchMaterials(selectedSubject.id)}
                            className="px-4 py-1.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : materials.length === 0 ? (
                    <div className="px-6 py-16 text-center text-slate-400">
                        <svg className="w-10 h-10 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">No materials uploaded yet for this subject.</p>
                    </div>
                ) : visibleMaterials.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-400">No materials match your search.</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {visibleMaterials.map(m => {
                            const displayName = m.title || m.originalFileName || `Material #${m.id}`
                            const fileName = m.originalFileName
                            return (
                                <div key={m.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                                    <FileIcon name={fileName} />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                                        {m.title && m.originalFileName && m.title !== m.originalFileName && (
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{m.originalFileName}</p>
                                        )}
                                        {m.createdAt && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(m.createdAt).toLocaleDateString(undefined, {
                                                    year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </p>
                                        )}
                                    </div>

                                    <StatusBadge status={m.processingStatus} />

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        {/* Edit title — available to all */}
                                        <button
                                            onClick={() => setEditingMaterial(m)}
                                            title="Edit title"
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>

                                        {/* Delete — Admin only */}
                                        {isAdmin && (
                                            <button
                                                onClick={() => setDeletingMaterial(m)}
                                                title="Delete material"
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                    <path d="M10 11v6M14 11v6" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            {editingMaterial && (
                <EditTitleModal
                    material={editingMaterial}
                    onClose={() => setEditingMaterial(null)}
                    onUpdated={handleTitleUpdated}
                />
            )}

            {deletingMaterial && (
                <DeleteMaterialModal
                    material={deletingMaterial}
                    onClose={() => setDeletingMaterial(null)}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    )
}
