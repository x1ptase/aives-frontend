import { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  IconGrid, IconUsers, IconCpu, IconShield, IconFile, IconBook, IconClipboard, IconChevronRight
} from '@/components/common/Icons'
import aivesLogo from '@/assets/logo/logo-aives.jpg'
import UserMenu from '@/components/layout/UserMenu'

type NavItem = { id: string; label: string; icon: ReactNode; path: string; badge?: string }

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconGrid />, path: '/admin' },
  { id: 'users', label: 'User Management', icon: <IconUsers />, path: '/admin/users' },
  { id: 'subjects', label: 'Subject Management', icon: <IconBook />, path: '/admin/subjects' },
  { id: 'subject-assignments', label: 'Subject Assignment', icon: <IconShield />, path: '/admin/subject-assignments' },
  { id: 'learning-materials', label: 'Learning Materials', icon: <IconBook />, path: '/admin/learning-materials' },
  { id: 'question-bank', label: 'Question Bank', icon: <IconFile />, path: '/admin/question-bank' },
  { id: 'ai-config', label: 'AI & API Configuration', icon: <IconCpu />, path: '/admin/ai-config' },
]

const LECTURER_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconGrid />, path: '/lecturer' },
  { id: 'learning-materials', label: 'Learning Materials', icon: <IconBook />, path: '/lecturer/learning-materials' },
  { id: 'question-bank', label: 'Question Bank', icon: <IconFile />, path: '/lecturer/question-bank' },
  { id: 'exams', label: 'My Exams', icon: <IconClipboard />, path: '/lecturer/exams' },
]

const STUDENT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconGrid />, path: '/student' },
  { id: 'exams', label: 'My Exams', icon: <IconClipboard />, path: '/student/exams' },
  { id: 'history', label: 'Exam History', icon: <IconFile />, path: '/student/history' },
]

const PORTAL_LABEL = {
  admin: 'Admin Portal',
  lecturer: 'Lecturer Portal',
  student: 'Student Portal',
}

interface SidebarProps {
  role: 'admin' | 'lecturer' | 'student'
  open: boolean
  onClose: () => void
  // Icon-only rail on desktop (lg and up). The mobile drawer is always fully expanded.
  collapsed?: boolean
}

export default function Sidebar({ role, open, onClose, collapsed = false }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = role === 'admin' ? ADMIN_NAV : role === 'student' ? STUDENT_NAV : LECTURER_NAV
  // Determine active nav item — exact match first, then prefix match
  const activeId = navItems.reduce<string>((found, item) => {
    if (location.pathname === item.path) return item.id
    if (found) return found
    if (item.path !== `/${role}` && location.pathname.startsWith(item.path)) return item.id
    return found
  }, navItems[0].id)

  return (
    <>
    {/* Backdrop for the mobile drawer */}
    <div
      onClick={onClose}
      aria-hidden="true"
      className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    />
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] flex-shrink-0 flex flex-col bg-white border-r border-[#E5E7EB] transition-[transform,width] duration-200 lg:static lg:z-auto lg:max-w-none lg:translate-x-0 ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'} ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Logo */}
      <div className={`px-5 py-4 border-b border-[#E5E7EB] ${collapsed ? 'lg:px-0' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
          <img
            src={aivesLogo}
            alt="AIVES Logo"
            className={`h-8 w-auto max-w-[120px] object-contain rounded ${collapsed ? 'lg:hidden' : ''}`}
          />
          {collapsed && (
            // Rail mode: show only the "AN" mark, cropped out of the full logo.
            <div className="hidden lg:block w-10 h-10 overflow-hidden rounded-lg">
              <img src={aivesLogo} alt="AIVES" className="max-w-none" style={{ width: 127, marginLeft: -44, marginTop: -2 }} />
            </div>
          )}
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="text-[#1F2937] font-semibold text-xs leading-tight tracking-wide" style={{ fontFamily: 'DM Sans, sans-serif' }}>AIVES</div>
            <div className="text-[10px] text-[#6B7280]">{PORTAL_LABEL[role]}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className={`flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'lg:px-2' : ''}`}>
        <div className={`mb-2 px-3 ${collapsed ? 'lg:hidden' : ''}`}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Navigation</span>
        </div>
        {navItems.map(item => {
          const active = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${active
                ? 'bg-[#EFF6FF] text-[#2563EB] font-medium shadow-xs'
                : 'text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6]'
                }`}
            >
              <span className={active ? 'text-[#2563EB]' : 'text-[#6B7280]'}>{item.icon}</span>
              <span className={`flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 leading-none ${collapsed ? 'lg:hidden' : ''}`}>
                  {item.badge}
                </span>
              )}
              {active && (
                <span className={`text-[#2563EB] opacity-80 ${collapsed ? 'lg:hidden' : ''}`}><IconChevronRight /></span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div className={`px-3 py-3 border-t border-[#E5E7EB] ${collapsed ? 'lg:px-2' : ''}`}>
        <UserMenu role={role} placement="up" collapsed={collapsed} />
      </div>
    </aside>
    </>
  )
}
