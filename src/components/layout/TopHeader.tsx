import { ReactNode, useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconBell, IconGrid, IconUsers, IconCpu, IconFile, IconBook, IconClipboard } from '@/components/common/Icons'
import { useAuthStore } from '@/store/useAuthStore'

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
    initials: 'PA',
    name: 'Phạm Tuấn Anh',
    role: 'Lecturer',
    subtitle: 'Lecturer Portal',
    gradient: 'linear-gradient(135deg,#0369a1,#2563eb)',
  },
  student: {
    initials: 'NA',
    name: 'Nguyễn Văn An',
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
  const navigate = useNavigate()
  const navItems = role === 'admin' ? ADMIN_NAV : role === 'student' ? STUDENT_NAV : LECTURER_NAV
  const user = USER_INFO[role]
  const authUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEsc)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleProfileClick = () => {
    navigate(`/${role}/profile`)
  }

  const displayName = authUser?.name || user.name
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || user.initials

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
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <IconBell />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"></span>
        </button>
        <div className="w-px h-6 bg-slate-200"></div>
        {/* User info dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2.5 p-1 -m-1 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ background: user.gradient }}
            >
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-slate-800">{displayName}</div>
              <div className="text-[11px] text-slate-400">{authUser?.role || user.role}</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400 hidden sm:block ml-1">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => { setIsMenuOpen(false); handleProfileClick() }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={() => { setIsMenuOpen(false); handleLogout() }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
