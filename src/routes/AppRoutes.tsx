import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminApp from '@/pages/admin/AdminApp'
import LecturerApp from '@/pages/lecturer/LecturerApp'
import StudentApp from '@/pages/student/StudentApp'

import Signin from '@/pages/auth/Signin'
import Signup from '@/pages/auth/Signup'
// ── App Routes ─────────────────────────────────────────────────────────────────

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Signin />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/admin/*" element={<AdminApp />} />
                <Route path="/lecturer/*" element={<LecturerApp />} />
                <Route path="/student/*" element={<StudentApp />} />
                {/* Fallback */}
                <Route path="*" element={<Signin />} />
            </Routes>
        </BrowserRouter>
    )
}
