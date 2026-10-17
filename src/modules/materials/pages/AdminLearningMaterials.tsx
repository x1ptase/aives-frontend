import { useCallback, useEffect, useMemo, useState } from 'react'
import { subjectApi, SubjectResponse } from '@/modules/subjects'
import { learningMaterialApi, MaterialResponse } from '../api'
import { StatusBadge, EditTitleModal, DeleteMaterialModal } from './LearningMaterials'
import { SearchIcon, EditIcon, TrashIcon } from '@/shared/components/common/Icons'

const PAGE_SIZE = 10

const unwrapList = <T,>(data: unknown): T[] =>
  Array.isArray(data) ? data : Array.isArray((data as { result?: unknown })?.result) ? (data as { result: T[] }).result : []

// File type is derived from the original file name extension (no dedicated API field).
const fileExt = (name?: string) => {
  const i = name ? name.lastIndexOf('.') : -1
  return i >= 0 ? name!.slice(i + 1).toUpperCase() : '—'
}

export default function AdminLearningMaterials() {
  const [subjects, setSubjects] = useState<SubjectResponse[]>([])
  const [materials, setMaterials] = useState<MaterialResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialError, setPartialError] = useState('')

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [editTarget, setEditTarget] = useState<MaterialResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaterialResponse | null>(null)

  // The backend only lists materials per subject (GET /materials/subject/{id}), so aggregate across subjects.
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setPartialError('')
    try {
      const subjRes = await subjectApi.getAll()
      const subjList = unwrapList<SubjectResponse>(subjRes.data)
      setSubjects(subjList)
      const results = await Promise.allSettled(
        subjList.map(s => learningMaterialApi.getBySubject(s.id))
      )
      const all: MaterialResponse[] = []
      let failed = 0
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          unwrapList<MaterialResponse>(r.value.data).forEach(m =>
            all.push({ ...m, subjectId: m.subjectId ?? subjList[i].id })
          )
        } else {
          failed++
        }
      })
      setMaterials(all)
      if (failed > 0) {
        setPartialError(`Could not load materials for ${failed} of ${subjList.length} subject(s). The list may be incomplete.`)
      }
    } catch (err: any) {
      setMaterials([])
      setError(err?.response?.data?.message || err?.message || 'Could not load learning materials.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const subjectById = useMemo(() => new Map(subjects.map(s => [String(s.id), s])), [subjects])
  const statuses = useMemo(
    () => Array.from(new Set(materials.map(m => m.processingStatus).filter(Boolean) as string[])),
    [materials]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return materials.filter(m => {
      if (subjectFilter && String(m.subjectId) !== subjectFilter) return false
      if (statusFilter && m.processingStatus !== statusFilter) return false
      if (!q) return true
      const subj = subjectById.get(String(m.subjectId))
      return [m.title, m.fileName, subj?.code, subj?.name].some(v => (v || '').toLowerCase().includes(q))
    })
  }, [materials, search, subjectFilter, statusFilter, subjectById])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const hasFilters = !!(search || subjectFilter || statusFilter)
  const selectCls =
    'px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:bg-white'

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f1f5f9]">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Learning Materials
        </h1>
        <p className="text-sm text-slate-500 mt-1">All learning materials across subjects.</p>
      </div>

      {partialError && (
        <div className="mb-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm">{partialError}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52 max-w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search title, file or subject…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:bg-white transition-all"
            />
          </div>
          <select value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); setPage(1) }} className={selectCls}>
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.code} - {s.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className={selectCls}>
            <option value="">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setSubjectFilter(''); setStatusFilter(''); setPage(1) }}
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
            <p className="text-sm font-semibold text-red-600">Could not load materials</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
            <button onClick={load} className="mt-4 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {hasFilters ? 'No materials match your filters.' : 'No learning materials have been uploaded yet.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Title / File</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pageItems.map(m => {
                    const subj = subjectById.get(String(m.subjectId))
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{m.id}</td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium text-slate-800 truncate">{m.title || m.fileName || `Material #${m.id}`}</p>
                          {m.title && m.fileName && m.title !== m.fileName && (
                            <p className="text-xs text-slate-400 truncate">{m.fileName}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">{subj ? `${subj.code} - ${subj.name}` : `#${m.subjectId}`}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">{fileExt(m.fileName)}</td>
                        <td className="px-4 py-3"><StatusBadge status={m.processingStatus} /></td>
                        <td className="px-4 py-3 text-slate-500">{m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => setEditTarget(m)} className="inline-flex items-center gap-1 px-2.5 py-1.5 mr-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors">
                            <EditIcon /> Edit
                          </button>
                          <button onClick={() => setDeleteTarget(m)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors">
                            <TrashIcon /> Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{filtered.length} material(s)</span>
              <div className="flex items-center gap-2">
                <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="px-3 py-1.5 border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50">Prev</button>
                <span>Page {currentPage} / {pageCount}</span>
                <button disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className="px-3 py-1.5 border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {editTarget && (
        <EditTitleModal
          material={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => { setEditTarget(null); load() }}
        />
      )}
      {deleteTarget && (
        <DeleteMaterialModal
          material={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); load() }}
        />
      )}
    </div>
  )
}
