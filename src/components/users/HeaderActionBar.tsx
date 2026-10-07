import { PlusIcon } from '@/components/common/Icons'

interface HeaderActionBarProps {
  counts: { total: number; students: number; lecturers: number; admins: number }
  onAddUser: () => void
}

export default function HeaderActionBar({ counts, onAddUser }: HeaderActionBarProps) {
  return (
    <div className="flex-shrink-0 px-8 pt-7 pb-5 bg-white border-b border-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all system users — students, lecturers, and administrators.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onAddUser}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', fontFamily: 'DM Sans, sans-serif' }}
          >
            <PlusIcon />
            Create Lecturer
          </button>
        </div>
      </div>
      {/* Mini stat strip */}
      <div className="flex items-center gap-6 mt-5">
        {[
          { label: 'Total Users', val: counts.total, color: '#1d4ed8' },
          { label: 'Students', val: counts.students, color: '#7c3aed' },
          { label: 'Lecturers', val: counts.lecturers, color: '#0369a1' },
          { label: 'Admins', val: counts.admins, color: '#9333ea' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ fontFamily: 'DM Sans, sans-serif', color: s.color }}>{s.val}</span>
            <span className="text-xs text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
