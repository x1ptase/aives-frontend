import { useState, useEffect, useMemo } from 'react'
import { examSessionApi, studentExamApi, subjectApi, userApi } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'

export default function LecturerDashboard() {
    const { user } = useAuthStore()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const [examSessions, setExamSessions] = useState<any[]>([])
    const [studentExams, setStudentExams] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionsRes, studentExamsRes, subjectsRes, usersRes] = await Promise.all([
                    examSessionApi.getAll().catch(() => ({ data: [] })),
                    studentExamApi.getAll().catch(() => ({ data: [] })),
                    subjectApi.getAll().catch(() => ({ data: [] })),
                    userApi.getAll().catch(() => ({ data: { result: [] } }))
                ])

                setExamSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : [])
                setStudentExams(Array.isArray(studentExamsRes.data) ? studentExamsRes.data : [])
                setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : [])
                setUsers(Array.isArray(usersRes.data?.result) ? usersRes.data.result : (Array.isArray(usersRes.data) ? usersRes.data : []))
            } catch (err) {
                console.error("Failed to load dashboard data", err)
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        if (user?.id) {
            fetchData()
        }
    }, [user?.id])

    // Filter data for the current lecturer
    const myExams = useMemo(() => {
        if (!user?.id) return []
        return examSessions.filter(e => e.lecturer_id === user.id)
    }, [examSessions, user])

    const myExamIds = useMemo(() => new Set(myExams.map(e => e.id)), [myExams])

    const myStudentExams = useMemo(() => {
        return studentExams.filter(se => myExamIds.has(se.session_id))
    }, [studentExams, myExamIds])

    // Calculate Stats
    const totalMyExams = myExams.length
    const activeExams = myExams.filter(e => e.status === 'ONGOING').length
    const completedExams = myExams.filter(e => e.status === 'COMPLETED').length
    const upcomingExams = myExams.filter(e => e.status === 'UPCOMING').length
    const totalStudentAttempts = myStudentExams.length

    // Mapped Recent Exams (sorted by created_at DESC)
    const recentExams = useMemo(() => {
        return [...myExams]
            .sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
                return dateB - dateA
            })
            .slice(0, 5)
            .map(exam => {
                const subject = subjects.find(s => s.id === exam.subject_id)
                return {
                    id: exam.id,
                    title: exam.title || 'Untitled Exam',
                    subjectCode: subject?.code || 'N/A',
                    subjectName: subject?.name || 'Unknown Subject',
                    status: exam.status,
                    startAt: exam.start_at || exam.start_time || null,
                    endAt: exam.end_at || exam.end_time || null,
                }
            })
    }, [myExams, subjects])

    // Mapped Recent Student Results
    const recentResults = useMemo(() => {
        return [...myStudentExams]
            .sort((a, b) => {
                // Sort by completed_at DESC, then started_at, then created_at
                const getSortTime = (se: any) => {
                    if (se.completed_at) return new Date(se.completed_at).getTime()
                    if (se.started_at) return new Date(se.started_at).getTime()
                    if (se.created_at) return new Date(se.created_at).getTime()
                    return 0
                }
                return getSortTime(b) - getSortTime(a)
            })
            .slice(0, 5)
            .map(se => {
                const studentUser = users.find(u => u.id === se.student_id)
                const exam = myExams.find(e => e.id === se.session_id)
                return {
                    id: se.id,
                    studentName: studentUser?.full_name || studentUser?.name || studentUser?.username || 'Unknown Student',
                    examTitle: exam?.title || 'Unknown Exam',
                    aiScore: se.ai_suggested_score !== undefined ? se.ai_suggested_score : null,
                    finalScore: se.final_score !== undefined ? se.final_score : null,
                    status: se.status || 'UNKNOWN'
                }
            })
    }, [myStudentExams, users, myExams])

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
                <div className="animate-pulse space-y-6">
                    <div className="grid grid-cols-4 gap-5">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
                    </div>
                    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
                        <div className="h-80 bg-slate-200 rounded-xl"></div>
                        <div className="h-80 bg-slate-200 rounded-xl"></div>
                    </div>
                    <div className="h-80 bg-slate-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9] flex items-center justify-center">
                <div className="text-red-500 font-medium">Failed to load dashboard data.</div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
            {/* 1. Overview */}
            <div className="grid grid-cols-4 gap-5 mb-7">
                {[
                    {
                        label: 'My Exams', value: totalMyExams, sub: 'Created by you', accent: '#eff6ff', textColor: 'text-blue-600', icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        )
                    },
                    {
                        label: 'Active Exams', value: activeExams, sub: 'Currently ongoing', accent: '#f0fdf4', textColor: 'text-emerald-600', icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        )
                    },
                    {
                        label: 'Completed Exams', value: completedExams, sub: 'Completed exams', accent: '#faf5ff', textColor: 'text-purple-600', icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        )
                    },
                    {
                        label: 'Student Attempts', value: totalStudentAttempts, sub: 'Across your exams', accent: '#fff7ed', textColor: 'text-orange-600', icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        )
                    },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.accent }}>
                                <span className={c.textColor}>{c.icon}</span>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{c.value}</div>
                        <div className="text-xs text-slate-500 font-medium mb-2">{c.label}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{c.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 mb-7" style={{ gridTemplateColumns: '1fr 320px' }}>
                {/* 2. Recent Exams */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Recent Exams</h2>
                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">View All</button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Exam</th>
                                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Schedule</th>
                                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {recentExams.length === 0 ? (
                                    <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-sm">No exams yet</td></tr>
                                ) : (
                                    recentExams.map((exam, i) => {
                                        const fmt = (iso: string | null) => {
                                            if (!iso) return null
                                            try {
                                                const d = new Date(iso)
                                                const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                                                return { date, time }
                                            } catch {
                                                return null
                                            }
                                        }
                                        const start = fmt(exam.startAt)
                                        const end = fmt(exam.endAt)
                                        const statusStyle = {
                                            UPCOMING: 'bg-amber-50 text-amber-700 border border-amber-200',
                                            ONGOING: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                                            COMPLETED: 'bg-blue-50 text-blue-700 border border-blue-200',
                                        }[exam.status as string] || 'bg-slate-100 text-slate-600 border-slate-200'

                                        return (
                                            <tr key={exam.id || i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3.5 font-semibold text-slate-800">{exam.title}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="text-xs font-bold text-slate-700">{exam.subjectCode}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">{exam.subjectName}</div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {start ? (
                                                        <>
                                                            <div className="text-xs text-slate-600">{start.date}</div>
                                                            <div className="text-[11px] text-slate-400 mt-0.5">{start.time} {end ? `– ${end.time}` : ''}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyle}`}>
                                                        {exam.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Exam Status */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                    <h2 className="font-semibold text-slate-800 text-sm mb-5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Exam Status
                    </h2>
                    <div className="flex-1 space-y-3">
                        {[
                            {
                                label: 'Upcoming',
                                status: 'UPCOMING',
                                count: upcomingExams,
                                total: totalMyExams || 1,
                                dotColor: 'bg-amber-400',
                                barColor: 'bg-amber-400',
                                badgeBg: '#fffbeb',
                                badgeText: '#92400e',
                                badgeBorder: '#fcd34d',
                            },
                            {
                                label: 'Ongoing',
                                status: 'ONGOING',
                                count: activeExams,
                                total: totalMyExams || 1,
                                dotColor: 'bg-emerald-500',
                                barColor: 'bg-emerald-500',
                                badgeBg: '#f0fdf4',
                                badgeText: '#065f46',
                                badgeBorder: '#6ee7b7',
                            },
                            {
                                label: 'Completed',
                                status: 'COMPLETED',
                                count: completedExams,
                                total: totalMyExams || 1,
                                dotColor: 'bg-blue-500',
                                barColor: 'bg-blue-500',
                                badgeBg: '#eff6ff',
                                badgeText: '#1e40af',
                                badgeBorder: '#93c5fd',
                            },
                        ].map(s => (
                            <div key={s.status} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                                {/* Status dot */}
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dotColor}`}></span>
                                {/* Label + bar */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-medium text-slate-700">{s.label}</span>
                                        <span
                                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                                            style={{ backgroundColor: s.badgeBg, color: s.badgeText, border: `1px solid ${s.badgeBorder}` }}
                                        >
                                            {s.count}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1">
                                        <div
                                            className={`h-1 rounded-full ${s.barColor} transition-all duration-500`}
                                            style={{ width: `${(s.count / s.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Total */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Total Exams</span>
                        <span className="text-sm font-bold text-slate-800">{totalMyExams}</span>
                    </div>
                </div>
            </div>

            {/* 4. Recent Student Results */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Recent Student Results</h2>
                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">View All Results</button>
                </div>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Exam</th>
                                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">AI Score</th>
                                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Final Score</th>
                                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {recentResults.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500 text-sm">No student results yet</td></tr>
                            ) : (
                                recentResults.map((res, i) => {
                                    const scoreColor = (v: number | null) =>
                                        v === null ? '' : v >= 8 ? 'text-emerald-600' : v >= 5 ? 'text-blue-600' : 'text-red-600'
                                    const statusStyle = {
                                        ASSIGNED: 'bg-slate-100 text-slate-600 border border-slate-200',
                                        IN_PROGRESS: 'bg-amber-50 text-amber-700 border border-amber-200',
                                        COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                                    }[res.status as string] || 'bg-slate-100 text-slate-600 border-slate-200'

                                    return (
                                        <tr key={res.id || i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3.5 font-semibold text-slate-800">{res.studentName}</td>
                                            <td className="px-5 py-3.5 text-slate-500">{res.examTitle}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`font-semibold ${scoreColor(res.aiScore)}`}>
                                                    {res.aiScore !== null ? Number(res.aiScore).toFixed(1) : '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`font-semibold ${scoreColor(res.finalScore)}`}>
                                                    {res.finalScore !== null ? Number(res.finalScore).toFixed(1) : 'Not graded'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyle}`}>
                                                    {res.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
