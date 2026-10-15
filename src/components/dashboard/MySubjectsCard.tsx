import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMySubjects, SubjectResponse } from '@/services/api'
import LoadingState from '@/components/common/LoadingState'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; subjects: SubjectResponse[] }

const linkCls =
  'px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-md transition-colors'

export default function MySubjectsCard() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      setState({ status: 'loaded', subjects: await getMySubjects() })
    } catch (err: any) {
      setState({
        status: 'error',
        message: err?.response?.data?.message || err?.message || 'Could not load your subjects.',
      })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 border-l-4 border-l-blue-600 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            My Subjects
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Subjects assigned to you by an administrator</p>
        </div>
        {state.status === 'loaded' && (
          <span className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
            {state.subjects.length} assigned
          </span>
        )}
      </div>
      <div className="p-6">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && (
          <ErrorState title="Could not load your subjects" message={state.message} onRetry={load} />
        )}
        {state.status === 'loaded' && state.subjects.length === 0 && (
          <EmptyState
            message="You have not been assigned to any subject yet."
            description="Please contact an administrator."
          />
        )}
        {state.status === 'loaded' && state.subjects.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {state.subjects.map(s => (
              <li key={s.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-48">
                  <p className="text-sm font-semibold text-slate-800">{s.code}</p>
                  <p className="text-xs text-slate-500">{s.name}</p>
                </div>
                <button onClick={() => navigate(`/lecturer/learning-materials?subject=${s.id}`)} className={linkCls}>
                  Learning Materials
                </button>
                <button onClick={() => navigate(`/lecturer/question-bank?subject=${s.id}`)} className={linkCls}>
                  Question Bank
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
