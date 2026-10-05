import { useState, useEffect } from 'react'
import { userApi, examApi, studentExamApi } from '@/services/api'

export default function TopStatsCards() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, examsRes, studentExamsRes] = await Promise.all([
          userApi.getAll().catch(() => ({ data: { result: [] } })),
          examApi.getAll().catch(() => ({ data: [] })),
          studentExamApi.getAll().catch(() => ({ data: [] }))
        ])

        const users = usersRes.data?.result || []
        const exams = examsRes.data || []
        const studentExams = studentExamsRes.data || []

        const totalUsers = users.length
        
        let activeExams = 0
        let completedExams = 0
        
        if (Array.isArray(exams)) {
          activeExams = exams.filter(e => e.status === 'active' || e.status === 'in progress' || e.status === 'IN_PROGRESS').length
          completedExams = exams.filter(e => e.status === 'completed' || e.status === 'COMPLETED').length
        }
        
        const aiInterviews = Array.isArray(studentExams) ? studentExams.length : 0

        setStats({
          totalUsers: totalUsers.toString(),
          usersDetail: 'Registered accounts',
          activeExams: activeExams.toString(),
          activeExamsDetail: 'Currently running',
          completedExams: completedExams.toString(),
          completedExamsDetail: 'Successfully ended',
          aiInterviews: aiInterviews.toString(),
          aiInterviewsDetail: 'Total attempts',
        })
      } catch (error) {
        console.error('Failed to fetch admin stats', error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return <div className="animate-pulse flex gap-5 mb-7">
      {[1, 2, 3, 4].map(i => <div key={i} className="flex-1 h-[120px] bg-slate-200 rounded-xl"></div>)}
    </div>
  }

  if (error || !stats) {
    return <div className="mb-7 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">Failed to load statistics. Please try again later.</div>
  }

  return (
    <div className="grid grid-cols-4 gap-5 mb-7">
      {[
        {
          label: 'Total Users',
          value: stats.totalUsers,
          sub: stats.usersDetail,
          accent: '#eff6ff',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
        {
          label: 'Active Exams',
          value: stats.activeExams,
          sub: stats.activeExamsDetail,
          accent: '#f0fdf4',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-600">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          ),
        },
        {
          label: 'Completed Exams',
          value: stats.completedExams,
          sub: stats.completedExamsDetail,
          accent: '#faf5ff',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-purple-600">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          ),
        },
        {
          label: 'AI Viva Interviews',
          value: stats.aiInterviews,
          sub: stats.aiInterviewsDetail,
          accent: '#fff7ed',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-orange-600">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          ),
        },
      ].map(c => (
        <div key={c.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.accent }}>
              {c.icon}
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{c.value}</div>
          <div className="text-xs text-slate-500 font-medium mb-2">{c.label}</div>
          <div className="mt-1 text-[11px] text-slate-400">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
