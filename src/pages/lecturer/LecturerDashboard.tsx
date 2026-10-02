export default function LecturerDashboard() {
    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
            {/* 1. Overview */}
            <div className="grid grid-cols-4 gap-5 mb-7">
                {[
                    { label: 'My Exams', value: '12', sub: 'Created by you', accent: '#eff6ff', textColor: 'text-blue-600', icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    )},
                    { label: 'Active Exams', value: '3', sub: 'Currently ongoing', accent: '#f0fdf4', textColor: 'text-emerald-600', icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    )},
                    { label: 'Completed Exams', value: '9', sub: 'Completed exams', accent: '#faf5ff', textColor: 'text-purple-600', icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    )},
                    { label: 'Student Attempts', value: '142', sub: 'Across your exams', accent: '#fff7ed', textColor: 'text-orange-600', icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    )},
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
                                {([
                                    {
                                        title: 'Final Term CSI106',
                                        subjectCode: 'CSI106',
                                        subjectName: 'Computer Science Fundamentals',
                                        startAt: '2026-10-10T08:00:00',
                                        endAt: '2026-10-10T09:30:00',
                                        status: 'UPCOMING',
                                    },
                                    {
                                        title: 'Midterm SE302',
                                        subjectCode: 'SE302',
                                        subjectName: 'Software Engineering',
                                        startAt: '2026-10-02T13:00:00',
                                        endAt: '2026-10-02T14:30:00',
                                        status: 'ONGOING',
                                    },
                                    {
                                        title: 'Final SE123',
                                        subjectCode: 'SE123',
                                        subjectName: 'Database Systems',
                                        startAt: '2026-09-28T08:00:00',
                                        endAt: '2026-09-28T09:30:00',
                                        status: 'COMPLETED',
                                    },
                                    {
                                        title: 'Quiz 3 – Data Structures',
                                        subjectCode: 'CS201',
                                        subjectName: 'Data Structures & Algorithms',
                                        startAt: '2026-09-18T10:00:00',
                                        endAt: '2026-09-18T10:45:00',
                                        status: 'COMPLETED',
                                    },
                                    {
                                        title: 'Practice Viva – Algorithms',
                                        subjectCode: 'CS201',
                                        subjectName: 'Data Structures & Algorithms',
                                        startAt: '2026-09-10T14:00:00',
                                        endAt: '2026-09-10T15:00:00',
                                        status: 'COMPLETED',
                                    },
                                ] as {
                                    title: string
                                    subjectCode: string
                                    subjectName: string
                                    startAt: string
                                    endAt: string
                                    status: 'UPCOMING' | 'ONGOING' | 'COMPLETED'
                                }[]).map((exam, i) => {
                                    const fmt = (iso: string) => {
                                        const d = new Date(iso)
                                        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                                        return { date, time }
                                    }
                                    const start = fmt(exam.startAt)
                                    const end = fmt(exam.endAt)
                                    const statusStyle = {
                                        UPCOMING:  'bg-amber-50 text-amber-700 border border-amber-200',
                                        ONGOING:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
                                        COMPLETED: 'bg-blue-50 text-blue-700 border border-blue-200',
                                    }[exam.status]
                                    return (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3.5 font-semibold text-slate-800">{exam.title}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="text-xs font-bold text-slate-700">{exam.subjectCode}</div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">{exam.subjectName}</div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="text-xs text-slate-600">{start.date}</div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">{start.time} – {end.time}</div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyle}`}>
                                                    {exam.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
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
                        {([
                            {
                                label: 'Upcoming',
                                status: 'UPCOMING',
                                count: 4,
                                total: 12,
                                dotColor: 'bg-amber-400',
                                barColor: 'bg-amber-400',
                                badgeBg: '#fffbeb',
                                badgeText: '#92400e',
                                badgeBorder: '#fcd34d',
                            },
                            {
                                label: 'Ongoing',
                                status: 'ONGOING',
                                count: 2,
                                total: 12,
                                dotColor: 'bg-emerald-500',
                                barColor: 'bg-emerald-500',
                                badgeBg: '#f0fdf4',
                                badgeText: '#065f46',
                                badgeBorder: '#6ee7b7',
                            },
                            {
                                label: 'Completed',
                                status: 'COMPLETED',
                                count: 6,
                                total: 12,
                                dotColor: 'bg-blue-500',
                                barColor: 'bg-blue-500',
                                badgeBg: '#eff6ff',
                                badgeText: '#1e40af',
                                badgeBorder: '#93c5fd',
                            },
                        ] as {
                            label: string; status: string; count: number; total: number;
                            dotColor: string; barColor: string;
                            badgeBg: string; badgeText: string; badgeBorder: string;
                        }[]).map(s => (
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
                        <span className="text-sm font-bold text-slate-800">12</span>
                    </div>
                    <button
                        className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', fontFamily: 'DM Sans, sans-serif' }}
                    >
                        Create New Exam
                    </button>
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
                            {([
                                { student: 'Nguyễn Văn An',   exam: 'Final Term CSI106',       aiScore: 8.2,  finalScore: 8.5,  status: 'COMPLETED' },
                                { student: 'Trần Minh Tuấn',  exam: 'Final Term CSI106',       aiScore: 7.4,  finalScore: 7.5,  status: 'COMPLETED' },
                                { student: 'Phạm Minh Khoa',  exam: 'Midterm SE302',           aiScore: 8.7,  finalScore: 9.0,  status: 'COMPLETED' },
                                { student: 'Đỗ Thị Lan',      exam: 'Midterm SE302',           aiScore: 6.5,  finalScore: null, status: 'COMPLETED' },
                                { student: 'Hoàng Văn Minh',  exam: 'Quiz 3 – Data Structures', aiScore: null, finalScore: null, status: 'IN_PROGRESS' },
                            ] as {
                                student: string
                                exam: string
                                aiScore: number | null
                                finalScore: number | null
                                status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'
                            }[]).map((res, i) => {
                                const scoreColor = (v: number | null) =>
                                    v === null ? '' : v >= 8 ? 'text-emerald-600' : v >= 5 ? 'text-blue-600' : 'text-red-600'
                                const statusStyle = {
                                    ASSIGNED:    'bg-slate-100 text-slate-600 border border-slate-200',
                                    IN_PROGRESS: 'bg-amber-50 text-amber-700 border border-amber-200',
                                    COMPLETED:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
                                }[res.status]
                                return (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3.5 font-semibold text-slate-800">{res.student}</td>
                                        <td className="px-5 py-3.5 text-slate-500">{res.exam}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`font-semibold ${scoreColor(res.aiScore)}`}>
                                                {res.aiScore !== null ? res.aiScore.toFixed(1) : '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`font-semibold ${scoreColor(res.finalScore)}`}>
                                                {res.finalScore !== null ? res.finalScore.toFixed(1) : '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyle}`}>
                                                {res.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
