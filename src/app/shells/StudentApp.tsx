import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { StudentDashboard } from '@/modules/dashboard'
import { StudentMyExams as MyExams, ExamHistory, OralExamPreview, OralExamPage } from '@/modules/exams'
import { Profile } from '@/modules/users'

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
                <Route path="/exams/oral-preview" element={<OralExamPreview />} />
                <Route path="/exams/:studentExamId/oral" element={<OralExamPage />} />
                <Route path="/history" element={<ExamHistory />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<StudentDashboard />} />
            </Routes>
        </DashboardLayout>
    )
}
