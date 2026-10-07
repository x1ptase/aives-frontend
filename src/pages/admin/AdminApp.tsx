import { useLocation } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import UserManagement from '@/pages/admin/UserManagement'
import AiConfigPage from '@/pages/admin/AiConfigPage'
import Profile from '@/pages/profile/Profile'

export default function AdminApp() {
    const location = useLocation()
    const path = location.pathname

    let content = <AdminDashboard />

    if (path.startsWith('/admin/users')) {
        content = <UserManagement />
    } else if (path.startsWith('/admin/ai-config')) {
        content = <AiConfigPage />
    } else if (path.startsWith('/admin/profile')) {
        content = <Profile />
    }

    return (
        <DashboardLayout role="admin">
            {content}
        </DashboardLayout>
    )
}
