import { useLocation } from 'react-router-dom'
import DashboardLayout from '@/app/layout/DashboardLayout'
import { AdminDashboard } from '@/modules/dashboard'
import { UserManagement, Profile } from '@/modules/users'
import { AiConfigPage } from '@/modules/ai-config'
import { SubjectManagement, SubjectAssignments } from '@/modules/subjects'
import { AdminLearningMaterials } from '@/modules/materials'
import { AdminQuestionBank } from '@/modules/questions'

export default function AdminApp() {
    const location = useLocation()
    const path = location.pathname

    let content = <AdminDashboard />

    if (path.startsWith('/admin/users')) {
        content = <UserManagement />
    } else if (path.startsWith('/admin/subjects')) {
        content = <SubjectManagement />
    } else if (path.startsWith('/admin/subject-assignments')) {
        content = <SubjectAssignments />
    } else if (path.startsWith('/admin/question-bank')) {
        content = <AdminQuestionBank />
    } else if (path.startsWith('/admin/learning-materials')) {
        content = <AdminLearningMaterials />
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
