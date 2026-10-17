import { useCallback, useEffect, useMemo, useState } from 'react'
import { subjectApi, SubjectResponse } from '../api'
import {
  CreateSubjectModal,
  EditSubjectModal,
  SubjectDetailModal,
  DeleteSubjectModal,
} from '../components/SubjectModals'
import PageContainer from '@/shared/components/common/PageContainer'
import LoadingState from '@/shared/components/common/LoadingState'
import EmptyState from '@/shared/components/common/EmptyState'
import ErrorState from '@/shared/components/common/ErrorState'
import { SearchIcon, PlusIcon, EditIcon, TrashIcon } from '@/shared/components/common/Icons'

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<SubjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | number | null>(null)
  const [editTarget, setEditTarget] = useState<SubjectResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SubjectResponse | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await subjectApi.getAll()
      const d = res.data
      setSubjects(Array.isArray(d) ? d : d?.result ?? [])
    } catch (err: any) {
      setSubjects([])
      setError(err?.response?.data?.message || err?.message || 'Could not load subjects.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return subjects.filter(
      s => !q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
    )
  }, [subjects, search])

  return (
    <PageContainer title="Subject Management" subtitle="Create and maintain the subjects used by materials and questions.">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52 max-w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search code, name or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <PlusIcon /> Create Subject
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingState rows={4} />
          ) : error ? (
            <ErrorState title="Could not load subjects" message={error} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState message={search ? 'No subjects match your search.' : 'No subjects yet. Click "Create Subject" to add one.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold">{s.code}</td>
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{s.description || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setDetailId(s.id)} className="px-2.5 py-1.5 mr-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors">
                          Details
                        </button>
                        <button onClick={() => setEditTarget(s)} className="inline-flex items-center gap-1 px-2.5 py-1.5 mr-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors">
                          <EditIcon /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors">
                          <TrashIcon /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateSubjectModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}
      {detailId !== null && (
        <SubjectDetailModal
          subjectId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            const s = subjects.find(x => String(x.id) === String(detailId))
            setDetailId(null)
            if (s) setEditTarget(s)
          }}
        />
      )}
      {editTarget && (
        <EditSubjectModal subject={editTarget} onClose={() => setEditTarget(null)} onUpdated={() => { setEditTarget(null); load() }} />
      )}
      {deleteTarget && (
        <DeleteSubjectModal subject={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); load() }} />
      )}
    </PageContainer>
  )
}
