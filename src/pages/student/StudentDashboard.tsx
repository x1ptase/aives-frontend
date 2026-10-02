export default function StudentDashboard() {
    const mockUpcoming = [
        {
            title: 'Final Term CSI106',
            subjectCode: 'CSI106',
            subjectName: 'Computer Science Fundamentals',
            startAt: '2026-10-10T08:00:00',
            endAt: '2026-10-10T09:30:00',
        },
        {
            title: 'Midterm SWE201',
            subjectCode: 'SWE201',
            subjectName: 'Software Engineering Principles',
            startAt: '2026-10-15T14:00:00',
            endAt: '2026-10-15T15:30:00',
        }
    ]

    const mockRecent = [
        {
            title: 'Quiz 3 – Data Structures',
            subjectCode: 'CS201',
            subjectName: 'Data Structures & Algorithms',
            status: 'COMPLETED' as const,
            score: 8.5,
        },
        {
            title: 'Practice Viva – Algorithms',
            subjectCode: 'CS201',
            subjectName: 'Data Structures & Algorithms',
            status: 'COMPLETED' as const,
            score: 9.0,
        },
        {
            title: 'Midterm SE302',
            subjectCode: 'SE302',
            subjectName: 'Software Engineering',
            status: 'IN_PROGRESS' as const,
            score: null,
        }
    ]

    const formatDateTime = (iso: string) => {
        const d = new Date(iso)
        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        return { date, time }
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
            {/* 1. Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                {[
                    { label: 'Upcoming Exams', value: '2', accent: '#eff6ff', textColor: 'text-blue-600', icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    )},
                    { label: 'In Progress', value: '1', accent: '#fffbeb', textColor: 'text-amber-600', icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    )},
                    { label: 'Completed Exams', value: '12', accent: '#f0fdf4', textColor: 'text-emerald-600', icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    )},
                    { label: 'Average Score', value: '8.2', accent: '#faf5ff', textColor: 'text-purple-600', icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    )},
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.accent }}>
                            <span className={c.textColor}>{c.icon}</span>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{c.value}</div>
                            <div className="text-xs text-slate-500 font-medium">{c.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2. Upcoming Exams Section */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>Upcoming Exams</h2>
                    
                    {mockUpcoming.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 flex flex-col items-center justify-center text-slate-500">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mb-3 text-slate-300"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            <p>No upcoming exams</p>
                        </div>
                    ) : (
                        mockUpcoming.map((exam, i) => {
                            const start = formatDateTime(exam.startAt)
                            const end = formatDateTime(exam.endAt)
                            return (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-200 hover:shadow-md">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base" style={{ fontFamily: 'DM Sans, sans-serif' }}>{exam.title}</h3>
                                            <div className="text-sm font-medium text-indigo-600 mt-0.5">{exam.subjectCode} <span className="text-slate-400 font-normal ml-1">{exam.subjectName}</span></div>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                                <span>{start.date}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span>{start.time} – {end.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="sm:w-auto w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                                        View Exam
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* 3. Recent Exams Section */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>Recent Exams</h2>
                        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">View All</button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        {mockRecent.length === 0 ? (
                            <div className="p-10 flex flex-col items-center justify-center text-slate-500 text-sm">
                                <p>No exam activity yet</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Exam</th>
                                            <th className="px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Score</th>
                                            <th className="px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-sm">
                                        {mockRecent.map((exam, i) => {
                                            const statusStyle = {
                                                UPCOMING:  'bg-slate-100 text-slate-600 border border-slate-200',
                                                IN_PROGRESS: 'bg-amber-50 text-amber-700 border border-amber-200',
                                                COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                                            }[exam.status]
                                            
                                            const actionText = {
                                                UPCOMING: 'View',
                                                IN_PROGRESS: 'Continue',
                                                COMPLETED: 'Result',
                                            }[exam.status]

                                            return (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-semibold text-slate-800 text-[13px] leading-tight">{exam.title}</div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">{exam.subjectCode}</div>
                                                        <div className="mt-1.5">
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${statusStyle}`}>
                                                                {exam.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right align-top">
                                                        <span className={`font-bold text-base ${exam.score !== null ? (exam.score >= 8 ? 'text-emerald-600' : exam.score >= 5 ? 'text-blue-600' : 'text-red-600') : 'text-slate-400'}`}>
                                                            {exam.score !== null ? exam.score.toFixed(1) : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right align-top">
                                                        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                                                            {actionText}
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
