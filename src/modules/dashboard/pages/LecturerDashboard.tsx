import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/shared/i18n'
import { normalizeName } from '@/shared/i18n/format'
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
    const { t } = useTranslation()
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
                message: err?.response?.data?.message || err?.message || i18n.t('dashboard.lecturer.loadExamsFailed'),
            })
        }
    }, [])

    useEffect(() => {
        loadExams()
    }, [loadExams])

    return (
        <PageContainer title={user?.name ? t('dashboard.welcomeName', { name: normalizeName(user.name) }) : t('dashboard.welcome')} subtitle={t('dashboard.lecturer.subtitle')}>
            <MySubjectsCard />

            <SectionCard title={t('dashboard.lecturer.examsGrading')}>
                {exams.status === 'loading' && <LoadingState />}
                {exams.status === 'error' && (
                    <ErrorState title={t('dashboard.lecturer.examsUnavailable')} message={exams.message} onRetry={loadExams} />
                )}
                {exams.status === 'loaded' && (
                    <EmptyState
                        message={exams.count === 0
                            ? t('dashboard.lecturer.noExams')
                            : t('dashboard.lecturer.examCount', { count: exams.count })}
                    />
                )}
            </SectionCard>
        </PageContainer>
    )
}
