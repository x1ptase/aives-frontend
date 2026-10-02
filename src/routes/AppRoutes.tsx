import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import AdminApp from '@/pages/admin/AdminApp'
import LecturerApp from '@/pages/lecturer/LecturerApp'
// import LecturerGradingReview from '@/pages/lecturer/LecturerGradingReview'
// import QuestionBank from '@/pages/lecturer/QuestionBank'
// import StudentExam from '@/pages/student/StudentExam'

import Login from '@/pages/Login'// ── App Routes ─────────────────────────────────────────────────────────────────

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/admin/*" element={<AdminApp />} />
                <Route path="/lecturer/*" element={<LecturerApp />} />
                {/* <Route path="/lecturer/grading" element={<LecturerGradingReview />} />
                <Route path="/lecturer/review" element={<LecturerGradingReview />} />
                <Route path="/lecturer/question-bank" element={<QuestionBank />} />
                <Route path="/student/*" element={<StudentExam />} /> */}
                {/* Fallback */}
                <Route path="*" element={<Login />} />
            </Routes>
        </BrowserRouter>
    )
}
