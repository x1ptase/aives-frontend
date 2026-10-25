import { useCallback, useEffect, useState } from 'react'
import { examSessionApi, examPage } from '@/modules/exams'
import { useAuthStore } from '@/modules/auth'
import PageContainer from '@/shared/components/common/PageContainer'
import SectionCard from '@/shared/components/common/SectionCard'
import LoadingState from '@/shared/components/common/LoadingState'
import EmptyState from '@/shared/components/common/EmptyState'
import ErrorState from '@/shared/components/common/ErrorState'
import { MySubjectsCard } from '@/modules/subjects'

type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'loaded'; count: number }

export default function LecturerDashboard() {
    const user = useAuthStore(s => s.user)
    const [exams, setExams] = useState<State>({ status: 'loading' })

    const loadExams = useCallback(async () => {
        setExams({ status: 'loading' })
        try {
            const res = await examSessionApi.getAll({ size: 1 })
            setExams({ status: 'loaded', count: examPage(res.data).totalElements })
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

    return (
        <PageContainer title={`Welcome${user?.name ? `, ${user.name}` : ''}`} subtitle="Your teaching workspace.">
            <MySubjectsCard />

            <SectionCard title="Exams & Grading">
                {exams.status === 'loading' && <LoadingState />}
                {exams.status === 'error' && (
                    <ErrorState title="Exams are unavailable" message={exams.message} onRetry={loadExams} />
                )}
                {exams.status === 'loaded' && (
                    <EmptyState
                        message={exams.count === 0
                            ? 'No exams yet.'
                            : `${exams.count} exam session(s). Open My Exams to manage sessions and student schedules.`}
                    />
                )}
            </SectionCard>
        </PageContainer>
    )
}
