import { useCallback, useEffect, useState } from 'react'
import { studentExamApi } from '../api'
import SectionCard from '@/shared/components/common/SectionCard'
import PageContainer from '@/shared/components/common/PageContainer'
import LoadingState from '@/shared/components/common/LoadingState'
import EmptyState from '@/shared/components/common/EmptyState'
import ErrorState from '@/shared/components/common/ErrorState'

type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'loaded'; count: number }

// No student attempt-history contract exists (attempt list, score, feedback and transcript fields are undocumented).
// GET /grading/result/{examId} needs an exam id that no verified endpoint provides to students.
// This page therefore reports the real outcome of studentExamApi.getAll without interpreting unknown fields.
export default function ExamHistory() {
    const [state, setState] = useState<State>({ status: 'loading' })

    const load = useCallback(async () => {
        setState({ status: 'loading' })
        try {
            const res = await studentExamApi.getAll()
            const d = res.data
            const list = Array.isArray(d) ? d : Array.isArray(d?.result) ? d.result : []
            setState({ status: 'loaded', count: list.length })
        } catch (err: any) {
            setState({
                status: 'error',
                message: err?.response?.data?.message || err?.message || 'Could not load your exam history.',
            })
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return (
        <PageContainer title="Exam History" subtitle="Your past exam attempts and results.">
            <SectionCard title="Attempts">
                {state.status === 'loading' && <LoadingState />}
                {state.status === 'error' && (
                    <ErrorState title="Exam history is unavailable" message={state.message} onRetry={load} />
                )}
                {state.status === 'loaded' && (
                    <EmptyState
                        message={
                            state.count === 0
                                ? 'You have no exam attempts yet.'
                                : `The server returned ${state.count} record(s). Scores, feedback and transcripts will be shown once the attempt-history API contract is available.`
                        }
                    />
                )}
            </SectionCard>
        </PageContainer>
    )
}
