import { ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import TopHeader from '@/components/layout/TopHeader'

interface DashboardLayoutProps {
    role: 'admin' | 'lecturer' | 'student'
    children: ReactNode
}

const COLLAPSED_KEY = 'aives.sidebar.collapsed'

export default function DashboardLayout({ role, children }: DashboardLayoutProps) {
    // Below the lg breakpoint (small windows, or a high browser zoom level) the sidebar becomes an off-canvas drawer.
    const [navOpen, setNavOpen] = useState(false)
    // On larger screens the same button collapses the sidebar into an icon-only rail (remembered across visits).
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(COLLAPSED_KEY) === '1'
        } catch {
            return false
        }
    })
    const location = useLocation()

    useEffect(() => {
        setNavOpen(false)
    }, [location.pathname])

    const toggleSidebar = () => {
        if (window.matchMedia('(min-width: 1024px)').matches) {
            setCollapsed(prev => {
                const next = !prev
                try {
                    localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
                } catch {
                    // Storage can be unavailable (private mode); the toggle still works for this session.
                }
                return next
            })
        } else {
            setNavOpen(prev => !prev)
        }
    }

    useEffect(() => {
        if (!navOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setNavOpen(false)
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [navOpen])

    return (
        <div className="flex h-dvh overflow-hidden" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f1f5f9' }}>
            <Sidebar role={role} open={navOpen} onClose={() => setNavOpen(false)} collapsed={collapsed} />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <TopHeader role={role} onMenuClick={toggleSidebar} />
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    )
}
