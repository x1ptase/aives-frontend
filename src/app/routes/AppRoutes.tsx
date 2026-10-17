import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminApp from '@/app/shells/AdminApp'
import LecturerApp from '@/app/shells/LecturerApp'
import StudentApp from '@/app/shells/StudentApp'

import { Signin, Signup } from '@/modules/auth'
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
