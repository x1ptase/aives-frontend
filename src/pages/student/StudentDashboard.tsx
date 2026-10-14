import { useCallback, useEffect, useState } from 'react'
import { BackendUserResponse, studentExamApi, userApi } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import SectionCard from '@/components/common/SectionCard'
import StatCard from '@/components/common/StatCard'
import PageContainer from '@/components/common/PageContainer'
import LoadingState from '@/components/common/LoadingState'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'

type Load<T> =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'loaded'; data: T }

const errMsg = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback

// Only two student-facing data sources are wired:
//  - GET /users/myInfo (real, typed as BackendUserResponse)
//  - studentExamApi.getAll (backend contract not available yet; surfaces its real outcome)
// Scores, upcoming exams and other metrics are intentionally omitted until their API contracts exist.
export default function StudentDashboard() {
    const authUser = useAuthStore(s => s.user)
    const [profile, setProfile] = useState<Load<BackendUserResponse>>({ status: 'loading' })
    const [exams, setExams] = useState<Load<number>>({ status: 'loading' })

    const loadProfile = useCallback(async () => {
        setProfile({ status: 'loading' })
        try {
            const res = await userApi.getMyInfo()
            setProfile({ status: 'loaded', data: res.data.result })
        } catch (err) {
            setProfile({ status: 'error', message: errMsg(err, 'Could not load your profile.') })
        }
    }, [])

    const loadExams = useCallback(async () => {
        setExams({ status: 'loading' })
        try {
            const res = await studentExamApi.getAll()
            const d = res.data
            const list = Array.isArray(d) ? d : Array.isArray(d?.result) ? d.result : []
            setExams({ status: 'loaded', data: list.length })
        } catch (err) {
            setExams({ status: 'error', message: errMsg(err, 'Could not load your exams.') })
        }
    }, [])

    useEffect(() => {
        loadProfile()
        loadExams()
    }, [loadProfile, loadExams])

    const name = profile.status === 'loaded' ? profile.data.fullName || profile.data.username : authUser?.name

    return (
        <PageContainer title={`Welcome${name ? `, ${name}` : ''}`} subtitle="Your account and exam overview.">

            {exams.status === 'loaded' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                    <StatCard label="Exams returned by server" value={String(exams.data)} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard title="My Account">
                    {profile.status === 'loading' && <LoadingState />}
                    {profile.status === 'error' && (
                        <ErrorState title="Profile unavailable" message={profile.message} onRetry={loadProfile} />
                    )}
                    {profile.status === 'loaded' && (
                        <dl className="grid grid-cols-3 gap-y-3 text-sm">
                            <dt className="text-slate-400">Full name</dt>
                            <dd className="col-span-2 text-slate-800 font-medium">{profile.data.fullName || '—'}</dd>
                            <dt className="text-slate-400">Username</dt>
                            <dd className="col-span-2 text-slate-800">{profile.data.username}</dd>
                            <dt className="text-slate-400">Email</dt>
                            <dd className="col-span-2 text-slate-800 break-all">{profile.data.email}</dd>
                            <dt className="text-slate-400">Role</dt>
                            <dd className="col-span-2 text-slate-800">{profile.data.role}</dd>
                            <dt className="text-slate-400">Member since</dt>
                            <dd className="col-span-2 text-slate-800">
                                {profile.data.createdAt ? new Date(profile.data.createdAt).toLocaleDateString() : '—'}
                            </dd>
                        </dl>
                    )}
                </SectionCard>

                <SectionCard title="My Exams">
                    {exams.status === 'loading' && <LoadingState />}
                    {exams.status === 'error' && (
                        <ErrorState title="Exams are unavailable" message={exams.message} onRetry={loadExams} />
                    )}
                    {exams.status === 'loaded' && (
                        <EmptyState message={exams.data === 0 ? 'You have no exams yet.' : `The server returned ${exams.data} exam record(s). Detailed display is pending the student exam API contract.`} />
                    )}
                </SectionCard>
            </div>
        </PageContainer>
    )
}
