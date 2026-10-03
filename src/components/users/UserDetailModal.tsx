import { User } from '@/types'
// No icon import

interface UserDetailModalProps {
  user: User
  avatarColor: string
  initials: string
  onClose: () => void
}

export default function UserDetailModal({ user, avatarColor, initials, onClose }: UserDetailModalProps) {
  // Safe parsing for date
  let formattedDate = 'N/A'
  if (user.createdAt) {
    const d = new Date(user.createdAt)
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all z-10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header / Avatar */}
        <div className="pt-10 pb-6 px-8 flex flex-col items-center border-b border-slate-50 bg-gradient-to-b from-slate-50/50 to-white">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-sm ring-4 ring-white text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight text-center mb-1">
            {user.name}
          </h2>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full uppercase tracking-widest">
            {user.role}
          </span>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-5">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Username</div>
            <div className="text-sm font-medium text-slate-800">{user.username || '—'}</div>
          </div>
          
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</div>
            <div className="text-sm font-medium text-slate-800">{user.email || '—'}</div>
          </div>
          
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Created At</div>
            <div className="text-sm font-medium text-slate-800">{formattedDate}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-2 flex justify-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
