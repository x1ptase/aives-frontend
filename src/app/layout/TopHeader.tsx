import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { IconBell, IconGrid, IconUsers, IconCpu, IconShield, IconFile, IconBook, IconClipboard } from '@/shared/components/common/Icons'
import UserMenu from './UserMenu'

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
  { id: 'rubrics', label: 'Rubrics', icon: <IconClipboard />, path: '/lecturer/rubrics' },
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

interface TopHeaderProps {
  role: 'admin' | 'lecturer' | 'student'
  onMenuClick?: () => void
}

export default function TopHeader({ role, onMenuClick }: TopHeaderProps) {
  const location = useLocation()
  const navItems = role === 'admin' ? ADMIN_NAV : role === 'student' ? STUDENT_NAV : LECTURER_NAV
  const activeId = navItems.reduce<string>((found, item) => {
    if (location.pathname === item.path) return item.id
    if (found) return found
    if (item.path !== `/${role}` && location.pathname.startsWith(item.path)) return item.id
    return found
  }, navItems[0].id)

  return (
    <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-white border-b border-slate-200">
      {/* Menu button (drawer) + breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            className="-ml-1 mr-1 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <span className="hidden sm:inline">{PORTAL_LABEL[role]}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 hidden sm:block">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-slate-700 font-medium truncate">
          {navItems.find(n => n.id === activeId)?.label}
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <IconBell />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"></span>
        </button>
        <div className="w-px h-6 bg-slate-200"></div>
        {/* User menu */}
        <UserMenu role={role} compact />
      </div>
    </header>
  )
}
