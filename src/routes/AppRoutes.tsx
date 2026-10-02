import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import AdminApp from '@/pages/admin/AdminApp'
import LecturerApp from '@/pages/lecturer/LecturerApp'
import StudentApp from '@/pages/student/StudentApp'

import Login from '@/pages/Login'// ── App Routes ─────────────────────────────────────────────────────────────────

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/admin/*" element={<AdminApp />} />
                <Route path="/lecturer/*" element={<LecturerApp />} />
                <Route path="/student/*" element={<StudentApp />} />
                {/* Fallback */}
                <Route path="*" element={<Login />} />
            </Routes>
        </BrowserRouter>
    )
}
