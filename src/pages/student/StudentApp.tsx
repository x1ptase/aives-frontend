import { Routes, Route } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import StudentDashboard from './StudentDashboard'
import MyExams from './MyExams'
import ExamHistory from './ExamHistory'
import Profile from './Profile'

export default function StudentApp() {
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
