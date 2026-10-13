import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import DashboardLayout from '@/layouts/DashboardLayout'
import StudentDashboard from './StudentDashboard'
import MyExams from './MyExams'
import ExamHistory from './ExamHistory'
import Profile from './Profile'

export default function StudentApp() {
    const user = useAuthStore(s => s.user)

    // Same convention as AiConfigPage: non-matching roles are sent to sign-in. The backend remains the source of truth.
    if (user?.role?.toString().toLowerCase() !== 'student') {
        return <Navigate to="/signin" replace />
    }

    return (
        <DashboardLayout role="student">
            <Routes>
                <Route path="/" element={<StudentDashboard />} />
                <Route path="/exams" element={<MyExams />} />
                <Route path="/history" element={<ExamHistory />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<StudentDashboard />} />
            </Routes>
        </DashboardLayout>
    )
}
