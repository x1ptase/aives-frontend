import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/shared/components/common/LanguageSwitcher'
import { IconBell, IconGrid, IconUsers, IconCpu, IconShield, IconFile, IconBook, IconClipboard } from '@/shared/components/common/Icons'
import UserMenu from './UserMenu'

type NavItem = { id: string; labelKey: string; icon: ReactNode; path: string; badge?: string }

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', labelKey: 'layout.nav.dashboard', icon: <IconGrid />, path: '/admin' },
  { id: 'users', labelKey: 'layout.nav.users', icon: <IconUsers />, path: '/admin/users' },
  { id: 'subjects', labelKey: 'layout.nav.subjects', icon: <IconBook />, path: '/admin/subjects' },
  { id: 'subject-assignments', labelKey: 'layout.nav.subjectAssignments', icon: <IconShield />, path: '/admin/subject-assignments' },
  { id: 'learning-materials', labelKey: 'layout.nav.learningMaterials', icon: <IconBook />, path: '/admin/learning-materials' },
  { id: 'question-bank', labelKey: 'layout.nav.questionBank', icon: <IconFile />, path: '/admin/question-bank' },
  { id: 'ai-config', labelKey: 'layout.nav.aiConfig', icon: <IconCpu />, path: '/admin/ai-config' },
]

const LECTURER_NAV: NavItem[] = [
  { id: 'dashboard', labelKey: 'layout.nav.dashboard', icon: <IconGrid />, path: '/lecturer' },
  { id: 'learning-materials', labelKey: 'layout.nav.learningMaterials', icon: <IconBook />, path: '/lecturer/learning-materials' },
  { id: 'rubrics', labelKey: 'layout.nav.rubrics', icon: <IconClipboard />, path: '/lecturer/rubrics' },
  { id: 'question-bank', labelKey: 'layout.nav.questionBank', icon: <IconFile />, path: '/lecturer/question-bank' },
  { id: 'exams', labelKey: 'layout.nav.myExams', icon: <IconClipboard />, path: '/lecturer/exams' },
]

const STUDENT_NAV: NavItem[] = [
  { id: 'dashboard', labelKey: 'layout.nav.dashboard', icon: <IconGrid />, path: '/student' },
  { id: 'exams', labelKey: 'layout.nav.myExams', icon: <IconClipboard />, path: '/student/exams' },
  { id: 'history', labelKey: 'layout.nav.examHistory', icon: <IconFile />, path: '/student/history' },
]

const PORTAL_LABEL_KEY = {
  admin: 'layout.portal.admin',
  lecturer: 'layout.portal.lecturer',
  student: 'layout.portal.student',
}

interface TopHeaderProps {
  role: 'admin' | 'lecturer' | 'student'
  onMenuClick?: () => void
}

export default function TopHeader({ role, onMenuClick }: TopHeaderProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navItems = role === 'admin' ? ADMIN_NAV : role === 'student' ? STUDENT_NAV : LECTURER_NAV
  const activeId = navItems.reduce<string>((found, item) => {
    if (location.pathname === item.path) return item.id
    if (found) return found
    if (item.path !== `/${role}` && location.pathname.startsWith(`${item.path}/`)) return item.id
    return found
  }, '') || navItems[0].id

  return (
    <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-white border-b border-slate-200">
      {/* Menu button (drawer) + breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label={t('layout.toggleSidebar')}
            title={t('layout.toggleSidebar')}
            className="-ml-1 mr-1 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <span className="hidden sm:inline">{t(PORTAL_LABEL_KEY[role])}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 hidden sm:block">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-slate-700 font-medium truncate">
          {(() => { const item = navItems.find(n => n.id === activeId); return item ? t(item.labelKey) : null })()}
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
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
