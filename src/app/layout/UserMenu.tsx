import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth'

type PortalRole = 'admin' | 'lecturer' | 'student'

const FALLBACK: Record<PortalRole, { initials: string; name: string; roleLabel: string; gradient: string }> = {
  admin: { initials: 'AD', name: 'Administrator', roleLabel: 'System Administrator', gradient: 'linear-gradient(135deg,#2563eb,#7c3aed)' },
  lecturer: { initials: 'LE', name: 'Lecturer', roleLabel: 'Lecturer', gradient: 'linear-gradient(135deg,#0369a1,#2563eb)' },
  student: { initials: 'ST', name: 'Student', roleLabel: 'Student', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
}

interface UserMenuProps {
  role: PortalRole
  // Where the dropdown opens relative to the trigger (the sidebar footer opens upwards).
  placement?: 'down' | 'up'
  // Hide the name next to the avatar on narrow screens.
  compact?: boolean
  // Avatar-only trigger on desktop (used by the collapsed sidebar rail).
  collapsed?: boolean
}

export default function UserMenu({ role, placement = 'down', compact = false, collapsed = false }: UserMenuProps) {
  const navigate = useNavigate()
  const authUser = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const fallback = FALLBACK[role]

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const displayName = authUser?.name || fallback.name
  const secondary = authUser?.username || authUser?.role || fallback.roleLabel
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase())
      .join('') || fallback.initials

  const goToAccount = () => {
    setOpen(false)
    navigate(`/${role}/profile`)
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  const panelPosition =
    placement === 'up'
      ? `bottom-full mb-2 left-0 right-0 ${collapsed ? 'lg:right-auto lg:w-64' : ''}`
      : 'top-full mt-2 right-0 w-64 max-w-[85vw]'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-full flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-50 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${collapsed ? 'lg:justify-center' : ''}`}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md flex-shrink-0"
          style={{ background: fallback.gradient }}
        >
          {initials}
        </div>
        <div className={`min-w-0 ${compact ? 'hidden sm:block' : ''} ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="text-sm font-bold text-slate-800 truncate">{displayName}</div>
          <div className="text-xs text-slate-500 truncate">{secondary}</div>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute ${panelPosition} bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-700 truncate">{displayName}</div>
            <div className="text-xs text-slate-500 truncate">{secondary}</div>
          </div>
          <div className="py-1.5">
            <button
              role="menuitem"
              onClick={goToAccount}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-500">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="10" r="3" />
                <path d="M6.2 18.5a7 7 0 0 1 11.6 0" />
              </svg>
              My Account
            </button>
            <button
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
