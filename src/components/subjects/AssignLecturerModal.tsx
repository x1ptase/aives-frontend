import { useMemo, useState } from 'react'
import { SubjectAssignment, SubjectResponse, subjectAssignmentApi } from '@/services/api'

export interface LecturerOption {
  id: number | string
  username: string
  name: string
}

interface AssignLecturerModalProps {
  lecturers: LecturerOption[]
  subjects: SubjectResponse[]
  assignments: SubjectAssignment[]
  onClose: () => void
  onAssigned: () => void
}

export default function AssignLecturerModal({
  lecturers,
  subjects,
  assignments,
  onClose,
  onAssigned,
}: AssignLecturerModalProps) {
  const [lecturerId, setLecturerId] = useState<string>('')
  const [selected, setSelected] = useState<(number | string)[]>([])
  const [subjectSearch, setSubjectSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const alreadyAssigned = useMemo(
    () =>
      new Set(
        assignments.filter(a => String(a.lecturerId) === lecturerId).map(a => String(a.subjectId))
      ),
    [assignments, lecturerId]
  )

  const visibleSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase()
    return subjects.filter(
      s => !q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [subjects, subjectSearch])

  const toggle = (id: number | string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const handleLecturerChange = (value: string) => {
    setLecturerId(value)
    // Drop selections that are already assigned to the newly chosen lecturer
    const assigned = new Set(
      assignments.filter(a => String(a.lecturerId) === value).map(a => String(a.subjectId))
    )
    setSelected(prev => prev.filter(id => !assigned.has(String(id))))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const lecturer = lecturers.find(l => String(l.id) === lecturerId)
    if (!lecturer) return setError('Please select a lecturer.')
    if (selected.length === 0) return setError('Please select at least one subject.')

    try {
      setLoading(true)
      await subjectAssignmentApi.create({ lecturerId: lecturer.id, subjectIds: selected })
      onAssigned()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to assign lecturer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="m-auto bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Assign Lecturer
          </h2>
          <button onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">{error}</div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Lecturer <span className="text-red-500">*</span>
            </label>
            <select
              value={lecturerId}
              disabled={loading}
              onChange={e => handleLecturerChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Select a lecturer…</option>
              {lecturers.map(l => (
                <option key={l.id} value={String(l.id)}>
                  {l.name} ({l.username})
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Subjects <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-500">{selected.length} selected</span>
            </div>
            <input
              type="text"
              value={subjectSearch}
              disabled={loading}
              onChange={e => setSubjectSearch(e.target.value)}
              placeholder="Search subject code or name…"
              className="w-full mb-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
            <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {visibleSubjects.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">
                  {subjects.length === 0 ? 'No subjects available.' : 'No subjects match your search.'}
                </p>
              ) : (
                visibleSubjects.map(s => {
                  const taken = alreadyAssigned.has(String(s.id))
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 px-3 py-2 text-sm ${
                        taken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={loading || taken}
                        checked={selected.includes(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                      <span className="font-semibold text-slate-700">{s.code}</span>
                      <span className="flex-1 truncate text-slate-600">{s.name}</span>
                      {taken && <span className="text-[10px] text-slate-400">Already assigned</span>}
                    </label>
                  )
                })
              )}
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
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
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
