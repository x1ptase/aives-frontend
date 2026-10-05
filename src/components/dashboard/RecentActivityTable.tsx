import { useState, useEffect } from 'react'
import { examSessionApi, studentExamApi, questionApi, learningMaterialApi } from '@/services/api'

type ActivityLog = { id: string | number, timestamp: string, timeValue: number, user: string, role: string, action: string, detail: string, status: string }

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status.toLowerCase() === 'success' || status.toLowerCase() === 'completed' || status.toLowerCase() === 'active'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
      isSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-700 border border-slate-100'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Success'}
    </span>
  )
}

function RolePill({ role }: { role: string }) {
  const r = (role || '').toLowerCase()
  if (r === 'admin') return <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded leading-none w-fit">ADMIN</span>
  if (r === 'lecturer') return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none w-fit">LECTURER</span>
  return <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none w-fit">STUDENT</span>
}

export default function RecentActivityTable() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [sessionsRes, studentExamsRes, questionsRes, materialsRes] = await Promise.all([
          examSessionApi.getAll().catch(() => ({ data: [] })),
          studentExamApi.getAll().catch(() => ({ data: [] })),
          questionApi.getAll().catch(() => ({ data: [] })),
          learningMaterialApi.getAll().catch(() => ({ data: [] }))
        ])

        const activities: ActivityLog[] = []
        let idCounter = 1

        // Format helper
        const formatDate = (dateString: string) => {
          if (!dateString) return 'Unknown'
          try {
            return new Date(dateString).toLocaleString()
          } catch {
            return dateString
          }
        }
        const getTime = (dateString: string) => dateString ? new Date(dateString).getTime() : 0

        // Created Exam (exam_sessions)
        const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : []
        sessions.forEach((s: any) => {
          activities.push({
            id: `session-${s.id || idCounter++}`,
            timestamp: formatDate(s.created_at || s.createdAt),
            timeValue: getTime(s.created_at || s.createdAt),
            user: s.creator_name || s.creator || 'Lecturer',
            role: 'Lecturer',
            action: 'Created Exam',
            detail: s.name || s.title || `Exam ID: ${s.id}`,
            status: 'success'
          })
        })

        // Completed Exam (student_exams)
        const studentExams = Array.isArray(studentExamsRes.data) ? studentExamsRes.data : []
        studentExams.forEach((se: any) => {
          activities.push({
            id: `se-${se.id || idCounter++}`,
            timestamp: formatDate(se.completed_at || se.completedAt || se.created_at || se.createdAt),
            timeValue: getTime(se.completed_at || se.completedAt || se.created_at || se.createdAt),
            user: se.student_name || se.student || 'Student',
            role: 'Student',
            action: 'Completed Exam',
            detail: `Score: ${se.score || 'N/A'}`,
            status: 'success'
          })
        })

        // Created Question (questions)
        const questions = Array.isArray(questionsRes.data) ? questionsRes.data : []
        questions.forEach((q: any) => {
          activities.push({
            id: `q-${q.id || idCounter++}`,
            timestamp: formatDate(q.created_at || q.createdAt),
            timeValue: getTime(q.created_at || q.createdAt),
            user: q.creator_name || q.creator || 'Lecturer',
            role: 'Lecturer',
            action: 'Created Question',
            detail: q.topic || q.content?.substring(0, 30) + '...' || `Question ID: ${q.id}`,
            status: 'success'
          })
        })

        // Uploaded Learning Material (learning_materials)
        const materials = Array.isArray(materialsRes.data) ? materialsRes.data : []
        materials.forEach((m: any) => {
          activities.push({
            id: `mat-${m.id || idCounter++}`,
            timestamp: formatDate(m.created_at || m.createdAt),
            timeValue: getTime(m.created_at || m.createdAt),
            user: m.uploader_name || m.uploader || 'Admin',
            role: 'Admin',
            action: 'Uploaded Learning Material',
            detail: m.name || m.title || m.filename || `Material ID: ${m.id}`,
            status: 'success'
          })
        })

        // Sort by time descending and take top 10
        activities.sort((a, b) => b.timeValue - a.timeValue)
        setLogs(activities.slice(0, 10))

      } catch (error) {
        console.error('Failed to fetch recent activity', error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-64 animate-pulse"></div>
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full p-8 items-center justify-center text-red-500">
        Failed to load recent activities.
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Recent Activities</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest important activities across AIVES</p>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100" style={{ backgroundColor: '#f8fafc' }}>
                {['Timestamp', 'User', 'Action', 'Detail', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500 text-sm">
                    No recent activities
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>{log.timestamp}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{log.user}</span>
                        <RolePill role={log.role} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-700 whitespace-nowrap">{log.action}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate min-w-0" title={log.detail}>{log.detail}</span>
                        {log.detail.length > 30 && (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap flex-shrink-0 transition-colors"
                          >
                            View details
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={log.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Activity Details</h2>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-2 text-sm">
                <div className="font-medium text-slate-500">User:</div>
                <div className="font-medium text-slate-900 flex flex-col items-start gap-1.5">
                  {selectedLog.user}
                  <RolePill role={selectedLog.role} />
                </div>

                <div className="font-medium text-slate-500">Action:</div>
                <div className="font-medium text-slate-900">{selectedLog.action}</div>

                <div className="font-medium text-slate-500">Timestamp:</div>
                <div className="text-slate-700">{selectedLog.timestamp}</div>

                <div className="font-medium text-slate-500">Status:</div>
                <div><StatusBadge status={selectedLog.status} /></div>
              </div>

              <div className="pt-2">
                <div className="font-medium text-slate-500 text-sm mb-2">Detail:</div>
                <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-100 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {selectedLog.detail}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
