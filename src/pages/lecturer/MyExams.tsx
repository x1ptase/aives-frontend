import { useState, useEffect, useMemo } from 'react'
import { examSessionApi, subjectApi, userApi, studentExamApi } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'

export default function MyExams() {
    const { user } = useAuthStore()
    const [exams, setExams] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [students, setStudents] = useState<any[]>([])
    const [studentExams, setStudentExams] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    // Form Modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingExam, setEditingExam] = useState<any>(null)
    const [formLoading, setFormLoading] = useState(false)
    const [formError, setFormError] = useState('')
    
    // Assign Modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [assigningExam, setAssigningExam] = useState<any>(null)
    const [searchStudent, setSearchStudent] = useState('')
    const [selectedStudents, setSelectedStudents] = useState<Set<number | string>>(new Set())
    const [assignLoading, setAssignLoading] = useState(false)
    const [assignError, setAssignError] = useState('')

    const [formData, setFormData] = useState({
        title: '',
        subject_id: '',
        status: 'UPCOMING',
        max_main_questions: 10,
        max_follow_ups: 3
    })

    const fetchExams = async () => {
        try {
            setLoading(true)
            setError(false)
            const [examsRes, subjectsRes, usersRes, studentExamsRes] = await Promise.all([
                examSessionApi.getAll().catch(() => ({ data: [] })),
                subjectApi.getAll().catch(() => ({ data: [] })),
                userApi.getAll().catch(() => ({ data: [] })),
                studentExamApi.getAll().catch(() => ({ data: [] }))
            ])
            setExams(Array.isArray(examsRes.data) ? examsRes.data : (examsRes.data?.result || []))
            setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : (subjectsRes.data?.result || []))
            
            const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.result || [])
            setStudents(users.filter((u: any) => u.role === 'STUDENT' || u.roleCode === 'STUDENT'))
            
            setStudentExams(Array.isArray(studentExamsRes.data) ? studentExamsRes.data : (studentExamsRes.data?.result || []))
        } catch (err) {
            console.error('Failed to load exams', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user?.id) {
            fetchExams()
        }
    }, [user?.id])

    const myExams = useMemo(() => {
        if (!user?.id) return []
        return exams.filter(e => e.lecturer_id === user.id).sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
            return dateB - dateA
        })
    }, [exams, user])

    // -- CRUD Exam --
    const openCreate = () => {
        setEditingExam(null)
        setFormData({
            title: '',
            subject_id: subjects.length > 0 ? subjects[0].id : '',
            status: 'UPCOMING',
            max_main_questions: 10,
            max_follow_ups: 3
        })
        setFormError('')
        setIsModalOpen(true)
    }

    const openEdit = (exam: any) => {
        setEditingExam(exam)
        setFormData({
            title: exam.title || '',
            subject_id: exam.subject_id || (subjects.length > 0 ? subjects[0].id : ''),
            status: exam.status || 'UPCOMING',
            max_main_questions: exam.max_main_questions !== undefined ? exam.max_main_questions : 10,
            max_follow_ups: exam.max_follow_ups !== undefined ? exam.max_follow_ups : 3
        })
        setFormError('')
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string | number) => {
        if (!window.confirm('Are you sure you want to delete this exam?')) return
        try {
            setLoading(true)
            await examSessionApi.delete(id)
            await fetchExams()
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete exam.'
            alert(`Error deleting exam: ${msg}`)
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError('')
        
        if (!formData.title.trim()) return setFormError('Exam title is required')
        if (!formData.subject_id) return setFormError('Subject is required')
        if (formData.max_main_questions <= 0) return setFormError('Max main questions must be a positive integer')
        if (formData.max_follow_ups < 0) return setFormError('Max follow-ups must be a non-negative integer')

        try {
            setFormLoading(true)
            if (editingExam) {
                await examSessionApi.update(editingExam.id, formData)
            } else {
                await examSessionApi.create(formData)
            }
            setIsModalOpen(false)
            await fetchExams()
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to save exam.'
            setFormError(msg)
        } finally {
            setFormLoading(false)
        }
    }

    const formatDate = (iso: string) => {
        if (!iso) return '—'
        try {
            return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        } catch {
            return iso
        }
    }

    // -- Assign Students --
    const openAssign = (exam: any) => {
        setAssigningExam(exam)
        setSearchStudent('')
        setAssignError('')
        
        // Find existing assignments
        const assignedIds = studentExams
            .filter(se => se.session_id === exam.id)
            .map(se => se.student_id)
        
        setSelectedStudents(new Set(assignedIds))
        setIsAssignModalOpen(true)
    }

    const filteredStudents = useMemo(() => {
        if (!searchStudent.trim()) return students
        const q = searchStudent.toLowerCase()
        return students.filter(s => 
            (s.username && s.username.toLowerCase().includes(q)) ||
            (s.fullName && s.fullName.toLowerCase().includes(q)) ||
            (s.email && s.email.toLowerCase().includes(q))
        )
    }, [students, searchStudent])

    const handleAssignSubmit = async () => {
        if (!assigningExam) return
        setAssignError('')
        setAssignLoading(true)
        
        try {
            const currentlyAssignedIds = new Set(
                studentExams
                    .filter(se => se.session_id === assigningExam.id)
                    .map(se => se.student_id)
            )

            const promises = []

            // Find new students to assign
            for (const studentId of selectedStudents) {
                if (!currentlyAssignedIds.has(studentId)) {
                    promises.push(studentExamApi.assign({
                        session_id: assigningExam.id,
                        student_id: studentId
                    }))
                }
            }

            // Find students to unassign
            for (const assignedId of currentlyAssignedIds) {
                if (!selectedStudents.has(assignedId)) {
                    // we need to find the student_exam id
                    const se = studentExams.find(x => x.session_id === assigningExam.id && x.student_id === assignedId)
                    if (se) {
                        promises.push(studentExamApi.unassign(se.id))
                    }
                }
            }

            await Promise.all(promises)
            
            setIsAssignModalOpen(false)
            await fetchExams() // Refresh data
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to update student assignments.'
            setAssignError(msg)
        } finally {
            setAssignLoading(false)
        }
    }

    const toggleStudent = (id: string | number) => {
        const next = new Set(selectedStudents)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedStudents(next)
    }

    const toggleAll = () => {
        if (selectedStudents.size === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedStudents(new Set())
        } else {
            setSelectedStudents(new Set(filteredStudents.map(s => s.id)))
        }
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>My Exams</h1>
                        <p className="text-xs text-slate-500 mt-1">Manage your exam sessions</p>
                    </div>
                    <button 
                        onClick={openCreate}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        + New Exam
                    </button>
                </div>
                
                <div className="flex-1 overflow-x-auto">
                    {loading && myExams.length === 0 ? (
                        <div className="p-8 space-y-4">
                            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg"></div>)}
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 font-medium">Failed to load exams.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Title</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Config</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created At</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {myExams.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No exams found.
                                        </td>
                                    </tr>
                                ) : (
                                    myExams.map(exam => {
                                        const subject = subjects.find(s => s.id === exam.subject_id)
                                        const statusStyle = {
                                            UPCOMING: 'bg-amber-50 text-amber-700 border-amber-200',
                                            ONGOING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
                                        }[exam.status as string] || 'bg-slate-50 text-slate-600 border-slate-200'

                                        const assignedCount = studentExams.filter(se => se.session_id === exam.id).length

                                        return (
                                            <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 font-semibold text-slate-800">
                                                    {exam.title}
                                                    <div className="text-xs font-normal text-slate-500 mt-1">
                                                        Assigned Students: <span className="font-semibold text-slate-700">{assignedCount}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-700">{subject?.code || 'N/A'}</div>
                                                    <div className="text-xs text-slate-500">{subject?.name || 'Unknown'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${statusStyle}`}>
                                                        {exam.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-slate-600">Main: {exam.max_main_questions}</div>
                                                    <div className="text-xs text-slate-600 mt-0.5">Follow-ups: {exam.max_follow_ups}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    {formatDate(exam.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => openAssign(exam)}
                                                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                                                        >
                                                            Manage Students
                                                        </button>
                                                        <button 
                                                            onClick={() => openEdit(exam)}
                                                            className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(exam.id)}
                                                            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Exam Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                {editingExam ? 'Edit Exam' : 'New Exam'}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            {formError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam Title</label>
                                    <input 
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                        placeholder="Enter exam title"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
                                    <select
                                        value={formData.subject_id}
                                        onChange={e => setFormData({...formData, subject_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                        required
                                    >
                                        <option value="" disabled>Select a subject</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                        required
                                    >
                                        <option value="UPCOMING">UPCOMING</option>
                                        <option value="ONGOING">ONGOING</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Max Main Questions</label>
                                        <input 
                                            type="number"
                                            min="1"
                                            value={formData.max_main_questions}
                                            onChange={e => setFormData({...formData, max_main_questions: parseInt(e.target.value) || 0})}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Max Follow-ups</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={formData.max_follow_ups}
                                            onChange={e => setFormData({...formData, max_follow_ups: parseInt(e.target.value) || 0})}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                    disabled={formLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {formLoading && (
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {editingExam ? 'Save Changes' : 'Create Exam'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Students Modal */}
            {isAssignModalOpen && assigningExam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-lg text-slate-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                    Assign Students
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    {assigningExam.title} 
                                    {(() => {
                                        const sub = subjects.find(s => s.id === assigningExam.subject_id)
                                        return sub ? ` (${sub.code})` : ''
                                    })()}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsAssignModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-hidden flex flex-col">
                            {assignError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">
                                    {assignError}
                                </div>
                            )}

                            <div className="mb-4">
                                <input 
                                    type="text"
                                    value={searchStudent}
                                    onChange={e => setSearchStudent(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    placeholder="Search by name, username, or email..."
                                />
                            </div>

                            <div className="flex items-center justify-between mb-3 px-1">
                                <span className="text-sm font-semibold text-slate-700">
                                    Selected: {selectedStudents.size}
                                </span>
                                <button 
                                    type="button"
                                    onClick={toggleAll}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                >
                                    {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? 'Unselect All' : 'Select All'}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2">
                                {filteredStudents.length === 0 ? (
                                    <div className="text-center text-sm text-slate-500 py-8">
                                        No students found.
                                    </div>
                                ) : (
                                    <ul className="space-y-1">
                                        {filteredStudents.map(student => (
                                            <li key={student.id}>
                                                <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg hover:border-blue-200 cursor-pointer transition-colors group">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedStudents.has(student.id)}
                                                        onChange={() => toggleStudent(student.id)}
                                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-slate-800 truncate">
                                                            {student.fullName || student.name || 'Unnamed Student'}
                                                        </div>
                                                        <div className="text-xs text-slate-500 truncate">
                                                            @{student.username} {student.email ? `· ${student.email}` : ''}
                                                        </div>
                                                    </div>
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setIsAssignModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                                disabled={assignLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAssignSubmit}
                                disabled={assignLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {assignLoading && (
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                Assign Students
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
