import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { LecturerDashboard } from '@/modules/dashboard'
import { LecturerMyExams as MyExams } from '@/modules/exams'
import { QuestionBank, LecturerRubrics } from '@/modules/questions'
import { LearningMaterials } from '@/modules/materials'
import { Profile } from '@/modules/users'

export default function LecturerApp() {
    const user = useAuthStore(state => state.user)
    // Cùng quy tắc shell sinh viên; backend vẫn kiểm tra role và ownership cho mọi request.
    if (user?.role?.toString().toLowerCase() !== 'lecturer') return <Navigate to="/signin" replace />
    return (
        <DashboardLayout role="lecturer">
            <Routes>
                <Route path="/" element={<LecturerDashboard />} />
                <Route path="/exams" element={<MyExams />} />
                <Route path="/question-bank" element={<QuestionBank />} />
                <Route path="/learning-materials" element={<LearningMaterials />} />
                <Route path="/rubrics" element={<LecturerRubrics />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<LecturerDashboard />} />
            </Routes>
        </DashboardLayout>
    )
}
