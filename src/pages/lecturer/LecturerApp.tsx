import { Routes, Route } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import LecturerDashboard from './LecturerDashboard'
import MyExams from './MyExams'
import QuestionBank from './QuestionBank'
import LearningMaterials from './LearningMaterials'

export default function LecturerApp() {
    return (
        <DashboardLayout role="lecturer">
            <Routes>
                <Route path="/" element={<LecturerDashboard />} />
                <Route path="/exams" element={<MyExams />} />
                <Route path="/question-bank" element={<QuestionBank />} />
                <Route path="/learning-materials" element={<LearningMaterials />} />
                <Route path="*" element={<LecturerDashboard />} />
            </Routes>
        </DashboardLayout>
    )
}
