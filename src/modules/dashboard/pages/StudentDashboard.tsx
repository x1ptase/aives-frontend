import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/shared/i18n'
import { formatDate, normalizeName } from '@/shared/i18n/format'
import { BackendUserResponse } from '@/shared/types'
import { studentExamApi, examPage } from '@/modules/exams'
import { userApi } from '@/modules/users'
import { useAuthStore } from '@/modules/auth'
import SectionCard from '@/shared/components/common/SectionCard'
import StatCard from '@/shared/components/common/StatCard'
import PageContainer from '@/shared/components/common/PageContainer'
import LoadingState from '@/shared/components/common/LoadingState'
import EmptyState from '@/shared/components/common/EmptyState'
import ErrorState from '@/shared/components/common/ErrorState'

type Load<T> =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'loaded'; data: T }

const errMsg = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback

// Only two student-facing data sources are wired:
//  - GET /users/myInfo (real, typed as BackendUserResponse)
//  - GET /student-exams/me (lịch riêng từ JWT, có phân trang)
// Điểm và dữ liệu chấm vẫn chưa có trong hợp đồng lịch thi.
export default function StudentDashboard() {
    const { t } = useTranslation()
    const authUser = useAuthStore(s => s.user)
    const [profile, setProfile] = useState<Load<BackendUserResponse>>({ status: 'loading' })
    const [exams, setExams] = useState<Load<number>>({ status: 'loading' })

    const loadProfile = useCallback(async () => {
        setProfile({ status: 'loading' })
        try {
            const res = await userApi.getMyInfo()
            setProfile({ status: 'loaded', data: res.data.result })
        } catch (err) {
            setProfile({ status: 'error', message: errMsg(err, i18n.t('dashboard.student.loadProfileFailed')) })
        }
    }, [])

    const loadExams = useCallback(async () => {
        setExams({ status: 'loading' })
        try {
            const res = await studentExamApi.getAll({ size: 1 })
            setExams({ status: 'loaded', data: examPage(res.data).totalElements })
        } catch (err) {
            setExams({ status: 'error', message: errMsg(err, i18n.t('dashboard.student.loadExamsFailed')) })
        }
    }, [])

    useEffect(() => {
        loadProfile()
        loadExams()
    }, [loadProfile, loadExams])

    const name = profile.status === 'loaded' ? normalizeName(profile.data.fullName || profile.data.username) : normalizeName(authUser?.name)

    return (
        <PageContainer title={name ? t('dashboard.welcomeName', { name }) : t('dashboard.welcome')} subtitle={t('dashboard.student.subtitle')}>

            {exams.status === 'loaded' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                    <StatCard label={t('dashboard.student.examsReturned')} value={String(exams.data)} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard title={t('dashboard.student.myAccount')}>
                    {profile.status === 'loading' && <LoadingState />}
                    {profile.status === 'error' && (
                        <ErrorState title={t('dashboard.student.profileUnavailable')} message={profile.message} onRetry={loadProfile} />
                    )}
                    {profile.status === 'loaded' && (
                        <dl className="grid grid-cols-3 gap-y-3 text-sm">
                            <dt className="text-slate-400">{t('dashboard.student.fullName')}</dt>
                            <dd className="col-span-2 text-slate-800 font-medium">{profile.data.fullName || '—'}</dd>
                            <dt className="text-slate-400">{t('dashboard.student.username')}</dt>
                            <dd className="col-span-2 text-slate-800">{profile.data.username}</dd>
                            <dt className="text-slate-400">{t('dashboard.student.email')}</dt>
                            <dd className="col-span-2 text-slate-800 break-all">{profile.data.email}</dd>
                            <dt className="text-slate-400">{t('dashboard.student.role')}</dt>
                            <dd className="col-span-2 text-slate-800">{t(`common.roles.${String(profile.data.role).toLowerCase()}`, { defaultValue: profile.data.role })}</dd>
                            <dt className="text-slate-400">{t('dashboard.student.memberSince')}</dt>
                            <dd className="col-span-2 text-slate-800">
                                {profile.data.createdAt ? formatDate(profile.data.createdAt) : '—'}
                            </dd>
                        </dl>
                    )}
                </SectionCard>

                <SectionCard title={t('dashboard.student.myExams')}>
                    {exams.status === 'loading' && <LoadingState />}
                    {exams.status === 'error' && (
                        <ErrorState title={t('dashboard.student.examsUnavailable')} message={exams.message} onRetry={loadExams} />
                    )}
                    {exams.status === 'loaded' && (
                        <EmptyState message={exams.data === 0 ? t('dashboard.student.noExams') : t('dashboard.student.examCount', { count: exams.data })} />
                    )}
                </SectionCard>
            </div>
        </PageContainer>
    )
}
