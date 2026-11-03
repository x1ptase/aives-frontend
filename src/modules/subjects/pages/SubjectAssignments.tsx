import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import i18n from '@/shared/i18n'
import { SubjectAssignment, SubjectResponse, subjectApi, subjectAssignmentApi, getAllSubjectAssignments } from '../api'
import { userApi } from '@/modules/users'
import AssignLecturerModal, { LecturerOption } from '../components/AssignLecturerModal'
import { SearchIcon, PlusIcon, TrashIcon } from '@/shared/components/common/Icons'

const errMsg = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback

export default function SubjectAssignments() {
  const { t } = useTranslation()
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([])
  const [lecturers, setLecturers] = useState<LecturerOption[]>([])
  const [subjects, setSubjects] = useState<SubjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [assignError, setAssignError] = useState('')
  const [refError, setRefError] = useState('')

  const [search, setSearch] = useState('')
  const [lecturerFilter, setLecturerFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')

  const [showAssign, setShowAssign] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<SubjectAssignment | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setAssignError('')
    setRefError('')
    const [aRes, uRes, sRes] = await Promise.allSettled([
      getAllSubjectAssignments(),
      userApi.getAll(),
      subjectApi.getAll(),
    ])

    if (aRes.status === 'fulfilled') {
      setAssignments(aRes.value)
    } else {
      setAssignments([])
      setAssignError(errMsg(aRes.reason, i18n.t('subjects.assignments.loadAssignmentsFailed')))
    }

    const refErrors: string[] = []
    if (uRes.status === 'fulfilled') {
      setLecturers(
        (uRes.value.data?.result ?? [])
          .filter(u => u.role === 'LECTURER')
          .map(u => ({ id: u.id, username: u.username, name: u.fullName || u.username }))
      )
    } else {
      setLecturers([])
      refErrors.push(errMsg(uRes.reason, i18n.t('subjects.assignments.loadLecturersFailed')))
    }
    if (sRes.status === 'fulfilled') {
      const d = sRes.value.data
      setSubjects(Array.isArray(d) ? d : d?.result ?? [])
    } else {
      setSubjects([])
      refErrors.push(errMsg(sRes.reason, i18n.t('subjects.assignments.loadSubjectsFailed')))
    }
    setRefError(refErrors.join(' '))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assignments.filter(a => {
      if (lecturerFilter && String(a.lecturerId) !== lecturerFilter) return false
      if (subjectFilter && String(a.subject.id) !== subjectFilter) return false
      if (!q) return true
      return [a.lecturerUsername, a.lecturerFullName, a.subject.code, a.subject.name].some(v =>
        (v || '').toLowerCase().includes(q)
      )
    })
  }, [assignments, search, lecturerFilter, subjectFilter])

  const handleRemove = async () => {
    if (!removeTarget) return
    try {
      setRemoveLoading(true)
      setRemoveError('')
      await subjectAssignmentApi.revoke({
        lecturerId: removeTarget.lecturerId,
        subjectIds: [removeTarget.subject.id],
      })
      setRemoveTarget(null)
      await load()
    } catch (err: any) {
      setRemoveError(errMsg(err, i18n.t('subjects.assignments.removeFailed')))
    } finally {
      setRemoveLoading(false)
    }
  }

  const canAssign = !loading && lecturers.length > 0 && subjects.length > 0
  const hasFilters = !!(search || lecturerFilter || subjectFilter)
  const selectCls =
    'px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:bg-white'

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f1f5f9]">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {t('subjects.assignments.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('subjects.assignments.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowAssign(true)}
          disabled={!canAssign}
          title={canAssign ? undefined : t('subjects.assignments.needLoaded')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon />
          {t('subjects.assignments.assignLecturer')}
        </button>
      </div>

      {refError && (
        <div className="mb-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm">{refError}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52 max-w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder={t('subjects.assignments.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:bg-white transition-all"
            />
          </div>
          <select value={lecturerFilter} onChange={e => setLecturerFilter(e.target.value)} className={selectCls}>
            <option value="">{t('subjects.assignments.allLecturers')}</option>
            {lecturers.map(l => (
              <option key={l.id} value={String(l.id)}>{l.name} ({l.username})</option>
            ))}
          </select>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className={selectCls}>
            <option value="">{t('subjects.assignments.allSubjects')}</option>
            {subjects.map(s => (
              <option key={s.id} value={String(s.id)}>{s.code} - {s.name}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setLecturerFilter(''); setSubjectFilter('') }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {t('subjects.assignments.clearFilters')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
          </div>
        ) : assignError ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-red-600">{t('subjects.assignments.loadFailedTitle')}</p>
            <p className="text-xs text-slate-500 mt-1">{assignError}</p>
            <button
              onClick={load}
              className="mt-4 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg"
            >
              {t('subjects.assignments.retry')}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {hasFilters ? t('subjects.assignments.noMatch') : t('subjects.assignments.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">{t('subjects.assignments.cols.username')}</th>
                  <th className="px-4 py-3">{t('subjects.assignments.cols.name')}</th>
                  <th className="px-4 py-3">{t('subjects.assignments.cols.code')}</th>
                  <th className="px-4 py-3">{t('subjects.assignments.cols.subject')}</th>
                  <th className="px-4 py-3 text-right">{t('subjects.assignments.cols.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium">{a.lecturerUsername}</td>
                    <td className="px-4 py-3">{a.lecturerFullName || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{a.subject.code}</td>
                    <td className="px-4 py-3">{a.subject.name}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setRemoveTarget(a); setRemoveError('') }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                      >
                        <TrashIcon />
                        {t('subjects.assignments.remove')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAssign && (
        <AssignLecturerModal
          lecturers={lecturers}
          subjects={subjects}
          assignments={assignments}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); load() }}
        />
      )}

      {removeTarget && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="m-auto bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {t('subjects.assignments.removeTitle')}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              <Trans
                i18nKey="subjects.assignments.removeBody"
                values={{
                  lecturer: removeTarget.lecturerFullName || removeTarget.lecturerUsername,
                  username: removeTarget.lecturerUsername,
                  subject: `${removeTarget.subject.code} - ${removeTarget.subject.name}`,
                }}
                components={{ b: <strong /> }}
              />
            </p>
            <p className="mt-3 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs">
              {t('subjects.assignments.removeNote')}
            </p>
            {removeError && (
              <div className="mt-3 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">{removeError}</div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRemoveTarget(null)}
                disabled={removeLoading}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
              >
                {t('subjects.assignments.cancel')}
              </button>
              <button
                onClick={handleRemove}
                disabled={removeLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-70"
              >
                {removeLoading ? t('subjects.assignments.removing') : t('subjects.assignments.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
