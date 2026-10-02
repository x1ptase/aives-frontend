import { ReactNode } from 'react' 
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  IconGrid, IconUsers, IconCpu, IconFile, IconBook, IconClipboard, IconChevronRight, IconLogOut 
} from '@/components/common/Icons'
import aivesLogo from '@/assets/logo/logo-aives.jpg'

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

interface SidebarProps {
  role: 'admin' | 'lecturer' | 'student'
}

export default function Sidebar({ role }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const navItems = role === 'admin' ? ADMIN_NAV : role === 'student' ? STUDENT_NAV : LECTURER_NAV
  const user = USER_INFO[role]

  // Determine active nav item — exact match first, then prefix match
  const activeId = navItems.reduce<string>((found, item) => {
    if (location.pathname === item.path) return item.id
    if (found) return found
    if (item.path !== `/${role}` && location.pathname.startsWith(item.path)) return item.id
    return found
  }, navItems[0].id)

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-[#E5E7EB]">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <img
            src={aivesLogo}
            alt="AIVES Logo"
            className="h-8 w-auto max-w-[120px] object-contain rounded"
          />
          <div className="min-w-0">
            <div className="text-[#1F2937] font-semibold text-xs leading-tight tracking-wide" style={{ fontFamily: 'DM Sans, sans-serif' }}>AIVES</div>
            <div className="text-[10px] text-[#6B7280]">{user.subtitle}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="mb-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Navigation</span>
        </div>
        {navItems.map(item => {
          const active = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left ${
                active
                  ? 'bg-[#EFF6FF] text-[#2563EB] font-medium shadow-xs'
                  : 'text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6]'
              }`}
            >
              <span className={active ? 'text-[#2563EB]' : 'text-[#6B7280]'}>{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 leading-none">
                  {item.badge}
                </span>
              )}
              {active && (
                <span className="text-[#2563EB] opacity-80"><IconChevronRight /></span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
            style={{ background: user.gradient }}
          >
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#1F2937] truncate">{user.name}</div>
            <div className="text-[11px] text-[#6B7280] truncate">{user.role}</div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-colors flex-shrink-0"
            title="Switch role / Logout"
          >
            <IconLogOut />
          </button>
        </div>
      </div>
    </aside>
  )
}
