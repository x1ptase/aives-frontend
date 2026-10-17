import { Routes, Route } from 'react-router-dom'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { LecturerDashboard } from '@/modules/dashboard'
import { LecturerMyExams as MyExams } from '@/modules/exams'
import { QuestionBank } from '@/modules/questions'
import { LearningMaterials } from '@/modules/materials'
import { Profile } from '@/modules/users'

export default function LecturerApp() {
    return (
        <DashboardLayout role="lecturer">
            <Routes>
                <Route path="/" element={<LecturerDashboard />} />
                <Route path="/exams" element={<MyExams />} />
                <Route path="/question-bank" element={<QuestionBank />} />
                <Route path="/learning-materials" element={<LearningMaterials />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<LecturerDashboard />} />
            </Routes>
        </DashboardLayout>
    )
}
