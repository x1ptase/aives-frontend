import { useCallback, useEffect, useState } from 'react'
import { studentExamApi } from '@/services/api'
import SectionCard from '@/components/common/SectionCard'
import PageContainer from '@/components/common/PageContainer'
import LoadingState from '@/components/common/LoadingState'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'

type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'loaded'; count: number }

// The student exam contract (fields, statuses, start/join actions) is not documented, so this page
// reports the real outcome of studentExamApi.getAll without interpreting unknown fields or offering actions.
export default function MyExams() {
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
                message: err?.response?.data?.message || err?.message || 'Could not load your exams.',
            })
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return (
        <PageContainer title="My Exams" subtitle="Exams assigned to you.">
            <SectionCard title="Assigned Exams">
                {state.status === 'loading' && <LoadingState />}
                {state.status === 'error' && (
                    <ErrorState title="Exams are unavailable" message={state.message} onRetry={load} />
                )}
                {state.status === 'loaded' && (
                    <EmptyState
                        message={
                            state.count === 0
                                ? 'You have no exams assigned yet.'
                                : `The server returned ${state.count} exam record(s). Detailed display and actions are pending the student exam API contract.`
                        }
                    />
                )}
            </SectionCard>
        </PageContainer>
    )
}
