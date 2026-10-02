import { ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopHeader from '@/components/layout/TopHeader'

interface DashboardLayoutProps {
    role: 'admin' | 'lecturer' | 'student'
    children: ReactNode
}

export default function DashboardLayout({ role, children }: DashboardLayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f1f5f9' }}>
            <Sidebar role={role} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopHeader role={role} />
                <div className="flex-1 overflow-hidden flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    )
}
