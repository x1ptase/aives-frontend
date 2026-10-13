import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { examSessionApi } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import PageContainer from '@/components/common/PageContainer'
import SectionCard from '@/components/common/SectionCard'
import LoadingState from '@/components/common/LoadingState'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'

type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'loaded'; count: number }

// Only real data sources are used. Exam, grading and result metrics need backend exam endpoints
// that are not available yet, so that section reports the real API outcome instead of showing numbers.
export default function LecturerDashboard() {
    const user = useAuthStore(s => s.user)
    const navigate = useNavigate()
    const [exams, setExams] = useState<State>({ status: 'loading' })

    const loadExams = useCallback(async () => {
        setExams({ status: 'loading' })
        try {
            const res = await examSessionApi.getAll()
            const d = res.data
            const list = Array.isArray(d) ? d : Array.isArray(d?.result) ? d.result : []
            setExams({ status: 'loaded', count: list.length })
        } catch (err: any) {
            setExams({
                status: 'error',
                message: err?.response?.data?.message || err?.message || 'Could not load exams.',
            })
        }
    }, [])

    useEffect(() => {
        loadExams()
    }, [loadExams])

    const shortcuts = [
        { label: 'Learning Materials', desc: 'Upload and manage subject materials for AI generation.', path: '/lecturer/learning-materials' },
        { label: 'Question Bank', desc: 'Generate, create and review questions with rubrics.', path: '/lecturer/question-bank' },
    ]

    return (
        <PageContainer title={`Welcome${user?.name ? `, ${user.name}` : ''}`} subtitle="Your teaching workspace.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {shortcuts.map(s => (
                    <button
                        key={s.path}
                        onClick={() => navigate(s.path)}
                        className="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
                    >
                        <p className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                    </button>
                ))}
            </div>

            <SectionCard title="Exams & Grading">
                {exams.status === 'loading' && <LoadingState />}
                {exams.status === 'error' && (
                    <ErrorState title="Exams are unavailable" message={exams.message} onRetry={loadExams} />
                )}
                {exams.status === 'loaded' && (
                    <EmptyState
                        message={exams.count === 0
                            ? 'No exams yet.'
                            : `The server returned ${exams.count} exam record(s). Detailed display is pending the exam API contract.`}
                    />
                )}
            </SectionCard>
        </PageContainer>
    )
}
