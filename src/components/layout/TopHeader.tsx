import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { IconBell, IconGrid, IconUsers, IconCpu, IconFile, IconBook, IconClipboard } from '@/components/common/Icons'

type NavItem = { id: string; label: string; icon: ReactNode; path: string; badge?: string }

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconGrid />, path: '/admin' },
  { id: 'users', label: 'User Management', icon: <IconUsers />, path: '/admin/users' },
  { id: 'ai-config', label: 'AI & API Configuration', icon: <IconCpu />, path: '/admin/ai-config' },
]

const LECTURER_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconGrid />, path: '/lecturer' },
  { id: 'exams', label: 'My Exams', icon: <IconClipboard />, path: '/lecturer/exams' },
  { id: 'question-bank', label: 'Question Bank', icon: <IconFile />, path: '/lecturer/question-bank' },
  { id: 'learning-materials', label: 'Learning Materials', icon: <IconBook />, path: '/lecturer/learning-materials' },
]

const STUDENT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconGrid />, path: '/student' },
  { id: 'exams', label: 'My Exams', icon: <IconClipboard />, path: '/student/exams' },
  { id: 'history', label: 'Exam History', icon: <IconFile />, path: '/student/history' },
  { id: 'profile', label: 'Profile', icon: <IconUsers />, path: '/student/profile' },
]

const USER_INFO = {
  admin: {
    initials: 'AD',
    name: 'Administrator',
    role: 'System Administrator',
    subtitle: 'Admin Portal',
    gradient: 'linear-gradient(135deg,#2563eb,#7c3aed)',
  },
  lecturer: {
    initials: 'PN',
    name: 'Prof. Nguyen',
    role: 'Lecturer',
    subtitle: 'Lecturer Portal',
    gradient: 'linear-gradient(135deg,#0369a1,#2563eb)',
  },
  student: {
    initials: 'SV',
    name: 'Nguyen Van An',
    role: 'Student',
    subtitle: 'Student Portal',
    gradient: 'linear-gradient(135deg,#059669,#10b981)',
  },
}

interface TopHeaderProps {
  role: 'admin' | 'lecturer' | 'student'
}

export default function TopHeader({ role }: TopHeaderProps) {
  const location = useLocation()
  const navItems = role === 'admin' ? ADMIN_NAV : role === 'student' ? STUDENT_NAV : LECTURER_NAV
  const user = USER_INFO[role]

  const activeId = navItems.reduce<string>((found, item) => {
    if (location.pathname === item.path) return item.id
    if (found) return found
    if (item.path !== `/${role}` && location.pathname.startsWith(item.path)) return item.id
    return found
  }, navItems[0].id)

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{user.subtitle}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-slate-700 font-medium">
          {navItems.find(n => n.id === activeId)?.label}
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Welcome text */}
        {(role === 'lecturer' || role === 'student') && (
          <span className="text-sm text-slate-500 hidden md:block">
            Welcome back, <span className="font-semibold text-slate-800">{user.name}</span> 👋
          </span>
        )}
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <IconBell />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"></span>
        </button>
        <div className="w-px h-6 bg-slate-200"></div>
        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: user.gradient }}
          >
            {user.initials}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-800">{user.name}</div>
            <div className="text-[11px] text-slate-400">{user.role}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
